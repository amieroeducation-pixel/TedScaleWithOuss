import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

const PIPELINE_STAGES = ['a_contacter', 'rdv1', 'rdv2', 'rdv3', 'converti', 'perdu'] as const

const PatchTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  pipeline_stage: z.enum(PIPELINE_STAGES).nullable().optional(),
  auto_trigger: z.boolean().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const body = await req.json()
  const parsed = PatchTemplateSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400)

  // Si auto_trigger = true, vérifier qu'il n'y a pas déjà un template auto sur ce stage
  if (parsed.data.auto_trigger === true) {
    // Récupérer le pipeline_stage : soit fourni dans le patch, soit depuis le template existant
    let stage = parsed.data.pipeline_stage
    if (stage === undefined) {
      const { data: existing } = await supabase
        .from('sequence_templates')
        .select('pipeline_stage')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()
      stage = existing?.pipeline_stage ?? null
    }

    if (stage) {
      const { count } = await supabase
        .from('sequence_templates')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('pipeline_stage', stage)
        .eq('auto_trigger', true)
        .neq('id', id)

      if (count && count > 0) {
        return apiError(
          `Un trigger auto existe déjà pour le stade ${stage}. Désactivez-le d'abord.`,
          409
        )
      }
    }
  }

  const { data, error } = await supabase
    .from('sequence_templates')
    .update(parsed.data)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return apiError(error.message)
  return apiSuccess({ template: data })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { error } = await supabase
    .from('sequence_templates')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return apiError(error.message)
  return apiSuccess({ deleted: true })
}
