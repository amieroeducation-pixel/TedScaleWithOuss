import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

const CHANNELS = ['whatsapp', 'email', 'sms', 'call_reminder', 'linkedin'] as const

const PatchStepSchema = z.object({
  channel: z.enum(CHANNELS).optional(),
  delay_days: z.number().int().min(0).max(365).optional(),
  message_template: z.string().optional(),
  // step_order intentionnellement exclu — non exposé comme champ éditable (évite violations UNIQUE)
})

async function verifyStepOwnership(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  stepId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('sequence_template_steps')
    .select('template_id, sequence_templates!inner(user_id)')
    .eq('id', stepId)
    .single()

  if (!data) return false
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any).sequence_templates?.user_id === userId
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  const { stepId } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const isOwner = await verifyStepOwnership(supabase, stepId, user.id)
  if (!isOwner) return apiError('Step non trouvé', 404)

  const body = await req.json()
  const parsed = PatchStepSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400)

  const { data, error } = await supabase
    .from('sequence_template_steps')
    .update(parsed.data)
    .eq('id', stepId)
    .select()
    .single()

  if (error) return apiError(error.message)
  return apiSuccess({ step: data })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  const { stepId } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const isOwner = await verifyStepOwnership(supabase, stepId, user.id)
  if (!isOwner) return apiError('Step non trouvé', 404)

  const { error } = await supabase
    .from('sequence_template_steps')
    .delete()
    .eq('id', stepId)

  if (error) return apiError(error.message)
  return apiSuccess({ deleted: true })
}
