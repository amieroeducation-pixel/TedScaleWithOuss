import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function GET(_request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  // Monthly revenue: commissions grouped by month (current year)
  const { data: contracts, error: contractsError } = await supabase
    .from('contracts')
    .select('commission_amount, commission_date, commission_status')
    .eq('user_id', user.id)
    .eq('commission_status', 'payee')
    .gte('commission_date', `${currentYear}-01-01`)
    .lte('commission_date', `${currentYear}-12-31`)

  if (contractsError) return apiError(contractsError.message)

  // Group by month
  const byMonth: Record<number, number> = {}
  for (let m = 1; m <= 12; m++) byMonth[m] = 0
  for (const c of (contracts ?? [])) {
    const month = new Date(c.commission_date).getMonth() + 1
    byMonth[month] = (byMonth[month] || 0) + Number(c.commission_amount)
  }

  // Current month total
  const caCurrentMonth = byMonth[currentMonth] || 0
  const caYTD = Object.values(byMonth).reduce((a, b) => a + b, 0)

  // Objective for current month
  const { data: objectives } = await supabase
    .from('revenue_objectives')
    .select('amount')
    .eq('user_id', user.id)
    .eq('year', currentYear)
    .eq('month', currentMonth)
    .is('product_type', null)
    .single()

  const objectiveMonth = objectives?.amount ?? 0

  // Count active contracts and clients
  const { count: contractCount } = await supabase
    .from('contracts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const { count: clientCount } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
  const monthlyData = Object.entries(byMonth).map(([m, value]) => ({
    month: MONTH_LABELS[parseInt(m) - 1],
    value,
    current: parseInt(m) === currentMonth,
  }))

  return apiSuccess({
    caCurrentMonth,
    caYTD,
    objectiveMonth,
    contractCount: contractCount ?? 0,
    clientCount: clientCount ?? 0,
    monthlyData,
  })
}
