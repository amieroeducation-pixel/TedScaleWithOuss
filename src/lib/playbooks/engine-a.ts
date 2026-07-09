// src/lib/playbooks/engine-a.ts
import { scoreProspect } from './scoring'
import { buildMessages } from './message-generator'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

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
    const score = scoreProspect({ signalType: 'cession', caEstime: ca, localisation, capitalAmount: ca })
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
    await getSupabase().from('playbook_prospects').insert(prospects)
  }
  return prospects.length
}

// ── A1 — CRÉATIONS RÉCENTES ───────────────────────────────────────────────────

export async function runCreationsRecentes(runId: string) {
  const since = new Date()
  since.setDate(since.getDate() - 30)
  const sinceStr = since.toISOString().split('T')[0]

  // Codes NAF exacts (avec point) pour secteurs à fort patrimoine
  const NAF_CODES = ['70.22Z', '69.20Z', '68.10Z', '68.20A', '70.10Z', '86.10Z', '86.21Z', '64.20Z']
  // Codes numériques nature juridique : SAS=5710, SASU=5720, SARL=5499, EURL=5498
  const FORMES_CODES = ['5710', '5720', '5499', '5498']

  let allProspects: any[] = []

  for (const naf of NAF_CODES) {
    const url = new URL('https://recherche-entreprises.api.gouv.fr/search')
    url.searchParams.set('activite_principale', naf)
    url.searchParams.set('date_creation_min', sinceStr)
    url.searchParams.set('region', '11') // Île-de-France
    url.searchParams.set('per_page', '25')

    try {
      const res = await fetch(url.toString())
      const data = await res.json()
      const results: any[] = data.results ?? []

      for (const r of results) {
        if (!FORMES_CODES.includes(r.nature_juridique ?? '')) continue

        const siren = r.siren ?? ''
        const societe = r.nom_raison_sociale ?? r.nom_complet ?? 'N/C'
        const localisation = r.siege?.code_postal ?? r.siege?.commune ?? ''

        // Dirigeant extrait directement depuis l'API (pas besoin de Pappers)
        const rep = r.dirigeants?.find((d: any) => d.type_dirigeant === 'personne physique')
        const dirigeant = rep ? `${rep.prenoms ?? ''} ${rep.nom ?? ''}`.trim() : 'N/C'
        const prenom = dirigeant.split(' ')[0] ?? 'Dirigeant'

        // CA depuis les finances (dernière année disponible)
        const annees = Object.keys(r.finances ?? {}).sort().reverse()
        const ca = annees.length > 0 ? (r.finances[annees[0]]?.ca ?? 0) : 0

        const score = scoreProspect({ signalType: 'creation', caEstime: ca, localisation })
        const messages = buildMessages({ signalType: 'creation', prenom, societe })

        allProspects.push({
          run_id: runId,
          playbook_id: 'a1-creations',
          signal_type: 'creation',
          score,
          company_name: societe,
          siren,
          dirigeant_name: dirigeant,
          localisation,
          ca_estime: ca,
          signal_data: { nature_juridique: r.nature_juridique, naf },
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
    await getSupabase().from('playbook_prospects').insert(top50)
  }
  return top50.length
}

// ── A3 — HOLDINGS ─────────────────────────────────────────────────────────────

export async function runHoldings(runId: string) {
  const since = new Date()
  since.setDate(since.getDate() - 60)
  const sinceStr = since.toISOString().split('T')[0]

  const url = new URL('https://recherche-entreprises.api.gouv.fr/search')
  url.searchParams.set('activite_principale', '64.20Z')
  url.searchParams.set('date_creation_min', sinceStr)
  url.searchParams.set('per_page', '50')

  const res = await fetch(url.toString())
  const data = await res.json()
  const results: any[] = data.results ?? []

  const prospects = []
  for (const r of results) {
    const siren = r.siren ?? ''
    const societe = r.nom_raison_sociale ?? r.nom_complet ?? 'N/C'
    const localisation = r.siege?.code_postal ?? r.siege?.commune ?? ''

    const rep = r.dirigeants?.find((d: any) => d.type_dirigeant === 'personne physique')
    const dirigeant = rep ? `${rep.prenoms ?? ''} ${rep.nom ?? ''}`.trim() : 'N/C'
    const prenom = dirigeant.split(' ')[0] ?? 'Dirigeant'

    const annees = Object.keys(r.finances ?? {}).sort().reverse()
    const ca = annees.length > 0 ? (r.finances[annees[0]]?.ca ?? 0) : 0

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
      signal_data: { naf: '64.20Z' },
      message_j0_a: messages.a,
      message_j0_b: messages.b,
      message_j0_c: messages.c,
      status: 'pending',
    })
  }

  prospects.sort((a, b) => b.score - a.score)
  if (prospects.length > 0) {
    await getSupabase().from('playbook_prospects').insert(prospects)
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

    const score = scoreProspect({ signalType: 'dividendes', caEstime: ca, localisation, capitalAmount: dividendes * 5 })
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
    await getSupabase().from('playbook_prospects').insert(prospects)
  }
  return prospects.length
}

// ── A6 — HÉRITIERS BODACC ─────────────────────────────────────────────────────

export async function runHeritiersBodacc(runId: string) {
  const since = new Date()
  since.setDate(since.getDate() - 30)
  const sinceStr = since.toISOString().split('T')[0]

  const url = new URL('https://bodacc-datadila.opendatasoft.com/api/records/1.0/search/')
  url.searchParams.set('dataset', 'annonces-commerciales')
  url.searchParams.set('q', `dateparution:[${sinceStr} TO *]`)
  url.searchParams.set('refine.familleavis_lib', 'Avis divers')
  url.searchParams.set('rows', '100')

  const res = await fetch(url.toString())
  const data = await res.json()
  const records: any[] = data.records ?? []

  const successionRecords = records.filter((r: any) => {
    const nature = (r.fields?.nature ?? '').toLowerCase()
    const texte = (r.fields?.texte ?? '').toLowerCase()
    return nature.includes('succession') || nature.includes('attestation') ||
      texte.includes('succession') || texte.includes('héritier') || texte.includes('décès')
  })

  const prospects = []
  for (const record of successionRecords) {
    const fields = record.fields ?? {}
    const siren = fields.registre?.replace(/\s/g, '') ?? ''
    const nom = fields.denomination ?? fields.personne ?? 'N/C'
    const localisation = fields.ville ?? fields.cp ?? ''

    let dirigeant = nom
    let ca = 0
    if (siren) {
      try {
        const pRes = await fetch(
          `https://api.pappers.fr/v2/entreprise?api_token=${PAPPERS_KEY}&siren=${siren}`
        )
        const pData = await pRes.json()
        const rep = pData.representants?.[0]
        if (rep) dirigeant = `${rep.prenom ?? ''} ${rep.nom ?? ''}`.trim()
        ca = pData.chiffre_affaires ?? 0
      } catch {}
    }

    const prenom = dirigeant.split(' ')[0] ?? 'Héritier'
    const score = scoreProspect({ signalType: 'heritage', caEstime: ca, localisation, capitalAmount: ca })
    const messages = buildMessages({ signalType: 'heritage', prenom, societe: nom })

    prospects.push({
      run_id: runId,
      playbook_id: 'a6-heritiers',
      signal_type: 'heritage',
      score,
      company_name: nom,
      siren,
      dirigeant_name: dirigeant,
      localisation,
      ca_estime: ca,
      signal_data: { nature: fields.nature, dateparution: fields.dateparution },
      message_j0_a: messages.a,
      message_j0_b: messages.b,
      message_j0_c: messages.c,
      status: 'pending',
    })
  }

  prospects.sort((a, b) => b.score - a.score)
  const top50 = prospects.slice(0, 50)
  if (top50.length > 0) {
    await getSupabase().from('playbook_prospects').insert(top50)
  }
  return top50.length
}

// ── A7 — VENDEURS IMMOBILIER IDF (DVF) ───────────────────────────────────────

export async function runVendeursImmo(runId: string) {
  const since = new Date()
  since.setDate(since.getDate() - 90)
  const sinceStr = since.toISOString().split('T')[0]

  const IDF_DEPARTEMENTS = ['75', '92', '93', '94', '78', '91', '77', '95']
  const PRIX_MIN = 400_000

  const prospects = []

  for (const dept of IDF_DEPARTEMENTS) {
    const url = new URL('https://api.cquest.org/dvf')
    url.searchParams.set('code_departement', dept)
    url.searchParams.set('date_mutation_min', sinceStr)
    url.searchParams.set('valeur_fonciere_min', String(PRIX_MIN))
    url.searchParams.set('nature_mutation', 'Vente')
    url.searchParams.set('limit', '30')

    try {
      const res = await fetch(url.toString())
      const data = await res.json()
      const results: any[] = data.resultats ?? data.features ?? data ?? []

      for (const r of results) {
        const fields = r.properties ?? r
        const valeur = fields.valeur_fonciere ?? fields.valeur ?? 0
        if (valeur < PRIX_MIN) continue

        const commune = fields.nom_commune ?? fields.commune ?? ''
        const codePostal = fields.code_postal ?? dept
        const localisation = `${commune} ${codePostal}`.trim()
        const adresse = fields.adresse_nom_voie ?? fields.adresse ?? ''
        const dateMutation = fields.date_mutation ?? ''
        const typeBien = fields.type_local ?? 'Bien immobilier'

        const score = scoreProspect({ signalType: 'vente_immo', localisation, capitalAmount: valeur })
        const prenom = 'Propriétaire'
        const societe = `${typeBien} ${commune}`
        const messages = buildMessages({ signalType: 'vente_immo', prenom, societe })

        prospects.push({
          run_id: runId,
          playbook_id: 'a7-vendeurs-immo',
          signal_type: 'vente_immo',
          score,
          company_name: `${typeBien} — ${adresse}, ${commune}`,
          siren: '',
          dirigeant_name: prenom,
          localisation,
          ca_estime: valeur,
          signal_data: { valeur_fonciere: valeur, date_mutation: dateMutation, type_local: typeBien, adresse },
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

  prospects.sort((a, b) => b.score - a.score)
  const top50 = prospects.slice(0, 50)
  if (top50.length > 0) {
    await getSupabase().from('playbook_prospects').insert(top50)
  }
  return top50.length
}

// ── A8 — RADIATIONS BODACC ────────────────────────────────────────────────────

export async function runRadiationsBodacc(runId: string) {
  const since = new Date()
  since.setDate(since.getDate() - 30)
  const sinceStr = since.toISOString().split('T')[0]

  const url = new URL('https://bodacc-datadila.opendatasoft.com/api/records/1.0/search/')
  url.searchParams.set('dataset', 'annonces-commerciales')
  url.searchParams.set('q', `dateparution:[${sinceStr} TO *]`)
  url.searchParams.set('refine.familleavis_lib', 'Radiations')
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
    const score = scoreProspect({ signalType: 'radiation', caEstime: ca, localisation, capitalAmount: ca })
    const messages = buildMessages({ signalType: 'radiation', prenom, societe })

    const pubDate = new Date(fields.dateparution ?? Date.now())
    const joursEcoules = Math.floor((Date.now() - pubDate.getTime()) / 86400000)
    const joursRestants = Math.max(0, 45 - joursEcoules)

    prospects.push({
      run_id: runId,
      playbook_id: 'a8-radiations',
      signal_type: 'radiation',
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
    await getSupabase().from('playbook_prospects').insert(prospects)
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

  const prospects = []

  for (const r of results) {
    const societe = r.nom_entreprise ?? 'N/C'
    const siren = r.siren ?? ''
    const ca = r.chiffre_affaires ?? 0
    const localisation = r.siege?.ville ?? ''
    const rep = r.dirigeants?.[0]
    const dirigeant = rep ? `${rep.prenom ?? ''} ${rep.nom ?? ''}`.trim() : 'N/C'
    const prenom = dirigeant.split(' ')[0] ?? 'Dirigeant'
    const anneeCreation = r.date_creation ? new Date(r.date_creation).getFullYear() : 0
    const anneesExistence = anneeCreation > 0 ? new Date().getFullYear() - anneeCreation : 0

    if (anneesExistence < 5) continue

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
    await getSupabase().from('playbook_prospects').insert(prospects)
  }
  return prospects.length
}
