// src/lib/playbooks/scoring.ts
import { SignalType } from './config'

const SIGNAL_BASE_SCORES: Record<SignalType, number> = {
  cession: 40,
  heritage: 40,
  vente_immo: 40,
  radiation: 35,
  holding: 30,
  dividendes: 30,
  dirigeant_55: 25,
  creation: 15,
  linkedin: 20,
}

const CAPITAL_EVENT_SIGNALS: SignalType[] = ['cession', 'heritage', 'vente_immo', 'radiation']

const HIGH_POTENTIAL_KEYWORDS = [
  'île-de-france', 'paris', '75', '92', '93', '94', '95', '78', '77', '91',
  'paca', 'marseille', 'nice', 'aix',
  'auvergne-rhône-alpes', 'lyon', 'grenoble',
]

export function scoreProspect(params: {
  signalType: SignalType
  caEstime?: number
  localisation?: string
  ageEstime?: number
  capitalAmount?: number
}): number {
  let score = SIGNAL_BASE_SCORES[params.signalType] ?? 15

  // Bonus CA
  if (params.caEstime) {
    if (params.caEstime > 5_000_000) {
      score += 25
    } else if (params.caEstime > 2_000_000) {
      score += 15
    }
  }

  // Bonus localisation
  if (params.localisation) {
    const loc = params.localisation.toLowerCase()
    if (HIGH_POTENTIAL_KEYWORDS.some(k => loc.includes(k))) {
      score += 10
    }
  }

  // Bonus âge
  if (params.ageEstime && params.ageEstime > 50) {
    score += 20
  }

  // Bonus capital event
  if (CAPITAL_EVENT_SIGNALS.includes(params.signalType)) {
    score += 15
  }

  // Bonus capital amount
  if (params.capitalAmount) {
    if (params.capitalAmount > 2_000_000) {
      score += 20
    } else if (params.capitalAmount > 1_000_000) {
      score += 10
    }
  }

  return Math.min(score, 100)
}
