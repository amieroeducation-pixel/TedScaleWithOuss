import { NurturingSettings, DEFAULT_SETTINGS, TemperatureLevel, PressureLevel, Touchpoint } from './types'

export function computeTemperature(
  touchpoints: Touchpoint[],
  settings: NurturingSettings = DEFAULT_SETTINGS
): TemperatureLevel {
  if (touchpoints.length === 0) return 'cold'

  const now = Date.now()
  const sorted = [...touchpoints].sort((a, b) =>
    new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
  )

  const lastResponse = sorted.find(t => t.responded_at)
  if (lastResponse) {
    const daysSinceResponse = Math.floor(
      (now - new Date(lastResponse.responded_at!).getTime()) / (1000 * 60 * 60 * 24)
    )
    if (daysSinceResponse <= settings.hot_days_since_response) return 'hot'
    if (daysSinceResponse <= settings.warm_days_since_response) return 'warm'
  }

  const lastSeen = sorted.find(t => t.seen_at)
  if (lastSeen) {
    const daysSinceSeen = Math.floor(
      (now - new Date(lastSeen.seen_at!).getTime()) / (1000 * 60 * 60 * 24)
    )
    if (daysSinceSeen <= settings.warm_days_since_response) return 'warm'
  }

  const consecutiveNoView = countConsecutiveNoView(sorted)
  if (consecutiveNoView >= settings.cold_relances_no_view) return 'dead'

  const daysSinceLastContact = Math.floor(
    (now - new Date(sorted[0].occurred_at).getTime()) / (1000 * 60 * 60 * 24)
  )
  if (daysSinceLastContact >= settings.cold_days_no_response) return 'cold'

  return 'warm'
}

export function computePressure(
  touchpoints: Touchpoint[],
  settings: NurturingSettings = DEFAULT_SETTINGS
): PressureLevel {
  if (touchpoints.length === 0) return 'normal'

  const now = Date.now()
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000

  const recentTouchpoints = touchpoints.filter(
    t => new Date(t.occurred_at).getTime() >= sevenDaysAgo
  )

  if (recentTouchpoints.length >= settings.pressure_high_relances_7d) {
    const consecutiveNoView = countConsecutiveNoView(
      [...touchpoints].sort((a, b) =>
        new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
      )
    )
    if (consecutiveNoView >= settings.pressure_stop_no_view) return 'a_stopper'
    return 'elevee'
  }

  return 'normal'
}

function countConsecutiveNoView(sortedDesc: Touchpoint[]): number {
  let count = 0
  for (const t of sortedDesc) {
    if (t.seen_at || t.responded_at) break
    count++
  }
  return count
}

export function computeRelancesSansReponse(touchpoints: Touchpoint[]): number {
  const sorted = [...touchpoints].sort((a, b) =>
    new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
  )
  let count = 0
  for (const t of sorted) {
    if (t.responded_at) break
    count++
  }
  return count
}

export function inferNurturingCategory(
  pipelineStage: string,
  hasPartnerLink: boolean
): 'rdv_fait' | 'prospect_froid' | 'interpro' | null {
  if (hasPartnerLink) return 'interpro'
  if (['rdv1', 'rdv2', 'rdv3'].includes(pipelineStage)) return 'rdv_fait'
  if (pipelineStage === 'a_contacter') return 'prospect_froid'
  return null
}
