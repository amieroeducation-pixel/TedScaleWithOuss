import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

type ProductRow = {
  type: string
  label: string
  montant: number
  pct: number
  color: string
}

const PRODUCT_LABELS: Record<string, string> = {
  assurance_vie: 'Assurance vie',
  per: 'PER / Retraite',
  compte_titres: 'Compte-titres',
  capi: 'Contrat Capi.',
  tontine: 'Tontine',
  autre: 'Autre',
}

const PRODUCT_COLORS: Record<string, string> = {
  assurance_vie: '#c9a84c',
  per: '#7a6cf0',
  compte_titres: '#4ade80',
  capi: '#9a4a8a',
  tontine: '#f59e0b',
  autre: '#6b7280',
}

export async function GET(_request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { data: contracts, error } = await supabase
    .from('contracts')
    .select('commission_amount, financial_products(type, name)')
    .eq('user_id', user.id)
    .eq('commission_status', 'percue')

  if (error) return apiError(error.message)

  const byType: Record<string, number> = {}
  for (const c of (contracts ?? [])) {
    const fp = c.financial_products as { type?: string } | { type?: string }[] | null
    const type = (Array.isArray(fp) ? fp[0]?.type : fp?.type) ?? 'autre'
    byType[type] = (byType[type] || 0) + Number(c.commission_amount || 0)
  }

  const total = Object.values(byType).reduce((a, b) => a + b, 0) || 1
  const rows: ProductRow[] = Object.entries(byType)
    .map(([type, montant]) => ({
      type,
      label: PRODUCT_LABELS[type] ?? type,
      montant,
      pct: Math.round((montant / total) * 100),
      color: PRODUCT_COLORS[type] ?? '#6b7280',
    }))
    .sort((a, b) => b.montant - a.montant)

  return apiSuccess({ products: rows, total })
}
