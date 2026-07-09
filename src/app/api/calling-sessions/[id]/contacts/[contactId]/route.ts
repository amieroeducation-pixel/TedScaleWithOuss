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
    .select('*, prospect_id')
    .single()
  if (error) return apiError(error.message, 500)

  const callStatuses = ['contacte', 'pas_repondu', 'pas_interesse', 'chaud']
  if (body.statut_appel && callStatuses.includes(body.statut_appel) && data.prospect_id) {
    await supabase.from('interactions').insert({
      user_id: user.id,
      prospect_id: data.prospect_id,
      type: 'appel',
      notes: body.note || `Appel session — ${body.statut_appel}`,
      is_honored: body.statut_appel !== 'pas_repondu',
      occurred_at: new Date().toISOString(),
    })
    await supabase.from('prospects').update({
      last_contact_at: new Date().toISOString(),
    }).eq('id', data.prospect_id).eq('user_id', user.id)
  }

  if (body.added_to_crm && !data.prospect_id) {
    const { data: newProspect } = await supabase.from('prospects').insert({
      user_id: user.id,
      full_name: data.nom,
      phone: data.telephone,
      profession: data.metier,
      city: data.ville,
      source: data.source === 'tns' ? 'tns' : 'chefs_entreprise',
      pipeline_stage: 'a_contacter',
    }).select('id').single()

    if (newProspect) {
      await supabase.from('calling_session_contacts')
        .update({ prospect_id: newProspect.id })
        .eq('id', contactId)
    }
  }

  return apiSuccess(data)
}
