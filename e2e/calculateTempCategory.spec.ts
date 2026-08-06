import { test, expect } from '@playwright/test'

function calculateTempCategory(
  lastContactDays: number | null,
  hasActiveSequence: boolean,
  noResponseCount: number,
  pressureScore: string | null
): 'hot' | 'warm' | 'cold' | 'dead' {
  if (pressureScore === 'a_stopper' || noResponseCount >= 5) return 'dead'
  if (lastContactDays === null) return 'cold'
  if (lastContactDays <= 3 || hasActiveSequence) return 'hot'
  if (lastContactDays <= 7) return 'warm'
  return 'cold'
}

test('dead si nb_relances >= 5', () => {
  expect(calculateTempCategory(2, false, 5, null)).toBe('dead')
  expect(calculateTempCategory(1, true, 6, null)).toBe('dead')
})

test('dead si pressure_score = a_stopper', () => {
  expect(calculateTempCategory(1, false, 0, 'a_stopper')).toBe('dead')
  expect(calculateTempCategory(null, false, 0, 'a_stopper')).toBe('dead')
})

test('hot si lastContact <= 3 jours', () => {
  expect(calculateTempCategory(0, false, 0, null)).toBe('hot')
  expect(calculateTempCategory(1, false, 0, null)).toBe('hot')
  expect(calculateTempCategory(3, false, 0, null)).toBe('hot')
})

test('hot si sequence active', () => {
  expect(calculateTempCategory(10, true, 0, null)).toBe('hot')
  expect(calculateTempCategory(30, true, 0, null)).toBe('hot')
})

test('warm si lastContact 4-7 jours', () => {
  expect(calculateTempCategory(4, false, 0, null)).toBe('warm')
  expect(calculateTempCategory(5, false, 0, null)).toBe('warm')
  expect(calculateTempCategory(7, false, 0, null)).toBe('warm')
})

test('cold si lastContact > 7 jours', () => {
  expect(calculateTempCategory(8, false, 0, null)).toBe('cold')
  expect(calculateTempCategory(30, false, 0, null)).toBe('cold')
  expect(calculateTempCategory(100, false, 0, null)).toBe('cold')
})

test('cold si lastContact null', () => {
  expect(calculateTempCategory(null, false, 0, null)).toBe('cold')
  expect(calculateTempCategory(null, false, 2, null)).toBe('cold')
})
