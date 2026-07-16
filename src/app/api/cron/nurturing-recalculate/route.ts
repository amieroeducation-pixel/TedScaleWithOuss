import { NextRequest } from 'next/server'
import { verifyCronSecret } from '@/lib/cron/auth'
import { logCronRun } from '@/lib/cron/logger'
import { isCronEnabled } from '@/lib/cron/toggles'
import { createSupabaseCronClient } from '@/lib/supabase/cron-client'
import { apiSuccess, apiError } from '@/lib/api'
import { computeTemperature, computePressure, computeRelancesSansReponse } from '@/lib/nurturing/scoring'
import type { Touchpoint, NurturingSettings } from '@/lib/nurturing/types'
import { DEFAULT_SETTINGS } from '@/lib/nurturing/types'

export async function GET(req: NextRequest) {
  const authError = verifyCronSecret(req)
  if (authError) return authError

  if (!(await isCronEnabled('nurturing-recalculate'))) {
    return apiSuccess({ status: 'disabled', message: 'Cron désactivé par l\'utilisateur' })
  }

  const supabase = createSupabaseCronClient()
  const { data: users, error } = await supabase
    .from('user_settings')
    .select('id')

  if (error) return apiError(`user_settings: ${error.message}`)

  let processed = 0
  const errors: string[] = []

  for (const user of users ?? []) {
    try {
      // 1. Load nurturing settings for this user
      const { data: settingsRow } = await supabase
        .from('nurturing_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      const settings: NurturingSettings = settingsRow || DEFAULT_SETTINGS

      // 2. Get all prospects NOT in converti/perdu
      const { data: prospects, error: pErr } = await supabase
        .from('prospects')
        .select('id')
        .eq('user_id', user.id)
        .not('pipeline_stage', 'in', '(converti,perdu)')

      if (pErr) {
        errors.push(`user ${user.id}: prospects query - ${pErr.message}`)
        await logCronRun({
          userId: user.id,
          jobName: 'nurturing-recalculate',
          status: 'error',
          details: { error: pErr.message },
        })
        continue
      }

      if (!prospects || prospects.length === 0) {
        await logCronRun({
          userId: user.id,
          jobName: 'nurturing-recalculate',
          status: 'skipped',
          details: { reason: 'Aucun prospect actif' },
        })
        continue
      }

      const prospectIds = prospects.map(p => p.id)

      // 3. Get all interactions for those prospects
      const { data: interactions, error: iErr } = await supabase
        .from('interactions')
        .select('id, prospect_id, type, created_at, seen_at, responded_at, message_id, document_id, duration_min')
        .in('prospect_id', prospectIds)
        .order('created_at', { ascending: false })

      if (iErr) {
        errors.push(`user ${user.id}: interactions query - ${iErr.message}`)
        await logCronRun({
          userId: user.id,
          jobName: 'nurturing-recalculate',
          status: 'error',
          details: { error: iErr.message },
        })
        continue
      }

      // 4. Group touchpoints by prospect
      const touchpointsByProspect: Record<string, Touchpoint[]> = {}
      for (const i of (interactions || [])) {
        if (!touchpointsByProspect[i.prospect_id]) touchpointsByProspect[i.prospect_id] = []
        touchpointsByProspect[i.prospect_id].push({
          id: i.id,
          prospect_id: i.prospect_id,
          type: i.type,
          occurred_at: i.created_at,
          seen_at: i.seen_at,
          responded_at: i.responded_at,
          message_id: i.message_id,
          document_id: i.document_id,
          duration_min: i.duration_min,
        })
      }

      // 5. Compute scores and batch update
      let updated = 0
      for (const pid of prospectIds) {
        const touchpoints = touchpointsByProspect[pid] || []
        const temperature = computeTemperature(touchpoints, settings)
        const pressure = computePressure(touchpoints, settings)
        const nbRelances = computeRelancesSansReponse(touchpoints)
        const totalTouchpoints = touchpoints.length
        const respondedTouchpoints = touchpoints.filter(t => t.responded_at).length
        const engagementScore = totalTouchpoints > 0
          ? Math.round((respondedTouchpoints / totalTouchpoints) * 100)
          : 0

        const { error: uErr } = await supabase
          .from('prospects')
          .update({
            temperature,
            pressure_score: pressure,
            nb_relances_sans_reponse: nbRelances,
            total_touchpoints: totalTouchpoints,
            responded_touchpoints: respondedTouchpoints,
            engagement_score: engagementScore,
            temperature_updated_at: new Date().toISOString(),
          })
          .eq('id', pid)

        if (!uErr) updated++
      }

      // 6. Log the run
      await logCronRun({
        userId: user.id,
        jobName: 'nurturing-recalculate',
        status: 'success',
        details: {
          prospectsTotal: prospectIds.length,
          prospectsUpdated: updated,
          interactionsProcessed: (interactions || []).length,
        },
      })

      processed++
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue'
      errors.push(`user ${user.id}: ${msg}`)
      await logCronRun({
        userId: user.id,
        jobName: 'nurturing-recalculate',
        status: 'error',
        details: { error: msg },
      })
    }
  }

  return apiSuccess({ status: 'ok', processed, errors })
}
