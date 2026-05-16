import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

const METIERS_CONFIG: Record<string, { label: string; naf: string }> = {
  medecin_generaliste:  { label: 'Médecin généraliste',      naf: '86.21Z' },
  cardiologue:          { label: 'Cardiologue',               naf: '86.22A' },
  dermatologue:         { label: 'Dermatologue',              naf: '86.22A' },
  ophtalmologue:        { label: 'Ophtalmologue',             naf: '86.22A' },
  radiologue:           { label: 'Radiologue',                naf: '86.22A' },
  pediatre:             { label: 'Pédiatre',                  naf: '86.22A' },
  dentiste:             { label: 'Chirurgien dentiste',        naf: '86.22B' },
  infirmier:            { label: 'Infirmier libéral',          naf: '86.90A' },
  kinesitherapeute:     { label: 'Kinésithérapeute',          naf: '86.90B' },
  kinesiologue:         { label: 'Kinésiologue',              naf: '86.90D' },
  naturopathe:          { label: 'Naturopathe',               naf: '86.90D' },
  acupuncteur:          { label: 'Acupuncteur',               naf: '86.90D' },
  homeopathe:           { label: 'Homéopathe',                naf: '86.90D' },
  pharmacien:           { label: 'Pharmacien',                naf: '47.73Z' },
  avocat:               { label: 'Avocat',                    naf: '69.10Z' },
  notaire:              { label: 'Notaire',                   naf: '69.10Z' },
  expert_comptable:     { label: 'Expert comptable',          naf: '69.20Z' },
  commissaire_comptes:  { label: 'Commissaire aux comptes',   naf: '69.20Z' },
  architecte:           { label: 'Architecte',                naf: '71.11Z' },
  veterinaire:          { label: 'Vétérinaire',               naf: '75.00Z' },
  osteopathe:           { label: 'Ostéopathe',                naf: '86.90D' },
  psychologue:          { label: 'Psychologue',               naf: '86.90F' },
  psychotherapeute:     { label: 'Psychothérapeute',          naf: '86.90F' },
  sage_femme:           { label: 'Sage femme',                naf: '86.90A' },
  orthophoniste:        { label: 'Orthophoniste',             naf: '86.90B' },
  podologue:            { label: 'Podologue',                 naf: '86.90B' },
  chiropracteur:        { label: 'Chiropracteur',             naf: '86.90D' },
  dieteticien:          { label: 'Diététicien',               naf: '86.90D' },
  ergotherapeute:       { label: 'Ergothérapeute',            naf: '86.90B' },
  orthoptiste:          { label: 'Orthoptiste',               naf: '86.90B' },
}

type GouvernResult = {
  nom_complet?: string
  siren?: string
  siege?: { adresse?: string; code_postal?: string; libelle_commune?: string; latitude?: string; longitude?: string }
  dirigeants?: Array<{ nom?: string; prenoms?: string }>
}
type PappersEntreprise = {
  siege?: { telephone?: string }
  dirigeants?: Array<{ email?: string; telephone?: string }>
}
type GoogleTextResult = {
  results?: Array<{ place_id?: string; name?: string; formatted_address?: string }>
  next_page_token?: string
}
type GoogleDetailResult = {
  result?: { formatted_phone_number?: string; name?: string; formatted_address?: string }
}

type Prospect = {
  id: number
  siren: string | null
  initials: string
  nom: string
  entreprise: string
  metier: string
  ville: string
  codePostal: string
  adresse: string
  telephone: string
  email: string | null
  lat: number | null
  lng: number | null
  googleUrl: string
  pagesJaunesUrl: string
  mapsUrl: string
  status: 'Non contacté'
  score: number
  source: string
}

