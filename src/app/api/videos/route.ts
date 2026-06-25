import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const section = request.nextUrl.searchParams.get('section') ?? 'today'

  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('user_id', user.id)
    .eq('section', section)
    .order('position', { ascending: true })
  if (error) return apiError(error.message, 500)
  return apiSuccess(data ?? [])
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let body: { name: string; url: string; section?: string; position?: number }
  try { body = await request.json() } catch { return apiError('Corps invalide', 400) }

  if (!body.url?.trim()) return apiError('url requis', 400)

  const { data, error } = await supabase
    .from('videos')
    .insert({
      user_id: user.id,
      name: body.name?.trim() || 'Video',
      url: body.url.trim(),
      section: body.section ?? 'today',
      position: body.position ?? 0,
    })
    .select()
    .single()
  if (error) return apiError(error.message, 500)
  return apiSuccess(data, 201)
}

export async function DELETE(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return apiError('id requis', 400)

  const { error } = await supabase
    .from('videos')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return apiError(error.message, 500)
  return apiSuccess({ deleted: id })
}
