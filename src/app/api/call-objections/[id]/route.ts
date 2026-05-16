import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let body: { question?: string; reponse?: string; ordre?: number }
  try { body = await request.json() } catch { return apiError('Corps invalide', 400) }

  const { data, error } = await supabase.from('call_objections')
    .update(body)
    .eq('id', id).eq('user_id', user.id)
    .select().single()
  if (error) return apiError(error.message, 500)
  return apiSuccess(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { error } = await supabase.from('call_objections')
    .delete().eq('id', id).eq('user_id', user.id)
  if (error) return apiError(error.message, 500)
  return apiSuccess({ deleted: true })
}