// ── Canal 1 + 2 : Data.gouv → enrichissement Pappers ──
async function canalDataGouv(
  metierLabel: string,
  naf: string,
  ville: string,
  departement: string,
  pappersKey: string | undefined,
  googleKey: string | undefined,
): Promise<Prospect[]> {
  const params = new URLSearchParams({
    activite_principale: naf,
    etat_administratif: 'A',
    tranche_effectif_salarie: 'NN',
    per_page: '25',
    page: '1',
  })
  if (ville) params.set('q', ville)
  if (departement) params.set('departement', departement)

  let rawResults: GouvernResult[] = []
  try {
    const res = await fetch(`https://recherche-entreprises.api.gouv.fr/search?${params}`, {
      headers: { 'User-Agent': 'TedScaleApp/1.0' },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    if (res.ok) {
      const data = await res.json() as { results?: GouvernResult[] }
      rawResults = data.results ?? []
    }
  } catch { return [] }

  // Post-filtrage géographique : data.gouv cherche dans le nom de société aussi,
  // donc "Cabinet Paris" domicilié en Bourgogne peut remonter sur q=Paris.
  if (ville.trim()) {
    const normStr = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Mn}/gu, '').replace(/[-\s]+/g, ' ').trim()
    const villeNorm = normStr(ville)
    rawResults = rawResults.filter(e => {
      const commune = normStr(e.siege?.libelle_commune ?? '')
      return commune.startsWith(villeNorm) || commune.includes(villeNorm)
    })
  }

  const localisation = ville.trim() || departement.trim()

  const prospects = await Promise.all(
    rawResults.map(async (e, i): Promise<Prospect | null> => {
      const d = e.dirigeants?.[0]
      const nomPersonne = d ? `${d.prenoms ?? ''} ${d.nom ?? ''}`.trim() : ''
      const nomDisplay = nomPersonne || e.nom_complet || 'Professionnel'
      const villeDisplay = e.siege?.libelle_commune ?? localisation
      const entreprise = e.nom_complet ?? ''
      const siren = e.siren ?? null
      let telephone: string | null = null
      let source = ''

      // Pappers en premier (données officielles)
      if (pappersKey && siren) {
        try {
          const res = await fetch(
            `https://api.pappers.fr/v2/entreprise?api_token=${pappersKey}&siren=${siren}`,
            { cache: 'no-store', signal: AbortSignal.timeout(4000) }
          )
          if (res.ok) {
            const p = await res.json() as PappersEntreprise
            telephone = p.siege?.telephone ?? p.dirigeants?.[0]?.telephone ?? null
            if (telephone) source = 'Pappers'
          }
        } catch { /* continue */ }
      }

      // Google Places si Pappers n'a rien (recherche par nom de cabinet)
      if (!telephone && googleKey) {
        const query = [entreprise, metierLabel, villeDisplay].filter(Boolean).join(' ')
        try {
          const textRes = await fetch(
            `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&language=fr&region=fr&key=${googleKey}`,
            { cache: 'no-store', signal: AbortSignal.timeout(4000) }
          )
          if (textRes.ok) {
            const textData = await textRes.json() as GoogleTextResult
            const placeId = textData.results?.[0]?.place_id
            if (placeId) {
              const detailRes = await fetch(
                `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_phone_number&language=fr&key=${googleKey}`,
                { cache: 'no-store', signal: AbortSignal.timeout(3000) }
              )
              if (detailRes.ok) {
                const detail = await detailRes.json() as GoogleDetailResult
                const raw = detail.result?.formatted_phone_number ?? null
                if (raw) { telephone = raw.replace(/\s+/g, ' ').trim(); source = 'Data+Google' }
              }
            }
          }
        } catch { /* continue */ }
      }

      if (!telephone) return null

      const initials = nomDisplay.split(' ').map((w: string) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '??'
      const pjQuery = encodeURIComponent(metierLabel)
      const pjVille = encodeURIComponent(villeDisplay)

      return {
        id: i + 1,
        siren,
        initials,
        nom: nomDisplay,
        entreprise,
        metier: metierLabel,
        ville: villeDisplay,
        codePostal: e.siege?.code_postal ?? '',
        adresse: e.siege?.adresse ?? '',
        telephone,
        email: null,
        lat: e.siege?.latitude ? parseFloat(e.siege.latitude) : null,
        lng: e.siege?.longitude ? parseFloat(e.siege.longitude) : null,
        googleUrl: `https://www.google.fr/search?q=${encodeURIComponent(metierLabel + ' ' + villeDisplay + ' téléphone')}`,
        pagesJaunesUrl: `https://www.pagesjaunes.fr/pagesblanches/recherche?quoiqui=${pjQuery}&ou=${pjVille}`,
        mapsUrl: `https://www.google.fr/maps/search/${encodeURIComponent(metierLabel + ' ' + villeDisplay)}`,
        status: 'Non contacté' as const,
        score: Math.round((60 + Math.random() * 35)) / 100,
        source,
      }
    })
  )

  return prospects.filter((p): p is Prospect => p !== null)
}

// ── Canal 3 : Google Places comme SOURCE indépendante ──
// Cherche directement "métier + ville" et récupère les numéros de tous les établissements
async function canalGooglePlaces(
  metierLabel: string,
  ville: string,
  googleKey: string,
): Promise<Prospect[]> {
  const query = `${metierLabel} ${ville}`
  const prospects: Prospect[] = []

  // Jusqu'à 3 pages (60 résultats max) via next_page_token
  let pageToken: string | undefined
  for (let page = 0; page < 3; page++) {
    try {
      const url = pageToken
        ? `https://maps.googleapis.com/maps/api/place/textsearch/json?pagetoken=${pageToken}&language=fr&key=${googleKey}`
        : `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&language=fr&region=fr&key=${googleKey}`

      // Entre les pages, Google exige un délai
      if (page > 0) await new Promise(r => setTimeout(r, 2000))

      const textRes = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(6000) })
      if (!textRes.ok) break

      const textData = await textRes.json() as GoogleTextResult
      const places = textData.results ?? []
      pageToken = textData.next_page_token

      // Récupérer les téléphones en parallèle pour cette page
      const details = await Promise.all(
        places.map(async (place, i) => {
          if (!place.place_id) return null
          try {
            const detailRes = await fetch(
              `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=formatted_phone_number,name,formatted_address&language=fr&key=${googleKey}`,
              { cache: 'no-store', signal: AbortSignal.timeout(4000) }
            )
            if (!detailRes.ok) return null
            const detail = await detailRes.json() as GoogleDetailResult
            const tel = detail.result?.formatted_phone_number
            if (!tel) return null

            const nom = detail.result?.name ?? place.name ?? 'Professionnel'
            const adresse = detail.result?.formatted_address ?? place.formatted_address ?? ''
            const initials = nom.split(' ').map((w: string) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '??'
            const villeExtracted = adresse.split(',').slice(-2, -1)[0]?.trim() ?? ville
            const pjQuery = encodeURIComponent(metierLabel)
            const pjVille = encodeURIComponent(ville)

            return {
              id: page * 20 + i + 1000,
              siren: null,
              initials,
              nom,
              entreprise: nom,
              metier: metierLabel,
              ville: villeExtracted,
              codePostal: '',
              adresse,
              telephone: tel.replace(/\s+/g, ' ').trim(),
              email: null,
              lat: null,
              lng: null,
              googleUrl: `https://www.google.fr/search?q=${encodeURIComponent(nom + ' ' + ville)}`,
              pagesJaunesUrl: `https://www.pagesjaunes.fr/pagesblanches/recherche?quoiqui=${pjQuery}&ou=${pjVille}`,
              mapsUrl: `https://www.google.fr/maps/place/?q=place_id:${place.place_id}`,
              status: 'Non contacté' as const,
              score: Math.round((65 + Math.random() * 30)) / 100,
              source: 'Google Maps',
            } as Prospect
          } catch { return null }
        })
      )

      prospects.push(...details.filter((d): d is Prospect => d !== null))
      if (!pageToken) break
    } catch { break }
  }

  return prospects
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let body: { metier?: string; ville?: string; departement?: string; limite?: number }
  try { body = await request.json() } catch { return apiError('Corps invalide', 400) }

  const { metier = '', ville = '', departement = '', limite = 10 } = body
  const config = METIERS_CONFIG[metier]
  if (!config) return apiError(`Métier non reconnu: ${metier}`, 400)

  const pappersKey = process.env.PAPPERS_API_KEY
  const googleKey = process.env.GOOGLE_PLACES_API_KEY

  // ── Les 3 canaux tournent en parallèle ──
  const [fromDataGouv, fromGoogle] = await Promise.all([
    canalDataGouv(config.label, config.naf, ville, departement, pappersKey, googleKey),
    googleKey ? canalGooglePlaces(config.label, ville || departement, googleKey) : Promise.resolve([]),
  ])

  // ── Fusion + dédoublonnage par numéro de téléphone ──
  const seenPhones = new Set<string>()
  const seenSirens = new Set<string>()
  const merged: Prospect[] = []

  for (const p of [...fromDataGouv, ...fromGoogle]) {
    const normPhone = p.telephone.replace(/[\s.\-]/g, '')
    if (seenPhones.has(normPhone)) continue
    if (p.siren && seenSirens.has(p.siren)) continue
    seenPhones.add(normPhone)
    if (p.siren) seenSirens.add(p.siren)
    merged.push(p)
  }

  // Ré-indexer les IDs et limiter au nombre demandé
  const prospects = merged.slice(0, Math.max(parseInt(String(limite)), 1)).map((p, i) => ({ ...p, id: i + 1 }))

  return apiSuccess({ prospects, total: merged.length })
}
