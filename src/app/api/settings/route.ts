import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

function getDefaultSettings() {
  return {
    ca_monthly_target: 15000,
    ca_annual_target: 180000,
    client_health_threshold_days: 90,
    closing_target_pct: 40.0,
    calls_per_day_target: 20,
    rdv_per_week_target: 5,
    blocks_per_day_target: 6,
    message_templates: {} as Record<string, Record<string, string>>,
    // JSONB complex objects
    daily_targets: { contacts: 10, calls: 20, rdv1: 2, rdv2: 1 },
    monthly_intensity: { jan: 1.0, feb: 1.0, mar: 1.0, apr: 1.0, may: 1.0, jun: 0.9, jul: 0.5, aug: 0.3, sep: 1.0, oct: 1.0, nov: 1.0, dec: 0.7 },
    scoring_grids: { professions: [], zones: [] },
    completed_videos: [] as string[],
    // General tab
    coach_instructions: '',
    objectives_count: 3,
    bloc_duration_minutes: 25,
    blocs_per_day_normal: 6,
    blocs_per_day_max: 10,
    sequence_delay_email: 3,
    sequence_delay_sms: 2,
    sequence_delay_whatsapp: 1,
    sequence_steps_max: 5,
    sequence_stop_days: 30,
    // KPI tab
    rdv_r1_annual: 200,
    rdv_r2_annual: 100,
    rdv_monthly_distribution: {} as Record<string, { r1: number; r2: number }>,
    interpro_daily_target: 5,
    commerce_minutes_daily: 120,
    sport_weekly_target: 3,
    collecte_annual: 500000,
    // Notifications
    notification_channels: { push: true, email: true, sms: false, telegram: false },
    notification_email: '',
    notification_phone: '',
    notification_telegram_bot: '',
    notification_telegram_chat: '',
    notification_events: {} as Record<string, boolean>,
    notification_rdv_hours: 24,
    // Affichage
    visible_sections: {} as Record<string, boolean>,
    mobile_sections: {} as Record<string, boolean>,
    mobile_font_size: 'medium' as const,
    mobile_compact: false,
    mobile_bottom_menu: true,
  }
}

const PatchSettingsSchema = z.object({
  // Existing fields
  ca_monthly_target: z.number().positive().optional(),
  ca_annual_target: z.number().positive().optional(),
  client_health_threshold_days: z.number().int().min(1).max(365).optional(),
  closing_target_pct: z.number().min(0).max(100).optional(),
  calls_per_day_target: z.number().int().min(0).optional(),
  rdv_per_week_target: z.number().int().min(0).optional(),
  blocks_per_day_target: z.number().int().min(0).optional(),
  message_templates: z.record(z.string(), z.record(z.string(), z.string())).optional(),
  // JSONB complex objects
  daily_targets: z.object({
    contacts: z.number(),
    calls: z.number(),
    rdv1: z.number(),
    rdv2: z.number(),
  }).optional(),
  monthly_intensity: z.record(z.string(), z.number()).optional(),
  scoring_grids: z.object({
    professions: z.array(z.object({ label: z.string(), val: z.number() })),
    zones: z.array(z.object({ label: z.string(), val: z.number() })),
  }).optional(),
  completed_videos: z.array(z.string()).optional(),
  // General tab fields
  coach_instructions: z.string().optional(),
  objectives_count: z.number().int().min(1).optional(),
  bloc_duration_minutes: z.number().int().min(5).max(120).optional(),
  blocs_per_day_normal: z.number().int().min(1).max(20).optional(),
  blocs_per_day_max: z.number().int().min(1).max(30).optional(),
  sequence_delay_email: z.number().int().min(0).optional(),
  sequence_delay_sms: z.number().int().min(0).optional(),
  sequence_delay_whatsapp: z.number().int().min(0).optional(),
  sequence_steps_max: z.number().int().min(1).max(20).optional(),
  sequence_stop_days: z.number().int().min(1).optional(),
  // KPI tab fields
  rdv_r1_annual: z.number().int().min(0).optional(),
  rdv_r2_annual: z.number().int().min(0).optional(),
  rdv_monthly_distribution: z.record(z.string(), z.object({ r1: z.number(), r2: z.number() })).optional(),
  interpro_daily_target: z.number().int().min(0).optional(),
  commerce_minutes_daily: z.number().int().min(0).optional(),
  sport_weekly_target: z.number().int().min(0).optional(),
  collecte_annual: z.number().min(0).optional(),
  // Notifications
  notification_channels: z.object({
    push: z.boolean(),
    email: z.boolean(),
    sms: z.boolean(),
    telegram: z.boolean(),
  }).optional(),
  notification_email: z.string().optional(),
  notification_phone: z.string().optional(),
  notification_telegram_bot: z.string().optional(),
  notification_telegram_chat: z.string().optional(),
  notification_events: z.record(z.string(), z.boolean()).optional(),
  notification_rdv_hours: z.number().int().min(0).optional(),
  // Affichage
  visible_sections: z.record(z.string(), z.boolean()).optional(),
  mobile_sections: z.record(z.string(), z.boolean()).optional(),
  mobile_font_size: z.enum(['small', 'medium', 'large']).optional(),
  mobile_compact: z.boolean().optional(),
  mobile_bottom_menu: z.boolean().optional(),
})

export async function GET(_request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    // PGRST116 = row not found — utilisateur nouveau, retourner les defaults
    if (error.code === 'PGRST116') {
      return apiSuccess(getDefaultSettings())
    }
    return apiError(error.message)
  }

  return apiSuccess(data)
}

export async function PATCH(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('Corps de requête invalide', 400)
  }

  const parsed = PatchSettingsSchema.safeParse(body)
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, 400)
  }

  let updateData: Record<string, unknown> = { ...parsed.data }

  // Si message_templates dans le body : merger JSONB côté serveur
  if (parsed.data.message_templates !== undefined) {
    const { data: existing } = await supabase
      .from('user_settings')
      .select('message_templates')
      .eq('id', user.id)
      .single()

    const existingTemplates = (existing?.message_templates ?? {}) as Record<string, Record<string, string>>
    updateData.message_templates = {
      ...existingTemplates,
      ...parsed.data.message_templates,
    }
  }

  const { data, error } = await supabase
    .from('user_settings')
    .upsert({ id: user.id, ...updateData, updated_at: new Date().toISOString() })
    .eq('id', user.id)
    .select()
    .single()

  if (error) return apiError(error.message)

  return apiSuccess(data)
}
