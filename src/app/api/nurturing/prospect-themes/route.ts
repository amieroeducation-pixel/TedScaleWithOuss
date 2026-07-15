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
    .from('prospect_themes')
    .select('*, nurturing_themes(id, name, color, icon)')
    .eq('prospect_id', prospectId)

  if (error) return apiError(error.message)
  return apiSuccess(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const body = await request.json()
  const { prospect_id, theme_id } = body

  if (!prospect_id || !theme_id) return apiError('prospect_id et theme_id requis', 400)

  const { data, error } = await supabase
    .from('prospect_themes')
    .insert({ prospect_id, theme_id })
    .select('*, nurturing_themes(id, name, color, icon)')
    .single()

  if (error) {
    if (error.code === '23505') return apiError('Thème déjà attribué', 409)
    return apiError(error.message)
  }
  return apiSuccess(data, 201)
}

export async function DELETE(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { searchParams } = new URL(request.url)
  const prospectId = searchParams.get('prospect_id')
  const themeId = searchParams.get('theme_id')

  if (!prospectId || !themeId) return apiError('prospect_id et theme_id requis', 400)

  const { error } = await supabase
    .from('prospect_themes')
    .delete()
    .eq('prospect_id', prospectId)
    .eq('theme_id', themeId)

  if (error) return apiError(error.message)
  return apiSuccess({ deleted: true })
}
