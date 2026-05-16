import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { data: session, error: sErr } = await supabase
    .from('calling_sessions').select('*').eq('id', id).eq('user_id', user.id).single()
  if (sErr) return apiError(sErr.message, 404)

  const { data: contacts, error: cErr } = await supabase
    .from('calling_session_contacts')
    .select('*').eq('session_id', id).order('ordre')
  if (cErr) return apiError(cErr.message, 500)

  return apiSuccess({ ...session, contacts: contacts ?? [] })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let body: { statut: 'active' | 'pausee' | 'terminee' }
  try { body = await request.json() } catch { return apiError('Corps invalide', 400) }

  const { data, error } = await supabase.from('calling_sessions')
    .update({ statut: body.statut, updated_at: new Date().toISOString() })
    .eq('id', id).eq('user_id', user.id)
    .select().single()
  if (error) return apiError(error.message, 500)
  return apiSuccess(data)
}
