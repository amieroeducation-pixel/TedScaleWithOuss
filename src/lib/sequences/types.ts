import type { SupabaseClient } from '@supabase/supabase-js'

export type SequenceChannel = 'whatsapp' | 'email' | 'sms' | 'call_reminder' | 'linkedin'
export type SequenceStatus = 'active' | 'paused' | 'completed' | 'cancelled'
export type StepStatus = 'pending' | 'sent' | 'failed' | 'skipped'

export type SequenceTemplate = {
  id: string
  user_id: string
  name: string
  pipeline_stage: string | null
  auto_trigger: boolean
}

export type SequenceTemplateStep = {
  id: string
  template_id: string
  step_order: number
  channel: SequenceChannel
  delay_days: number
  message_template: string | null
}

export type SequenceInstanceStep = {
  id: string
  instance_id: string
  template_step_id: string | null
  step_order: number
  channel: SequenceChannel
  scheduled_at: string
  executed_at: string | null
  status: StepStatus
  error_message: string | null
  message_sent: string | null
}

export type SequenceInstance = {
  id: string
  user_id: string
  prospect_id: string
  template_id: string | null
  status: SequenceStatus
  started_at: string
  paused_at: string | null
  completed_at: string | null
  cancelled_at: string | null
}

export type SequenceInstanceWithSteps = SequenceInstance & {
  template_name: string | null
  steps: SequenceInstanceStep[]
}

export type ProspectForSequence = {
  id: string
  full_name: string
  phone: string | null
  phone_normalized: string | null
  email: string | null
  pipeline_stage: string
  linkedin_url: string | null
}

// Helper type pour un client Supabase typé minimalement
export type SupabaseLike = SupabaseClient
