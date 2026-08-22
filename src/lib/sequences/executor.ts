import type { SupabaseLike, ProspectForSequence, SequenceInstanceStep, SequenceChannel } from './types'
import { sendBrevoEmail, sendBrevoSms, sendWhatsAppMessage } from './brevo'
import { scheduleAutoRelance } from './auto-relance'
import { interpolateTemplate } from '@/lib/nurturing/template-engine'

const CHANNEL_TO_INTERACTION: Record<SequenceChannel, string> = {
  whatsapp: 'whatsapp',
  email: 'email',
  sms: 'sms',
  call_reminder: 'appel',
  linkedin: 'linkedin',
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function logExecution(args: {
  supabase: SupabaseLike
  userId: string
  instanceId: string
  stepId: string
  prospectId: string
  channel: SequenceChannel
  status: 'success' | 'failed' | 'retrying'
  httpCode?: number
  error?: string
  messageSent: string
  retryCount: number
}): Promise<void> {
  await args.supabase.from('sequence_execution_logs').insert({
    user_id: args.userId,
    sequence_instance_id: args.instanceId,
    step_id: args.stepId,
    prospect_id: args.prospectId,
    channel: args.channel,
    status: args.status,
    http_status_code: args.httpCode,
    error_message: args.error,
    message_sent: args.messageSent,
    retry_count: args.retryCount,
  })
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

async function executeSingleAttempt(args: {
  supabase: SupabaseLike
  userId: string
  step: SequenceInstanceStep
  prospect: ProspectForSequence
  messageTemplate: string | null
  prospectExtra?: { profession?: string | null; city?: string | null; heure?: string | null; montant?: string | null; date?: string | null }
}): Promise<{
  success: boolean
  httpCode?: number
  error?: string
  messageSent?: string
}> {
  const { step, prospect, messageTemplate, prospectExtra } = args

  const interpolated = messageTemplate
    ? interpolateTemplate(messageTemplate, prospect, prospectExtra)
    : ''

  if (step.channel === 'email') {
    if (!prospect.email) {
      return { success: false, error: 'Email du prospect absent' }
    }
    const subject = `Suivi — ${prospect.full_name}`
    const htmlContent = interpolated.replace(/\n/g, '<br>')
    const res = await sendBrevoEmail({
      to: prospect.email, toName: prospect.full_name, subject, htmlContent,
    })
    if (!res.success) {
      return { success: false, httpCode: res.httpCode, error: res.error }
    }
    return { success: true, httpCode: res.httpCode, messageSent: interpolated }
  }

  if (step.channel === 'sms') {
    const phone = prospect.phone_normalized || prospect.phone
    if (!phone) {
      return { success: false, error: 'Téléphone du prospect absent' }
    }
    const res = await sendBrevoSms({ to: phone, content: interpolated.slice(0, 160) })
    if (!res.success) {
      return { success: false, httpCode: res.httpCode, error: res.error }
    }
    return { success: true, httpCode: res.httpCode, messageSent: interpolated }
  }

  if (step.channel === 'whatsapp') {
    const phone = prospect.phone_normalized || prospect.phone
    if (!phone) {
      return { success: false, error: 'Téléphone du prospect absent' }
    }
    const res = await sendWhatsAppMessage({ to: phone, message: interpolated })
    if (!res.success) {
      // Fallback SMS si WhatsApp échoue
      const smsRes = await sendBrevoSms({ to: phone, content: interpolated.slice(0, 160) })
      if (!smsRes.success) {
        return { success: false, httpCode: smsRes.httpCode, error: `WhatsApp: ${res.error} | SMS fallback: ${smsRes.error}` }
      }
      return { success: true, httpCode: smsRes.httpCode, messageSent: interpolated }
    }
    return { success: true, httpCode: res.httpCode, messageSent: interpolated }
  }

  if (step.channel === 'call_reminder') {
    // Call reminder n'envoie rien via API externe, juste insertion interaction
    return { success: true, messageSent: interpolated }
  }

  return { success: false, error: `Canal inconnu : ${step.channel}` }
}

/**
 * Exécute une étape côté serveur avec retry logic.
 * Gère email, SMS, WhatsApp, call_reminder.
 * Skip linkedin (client-only).
 */
export async function executeStep(args: {
  supabase: SupabaseLike
  userId: string
  step: SequenceInstanceStep
  prospect: ProspectForSequence
  messageTemplate: string | null
  prospectExtra?: { profession?: string | null; city?: string | null; heure?: string | null; montant?: string | null; date?: string | null }
}): Promise<{ status: 'sent' | 'failed' | 'skipped'; error?: string; messageSent?: string }> {
  const { supabase, userId, step, prospect, messageTemplate, prospectExtra } = args

  const interpolated = messageTemplate
    ? interpolateTemplate(messageTemplate, prospect, prospectExtra)
    : ''

  // LinkedIn: guided manual action (store message, create interaction with is_honored: false)
  if (step.channel === 'linkedin') {
    // Update step with interpolated message
    await supabase.from('sequence_instance_steps').update({
      status: 'sent',
      executed_at: new Date().toISOString(),
      message_sent: interpolated,
    }).eq('id', step.id)

    // Insert interaction with is_honored: false (user needs to honor it manually)
    await insertInteraction({
      supabase,
      userId,
      prospectId: prospect.id,
      channel: 'linkedin',
      notes: '[Séquence] LinkedIn — action manuelle requise',
      isHonored: false,
    })

    return { status: 'sent', messageSent: interpolated }
  }

  // Lock atomique: WHERE status='pending' + RETURNING pour détecter si un autre process a déjà pris ce step
  const { data: locked, error: lockErr } = await supabase
    .from('sequence_instance_steps')
    .update({ status: 'sent', executed_at: new Date().toISOString() })
    .eq('id', step.id)
    .eq('status', 'pending')
    .select('id')

  if (lockErr) {
    return { status: 'failed', error: `Lock failed: ${lockErr.message}` }
  }

  if (!locked || locked.length === 0) {
    return { status: 'skipped', error: 'Step already claimed by another process' }
  }

  // Retry loop
  const MAX_RETRIES = 3
  let attempt = 0
  let lastError = ''
  let lastHttpCode: number | undefined

  while (attempt < MAX_RETRIES) {
    attempt++

    const res = await executeSingleAttempt({
      supabase, userId, step, prospect, messageTemplate, prospectExtra
    })

    const logStatus = res.success ? 'success' : (attempt < MAX_RETRIES ? 'retrying' : 'failed')

    // Log tentative
    await logExecution({
      supabase,
      userId,
      instanceId: step.instance_id,
      stepId: step.id,
      prospectId: prospect.id,
      channel: step.channel,
      status: logStatus,
      httpCode: res.httpCode,
      error: res.error,
      messageSent: res.messageSent || interpolated,
      retryCount: attempt - 1,
    })

    if (res.success) {
      // Succès → update step + insert interaction + schedule relance
      await supabase.from('sequence_instance_steps').update({
        message_sent: res.messageSent,
      }).eq('id', step.id)

      await insertInteraction({
        supabase, userId, prospectId: prospect.id, channel: step.channel,
        notes: `[Séquence] ${step.channel} envoyé`,
        isHonored: step.channel !== 'call_reminder',
      })

      if (step.channel !== 'call_reminder') {
        void scheduleAutoRelance({
          supabase,
          instanceId: step.instance_id,
          prospectId: prospect.id,
          lastChannel: step.channel as any,
        })
      }

      return { status: 'sent', messageSent: res.messageSent }
    }

    // Échec → décision retry
    lastError = res.error || 'Erreur inconnue'
    lastHttpCode = res.httpCode

    if (res.httpCode === 429) {
      // Rate limit → wait 60s puis 1 retry
      if (attempt === 1) {
        console.log(`[sequences] Rate limit 429 → wait 60s`)
        await sleep(60000)
        continue
      }
      // Après 60s toujours 429 → abandon
      break
    } else if (res.httpCode && res.httpCode >= 500 && res.httpCode < 600) {
      // Server error → backoff exponentiel
      const backoffMs = Math.pow(2, attempt) * 1000  // 2s, 4s, 8s
      console.log(`[sequences] Server error ${res.httpCode} → wait ${backoffMs}ms (attempt ${attempt}/${MAX_RETRIES})`)
      await sleep(backoffMs)
      continue
    } else {
      // 4xx ou autre → erreur définitive, pas de retry
      console.log(`[sequences] Client error ${res.httpCode || 'unknown'} → no retry`)
      break
    }
  }

  // Échec après retries
  await supabase.from('sequence_instance_steps').update({
    status: 'failed',
    error_message: `${lastHttpCode || ''} ${lastError}`,
    executed_at: new Date().toISOString(),
  }).eq('id', step.id)

  return { status: 'failed', error: lastError }
}
