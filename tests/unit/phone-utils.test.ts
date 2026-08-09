import { describe, it, expect } from 'vitest'
import { normalizePhoneFR, isMobilePhone, isValidPhoneFR } from '@/lib/phone-utils'

describe('normalizePhoneFR', () => {
  it('normalizes a standard 10-digit number', () => {
    expect(normalizePhoneFR('0612345678')).toBe('06 12 34 56 78')
  })

  it('handles +33 prefix', () => {
    expect(normalizePhoneFR('+33612345678')).toBe('06 12 34 56 78')
  })

  it('handles 0033 prefix', () => {
    expect(normalizePhoneFR('0033612345678')).toBe('06 12 34 56 78')
  })

  it('strips spaces, dots, and dashes', () => {
    expect(normalizePhoneFR('06 12 34 56 78')).toBe('06 12 34 56 78')
    expect(normalizePhoneFR('06.12.34.56.78')).toBe('06 12 34 56 78')
    expect(normalizePhoneFR('06-12-34-56-78')).toBe('06 12 34 56 78')
  })

  it('returns null for too short numbers', () => {
    expect(normalizePhoneFR('061234')).toBeNull()
  })

  it('returns null for too long numbers', () => {
    expect(normalizePhoneFR('06123456789999')).toBeNull()
  })

  it('returns null for null/undefined/empty', () => {
    expect(normalizePhoneFR(null)).toBeNull()
    expect(normalizePhoneFR(undefined)).toBeNull()
    expect(normalizePhoneFR('')).toBeNull()
  })

  it('returns null for numbers starting with 00', () => {
    expect(normalizePhoneFR('0012345678')).toBeNull()
  })

  it('normalizes landline numbers', () => {
    expect(normalizePhoneFR('0145678901')).toBe('01 45 67 89 01')
  })
})

describe('isMobilePhone', () => {
  it('returns true for 06 numbers', () => {
    expect(isMobilePhone('0612345678')).toBe(true)
  })

  it('returns true for 07 numbers', () => {
    expect(isMobilePhone('0712345678')).toBe(true)
  })

  it('returns false for landline 01', () => {
    expect(isMobilePhone('0145678901')).toBe(false)
  })

  it('returns false for invalid input', () => {
    expect(isMobilePhone(null)).toBe(false)
    expect(isMobilePhone('')).toBe(false)
  })
})

describe('isValidPhoneFR', () => {
  it('returns true for valid numbers', () => {
    expect(isValidPhoneFR('0612345678')).toBe(true)
    expect(isValidPhoneFR('0145678901')).toBe(true)
  })

  it('returns false for invalid numbers', () => {
    expect(isValidPhoneFR('123')).toBe(false)
    expect(isValidPhoneFR(null)).toBe(false)
  })
})
