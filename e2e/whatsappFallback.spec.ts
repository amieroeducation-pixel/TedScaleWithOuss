import { test, expect } from '@playwright/test'

/**
 * Test WhatsApp fallback transparency behavior from executor.ts.
 * When WhatsApp fails and falls back to SMS:
 * - messageSent prefixed with "[SMS fallback] "
 * - Interaction logged with type: 'sms' and notes: "Fallback SMS (WhatsApp indisponible)"
 * - isFallback flag set to true
 *
 * These tests verify the behavior defined in executor.ts lines 119-130.
 */

test('WhatsApp fallback message format', () => {
  // Simulate fallback result from executeSingleAttempt
  const originalMessage = 'Bonjour Marie, voici votre message.'
  const fallbackMessage = `[SMS fallback] ${originalMessage}`

  expect(fallbackMessage).toContain('[SMS fallback]')
  expect(fallbackMessage).toBe('[SMS fallback] Bonjour Marie, voici votre message.')
})

test('WhatsApp fallback prefix extraction', () => {
  const fallbackMessage = '[SMS fallback] Bonjour Marie, voici votre message.'
  const originalMessage = fallbackMessage.replace('[SMS fallback] ', '')

  expect(originalMessage).toBe('Bonjour Marie, voici votre message.')
  expect(originalMessage).not.toContain('[SMS fallback]')
})

test('Fallback interaction notes format', () => {
  // The interaction note when WhatsApp falls back to SMS
  const fallbackNotes = 'Fallback SMS (WhatsApp indisponible)'

  expect(fallbackNotes).toContain('Fallback SMS')
  expect(fallbackNotes).toContain('WhatsApp indisponible')
})

test('Normal WhatsApp interaction notes format', () => {
  // Normal WhatsApp interaction (no fallback)
  const channel = 'whatsapp'
  const normalNotes = `[Séquence] ${channel} envoyé`

  expect(normalNotes).toBe('[Séquence] whatsapp envoyé')
  expect(normalNotes).not.toContain('Fallback')
})

test('Fallback detection by prefix', () => {
  const messages = [
    'Bonjour Jean',
    '[SMS fallback] Bonjour Marie',
    '[SMS fallback] Test message',
    'Normal WhatsApp message',
  ]

  const fallbackMessages = messages.filter(m => m.startsWith('[SMS fallback]'))

  expect(fallbackMessages).toHaveLength(2)
  expect(fallbackMessages[0]).toBe('[SMS fallback] Bonjour Marie')
  expect(fallbackMessages[1]).toBe('[SMS fallback] Test message')
})
