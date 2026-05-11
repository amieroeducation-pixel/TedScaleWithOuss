import { NextRequest } from 'next/server'
import { addDays, startOfDay, endOfDay, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { verifyCronSecret } from '@/lib/cron/auth'
import { logCronRun } from '@/lib/cron/logger'
import { createSupabaseCronClient } from '@/lib/supabase/cron-client'
import { sendBrevoEmail, sendBrevoSms } from '@/lib/sequences/brevo'
import { apiSuccess, apiError } from '@/lib/api'

/** Helper WhatsApp Business Cloud API -- fallback SMS si non configure */
async function sendWhatsAppMessage(
  phone: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

  if (!phoneNumberId || !accessToken) {
    return { success: false, error: 'WhatsApp non configure' }
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phone.replace(/\D/g, ''),
          type: 'text',
          text: { body: message },
        }),
      }
    )
    if (res.ok) return { success: true }
    return { success: false, error: `HTTP ${res.status}` }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Erreur reseau WhatsApp',
    }
  }
}

export async function GET(req: NextRequest) {
  const authError = verifyCronSecret(req)
  if (authError) return authError

  const supabase = createSupabaseCronClient()
  const { data: users, error } = await supabase
    .from('user_settings')
    .select('id')

  if (error) return apiError(`user_settings: ${error.message}`)

  let processed = 0
  const errors: string[] = []
  const tomorrow = addDays(new Date(), 1)
  const tomorrowStart = startOfDay(tomorrow).toISOString()
  const tomorrowEnd = endOfDay(tomorrow).toISOString()

  for (const user of users ?? []) {
    const userErrors: string[] = []
    let sentCount = 0

    try {
      // 1. Recuperer RDV de demain
      const { data: rdvList } = await supabase
        .from('interactions')
        .select('id, type, occurred_at, prospects(full_name, phone, phone_normalized, email)')
        .eq('user_id', user.id)
        .in('type', ['rdv1', 'rdv2', 'rdv3'])
        .gte('occurred_at', tomorrowStart)
        .lte('occurred_at', tomorrowEnd)

      // 2. Si 0 RDV: skip
      if (!rdvList || rdvList.length === 0) {
        await logCronRun({
          userId: user.id,
          jobName: 'rdv-reminder',
          status: 'skipped',
          details: { reason: 'Aucun RDV demain' },
        })
        continue
      }

      const rdvCount = rdvList.length

      // 3. Pour chaque RDV, envoyer un rappel
      for (const rdv of rdvList) {
        const typedRdv = rdv as {
          id: string
          type: string
          occurred_at: string | null
          prospects: { full_name: string; phone: string | null; phone_normalized: string | null; email: string | null } | Array<{ full_name: string; phone: string | null; phone_normalized: string | null; email: string | null }> | null
        }

        // Normaliser prospect (peut etre objet ou tableau selon Supabase join)
        const prospect = Array.isArray(typedRdv.prospects)
          ? typedRdv.prospects[0]
          : typedRdv.prospects

        if (!prospect) {
          userErrors.push(`rdv ${typedRdv.id}: prospect introuvable`)
          continue
        }

        const rdvTime = typedRdv.occurred_at
          ? format(new Date(typedRdv.occurred_at), 'HH:mm')
          : ''

        const tomorrowLabel = format(tomorrow, 'EEEE d MMMM', { locale: fr })
        const message = `Rappel RDV: vous avez un rendez-vous demain ${tomorrowLabel}${rdvTime ? ' a ' + rdvTime : ''}. Ted CGP.`

        const phone = prospect.phone_normalized || prospect.phone

        if (phone) {
          // Strategie: WhatsApp d'abord, sinon SMS Brevo
          const waResult = await sendWhatsAppMessage(phone, message)
          if (waResult.success) {
            sentCount++
          } else {
            // Fallback SMS
            const smsResult = await sendBrevoSms({
              to: phone,
              content: message,
            })
            if (smsResult.success) {
              sentCount++
            } else {
              // Fallback email si pas de phone
              if (prospect.email) {
                const emailResult = await sendBrevoEmail({
                  to: prospect.email,
                  toName: prospect.full_name,
                  subject: 'Rappel RDV demain',
                  htmlContent: `<p style="font-family:Arial,sans-serif;color:#333;">${message}</p>`,
                })
                if (emailResult.success) {
                  sentCount++
                } else {
                  userErrors.push(`rdv ${typedRdv.id}: email echec -- ${emailResult.error}`)
                }
              } else {
                userErrors.push(`rdv ${typedRdv.id}: aucun canal disponible (pas de phone ni email)`)
              }
            }
          }
        } else if (prospect.email) {
          // Pas de phone -- fallback email direct
          const emailResult = await sendBrevoEmail({
            to: prospect.email,
            toName: prospect.full_name,
            subject: 'Rappel RDV demain',
            htmlContent: `<p style="font-family:Arial,sans-serif;color:#333;">${message}</p>`,
          })
          if (emailResult.success) {
            sentCount++
          } else {
            userErrors.push(`rdv ${typedRdv.id}: email echec -- ${emailResult.error}`)
          }
        } else {
          userErrors.push(`rdv ${typedRdv.id}: aucun canal disponible (prospect sans phone ni email)`)
        }
      }

      errors.push(...userErrors)

      await logCronRun({
        userId: user.id,
        jobName: 'rdv-reminder',
        status: userErrors.length === 0 ? 'success' : 'error',
        details: { rdvCount, sentCount, errors: userErrors },
      })

      processed++
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue'
      errors.push(`user ${user.id}: ${msg}`)
      await logCronRun({
        userId: user.id,
        jobName: 'rdv-reminder',
        status: 'error',
        details: { error: msg },
      })
    }
  }

  return apiSuccess({ status: 'ok', processed, errors })
}
