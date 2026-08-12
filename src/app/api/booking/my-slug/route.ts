import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/api'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * GET /api/booking/my-slug
 * Récupère le booking_slug de l'utilisateur connecté
 * (endpoint authentifié pour que l'user connaisse son slug)
 */
export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return apiError('Non authentifié', 401)
  }

  // Récupérer le booking_slug du user
  const { data: settings, error } = await supabase
    .from('user_settings')
    .select('booking_slug')
    .eq('id', user.id)
    .single()

  if (error || !settings) {
    return apiError('Settings introuvables', 404)
  }

  if (!settings.booking_slug) {
    return apiError('Booking slug non généré', 404)
  }

  return apiSuccess({
    slug: settings.booking_slug,
    bookingUrl: `${request.nextUrl.origin}/booking/${settings.booking_slug}`,
  })
}
