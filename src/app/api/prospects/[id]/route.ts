import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized, apiNotFound } from '@/lib/api'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { id } = await params
  const { data, error } = await supabase
    .from('prospects')
    .select(`*, interactions(*)`)
    .eq('id', id)
    .single()

  if (error || !data) return apiNotFound('Prospect')
  return apiSuccess(data)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { id } = await params
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('Invalid JSON body', 400)
  }

  const { data, error } = await supabase
    .from('prospects')
    .update(body as Record<string, unknown>)
    .eq('id', id)
    .select()
    .single()

  if (error) return apiError(error.message)
  if (!data) return apiNotFound('Prospect')
  return apiSuccess(data)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { id } = await params
  const { error } = await supabase
    .from('prospects')
    .delete()
    .eq('id', id)

  if (error) return apiError(error.message)
  return apiSuccess({ deleted: true })
}
