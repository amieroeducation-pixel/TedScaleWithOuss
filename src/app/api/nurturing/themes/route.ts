import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { data, error } = await supabase
    .from('nurturing_themes')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) return apiError(error.message)
  return apiSuccess(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const body = await request.json()
  const { name, color, icon } = body

  if (!name) return apiError('Le nom est requis', 400)

  const { data: existing } = await supabase
    .from('nurturing_themes')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = (existing?.[0]?.sort_order || 0) + 1

  const { data, error } = await supabase
    .from('nurturing_themes')
    .insert({ user_id: user.id, name, color: color || '#e8c878', icon: icon || '📁', sort_order: nextOrder })
    .select()
    .single()

  if (error) return apiError(error.message)
  return apiSuccess(data, 201)
}

export async function PATCH(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const body = await request.json()
  const { id, ...updates } = body

  if (!id) return apiError('ID requis', 400)

  const { data, error } = await supabase
    .from('nurturing_themes')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return apiError(error.message)
  return apiSuccess(data)
}

export async function DELETE(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return apiError('ID requis', 400)

  const { error } = await supabase
    .from('nurturing_themes')
    .delete()
    .eq('id', id)

  if (error) return apiError(error.message)
  return apiSuccess({ deleted: true })
}
