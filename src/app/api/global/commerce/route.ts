import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'
import { startOfMonth, endOfMonth } from 'date-fns'

export async function GET(_request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const now = new Date()
  const monthStart = startOfMonth(now).toISOString()
  const monthEnd = endOfMonth(now).toISOString()

  const [contractsRes, revenueObjRes] = await Promise.all([
    supabase
      .from('contracts')
      .select('id, amount')
      .eq('user_id', user.id)
      .gte('created_at', monthStart)
      .lte('created_at', monthEnd),
    supabase
      .from('revenue_objectives')
      .select('target_amount')
      .eq('user_id', user.id)
      .eq('month', now.toISOString().slice(0, 7))
      .single(),
  ])

  if (contractsRes.error) return apiError(contractsRes.error.message, 500)

  const contracts = contractsRes.data?.length ?? 0
  const revenue = contractsRes.data?.reduce((sum, c) => sum + (c.amount || 0), 0) ?? 0
  const target = revenueObjRes.data?.target_amount ?? 50000

  return apiSuccess({ contracts, revenue, target })
}
