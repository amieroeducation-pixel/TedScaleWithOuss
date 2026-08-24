import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function GET(_req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  // Séquences actives
  const { count: activeCount } = await supabase
    .from('sequence_instances')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'active')

  // Stats 24h
  const { data: logs24h } = await supabase
    .from('sequence_execution_logs')
    .select('status')
    .eq('user_id', user.id)
    .gte('sent_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString())

  const total24h = logs24h?.length || 0
  const success24h = logs24h?.filter(l => l.status === 'success').length || 0
  const successRate = total24h > 0 ? (success24h / total24h) * 100 : 100

  // Dernier cron
  const { data: lastCron } = await supabase
    .from('cron_logs')
    .select('executed_at, status, details')
    .eq('user_id', user.id)
    .eq('job_name', 'sequences-process')
    .order('executed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Historique 7 jours
  const { data: history7d } = await supabase
    .from('sequence_execution_logs')
    .select('sent_at, status')
    .eq('user_id', user.id)
    .gte('sent_at', new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString())

  const historyByDay = groupByDay(history7d || [])

  return apiSuccess({
    activeSequences: activeCount || 0,
    successRate24h: Math.round(successRate),
    lastCron: lastCron ? {
      executedAt: lastCron.executed_at,
      status: lastCron.status,
      sent: (lastCron.details as any)?.sent || 0,
    } : null,
    history7d: historyByDay,
  })
}

function groupByDay(logs: any[]) {
  const groups: Record<string, { success: number; failed: number; retrying: number }> = {}

  logs.forEach(log => {
    const day = new Date(log.sent_at).toISOString().split('T')[0]
    if (!groups[day]) groups[day] = { success: 0, failed: 0, retrying: 0 }
    groups[day][log.status as 'success' | 'failed' | 'retrying']++
  })

  return Object.entries(groups)
    .map(([day, counts]) => ({ day, ...counts }))
    .sort((a, b) => a.day.localeCompare(b.day))
}
