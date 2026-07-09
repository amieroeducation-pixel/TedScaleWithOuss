import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

const ALLOWED = [
  'full_name','short_name','role','location','badge','pressure','days_since','clients',
  'notes','action','mobile','email','linkedin','cabinet','city','fonction','img',
  'orbital_top','orbital_bottom','orbital_left','orbital_right','sort_order',
]

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let body: Record<string, unknown>
  try { body = await request.json() } catch { return apiError('Corps invalide', 400) }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const k of ALLOWED) {
    if (k in body) patch[k] = body[k]
  }

  const { data, error } = await supabase
    .from('partners')
    .update(patch)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()
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

  const { error } = await supabase
    .from('partners')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return apiError(error.message, 500)
  return apiSuccess({ deleted: id })
}
