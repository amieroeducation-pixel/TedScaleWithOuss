import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

type Period = 'day' | 'week' | 'month'

function getWeekBounds(date: Date) {
  const start = new Date(date)
  const day = start.getDay()
  start.setDate(start.getDate() - (day === 0 ? 6 : day - 1))
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

function getMonthBounds(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

function computeObjectives(obj: any, period: Period, month: number) {
  if (!obj) return { appels: 0, contacts: 0, rdv_pris: 0, rdv_faits: 0, propositions: 0, collecte: 0 }

  const intensities: number[] = obj.month_intensity ?? [1,1,1,1,1,1,1,1,1,1,1,1]
  const weeksPerMonth: number[] = obj.weeks_per_month ?? [4,4,4,4,4,4,4,4,5,4,4,5]
  const totalIntensity = intensities.reduce((a: number, b: number) => a + b, 0)
  const monthCoeff = intensities[month] / totalIntensity
  const weeksInMonth = weeksPerMonth[month]

  const monthly = (annual: number) => Math.round(annual * monthCoeff)
  const weekly = (annual: number) => Math.round(monthly(annual) / weeksInMonth)
  const daily = (annual: number) => Math.round(weekly(annual) / 5)

  const multiplier = period === 'month' ? monthly : period === 'week' ? weekly : daily

  return {
    appels: multiplier(obj.obj_appels_annuel),
    contacts: multiplier(obj.obj_contacts_annuel),
    rdv_pris: multiplier(obj.obj_rdv_pris_annuel),
    rdv_faits: multiplier(obj.obj_rdv_faits_annuel),
    propositions: multiplier(obj.obj_propositions_annuel),
    collecte: multiplier(obj.obj_collecte_annuel),
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const url = new URL(request.url)
  const period = (url.searchParams.get('period') || 'week') as Period
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const { data: objectives } = await supabase
    .from('kpi_objectives')
    .select('*')
    .eq('user_id', user.id)
    .eq('year', currentYear)
    .maybeSingle()

  let startDate: string
  let endDate: string
  let prevStartDate: string
  let prevEndDate: string

  if (period === 'day') {
    const today = now.toISOString().split('T')[0]
    startDate = today
    endDate = today
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    prevStartDate = yesterday.toISOString().split('T')[0]
    prevEndDate = prevStartDate
  } else if (period === 'week') {
    const { start, end } = getWeekBounds(now)
    startDate = start.toISOString().split('T')[0]
    endDate = end.toISOString().split('T')[0]
    const prevWeekDate = new Date(start)
    prevWeekDate.setDate(prevWeekDate.getDate() - 7)
    const { start: ps, end: pe } = getWeekBounds(prevWeekDate)
    prevStartDate = ps.toISOString().split('T')[0]
    prevEndDate = pe.toISOString().split('T')[0]
  } else {
    const { start, end } = getMonthBounds(now)
    startDate = start.toISOString().split('T')[0]
    endDate = end.toISOString().split('T')[0]
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const { start: ps, end: pe } = getMonthBounds(prevMonth)
    prevStartDate = ps.toISOString().split('T')[0]
    prevEndDate = pe.toISOString().split('T')[0]
  }

  const { data: currentEntries } = await supabase
    .from('daily_kpis')
    .select('contacts, calls, rdv1, rdv2, blocks')
    .eq('user_id', user.id)
    .gte('date', startDate)
    .lte('date', endDate)

  const { data: prevEntries } = await supabase
    .from('daily_kpis')
    .select('contacts, calls, rdv1, rdv2, blocks')
    .eq('user_id', user.id)
    .gte('date', prevStartDate)
    .lte('date', prevEndDate)

  const sum = (entries: any[] | null) => {
    if (!entries || entries.length === 0) return { contacts: 0, calls: 0, rdv1: 0, rdv2: 0, blocks: 0 }
    return entries.reduce((acc, e) => ({
      contacts: acc.contacts + (e.contacts || 0),
      calls: acc.calls + (e.calls || 0),
      rdv1: acc.rdv1 + (e.rdv1 || 0),
      rdv2: acc.rdv2 + (e.rdv2 || 0),
      blocks: acc.blocks + (e.blocks || 0),
    }), { contacts: 0, calls: 0, rdv1: 0, rdv2: 0, blocks: 0 })
  }

  const realise = sum(currentEntries)
  const prevRealise = sum(prevEntries)
  const obj = computeObjectives(objectives, period, currentMonth)

  const ecart = (val: number, target: number) => target === 0 ? 0 : Math.round(((val - target) / target) * 100)

  const tendance = (current: number, prev: number) => {
    if (current > prev * 1.1) return 'up'
    if (current < prev * 0.9) return 'down'
    return 'stable'
  }

  return apiSuccess({
    period,
    startDate,
    endDate,
    realise: {
      appels: realise.calls,
      contacts: realise.contacts,
      rdv_pris: realise.rdv1,
      rdv_faits: realise.rdv2,
      blocks: realise.blocks,
    },
    objectifs: obj,
    ecarts: {
      appels: ecart(realise.calls, obj.appels),
      contacts: ecart(realise.contacts, obj.contacts),
      rdv_pris: ecart(realise.rdv1, obj.rdv_pris),
      rdv_faits: ecart(realise.rdv2, obj.rdv_faits),
    },
    prev_period: {
      appels: prevRealise.calls,
      contacts: prevRealise.contacts,
      rdv_pris: prevRealise.rdv1,
      rdv_faits: prevRealise.rdv2,
    },
    tendances: {
      appels: tendance(realise.calls, prevRealise.calls),
      contacts: tendance(realise.contacts, prevRealise.contacts),
      rdv_pris: tendance(realise.rdv1, prevRealise.rdv1),
      rdv_faits: tendance(realise.rdv2, prevRealise.rdv2),
    },
    ratios: {
      appels_to_rdv: realise.calls > 0 ? Math.round((realise.rdv1 / realise.calls) * 100) : 0,
      rdv_pris_to_faits: realise.rdv1 > 0 ? Math.round((realise.rdv2 / realise.rdv1) * 100) : 0,
    },
    has_objectives: !!objectives,
  })
}
