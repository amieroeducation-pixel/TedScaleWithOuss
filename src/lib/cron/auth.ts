import { NextRequest } from 'next/server'
import { apiError } from '@/lib/api'

/**
 * Verifie le header x-cron-secret.
 * Retourne une NextResponse 401 si invalide, null si OK.
 * Si CRON_SECRET n'est pas configure, toujours retourner null (mode dev ouvert).
 */
export function verifyCronSecret(req: NextRequest): ReturnType<typeof apiError> | null {
  const expected = process.env.CRON_SECRET
  if (!expected) return null // Pas de secret configure = dev mode ouvert
  const provided = req.headers.get('x-cron-secret')
  if (provided !== expected) {
    return apiError('Cron unauthorized', 401)
  }
  return null // OK -- continuer
}
