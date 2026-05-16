import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiUnauthorized } from '@/lib/api'

type PappersEntreprise = {
  siege?: { telephone?: string }
  dirigeants?: Array<{ email?: string; telephone?: string; nom?: string; prenoms?: string }>
  site_internet?: string
}
type PappersRecherche = {
  resultats?: Array<{
    dirigeants?: Array<{ nom?: string; prenoms?: string }>
  }>
}
type GoogleTextSearchResult = {
  results?: Array<{ place_id?: string }>
}
type GooglePlaceDetails = {
  result?: { formatted_phone_number?: string }
}

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { searchParams } = new URL(request.url)
  const siren      = searchParams.get('siren')      ?? ''
  const nom        = searchParams.get('nom')        ?? ''
  const entreprise = searchParams.get('entreprise') ?? ''
  const metier     = searchParams.get('metier')     ?? ''
  const ville      = searchParams.get('ville')      ?? ''

  let telephone: string | null = null
  let email: string | null = null
  let website: string | null = null
  let nomDirigeant: string | null = null
  let source = 'generated'

  const pappersKey = process.env.PAPPERS_API_KEY

  // ── Canal 2a : Pappers par SIREN (officiel) ──
  if (pappersKey && siren) {
    try {
      const res = await fetch(
        `https://api.pappers.fr/v2/entreprise?api_token=${pappersKey}&siren=${siren}`,
        { cache: 'no-store', signal: AbortSignal.timeout(5000) }
      )
      if (res.ok) {
        const p = await res.json() as PappersEntreprise
        telephone = p.siege?.telephone ?? p.dirigeants?.[0]?.telephone ?? null
        email     = p.dirigeants?.[0]?.email ?? null
        website   = p.site_internet ?? null
        const d = p.dirigeants?.[0]
        if (d?.nom) nomDirigeant = `${d.prenoms ?? ''} ${d.nom}`.trim()
        if (telephone || email) source = 'pappers'
      }
    } catch { /* Pappers indisponible */ }
  }

  // ── Canal 2b : Pappers recherche par nom de cabinet (quand pas de SIREN) ──
  if (pappersKey && !siren && (entreprise || nom) && !nomDirigeant) {
    try {
      const q = encodeURIComponent(entreprise || nom)
      const res = await fetch(
        `https://api.pappers.fr/v2/recherche?api_token=${pappersKey}&q=${q}&per_page=1`,
        { cache: 'no-store', signal: AbortSignal.timeout(4000) }
      )
      if (res.ok) {
        const data = await res.json() as PappersRecherche
        const d = data.resultats?.[0]?.dirigeants?.[0]
        if (d?.nom) nomDirigeant = `${d.prenoms ?? ''} ${d.nom}`.trim()
      }
    } catch { /* Pappers indisponible */ }
  }

  // ── Canal 3 : Google Places (fallback téléphone) ──
  const googleKey = process.env.GOOGLE_PLACES_API_KEY
  if (googleKey && !telephone) {
    const queries = [
      [entreprise || nom, metier, ville].filter(Boolean).join(' '),
      [metier, ville].filter(Boolean).join(' '),
    ].filter(q => q.trim())

    for (const query of queries) {
      if (telephone) break
      try {
        const textRes = await fetch(
          `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&language=fr&region=fr&key=${googleKey}`,
          { cache: 'no-store', signal: AbortSignal.timeout(4000) }
        )
        if (textRes.ok) {
          const textData = await textRes.json() as GoogleTextSearchResult
          const placeId = textData.results?.[0]?.place_id
          if (placeId) {
            const detailRes = await fetch(
              `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_phone_number&language=fr&key=${googleKey}`,
              { cache: 'no-store', signal: AbortSignal.timeout(3000) }
            )
            if (detailRes.ok) {
              const detail = await detailRes.json() as GooglePlaceDetails
              const raw = detail.result?.formatted_phone_number ?? null
              if (raw) { telephone = raw.replace(/\s+/g, ' ').trim(); source = 'google_places' }
            }
          }
        }
      } catch { /* Google Places indisponible */ }
    }
  }

  const linkedinQuery = [nom, entreprise].filter(Boolean).join(' ')
  const linkedinUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(linkedinQuery || metier + ' ' + ville)}&origin=SWITCH_SEARCH_TYPE`
  const pjQuery = entreprise || nom || metier
  const pjVille = ville || 'France'
  const pjUrl = `https://www.pagesjaunes.fr/annuaire/chercherlespros?quoiqui=${encodeURIComponent(pjQuery)}&ou=${encodeURIComponent(pjVille)}`

  return apiSuccess({
    telephone,
    email,
    website,
    nomDirigeant,
    linkedinUrl,
    pagesJaunesUrl: pjUrl,
    pappersUrl: siren ? `https://www.pappers.fr/entreprise/${siren}` : null,
    source,
  })
}
