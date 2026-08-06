import { NextRequest } from 'next/server'
import { createSupabaseCronClient } from '@/lib/supabase/cron-client'
import { verifyCronSecret } from '@/lib/cron/auth'
import { logCronRun } from '@/lib/cron/logger'
import { apiSuccess, apiError } from '@/lib/api'

export async function GET(req: NextRequest) {
  const authError = verifyCronSecret(req)
  if (authError) return authError

  const supabase = createSupabaseCronClient()

  const { data: prospects, error } = await supabase
    .from('prospects')
    .select('id, user_id, nurturing_category, nb_relances_sans_reponse')
    .not('nurturing_category', 'is', null)
    .or('nurturing_archived.is.null,nurturing_archived.eq.false')

  if (error) return apiError(error.message)
  if (!prospects || prospects.length === 0) return apiSuccess({ updated: 0 })

  const prospectIds = prospects.map(p => p.id)

  const { data: interactions } = await supabase
    .from('interactions')
    .select('prospect_id, occurred_at, is_honored')
    .in('prospect_id', prospectIds)
    .order('occurred_at', { ascending: false })

  const interactionsMap: Record<string, Array<{ occurred_at: string; is_honored: boolean }>> = {}
  for (const i of (interactions || [])) {
    if (!interactionsMap[i.prospect_id]) interactionsMap[i.prospect_id] = []
    interactionsMap[i.prospect_id].push(i)
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

    if (consecutiveNR !== (prospect.nb_relances_sans_reponse || 0)) {
      const { error: updateErr } = await supabase
        .from('prospects')
        .update({ nb_relances_sans_reponse: consecutiveNR })
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
