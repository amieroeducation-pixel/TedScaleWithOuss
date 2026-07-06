import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized, apiNotFound } from '@/lib/api'
import { z } from 'zod'

const updateProspectSchema = z.object({
  full_name: z.string().min(1).optional(),
  email: z.string().email().or(z.literal('')).optional(),
  phone: z.string().optional(),
  profession: z.string().optional(),
  company: z.string().optional(),
  city: z.string().optional(),
  department: z.string().optional(),
  pipeline_stage: z.enum(['a_contacter', 'rdv1', 'rdv2', 'rdv3', 'converti', 'perdu']).optional(),
  source: z.enum(['tns', 'chefs_entreprise', 'particuliers', 'recommandation', 'linkedin', 'autre']).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  last_contact_at: z.string().datetime().optional(),
  temperature: z.enum(['cold', 'warm', 'hot']).optional(),
  engagement_score: z.number().min(0).max(100).optional(),
  last_engagement_at: z.string().datetime().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { id } = await params
  const { data, error } = await supabase
    .from('prospects')
    .select(`*, interactions(*)`)
    .eq('id', id)
    .single()

  if (error || !data) return apiNotFound('Prospect')
  return apiSuccess(data)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { id } = await params
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('Invalid JSON body', 400)
  }

  // Validation Zod
  const parsed = updateProspectSchema.safeParse(body)
  if (!parsed.success) {
    return apiError(parsed.error.issues.map((e) => e.message).join(', '), 400)
  }

  const updateData = parsed.data

  // Récupère stage actuel avant update pour audit trail
  const { data: oldProspect } = await supabase
    .from('prospects')
    .select('pipeline_stage, full_name')
    .eq('id', id)
    .single()

  const { data, error } = await supabase
    .from('prospects')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) return apiError(error.message)
  if (!data) return apiNotFound('Prospect')

  // Audit trail: log interaction si stage change (fire-and-forget)
  if (oldProspect && updateData.pipeline_stage && updateData.pipeline_stage !== oldProspect.pipeline_stage) {
    void supabase.from('interactions').insert({
      user_id: user.id,
      prospect_id: id,
      type: updateData.pipeline_stage,
      occurred_at: new Date().toISOString(),
      notes: `Stage changé: ${oldProspect.pipeline_stage} → ${updateData.pipeline_stage}`,
    })
  }

  return apiSuccess(data)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { id } = await params
  const { error } = await supabase
    .from('prospects')
    .delete()
    .eq('id', id)

  if (error) return apiError(error.message)
  return apiSuccess({ deleted: true })
}
