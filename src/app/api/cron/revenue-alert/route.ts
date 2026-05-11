import { NextRequest } from 'next/server'
import { verifyCronSecret } from '@/lib/cron/auth'
import { logCronRun } from '@/lib/cron/logger'
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
  const dayOfMonth = now.getDate()

  for (const user of users ?? []) {
    try {
      const target = Number(user.ca_monthly_target) || 0

      // 1. Si pas d'objectif configure: skip
      if (!target || target <= 0) {
        await logCronRun({
          userId: user.id,
          jobName: 'revenue-alert',
          status: 'skipped',
          details: { reason: "Pas d'objectif configure" },
        })
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

      // 3. Calcul pourcentage
      const pct = Math.round((caMonth / target) * 100)

      // 4. Conditions d'envoi: CA < objectif ET apres le 15 du mois
      const underTarget = caMonth < target
      const afterDay15 = dayOfMonth >= 15

      if (!underTarget || !afterDay15) {
        const reason = !underTarget
          ? `Objectif atteint (${pct}%)`
          : `Trop tot dans le mois (jour ${dayOfMonth} < 15)`

        await logCronRun({
          userId: user.id,
          jobName: 'revenue-alert',
          status: 'skipped',
          details: { reason, caMonth, target, pct, dayOfMonth },
        })
        continue
      }

      // 5. Recuperer email du CGP
      const { data: authData } = await supabase.auth.admin.getUserById(user.id)
      const recipientEmail = authData?.user?.email ?? ''
      if (!recipientEmail) {
        errors.push(`user ${user.id}: email introuvable`)
        continue
      }

      const ecart = target - caMonth
      const pctColor = pct >= 70 ? '#f59e0b' : '#ef4444'

      // 6. Construire HTML email alerte CA
      const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#e5e5e5;padding:24px;">
  <h1 style="color:#c9a84c;font-size:20px;margin-bottom:4px;">Alerte CA Mensuel</h1>
  <p style="color:#666;font-size:12px;margin-top:0;margin-bottom:20px;">
    ${now.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
  </p>

  <div style="background:#111;border:1px solid #222;border-radius:8px;padding:20px;margin-bottom:16px;">
    <h2 style="color:#c9a84c;font-size:14px;margin-top:0;margin-bottom:16px;">Situation du mois en cours</h2>

    <div style="margin-bottom:12px;">
      <p style="color:#999;font-size:12px;margin:0 0 4px;">CA actuel</p>
      <p style="font-size:28px;font-weight:700;color:${pctColor};margin:0;">
        ${caMonth.toLocaleString('fr-FR')} EUR
      </p>
    </div>

    <div style="display:flex;gap:24px;margin-top:16px;">
      <div>
        <p style="color:#999;font-size:12px;margin:0 0 2px;">Objectif</p>
        <p style="color:#e5e5e5;font-size:16px;font-weight:600;margin:0;">
          ${target.toLocaleString('fr-FR')} EUR
        </p>
      </div>
      <div>
        <p style="color:#999;font-size:12px;margin:0 0 2px;">Progression</p>
        <p style="color:${pctColor};font-size:16px;font-weight:700;margin:0;">${pct}%</p>
      </div>
      <div>
        <p style="color:#999;font-size:12px;margin:0 0 2px;">Ecart restant</p>
        <p style="color:#ef4444;font-size:16px;font-weight:600;margin:0;">
          -${ecart.toLocaleString('fr-FR')} EUR
        </p>
      </div>
    </div>
  </div>

  <p style="color:#333;font-size:10px;margin-top:24px;text-align:center;">
    Ted Scale With Ouss -- Alerte CA automatique
  </p>
</body>
</html>`

      // 7. Envoyer email
      const result = await sendBrevoEmail({
        to: recipientEmail,
        toName: 'Ted -- CGP',
        subject: `Alerte CA : ${pct}% de l'objectif atteint`,
        htmlContent,
      })

      // 8. Logger
      await logCronRun({
        userId: user.id,
        jobName: 'revenue-alert',
        status: result.success ? 'success' : 'error',
        details: {
          caMonth,
          target,
          pct,
          ecart,
          dayOfMonth,
          emailSent: result.success,
          error: result.error,
        },
      })

      if (result.success) {
        processed++
      } else {
        errors.push(`user ${user.id}: email non envoye -- ${result.error}`)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue'
      errors.push(`user ${user.id}: ${msg}`)
      await logCronRun({
        userId: user.id,
        jobName: 'revenue-alert',
        status: 'error',
        details: { error: msg },
      })
    }
  }

  return apiSuccess({ status: 'ok', processed, errors })
}
