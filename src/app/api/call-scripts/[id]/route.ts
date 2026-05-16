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

  let body: { titre?: string; contenu?: string; is_default?: boolean }
  try { body = await request.json() } catch { return apiError('Corps invalide', 400) }

  if (body.is_default) {
    const { data: script } = await supabase.from('call_scripts')
      .select('metier').eq('id', id).single()
    if (script) {
      await supabase.from('call_scripts')
        .update({ is_default: false })
        .eq('user_id', user.id).eq('metier', script.metier)
    }
  }

  const { data, error } = await supabase.from('call_scripts')
    .update({ ...body, updated_at: new Date().toISOString() })
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

  const { data: script } = await supabase.from('call_scripts')
    .select('metier, is_default').eq('id', id).single()
  if (script?.is_default) {
    const { count } = await supabase.from('call_scripts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('metier', script.metier)
    if ((count ?? 0) <= 1) return apiError('Impossible de supprimer le seul script du métier', 400)
  }

  const { error } = await supabase.from('call_scripts')
    .delete().eq('id', id).eq('user_id', user.id)
  if (error) return apiError(error.message, 500)
  return apiSuccess({ deleted: true })
}
