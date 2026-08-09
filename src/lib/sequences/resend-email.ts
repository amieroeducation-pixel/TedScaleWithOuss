export type ResendResult = { success: boolean; error?: string; id?: string }

export async function sendResendEmail(args: {
  to_email: string
  to_name: string
  subject: string
  html_body: string
}): Promise<ResendResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { success: false, error: 'RESEND_API_KEY non configurée' }

  const from = process.env.RESEND_FROM_EMAIL || 'Ted CGP <onboarding@resend.dev>'

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [`${args.to_name} <${args.to_email}>`],
        subject: args.subject,
        html: args.html_body,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }))
      return { success: false, error: err.message || `Resend HTTP ${res.status}` }
    }

    const data = await res.json()
    return { success: true, id: data.id }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Erreur réseau Resend' }
  }
}
