import { describe, test, expect } from 'vitest'
import {
  createProspectSchema,
  updateProspectSchema,
  moveProspectSchema,
  createInteractionSchema,
  type CreateProspectInput,
  type UpdateProspectInput,
  type MoveProspectInput,
  type CreateInteractionInput,
} from '@/lib/schemas/crm'

describe('CRM Schemas', () => {
  describe('createProspectSchema', () => {
    test('validates valid prospect data', () => {
      const validData = {
        full_name: 'Jean Dupont',
        email: 'jean.dupont@example.com',
        phone: '0612345678',
        profession: 'Médecin',
        company: 'Cabinet Medical',
        city: 'Paris',
        source: 'tns' as const,
        tags: ['TNS', 'Médecin'],
        notes: 'Prospect intéressant',
      }

      const result = createProspectSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.full_name).toBe('Jean Dupont')
        expect(result.data.source).toBe('tns')
      }
    })

    test('fails if full_name is too short', () => {
      const invalidData = {
        full_name: 'J',
        source: 'tns' as const,
      }

      const result = createProspectSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0)
      }
    })

    test('fails if email is invalid', () => {
      const invalidData = {
        full_name: 'Jean Dupont',
        email: 'not-an-email',
        source: 'tns' as const,
      }

      const result = createProspectSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    test('accepts optional fields as undefined', () => {
      const minimalData = {
        full_name: 'Jean Dupont',
        source: 'tns' as const,
      }

      const result = createProspectSchema.safeParse(minimalData)
      expect(result.success).toBe(true)
    })

    test('validates source enum correctly', () => {
      const validSources = ['tns', 'chefs_entreprise', 'particuliers', 'recommandation', 'linkedin', 'autre']

      validSources.forEach(source => {
        const data = {
          full_name: 'Test',
          source,
        }
        const result = createProspectSchema.safeParse(data)
        expect(result.success).toBe(true)
      })

      const invalidSource = {
        full_name: 'Test',
        source: 'invalid_source',
      }
      const result = createProspectSchema.safeParse(invalidSource)
      expect(result.success).toBe(false)
    })
  })

  describe('updateProspectSchema', () => {
    test('validates partial update data', () => {
      const updateData = {
        full_name: 'Jean Dupont Updated',
        email: 'jean.new@example.com',
      }

      const result = updateProspectSchema.safeParse(updateData)
      expect(result.success).toBe(true)
    })

    test('accepts all fields as optional', () => {
      const emptyUpdate = {}
      const result = updateProspectSchema.safeParse(emptyUpdate)
      expect(result.success).toBe(true)
    })

    test('validates email format when provided', () => {
      const invalidEmail = {
        email: 'not-valid',
      }
      const result = updateProspectSchema.safeParse(invalidEmail)
      expect(result.success).toBe(false)
    })

    test('validates full_name min length when provided', () => {
      const invalidName = {
        full_name: 'J',
      }
      const result = updateProspectSchema.safeParse(invalidName)
      expect(result.success).toBe(false)
    })
  })

  describe('moveProspectSchema', () => {
    test('validates valid move data', () => {
      const validMove = {
        prospect_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        from_stage: 'a_contacter' as const,
        to_stage: 'rdv1' as const,
      }

      const result = moveProspectSchema.safeParse(validMove)
      expect(result.success).toBe(true)
    })

    test('fails if prospect_id is not a valid UUID', () => {
      const invalidUuid = {
        prospect_id: 'not-a-uuid',
        from_stage: 'a_contacter' as const,
        to_stage: 'rdv1' as const,
      }

      const result = moveProspectSchema.safeParse(invalidUuid)
      expect(result.success).toBe(false)
    })

    test('validates stage enum values', () => {
      const validStages = ['a_contacter', 'rdv1', 'rdv2', 'rdv3', 'converti', 'perdu']

      validStages.forEach(stage => {
        const data = {
          prospect_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          from_stage: 'a_contacter' as const,
          to_stage: stage as any,
        }
        const result = moveProspectSchema.safeParse(data)
        expect(result.success).toBe(true)
      })

      const invalidStage = {
        prospect_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        from_stage: 'a_contacter' as const,
        to_stage: 'invalid_stage',
      }
      const result = moveProspectSchema.safeParse(invalidStage)
      expect(result.success).toBe(false)
    })
  })

  describe('createInteractionSchema', () => {
    test('validates valid interaction data', () => {
      const validInteraction = {
        prospect_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        type: 'appel' as const,
        occurred_at: '2026-08-17T10:00:00.000Z',
        duration_min: 30,
        notes: 'Discussion about PER',
        is_honored: true,
      }

      const result = createInteractionSchema.safeParse(validInteraction)
      expect(result.success).toBe(true)
    })

    test('validates interaction type enum', () => {
      const validTypes = ['appel', 'rdv1', 'rdv2', 'rdv3', 'email', 'sms', 'whatsapp', 'linkedin', 'interpro', 'autre']

      validTypes.forEach(type => {
        const data = {
          prospect_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          type,
          occurred_at: '2026-08-17T10:00:00.000Z',
        }
        const result = createInteractionSchema.safeParse(data)
        expect(result.success).toBe(true)
      })

      const invalidType = {
        prospect_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        type: 'invalid_type',
        occurred_at: '2026-08-17T10:00:00.000Z',
      }
      const result = createInteractionSchema.safeParse(invalidType)
      expect(result.success).toBe(false)
    })

    test('validates datetime format for occurred_at', () => {
      const invalidDate = {
        prospect_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        type: 'appel' as const,
        occurred_at: 'not-a-date',
      }

      const result = createInteractionSchema.safeParse(invalidDate)
      expect(result.success).toBe(false)
    })

    test('validates duration_min is positive integer when provided', () => {
      const negativeDuration = {
        prospect_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        type: 'appel' as const,
        occurred_at: '2026-08-17T10:00:00.000Z',
        duration_min: -10,
      }

      const result = createInteractionSchema.safeParse(negativeDuration)
      expect(result.success).toBe(false)
    })

    test('accepts optional fields as undefined', () => {
      const minimalData = {
        prospect_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        type: 'email' as const,
        occurred_at: '2026-08-17T10:00:00.000Z',
      }

      const result = createInteractionSchema.safeParse(minimalData)
      expect(result.success).toBe(true)
    })
  })
})
