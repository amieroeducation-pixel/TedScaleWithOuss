import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

export async function GET(_request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString()
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString()
  const monthStart = startOfMonth(now).toISOString()
  const monthEnd = endOfMonth(now).toISOString()

  const [callsRes, rdvRes, prospectsRes, contractsRes, tasksRes, revenueRes, kpisRes, settingsRes] = await Promise.all([
    supabase
      .from('calling_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', weekStart)
      .lte('created_at', weekEnd),

    supabase
      .from('interactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('type', ['rdv1', 'rdv2', 'rdv3'])
      .gte('occurred_at', weekStart)
      .lte('occurred_at', weekEnd),

    supabase
      .from('prospects')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', weekStart)
      .lte('created_at', weekEnd),

    supabase
      .from('contracts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', monthStart)
      .lte('created_at', monthEnd),

    supabase
      .from('tasks')
      .select('id, title, priority, due_date, status')
      .eq('user_id', user.id)
      .neq('status', 'done')
      .order('priority', { ascending: false })
      .limit(6),

    supabase
      .from('revenue_objectives')
      .select('target_amount')
      .eq('user_id', user.id)
      .eq('month', now.toISOString().slice(0, 7))
      .maybeSingle(),

    supabase
      .from('daily_kpis')
      .select('calls, contacts, rdv1, rdv2, blocks')
      .eq('user_id', user.id)
      .gte('date', weekStart.split('T')[0])
      .lte('date', weekEnd.split('T')[0]),

    supabase
      .from('user_settings')
      .select('calls_per_day_target, blocks_per_day_target, rdv_per_week_target')
      .eq('id', user.id)
      .maybeSingle(),
  ])

  const totalCalls = kpisRes.data?.reduce((sum, k) => sum + (k.calls || 0), 0) ?? callsRes.count ?? 0
  const totalBlocks = kpisRes.data?.reduce((sum, k) => sum + (k.blocks || 0), 0) ?? 0
  const rdvCount = rdvRes.count ?? 0
  const newProspects = prospectsRes.count ?? 0
  const contractsCount = contractsRes.count ?? 0

  const targetAmount = revenueRes.data?.target_amount ?? 0

  const settingsData = settingsRes.data

  const weeklyCallTarget = (settingsData?.calls_per_day_target ?? 8) * 5
  const weeklyBlockTarget = (settingsData?.blocks_per_day_target ?? 3) * 5
  const weeklyRelanceTarget = settingsData?.rdv_per_week_target ?? 12

  const callPct = weeklyCallTarget > 0 ? Math.round((totalCalls / weeklyCallTarget) * 100) : 0
  const blockPct = weeklyBlockTarget > 0 ? Math.round((totalBlocks / weeklyBlockTarget) * 100) : 0
  const relancePct = weeklyRelanceTarget > 0 ? Math.round((newProspects / weeklyRelanceTarget) * 100) : 0
  const globalPct = Math.round((callPct + blockPct + relancePct) / 3)

  const actions = (tasksRes.data ?? []).map(t => ({
    text: t.title,
    tag: t.priority >= 3 ? 'Urgent' : t.priority >= 2 ? 'Important' : 'Normal',
    urgent: t.priority >= 3,
  }))

  return apiSuccess({
    kpis: {
      calls: totalCalls,
      rdv: rdvCount,
      newProspects,
      contracts: contractsCount,
      targetAmount,
    },
    barometer: {
      globalPct,
      callPct,
      callVal: `${totalCalls}/${weeklyCallTarget}`,
      blockPct,
      blockVal: `${totalBlocks}/${weeklyBlockTarget}`,
      relancePct,
      relanceVal: `${newProspects}/${weeklyRelanceTarget}`,
    },
    actions,
  })
}
