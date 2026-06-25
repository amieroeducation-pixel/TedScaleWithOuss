/**
 * Utilitaires de validation et normalisation des numéros de téléphone français.
 */

/**
 * Normalise un numéro de téléphone français vers le format 0X XX XX XX XX.
 * Gère les formats +33, 0033, et les formats avec/sans espaces/points/tirets.
 * Retourne null si le numéro n'est pas exploitable.
 */
export function normalizePhoneFR(raw: string | null | undefined): string | null {
  if (!raw) return null

  // Supprimer tous les caractères non numériques sauf le +
  let cleaned = raw.replace(/[^\d+]/g, '')

  // Gérer le préfixe international +33 ou 0033
  if (cleaned.startsWith('+33')) {
    cleaned = '0' + cleaned.slice(3)
  } else if (cleaned.startsWith('0033')) {
    cleaned = '0' + cleaned.slice(4)
  }

  // Vérifier la longueur (10 chiffres pour un numéro français)
  if (cleaned.length !== 10) return null

  // Vérifier que ça commence par 0
  if (!cleaned.startsWith('0')) return null

  // Vérifier que le second chiffre est valide (1-9 pour fixe/mobile)
  const secondDigit = cleaned[1]
  if (!secondDigit || secondDigit === '0') return null

  // Formater en XX XX XX XX XX
  return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5')
}

/**
 * Vérifie si un numéro (déjà normalisé ou brut) est un mobile français (06 ou 07).
 */
export function isMobilePhone(phone: string | null | undefined): boolean {
  const normalized = normalizePhoneFR(phone)
  if (!normalized) return false
  return normalized.startsWith('06') || normalized.startsWith('07')
}

/**
 * Vérifie si un numéro est un numéro français valide (fixe ou mobile).
 */
export function isValidPhoneFR(phone: string | null | undefined): boolean {
  return normalizePhoneFR(phone) !== null
}
