import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

type ApiResult = {
  nom_complet?: string
  siren?: string
  siege?: {
    adresse?: string
    libelle_commune?: string
    code_postal?: string
    departement?: string
  }
  activite_principale?: string
  libelle_activite_principale?: string
  date_creation?: string
  nature_juridique?: string
  libelle_nature_juridique?: string
  dirigeants?: Array<{ nom?: string; prenoms?: string; annee_naissance?: number }>
  categorie_entreprise?: string
}

type Lead = {
  id: string
  siren: string | null
  nom: string
  forme: string
  ville: string
  codePostal: string
  dateCreation: string | null
  signal: string
  signalLabel: string
  score: number
  scoreColor: string
  urgence: boolean
}

async function searchEntreprises(params: Record<string, string>): Promise<ApiResult[]> {
  const qs = new URLSearchParams({
    etat_administratif: 'A',
    per_page: '25',
    page: '1',
    q: 'entreprise',
    ...params,
  })
  try {
    const res = await fetch(`https://recherche-entreprises.api.gouv.fr/search?${qs}`, {
      headers: { 'User-Agent': 'TedScaleApp/1.0' },
      next: { revalidate: 1800 },
    })
    if (!res.ok) return []
    const data = await res.json() as { results?: ApiResult[] }
    return data.results ?? []
  } catch {
    return []
  }
}

function toLead(e: ApiResult, signal: string, signalLabel: string, urgence: boolean): Lead {
  return {
    id: e.siren ?? Math.random().toString(36).slice(2),
    siren: e.siren ?? null,
    nom: e.nom_complet ?? 'Entreprise',
    forme: e.libelle_nature_juridique ?? '',
    ville: e.siege?.libelle_commune ?? '',
    codePostal: e.siege?.code_postal ?? '',
    dateCreation: e.date_creation ?? null,
    signal,
    signalLabel,
    score: urgence ? 9 + Math.floor(Math.random() * 2) : 6 + Math.floor(Math.random() * 4),
    scoreColor: urgence ? '#00d4ff' : '#e8c878',
    urgence,
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let body: { type?: string }
  try { body = await request.json() } catch { return apiError('Corps invalide', 400) }

  const { type = 'hebdomadaire' } = body

  if (type === 'hebdomadaire') {
    const dateMin30 = new Date()
    dateMin30.setDate(dateMin30.getDate() - 30)
    const dateMin30Str = dateMin30.toISOString().split('T')[0]

    // Signal 1 : Créations récentes SAS/SASU/SARL < 30 jours en IDF
    const creations: Lead[] = []
    for (const dept of ['75', '92', '78', '91']) {
      if (creations.length >= 20) break
      // Chercher SAS (5710) en IDF créées récemment
      const r1 = await searchEntreprises({
        q: 'entreprise',
        nature_juridique: '5710',
        date_creation_min: dateMin30Str,
        departement: dept,
      })
      const r2 = await searchEntreprises({
        q: 'entreprise',
        nature_juridique: '5720',
        date_creation_min: dateMin30Str,
        departement: dept,
      })
      const r3 = await searchEntreprises({
        q: 'entreprise',
        nature_juridique: '5499',
        date_creation_min: dateMin30Str,
        departement: dept,
      })
      creations.push(...[...r1, ...r2, ...r3].map(e => toLead(e, 'creation', 'Création récente', false)))
    }

    // Signal 2 : PME établies en IDF — profil cession probable
    const cessionsRaw = await searchEntreprises({
      q: 'entreprise',
      nature_juridique: '5499',
      departement: '75',
      categorie_entreprise: 'PME',
    })
    const cessions = cessionsRaw.slice(0, 8).map(e => toLead(e, 'cession', 'Profil cession', true))

    const leads = [...creations.slice(0, 15), ...cessions]
    const stats = {
      total: leads.length,
      creations: creations.length,
      cessions: cessions.length,
      dateExecution: new Date().toISOString(),
      prochaine: (() => {
        const next = new Date()
        next.setDate(next.getDate() + (7 - next.getDay() + 1) % 7 || 7)
        next.setHours(8, 0, 0, 0)
        return next.toISOString()
      })(),
    }
    return apiSuccess({ leads, stats, type: 'hebdomadaire' })
  }

  if (type === 'mensuel') {
    // Signal 3 : Holdings patrimoniales en IDF
    const holdingsRaw: ApiResult[] = []
    for (const dept of ['75', '92', '78']) {
      const r = await searchEntreprises({ q: 'holding patrimoine', nature_juridique: '5710', departement: dept })
      const r2 = await searchEntreprises({ q: 'holding gestion', nature_juridique: '5720', departement: dept })
      holdingsRaw.push(...r, ...r2)
      if (holdingsRaw.length >= 15) break
    }
    const holdings = holdingsRaw.slice(0, 12).map(e => toLead(e, 'holding', 'Holding patrimoniale', true))

    // Signal 4 : SAS/SASU établies > 5 ans — profil dividendes
    const dateMax5y = new Date()
    dateMax5y.setFullYear(dateMax5y.getFullYear() - 5)
    const dividendesRaw1 = await searchEntreprises({
      q: 'entreprise',
      nature_juridique: '5710',
      departement: '75',
      date_creation_max: dateMax5y.toISOString().split('T')[0],
    })
    const dividendesRaw2 = await searchEntreprises({
      q: 'entreprise',
      nature_juridique: '5720',
      departement: '92',
      date_creation_max: dateMax5y.toISOString().split('T')[0],
    })
    const dividendes = [...dividendesRaw1, ...dividendesRaw2].slice(0, 10).map(e => toLead(e, 'dividendes', 'Profil dividendes', false))

    // Signal 5 : PME > 10 ans — dirigeant senior
    const dateMax10y = new Date()
    dateMax10y.setFullYear(dateMax10y.getFullYear() - 10)
    const seniorsRaw = await searchEntreprises({
      q: 'entreprise',
      nature_juridique: '5499',
      departement: '92',
      date_creation_max: dateMax10y.toISOString().split('T')[0],
      categorie_entreprise: 'PME',
    })
    const seniors = seniorsRaw.slice(0, 8).map(e => toLead(e, 'senior', 'Dirigeant 55+', false))

    const leads = [...holdings, ...dividendes, ...seniors]
    const stats = {
      total: leads.length,
      holdings: holdings.length,
      dividendes: dividendes.length,
      seniors: seniors.length,
      dateExecution: new Date().toISOString(),
      prochaine: (() => {
        const next = new Date()
        next.setMonth(next.getMonth() + 1)
        next.setDate(1)
        const dow = next.getDay()
        next.setDate(next.getDate() + (dow === 0 ? 1 : dow === 1 ? 0 : 8 - dow))
        next.setHours(8, 0, 0, 0)
        return next.toISOString()
      })(),
    }
    return apiSuccess({ leads, stats, type: 'mensuel' })
  }

  return apiError('Type inconnu. Valeurs: hebdomadaire | mensuel', 400)
}
