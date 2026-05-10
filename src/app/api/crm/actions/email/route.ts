import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'
import { z } from 'zod'
import { sendBrevoEmail } from '@/lib/sequences/brevo'
import { insertInteraction } from '@/lib/sequences/executor'

const emailSchema = z.object({
  prospect_id: z.string().uuid(),
  instance_step_id: z.string().uuid(),
  to_email: z.string().email(),
  to_name: z.string(),
  subject: z.string().min(1),
  html_content: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let body: unknown
  try { body = await request.json() } catch { return apiError('Invalid JSON body', 400) }

  const parsed = emailSchema.safeParse(body)
  if (!parsed.success) {
    return apiError(parsed.error.issues.map((e) => e.message).join(', '), 400)
  }

  const { prospect_id, instance_step_id, to_email, to_name, subject, html_content } = parsed.data

  // Optimistic lock — marquer 'sent' AVANT l'envoi (Pitfall 5 RESEARCH)
  await supabase
    .from('sequence_instance_steps')
    .update({ status: 'sent', executed_at: new Date().toISOString(), message_sent: html_content })
    .eq('id', instance_step_id)

  const result = await sendBrevoEmail({ to: to_email, toName: to_name, subject, htmlContent: html_content })

  if (!result.success) {
    await supabase
      .from('sequence_instance_steps')
      .update({ status: 'failed', error_message: result.error })
      .eq('id', instance_step_id)
    return apiError(result.error ?? 'Envoi email échoué')
  }

  // SEQ-10 : tracer dans interactions
  const { error: intErr } = await insertInteraction({
    supabase,
    userId: user.id,
    prospectId: prospect_id,
    channel: 'email',
    notes: `[Séquence] Email envoyé : ${subject}`,
    isHonored: true,
  })
  if (intErr) console.error('insertInteraction email:', intErr)

  return apiSuccess({ sent: true })
}
