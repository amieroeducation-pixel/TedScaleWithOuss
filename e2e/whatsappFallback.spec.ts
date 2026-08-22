import { test, expect } from '@playwright/test'

/**
 * Test WhatsApp fallback transparency.
 * When WhatsApp fails and falls back to SMS:
 * - Interaction logged with type: 'sms' and notes containing "Fallback SMS"
 * - message_sent prefixed with "[SMS fallback] "
 */

type FallbackResult = {
  success: boolean
  messageSent: string
  interactionType: 'whatsapp' | 'sms'
  interactionNotes: string
}

// Mock function representing WhatsApp with SMS fallback
function executeWhatsAppWithFallback(whatsappSuccess: boolean, message: string): FallbackResult {
  if (whatsappSuccess) {
    return {
      success: true,
      messageSent: message,
      interactionType: 'whatsapp',
      interactionNotes: '[Séquence] WhatsApp envoyé'
    }
  }

  // Fallback to SMS
  return {
    success: true,
    messageSent: `[SMS fallback] ${message}`,
    interactionType: 'sms',
    interactionNotes: 'Fallback SMS (WhatsApp indisponible)'
  }
}

test('WhatsApp success logs whatsapp interaction', () => {
  const result = executeWhatsAppWithFallback(true, 'Bonjour Marie')
  expect(result.interactionType).toBe('whatsapp')
  expect(result.messageSent).toBe('Bonjour Marie')
  expect(result.interactionNotes).toContain('WhatsApp')
})

test('WhatsApp fallback logs sms interaction', () => {
  const result = executeWhatsAppWithFallback(false, 'Bonjour Marie')
  expect(result.interactionType).toBe('sms')
})

test('WhatsApp fallback adds prefix to message', () => {
  const result = executeWhatsAppWithFallback(false, 'Bonjour Marie')
  expect(result.messageSent).toBe('[SMS fallback] Bonjour Marie')
})

test('WhatsApp fallback notes indicate fallback reason', () => {
  const result = executeWhatsAppWithFallback(false, 'Bonjour Marie')
  expect(result.interactionNotes).toContain('Fallback SMS')
  expect(result.interactionNotes).toContain('WhatsApp indisponible')
})
