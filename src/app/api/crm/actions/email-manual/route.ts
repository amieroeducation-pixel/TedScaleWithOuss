import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'
import { z } from 'zod'
import { sendResendEmail } from '@/lib/sequences/resend-email'
import { sendBrevoEmail } from '@/lib/sequences/brevo'

const schema = z.object({
  prospect_id: z.string().uuid(),
  to_email: z.string().email(),
  to_name: z.string(),
  subject: z.string().min(1),
  body: z.string().min(1),
  document_url: z.string().url().optional(),
})

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let raw: unknown
  try { raw = await req.json() } catch { return apiError('Invalid JSON', 400) }
  const parsed = schema.safeParse(raw)
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400)

  const { prospect_id, to_email, to_name, subject, body, document_url } = parsed.data
  const htmlContent = body.replace(/\n/g, '<br>') + (document_url ? `<br><br>📎 <a href="${document_url}">Document joint</a>` : '')

  let result: { success: boolean; error?: string }
  let provider: string

  if (process.env.RESEND_API_KEY) {
    result = await sendResendEmail({ to_email, to_name, subject, html_body: htmlContent })
    provider = 'resend'
  } else if (process.env.BREVO_API_KEY) {
    result = await sendBrevoEmail({ to: to_email, toName: to_name, subject, htmlContent })
    provider = 'brevo'
  } else {
    return apiError('Aucun provider email configuré (RESEND_API_KEY ou BREVO_API_KEY)')
  }

  if (!result.success) return apiError(result.error ?? 'Envoi échoué')

  await supabase.from('interactions').insert({
    user_id: user.id,
    prospect_id,
    type: 'email',
    notes: `Email envoyé via ${provider} : ${subject}`,
    is_honored: true,
  })

  return apiSuccess({ sent: true, provider })
}
