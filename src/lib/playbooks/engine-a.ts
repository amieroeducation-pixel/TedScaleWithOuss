// src/lib/playbooks/engine-a.ts
import { scoreProspect } from './scoring'
import { buildMessages } from './message-generator'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PAPPERS_KEY = process.env.PAPPERS_API_KEY!

// ── A2 — CESSIONS BODACC ──────────────────────────────────────────────────────

export async function runCessionsBodacc(runId: string) {
  const since = new Date()
  since.setDate(since.getDate() - 14)
  const sinceStr = since.toISOString().split('T')[0]

  const url = new URL('https://bodacc-datadila.opendatasoft.com/api/records/1.0/search/')
  url.searchParams.set('dataset', 'annonces-commerciales')
  url.searchParams.set('q', `dateparution:[${sinceStr} TO *]`)
  url.searchParams.set('refine.familleavis_lib', 'Ventes et cessions')
  url.searchParams.set('rows', '50')

  const res = await fetch(url.toString())
  const data = await res.json()
  const records: any[] = data.records ?? []

  const prospects = []
  for (const record of records) {
    const fields = record.fields ?? {}
    const siren = fields.registre?.replace(/\s/g, '') ?? ''
    const societe = fields.denomination ?? fields.nomcommercial ?? 'N/C'
    const localisation = fields.ville ?? fields.cp ?? ''

    let dirigeant = 'N/C'
    let ca = 0
    if (siren) {
      try {
        const pRes = await fetch(
          `https://api.pappers.fr/v2/entreprise?api_token=${PAPPERS_KEY}&siren=${siren}`
        )
        const pData = await pRes.json()
        const rep = pData.representants?.[0]
        dirigeant = rep ? `${rep.prenom ?? ''} ${rep.nom ?? ''}`.trim() : 'N/C'
        ca = pData.chiffre_affaires ?? 0
      } catch {
        // enrichissement échoué, on continue
      }
    }

    const prenom = dirigeant.split(' ')[0] ?? 'Dirigeant'
    const score = scoreProspect({ signalType: 'cession', caEstime: ca, localisation })
    const messages = buildMessages({ signalType: 'cession', prenom, societe })

    const pubDate = new Date(fields.dateparution ?? Date.now())
    const joursEcoules = Math.floor((Date.now() - pubDate.getTime()) / 86400000)
    const joursRestants = Math.max(0, 90 - joursEcoules)

    prospects.push({
      run_id: runId,
      playbook_id: 'a2-cessions',
      signal_type: 'cession',
      score,
      company_name: societe,
      siren,
      dirigeant_name: dirigeant,
      localisation,
      ca_estime: ca,
      signal_data: { joursRestants, dateparution: fields.dateparution },
      message_j0_a: messages.a,
      message_j0_b: messages.b,
      message_j0_c: messages.c,
      status: 'pending',
    })
  }

  prospects.sort((a, b) => b.score - a.score)
  if (prospects.length > 0) {
    await supabase.from('playbook_prospects').insert(prospects)
  }
  return prospects.length
}

// ── A1 — CRÉATIONS RÉCENTES ───────────────────────────────────────────────────

