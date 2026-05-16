import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const metier = new URL(request.url).searchParams.get('metier')
  let query = supabase.from('call_scripts').select('*').eq('user_id', user.id).order('created_at')
  if (metier) query = query.eq('metier', metier)

  const { data, error } = await query
  if (error) return apiError(error.message, 500)
  return apiSuccess(data ?? [])
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let body: { metier: string; titre: string; contenu: string; is_default?: boolean }
  try { body = await request.json() } catch { return apiError('Corps invalide', 400) }

  const { metier, titre, contenu, is_default = false } = body
  if (!metier || !titre || !contenu) return apiError('metier, titre, contenu requis', 400)

  if (is_default) {
    await supabase.from('call_scripts')
      .update({ is_default: false })
      .eq('user_id', user.id).eq('metier', metier)
  }

  const { data, error } = await supabase.from('call_scripts')
    .insert({ user_id: user.id, metier, titre, contenu, is_default })
    .select().single()
  if (error) return apiError(error.message, 500)
  return apiSuccess(data)
}
