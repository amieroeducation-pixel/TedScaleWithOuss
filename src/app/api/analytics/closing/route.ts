import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

// Labels et couleurs par type de produit financier
// Dupliques ici pour decouplage des modules (pas de dependance avec /api/revenue/products)
const PRODUCT_LABELS: Record<string, string> = {
  assurance_vie: 'Assurance vie',
  per: 'PER / Retraite',
  compte_titres: 'Compte-titres',
  contrat_capitalisation: 'Contrat Capi.',
  tontine: 'Tontine',
  scpi: 'SCPI',
  autre: 'Autre',
}

const PRODUCT_COLORS: Record<string, string> = {
  assurance_vie: '#e8c878',    // C.gold
  per: '#7a92e8',              // C.indigo
  compte_titres: '#4ade80',    // C.green
  contrat_capitalisation: '#9a4a8a',
  tontine: '#d8884a',          // C.warn
  scpi: '#b07aee',             // C.purple
  autre: '#6b7280',
}

export type ClosingByProductRow = {
  type: string
  label: string
  converted: number
  total: number
  rate_pct: number
  color: string
}

export async function GET(_request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  // 1. Total prospects (tous statuts confondus)
  const { count: totalProspects } = await supabase
    .from('prospects')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  // 2. Prospects 'converti'
  const { count: convertedTotal } = await supabase
    .from('prospects')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('pipeline_stage', 'converti')

  // 3. Prospects 'perdu'
  const { count: lostTotal } = await supabase
    .from('prospects')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('pipeline_stage', 'perdu')

  // 4. Taux de closing global = converti / (converti + perdu)
  // Denominateur = "decisions prises" (converti + perdu)
  const decisions = (convertedTotal ?? 0) + (lostTotal ?? 0)
  const globalClosingRate = decisions > 0
    ? Math.round(((convertedTotal ?? 0) / decisions) * 100)
    : 0

  // 5. Closing par produit : count contracts groupes par financial_products.type
  // Filtre user_id explicite (T-01D-03 : donnees revenus sensibles)
  const { data: contracts, error } = await supabase
    .from('contracts')
    .select('financial_products(type)')
    .eq('user_id', user.id)

  if (error) return apiError(error.message)

  // Aggreger en JS par type de produit
  const byType: Record<string, number> = {}
  for (const c of (contracts ?? [])) {
    const fp = c.financial_products as any
    const type = (Array.isArray(fp) ? fp[0]?.type : fp?.type) ?? 'autre'
    byType[type] = (byType[type] || 0) + 1
  }

  // 6. rate_pct par produit (DATA-09 v1 approximation — decision explicite) :
  // v1 : rate_pct = part de chaque produit dans les conversions totales (proxy de mix produit).
  // Ce n'est PAS un taux de closing strict (converti/total_prospects par type) car il n'existe
  // pas de lien direct prospect <-> produit dans le schema actuel (le produit est sur le contrat,
  // pas sur le prospect). Une definition plus stricte (par cohorte de prospects) necessitera
  // une vue SQL dediee plus tard.
  const totalConverted = Object.values(byType).reduce((a, b) => a + b, 0) || 1

  const byProduct: ClosingByProductRow[] = Object.entries(byType)
    .map(([type, converted]) => ({
      type,
      label: PRODUCT_LABELS[type] ?? type,
      converted,
      total: totalConverted,
      rate_pct: Math.round((converted / totalConverted) * 100),
      color: PRODUCT_COLORS[type] ?? '#6b7280',
    }))
    .sort((a, b) => b.converted - a.converted)

  return apiSuccess({
    globalClosingRate,
    convertedTotal: convertedTotal ?? 0,
    lostTotal: lostTotal ?? 0,
    totalProspects: totalProspects ?? 0,
    byProduct,
  })
}
