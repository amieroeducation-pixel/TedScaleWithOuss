import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const temperature = searchParams.get('temperature')
  const pressure = searchParams.get('pressure')
  const search = searchParams.get('search')
  const dueToday = searchParams.get('due_today') === 'true'

  let query = supabase
    .from('prospects')
    .select(`
      id, full_name, email, phone, profession, pipeline_stage,
      nurturing_category, temperature, pressure_score,
      nb_relances_sans_reponse, last_contact_at, next_action_date,
      next_action_channel, engagement_score, total_touchpoints,
      responded_touchpoints, tags
    `)
    .not('pipeline_stage', 'in', '(converti,perdu)')
    .order('next_action_date', { ascending: true, nullsFirst: false })

  if (category) {
    query = query.eq('nurturing_category', category)
  }

  if (temperature) {
    query = query.eq('temperature', temperature)
  }

  if (pressure) {
    query = query.eq('pressure_score', pressure)
  }

  if (search) {
    query = query.ilike('full_name', `%${search}%`)
  }

  if (dueToday) {
    const today = new Date().toISOString().split('T')[0]
    query = query.lte('next_action_date', today)
  }

  const { data: prospects, error } = await query.limit(200)
  if (error) return apiError(error.message)

  const prospectIds = (prospects || []).map(p => p.id)
  let themes: Record<string, { id: string; name: string; color: string; icon: string }[]> = {}
  let sequences: Record<string, { id: string; status: string; step_order: number }> = {}

  let preferredChannels: Record<string, string | null> = {}

  if (prospectIds.length > 0) {
    const { data: ptData } = await supabase
      .from('prospect_themes')
      .select('prospect_id, theme_id, nurturing_themes(id, name, color, icon)')
      .in('prospect_id', prospectIds)

    if (ptData) {
      for (const pt of ptData) {
        if (!themes[pt.prospect_id]) themes[pt.prospect_id] = []
        const t = pt.nurturing_themes as unknown as { id: string; name: string; color: string; icon: string }
        if (t) themes[pt.prospect_id].push(t)
      }
    }

    const { data: seqData } = await supabase
      .from('sequence_instances')
      .select('id, prospect_id, status')
      .in('prospect_id', prospectIds)
      .eq('status', 'active')

    if (seqData) {
      for (const s of seqData) {
        sequences[s.prospect_id] = { id: s.id, status: s.status, step_order: 0 }
      }
    }

    const { data: configData } = await supabase
      .from('nurturing_contact_config')
      .select('prospect_id, preferred_channel')
      .eq('user_id', user.id)
      .in('prospect_id', prospectIds)

    if (configData) {
      for (const c of configData) {
        preferredChannels[c.prospect_id] = c.preferred_channel
      }
    }
  }

  const contacts = (prospects || []).map(p => ({
    ...p,
    themes: themes[p.id] || [],
    sequence_active: sequences[p.id]?.id || null,
    etape_sequence: sequences[p.id]?.step_order || null,
    preferred_channel: preferredChannels[p.id] || null,
  }))

  return apiSuccess(contacts)
}
