import { NextRequest } from 'next/server'
import { addDays, startOfDay, endOfDay, startOfWeek, endOfWeek, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { verifyCronSecret } from '@/lib/cron/auth'
import { logCronRun } from '@/lib/cron/logger'
import { buildWeeklyReportHtml } from '@/lib/cron/report-builder'
import { createSupabaseCronClient } from '@/lib/supabase/cron-client'
import { sendBrevoEmail } from '@/lib/sequences/brevo'
import { apiSuccess, apiError } from '@/lib/api'

export async function GET(req: NextRequest) {
  const authError = verifyCronSecret(req)
  if (authError) return authError

  const supabase = createSupabaseCronClient()
  const { data: users, error } = await supabase
    .from('user_settings')
    .select('id, ca_monthly_target')

  if (error) return apiError(`user_settings: ${error.message}`)

  let processed = 0
  const errors: string[] = []
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  for (const user of users ?? []) {
    try {
      // 1. Recuperer l'email du CGP via admin API
      const { data: authData } = await supabase.auth.admin.getUserById(user.id)
      const recipientEmail = authData?.user?.email ?? ''
      if (!recipientEmail) {
        errors.push(`user ${user.id}: email introuvable`)
        continue
      }

      // 2. CA mois courant via v_monthly_revenue
      const { data: monthly } = await supabase
        .from('v_monthly_revenue')
        .select('month_num, revenue')
        .eq('user_id', user.id)
        .eq('year', currentYear)

      const monthRow = (monthly ?? []).find((r: { month_num: number; revenue: unknown }) => r.month_num === currentMonth)
      const caMonth = Number(monthRow?.revenue) || 0

      // 3. Objectif mensuel
      const caObjective = Number(user.ca_monthly_target) || 15000

      // 4. CA semaine courante via contracts
      const weekStart = startOfWeek(now, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
      const { data: weekContracts } = await supabase
        .from('contracts')
        .select('commission_amount')
        .eq('user_id', user.id)
        .eq('commission_status', 'percue')
        .gte('commission_date', weekStart.toISOString())
        .lte('commission_date', weekEnd.toISOString())

      const caWeek = (weekContracts ?? []).reduce(
        (sum: number, c: { commission_amount: unknown }) => sum + (Number(c.commission_amount) || 0),
        0
      )

      // 5. Alertes client health
      const { data: rawAlerts } = await supabase
        .rpc('get_client_health_alerts', { p_user_id: user.id })

      const healthAlerts = (rawAlerts ?? []).map((a: {
        full_name: string
        days_without_contact: unknown
        alert_threshold_days: unknown
      }) => {
        const days = Number(a.days_without_contact) || 0
        const threshold = Number(a.alert_threshold_days) || 90
        return {
          full_name: a.full_name,
          days_without_contact: days,
          severity: days >= threshold * 1.5 ? 'critical' : 'warning',
        }
      })

      // 6. Relances dues cette semaine
      const { count: relancesCount } = await supabase
        .from('prospects')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('next_action_date', startOfDay(now).toISOString())
        .lte('next_action_date', weekEnd.toISOString())

      const relancesDues = relancesCount ?? 0

      // 7. RDV planifies cette semaine
      const { count: rdvCount } = await supabase
        .from('interactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('type', ['rdv1', 'rdv2', 'rdv3'])
        .gte('occurred_at', weekStart.toISOString())
        .lte('occurred_at', weekEnd.toISOString())

      const rdvSemaine = rdvCount ?? 0

      // 8. Label de la semaine
      const weekLabel = 'Semaine du ' + format(weekStart, 'd MMMM yyyy', { locale: fr })

      // 9. Construire HTML
      const htmlContent = buildWeeklyReportHtml({
        caWeek,
        caMonth,
        caObjective,
        healthAlerts,
        relancesDues,
        rdvSemaine,
        weekLabel,
      })

      // 10. Envoyer email
      const emailResult = await sendBrevoEmail({
        to: recipientEmail,
        toName: 'Ted -- CGP',
        subject: `Rapport hebdo -- ${weekLabel}`,
        htmlContent,
      })

      // 11. Logger
      await logCronRun({
        userId: user.id,
        jobName: 'weekly-report',
        status: emailResult.success ? 'success' : 'error',
        details: {
          caWeek,
          caMonth,
          caObjective,
          alertsCount: healthAlerts.length,
          relancesDues,
          rdvSemaine,
          emailSent: emailResult.success,
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
        jobName: 'weekly-report',
        status: 'error',
        details: { error: msg },
      })
    }
  }

  return apiSuccess({ status: 'ok', processed, errors })
}
