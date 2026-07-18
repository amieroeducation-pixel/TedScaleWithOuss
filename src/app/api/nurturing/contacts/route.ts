import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { data, error } = await supabase
    .from('prospects')
    .select('*')
    .eq('user_id', user.id)
    .not('nurturing_category', 'is', null)
    .order('next_action_date', { ascending: true, nullsFirst: false })

  if (error) return apiError(error.message)

  const enriched = await Promise.all((data || []).map(async (p) => {
    const { data: themes } = await supabase
      .from('nurturing_themes')
      .select('id, name, color, icon')
      .eq('user_id', user.id)

    return { ...p, themes: themes || [] }
  }))

  return apiSuccess(enriched)
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const body = await request.json()
  const { full_name, email, phone, profession, company, city, linkedin_url, notes, nurturing_category, source, preferred_channel, contact_frequency_days } = body

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
    })
    .select()
    .single()

  if (error) return apiError(error.message)
  return apiSuccess(data, 201)
}
