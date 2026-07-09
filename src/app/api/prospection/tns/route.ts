import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'
import { normalizePhoneFR, isMobilePhone } from '@/lib/phone-utils'

const METIERS_CONFIG: Record<string, { label: string; naf: string }> = {
  // Médecine générale
  medecin_generaliste:  { label: 'Médecin généraliste',      naf: '86.21Z' },
  // Spécialistes médicaux (NAF 86.22A — partagé)
  cardiologue:          { label: 'Cardiologue',               naf: '86.22A' },
  dermatologue:         { label: 'Dermatologue',              naf: '86.22A' },
  ophtalmologue:        { label: 'Ophtalmologue',             naf: '86.22A' },
  radiologue:           { label: 'Radiologue',                naf: '86.22A' },
  pediatre:             { label: 'Pédiatre',                  naf: '86.22A' },
  orl:                  { label: 'ORL',                       naf: '86.22A' },
  gynecologue:          { label: 'Gynécologue',               naf: '86.22A' },
  urologue:             { label: 'Urologue',                  naf: '86.22A' },
  pneumologue:          { label: 'Pneumologue',               naf: '86.22A' },
  gastro_enterologue:   { label: 'Gastro-entérologue',        naf: '86.22A' },
  neurologue:           { label: 'Neurologue',                naf: '86.22A' },
  rhumatologue:         { label: 'Rhumatologue',              naf: '86.22A' },
  endocrinologue:       { label: 'Endocrinologue',            naf: '86.22A' },
  oncologue:            { label: 'Oncologue',                 naf: '86.22A' },
  nephrologue:          { label: 'Néphrologue',               naf: '86.22A' },
  hematologue:          { label: 'Hématologue',               naf: '86.22A' },
  allergologue:         { label: 'Allergologue',              naf: '86.22A' },
  // Chirurgie
  chirurgien:           { label: 'Chirurgien',                naf: '86.22C' },
  anesthesiste:         { label: 'Anesthésiste',              naf: '86.22C' },
  // Dentaire
  dentiste:             { label: 'Chirurgien dentiste',        naf: '86.22B' },
  orthodontiste:        { label: 'Orthodontiste',             naf: '86.23Z' },
  // Paramédical
  infirmier:            { label: 'Infirmier libéral',          naf: '86.90A' },
  sage_femme:           { label: 'Sage femme',                naf: '86.90A' },
  kinesitherapeute:     { label: 'Kinésithérapeute',          naf: '86.90B' },
  orthophoniste:        { label: 'Orthophoniste',             naf: '86.90B' },
  podologue:            { label: 'Podologue',                 naf: '86.90B' },
  ergotherapeute:       { label: 'Ergothérapeute',            naf: '86.90B' },
  orthoptiste:          { label: 'Orthoptiste',               naf: '86.90B' },
  // Pratiques alternatives
  kinesiologue:         { label: 'Kinésiologue',              naf: '86.90D' },
  naturopathe:          { label: 'Naturopathe',               naf: '86.90D' },
  acupuncteur:          { label: 'Acupuncteur',               naf: '86.90D' },
  homeopathe:           { label: 'Homéopathe',                naf: '86.90D' },
  osteopathe:           { label: 'Ostéopathe',                naf: '86.90D' },
  chiropracteur:        { label: 'Chiropracteur',             naf: '86.90D' },
  dieteticien:          { label: 'Diététicien',               naf: '86.90D' },
  // Psychologie
  psychologue:          { label: 'Psychologue',               naf: '86.90F' },
  psychotherapeute:     { label: 'Psychothérapeute',          naf: '86.90F' },
  // Pharmacie
  pharmacien:           { label: 'Pharmacien',                naf: '47.73Z' },
  // Juridique
  avocat:               { label: 'Avocat',                    naf: '69.10Z' },
  notaire:              { label: 'Notaire',                   naf: '69.10Z' },
  huissier:             { label: 'Huissier de justice',        naf: '69.10Z' },
  // Comptabilité
  expert_comptable:     { label: 'Expert comptable',          naf: '69.20Z' },
  commissaire_comptes:  { label: 'Commissaire aux comptes',   naf: '69.20Z' },
  // Immobilier / Conseil
  agent_immobilier:     { label: 'Agent immobilier',           naf: '68.31Z' },
  consultant:           { label: 'Consultant',                 naf: '70.22Z' },
  coach_sportif:        { label: 'Coach sportif',              naf: '93.13Z' },
  // Autres professions libérales
  architecte:           { label: 'Architecte',                naf: '71.11Z' },
  geometre_expert:      { label: 'Géomètre-expert',           naf: '71.12B' },
  veterinaire:          { label: 'Vétérinaire',               naf: '75.00Z' },
}

