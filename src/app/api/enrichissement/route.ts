import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiUnauthorized } from '@/lib/api'

type PappersEntreprise = {
  siege?: { telephone?: string }
  dirigeants?: Array<{ email?: string; telephone?: string }>
  site_internet?: string
}

type GoogleTextSearchResult = {
  results?: Array<{ place_id?: string }>
  status?: string
}

type GooglePlaceDetails = {
  result?: { formatted_phone_number?: string }
  status?: string
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
  let source = 'generated'

  // ── Canal 2 : Pappers (prioritaire — données officielles + email dirigeant) ──
  const pappersKey = process.env.PAPPERS_API_KEY
  if (pappersKey && siren) {
    try {
      const res = await fetch(
        `https://api.pappers.fr/v2/entreprise?api_token=${pappersKey}&siren=${siren}`,
        { cache: 'no-store' }
      )
      if (res.ok) {
        const p = await res.json() as PappersEntreprise
        telephone = p.siege?.telephone ?? p.dirigeants?.[0]?.telephone ?? null
        email     = p.dirigeants?.[0]?.email ?? null
        website   = p.site_internet ?? null
        if (telephone || email) source = 'pappers'
      }
    } catch { /* Pappers indisponible */ }
  }

  // ── Canal 3 : Google Places (fallback quand Pappers n'a pas de téléphone) ──
  const googleKey = process.env.GOOGLE_PLACES_API_KEY
  if (googleKey && !telephone) {
    const query = [nom || entreprise, metier, ville].filter(Boolean).join(' ')
    if (query.trim()) {
      try {
        // Étape 1 — trouver le place_id
        const textRes = await fetch(
          `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&language=fr&region=fr&key=${googleKey}`,
          { cache: 'no-store' }
        )
        if (textRes.ok) {
          const textData = await textRes.json() as GoogleTextSearchResult
          const placeId = textData.results?.[0]?.place_id

          if (placeId) {
            // Étape 2 — récupérer le numéro de téléphone
            const detailRes = await fetch(
              `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_phone_number&language=fr&key=${googleKey}`,
              { cache: 'no-store' }
            )
            if (detailRes.ok) {
              const detail = await detailRes.json() as GooglePlaceDetails
              const raw = detail.result?.formatted_phone_number ?? null
              if (raw) {
                telephone = raw.replace(/\s+/g, ' ').trim()
                source = 'google_places'
              }
            }
          }
        }
      } catch { /* Google Places indisponible */ }
    }
  }

  // ── URLs générées (toujours présentes) ──
  const linkedinQuery = [nom, entreprise].filter(Boolean).join(' ')
  const linkedinUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(linkedinQuery || metier + ' ' + ville)}&origin=SWITCH_SEARCH_TYPE`

  const pjQuery = entreprise || nom || metier
  const pjVille = ville || 'France'
  const pjUrl = `https://www.pagesjaunes.fr/annuaire/chercherlespros?quoiqui=${encodeURIComponent(pjQuery)}&ou=${encodeURIComponent(pjVille)}`

  return apiSuccess({
    telephone,
    email,
    website,
    linkedinUrl,
    pagesJaunesUrl: pjUrl,
    pappersUrl: siren ? `https://www.pappers.fr/entreprise/${siren}` : null,
    source,
  })
}
