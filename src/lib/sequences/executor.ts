import type { SupabaseLike, ProspectForSequence, SequenceInstanceStep, SequenceChannel } from './types'
import { sendBrevoEmail, sendBrevoSms } from './brevo'

export function interpolateTemplate(
  template: string,
  prospect: { full_name: string; phone: string | null; email: string | null; pipeline_stage: string }
): string {
  const parts = prospect.full_name.split(' ')
  const prenom = parts.length > 1 ? parts[0] : prospect.full_name
  return template
    .replace(/\{\{nom\}\}/g, prospect.full_name)
    .replace(/\{\{prenom\}\}/g, prenom)
    .replace(/\{\{telephone\}\}/g, prospect.phone ?? '')
    .replace(/\{\{email\}\}/g, prospect.email ?? '')
    .replace(/\{\{stade\}\}/g, prospect.pipeline_stage)
}

const CHANNEL_TO_INTERACTION: Record<SequenceChannel, string> = {
  whatsapp: 'whatsapp',
  email: 'email',
  sms: 'sms',
  call_reminder: 'appel',
  linkedin: 'linkedin',
}

export async function insertInteraction(args: {
  supabase: SupabaseLike
  userId: string
  prospectId: string
  channel: SequenceChannel
  notes: string
  isHonored: boolean
}): Promise<{ error?: string }> {
  const { error } = await args.supabase.from('interactions').insert({
    user_id: args.userId,
    prospect_id: args.prospectId,
    type: CHANNEL_TO_INTERACTION[args.channel],
    notes: args.notes,
    is_honored: args.isHonored,
    occurred_at: new Date().toISOString(),
  })
  if (error) return { error: error.message }
  return {}
}

/**
 * Exécute une étape côté serveur (email, sms, call_reminder).
 * NE PAS appeler pour whatsapp / linkedin — ces canaux sont client-only (Pitfall 2 RESEARCH).
 * Met à jour status='sent' AVANT le call API (optimistic — Pitfall 5).
 */
export async function executeStep(args: {
  supabase: SupabaseLike
  userId: string
  step: SequenceInstanceStep
  prospect: ProspectForSequence
  messageTemplate: string | null
}): Promise<{ status: 'sent' | 'failed' | 'skipped'; error?: string; messageSent?: string }> {
  const { supabase, userId, step, prospect, messageTemplate } = args

  if (step.channel === 'whatsapp' || step.channel === 'linkedin') {
    return { status: 'skipped', error: 'Canal client-only — exécution serveur ignorée' }
  }

  const interpolated = messageTemplate
    ? interpolateTemplate(messageTemplate, prospect)
    : ''

  // Optimistic lock — marquer 'sent' AVANT l'envoi (Pitfall 5)
  await supabase
    .from('sequence_instance_steps')
    .update({ status: 'sent', executed_at: new Date().toISOString(), message_sent: interpolated })
    .eq('id', step.id)

  if (step.channel === 'email') {
    if (!prospect.email) {
      await supabase.from('sequence_instance_steps').update({
        status: 'failed', error_message: 'Email du prospect absent',
      }).eq('id', step.id)
      return { status: 'failed', error: 'Email du prospect absent' }
    }
    const subject = `Suivi — ${prospect.full_name}`
    const htmlContent = interpolated.replace(/\n/g, '<br>')
    const res = await sendBrevoEmail({
      to: prospect.email, toName: prospect.full_name, subject, htmlContent,
    })
    if (!res.success) {
      await supabase.from('sequence_instance_steps').update({
        status: 'failed', error_message: res.error,
      }).eq('id', step.id)
      return { status: 'failed', error: res.error }
    }
    await insertInteraction({
      supabase, userId, prospectId: prospect.id, channel: 'email',
      notes: `[Séquence] Email envoyé : ${subject}`, isHonored: true,
    })
    return { status: 'sent', messageSent: interpolated }
  }

  if (step.channel === 'sms') {
    const phone = prospect.phone_normalized || prospect.phone
    if (!phone) {
      await supabase.from('sequence_instance_steps').update({
        status: 'failed', error_message: 'Téléphone du prospect absent',
      }).eq('id', step.id)
      return { status: 'failed', error: 'Téléphone du prospect absent' }
    }
    const res = await sendBrevoSms({ to: phone, content: interpolated.slice(0, 160) })
    if (!res.success) {
      await supabase.from('sequence_instance_steps').update({
        status: 'failed', error_message: res.error,
      }).eq('id', step.id)
      return { status: 'failed', error: res.error }
    }
    await insertInteraction({
      supabase, userId, prospectId: prospect.id, channel: 'sms',
      notes: `[Séquence] SMS envoyé : ${interpolated.slice(0, 80)}...`, isHonored: true,
    })
    return { status: 'sent', messageSent: interpolated }
  }

  if (step.channel === 'call_reminder') {
    // Insère une interaction type='appel', is_honored=false (rappel à honorer)
    const result = await insertInteraction({
      supabase, userId, prospectId: prospect.id, channel: 'call_reminder',
      notes: `[Séquence] ${interpolated || `Rappel à honorer pour ${prospect.full_name}`}`,
      isHonored: false,
    })
    if (result.error) {
      await supabase.from('sequence_instance_steps').update({
        status: 'failed', error_message: result.error,
      }).eq('id', step.id)
      return { status: 'failed', error: result.error }
    }
    return { status: 'sent', messageSent: interpolated }
  }

  return { status: 'failed', error: `Canal inconnu : ${step.channel}` }
}