type GouvernResult = {
  nom_complet?: string
  siren?: string
  siege?: { adresse?: string; code_postal?: string; libelle_commune?: string; latitude?: string; longitude?: string }
  dirigeants?: Array<{ nom?: string; prenoms?: string }>
  activite_principale?: string
  libelle_activite_principale?: string
}

/**
 * Infère le métier réel à partir du libellé d'activité principale de l'API.
 * Utile quand plusieurs métiers partagent le même code NAF (ex: 86.22A).
 */
function inferMetierFromLibelle(libelle: string | undefined, requestedLabel: string): string {
  if (!libelle) return requestedLabel
  const l = libelle.toLowerCase().normalize('NFD').replace(/\p{Mn}/gu, '')

  // Mapping mots-clés → métier réel
  const KEYWORD_MAP: [string[], string][] = [
    [['cardio', 'coeur'], 'Cardiologue'],
    [['dermato', 'peau'], 'Dermatologue'],
    [['ophtalmo', 'ophtalmol', 'oeil', 'yeux', 'vision'], 'Ophtalmologue'],
    [['radio', 'imagerie'], 'Radiologue'],
    [['pediatr', 'enfant'], 'Pédiatre'],
    [['orl', 'oto-rhino', 'oto rhino', 'nez gorge'], 'ORL'],
    [['gyneco', 'gynecol', 'obstetri'], 'Gynécologue'],
    [['urolog'], 'Urologue'],
    [['pneumo', 'poumon'], 'Pneumologue'],
    [['gastro', 'digestif'], 'Gastro-entérologue'],
    [['neuro', 'cerveau'], 'Neurologue'],
    [['rhumato', 'articulat'], 'Rhumatologue'],
    [['chirurg', 'chirurgie'], 'Chirurgien'],
    [['anesthes'], 'Anesthésiste'],
    [['endocrin', 'diabete', 'thyroid'], 'Endocrinologue'],
    [['oncol', 'cancer', 'tumeur'], 'Oncologue'],
    [['nephro', 'rein', 'renal'], 'Néphrologue'],
    [['hematol', 'sang'], 'Hématologue'],
    [['allergol', 'allergie'], 'Allergologue'],
    [['medecin', 'general', 'omniprat'], 'Médecin généraliste'],
    [['dentist', 'dentaire', 'stomatol'], 'Chirurgien dentiste'],
    [['infirm'], 'Infirmier libéral'],
    [['kinesither', 'masso-kin'], 'Kinésithérapeute'],
    [['osteopath'], 'Ostéopathe'],
    [['psycholog'], 'Psychologue'],
    [['orthophon'], 'Orthophoniste'],
    [['podolog', 'pedicur'], 'Podologue'],
    [['sage-femme', 'sage femme', 'maieut'], 'Sage femme'],
    [['pharmacie', 'pharmacien', 'officin'], 'Pharmacien'],
    [['avocat', 'juridique', 'cabinet d\'avocat'], 'Avocat'],
    [['notair', 'notariat'], 'Notaire'],
    [['expert-compt', 'expert compt', 'expertise compt'], 'Expert comptable'],
    [['architect'], 'Architecte'],
    [['veterinair'], 'Vétérinaire'],
    [['naturopath'], 'Naturopathe'],
    [['acupunct'], 'Acupuncteur'],
    [['chiropract'], 'Chiropracteur'],
    [['dietetici', 'nutrition'], 'Diététicien'],
    [['ergotherap'], 'Ergothérapeute'],
    [['orthoptist'], 'Orthoptiste'],
  ]

  for (const [keywords, metier] of KEYWORD_MAP) {
    if (keywords.some(k => l.includes(k))) return metier
  }

  return requestedLabel
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
  already_in_crm?: boolean
}

