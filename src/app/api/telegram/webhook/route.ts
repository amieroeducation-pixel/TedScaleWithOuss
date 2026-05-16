// src/app/api/telegram/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendStatusReport, sendTelegramMessage } from '@/lib/telegram/bot'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (webhookSecret) {
    const token = req.headers.get('x-telegram-bot-api-secret-token')
    if (token !== webhookSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const body = await req.json()

  const message = body.message
  if (message?.text === '/status') {
    await sendStatusReport()
    return NextResponse.json({ ok: true })
  }

  const callback = body.callback_query
  if (callback) {
    const [action, runId] = (callback.data as string).split(':')

    if (action === 'validate_all' && runId) {
      const { data: prospects } = await supabase
        .from('playbook_prospects')
        .select('id')
        .eq('run_id', runId)
        .eq('status', 'pending')

      const ids = (prospects ?? []).map((p: any) => p.id)
      if (ids.length > 0) {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/playbooks/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prospectIds: ids, action: 'validate', runId }),
        })
        await sendTelegramMessage(`✅ ${ids.length} prospect(s) validés et enrôlés en séquence.`)
      }
    }

    if (action === 'reject_all' && runId) {
      await supabase
        .from('playbook_prospects')
        .update({ status: 'rejected' })
        .eq('run_id', runId)
        .eq('status', 'pending')
      await sendTelegramMessage('❌ Prospects ignorés.')
    }

    await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callback.id }),
      }
    )
  }

  return NextResponse.json({ ok: true })
}
