import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export type HealthAlert = {
  client_id: string
  prospect_id: string
  full_name: string
  last_interaction_at: string | null
  days_without_contact: number
  alert_threshold_days: number
  total_aum: number
  severity: 'warning' | 'critical'
}

export async function GET(_request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { data, error } = await supabase
    .rpc('get_client_health_alerts', { p_user_id: user.id })

  if (error) return apiError(error.message)

  const alerts: HealthAlert[] = (data ?? []).map((a: any) => ({
    client_id: a.client_id,
    prospect_id: a.prospect_id,
    full_name: a.full_name,
    last_interaction_at: a.last_interaction_at,
    days_without_contact: Number(a.days_without_contact) || 0,
    alert_threshold_days: Number(a.alert_threshold_days) || 90,
    total_aum: Number(a.total_aum) || 0,
    severity: (Number(a.days_without_contact) >= Number(a.alert_threshold_days) * 1.5)
      ? 'critical'
      : 'warning',
  }))

  // Tri : critical d'abord, puis par jours décroissants
  alerts.sort((x, y) => {
    if (x.severity !== y.severity) return x.severity === 'critical' ? -1 : 1
    return y.days_without_contact - x.days_without_contact
  })

  return apiSuccess({
    alerts,
    count: alerts.length,
    criticalCount: alerts.filter(a => a.severity === 'critical').length,
  })
}