// ── Scoring par profession ──
const PROFESSION_SCORES: Record<string, number> = {
  'Chirurgien': 95, 'Radiologue': 93, 'Cardiologue': 92,
  'Dermatologue': 90, 'Ophtalmologue': 90, 'Chirurgien dentiste': 88,
  'Pharmacien': 85, 'Gynécologue': 85, 'Neurologue': 85,
  'Anesthésiste': 88, 'Oncologue': 90, 'Néphrologue': 85,
  'Hématologue': 85, 'Endocrinologue': 85, 'Gastro-entérologue': 85,
  'Pneumologue': 83, 'Urologue': 83, 'Rhumatologue': 82,
  'ORL': 82, 'Pédiatre': 80, 'Allergologue': 80,
  'Médecin généraliste': 80, 'Kinésithérapeute': 70,
  'Orthophoniste': 68, 'Podologue': 65, 'Ergothérapeute': 65,
  'Orthoptiste': 65, 'Infirmier libéral': 60, 'Sage femme': 65,
  'Avocat': 75, 'Notaire': 80, 'Expert comptable': 82,
  'Huissier de justice': 75, 'Commissaire aux comptes': 80,
  'Architecte': 72, 'Vétérinaire': 68,
  'Agent immobilier': 70, 'Consultant': 68, 'Coach sportif': 55,
  'Ostéopathe': 62, 'Naturopathe': 55, 'Psychologue': 65,
  'Psychothérapeute': 65, 'Acupuncteur': 58, 'Chiropracteur': 60,
  'Diététicien': 55, 'Kinésiologue': 55, 'Homéopathe': 60,
  'Géomètre-expert': 70, 'Orthodontiste': 88,
}

const ZONE_BONUS: [string[], number][] = [
  [['paris 1', 'paris 2', 'paris 3', 'paris 4', 'paris 5', 'paris 6', 'paris 7', 'paris 8'], 10],
  [['paris 9', 'paris 10', 'paris 16', 'neuilly', 'boulogne'], 7],
  [['paris', 'vincennes', 'levallois', 'versailles'], 5],
  [['92', 'hauts-de-seine'], 3],
]

