import { NextRequest } from 'next/server'
import { verifyCronSecret } from '@/lib/cron/auth'
import { logCronRun } from '@/lib/cron/logger'
import { isCronEnabled } from '@/lib/cron/toggles'
import { createSupabaseCronClient } from '@/lib/supabase/cron-client'
import { sendBrevoEmail, sendBrevoSms } from '@/lib/sequences/brevo'
import { apiSuccess, apiError } from '@/lib/api'

export async function GET(req: NextRequest) {
  const authError = verifyCronSecret(req)
  if (authError) return authError

  if (!(await isCronEnabled('client-health'))) {
    return apiSuccess({ status: 'disabled', message: 'Cron désactivé par l\'utilisateur' })
  }

  const supabase = createSupabaseCronClient()
  const { data: users, error } = await supabase
    .from('user_settings')
    .select('id')

  if (error) return apiError(`user_settings: ${error.message}`)

  let processed = 0
  const errors: string[] = []

  for (const user of users ?? []) {
    try {
      // 1. Recuperer alertes client health via RPC
      const { data: rawAlerts } = await supabase
        .rpc('get_client_health_alerts', { p_user_id: user.id })

      const alerts = (rawAlerts ?? []).map((a: {
        client_id: string
        prospect_id: string
        full_name: string
        days_without_contact: unknown
        alert_threshold_days: unknown
        total_aum: unknown
      }) => {
        const days = Number(a.days_without_contact) || 0
        const threshold = Number(a.alert_threshold_days) || 90
        return {
          client_id: a.client_id,
          prospect_id: a.prospect_id,
          full_name: a.full_name,
          days_without_contact: days,
          severity: days >= threshold * 1.5 ? 'critical' : 'warning',
        }
      })

      // 2. Si 0 alertes: skip
      if (alerts.length === 0) {
        await logCronRun({
          userId: user.id,
          jobName: 'client-health',
          status: 'skipped',
          details: { reason: 'Aucune alerte' },
        })
        continue
      }

      // 3. Recuperer email du CGP
      const { data: authData } = await supabase.auth.admin.getUserById(user.id)
      const recipientEmail = authData?.user?.email ?? ''
      if (!recipientEmail) {
        errors.push(`user ${user.id}: email introuvable`)
        continue
      }

      // 4. Construire HTML email recap alertes
      const alertsHtml = alerts.map((a: { full_name: string; days_without_contact: number; severity: string }) => `
        <div style="padding:10px 0;border-bottom:1px solid #1a1a1a;display:flex;gap:12px;align-items:center;">
          <span style="font-size:11px;font-weight:700;color:${a.severity === 'critical' ? '#ef4444' : '#f59e0b'};min-width:60px;">
            ${a.severity === 'critical' ? 'CRITIQUE' : 'ALERTE'}
          </span>
          <span style="color:#e5e5e5;font-size:13px;flex:1;">${a.full_name}</span>
          <span style="color:#999;font-size:12px;">${a.days_without_contact}j sans contact</span>
        </div>
      `).join('')

      const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#e5e5e5;padding:24px;">
  <h1 style="color:#c9a84c;font-size:20px;margin-bottom:4px;">Alertes Client Health</h1>
  <p style="color:#666;font-size:12px;margin-top:0;margin-bottom:20px;">${new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
  <div style="background:#111;border:1px solid #222;border-radius:8px;padding:16px;">
    <h2 style="color:#c9a84c;font-size:14px;margin-top:0;margin-bottom:12px;">${alerts.length} client(s) necessitent une attention</h2>
    ${alertsHtml}
  </div>
  <p style="color:#333;font-size:10px;margin-top:24px;text-align:center;">
    Ted Scale With Ouss -- Alerte automatique quotidienne
  </p>
</body>
</html>`

      // 5. Envoyer email recap
      const emailResult = await sendBrevoEmail({
        to: recipientEmail,
        toName: 'Ted -- CGP',
        subject: `${alerts.length} alerte(s) client health`,
        htmlContent,
      })

      // 6. SMS pour les alertes critiques
      const criticalAlerts = alerts.filter((a: { severity: string }) => a.severity === 'critical')
      let smsSentCount = 0

      if (criticalAlerts.length > 0) {
        // Recuperer les numeros de phone pour les prospects critiques
        const criticalProspectIds = criticalAlerts.map((a: { prospect_id: string }) => a.prospect_id)
        const { data: phones } = await supabase
          .from('prospects')
          .select('id, phone_normalized, full_name')
          .in('id', criticalProspectIds)

        for (const prospect of phones ?? []) {
          const typedProspect = prospect as { id: string; phone_normalized: string | null; full_name: string }
          if (!typedProspect.phone_normalized) continue
          const alert = criticalAlerts.find((a: { prospect_id: string }) => a.prospect_id === typedProspect.id)
          if (!alert) continue

          const smsResult = await sendBrevoSms({
            to: typedProspect.phone_normalized,
            content: `Alerte CGP: ${alert.full_name} sans contact depuis ${alert.days_without_contact}j -- a relancer en urgence.`,
          })
          if (smsResult.success) smsSentCount++
        }
      }

      // 7. Logger
      await logCronRun({
        userId: user.id,
        jobName: 'client-health',
        status: emailResult.success ? 'success' : 'error',
        details: {
          alertsCount: alerts.length,
          criticalCount: criticalAlerts.length,
          emailSent: emailResult.success,
          smsSentCount,
          error: emailResult.error,
        },
      })

      if (emailResult.success) {
        processed++
      } else {
        errors.push(`user ${user.id}: email non envoye -- ${emailResult.error}`)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue'
      errors.push(`user ${user.id}: ${msg}`)
      await logCronRun({
        userId: user.id,
        jobName: 'client-health',
        status: 'error',
        details: { error: msg },
      })
    }
  }

  return apiSuccess({ status: 'ok', processed, errors })
}
