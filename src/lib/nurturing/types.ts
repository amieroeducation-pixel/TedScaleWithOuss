export type NurturingCategory = 'rdv_fait' | 'prospect_froid' | 'interpro'
export type TemperatureLevel = 'hot' | 'warm' | 'cold' | 'dead'
export type PressureLevel = 'normal' | 'elevee' | 'a_stopper'
export type NurturingChannel = 'telephone' | 'email' | 'whatsapp' | 'linkedin' | 'courrier' | 'sms'
export type DocumentFormat = 'pdf' | 'image' | 'lien' | 'texte'

export interface NurturingTheme {
  id: string
  name: string
  color: string
  icon: string
  sort_order: number
}

export interface NurturingDocument {
  id: string
  title: string
  theme_id: string | null
  format: DocumentFormat
  url: string | null
  channels_compatible: string[]
  tags: string[]
  created_at: string
  theme?: NurturingTheme
}

export interface NurturingMessage {
  id: string
  title: string
  channel: NurturingChannel
  subject: string | null
  body: string
  tags: string[]
  created_at: string
}

export interface Touchpoint {
  id: string
  prospect_id: string
  type: string
  occurred_at: string
  seen_at: string | null
  responded_at: string | null
  message_id: string | null
  document_id: string | null
  duration_min: number | null
}

export interface NurturingContact {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  profession: string | null
  pipeline_stage: string
  nurturing_category: NurturingCategory | null
  temperature: TemperatureLevel
  pressure_score: PressureLevel
  nb_relances_sans_reponse: number
  last_contact_at: string | null
  next_action_date: string | null
  next_action_channel: NurturingChannel | null
  engagement_score: number
  total_touchpoints: number
  responded_touchpoints: number
  themes: NurturingTheme[]
  sequence_active: string | null
  etape_sequence: number | null
}

export interface NurturingSettings {
  cold_days_no_response: number
  cold_relances_no_view: number
  warm_days_since_response: number
  hot_days_since_response: number
  pressure_high_relances_7d: number
  pressure_stop_no_view: number
}

export const DEFAULT_SETTINGS: NurturingSettings = {
  cold_days_no_response: 14,
  cold_relances_no_view: 3,
  warm_days_since_response: 7,
  hot_days_since_response: 3,
  pressure_high_relances_7d: 4,
  pressure_stop_no_view: 5,
}

export interface DocumentMatch {
  document: NurturingDocument
  already_sent: boolean
  sent_channels: string[]
}
