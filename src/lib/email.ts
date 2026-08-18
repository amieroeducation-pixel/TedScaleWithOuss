import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * Envoie un email transactionnel via Resend
 * @param options - Paramètres email (to, subject, react component)
 * @returns Success/error result
 */
export async function sendEmail({
  to,
  subject,
  react,
}: {
  to: string
  subject: string
  react: React.ReactElement
}): Promise<{ success: boolean; error?: string; messageId?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Ted CGP <noreply@tedcgp.fr>',
      to,
      subject,
      react,
    })

    if (error) {
      console.error('[Resend Error]', error)
      return { success: false, error: error.message }
    }

    return { success: true, messageId: data?.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[Resend Exception]', message)
    return { success: false, error: message }
  }
}
