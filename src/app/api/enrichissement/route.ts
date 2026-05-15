import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

type PappersEntreprise = {
  siege?: { telephone?: string }
  dirigeants?: Array<{ email?: string; telephone?: string; prenom?: string; nom?: string }>
  site_internet?: string
  nom_entreprise?: string
}

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { searchParams } = new URL(request.url)
  const siren = searchParams.get('siren') ?? ''
  const nom = searchParams.get('nom') ?? ''
  const entreprise = searchParams.get('entreprise') ?? ''

  let telephone: string | null = null
  let email: string | null = null
  let website: string | null = null
  let pappersSource = false

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
        email = p.dirigeants?.[0]?.email ?? null
        website = p.site_internet ?? null
        pappersSource = true
      }
    } catch {
      // Pappers unavailable — continue without
    }
  }

  const linkedinQuery = [nom, entreprise].filter(Boolean).join(' ')
  const linkedinUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(linkedinQuery)}&origin=SWITCH_SEARCH_TYPE`

  const pjUrl = siren
    ? `https://www.pagesjaunes.fr/annuaire/chercherlespros?quoiqui=${encodeURIComponent(entreprise || nom)}&ou=France`
    : null

  return apiSuccess({
    telephone,
    email,
    website,
    linkedinUrl,
    pagesJaunesUrl: pjUrl,
    pappersUrl: siren ? `https://www.pappers.fr/entreprise/${siren}` : null,
    source: pappersSource ? 'pappers' : 'generated',
  })
}
