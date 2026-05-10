type BrevoResult = { success: boolean; error?: string }

export async function sendBrevoEmail(args: {
  to: string
  toName: string
  subject: string
  htmlContent: string
}): Promise<BrevoResult> {
  const apiKey = process.env.BREVO_API_KEY
  const sender = process.env.BREVO_SENDER_EMAIL
  if (!apiKey) return { success: false, error: 'BREVO_API_KEY manquante' }
  if (!sender) return { success: false, error: 'BREVO_SENDER_EMAIL manquante' }

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'Ted - CGP', email: sender },
        to: [{ email: args.to, name: args.toName }],
        subject: args.subject,
        htmlContent: args.htmlContent,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }))
      return { success: false, error: err.message || `HTTP ${res.status}` }
    }
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Erreur réseau Brevo' }
  }
}

export async function sendBrevoSms(args: {
  to: string  // E.164 ex: +33612345678
  content: string
  sender?: string
}): Promise<BrevoResult> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) return { success: false, error: 'BREVO_API_KEY manquante' }

  try {
    const res = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: args.sender || 'TedCGP',
        recipient: args.to,
        content: args.content,
        type: 'transactional',
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }))
      return { success: false, error: err.message || `HTTP ${res.status}` }
    }
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Erreur réseau Brevo SMS' }
  }
}
