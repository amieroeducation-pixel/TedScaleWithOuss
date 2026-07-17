import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError } from '@/lib/api'
import { sendBrevoEmail } from '@/lib/sequences/brevo'

export async function POST() {
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
      const result = await sendBrevoEmail({
        to: msg.email,
        toName: msg.prospect_name,
        subject: msg.subject || `Suivi - ${msg.prospect_name}`,
        htmlContent: msg.message.replace(/\n/g, '<br>') + (msg.document_url ? `<br><br>📎 <a href="${msg.document_url}">Document joint</a>` : ''),
      })

      if (result.success) {
        await supabase
          .from('scheduled_messages')
          .update({ status: 'sent', sent_at: now })
          .eq('id', msg.id)

        await supabase.from('interactions').insert({
          user_id: msg.user_id,
          prospect_id: msg.prospect_id,
          type: 'email',
          notes: `[Planifié] Email envoyé : ${msg.subject || 'Suivi'}`,
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
