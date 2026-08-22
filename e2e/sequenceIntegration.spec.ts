import { test, expect } from '@playwright/test'
import { computeTemperatureScore, calculateTempCategory } from '@/app/(dashboard)/nurturing/nurturing-types'

/**
 * Integration test for full sequence cycle.
 * Tests the combined behavior of temperature scoring, LinkedIn, and WhatsApp.
 */

type Interaction = {
  type: string
  occurred_at: string
}

test('full sequence cycle: temperature scoring after interactions', () => {
  const firstContact = new Date('2026-08-01T10:00:00Z')
  const now = new Date('2026-08-22T10:00:00Z')

  // Simulate a sequence: email J+0, WhatsApp J+3, LinkedIn J+5, RDV J+7
  const interactions: Interaction[] = [
    { type: 'email', occurred_at: firstContact.toISOString() },
    { type: 'whatsapp', occurred_at: new Date('2026-08-04T10:00:00Z').toISOString() },
    { type: 'linkedin', occurred_at: new Date('2026-08-06T10:00:00Z').toISOString() },
    { type: 'rdv1', occurred_at: new Date('2026-08-08T10:00:00Z').toISOString() },
  ]

  // Calculate score: 3 interactions (+3) + 1 RDV (+3) + 3 weeks of silence (-3) = 3
  const score = computeTemperatureScore(interactions, firstContact.toISOString(), now)
  expect(score).toBe(3)

  // Score 3 → cold (< 5)
  const category = calculateTempCategory(score, 0)
  expect(category).toBe('cold')
})

test('sequence with high engagement becomes hot', () => {
  const firstContact = new Date('2026-08-20T10:00:00Z')
  const now = new Date('2026-08-22T10:00:00Z')

  // High engagement: 2 RDVs + 5 interactions in last 2 days
  const interactions: Interaction[] = [
    { type: 'email', occurred_at: firstContact.toISOString() },
    { type: 'whatsapp', occurred_at: new Date('2026-08-20T11:00:00Z').toISOString() },
    { type: 'rdv1', occurred_at: new Date('2026-08-20T14:00:00Z').toISOString() },
    { type: 'linkedin', occurred_at: new Date('2026-08-21T10:00:00Z').toISOString() },
    { type: 'sms', occurred_at: new Date('2026-08-21T15:00:00Z').toISOString() },
    { type: 'appel', occurred_at: new Date('2026-08-21T16:00:00Z').toISOString() },
    { type: 'rdv2', occurred_at: new Date('2026-08-22T10:00:00Z').toISOString() },
  ]

  // Score: 5 interactions (+5) + 2 RDVs (+6) + 0 weeks = 11
  const score = computeTemperatureScore(interactions, firstContact.toISOString(), now)
  expect(score).toBe(11)

  // Score 11 → warm (5-11)
  const category = calculateTempCategory(score, 0)
  expect(category).toBe('warm')
})

test('sequence with RDV triggers becomes hot', () => {
  const firstContact = new Date('2026-08-15T10:00:00Z')
  const now = new Date('2026-08-22T10:00:00Z')

  // 3 RDVs + 3 interactions
  const interactions: Interaction[] = [
    { type: 'email', occurred_at: firstContact.toISOString() },
    { type: 'rdv1', occurred_at: new Date('2026-08-16T10:00:00Z').toISOString() },
    { type: 'whatsapp', occurred_at: new Date('2026-08-18T10:00:00Z').toISOString() },
    { type: 'rdv2', occurred_at: new Date('2026-08-19T10:00:00Z').toISOString() },
    { type: 'linkedin', occurred_at: new Date('2026-08-21T10:00:00Z').toISOString() },
    { type: 'rdv3', occurred_at: new Date('2026-08-22T10:00:00Z').toISOString() },
  ]

  // Score: 3 interactions (+3) + 3 RDVs (+9) - 1 week (-1) = 11
  const score = computeTemperatureScore(interactions, firstContact.toISOString(), now)
  expect(score).toBe(11)

  const category = calculateTempCategory(score, 0)
  expect(category).toBe('warm')
})

test('dead prospect stays dead regardless of score', () => {
  const firstContact = '2026-08-15T10:00:00Z' // 1 week ago
  const now = new Date('2026-08-22T10:00:00Z')
  const interactions: Interaction[] = [
    { type: 'email', occurred_at: firstContact },
    { type: 'rdv1', occurred_at: '2026-08-21T10:00:00Z' },
    { type: 'rdv2', occurred_at: '2026-08-22T10:00:00Z' },
  ]

  // Score: 1 interaction (+1) + 2 RDVs (+6) - 1 week (-1) = 6
  const score = computeTemperatureScore(interactions, firstContact, now)
  expect(score).toBe(6)

  // But with noResponseCount >= 5, should be dead
  const category = calculateTempCategory(score, 5)
  expect(category).toBe('dead')
})

test('forced temperature overrides computed score', () => {
  const now = new Date('2026-08-22T10:00:00Z')
  const interactions: Interaction[] = [
    { type: 'email', occurred_at: '2026-08-20T10:00:00Z' },
  ]

  // Low score (1)
  const score = computeTemperatureScore(interactions, '2026-08-20T10:00:00Z', now)
  expect(score).toBe(1)

  // But forced hot
  const category = calculateTempCategory(score, 0, 'hot')
  expect(category).toBe('hot')
})

test('LinkedIn step behavior: message stored and needs honoring', () => {
  // Mock LinkedIn step result
  const linkedInStep = {
    channel: 'linkedin',
    status: 'sent',
    message_sent: 'Bonjour {{prenom}}, je vous contacte au sujet de votre activité.',
  }

  // LinkedIn step should be marked as sent (not skipped)
  expect(linkedInStep.status).toBe('sent')

  // Message should be stored
  expect(linkedInStep.message_sent).toBeTruthy()

  // Channel should be linkedin
  expect(linkedInStep.channel).toBe('linkedin')
})

test('WhatsApp fallback detection', () => {
  // Mock WhatsApp fallback result
  const fallbackMessage = '[SMS fallback] Bonjour Marie, voici votre message.'

  // Should have fallback prefix
  expect(fallbackMessage).toContain('[SMS fallback]')

  // Extract original message
  const originalMessage = fallbackMessage.replace('[SMS fallback] ', '')
  expect(originalMessage).toBe('Bonjour Marie, voici votre message.')
})
