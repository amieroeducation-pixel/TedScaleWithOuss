export type TempCategory = 'hot' | 'warm' | 'cold' | 'dead'
export type DetailTab = 'sequence' | 'history' | 'config'
export type Channel = 'call' | 'email' | 'whatsapp' | 'linkedin' | 'sms'
export type PressureBadge = 'normal' | 'vary' | 'stop'

export interface Contact {
  id: string
  temp: TempCategory
  name: string
  email?: string
  phone?: string
  job: string
  city?: string
  badges: string[]
  warning?: string
  nextTime: string
  nextChannel: string
  urgent: boolean
  icon: string
  stage?: string
  touchpoints: number
  responses: number
  no_responses: number
  notes?: string
  preferredChannel?: string
  preferredTime?: string
  frequency?: number
  pressure?: string
  pressureScore?: number
  themes?: { id: string; name: string; color: string; icon: string }[]
  excludedChannels?: string[]
  sequenceActive?: string | null
  archived?: boolean
  forcedTemperature?: string | null
  timezone?: string
  linkedin_url?: string | null
}

export interface Interaction {
  id: string
  channel: string
  date: string
  note: string
  status: 'pending' | 'seen' | 'replied'
  icon: string
}

export interface NurturingDoc {
  id: string
  title: string
  format: string
  url: string | null
  channels_compatible: string[]
  tags: string[]
  already_sent?: boolean
  sent_channels?: string[]
  nurturing_themes?: { id: string; name: string; color: string; icon: string } | null
}

export interface NurturingMessage {
  id: string
  title: string
  channel: string
  subject: string | null
  body: string
  tags: string[]
}

export interface ContactConfig {
  preferred_channel: string | null
  contact_frequency_days: number
  excluded_channels: string[]
  notes: string
  preferred_time_slot: string | null
  timezone?: string
  forced_temperature?: string | null
}

export interface PressureData {
  score: number
  badge: PressureBadge
  label: string
  color: string
}

export interface UpcomingAction {
  id: string
  type: 'scheduled' | 'sequence'
  channel: string
  date: string
  label: string
  prospectId: string
}

export interface SequenceStep {
  id: string
  step_order: number
  channel: string
  status: string
  scheduled_at: string
  executed_at: string | null
  message_sent: string | null
  error_message: string | null
}

export interface SequenceTemplate {
  id: string
  name: string
  description: string
}

export const V = {
  bgDeep: '#0a0e22',
  bgMid: '#0f1430',
  surface1: '#141a3a',
  surface2: '#1a2150',
  surface3: '#232d60',
  line: '#2a3470',
  lineSoft: '#1e2860',
  text: '#d8e1ff',
  textHi: '#ffffff',
  textMid: '#8ea0d9',
  textLo: '#5a6a9a',
  gold: '#e8c878',
  goldDim: '#b89f5f',
  green: '#4caf50',
  cyan: '#4ecdc4',
  purple: '#a78bfa',
  indigo: '#818cf8',
  warn: '#fbbf24',
  red: '#ff6470',
  hot: '#ff4444',
  warm: '#d4a020',
  cold: '#5b9bd5',
}

export const tempColors: Record<TempCategory, { border: string; bg: string; iconBg: string; iconBorder: string }> = {
  hot: {
    border: V.hot,
    bg: 'linear-gradient(135deg, #2d0808, #4a1010 30%, #3d0808)',
    iconBg: 'radial-gradient(circle,rgba(255,68,68,0.3),rgba(255,68,68,0.1))',
    iconBorder: 'rgba(255,68,68,0.5)',
  },
  warm: {
    border: V.warm,
    bg: 'linear-gradient(135deg, #2d2208, #3d2e0a 30%, #2d2208)',
    iconBg: 'radial-gradient(circle,rgba(212,160,32,0.25),rgba(212,160,32,0.08))',
    iconBorder: 'rgba(212,160,32,0.45)',
  },
  cold: {
    border: V.cold,
    bg: 'linear-gradient(135deg, #081520, #0c2040 30%, #0a1a30)',
    iconBg: 'radial-gradient(circle,rgba(91,155,213,0.25),rgba(91,155,213,0.08))',
    iconBorder: 'rgba(91,155,213,0.45)',
  },
  dead: {
    border: '#8B4513',
    bg: 'linear-gradient(135deg, #1a1008, #25180a 30%, #1a1008)',
    iconBg: 'radial-gradient(circle,rgba(139,69,19,0.2),rgba(139,69,19,0.05))',
    iconBorder: 'rgba(139,69,19,0.4)',
  },
}

