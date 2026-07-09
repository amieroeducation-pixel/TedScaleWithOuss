import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function GET(_request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayIso = today.toISOString()

  const startOfWeek = new Date(today)
  const day = startOfWeek.getDay()
  startOfWeek.setDate(startOfWeek.getDate() - (day === 0 ? 6 : day - 1))
  const weekIso = startOfWeek.toISOString()

  // Tasks
  const { data: allTasks, error: tasksErr } = await supabase
    .from('tasks')
    .select('col, priority, updated_at, this_week')
    .eq('user_id', user.id)
  if (tasksErr) return apiError(tasksErr.message, 500)

  const tasks = allTasks ?? []
  const tasksDoneToday = tasks.filter(t => t.col === 'done' && t.updated_at >= todayIso).length
  const tasksActive = tasks.filter(t => t.col !== 'done').length
  const tasksHighPriorityRemaining = tasks.filter(t => t.priority === 1 && t.col !== 'done').length
  const tasksThisWeek = tasks.filter(t => t.this_week && t.col !== 'done').length

  // Calling contacts today (statut != a_appeler)
  const { count: contactsToday } = await supabase
    .from('calling_session_contacts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .neq('statut_appel', 'a_appeler')
    .gte('created_at', todayIso)

  // Today manual KPIs
  const todayDate = new Date().toISOString().split('T')[0]
  const { data: dailyRow } = await supabase
    .from('daily_kpis')
    .select('contacts, calls, rdv1, rdv2, blocks')
    .eq('user_id', user.id)
    .eq('date', todayDate)
    .maybeSingle()

  // Prospects this week
  const { count: prospectsThisWeek } = await supabase
    .from('prospects')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', weekIso)

  return apiSuccess({
    tasks: {
      done_today: tasksDoneToday,
      active: tasksActive,
      high_priority_remaining: tasksHighPriorityRemaining,
      this_week: tasksThisWeek,
      total: tasks.length,
    },
    prospection: {
      contacts_today: Math.max(contactsToday ?? 0, dailyRow?.contacts ?? 0),
      prospects_this_week: prospectsThisWeek ?? 0,
      calls_today: dailyRow?.calls ?? 0,
      rdv1_today: dailyRow?.rdv1 ?? 0,
      rdv2_today: dailyRow?.rdv2 ?? 0,
      blocks_today: dailyRow?.blocks ?? 0,
    },
  })
}
