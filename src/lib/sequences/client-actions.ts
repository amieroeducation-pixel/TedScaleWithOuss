'use client'
// IMPORTANT : Ce fichier contient des APIs navigateur (window, navigator).
// Ne jamais importer dans des Route Handlers ou Edge Functions.

/**
 * Ouvre WhatsApp Web avec le numéro normalisé et le message pré-rempli.
 * Normalisation : 0612345678 -> 33612345678 (France)
 */
export function openWhatsApp(phone: string, message: string): void {
  const phoneClean = phone
    .replace(/\s/g, '')
    .replace(/^\+/, '')      // supprimer + initial si E.164
    .replace(/^0/, '33')     // normaliser France 06/07 -> 33
    .replace(/[^0-9]/g, '')
  const encoded = encodeURIComponent(message)
  window.open(`https://wa.me/${phoneClean}?text=${encoded}`, '_blank')
}

/**
 * Ouvre le profil LinkedIn et copie le template InMail dans le presse-papier.
 * Si linkedinUrl est null, recherche par nom.
 */
export async function openLinkedIn(args: {
  linkedinUrl: string | null
  prospectName: string
  inmailTemplate: string
  onCopied?: () => void
}): Promise<void> {
  const { linkedinUrl, prospectName, inmailTemplate, onCopied } = args
  const url = linkedinUrl
    ?? `https://linkedin.com/search/results/people/?keywords=${encodeURIComponent(prospectName)}`
  window.open(url, '_blank')
  try {
    await navigator.clipboard.writeText(inmailTemplate)
    onCopied?.()
  } catch {
    // Clipboard API silencieusement ignorée si non disponible (ex: non-HTTPS)
    // Sur localhost, elle fonctionne normalement (Pitfall 7 RESEARCH)
  }
}