export async function runCreationsRecentes(runId: string) {
  const since = new Date()
  since.setDate(since.getDate() - 30)
  const sinceStr = since.toISOString().split('T')[0]

  const SECTEURS_NAF = ['86', '69', '70', '68', '41', '42', '43']
  const FORMES = ['SAS', 'SASU', 'SARL']

  let allProspects: any[] = []

  for (const naf of SECTEURS_NAF) {
    const url = new URL('https://recherche-entreprises.api.gouv.fr/search')
    url.searchParams.set('activite_principale', `${naf}.*`)
    url.searchParams.set('date_creation_min', sinceStr)
    url.searchParams.set('per_page', '20')

    try {
      const res = await fetch(url.toString())
      const data = await res.json()
      const results: any[] = data.results ?? []

      for (const r of results) {
        const forme = r.nature_juridique ?? ''
        if (!FORMES.some(f => forme.includes(f))) continue
        const capital = r.capital ?? 0
        if (capital < 10000) continue

        const siren = r.siren ?? ''
        const societe = r.nom_raison_sociale ?? r.nom_complet ?? 'N/C'
        const localisation = r.siege?.code_postal ?? r.siege?.commune ?? ''
        const prenom = 'Dirigeant'
        const score = scoreProspect({ signalType: 'creation', caEstime: capital, localisation })
        const messages = buildMessages({ signalType: 'creation', prenom, societe })

        allProspects.push({
          run_id: runId,
          playbook_id: 'a1-creations',
          signal_type: 'creation',
          score,
          company_name: societe,
          siren,
          dirigeant_name: prenom,
          localisation,
          ca_estime: capital,
          signal_data: { forme, naf },
          message_j0_a: messages.a,
          message_j0_b: messages.b,
          message_j0_c: messages.c,
          status: 'pending',
        })
      }
    } catch {
      continue
    }
  }

  allProspects.sort((a, b) => b.score - a.score)
  const top50 = allProspects.slice(0, 50)
  if (top50.length > 0) {
    await supabase.from('playbook_prospects').insert(top50)
  }
  return top50.length
}

// ── A3 — HOLDINGS ─────────────────────────────────────────────────────────────

export async function runHoldings(runId: string) {
  const since = new Date()
  since.setDate(since.getDate() - 60)
  const sinceStr = since.toISOString().split('T')[0]

  const url = new URL('https://recherche-entreprises.api.gouv.fr/search')
  url.searchParams.set('activite_principale', '6420Z')
  url.searchParams.set('date_creation_min', sinceStr)
  url.searchParams.set('per_page', '50')

  const res = await fetch(url.toString())
  const data = await res.json()
  const results: any[] = data.results ?? []

  const prospects = []
  for (const r of results) {
    const capital = r.capital ?? 0
    if (capital < 50000) continue

    const siren = r.siren ?? ''
    const societe = r.nom_raison_sociale ?? 'N/C'
    const localisation = r.siege?.code_postal ?? ''
    let dirigeant = 'N/C'
    let ca = 0

    if (siren) {
      try {
        const pRes = await fetch(
          `https://api.pappers.fr/v2/entreprise?api_token=${PAPPERS_KEY}&siren=${siren}`
        )
        const pData = await pRes.json()
        const rep = pData.representants?.[0]
        dirigeant = rep ? `${rep.prenom ?? ''} ${rep.nom ?? ''}`.trim() : 'N/C'
        ca = pData.chiffre_affaires ?? 0
      } catch {}
    }

    const prenom = dirigeant.split(' ')[0] ?? 'Dirigeant'
    const score = scoreProspect({ signalType: 'holding', caEstime: ca, localisation })
    const messages = buildMessages({ signalType: 'holding', prenom, societe })

    prospects.push({
      run_id: runId,
      playbook_id: 'a3-holdings',
      signal_type: 'holding',
      score,
      company_name: societe,
      siren,
      dirigeant_name: dirigeant,
      localisation,
      ca_estime: ca,
      signal_data: { capital },
      message_j0_a: messages.a,
      message_j0_b: messages.b,
      message_j0_c: messages.c,
      status: 'pending',
    })
  }

  prospects.sort((a, b) => b.score - a.score)
  if (prospects.length > 0) {
    await supabase.from('playbook_prospects').insert(prospects)
  }
  return prospects.length
}

// ── A4 — DIVIDENDES ───────────────────────────────────────────────────────────

