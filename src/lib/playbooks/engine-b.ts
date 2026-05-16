// src/lib/playbooks/engine-b.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const PAPPERS_KEY = process.env.PAPPERS_API_KEY!

// ── B1 — SURVEILLANCE BOOK ────────────────────────────────────────────────────

export async function runSurveillanceBook(runId: string) {
  const { data: clientsData } = await supabase
    .from('prospects')
    .select('company_name, metadata')
    .eq('source', 'crm')
    .not('metadata->siren', 'is', null)
    .limit(100)

  const sirens: string[] = (clientsData ?? [])
    .map((c: any) => c.metadata?.siren)
    .filter(Boolean)

  if (sirens.length === 0) return 0

  const since = new Date()
  since.setDate(since.getDate() - 30)
  const sinceStr = since.toISOString().split('T')[0]

  const alerts: any[] = []
  for (const siren of sirens.slice(0, 20)) {
    try {
      const url = new URL('https://bodacc-datadila.opendatasoft.com/api/records/1.0/search/')
      url.searchParams.set('dataset', 'annonces-commerciales')
      url.searchParams.set('q', `registre:${siren} AND dateparution:[${sinceStr} TO *]`)
      url.searchParams.set('rows', '5')

      const res = await fetch(url.toString())
      const data = await res.json()
      const records: any[] = data.records ?? []

      for (const r of records) {
        const fields = r.fields ?? {}
        const typeEvenement = fields.familleavis_lib ?? 'Modification'
        const urgence =
          typeEvenement.toLowerCase().includes('cession') ||
          typeEvenement.toLowerCase().includes('procédure')
            ? 'Critique'
            : typeEvenement.toLowerCase().includes('modification')
            ? 'Élevé'
            : 'Modéré'

        alerts.push({
          run_id: runId,
          playbook_id: 'b1-surveillance',
          signal_type: 'cession',
          score: urgence === 'Critique' ? 9 : urgence === 'Élevé' ? 6 : 3,
          company_name: fields.denomination ?? siren,
          siren,
          signal_data: {
            typeEvenement,
            urgence,
            dateparution: fields.dateparution,
            details: fields.contenu_annonce ?? '',
          },
          status: 'pending',
        })
      }
    } catch {
      continue
    }
  }

  alerts.sort((a, b) => b.score - a.score)
  if (alerts.length > 0) {
    await supabase.from('playbook_prospects').insert(alerts)
  }
  return alerts.length
}

// ── B3 — DÉTECTION LIQUIDITÉ ──────────────────────────────────────────────────

export async function runDetectionLiquidite(runId: string) {
  const since = new Date()
  since.setDate(since.getDate() - 30)
  const sinceStr = since.toISOString().split('T')[0]

  const url = new URL('https://bodacc-datadila.opendatasoft.com/api/records/1.0/search/')
  url.searchParams.set('dataset', 'annonces-commerciales')
  url.searchParams.set('q', `dateparution:[${sinceStr} TO *]`)
  url.searchParams.set('refine.familleavis_lib', 'Ventes et cessions')
  url.searchParams.set('rows', '50')

  let records: any[] = []
  try {
    const res = await fetch(url.toString())
    const data = await res.json()
    records = data.records ?? []
  } catch {
    return 0
  }

  const prospects = []
  for (const r of records) {
    const fields = r.fields ?? {}
    const siren = fields.registre?.replace(/\s/g, '') ?? ''
    const societe = fields.denomination ?? 'N/C'
    const localisation = fields.ville ?? ''

    let ca = 0
    let dirigeant = 'N/C'
    let ageEstime = 0

    if (siren) {
      try {
        const pRes = await fetch(
          `https://api.pappers.fr/v2/entreprise?api_token=${PAPPERS_KEY}&siren=${siren}`
        )
        const pData = await pRes.json()
        ca = pData.chiffre_affaires ?? 0
        const rep = pData.representants?.[0]
        dirigeant = rep ? `${rep.prenom ?? ''} ${rep.nom ?? ''}`.trim() : 'N/C'
        const anneeNaissance = rep?.annee_de_naissance ?? 0
        ageEstime = anneeNaissance > 0 ? new Date().getFullYear() - anneeNaissance : 0
      } catch {}
    }

    if (ageEstime > 0 && (ageEstime < 45 || ageEstime > 65)) continue

    prospects.push({
      run_id: runId,
      playbook_id: 'b3-liquidite',
      signal_type: 'cession',
      score: ca > 2_000_000 ? 8 : ca > 500_000 ? 6 : 4,
      company_name: societe,
      siren,
      dirigeant_name: dirigeant,
      localisation,
      ca_estime: ca,
      signal_data: { ageEstime, dateparution: fields.dateparution },
      status: 'pending',
    })
  }

  prospects.sort((a, b) => b.score - a.score)
  if (prospects.length > 0) {
    await supabase.from('playbook_prospects').insert(prospects)
  }
  return prospects.length
}

// ── B2 — PRÉPARATION RDV (on-demand) ─────────────────────────────────────────

export async function runPreparationRdv(params: {
  runId: string
  dirigeantName: string
  societe: string
  siren?: string
}) {
  const { runId, dirigeantName, societe, siren } = params

  let ficheData: any = {}
  if (siren) {
    try {
      const [entrepriseRes, bodaccRes] = await Promise.all([
        fetch(`https://api.pappers.fr/v2/entreprise?api_token=${PAPPERS_KEY}&siren=${siren}&extrait_kbis=true`),
        fetch(`https://bodacc-datadila.opendatasoft.com/api/records/1.0/search/?dataset=annonces-commerciales&q=registre:${siren}&rows=10`),
      ])
      const [entreprise, bodacc] = await Promise.all([entrepriseRes.json(), bodaccRes.json()])
      ficheData = {
        structure: entreprise.actionnaires ?? [],
        bilans: entreprise.finances ?? [],
        dirigeants: entreprise.representants ?? [],
        bodacc: bodacc.records?.map((r: any) => r.fields) ?? [],
      }
    } catch {}
  }

  await supabase.from('playbook_prospects').insert({
    run_id: runId,
    playbook_id: 'b2-rdv',
    signal_type: 'cession',
    score: 0,
    company_name: societe,
    siren,
    dirigeant_name: dirigeantName,
    signal_data: ficheData,
    status: 'pending',
  })

  return ficheData
}

// ── B4 — CARTOGRAPHIE HOLDING (on-demand) ────────────────────────────────────

export async function runCartographieHolding(params: {
  runId: string
  societe: string
  siren?: string
}) {
  const { runId, societe, siren } = params
  if (!siren) return null

  let cartographie: any = {}
  try {
    const res = await fetch(
      `https://api.pappers.fr/v2/entreprise?api_token=${PAPPERS_KEY}&siren=${siren}&filiales=true&actionnaires=true&beneficiaires_effectifs=true`
    )
    const data = await res.json()
    cartographie = {
      filiales: data.filiales ?? [],
      actionnaires: data.actionnaires ?? [],
      beneficiaires: data.beneficiaires_effectifs ?? [],
      modifications: data.modifications_statuts ?? [],
    }
  } catch {
    return null
  }

  await supabase.from('playbook_prospects').insert({
    run_id: runId,
    playbook_id: 'b4-cartographie',
    signal_type: 'holding',
    score: 0,
    company_name: societe,
    siren,
    signal_data: cartographie,
    status: 'pending',
  })

  return cartographie
}
