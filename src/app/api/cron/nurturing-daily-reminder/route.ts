import { NextRequest } from 'next/server'
import { verifyCronSecret } from '@/lib/cron/auth'
import { logCronRun } from '@/lib/cron/logger'
import { isCronEnabled } from '@/lib/cron/toggles'
import { createSupabaseCronClient } from '@/lib/supabase/cron-client'
import { sendTelegramMessage } from '@/lib/telegram/bot'
import { apiSuccess, apiError } from '@/lib/api'

const CHANNEL_EMOJI: Record<string, string> = {
  telephone: '📞 Appel',
  email: '✉️ Email',
  whatsapp: '💬 WhatsApp',
  linkedin: '🔗 LinkedIn',
  sms: '📱 SMS',
  courrier: '📬 Courrier',
}

function formatChannel(channel: string | null): string {
  if (!channel) return '📞 Appel'
  return CHANNEL_EMOJI[channel] ?? `📞 ${channel}`
}

export async function GET(req: NextRequest) {
  const authError = verifyCronSecret(req)
  if (authError) return authError

  if (!(await isCronEnabled('nurturing-daily-reminder'))) {
    return apiSuccess({ status: 'disabled', message: 'Cron désactivé par l\'utilisateur' })
  }

  const supabase = createSupabaseCronClient()

  // Récupérer tous les prospects avec next_action_date = aujourd'hui et non archivés
  const today = new Date().toISOString().split('T')[0]

  const { data: prospects, error } = await supabase
    .from('prospects')
    .select('id, full_name, next_action_channel')
    .eq('next_action_date', today)
    .or('nurturing_archived.is.null,nurturing_archived.eq.false')
    .order('full_name', { ascending: true })

  if (error) {
    return apiError(`prospects query: ${error.message}`)
  }

  const count = prospects?.length ?? 0

  // Si aucune relance due, ne rien envoyer
  if (count === 0) {
    await logCronRun({
      userId: 'system',
      jobName: 'nurturing-daily-reminder',
      status: 'skipped',
      details: { reason: 'Aucune relance due aujourd\'hui', date: today },
    })
    return apiSuccess({ status: 'skipped', message: 'Aucune relance due', date: today })
  }

  // Construire le message Telegram
  const lines = (prospects ?? []).map((p: { full_name: string; next_action_channel: string | null }, idx: number) => {
    return `${idx + 1}. ${p.full_name} → ${formatChannel(p.next_action_channel)}`
  })

  const message = `📋 *Nurturing du jour — ${count} relance${count > 1 ? 's' : ''}*\n\n${lines.join('\n')}`

  // Envoyer via Telegram
  await sendTelegramMessage(message)

  // Logger
  await logCronRun({
    userId: 'system',
    jobName: 'nurturing-daily-reminder',
    status: 'success',
    details: { date: today, count, prospects: (prospects ?? []).map((p: { full_name: string }) => p.full_name) },
  })

  return apiSuccess({ status: 'ok', date: today, count })
}
