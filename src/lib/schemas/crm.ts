import { z } from 'zod'

// Prospect schemas
export const createProspectSchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().min(10).optional(),
  profession: z.string().optional(),
  company: z.string().optional(),
  city: z.string().optional(),
  source: z.enum(['tns', 'chefs_entreprise', 'particuliers', 'recommandation', 'linkedin', 'autre']),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
})

export const updateProspectSchema = z.object({
  full_name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  profession: z.string().optional(),
  company: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  next_action_date: z.string().optional(),
})

export const moveProspectSchema = z.object({
  prospect_id: z.string().uuid(),
  from_stage: z.enum(['a_contacter', 'rdv1', 'rdv2', 'rdv3', 'converti', 'perdu']),
  to_stage: z.enum(['a_contacter', 'rdv1', 'rdv2', 'rdv3', 'converti', 'perdu']),
})

// Interaction schemas
export const createInteractionSchema = z.object({
  prospect_id: z.string().uuid(),
  type: z.enum(['appel', 'rdv1', 'rdv2', 'rdv3', 'email', 'sms', 'whatsapp', 'linkedin', 'interpro', 'autre']),
  occurred_at: z.string().datetime(),
  duration_min: z.number().int().positive().optional(),
  notes: z.string().optional(),
  is_honored: z.boolean().optional(),
})

// TypeScript types (inferred)
export type CreateProspectInput = z.infer<typeof createProspectSchema>
export type UpdateProspectInput = z.infer<typeof updateProspectSchema>
export type MoveProspectInput = z.infer<typeof moveProspectSchema>
export type CreateInteractionInput = z.infer<typeof createInteractionSchema>
