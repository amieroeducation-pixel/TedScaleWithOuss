import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const { contactId } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let body: {
    statut_appel?: 'a_appeler' | 'contacte' | 'pas_repondu' | 'pas_interesse' | 'chaud'
    note?: string
    rappel_date?: string | null
    added_to_crm?: boolean
    called_at?: string
  }
  try { body = await request.json() } catch { return apiError('Corps invalide', 400) }

  const { data, error } = await supabase.from('calling_session_contacts')
    .update(body)
    .eq('id', contactId).eq('user_id', user.id)
    .select().single()
  if (error) return apiError(error.message, 500)
  return apiSuccess(data)
}
