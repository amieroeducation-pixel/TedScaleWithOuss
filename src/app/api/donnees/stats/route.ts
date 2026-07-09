import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  // Parse query params
  const { searchParams } = new URL(request.url)
  const dateParam = searchParams.get('date') // YYYY-MM-01
  const now = new Date()
  const targetDate = dateParam ? new Date(dateParam) : now
  const year = targetDate.getFullYear()
  const month = targetDate.getMonth() + 1
  const monthStr = `${year}-${String(month).padStart(2, '0')}`
  const startDate = `${monthStr}-01`
  const endDate = month === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 1).padStart(2, '0')}-01`

  // ------------------------------------------------------------------
  // 1) daily_kpis for the month
  // ------------------------------------------------------------------
  const { data: kpis, error: kpisErr } = await supabase
    .from('daily_kpis')
    .select('date, calls, contacts, rdv1, rdv2, blocks')
    .eq('user_id', user.id)
    .gte('date', startDate)
    .lt('date', endDate)
    .order('date', { ascending: true })

  if (kpisErr) return apiError(kpisErr.message)

  // ------------------------------------------------------------------
  // 2) interactions grouped by date and type
  // ------------------------------------------------------------------
  const { data: interactions, error: intErr } = await supabase
    .from('interactions')
    .select('type, occurred_at')
    .eq('user_id', user.id)
    .gte('occurred_at', `${startDate}T00:00:00`)
    .lt('occurred_at', `${endDate}T00:00:00`)

  if (intErr) return apiError(intErr.message)

  // Count interactions by date and type
  const intByDate: Record<string, Record<string, number>> = {}
  for (const row of (interactions ?? [])) {
    const d = row.occurred_at.substring(0, 10)
    if (!intByDate[d]) intByDate[d] = {}
    intByDate[d][row.type] = (intByDate[d][row.type] ?? 0) + 1
  }

  // ------------------------------------------------------------------
  // 3) contracts for the month
  // ------------------------------------------------------------------
  const { data: contracts, error: ctErr } = await supabase
    .from('contracts')
    .select('signed_at, commission_amount')
    .eq('user_id', user.id)
    .gte('signed_at', startDate)
    .lt('signed_at', endDate)

  if (ctErr) return apiError(ctErr.message)

  const contractsByDate: Record<string, { count: number; ca: number }> = {}
  for (const c of (contracts ?? [])) {
    const d = c.signed_at
    if (!contractsByDate[d]) contractsByDate[d] = { count: 0, ca: 0 }
    contractsByDate[d].count += 1
    contractsByDate[d].ca += Number(c.commission_amount) || 0
  }

  // ------------------------------------------------------------------
  // 4) prospects created this month
  // ------------------------------------------------------------------
  const { data: prospects, error: prErr } = await supabase
    .from('prospects')
    .select('created_at')
    .eq('user_id', user.id)
    .gte('created_at', `${startDate}T00:00:00`)
    .lt('created_at', `${endDate}T00:00:00`)

  if (prErr) return apiError(prErr.message)

  const prospectsByDate: Record<string, number> = {}
  for (const p of (prospects ?? [])) {
    const d = p.created_at.substring(0, 10)
    prospectsByDate[d] = (prospectsByDate[d] ?? 0) + 1
  }

  // ------------------------------------------------------------------
  // 5) tasks with badge='relance' updated this month
  // ------------------------------------------------------------------
  const { data: relances, error: relErr } = await supabase
    .from('tasks')
    .select('updated_at')
    .eq('user_id', user.id)
    .eq('badge', 'relance')
    .gte('updated_at', `${startDate}T00:00:00`)
    .lt('updated_at', `${endDate}T00:00:00`)

  if (relErr) return apiError(relErr.message)

  const relancesByDate: Record<string, number> = {}
  for (const r of (relances ?? [])) {
    const d = r.updated_at.substring(0, 10)
    relancesByDate[d] = (relancesByDate[d] ?? 0) + 1
  }

  // ------------------------------------------------------------------
  // Build daily array
  // ------------------------------------------------------------------
  // Collect all dates that appear in any data source
  const allDates = new Set<string>()
  for (const k of (kpis ?? [])) allDates.add(k.date)
  for (const d of Object.keys(intByDate)) allDates.add(d)
  for (const d of Object.keys(contractsByDate)) allDates.add(d)
  for (const d of Object.keys(prospectsByDate)) allDates.add(d)
  for (const d of Object.keys(relancesByDate)) allDates.add(d)

  const kpisByDate: Record<string, typeof kpis extends (infer T)[] | null ? T : never> = {}
  for (const k of (kpis ?? [])) kpisByDate[k.date] = k

  const daily = Array.from(allDates)
    .filter(d => d >= startDate && d < endDate)
    .sort()
    .map(d => {
      const kpi = kpisByDate[d]
      const inter = intByDate[d] ?? {}
      const ct = contractsByDate[d] ?? { count: 0, ca: 0 }

      // appels = MAX(daily_kpis.calls, COUNT interactions appel)
      const appels = Math.max(kpi?.calls ?? 0, inter['appel'] ?? 0)
      const prospects_count = prospectsByDate[d] ?? 0
      const rdv_r1 = inter['rdv1'] ?? kpi?.rdv1 ?? 0
      const rdv_r2 = inter['rdv2'] ?? kpi?.rdv2 ?? 0
      const rdv_r3 = inter['rdv3'] ?? 0
      const blocs = kpi?.blocks ?? 0
      const relances_count = relancesByDate[d] ?? 0

      return {
        date: d,
        appels,
        prospects: prospects_count,
        rdv_r1,
        rdv_r2,
        rdv_r3,
        blocs,
        relances: relances_count,
        contrats: ct.count,
        ca: ct.ca,
      }
    })

  // ------------------------------------------------------------------
  // Build objectives
  // ------------------------------------------------------------------
  const { data: revObj } = await supabase
    .from('revenue_objectives')
    .select('amount')
    .eq('user_id', user.id)
    .eq('year', year)
    .eq('month', month)
    .is('product_type', null)
    .single()

  const { data: settings } = await supabase
    .from('user_settings')
    .select('calls_per_day_target, rdv_per_week_target, ca_monthly_target')
    .eq('id', user.id)
    .single()

  // Working days in month (approximate: 22)
  const joursOuvres = 22
  const objAppels = (settings?.calls_per_day_target ?? 20) * joursOuvres
  const objRdv = (settings?.rdv_per_week_target ?? 5) * 4
  const objCa = revObj?.amount ? Number(revObj.amount) : (settings?.ca_monthly_target ? Number(settings.ca_monthly_target) : 10000)
  const objProspects = Math.round(objAppels * 0.6) // rough estimate: 60% of calls = contacted prospects
  const objContrats = Math.max(1, Math.round(objRdv * 0.25)) // 25% closing rate

  const realAppels = daily.reduce((s, e) => s + e.appels, 0)
  const realRdv = daily.reduce((s, e) => s + e.rdv_r1 + e.rdv_r2 + e.rdv_r3, 0)
  const realCa = daily.reduce((s, e) => s + e.ca, 0)
  const realProspects = daily.reduce((s, e) => s + e.prospects, 0)
  const realContrats = daily.reduce((s, e) => s + e.contrats, 0)

  const objectives = {
    mois: monthStr,
    obj_appels: objAppels,
    real_appels: realAppels,
    obj_rdv: objRdv,
    real_rdv: realRdv,
    obj_ca: objCa,
    real_ca: realCa,
    obj_prospects: objProspects,
    real_prospects: realProspects,
    obj_contrats: objContrats,
    real_contrats: realContrats,
  }

  return apiSuccess({ daily, objectives })
}
