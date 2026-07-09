import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

type ContactInput = {
  siren?: string | null
  nom: string
  entreprise?: string
  metier?: string
  ville?: string
  telephone: string
  email?: string | null
  adresse?: string
  source?: string
}

export async function GET(_request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { data, error } = await supabase.from('calling_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('statut', { ascending: true })
    .order('created_at', { ascending: false })
  if (error) return apiError(error.message, 500)
  return apiSuccess(data ?? [])
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiUnauthorized()

    let body: {
      titre: string
      metier: string
      ville: string
      source: 'tns' | 'chefs'
      contacts: ContactInput[]
    }
    try { body = await request.json() } catch { return apiError('Corps invalide', 400) }

    const { titre, metier, ville, source, contacts } = body
    if (!titre || !metier || !source || !contacts?.length) {
      return apiError('titre, metier, source, contacts requis', 400)
    }

    // Auto-terminer toute session active existante
    await supabase
      .from('calling_sessions')
      .update({ statut: 'terminee', updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('statut', 'active')

    const { data: session, error: sessionError } = await supabase
      .from('calling_sessions')
      .insert({ user_id: user.id, titre, metier, ville: ville ?? '', source })
      .select().single()
    if (sessionError) return apiError(`calling_sessions: ${sessionError.message}`, 500)

    // Dédupliquer par numéro de téléphone (un même numéro = un même contact)
    const seenPhones = new Set<string>()
    const uniqueContacts = contacts.filter(c => {
      const norm = (c.telephone ?? '').replace(/[\s.\-()]/g, '')
      if (!norm || seenPhones.has(norm)) return false
      seenPhones.add(norm)
      return true
    })

    const contactRows = uniqueContacts.map((c, i) => ({
      session_id: session.id,
      user_id: user.id,
      ordre: i,
      siren: c.siren ?? null,
      nom: c.nom,
      entreprise: c.entreprise ?? '',
      metier: c.metier ?? metier,
      ville: c.ville ?? ville ?? '',
      telephone: c.telephone ?? '',
      email: c.email ?? null,
      adresse: c.adresse ?? null,
      source: c.source ?? '',
    }))

    const { error: contactsError } = await supabase
      .from('calling_session_contacts')
      .insert(contactRows)
    if (contactsError) return apiError(`calling_session_contacts: ${contactsError.message}`, 500)

    return apiSuccess(session)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[POST /api/calling-sessions]', msg)
    return apiError(`Exception: ${msg}`, 500)
  }
}
