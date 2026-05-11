import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

const PIPELINE_STAGES = ['a_contacter', 'rdv1', 'rdv2', 'rdv3', 'converti', 'perdu'] as const

const PostTemplateSchema = z.object({
  name: z.string().min(1),
  pipeline_stage: z.enum(PIPELINE_STAGES).nullable().optional(),
})

export async function GET(_req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { data: templates, error } = await supabase
    .from('sequence_templates')
    .select('id, name, pipeline_stage, auto_trigger')
    .eq('user_id', user.id)
    .order('name', { ascending: true })

  if (error) return apiError(error.message)
  return apiSuccess({ templates: templates ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const body = await req.json()
  const parsed = PostTemplateSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400)

  const { name, pipeline_stage } = parsed.data

  const { data, error } = await supabase
    .from('sequence_templates')
    .insert({ user_id: user.id, name, pipeline_stage: pipeline_stage ?? null })
    .select()
    .single()

  if (error) return apiError(error.message)
  return apiSuccess({ template: data }, 201)
}
