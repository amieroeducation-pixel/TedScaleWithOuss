import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const includeArchived = request.nextUrl.searchParams.get('include_archived') === 'true'

  let query = supabase
    .from('prospects')
    .select('*')
    .eq('user_id', user.id)
    .not('nurturing_category', 'is', null)

  if (!includeArchived) {
    query = query.or('nurturing_archived.is.null,nurturing_archived.eq.false')
  }

  const { data, error } = await query.order('next_action_date', { ascending: true, nullsFirst: false })

  if (error) return apiError(error.message)

  const prospectIds = (data || []).map(p => p.id)

  let themesMap: Record<string, Array<{ id: string; name: string; color: string; icon: string }>> = {}
  let activeSeqMap: Record<string, string> = {}
  let pressureMap: Record<string, number> = {}

  if (prospectIds.length > 0) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 7)

    const [{ data: pivotRows }, { data: activeSeqs }, { data: recentInteractions }] = await Promise.all([
      supabase
        .from('prospect_themes')
        .select('prospect_id, nurturing_themes(id, name, color, icon)')
        .in('prospect_id', prospectIds),
      supabase
        .from('sequence_instances')
        .select('prospect_id, template_id, sequence_templates(name)')
        .eq('status', 'active')
        .in('prospect_id', prospectIds),
      supabase
        .from('interactions')
        .select('prospect_id, type, occurred_at')
        .in('prospect_id', prospectIds)
        .gte('occurred_at', cutoff.toISOString()),
    ])

    const PRESSURE_COEFS: Record<string, number> = {
      email: 1, appel: 3, call: 3, linkedin: 1.5,
      linkedin_view: 0.5, sms: 2, whatsapp: 1.5,
    }

    for (const i of (recentInteractions || []) as any[]) {
      const coef = PRESSURE_COEFS[i.type] || 1
      pressureMap[i.prospect_id] = (pressureMap[i.prospect_id] || 0) + coef
    }

    for (const row of (pivotRows || []) as any[]) {
      const pid = row.prospect_id as string
      const theme = row.nurturing_themes
      if (!themesMap[pid]) themesMap[pid] = []
      if (theme) themesMap[pid].push(theme)
    }

    for (const seq of (activeSeqs || []) as any[]) {
      activeSeqMap[seq.prospect_id] = seq.sequence_templates?.name || 'Séquence active'
    }
  }

  const enriched = (data || []).map(p => ({
    ...p,
    themes: themesMap[p.id] || [],
    sequence_active: activeSeqMap[p.id] || p.sequence_active || null,
    computed_pressure: pressureMap[p.id] || 0,
  }))

  return apiSuccess(enriched)
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const body = await request.json()
  const { full_name, email, phone, profession, company, city, linkedin_url, notes, nurturing_category, source, preferred_channel, contact_frequency_days, next_action_channel } = body

  if (!full_name) return apiError('Nom requis', 400)

  const { data, error } = await supabase
    .from('prospects')
    .insert({
      user_id: user.id,
      full_name,
      email: email || null,
      phone: phone || null,
      profession: profession || null,
      company: company || null,
      city: city || null,
      linkedin_url: linkedin_url || null,
      notes: notes || null,
      pipeline_stage: 'a_contacter',
      nurturing_category: nurturing_category || 'prospect_froid',
      source: source || 'autre',
      preferred_channel: preferred_channel || 'email',
      contact_frequency_days: contact_frequency_days || 14,
      next_action_date: new Date().toISOString().split('T')[0],
      next_action_channel: next_action_channel || preferred_channel || 'email',
    })
    .select()
    .single()

  if (error) return apiError(error.message)
  return apiSuccess(data, 201)
}
