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
    .select('theme_id, nurturing_themes(id, name, color, icon)')
    .eq('prospect_id', prospectId)

  if (error) return apiError(error.message)

  const themes = (data || []).map((row: any) => row.nurturing_themes).filter(Boolean)
  return apiSuccess(themes)
}

export async function PUT(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const body = await request.json()
  const { prospect_id, theme_ids } = body

  if (!prospect_id) return apiError('prospect_id requis', 400)
  if (!Array.isArray(theme_ids)) return apiError('theme_ids doit être un tableau', 400)

  const { data: prospect } = await supabase
    .from('prospects')
    .select('id')
    .eq('id', prospect_id)
    .eq('user_id', user.id)
    .single()

  if (!prospect) return apiError('Prospect non trouvé', 404)

  await supabase
    .from('prospect_themes')
    .delete()
    .eq('prospect_id', prospect_id)

  if (theme_ids.length > 0) {
    const rows = theme_ids.map((tid: string) => ({ prospect_id, theme_id: tid }))
    const { error } = await supabase.from('prospect_themes').insert(rows)
    if (error) return apiError(error.message)
  }

  return apiSuccess({ prospect_id, theme_ids })
}
