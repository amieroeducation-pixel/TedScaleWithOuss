import { test, expect } from '@playwright/test'
import { computeTemperatureScore, calculateTempCategory } from '@/app/(dashboard)/nurturing/nurturing-types'

type Interaction = {
  type: string
  occurred_at: string
}

test('score +1 per interaction (email, sms, whatsapp, linkedin, appel)', () => {
  const interactions: Interaction[] = [
    { type: 'email', occurred_at: '2026-08-20T10:00:00Z' },
    { type: 'sms', occurred_at: '2026-08-20T11:00:00Z' },
    { type: 'whatsapp', occurred_at: '2026-08-20T12:00:00Z' },
    { type: 'linkedin', occurred_at: '2026-08-20T13:00:00Z' },
    { type: 'appel', occurred_at: '2026-08-20T14:00:00Z' },
  ]
  expect(computeTemperatureScore(interactions, '2026-08-20T09:00:00Z')).toBe(5)
})

test('score +3 per RDV (rdv1, rdv2, rdv3)', () => {
  const interactions: Interaction[] = [
    { type: 'rdv1', occurred_at: '2026-08-20T10:00:00Z' },
    { type: 'rdv2', occurred_at: '2026-08-21T10:00:00Z' },
    { type: 'rdv3', occurred_at: '2026-08-22T10:00:00Z' },
  ]
  expect(computeTemperatureScore(interactions, '2026-08-19T09:00:00Z')).toBe(9)
})

test('score -1 per complete week of silence since first contact', () => {
  const now = new Date('2026-08-22T10:00:00Z')
  const firstContact = new Date(now)
  firstContact.setDate(firstContact.getDate() - 21) // 3 weeks ago

  const interactions: Interaction[] = [
    { type: 'email', occurred_at: firstContact.toISOString() },
  ]

  // 1 interaction (+1) + 3 weeks of silence (-3) = -2, but minimum is 0
  const score = computeTemperatureScore(interactions, firstContact.toISOString())
  expect(score).toBe(-2)
})

test('score combines: 3 RDV + 2 emails + 1 week silence', () => {
  const now = new Date('2026-08-22T10:00:00Z')
  const firstContact = new Date(now)
  firstContact.setDate(firstContact.getDate() - 7) // 1 week ago

  const interactions: Interaction[] = [
    { type: 'rdv1', occurred_at: firstContact.toISOString() },
    { type: 'email', occurred_at: firstContact.toISOString() },
    { type: 'rdv2', occurred_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString() },
    { type: 'email', occurred_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString() },
    { type: 'rdv3', occurred_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString() },
  ]

  // 3 RDV (+9) + 2 emails (+2) + 1 week silence (-1) = 10
  const score = computeTemperatureScore(interactions, firstContact.toISOString())
  expect(score).toBe(10)
})

test('no interactions = 0 score', () => {
  expect(computeTemperatureScore([], '2026-08-20T10:00:00Z')).toBe(0)
})

test('no first contact date = 0 weeks of silence', () => {
  const interactions: Interaction[] = [
    { type: 'email', occurred_at: '2026-08-20T10:00:00Z' },
  ]
  expect(computeTemperatureScore(interactions, null)).toBe(1)
})

test('category: score < 5 → cold', () => {
  expect(calculateTempCategory(0, 0)).toBe('cold')
  expect(calculateTempCategory(4, 0)).toBe('cold')
})

test('category: score 5-11 → warm', () => {
  expect(calculateTempCategory(5, 0)).toBe('warm')
  expect(calculateTempCategory(8, 0)).toBe('warm')
  expect(calculateTempCategory(11, 0)).toBe('warm')
})

test('category: score ≥ 12 → hot', () => {
  expect(calculateTempCategory(12, 0)).toBe('hot')
  expect(calculateTempCategory(20, 0)).toBe('hot')
})

test('category: noResponseCount >= 5 → dead', () => {
  expect(calculateTempCategory(20, 5)).toBe('dead')
  expect(calculateTempCategory(20, 6)).toBe('dead')
})

test('category: forcedTemperature overrides', () => {
  expect(calculateTempCategory(0, 0, 'hot')).toBe('hot')
  expect(calculateTempCategory(20, 0, 'cold')).toBe('cold')
  expect(calculateTempCategory(10, 0, 'dead')).toBe('dead')
})
