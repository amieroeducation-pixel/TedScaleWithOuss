import { createSupabaseServerClient } from '@/lib/supabase/server'

export type TokenRow = {
  google_calendar_refresh_token: string | null
  google_calendar_access_token: string | null
  google_calendar_token_expiry: number | null
}

/**
 * Get a valid Google Calendar access token, refreshing if necessary
 * @param supabase - Supabase client instance
 * @param userId - User ID
 * @param row - Token row from user_settings
 * @returns Valid access token or null if unavailable
 */
export async function getValidGoogleToken(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  row: TokenRow
): Promise<string | null> {
  const { google_calendar_access_token, google_calendar_refresh_token, google_calendar_token_expiry } = row

  // Return existing token if still valid (with 60s buffer)
  if (google_calendar_access_token && google_calendar_token_expiry && Date.now() < google_calendar_token_expiry - 60_000) {
    return google_calendar_access_token
  }

  // No refresh token available
  if (!google_calendar_refresh_token) return null

  // Refresh the token
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

  const tokens = (await res.json()) as { access_token: string; expires_in: number }

  // Save the new token
  await supabase
    .from('user_settings')
    .update({
      google_calendar_access_token: tokens.access_token,
      google_calendar_token_expiry: Date.now() + tokens.expires_in * 1000,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  return tokens.access_token
}
