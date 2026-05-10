import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

export async function GET(_request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  // Monthly revenue: depuis la vue v_monthly_revenue (corriger bug enum 'payee' → 'percue' fait via la vue)
  const { data: monthly, error: monthlyError } = await supabase
    .from('v_monthly_revenue')
    .select('month_num, revenue, objective, pct_of_objective')
    .eq('user_id', user.id)
    .eq('year', currentYear)
    .order('month_num', { ascending: true })

  if (monthlyError) return apiError(monthlyError.message)

  // Construire byMonth et objByMonth avec 12 entrées garanties
  const byMonth: Record<number, number> = {}
  const objByMonth: Record<number, number> = {}
  for (let m = 1; m <= 12; m++) { byMonth[m] = 0; objByMonth[m] = 0 }
  for (const row of (monthly ?? [])) {
    byMonth[row.month_num] = Number(row.revenue) || 0
    objByMonth[row.month_num] = Number(row.objective) || 0
  }

  const monthlyData = Array.from({ length: 12 }, (_, i) => ({
    month: MONTH_LABELS[i],
    monthNum: i + 1,
    ca: byMonth[i + 1],
    objectif: objByMonth[i + 1],
    current: (i + 1) === currentMonth,
  }))

  // KPI calculations
  const caCurrentMonth = byMonth[currentMonth]
  const caYTD = Object.values(byMonth).reduce((a, b) => a + b, 0)

  // Objective for current month — depuis revenue_objectives, fallback sur la vue
  const { data: objectives } = await supabase
    .from('revenue_objectives')
    .select('amount')
    .eq('user_id', user.id)
    .eq('year', currentYear)
    .eq('month', currentMonth)
    .is('product_type', null)
    .single()

  const objectiveMonth = objectives?.amount ?? objByMonth[currentMonth] ?? 0

  // Count active contracts (tous statuts) et clients
  const { count: contractCount } = await supabase
    .from('contracts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('commission_status', 'percue')

  const { count: clientCount } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const safeContractCount = contractCount ?? 0
  const commissionAvg = safeContractCount > 0 ? Math.round(caYTD / safeContractCount) : 0

  return apiSuccess({
    caCurrentMonth,
    caYTD,
    objectiveMonth,
    contractCount: safeContractCount,
    clientCount: clientCount ?? 0,
    commissionAvg,
    monthlyData,
  })
}