export async function runDividendes(runId: string) {
  let results: any[] = []
  try {
    const res = await fetch(
      `https://api.pappers.fr/v2/recherche?api_token=${PAPPERS_KEY}&dividendes_min=150000&effectif_max=50&page=1&par_page=50`
    )
    const data = await res.json()
    results = data.resultats ?? []
  } catch {
    return 0
  }

  const prospects = []
  for (const r of results) {
    const societe = r.nom_entreprise ?? 'N/C'
    const siren = r.siren ?? ''
    const dividendes = r.dividendes ?? 0
    const ca = r.chiffre_affaires ?? 0
    const localisation = r.siege?.ville ?? ''
    const rep = r.dirigeants?.[0]
    const dirigeant = rep ? `${rep.prenom ?? ''} ${rep.nom ?? ''}`.trim() : 'N/C'
    const prenom = dirigeant.split(' ')[0] ?? 'Dirigeant'

    const score = scoreProspect({ signalType: 'dividendes', caEstime: ca, localisation })
    const messages = buildMessages({ signalType: 'dividendes', prenom, societe })

    prospects.push({
      run_id: runId,
      playbook_id: 'a4-dividendes',
      signal_type: 'dividendes',
      score,
      company_name: societe,
      siren,
      dirigeant_name: dirigeant,
      localisation,
      ca_estime: ca,
      signal_data: { dividendes, patrimoineEstime: dividendes * 5 },
      message_j0_a: messages.a,
      message_j0_b: messages.b,
      message_j0_c: messages.c,
      status: 'pending',
    })
  }

  prospects.sort((a, b) => b.score - a.score)
  if (prospects.length > 0) {
    await supabase.from('playbook_prospects').insert(prospects)
  }
  return prospects.length
}

// ── A5 — DIRIGEANTS 55+ ───────────────────────────────────────────────────────

export async function runDirigeants55(runId: string) {
  const anneeMax = new Date().getFullYear() - 55
  let results: any[] = []
  try {
    const res = await fetch(
      `https://api.pappers.fr/v2/recherche?api_token=${PAPPERS_KEY}&annee_naissance_dirigeant_max=${anneeMax}&chiffre_affaires_min=500000&chiffre_affaires_max=10000000&page=1&par_page=50`
    )
    const data = await res.json()
    results = data.resultats ?? []
  } catch {
    return 0
  }

  const SECTEURS_CIBLES_NORMALIZED = ['industrie', 'services', 'sante', 'commerce de gros', 'medical']
  const prospects = []

  for (const r of results) {
    const secteur = (r.libelle_code_naf ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
    if (!SECTEURS_CIBLES_NORMALIZED.some(s => secteur.includes(s))) continue

    const societe = r.nom_entreprise ?? 'N/C'
    const siren = r.siren ?? ''
    const ca = r.chiffre_affaires ?? 0
    const localisation = r.siege?.ville ?? ''
    const rep = r.dirigeants?.[0]
    const dirigeant = rep ? `${rep.prenom ?? ''} ${rep.nom ?? ''}`.trim() : 'N/C'
    const prenom = dirigeant.split(' ')[0] ?? 'Dirigeant'
    const anneeCreation = r.date_creation ? new Date(r.date_creation).getFullYear() : 0
    const anneesExistence = anneeCreation > 0 ? new Date().getFullYear() - anneeCreation : undefined

    if (!anneesExistence || anneesExistence < 10) continue

    const score = scoreProspect({ signalType: 'dirigeant_55', caEstime: ca, localisation })
    const messages = buildMessages({ signalType: 'dirigeant_55', prenom, societe, anneesExistence })

    prospects.push({
      run_id: runId,
      playbook_id: 'a5-dirigeants',
      signal_type: 'dirigeant_55',
      score,
      company_name: societe,
      siren,
      dirigeant_name: dirigeant,
      localisation,
      ca_estime: ca,
      signal_data: { anneesExistence, anneeCreation },
      message_j0_a: messages.a,
      message_j0_b: messages.b,
      message_j0_c: messages.c,
      status: 'pending',
    })
  }

  prospects.sort((a, b) => b.score - a.score)
  if (prospects.length > 0) {
    await supabase.from('playbook_prospects').insert(prospects)
  }
  return prospects.length
}
