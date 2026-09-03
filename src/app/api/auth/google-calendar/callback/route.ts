import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const state = searchParams.get('state')
  const origin = new URL(request.url).origin
  const settingsUrl = `${origin}/settings?tab=integrations`

  if (error || !code || !state) {
    return NextResponse.redirect(`${settingsUrl}&calendar_error=1`)
  }

  // CSRF protection: verify state matches current user
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${origin}/login`)

  const expectedState = Buffer.from(user.id).toString('base64url')
  if (state !== expectedState) {
    // State mismatch = CSRF attack attempt
    return NextResponse.redirect(`${settingsUrl}&calendar_error=csrf`)
  }

  const redirectUri = `${origin}/api/auth/google-calendar/callback`

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${settingsUrl}&calendar_error=1`)
  }

  const tokens = await tokenRes.json() as {
    access_token: string
    refresh_token?: string
    expires_in: number
  }

  await supabase.from('user_settings').upsert({
    id: user.id,
    google_calendar_refresh_token: tokens.refresh_token ?? null,
    google_calendar_access_token: tokens.access_token,
    google_calendar_token_expiry: Date.now() + tokens.expires_in * 1000,
    google_calendar_connected_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })

  return NextResponse.redirect(`${settingsUrl}&calendar_connected=1`)
}
