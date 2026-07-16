import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

const DEFAULT_CONFIG = {
  preferred_channel: null,
  contact_frequency_days: 14,
  excluded_channels: [],
  notes: '',
  preferred_time_slot: null,
}

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
    .from('nurturing_contact_config')
    .select('*')
    .eq('user_id', user.id)
    .eq('prospect_id', prospect_id)
    .single()

  if (error && error.code === 'PGRST116') {
    return apiSuccess({ prospect_id, ...DEFAULT_CONFIG })
  }

  if (error) return apiError(error.message)
  return apiSuccess(data)
}

export async function PATCH(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const body = await request.json()
  const { prospect_id } = body

  if (!prospect_id) {
    return apiError('prospect_id est requis', 400)
  }

  const allowedFields = [
    'preferred_channel',
    'contact_frequency_days',
    'excluded_channels',
    'notes',
    'preferred_time_slot',
  ]

  const updates: Record<string, unknown> = {}
  for (const key of allowedFields) {
    if (key in body) {
      updates[key] = body[key]
    }
  }

  if (Object.keys(updates).length === 0) {
    return apiError('Aucun champ valide à mettre à jour', 400)
  }

  const { data, error } = await supabase
    .from('nurturing_contact_config')
    .upsert(
      {
        user_id: user.id,
        prospect_id,
        ...updates,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,prospect_id' }
    )
    .select()
    .single()

  if (error) return apiError(error.message)
  return apiSuccess(data)
}