function computeLeadScore(metier: string, ville: string): number {
  const base = PROFESSION_SCORES[metier] ?? 65
  const villeNorm = ville.toLowerCase().normalize('NFD').replace(/\p{Mn}/gu, '').trim()
  let bonus = 0
  for (const [zones, points] of ZONE_BONUS) {
    if (zones.some(z => villeNorm.includes(z))) {
      bonus = points
      break
    }
  }
  return Math.min(base + bonus, 100)
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

      // Inférer le vrai métier à partir du libellé d'activité (évite les faux positifs NAF partagés)
      const realMetier = inferMetierFromLibelle(e.libelle_activite_principale, metierLabel)
      const initials = nomDisplay.split(' ').map((w: string) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '??'
      const pjQuery = encodeURIComponent(realMetier)
      const pjVille = encodeURIComponent(villeDisplay)

      return {
        id: i + 1,
        siren,
        initials,
        nom: nomDisplay,
        entreprise,
        metier: realMetier,
        ville: villeDisplay,
        codePostal: e.siege?.code_postal ?? '',
        adresse: e.siege?.adresse ?? '',
        telephone,
        email: null,
        lat: e.siege?.latitude ? parseFloat(e.siege.latitude) : null,
        lng: e.siege?.longitude ? parseFloat(e.siege.longitude) : null,
        googleUrl: `https://www.google.fr/search?q=${encodeURIComponent(realMetier + ' ' + villeDisplay + ' téléphone')}`,
        pagesJaunesUrl: `https://www.pagesjaunes.fr/pagesblanches/recherche?quoiqui=${pjQuery}&ou=${pjVille}`,
        mapsUrl: `https://www.google.fr/maps/search/${encodeURIComponent(realMetier + ' ' + villeDisplay)}`,
        status: 'Non contacté' as const,
        score: computeLeadScore(realMetier, villeDisplay),
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
              score: computeLeadScore(metierLabel, villeExtracted),
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

  let body: { metier?: string; ville?: string; departement?: string; limite?: number; mobileOnly?: boolean }
  try { body = await request.json() } catch { return apiError('Corps invalide', 400) }

  const { metier = '', ville = '', departement = '', limite = 10, mobileOnly = false } = body
  const config = METIERS_CONFIG[metier]
  if (!config) return apiError(`Métier non reconnu: ${metier}`, 400)

  const pappersKey = process.env.PAPPERS_API_KEY
  const googleKey = process.env.GOOGLE_PLACES_API_KEY

  // ── Les 3 canaux tournent en parallèle ──
  const [fromDataGouv, fromGoogle] = await Promise.all([
    canalDataGouv(config.label, config.naf, ville, departement, pappersKey, googleKey),
    googleKey ? canalGooglePlaces(config.label, ville || departement, googleKey) : Promise.resolve([]),
  ])

  // ── Normalisation des téléphones ──
  const normalized = [...fromDataGouv, ...fromGoogle].map(p => {
    const norm = normalizePhoneFR(p.telephone)
    return norm ? { ...p, telephone: norm } : p
  })

  // ── Filtre mobile uniquement si demandé ──
  const filtered = mobileOnly
    ? normalized.filter(p => isMobilePhone(p.telephone))
    : normalized

  // ── Fusion + dédoublonnage par numéro de téléphone ──
  const seenPhones = new Set<string>()
  const seenSirens = new Set<string>()
  const merged: Prospect[] = []

  for (const p of filtered) {
    const normPhone = p.telephone.replace(/[\s.\-]/g, '')
    if (seenPhones.has(normPhone)) continue
    if (p.siren && seenSirens.has(p.siren)) continue
    seenPhones.add(normPhone)
    if (p.siren) seenSirens.add(p.siren)
    merged.push(p)
  }

  // ── Déduplication CRM : exclure les numéros déjà dans le CRM de l'utilisateur ──
  // Charger les numéros existants dans prospects
  const [crmRes, lostRes, callingRes] = await Promise.all([
    supabase
      .from('prospects')
      .select('phone_normalized')
      .eq('user_id', user.id)
      .not('phone_normalized', 'is', null),
    supabase
      .from('prospects')
      .select('phone_normalized')
      .eq('user_id', user.id)
      .eq('pipeline_stage', 'perdu')
      .not('phone_normalized', 'is', null),
    supabase
      .from('calling_session_contacts')
      .select('telephone')
      .eq('user_id', user.id),
  ])

  // Construire les sets de numéros normalisés
  const crmPhones = new Set<string>()
  const lostPhones = new Set<string>()

  if (crmRes.data) {
    for (const row of crmRes.data) {
      if (row.phone_normalized) {
        crmPhones.add(row.phone_normalized.replace(/[\s.\-]/g, ''))
      }
    }
  }
  if (lostRes.data) {
    for (const row of lostRes.data) {
      if (row.phone_normalized) {
        lostPhones.add(row.phone_normalized.replace(/[\s.\-]/g, ''))
      }
    }
  }
  if (callingRes.data) {
    for (const row of callingRes.data) {
      if (row.telephone) {
        const norm = normalizePhoneFR(row.telephone)
        if (norm) crmPhones.add(norm.replace(/[\s.\-]/g, ''))
      }
    }
  }

  // Filtrer les résultats
  let excluded_already_in_crm = 0
  let excluded_lost = 0
  const deduped: Prospect[] = []

  for (const p of merged) {
    const normPhone = p.telephone.replace(/[\s.\-]/g, '')
    if (lostPhones.has(normPhone)) {
      excluded_lost++
      continue
    }
    if (crmPhones.has(normPhone)) {
      excluded_already_in_crm++
      // On pourrait les inclure en grisé, mais on les exclut pour ne pas polluer
      continue
    }
    deduped.push(p)
  }

  // Ré-indexer les IDs et limiter au nombre demandé
  const prospects = deduped.slice(0, Math.max(parseInt(String(limite)), 1)).map((p, i) => ({ ...p, id: i + 1 }))

  return apiSuccess({ prospects, total: deduped.length, excluded_already_in_crm, excluded_lost })
}
