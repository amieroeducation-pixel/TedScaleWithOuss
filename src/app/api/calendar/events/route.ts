import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

type TokenRow = {
  google_calendar_refresh_token: string | null
  google_calendar_access_token: string | null
  google_calendar_token_expiry: number | null
}

async function getValidToken(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, userId: string, row: TokenRow): Promise<string | null> {
  const { google_calendar_access_token, google_calendar_refresh_token, google_calendar_token_expiry } = row

  if (google_calendar_access_token && google_calendar_token_expiry && Date.now() < google_calendar_token_expiry - 60_000) {
    return google_calendar_access_token
  }

  if (!google_calendar_refresh_token) return null

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: google_calendar_refresh_token,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) return null

  const tokens = await res.json() as { access_token: string; expires_in: number }

  await supabase.from('user_settings').update({
    google_calendar_access_token: tokens.access_token,
    google_calendar_token_expiry: Date.now() + tokens.expires_in * 1000,
    updated_at: new Date().toISOString(),
  }).eq('id', userId)

  return tokens.access_token
}

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { data: settings } = await supabase
    .from('user_settings')
    .select('google_calendar_refresh_token, google_calendar_access_token, google_calendar_token_expiry')
    .eq('id', user.id)
    .single()

  if (!settings?.google_calendar_refresh_token) {
    return apiSuccess({ events: [], connected: false })
  }

  const accessToken = await getValidToken(supabase, user.id, settings as TokenRow)
  if (!accessToken) return apiError('Token Google Calendar invalide — reconnectez-vous depuis les Paramètres', 401)

  const { searchParams } = new URL(request.url)
  const now = new Date()
  const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - dayOfWeek)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  const timeMin = searchParams.get('start') ?? monday.toISOString()
  const timeMax = searchParams.get('end') ?? sunday.toISOString()

  const calRes = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events?' +
    new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '100',
    }),
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!calRes.ok) {
    const err = await calRes.json().catch(() => ({}))
    return apiError((err as { error?: { message?: string } }).error?.message ?? 'Erreur Google Calendar API', 502)
  }

  const calData = await calRes.json() as { items?: Record<string, unknown>[] }

  const events = (calData.items ?? []).map((e: Record<string, unknown>) => {
    const start = e.start as { dateTime?: string; date?: string } | undefined
    const end = e.end as { dateTime?: string; date?: string } | undefined
    return {
      id: e.id as string,
      title: (e.summary as string | undefined) ?? '(Sans titre)',
      start: start?.dateTime ?? start?.date ?? null,
      end: end?.dateTime ?? end?.date ?? null,
      allDay: !start?.dateTime,
      location: (e.location as string | undefined) ?? null,
      description: (e.description as string | undefined) ?? null,
    }
  })

  return apiSuccess({ events, connected: true })
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { data: settings } = await supabase
    .from('user_settings')
    .select('google_calendar_refresh_token, google_calendar_access_token, google_calendar_token_expiry')
    .eq('id', user.id)
    .single()

  if (!settings?.google_calendar_refresh_token) {
    return apiError('Google Calendar non connecté', 401)
  }

  const accessToken = await getValidToken(supabase, user.id, settings as TokenRow)
  if (!accessToken) return apiError('Token Google Calendar invalide — reconnectez-vous depuis les Paramètres', 401)

  const body = await request.json() as {
    title: string
    start: string
    end: string
    allDay?: boolean
    location?: string
    description?: string
  }

  if (!body.title || !body.start || !body.end) {
    return apiError('Champs requis manquants : title, start, end', 400)
  }

  const eventPayload = body.allDay
    ? {
        summary: body.title,
        location: body.location ?? undefined,
        description: body.description ?? undefined,
        start: { date: body.start.split('T')[0] },
        end: { date: body.end.split('T')[0] },
      }
    : {
        summary: body.title,
        location: body.location ?? undefined,
        description: body.description ?? undefined,
        start: { dateTime: body.start, timeZone: 'Europe/Paris' },
        end: { dateTime: body.end, timeZone: 'Europe/Paris' },
      }

  const createRes = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventPayload),
    }
  )

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}))
    return apiError((err as { error?: { message?: string } }).error?.message ?? 'Erreur création événement', 502)
  }

  const created = await createRes.json() as Record<string, unknown>
  const startObj = created.start as { dateTime?: string; date?: string } | undefined
  const endObj = created.end as { dateTime?: string; date?: string } | undefined

  return apiSuccess({
    event: {
      id: created.id as string,
      title: (created.summary as string | undefined) ?? body.title,
      start: startObj?.dateTime ?? startObj?.date ?? body.start,
      end: endObj?.dateTime ?? endObj?.date ?? body.end,
      allDay: !startObj?.dateTime,
      location: (created.location as string | undefined) ?? null,
      description: (created.description as string | undefined) ?? null,
    }
  })
}
