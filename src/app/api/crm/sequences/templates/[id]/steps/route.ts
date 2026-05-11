import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

const CHANNELS = ['whatsapp', 'email', 'sms', 'call_reminder', 'linkedin'] as const

const PostStepSchema = z.object({
  channel: z.enum(CHANNELS),
  delay_days: z.number().int().min(0).max(365),
  message_template: z.string().optional(),
  step_order: z.number().int().min(1),
})

async function verifyTemplateOwnership(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  templateId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('sequence_templates')
    .select('id')
    .eq('id', templateId)
    .eq('user_id', userId)
    .single()
  return !!data
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const isOwner = await verifyTemplateOwnership(supabase, id, user.id)
  if (!isOwner) return apiError('Template non trouvé', 404)

  const { data: steps, error } = await supabase
    .from('sequence_template_steps')
    .select('*')
    .eq('template_id', id)
    .order('step_order', { ascending: true })

  if (error) return apiError(error.message)
  return apiSuccess({ steps: steps ?? [] })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const isOwner = await verifyTemplateOwnership(supabase, id, user.id)
  if (!isOwner) return apiError('Template non trouvé', 404)

  const body = await req.json()
  const parsed = PostStepSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400)

  const { data, error } = await supabase
    .from('sequence_template_steps')
    .insert({ template_id: id, ...parsed.data })
    .select()
    .single()

  if (error) {
    // Violation contrainte UNIQUE (template_id, step_order)
    if (error.code === '23505') {
      return apiError('step_order déjà utilisé pour ce template', 409)
    }
    return apiError(error.message)
  }

  return apiSuccess({ step: data }, 201)
}
