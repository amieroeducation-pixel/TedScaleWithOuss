// src/lib/prospects/lifecycle.ts

export type ProspectTemperature = 'hot' | 'warm' | 'cold' | 'dead'

export function calculateTemperature(params: {
  totalTouchpoints: number
  respondedTouchpoints: number
  daysSinceLastEngagement: number | null
  daysSinceCreation: number
}): ProspectTemperature {
  const engagementScore = calculateEngagementScore({
    totalTouchpoints: params.totalTouchpoints,
    respondedTouchpoints: params.respondedTouchpoints,
    daysSinceLastEngagement: params.daysSinceLastEngagement,
    hasRecentReply: params.daysSinceLastEngagement !== null && params.daysSinceLastEngagement < 14,
  })

  // Hot : engagement_score >= 70 OU réponse < 48h
  if (engagementScore >= 70 || (params.daysSinceLastEngagement !== null && params.daysSinceLastEngagement < 2)) {
    return 'hot'
  }

  // Warm : engagement_score >= 30 OU dernière interaction < 14j
  if (engagementScore >= 30 || (params.daysSinceLastEngagement !== null && params.daysSinceLastEngagement < 14)) {
    return 'warm'
  }

  // Cold : engagement_score >= 5 OU créé < 30j
  if (engagementScore >= 5 || params.daysSinceCreation < 30) {
    return 'cold'
  }

  // Dead : tout le reste (aucune réponse après 60j ou engagement_score < 5)
  return 'dead'
}

export function calculateEngagementScore(params: {
  totalTouchpoints: number
  respondedTouchpoints: number
  daysSinceLastEngagement: number | null
  hasRecentReply: boolean // < 14 jours
}): number {
  // Base = (respondedTouchpoints / totalTouchpoints) * 100 (si total > 0, sinon 0)
  let score = 0
  if (params.totalTouchpoints > 0) {
    score = (params.respondedTouchpoints / params.totalTouchpoints) * 100
  }

  // Bonus +20 si hasRecentReply
  if (params.hasRecentReply) {
    score += 20
  }

  // Malus -2 par jour d'inactivité (après 7 jours)
  if (params.daysSinceLastEngagement !== null && params.daysSinceLastEngagement > 7) {
    const daysInactive = params.daysSinceLastEngagement - 7
    score -= daysInactive * 2
  }

  // Cap à 100, plancher à 0
  return Math.max(0, Math.min(100, score))
}
