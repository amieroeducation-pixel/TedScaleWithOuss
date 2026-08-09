import { NextRequest } from 'next/server'
import { createSupabaseCronClient } from '@/lib/supabase/cron-client'
import { verifyCronSecret } from '@/lib/cron/auth'
import { logCronRun } from '@/lib/cron/logger'
import { apiSuccess, apiError } from '@/lib/api'
import { PRESSURE_COEFS } from '@/app/(dashboard)/nurturing/nurturing-types'

export async function GET(req: NextRequest) {
  const authError = verifyCronSecret(req)
  if (authError) return authError

  const supabase = createSupabaseCronClient()

  const { data: prospects, error } = await supabase
    .from('prospects')
    .select('id, user_id, nurturing_category, nb_relances_sans_reponse, computed_pressure')
    .not('nurturing_category', 'is', null)
    .or('nurturing_archived.is.null,nurturing_archived.eq.false')

  if (error) return apiError(error.message)
  if (!prospects || prospects.length === 0) return apiSuccess({ updated: 0 })

  const prospectIds = prospects.map(p => p.id)

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 7)

  const [{ data: interactions }, { data: recentInteractions }] = await Promise.all([
    supabase
      .from('interactions')
      .select('prospect_id, occurred_at, is_honored')
      .in('prospect_id', prospectIds)
      .order('occurred_at', { ascending: false }),
    supabase
      .from('interactions')
      .select('prospect_id, type, occurred_at')
      .in('prospect_id', prospectIds)
      .gte('occurred_at', cutoff.toISOString()),
  ])

  const interactionsMap: Record<string, Array<{ occurred_at: string; is_honored: boolean }>> = {}
  for (const i of (interactions || [])) {
    if (!interactionsMap[i.prospect_id]) interactionsMap[i.prospect_id] = []
    interactionsMap[i.prospect_id].push(i)
  }

  // Compute pressure per prospect from recent interactions
  const pressureMap: Record<string, number> = {}
  for (const i of (recentInteractions || []) as any[]) {
    const coef = PRESSURE_COEFS[i.type] || 1
    pressureMap[i.prospect_id] = (pressureMap[i.prospect_id] || 0) + coef
  }

  let updated = 0
  const errors: string[] = []

  for (const prospect of prospects) {
    const pInteractions = interactionsMap[prospect.id] || []

    let consecutiveNR = 0
    for (const i of pInteractions) {
      if (!i.is_honored) consecutiveNR++
      else break
    }

    const newPressure = pressureMap[prospect.id] || 0
    const needsUpdate =
      consecutiveNR !== (prospect.nb_relances_sans_reponse || 0) ||
      newPressure !== (prospect.computed_pressure || 0)

    if (needsUpdate) {
      const { error: updateErr } = await supabase
        .from('prospects')
        .update({
          nb_relances_sans_reponse: consecutiveNR,
          computed_pressure: newPressure,
        })
        .eq('id', prospect.id)

      if (updateErr) {
        errors.push(`${prospect.id}: ${updateErr.message}`)
      } else {
        updated++
      }
    }
  }

  const userIds = [...new Set(prospects.map(p => p.user_id))]
  for (const uid of userIds) {
    await logCronRun({
      userId: uid,
      jobName: 'nurturing-temperature',
      status: errors.length > 0 ? 'error' : 'success',
      details: { total: prospects.length, updated, errors: errors.length },
    })
  }

  return apiSuccess({ total: prospects.length, updated, errors: errors.length })
}
