import { NextRequest } from 'next/server'
import { verifyCronSecret } from '@/lib/cron/auth'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError } from '@/lib/api'
import { sendResendEmail } from '@/lib/sequences/resend-email'
import { sendBrevoEmail } from '@/lib/sequences/brevo'

export async function POST(req: NextRequest) {
  const authError = verifyCronSecret(req)
  if (authError) return authError

  const supabase = await createSupabaseServerClient()

  const now = new Date().toISOString()

  const { data: messages, error } = await supabase
    .from('scheduled_messages')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_at', now)
    .order('scheduled_at', { ascending: true })
    .limit(20)

  if (error) return apiError(error.message)
  if (!messages || messages.length === 0) return apiSuccess({ processed: 0 })

  let sent = 0
  let whatsappReady = 0

  for (const msg of messages) {
    if (msg.channel === 'email' && msg.email) {
      const htmlContent = msg.message.replace(/\n/g, '<br>') + (msg.document_url ? `<br><br>📎 <a href="${msg.document_url}">Document joint</a>` : '')

      let result: { success: boolean; error?: string }

      if (process.env.RESEND_API_KEY) {
        result = await sendResendEmail({
          to_email: msg.email,
          to_name: msg.prospect_name,
          subject: msg.subject || `Suivi - ${msg.prospect_name}`,
          html_body: htmlContent,
        })
      } else if (process.env.BREVO_API_KEY) {
        result = await sendBrevoEmail({
          to: msg.email,
          toName: msg.prospect_name,
          subject: msg.subject || `Suivi - ${msg.prospect_name}`,
          htmlContent,
        })
      } else {
        result = { success: false, error: 'Aucun provider email configuré' }
      }

      if (result.success) {
        await supabase
          .from('scheduled_messages')
          .update({ status: 'sent', sent_at: now })
          .eq('id', msg.id)

        await supabase.from('interactions').insert({
          user_id: msg.user_id,
          prospect_id: msg.prospect_id,
          type: 'email',
          notes: `[Planifié] Email envoyé via ${process.env.RESEND_API_KEY ? 'Resend' : 'Brevo'} : ${msg.subject || 'Suivi'}`,
          is_honored: true,
        })

        sent++
      }
    } else if (msg.channel === 'whatsapp') {
      await supabase
        .from('scheduled_messages')
        .update({ status: 'ready_to_send' })
        .eq('id', msg.id)
      whatsappReady++
    } else {
      await supabase
        .from('scheduled_messages')
        .update({ status: 'ready_to_send' })
        .eq('id', msg.id)
    }
  }

  return apiSuccess({ processed: messages.length, sent, whatsapp_ready: whatsappReady })
}
