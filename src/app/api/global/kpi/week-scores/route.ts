import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function GET(_request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  monday.setHours(0, 0, 0, 0)

  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)

  const startDate = monday.toISOString().split('T')[0]
  const endDate = friday.toISOString().split('T')[0]

  const { data: objectives } = await supabase
    .from('kpi_objectives')
    .select('obj_appels_annuel, obj_contacts_annuel, obj_rdv_pris_annuel, obj_rdv_faits_annuel, month_intensity, weeks_per_month')
    .eq('user_id', user.id)
    .eq('year', now.getFullYear())
    .maybeSingle()

  const { data: entries, error } = await supabase
    .from('daily_kpis')
    .select('date, contacts, calls, rdv1, rdv2, blocks')
    .eq('user_id', user.id)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date')

  if (error) return apiError(error.message, 500)

  const intensities: number[] = objectives?.month_intensity ?? [1,1,1,1,1,1,1,1,1,1,1,1]
  const weeksPerMonth: number[] = objectives?.weeks_per_month ?? [4,4,4,4,4,4,4,4,5,4,4,5]
  const month = now.getMonth()
  const totalIntensity = intensities.reduce((a, b) => a + b, 0)
  const monthCoeff = intensities[month] / totalIntensity
  const weeksInMonth = weeksPerMonth[month]

  const dailyObj = {
    calls: objectives ? Math.round((objectives.obj_appels_annuel * monthCoeff) / weeksInMonth / 5) : 10,
    contacts: objectives ? Math.round((objectives.obj_contacts_annuel * monthCoeff) / weeksInMonth / 5) : 3,
    rdv1: objectives ? Math.round((objectives.obj_rdv_pris_annuel * monthCoeff) / weeksInMonth / 5) : 2,
    rdv2: objectives ? Math.round((objectives.obj_rdv_faits_annuel * monthCoeff) / weeksInMonth / 5) : 1,
  }

  const labels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven']
  const todayDate = now.toISOString().split('T')[0]

  const scores = labels.map((label, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    const entry = entries?.find(e => e.date === dateStr)

    if (!entry) return { label, date: dateStr, pct: 0, today: dateStr === todayDate }

    const totalObj = dailyObj.calls + dailyObj.contacts + dailyObj.rdv1 + dailyObj.rdv2
    if (totalObj === 0) return { label, date: dateStr, pct: 0, today: dateStr === todayDate }

    const totalReal = (entry.calls || 0) + (entry.contacts || 0) + (entry.rdv1 || 0) + (entry.rdv2 || 0)
    const pct = Math.min(Math.round((totalReal / totalObj) * 100), 100)

    return { label, date: dateStr, pct, today: dateStr === todayDate }
  })

  return apiSuccess({ scores, dailyObjectives: dailyObj, has_objectives: !!objectives })
}
