import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/api'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { sendBrevoEmail } from '@/lib/sequences/brevo'
import { getValidGoogleToken, type TokenRow } from '@/lib/google/tokens'
import { isValidPhoneFr, normalizePhoneFr } from '@/lib/phone'
import { z } from 'zod'

const BookingSchema = z.object({
  slug: z.string().min(1, 'Slug utilisateur requis'),
  contact_name: z.string().min(2, 'Nom requis (minimum 2 caractères)'),
  contact_email: z.string().email('Email invalide'),
  contact_phone: z.string().optional(),
  message: z.string().optional(),
  scheduled_at: z.string().datetime('Format datetime ISO requis'),
  duration_minutes: z.number().min(15).max(240).default(30),
})

/**
 * POST /api/booking
 * Créer un nouveau booking (rendez-vous).
 * Public endpoint (pas d'auth requise).
 */
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('Corps de requête JSON invalide', 400)
  }

  // Validation Zod
  const parsed = BookingSchema.safeParse(body)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return apiError(firstError.message, 400)
  }

  let { slug, contact_name, contact_email, contact_phone, message, scheduled_at, duration_minutes } = parsed.data

  // Valider et normaliser le téléphone si fourni
  if (contact_phone && contact_phone.trim() !== '') {
    if (!isValidPhoneFr(contact_phone)) {
      return apiError('Format de téléphone invalide. Utilisez un numéro français valide (ex: 06 12 34 56 78)', 400)
    }
    contact_phone = normalizePhoneFr(contact_phone)
  } else {
    contact_phone = undefined
  }

  const supabase = await createSupabaseServerClient()

  // Trouver l'utilisateur par son booking_slug
  const { data: userSettings, error: userError } = await supabase
    .from('user_settings')
    .select('id, google_calendar_refresh_token, google_calendar_access_token, google_calendar_token_expiry')
    .eq('booking_slug', slug)
    .single()

  if (userError || !userSettings) {
    return apiError('Utilisateur non trouvé', 404)
  }

  const userId = userSettings.id

  // Vérifier que le créneau est dans le futur
  const scheduledDate = new Date(scheduled_at)
  if (scheduledDate.getTime() < Date.now()) {
    return apiError('Le créneau sélectionné est dans le passé', 400)
  }

  // Vérifier la disponibilité du créneau
  const slotEnd = new Date(scheduledDate.getTime() + duration_minutes * 60 * 1000)

  const { data: conflictingBookings } = await supabase
    .from('bookings')
    .select('id')
    .eq('user_id', userId)
    .in('status', ['pending', 'confirmed'])
    .or(
      `and(scheduled_at.lte.${scheduled_at},scheduled_at.gte.${new Date(scheduledDate.getTime() - duration_minutes * 60 * 1000).toISOString()})` +
      `,and(scheduled_at.gte.${scheduled_at},scheduled_at.lte.${slotEnd.toISOString()})`
    )

  if (conflictingBookings && conflictingBookings.length > 0) {
    return apiError('Ce créneau est déjà réservé', 409)
  }

  // Créer l'événement Google Calendar si connecté
  let googleEventId: string | null = null

  if (userSettings.google_calendar_refresh_token) {
    const accessToken = await getValidGoogleToken(supabase, userId, userSettings as TokenRow)

    if (accessToken) {
      const eventPayload = {
        summary: `RDV avec ${contact_name}`,
        description: message || `Rendez-vous avec ${contact_name}\nEmail: ${contact_email}${contact_phone ? `\nTéléphone: ${contact_phone}` : ''}`,
        start: { dateTime: scheduled_at, timeZone: 'Europe/Paris' },
        end: { dateTime: slotEnd.toISOString(), timeZone: 'Europe/Paris' },
        attendees: [{ email: contact_email }],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 24h avant
            { method: 'popup', minutes: 30 }, // 30min avant
          ],
        },
      }

      const createRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventPayload),
      })

      if (createRes.ok) {
        const created = (await createRes.json()) as { id: string }
        googleEventId = created.id
      }
    }
  }

  // Créer le booking en base de données
  const { data: booking, error: insertError } = await supabase
    .from('bookings')
    .insert({
      user_id: userId,
      contact_name,
      contact_email,
      contact_phone: contact_phone || null,
      message: message || null,
      scheduled_at,
      duration_minutes,
      status: 'confirmed',
      google_event_id: googleEventId,
      confirmed_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (insertError) {
    console.error('[Booking] Erreur insertion DB:', insertError)
    return apiError('Erreur lors de la création du rendez-vous', 500)
  }

  // Envoyer email de confirmation au contact
  const scheduledDateFormatted = new Date(scheduled_at).toLocaleString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Paris',
  })

  await sendBrevoEmail({
    to: contact_email,
    toName: contact_name,
    subject: 'Confirmation de votre rendez-vous',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0a0e22;">Votre rendez-vous est confirmé ✅</h2>
        <p>Bonjour ${contact_name},</p>
        <p>Votre rendez-vous a bien été enregistré pour le :</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="font-size: 18px; font-weight: bold; margin: 0; color: #0a0e22;">
            ${scheduledDateFormatted}
          </p>
          <p style="margin: 10px 0 0 0; color: #666;">
            Durée : ${duration_minutes} minutes
          </p>
        </div>
        ${message ? `<p><strong>Votre message :</strong></p><p style="background: #f9f9f9; padding: 15px; border-left: 4px solid #e8c878;">${message}</p>` : ''}
        <p>Un lien de visioconférence vous sera envoyé par email 24h avant le rendez-vous.</p>
        <p>À très bientôt !</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />
        <p style="font-size: 12px; color: #999;">
          Si vous devez annuler ou modifier ce rendez-vous, merci de nous contacter directement.
        </p>
      </div>
    `,
  })

  return apiSuccess({
    booking: {
      id: booking.id,
      contact_name: booking.contact_name,
      scheduled_at: booking.scheduled_at,
      status: booking.status,
    },
    message: 'Rendez-vous confirmé avec succès',
  })
}
