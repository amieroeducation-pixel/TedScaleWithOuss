import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'
import { z } from 'zod'
import { sendBrevoSms } from '@/lib/sequences/brevo'
import { insertInteraction } from '@/lib/sequences/executor'

const smsSchema = z.object({
  prospect_id: z.string().uuid(),
  instance_step_id: z.string().uuid(),
  // phone doit être en format E.164 — phone_normalized depuis prospects
  to_phone: z.string().min(8),
  content: z.string().min(1).max(160),
})

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let body: unknown
  try { body = await request.json() } catch { return apiError('Invalid JSON body', 400) }

  const parsed = smsSchema.safeParse(body)
  if (!parsed.success) {
    return apiError(parsed.error.issues.map((e) => e.message).join(', '), 400)
  }

  const { prospect_id, instance_step_id, to_phone, content } = parsed.data

  // Optimistic lock (Pitfall 5 RESEARCH)
  await supabase
    .from('sequence_instance_steps')
    .update({ status: 'sent', executed_at: new Date().toISOString(), message_sent: content })
    .eq('id', instance_step_id)

  const result = await sendBrevoSms({ to: to_phone, content })

  if (!result.success) {
    await supabase
      .from('sequence_instance_steps')
      .update({ status: 'failed', error_message: result.error })
      .eq('id', instance_step_id)
    return apiError(result.error ?? 'Envoi SMS échoué')
  }

  // SEQ-10 : tracer dans interactions
  const { error: intErr } = await insertInteraction({
    supabase,
    userId: user.id,
    prospectId: prospect_id,
    channel: 'sms',
    notes: `[Séquence] SMS envoyé : ${content.slice(0, 80)}`,
    isHonored: true,
  })
  if (intErr) console.error('insertInteraction sms:', intErr)

  return apiSuccess({ sent: true })
}
