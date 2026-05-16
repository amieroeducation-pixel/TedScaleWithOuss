// src/lib/playbooks/scoring.ts
import { SignalType } from './config'

const SIGNAL_BASE_SCORES: Record<SignalType, number> = {
  cession: 4,
  holding: 3,
  dividendes: 3,
  dirigeant_55: 2,
  creation: 1,
  linkedin: 2,
}

const HIGH_POTENTIAL_KEYWORDS = [
  'île-de-france', 'paris', '75', '92', '93', '94', '95', '78', '77', '91',
  'paca', 'marseille', 'nice', 'aix',
  'auvergne-rhône-alpes', 'lyon', 'grenoble',
]

export function scoreProspect(params: {
  signalType: SignalType
  caEstime?: number
  localisation?: string
}): number {
  let score = SIGNAL_BASE_SCORES[params.signalType] ?? 1

  if (params.caEstime && params.caEstime > 2_000_000) {
    score += 2
  }

  if (params.localisation) {
    const loc = params.localisation.toLowerCase()
    if (HIGH_POTENTIAL_KEYWORDS.some(k => loc.includes(k))) {
      score += 1
    }
  }

  return Math.min(score, 10)
}
