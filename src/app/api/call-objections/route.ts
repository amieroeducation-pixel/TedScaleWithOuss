import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const metier = new URL(request.url).searchParams.get('metier')
  let query = supabase.from('call_objections').select('*').eq('user_id', user.id).order('ordre')
  if (metier) query = query.eq('metier', metier)

  const { data, error } = await query
  if (error) return apiError(error.message, 500)
  return apiSuccess(data ?? [])
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let body: { metier: string; question: string; reponse: string; ordre?: number }
  try { body = await request.json() } catch { return apiError('Corps invalide', 400) }

  const { metier, question, reponse, ordre = 0 } = body
  if (!metier || !question || !reponse) return apiError('metier, question, reponse requis', 400)

  const { data, error } = await supabase.from('call_objections')
    .insert({ user_id: user.id, metier, question, reponse, ordre })
    .select().single()
  if (error) return apiError(error.message, 500)
  return apiSuccess(data)
}
