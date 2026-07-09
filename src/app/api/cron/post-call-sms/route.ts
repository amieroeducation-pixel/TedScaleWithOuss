import { NextRequest } from 'next/server'
import { verifyCronSecret } from '@/lib/cron/auth'
import { logCronRun } from '@/lib/cron/logger'
import { isCronEnabled } from '@/lib/cron/toggles'
import { createSupabaseCronClient } from '@/lib/supabase/cron-client'
import { sendBrevoSms } from '@/lib/sequences/brevo'
import { apiSuccess, apiError } from '@/lib/api'

export const dynamic = 'force-dynamic'

/**
 * Cron POST-CALL SMS (5 minutes)
 * Cherche les interactions type 'appel' créées dans les 5 dernières minutes avec is_honored=false
 * et envoie un SMS automatique via Brevo
 */
export async function GET(req: NextRequest) {
  const authError = verifyCronSecret(req)
  if (authError) return authError

  if (!(await isCronEnabled('post-call-sms'))) {
    return apiSuccess({ status: 'disabled', message: 'Cron désactivé par l\'utilisateur' })
  }

  const supabase = createSupabaseCronClient()
  const { data: users, error } = await supabase
    .from('user_settings')
    .select('id')

  if (error) return apiError(`user_settings: ${error.message}`)

  let processed = 0
  const errors: string[] = []

  // Timestamp 5 minutes ago
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

  for (const user of users ?? []) {
    const userErrors: string[] = []
    let sentCount = 0

    try {
      // 1. Récupérer les appels non décrochés des 5 dernières minutes
      const { data: callsList } = await supabase
        .from('interactions')
        .select('id, prospect_id, prospects(phone, phone_normalized, full_name)')
        .eq('user_id', user.id)
        .eq('type', 'appel')
        .eq('is_honored', false)
        .gte('created_at', fiveMinutesAgo)

      if (!callsList || callsList.length === 0) {
        await logCronRun({
          userId: user.id,
          jobName: 'post-call-sms',
          status: 'skipped',
          details: { reason: 'Aucun appel non décroché dans les 5 dernières minutes' },
        })
        continue
      }

      // 2. Pour chaque appel, envoyer un SMS
      for (const call of callsList) {
        const typedCall = call as {
          id: string
          prospect_id: string
          prospects: { phone: string | null; phone_normalized: string | null; full_name: string } | Array<{ phone: string | null; phone_normalized: string | null; full_name: string }> | null
        }

        // Normaliser prospect (peut être objet ou tableau selon Supabase join)
        const prospect = Array.isArray(typedCall.prospects)
          ? typedCall.prospects[0]
          : typedCall.prospects

        if (!prospect) {
          userErrors.push(`interaction ${typedCall.id}: prospect introuvable`)
          continue
        }

        const phone = prospect.phone_normalized || prospect.phone
        if (!phone) {
          userErrors.push(`interaction ${typedCall.id}: pas de téléphone pour ${prospect.full_name}`)
          continue
        }

        // Extraire le prénom (premier mot du full_name)
        const parts = prospect.full_name.split(' ')
        const prenom = parts.length > 1 ? parts[0] : prospect.full_name

        // Message SMS
        const message = `Bonjour ${prenom}, j'ai essayé de vous joindre. Je suis Ted, conseiller en gestion de patrimoine. Je peux vous rappeler au moment qui vous convient. Bonne journée.`

        // 3. Envoyer le SMS via Brevo
        const smsResult = await sendBrevoSms({
          to: phone,
          content: message.slice(0, 160), // Limite SMS
        })

        if (smsResult.success) {
          // 4. Logger l'interaction SMS
          await supabase.from('interactions').insert({
            user_id: user.id,
            prospect_id: typedCall.prospect_id,
            type: 'sms',
            notes: 'SMS automatique post-appel',
            is_honored: true,
            occurred_at: new Date().toISOString(),
          })
          sentCount++
        } else {
          userErrors.push(`interaction ${typedCall.id}: SMS échec -- ${smsResult.error}`)
        }
      }

      errors.push(...userErrors)

      await logCronRun({
        userId: user.id,
        jobName: 'post-call-sms',
        status: userErrors.length === 0 ? 'success' : 'error',
        details: { callsCount: callsList.length, sentCount, errors: userErrors },
      })

      processed++
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue'
      errors.push(`user ${user.id}: ${msg}`)
      await logCronRun({
        userId: user.id,
        jobName: 'post-call-sms',
        status: 'error',
        details: { error: msg },
      })
    }
  }

  return apiSuccess({ status: 'ok', processed, errors })
}
