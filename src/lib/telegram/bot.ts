// src/lib/telegram/bot.ts
import { createClient } from '@supabase/supabase-js'
import { getPlaybook } from '@/lib/playbooks/config'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getChatId(): Promise<string | null> {
  const { data } = await supabase
    .from('telegram_config')
    .select('chat_id')
    .eq('notifications_enabled', true)
    .single()
  return data?.chat_id ?? null
}

export async function sendTelegramMessage(text: string, replyMarkup?: object) {
  const chatId = process.env.TELEGRAM_CHAT_ID ?? await getChatId()
  if (!chatId) return

  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      reply_markup: replyMarkup,
    }),
  })
}

const SIGNAL_EMOJI: Record<string, string> = {
  cession: '🔴',
  holding: '🏗️',
  dividendes: '💰',
  dirigeant_55: '👔',
  creation: '🟢',
  linkedin: '🔵',
}

export async function sendPlaybookReport(params: {
  playbookId: string
  runId: string
  prospectsFound: number
}) {
  const { playbookId, runId, prospectsFound } = params
  if (prospectsFound === 0) return

  const config = getPlaybook(playbookId as any)
  const emoji = SIGNAL_EMOJI[config.signalType] ?? '📋'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  const text = `${emoji} *Playbook ${config.name}*\n${prospectsFound} prospect(s) prêt(s)\nTout est préparé dans le dashboard.`

  await sendTelegramMessage(text, {
    inline_keyboard: [
      [
        { text: '✅ Valider tous', callback_data: `validate_all:${runId}` },
        { text: '❌ Ignorer', callback_data: `reject_all:${runId}` },
      ],
      [{ text: '👀 Voir dans le dashboard', url: `${appUrl}/playbooks/${playbookId}` }],
    ],
  })
}

export async function sendStatusReport() {
  const { count: pendingCount } = await supabase
    .from('playbook_prospects')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')

  const { count: inSequenceCount } = await supabase
    .from('playbook_prospects')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'in_sequence')

  const { count: crmCount } = await supabase
    .from('playbook_prospects')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'crm')

  const today = new Date().toLocaleDateString('fr-FR')
  const text = `📊 *État Playbooks — ${today}*\nEn attente validation : ${pendingCount ?? 0}\nEn séquence active : ${inSequenceCount ?? 0}\nPassés en CRM : ${crmCount ?? 0}`
  await sendTelegramMessage(text)
}
