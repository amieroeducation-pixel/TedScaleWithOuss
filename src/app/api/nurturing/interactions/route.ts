import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { searchParams } = new URL(request.url)
  const prospectId = searchParams.get('prospect_id')
  if (!prospectId) return apiError('prospect_id requis', 400)

  const { data, error } = await supabase
    .from('interactions')
    .select('*')
    .eq('user_id', user.id)
    .eq('prospect_id', prospectId)
    .order('occurred_at', { ascending: false })

  if (error) return apiError(error.message)
  return apiSuccess(data || [])
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const body = await request.json()
  const { prospect_id, type, notes } = body

  if (!prospect_id || !type) return apiError('prospect_id et type requis', 400)

  const { data, error } = await supabase
    .from('interactions')
    .insert({
      user_id: user.id,
      prospect_id,
      type,
      notes: notes || null,
      occurred_at: new Date().toISOString(),
      is_honored: false,
    })
    .select()
    .single()

  if (error) return apiError(error.message)

  const { data: prospect } = await supabase
    .from('prospects')
    .select('total_touchpoints')
    .eq('id', prospect_id)
    .eq('user_id', user.id)
    .single()

  await supabase
    .from('prospects')
    .update({
      last_contact_at: new Date().toISOString(),
      total_touchpoints: (prospect?.total_touchpoints || 0) + 1,
    })
    .eq('id', prospect_id)
    .eq('user_id', user.id)

  return apiSuccess(data, 201)
}

export async function PATCH(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const body = await request.json()
  const { interaction_id, is_honored } = body

  if (!interaction_id) return apiError('interaction_id requis', 400)

  const { data, error } = await supabase
    .from('interactions')
    .update({ is_honored: is_honored ?? true })
    .eq('id', interaction_id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return apiError(error.message)

  if (is_honored) {
    const { data: interaction } = await supabase
      .from('interactions')
      .select('prospect_id')
      .eq('id', interaction_id)
      .eq('user_id', user.id)
      .single()

    if (interaction) {
      const { count } = await supabase
        .from('interactions')
        .select('*', { count: 'exact', head: true })
        .eq('prospect_id', interaction.prospect_id)
        .eq('user_id', user.id)
        .eq('is_honored', true)

      await supabase
        .from('prospects')
        .update({
          responded_touchpoints: count || 0,
          nb_relances_sans_reponse: 0,
        })
        .eq('id', interaction.prospect_id)
        .eq('user_id', user.id)
    }
  }

  return apiSuccess(data)
}
