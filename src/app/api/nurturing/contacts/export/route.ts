import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiUnauthorized, apiError } from '@/lib/api'

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const format = request.nextUrl.searchParams.get('format') || 'csv'
  const temp = request.nextUrl.searchParams.get('temp')
  const search = request.nextUrl.searchParams.get('search')
  const includeArchived = request.nextUrl.searchParams.get('include_archived') === 'true'

  if (format !== 'csv') {
    return apiError('Format non supporté (csv uniquement)', 400)
  }

  let query = supabase
    .from('prospects')
    .select('*')
    .eq('user_id', user.id)
    .not('nurturing_category', 'is', null)

  if (!includeArchived) {
    query = query.or('nurturing_archived.is.null,nurturing_archived.eq.false')
  }

  const { data, error } = await query.order('next_action_date', { ascending: true, nullsFirst: false })

  if (error) return apiError(error.message)

  let contacts = data || []

  // Appliquer les filtres côté serveur
  if (temp && temp !== 'all') {
    // Filtrer par température (simplifié, on pourrait calculer la température ici)
    contacts = contacts.filter(p => {
      const lastContactDays = p.last_contact_at
        ? Math.floor((Date.now() - new Date(p.last_contact_at).getTime()) / (1000 * 60 * 60 * 24))
        : null

      if (temp === 'hot') return lastContactDays !== null && lastContactDays <= 3
      if (temp === 'warm') return lastContactDays !== null && lastContactDays > 3 && lastContactDays <= 7
      if (temp === 'cold') return lastContactDays === null || lastContactDays > 7
      return true
    })
  }

  if (search) {
    const lowerSearch = search.toLowerCase()
    contacts = contacts.filter(p =>
      p.full_name?.toLowerCase().includes(lowerSearch) ||
      p.email?.toLowerCase().includes(lowerSearch) ||
      p.profession?.toLowerCase().includes(lowerSearch)
    )
  }

  // Construire le CSV
  const csvLines: string[] = []

  // En-têtes
  csvLines.push([
    'Nom',
    'Email',
    'Téléphone',
    'Profession',
    'Entreprise',
    'Ville',
    'Catégorie',
    'Source',
    'Température estimée',
    'Prochaine action',
    'Canal prochaine action',
    'Total touchpoints',
    'Réponses obtenues',
    'Sans réponse',
    'Archivé',
  ].map(escapeCSV).join(','))

  // Lignes de données
  for (const contact of contacts) {
    const lastContactDays = contact.last_contact_at
      ? Math.floor((Date.now() - new Date(contact.last_contact_at).getTime()) / (1000 * 60 * 60 * 24))
      : null

    let tempEstimated = 'Froid'
    if (lastContactDays !== null && lastContactDays <= 3) tempEstimated = 'Chaud'
    else if (lastContactDays !== null && lastContactDays <= 7) tempEstimated = 'Tiède'

    csvLines.push([
      contact.full_name || '',
      contact.email || '',
      contact.phone || '',
      contact.profession || '',
      contact.company || '',
      contact.city || '',
      contact.nurturing_category || '',
      contact.source || '',
      tempEstimated,
      contact.next_action_date || '',
      contact.next_action_channel || '',
      String(contact.total_touchpoints || 0),
      String(contact.responded_touchpoints || 0),
      String(contact.nb_relances_sans_reponse || 0),
      contact.nurturing_archived ? 'Oui' : 'Non',
    ].map(escapeCSV).join(','))
  }

  const csvContent = csvLines.join('\n')
  const filename = `contacts-nurturing-${new Date().toISOString().split('T')[0]}.csv`

  return new Response(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

function escapeCSV(value: string): string {
  if (!value) return '""'
  const stringValue = String(value)
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return `"${stringValue}"`
}