export const tempIcons: Record<TempCategory, string> = {
  hot: '🔥',
  warm: '☀️',
  cold: '❄️',
  dead: '🪨',
}

export const PRESSURE_COEFS: Record<string, number> = {
  email: 1,
  appel: 3,
  call: 3,
  linkedin: 1.5,
  linkedin_view: 0.5,
  sms: 2,
  whatsapp: 1.5,
}

export function computePressure(interactions: { channel: string; date: string }[]): PressureData {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 7)

  const score = interactions
    .filter(i => new Date(i.date) >= cutoff)
    .reduce((sum, i) => sum + (PRESSURE_COEFS[i.channel] || 1), 0)

  if (score > 6) return { score, badge: 'stop', label: '🛑 STOP — mettre en pause', color: '#ff6470' }
  if (score >= 4) return { score, badge: 'vary', label: '⚡ Varier le canal ou laisser respirer', color: '#fbbf24' }
  return { score, badge: 'normal', label: '✓ Normale', color: '#4caf50' }
}

/**
 * Compute cumulative temperature score based on interactions and silence.
 * Rules:
 * - +1 per interaction (email, sms, whatsapp, linkedin, appel)
 * - +3 per RDV (rdv1, rdv2, rdv3)
 * - -1 per complete week of silence since first contact
 *
 * @param now - Optional date for testing, defaults to current time
 */
export function computeTemperatureScore(
  interactions: { type: string; occurred_at: string }[],
  firstContactAt: string | null,
  now?: Date
): number {
  let score = 0

  // +1 per interaction, +3 per RDV
  for (const interaction of interactions) {
    const type = interaction.type.toLowerCase()
    if (['rdv1', 'rdv2', 'rdv3'].includes(type)) {
      score += 3
    } else if (['email', 'sms', 'whatsapp', 'linkedin', 'appel'].includes(type)) {
      score += 1
    }
  }

  // -1 per complete week of silence since first contact
  if (firstContactAt) {
    const firstContactDate = new Date(firstContactAt)
    const currentDate = now || new Date()
    const diffMs = currentDate.getTime() - firstContactDate.getTime()
    const diffDays = diffMs / (1000 * 60 * 60 * 24)
    const completeWeeks = Math.floor(diffDays / 7)
    score -= completeWeeks
  }

  return score
}

export function calculateTempCategory(
  score: number,
  noResponseCount: number,
  forcedTemperature?: string | null
): TempCategory {
  // Si température forcée manuellement, on la retourne directement
  if (forcedTemperature && ['hot', 'warm', 'cold', 'dead'].includes(forcedTemperature)) {
    return forcedTemperature as TempCategory
  }

  // Dead if too many no-responses
  if (noResponseCount >= 5) return 'dead'

  // Score-based thresholds
  if (score < 5) return 'cold'
  if (score < 12) return 'warm'
  return 'hot'
}

export function formatRelativeDate(date: Date): string {
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return 'Aujourd\'hui'
  if (days === 1) return 'Demain'
  if (days < 0) {
    const absDays = Math.abs(days)
    return `il y a ${absDays}j`
  }
  return `dans ${days}j`
}

export function channelToIcon(channel: string | null): string {
  const map: Record<string, string> = {
    telephone: '📞', email: '✉️', whatsapp: '💬', linkedin: '🔗', sms: '📱', courrier: '📬',
  }
  return channel && map[channel] ? map[channel] : '📞'
}

export function interactionTypeToIcon(type: string): string {
  const map: Record<string, string> = {
    appel: '📞', email: '✉️', whatsapp: '💬', linkedin: '🔗', rdv1: '📅', rdv2: '📅', rdv3: '📅', sms: '📱',
  }
  return map[type] || '📝'
}
