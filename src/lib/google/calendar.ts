import { google } from 'googleapis'

/**
 * Crée un client Google Calendar authentifié avec refresh token
 * @param refreshToken - Token stocké dans user_settings
 * @returns Client Calendar API v3
 */
export function getCalendarClient(refreshToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-calendar/callback`
  )

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  })

  return google.calendar({ version: 'v3', auth: oauth2Client })
}

/**
 * Génère l'URL d'autorisation OAuth Google Calendar
 * @returns URL de redirection consent screen Google
 */
export function getAuthUrl(): string {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-calendar/callback`
  )

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar'],
    prompt: 'consent', // Force refresh token delivery
  })
}

/**
 * Échange le code OAuth contre des tokens
 * @param code - Code reçu dans callback URL
 * @returns Tokens (access_token, refresh_token)
 */
export async function getTokensFromCode(code: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-calendar/callback`
  )

  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}
