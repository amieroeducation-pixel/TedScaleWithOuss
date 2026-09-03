import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/api'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseCronClient } from '@/lib/supabase/cron-client'
import { getValidGoogleToken, type TokenRow } from '@/lib/google/tokens'

/**
 * GET /api/booking/slots?slug=xxx&date=2026-08-11
 * Retourne les créneaux disponibles pour un utilisateur (via slug) pour une date donnée.
 * Public endpoint (pas d'auth requise).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')
  const dateStr = searchParams.get('date')

  if (!slug) {
    return apiError('Paramètre slug manquant', 400)
  }

  if (!dateStr) {
    return apiError('Paramètre date manquant (format: YYYY-MM-DD)', 400)
  }

  // Valider le format de la date
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(dateStr)) {
    return apiError('Format de date invalide (attendu: YYYY-MM-DD)', 400)
  }

  // Endpoint public : utiliser anon client pour query user_settings (RLS public read OK)
  const supabaseAnon = await createSupabaseServerClient()

  // Trouver l'utilisateur par son booking_slug
  const { data: userSettings, error: userError } = await supabaseAnon
    .from('user_settings')
    .select('id, google_calendar_refresh_token, google_calendar_access_token, google_calendar_token_expiry')
    .eq('booking_slug', slug)
    .single()

  if (userError || !userSettings) {
    return apiError('Utilisateur non trouvé', 404)
  }

  const userId = userSettings.id

  // Service role client pour query bookings (bypass RLS)
  const supabase = createSupabaseCronClient()

  // Vérifier si Google Calendar est connecté
  if (!userSettings.google_calendar_refresh_token) {
    return apiSuccess({
      slots: [],
      date: dateStr,
      message: 'Google Calendar non connecté pour cet utilisateur',
    })
  }

  // Obtenir un token valide (utiliser service role pour update tokens si besoin)
  const accessToken = await getValidGoogleToken(supabase, userId, userSettings as TokenRow)
  if (!accessToken) {
    return apiError('Token Google Calendar invalide', 401)
  }

  // Définir les bornes de la journée (Europe/Paris)
  const targetDate = new Date(dateStr + 'T00:00:00.000+02:00')
  const dayStart = new Date(targetDate)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(targetDate)
  dayEnd.setHours(23, 59, 59, 999)

  // Récupérer les événements Google Calendar pour cette journée
  const calRes = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events?' +
      new URLSearchParams({
        timeMin: dayStart.toISOString(),
        timeMax: dayEnd.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '100',
      }),
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!calRes.ok) {
    const err = await calRes.json().catch(() => ({}))
    return apiError(
      (err as { error?: { message?: string } }).error?.message ?? 'Erreur Google Calendar API',
      502
    )
  }

  const calData = (await calRes.json()) as { items?: Record<string, unknown>[] }

  // Extraire les événements occupés
  const busyEvents = (calData.items ?? []).map((e: Record<string, unknown>) => {
    const start = e.start as { dateTime?: string; date?: string } | undefined
    const end = e.end as { dateTime?: string; date?: string } | undefined
    return {
      start: start?.dateTime ?? start?.date ?? null,
      end: end?.dateTime ?? end?.date ?? null,
    }
  })

  // Récupérer les bookings existants pour cette journée
  const { data: existingBookings } = await supabase
    .from('bookings')
    .select('scheduled_at, duration_minutes')
    .eq('user_id', userId)
    .in('status', ['pending', 'confirmed'])
    .gte('scheduled_at', dayStart.toISOString())
    .lte('scheduled_at', dayEnd.toISOString())

  // Ajouter les bookings aux événements occupés
  const busySlots = busyEvents
    .filter((e) => e.start && e.end)
    .map((e) => ({
      start: new Date(e.start!).getTime(),
      end: new Date(e.end!).getTime(),
    }))

  if (existingBookings) {
    existingBookings.forEach((booking) => {
      const start = new Date(booking.scheduled_at).getTime()
      const end = start + booking.duration_minutes * 60 * 1000
      busySlots.push({ start, end })
    })
  }

  // Générer les créneaux disponibles (9h-18h, tranches de 30min)
  const slots: { start: string; end: string; available: boolean }[] = []
  const slotDuration = 30 * 60 * 1000 // 30 minutes en ms
  const workdayStart = new Date(targetDate)
  workdayStart.setHours(9, 0, 0, 0)
  const workdayEnd = new Date(targetDate)
  workdayEnd.setHours(18, 0, 0, 0)

  let currentSlotStart = workdayStart.getTime()

  while (currentSlotStart < workdayEnd.getTime()) {
    const currentSlotEnd = currentSlotStart + slotDuration

    // Vérifier si le créneau chevauche un événement occupé
    const isOccupied = busySlots.some((busy) => {
      return (
        (currentSlotStart >= busy.start && currentSlotStart < busy.end) ||
        (currentSlotEnd > busy.start && currentSlotEnd <= busy.end) ||
        (currentSlotStart <= busy.start && currentSlotEnd >= busy.end)
      )
    })

    // Vérifier si le créneau est dans le passé
    const isPast = currentSlotStart < Date.now()

    slots.push({
      start: new Date(currentSlotStart).toISOString(),
      end: new Date(currentSlotEnd).toISOString(),
      available: !isOccupied && !isPast,
    })

    currentSlotStart = currentSlotEnd
  }

  return apiSuccess({
    slots,
    date: dateStr,
    timezone: 'Europe/Paris',
  })
}
