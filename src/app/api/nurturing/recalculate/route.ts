import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'
import { computeTemperature, computePressure, computeRelancesSansReponse } from '@/lib/nurturing/scoring'
import type { Touchpoint, NurturingSettings } from '@/lib/nurturing/types'
import { DEFAULT_SETTINGS } from '@/lib/nurturing/types'

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { data: settingsRow } = await supabase
    .from('nurturing_settings')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const settings: NurturingSettings = settingsRow || DEFAULT_SETTINGS

  const { data: prospects, error: pErr } = await supabase
    .from('prospects')
    .select('id')
    .eq('user_id', user.id)
    .not('pipeline_stage', 'in', '(converti,perdu)')

  if (pErr) return apiError(pErr.message)
  if (!prospects || prospects.length === 0) return apiSuccess({ updated: 0 })

  const prospectIds = prospects.map(p => p.id)

  const { data: interactions, error: iErr } = await supabase
    .from('interactions')
    .select('id, prospect_id, type, created_at, seen_at, responded_at, message_id, document_id, duration_min')
    .in('prospect_id', prospectIds)
    .order('created_at', { ascending: false })

  if (iErr) return apiError(iErr.message)

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

  return apiSuccess({ updated, total: prospectIds.length })
}
