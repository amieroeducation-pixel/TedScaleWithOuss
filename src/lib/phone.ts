import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js'

/**
 * Normalise un numéro de téléphone français au format E.164
 * @param raw - Numéro brut (ex: "06 12 34 56 78", "0612345678")
 * @returns Format E.164 (+33612345678) ou null si invalide
 */
export function normalizePhoneFr(raw: string): string | null {
  if (!raw || raw.trim() === '') return null

  try {
    const parsed = parsePhoneNumber(raw, 'FR')
    if (!parsed || !parsed.isValid()) return null
    return parsed.format('E.164') // +33612345678
  } catch {
    return null
  }
}

/**
 * Vérifie si un numéro est un mobile français (06/07)
 * @param phone - Numéro au format E.164 ou national
 * @returns true si mobile, false si fixe ou invalide
 */
export function isMobilePhoneFr(phone: string): boolean {
  try {
    const parsed = parsePhoneNumber(phone, 'FR')
    return parsed?.getType() === 'MOBILE'
  } catch {
    return false
  }
}

/**
 * Formate un numéro E.164 pour affichage national
 * @param e164 - Numéro format E.164 (+33612345678)
 * @returns Format national ("06 12 34 56 78") ou chaîne originale si erreur
 */
export function formatPhoneDisplay(e164: string): string {
  try {
    const parsed = parsePhoneNumber(e164)
    return parsed?.formatNational() || e164
  } catch {
    return e164
  }
}

/**
 * Valide un numéro de téléphone français
 * @param phone - Numéro à valider
 * @returns true si valide, false sinon
 */
export function isValidPhoneFr(phone: string): boolean {
  return isValidPhoneNumber(phone, 'FR')
}
