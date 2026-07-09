import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

type Granularity = 'day' | 'week' | 'month'

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function getMondayOfWeek(year: number, week: number): Date {
  const jan1 = new Date(year, 0, 1)
  const days = (week - 1) * 7
  const result = new Date(jan1.getTime() + days * 86400000)
  const day = result.getDay()
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1))
  return result
}

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const url = new URL(request.url)
  const granularity = (url.searchParams.get('granularity') || 'week') as Granularity
  const weeksBack = parseInt(url.searchParams.get('weeks_back') || '8')
  const compareWeek = url.searchParams.get('compare_week')
  const compareYear = url.searchParams.get('compare_year')

  const now = new Date()
  const currentYear = now.getFullYear()

  const { data: objectives } = await supabase
    .from('kpi_objectives')
    .select('*')
    .eq('user_id', user.id)
    .eq('year', currentYear)
    .maybeSingle()

  const intensities: number[] = objectives?.month_intensity ?? [1,1,1,1,1,1,1,1,1,1,1,1]
  const weeksPerMonth: number[] = objectives?.weeks_per_month ?? [4,4,4,4,4,4,4,4,5,4,4,5]
  const totalIntensity = intensities.reduce((a: number, b: number) => a + b, 0)

  const computeMonthlyObj = (annual: number, month: number) => {
    const coeff = intensities[month] / totalIntensity
    return Math.round(annual * coeff)
  }
  const computeWeeklyObj = (annual: number, month: number) => {
    return Math.round(computeMonthlyObj(annual, month) / weeksPerMonth[month])
  }

  let startDate: string
  const endDate = now.toISOString().split('T')[0]

  if (granularity === 'day') {
    const start = new Date(now)
    start.setDate(start.getDate() - weeksBack * 7)
    startDate = start.toISOString().split('T')[0]
  } else if (granularity === 'week') {
    const start = new Date(now)
    start.setDate(start.getDate() - weeksBack * 7)
    startDate = start.toISOString().split('T')[0]
  } else {
    const start = new Date(currentYear, 0, 1)
    startDate = start.toISOString().split('T')[0]
  }

  const { data: entries, error } = await supabase
    .from('daily_kpis')
    .select('date, contacts, calls, rdv1, rdv2, blocks')
    .eq('user_id', user.id)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date')

  if (error) return apiError(error.message, 500)

  const rows = entries ?? []

  if (granularity === 'day') {
    const points = rows.map(r => ({
      date: r.date,
      appels: r.calls || 0,
      contacts: r.contacts || 0,
      rdv_pris: r.rdv1 || 0,
      rdv_faits: r.rdv2 || 0,
    }))
    return apiSuccess({ granularity, points, objectives: null })
  }

  if (granularity === 'week') {
    const weekMap = new Map<string, { appels: number; contacts: number; rdv_pris: number; rdv_faits: number; month: number }>()
    for (const r of rows) {
      const d = new Date(r.date)
      const wn = getWeekNumber(d)
      const key = `S${String(wn).padStart(2, '0')}`
      const existing = weekMap.get(key) || { appels: 0, contacts: 0, rdv_pris: 0, rdv_faits: 0, month: d.getMonth() }
      existing.appels += r.calls || 0
      existing.contacts += r.contacts || 0
      existing.rdv_pris += r.rdv1 || 0
      existing.rdv_faits += r.rdv2 || 0
      existing.month = d.getMonth()
      weekMap.set(key, existing)
    }

    const points = Array.from(weekMap.entries()).map(([label, data]) => ({
      label,
      ...data,
      obj_appels: objectives ? computeWeeklyObj(objectives.obj_appels_annuel, data.month) : 0,
      obj_contacts: objectives ? computeWeeklyObj(objectives.obj_contacts_annuel, data.month) : 0,
      obj_rdv_pris: objectives ? computeWeeklyObj(objectives.obj_rdv_pris_annuel, data.month) : 0,
      obj_rdv_faits: objectives ? computeWeeklyObj(objectives.obj_rdv_faits_annuel, data.month) : 0,
    }))

    let comparison = null
    if (compareWeek && compareYear) {
      const cw = parseInt(compareWeek)
      const cy = parseInt(compareYear)
      const monday = getMondayOfWeek(cy, cw)
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      const { data: compEntries } = await supabase
        .from('daily_kpis')
        .select('date, contacts, calls, rdv1, rdv2, blocks')
        .eq('user_id', user.id)
        .gte('date', monday.toISOString().split('T')[0])
        .lte('date', sunday.toISOString().split('T')[0])

      if (compEntries && compEntries.length > 0) {
        comparison = {
          week: cw,
          year: cy,
          appels: compEntries.reduce((s, e) => s + (e.calls || 0), 0),
          contacts: compEntries.reduce((s, e) => s + (e.contacts || 0), 0),
          rdv_pris: compEntries.reduce((s, e) => s + (e.rdv1 || 0), 0),
          rdv_faits: compEntries.reduce((s, e) => s + (e.rdv2 || 0), 0),
        }
      }
    }

    return apiSuccess({ granularity, points, comparison, has_objectives: !!objectives })
  }

  // month granularity
  const monthMap = new Map<number, { appels: number; contacts: number; rdv_pris: number; rdv_faits: number }>()
  for (const r of rows) {
    const d = new Date(r.date)
    const m = d.getMonth()
    const existing = monthMap.get(m) || { appels: 0, contacts: 0, rdv_pris: 0, rdv_faits: 0 }
    existing.appels += r.calls || 0
    existing.contacts += r.contacts || 0
    existing.rdv_pris += r.rdv1 || 0
    existing.rdv_faits += r.rdv2 || 0
    monthMap.set(m, existing)
  }

  const monthLabels = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
  const points = Array.from(monthMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([m, data]) => ({
      label: monthLabels[m],
      month: m,
      ...data,
      obj_appels: objectives ? computeMonthlyObj(objectives.obj_appels_annuel, m) : 0,
      obj_contacts: objectives ? computeMonthlyObj(objectives.obj_contacts_annuel, m) : 0,
      obj_rdv_pris: objectives ? computeMonthlyObj(objectives.obj_rdv_pris_annuel, m) : 0,
      obj_rdv_faits: objectives ? computeMonthlyObj(objectives.obj_rdv_faits_annuel, m) : 0,
    }))

  return apiSuccess({ granularity, points, has_objectives: !!objectives })
}
