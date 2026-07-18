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
    .from('prospects')
    .select('id, preferred_channel, contact_frequency_days, excluded_channels, preferred_time_slot, notes')
    .eq('id', prospectId)
    .eq('user_id', user.id)
    .single()

  if (error) return apiError(error.message)
  return apiSuccess(data)
}

export async function PATCH(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const body = await request.json()
  const { prospect_id, preferred_channel, contact_frequency_days, excluded_channels, preferred_time_slot, notes } = body

  if (!prospect_id) return apiError('prospect_id requis', 400)

  const updates: Record<string, unknown> = {}
  if (preferred_channel !== undefined) updates.preferred_channel = preferred_channel
  if (contact_frequency_days !== undefined) updates.contact_frequency_days = contact_frequency_days
  if (excluded_channels !== undefined) updates.excluded_channels = excluded_channels
  if (preferred_time_slot !== undefined) updates.preferred_time_slot = preferred_time_slot
  if (notes !== undefined) updates.notes = notes

  const { data, error } = await supabase
    .from('prospects')
    .update(updates)
    .eq('id', prospect_id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return apiError(error.message)
  return apiSuccess(data)
}
