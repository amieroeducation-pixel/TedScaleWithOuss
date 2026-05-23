import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'
import { z } from 'zod'
import { sendBrevoEmail } from '@/lib/sequences/brevo'

const schema = z.object({
  prospect_id: z.string().uuid(),
  to_email: z.string().email(),
  to_name: z.string(),
  subject: z.string().min(1),
  body: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let raw: unknown
  try { raw = await req.json() } catch { return apiError('Invalid JSON', 400) }
  const parsed = schema.safeParse(raw)
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400)

  const { prospect_id, to_email, to_name, subject, body } = parsed.data

  const result = await sendBrevoEmail({
    to: to_email,
    toName: to_name,
    subject,
    htmlContent: body.replace(/\n/g, '<br>'),
  })

  if (!result.success) return apiError(result.error ?? 'Envoi échoué')

  await supabase.from('interactions').insert({
    user_id: user.id,
    prospect_id,
    type: 'email',
    notes: `Email envoyé : ${subject}`,
    is_honored: true,
  })

  return apiSuccess({ sent: true })
}
