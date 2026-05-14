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
  }
}

const PatchSettingsSchema = z.object({
  ca_monthly_target: z.number().positive().optional(),
  ca_annual_target: z.number().positive().optional(),
  client_health_threshold_days: z.number().int().min(1).max(365).optional(),
  closing_target_pct: z.number().min(0).max(100).optional(),
  calls_per_day_target: z.number().int().min(0).optional(),
  rdv_per_week_target: z.number().int().min(0).optional(),
  blocks_per_day_target: z.number().int().min(0).optional(),
  message_templates: z.record(z.string(), z.record(z.string(), z.string())).optional(),
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
