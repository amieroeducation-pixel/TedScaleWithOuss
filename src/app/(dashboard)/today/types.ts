/**
 * Types partagés pour la page Today
 */

import { AgendaEvent } from '@/lib/agenda'

export type RelanceRow = {
  id: string
  full_name: string
  profession: string | null
  pipeline_stage: string | null
  next_action_date: string
  lead_score: number | null
  phone: string | null
  email: string | null
  days_until: number
}

export type RdvRow = {
  id: string
  type: string
  occurred_at: string
  notes: string | null
  prospect_id: string
  prospect_name: string
  profession: string | null
  day_label: string
}

export type SignalData = {
  relances: RelanceRow[]
  rdvSemaine: RdvRow[]
  todayCount: number
  weekRdvCount: number
}

export type DailyCounters = {
  contacts: number
  calls: number
  rdv1: number
  rdv2: number
}

export type DailyTargets = {
  contacts: number
  calls: number
  rdv1: number
  rdv2: number
}

export type Task = {
  id: string
  title: string
  description: string | null
  priority: number
  col: string
  urgency: 'urgent' | 'normal'
  this_week: boolean
  deadline: string | null
  created_at: string
}

export { AgendaEvent }
