import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'
import { addDays, format } from 'date-fns'

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { searchParams } = new URL(request.url)
  const prospect_id = searchParams.get('prospect_id')

  if (!prospect_id) {
    return apiError('prospect_id est requis', 400)
  }

  const { data, error } = await supabase
    .from('interactions')
    .select('id, type, created_at, seen_at, responded_at, notes')
    .eq('prospect_id', prospect_id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return apiError(error.message)
  return apiSuccess(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const body = await request.json()
  const { prospect_id, type, notes } = body

  if (!prospect_id || !type) {
    return apiError('prospect_id et type sont requis', 400)
  }

  const { data: interaction, error: insertError } = await supabase
    .from('interactions')
    .insert({
      prospect_id,
      user_id: user.id,
      type,
      notes: notes || null,
      occurred_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (insertError) return apiError(insertError.message)

  const { data: configData } = await supabase
    .from('nurturing_contact_config')
    .select('contact_frequency_days')
    .eq('prospect_id', prospect_id)
    .eq('user_id', user.id)
    .single()

  const frequencyDays = configData?.contact_frequency_days || 14
  const nextDate = format(addDays(new Date(), frequencyDays), 'yyyy-MM-dd')

  await supabase
    .from('prospects')
    .update({
      last_contact_at: new Date().toISOString(),
      next_action_date: nextDate,
      nb_relances_sans_reponse: 0,
    })
    .eq('id', prospect_id)

  return apiSuccess({ id: interaction.id, next_action_date: nextDate })
}
