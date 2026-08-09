import { describe, it, expect } from 'vitest'
import { detectCivilite } from '@/lib/civilite'

describe('detectCivilite', () => {
  it('returns Docteur for medical professions', () => {
    expect(detectCivilite('Jean Dupont', 'Médecin généraliste')).toBe('Docteur')
    expect(detectCivilite('Marie Martin', 'Dentiste')).toBe('Docteur')
    expect(detectCivilite('Paul Durand', 'Cardiologue')).toBe('Docteur')
    expect(detectCivilite('Anne Leroy', 'Chirurgien')).toBe('Docteur')
    expect(detectCivilite('Sophie Blanc', 'Psychiatre')).toBe('Docteur')
  })

  it('returns Madame for female first names', () => {
    expect(detectCivilite('Sophie Martin')).toBe('Madame')
    expect(detectCivilite('Marie Dupont')).toBe('Madame')
    expect(detectCivilite('Nathalie Leroy')).toBe('Madame')
    expect(detectCivilite('Camille Renard')).toBe('Madame')
  })

  it('returns Monsieur for male/unknown first names', () => {
    expect(detectCivilite('Jean Dupont')).toBe('Monsieur')
    expect(detectCivilite('Pierre Martin')).toBe('Monsieur')
    expect(detectCivilite('Mohamed Bensaid')).toBe('Monsieur')
  })

  it('handles accented names by normalizing', () => {
    expect(detectCivilite('Hélène Moreau')).toBe('Madame')
    expect(detectCivilite('Amélie Durand')).toBe('Madame')
  })

  it('prioritizes Docteur over gender detection', () => {
    expect(detectCivilite('Sophie Martin', 'Médecin')).toBe('Docteur')
  })
})
