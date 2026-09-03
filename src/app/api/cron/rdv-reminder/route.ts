import { NextRequest } from 'next/server'
import { addHours, format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import Handlebars from 'handlebars'
import { verifyCronSecret } from '@/lib/cron/auth'
import { logCronRun } from '@/lib/cron/logger'
import { isCronEnabled } from '@/lib/cron/toggles'
import { createSupabaseCronClient } from '@/lib/supabase/cron-client'
import { sendBrevoSms } from '@/lib/sequences/brevo'
import { apiSuccess, apiError } from '@/lib/api'

// Templates par défaut si non configurés
const DEFAULT_TEMPLATES = {
  '24h': "Bonjour {{nom}}, rappel de votre RDV demain à {{heure}}. À bientôt !",
  '1h': "Bonjour {{nom}}, votre RDV est dans 1h ({{heure}}). Merci d'être ponctuel !"
}

type ReminderType = '24h' | '1h'

interface Booking {
  id: string
  user_id: string
  contact_name: string
  contact_phone: string | null
  scheduled_at: string
  duration_minutes: number
}

interface ReminderTemplate {
  template_type: ReminderType
  content: string
}

interface UserSettings {
  reminder_delay_24h?: number
  reminder_delay_1h?: number
  reminder_enabled?: boolean
  cabinet_location?: string
}

export async function GET(req: NextRequest) {
  const authError = verifyCronSecret(req)
  if (authError) return authError

  if (!(await isCronEnabled('rdv-reminder'))) {
    return apiSuccess({ status: 'disabled', message: 'Cron désactivé par l\'utilisateur' })
  }

  const supabase = createSupabaseCronClient()
  const now = new Date()

  // Fenêtre de recherche : maintenant + 25h (pour couvrir 24h avec marge)
  const window24hEnd = addHours(now, 25)

  let processed = 0
  const errors: string[] = []

  try {
    // 1. Récupérer tous les bookings confirmés à venir
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, user_id, contact_name, contact_phone, scheduled_at, duration_minutes')
      .in('status', ['confirmed', 'pending'])
      .gte('scheduled_at', now.toISOString())
      .lte('scheduled_at', window24hEnd.toISOString())

    if (bookingsError) {
      return apiError(`bookings: ${bookingsError.message}`)
    }

    if (!bookings || bookings.length === 0) {
      return apiSuccess({ status: 'ok', processed: 0, message: 'Aucun RDV à rappeler' })
    }

    // 2. Grouper les bookings par user_id pour récupérer templates et settings
    const userIds = Array.from(new Set(bookings.map((b: Booking) => b.user_id)))

    // Récupérer les templates de rappel pour chaque user
    const { data: templates } = await supabase
      .from('reminder_templates')
      .select('user_id, template_type, content')
      .in('user_id', userIds)

    // Récupérer les settings pour chaque user (delays personnalisés)
    const { data: settings } = await supabase
      .from('user_settings')
      .select('id, reminder_delay_24h, reminder_delay_1h, reminder_enabled, cabinet_location')
      .in('id', userIds)

    // Organiser templates et settings par user_id
    const templatesByUser: Record<string, Record<ReminderType, string>> = {}
    const settingsByUser: Record<string, UserSettings> = {}

    userIds.forEach(userId => {
      // Templates par défaut
      templatesByUser[userId] = {
        '24h': DEFAULT_TEMPLATES['24h'],
        '1h': DEFAULT_TEMPLATES['1h']
      }

      // Settings par défaut
      settingsByUser[userId] = {
        reminder_delay_24h: 24,
        reminder_delay_1h: 1,
        reminder_enabled: true
      }
    })

    // Surcharger avec les templates personnalisés
    if (templates) {
      templates.forEach((t: ReminderTemplate & { user_id: string }) => {
        if (!templatesByUser[t.user_id]) {
          templatesByUser[t.user_id] = { ...DEFAULT_TEMPLATES }
        }
        templatesByUser[t.user_id][t.template_type] = t.content
      })
    }

    // Surcharger avec les settings personnalisés
    if (settings) {
      settings.forEach((s: UserSettings & { id: string }) => {
        settingsByUser[s.id] = {
          reminder_delay_24h: s.reminder_delay_24h ?? 24,
          reminder_delay_1h: s.reminder_delay_1h ?? 1,
          reminder_enabled: s.reminder_enabled ?? true,
          cabinet_location: s.cabinet_location ?? 'Mon cabinet'
        }
      })
    }

    // 3. Traiter chaque booking
    for (const booking of bookings) {
      const userSettings = settingsByUser[booking.user_id]

      // Vérifier si les rappels sont activés pour cet utilisateur
      if (!userSettings?.reminder_enabled) {
        continue
      }

      const scheduledAt = parseISO(booking.scheduled_at)
      const delay24h = userSettings.reminder_delay_24h ?? 24
      const delay1h = userSettings.reminder_delay_1h ?? 1

      // Calculer les moments d'envoi idéaux
      const send24hAt = addHours(scheduledAt, -delay24h)
      const send1hAt = addHours(scheduledAt, -delay1h)

      // Vérifier si on est dans la fenêtre 24h (marge de ±1h)
      const shouldSend24h = now >= addHours(send24hAt, -1) && now <= addHours(send24hAt, 1)

      // Vérifier si on est dans la fenêtre 1h (marge de ±12min)
      const shouldSend1h = now >= addHours(send1hAt, -0.2) && now <= addHours(send1hAt, 0.2)

      if (!shouldSend24h && !shouldSend1h) {
        continue
      }

      // Vérifier si le contact a un téléphone
      if (!booking.contact_phone) {
        errors.push(`Booking ${booking.id}: pas de téléphone`)
        await logCronRun({
          userId: booking.user_id,
          jobName: 'rdv-reminder',
          status: 'error',
          details: {
            bookingId: booking.id,
            error: 'Pas de téléphone',
          }
        })
        continue
      }

      // Déterminer quel(s) rappel(s) envoyer
      const remindersToSend: ReminderType[] = []
      if (shouldSend24h) remindersToSend.push('24h')
      if (shouldSend1h) remindersToSend.push('1h')

      for (const reminderType of remindersToSend) {
        try {
          // Vérifier si ce rappel a déjà été envoyé
          const { data: alreadySent } = await supabase
            .from('reminder_sent')
            .select('id')
            .eq('booking_id', booking.id)
            .eq('reminder_type', reminderType)
            .single()

          if (alreadySent) {
            continue // Déjà envoyé, skip
          }

          // Préparer les données pour le template
          const templateData = {
            nom: booking.contact_name,
            date: format(scheduledAt, 'eeee d MMMM yyyy', { locale: fr }),
            heure: format(scheduledAt, 'HH:mm', { locale: fr }),
            lieu: settingsByUser[booking.user_id]?.cabinet_location ?? 'Mon cabinet'
          }

          // Compiler le template
          const templateContent = templatesByUser[booking.user_id]?.[reminderType] ?? DEFAULT_TEMPLATES[reminderType]
          const template = Handlebars.compile(templateContent)
          const message = template(templateData)

          // Envoyer le SMS
          const smsResult = await sendBrevoSms({
            to: booking.contact_phone,
            content: message
          })

          // Enregistrer l'envoi dans reminder_sent
          await supabase.from('reminder_sent').insert({
            booking_id: booking.id,
            user_id: booking.user_id,
            reminder_type: reminderType,
            success: smsResult.success,
            error_message: smsResult.error
          })

          // Logger dans cron_logs
          await logCronRun({
            userId: booking.user_id,
            jobName: 'rdv-reminder',
            status: smsResult.success ? 'success' : 'error',
            details: {
              bookingId: booking.id,
              reminderType,
              contactName: booking.contact_name,
              contactPhone: booking.contact_phone,
              scheduledAt: booking.scheduled_at,
              smsSent: smsResult.success,
              error: smsResult.error
            }
          })

          if (smsResult.success) {
            processed++
          } else {
            errors.push(`Booking ${booking.id} (${reminderType}): ${smsResult.error}`)
          }

        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Erreur inconnue'
          errors.push(`Booking ${booking.id} (${reminderType}): ${msg}`)

          await logCronRun({
            userId: booking.user_id,
            jobName: 'rdv-reminder',
            status: 'error',
            details: {
              bookingId: booking.id,
              reminderType,
              error: msg
            }
          })
        }
      }
    }

    return apiSuccess({
      status: 'ok',
      processed,
      bookingsChecked: bookings.length,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    return apiError(msg)
  }
}
