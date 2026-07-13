import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { data: session } = await supabase
    .from('calling_sessions')
    .select('id, metier, ville')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (!session) return apiError('Session introuvable', 404)

  let body: { nom: string; telephone: string; entreprise?: string; metier?: string; ville?: string }
  try { body = await request.json() } catch { return apiError('Corps invalide', 400) }

  if (!body.nom || !body.telephone) return apiError('nom et telephone requis', 400)

  const { count } = await supabase
    .from('calling_session_contacts')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', id)

  const { data, error } = await supabase
    .from('calling_session_contacts')
    .insert({
      session_id: id,
      user_id: user.id,
      ordre: (count ?? 0),
      nom: body.nom,
      entreprise: body.entreprise ?? body.nom,
      metier: body.metier ?? session.metier,
      ville: body.ville ?? session.ville,
      telephone: body.telephone,
      source: 'manuel',
    })
    .select()
    .single()

  if (error) return apiError(error.message, 500)
  return apiSuccess(data)
}
