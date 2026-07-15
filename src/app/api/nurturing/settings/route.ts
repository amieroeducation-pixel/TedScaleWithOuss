import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { data, error } = await supabase
    .from('nurturing_settings')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error && error.code === 'PGRST116') {
    const { data: created, error: createError } = await supabase
      .from('nurturing_settings')
      .insert({ user_id: user.id })
      .select()
      .single()
    if (createError) return apiError(createError.message)
    return apiSuccess(created)
  }

  if (error) return apiError(error.message)
  return apiSuccess(data)
}

export async function PATCH(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const body = await request.json()
  const allowedFields = [
    'cold_days_no_response', 'cold_relances_no_view',
    'warm_days_since_response', 'hot_days_since_response',
    'pressure_high_relances_7d', 'pressure_stop_no_view',
  ]

  const updates: Record<string, number> = {}
  for (const key of allowedFields) {
    if (key in body && typeof body[key] === 'number') {
      updates[key] = body[key]
    }
  }

  if (Object.keys(updates).length === 0) {
    return apiError('Aucun champ valide à mettre à jour', 400)
  }

  const { data: existing } = await supabase
    .from('nurturing_settings')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!existing) {
    const { data, error } = await supabase
      .from('nurturing_settings')
      .insert({ user_id: user.id, ...updates })
      .select()
      .single()
    if (error) return apiError(error.message)
    return apiSuccess(data)
  }

  const { data, error } = await supabase
    .from('nurturing_settings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return apiError(error.message)
  return apiSuccess(data)
}
