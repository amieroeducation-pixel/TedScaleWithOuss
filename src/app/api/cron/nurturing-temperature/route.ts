import { NextRequest } from 'next/server'
import { createSupabaseCronClient } from '@/lib/supabase/cron-client'
import { verifyCronSecret } from '@/lib/cron/auth'
import { logCronRun } from '@/lib/cron/logger'
import { apiSuccess, apiError } from '@/lib/api'

type NurturingCategory = 'prospect_chaud' | 'prospect_tiede' | 'prospect_froid' | 'prospect_mort'

function computeCategory(
  daysSinceLastInteraction: number | null,
  hasResponseLast14Days: boolean,
  consecutiveNR: number,
  hasActiveSequence: boolean
): NurturingCategory {
  if (daysSinceLastInteraction === null) return 'prospect_froid'

  if (consecutiveNR >= 5 || daysSinceLastInteraction > 60) return 'prospect_mort'
  if (daysSinceLastInteraction <= 7 && hasResponseLast14Days) return 'prospect_chaud'
  if (daysSinceLastInteraction <= 21 || hasActiveSequence) return 'prospect_tiede'
  if (daysSinceLastInteraction <= 60) return 'prospect_froid'
  return 'prospect_mort'
}

export async function GET(req: NextRequest) {
  const authError = verifyCronSecret(req)
  if (authError) return authError

  const supabase = createSupabaseCronClient()
  const now = new Date()

  const { data: prospects, error } = await supabase
    .from('prospects')
    .select('id, user_id, nurturing_category, nurturing_sequence_instance_id')
    .not('nurturing_category', 'is', null)

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

  let activeSequenceIds: Set<string> = new Set()
  const seqIds = prospects
    .map(p => p.nurturing_sequence_instance_id)
    .filter(Boolean) as string[]

  if (seqIds.length > 0) {
    const { data: activeSeqs } = await supabase
      .from('sequence_instances')
      .select('id')
      .in('id', seqIds)
      .eq('status', 'active')

    for (const s of (activeSeqs || [])) activeSequenceIds.add(s.id)
  }

  let updated = 0
  const errors: string[] = []

  for (const prospect of prospects) {
    const pInteractions = interactionsMap[prospect.id] || []
    const lastInteraction = pInteractions[0]

    const daysSinceLast = lastInteraction
      ? Math.floor((now.getTime() - new Date(lastInteraction.occurred_at).getTime()) / 86400000)
      : null

    const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000)
    const hasResponseLast14 = pInteractions.some(
      i => i.is_honored && new Date(i.occurred_at) >= fourteenDaysAgo
    )

    let consecutiveNR = 0
    for (const i of pInteractions) {
      if (!i.is_honored) consecutiveNR++
      else break
    }

    const hasActiveSequence = prospect.nurturing_sequence_instance_id
      ? activeSequenceIds.has(prospect.nurturing_sequence_instance_id)
      : false

    const newCategory = computeCategory(daysSinceLast, hasResponseLast14, consecutiveNR, hasActiveSequence)

    if (newCategory !== prospect.nurturing_category) {
      const { error: updateErr } = await supabase
        .from('prospects')
        .update({ nurturing_category: newCategory })
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
