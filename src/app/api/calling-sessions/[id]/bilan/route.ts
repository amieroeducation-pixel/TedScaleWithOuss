import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

type BilanContact = {
  id: string
  script_rating: number
  objections_rencontrees: Array<{ id: string; rating: number }>
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let body: { contacts: BilanContact[]; commentaire?: string }
  try { body = await request.json() } catch { return apiError('Corps invalide', 400) }

  // Vérifier que la session appartient à l'utilisateur
  const { data: session } = await supabase.from('calling_sessions')
    .select('id').eq('id', id).eq('user_id', user.id).single()
  if (!session) return apiError('Session non trouvée', 404)

  const updates = body.contacts.map(c =>
    supabase.from('calling_session_contacts')
      .update({
        script_rating: c.script_rating,
        objections_rencontrees: c.objections_rencontrees,
      })
      .eq('id', c.id).eq('user_id', user.id)
  )
  await Promise.all(updates)

  return apiSuccess({ ok: true })
}
