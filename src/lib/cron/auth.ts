import { NextRequest } from 'next/server'
import { apiError } from '@/lib/api'

/**
 * Verifie le header x-cron-secret.
 * Retourne une NextResponse 401/500 si invalide, null si OK.
 * En dev sans CRON_SECRET configure: autorise (mode dev ouvert).
 * En production sans CRON_SECRET configure: bloque (erreur 500).
 */
export function verifyCronSecret(req: NextRequest): ReturnType<typeof apiError> | null {
  const expected = process.env.CRON_SECRET
  if (!expected) {
    if (process.env.NODE_ENV === 'development') return null
    return apiError('CRON_SECRET not configured', 500)
  }
  const provided = req.headers.get('x-cron-secret')
  if (provided !== expected) {
    return apiError('Cron unauthorized', 401)
  }
  return null // OK -- continuer
}
