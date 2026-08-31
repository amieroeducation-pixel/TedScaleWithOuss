import { describe, it, expect } from 'vitest'
import { normalizePhoneFr, isValidPhoneFr } from '@/lib/phone'

describe('Phone validation for booking API', () => {
  describe('normalizePhoneFr', () => {
    it('normalizes valid French mobile number', () => {
      expect(normalizePhoneFr('06 12 34 56 78')).toBe('+33612345678')
      expect(normalizePhoneFr('0612345678')).toBe('+33612345678')
      expect(normalizePhoneFr('+33 6 12 34 56 78')).toBe('+33612345678')
    })

    it('returns null for invalid numbers', () => {
      expect(normalizePhoneFr('')).toBeNull()
      expect(normalizePhoneFr('invalid')).toBeNull()
      expect(normalizePhoneFr('123')).toBeNull()
    })
  })

  describe('isValidPhoneFr', () => {
    it('validates French phone numbers', () => {
      expect(isValidPhoneFr('06 12 34 56 78')).toBe(true)
      expect(isValidPhoneFr('0612345678')).toBe(true)
      expect(isValidPhoneFr('+33612345678')).toBe(true)
      expect(isValidPhoneFr('01 23 45 67 89')).toBe(true) // Fixed line
    })

    it('rejects invalid phone numbers', () => {
      expect(isValidPhoneFr('123')).toBe(false)
      expect(isValidPhoneFr('invalid')).toBe(false)
      expect(isValidPhoneFr('')).toBe(false)
      expect(isValidPhoneFr('0699999999999')).toBe(false) // Too long
    })
  })
})
