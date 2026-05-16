// src/app/api/playbooks/linkedin-signal/route.ts
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateLinkedinMessage, LINKEDIN_SIGNAL_CONTEXT } from '@/lib/playbooks/message-generator'
import { sendTelegramMessage } from '@/lib/telegram/bot'
import type { SignalType } from '@/lib/playbooks/config'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const SIGNAL_TO_TYPE: Record<string, SignalType> = {
  cession: 'cession',
  promotion: 'linkedin',
  levee_fonds: 'linkedin',
  creation_holding: 'holding',
  retraite: 'dirigeant_55',
  recrutement: 'linkedin',
}

const SIGNAL_SCORE: Record<string, number> = {
  cession: 9,
  levee_fonds: 8,
  creation_holding: 7,
  retraite: 7,
  promotion: 6,
  recrutement: 5,
}

// Corps attendu depuis Make.com :
// { prenom, nom?, societe, linkedin_url?, signal_gojiberry, signal_description, localisation? }

export async function POST(req: NextRequest) {
  const secret = process.env.LINKEDIN_WEBHOOK_SECRET
  if (secret) {
    const provided = req.headers.get('x-webhook-secret')
    if (provided !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { prenom, nom, societe, linkedin_url, signal_gojiberry, signal_description, localisation } = body

  if (!prenom || !societe || !signal_gojiberry) {
    return NextResponse.json(
      { error: 'Champs requis manquants : prenom, societe, signal_gojiberry' },
      { status: 400 }
    )
  }

  const validSignals = Object.keys(SIGNAL_SCORE)
  if (!validSignals.includes(signal_gojiberry)) {
    return NextResponse.json(
      { error: `signal_gojiberry invalide. Valeurs acceptées : ${validSignals.join(', ')}` },
      { status: 400 }
    )
  }

  const signalType: SignalType = SIGNAL_TO_TYPE[signal_gojiberry] ?? 'linkedin'
  const score = SIGNAL_SCORE[signal_gojiberry]
  const dirigeantName = `${prenom} ${nom ?? ''}`.trim()
  const description = signal_description ?? signal_gojiberry

  // Trouver ou créer le run du jour pour c1-linkedin
  const sb = getSupabase()
  const today = new Date().toISOString().split('T')[0]

  const { data: existingRun } = await sb
    .from('playbook_runs')
    .select('id')
    .eq('playbook_id', 'c1-linkedin')
    .gte('started_at', `${today}T00:00:00Z`)
    .eq('status', 'running')
    .maybeSingle()

  let runId: string
  if (existingRun) {
    runId = existingRun.id
  } else {
    const { data: newRun, error: runError } = await sb
      .from('playbook_runs')
      .insert({ playbook_id: 'c1-linkedin', status: 'running' })
      .select('id')
      .single()
    if (runError || !newRun) {
      return NextResponse.json({ error: 'Failed to create run' }, { status: 500 })
    }
    runId = newRun.id
  }

  // Générer 3 messages personnalisés en parallèle (angles différents)
  const angles = LINKEDIN_SIGNAL_CONTEXT[signal_gojiberry]?.angles ?? [
    'patrimonial global',
    'protection personnelle',
    'transmission',
  ]

  const [msgA, msgB, msgC] = await Promise.all([
    generateLinkedinMessage({ signal_gojiberry, signal_description: description, prenom, societe, angle: angles[0] }),
    generateLinkedinMessage({ signal_gojiberry, signal_description: description, prenom, societe, angle: angles[1] }),
    generateLinkedinMessage({ signal_gojiberry, signal_description: description, prenom, societe, angle: angles[2] }),
  ])

  // Insérer le prospect
  const { error: insertError } = await sb.from('playbook_prospects').insert({
    run_id: runId,
    playbook_id: 'c1-linkedin',
    signal_type: signalType,
    score,
    company_name: societe,
    dirigeant_name: dirigeantName,
    localisation: localisation ?? null,
    linkedin_profile_url: linkedin_url ?? null,
    signal_data: { signal_gojiberry, signal_description: description, linkedin_url },
    message_j0_a: msgA,
    message_j0_b: msgB,
    message_j0_c: msgC,
    status: 'pending',
  })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Incrémenter le compteur du run
  await sb.rpc('increment_prospects_found', { p_run_id: runId, p_count: 1 })

  // Notifier Telegram
  const SIGNAL_EMOJI: Record<string, string> = {
    cession: '🔴',
    promotion: '🚀',
    levee_fonds: '💸',
    creation_holding: '🏗️',
    retraite: '🌅',
    recrutement: '📈',
  }
  const emoji = SIGNAL_EMOJI[signal_gojiberry] ?? '🔵'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  await sendTelegramMessage(
    `${emoji} *LinkedIn — ${signal_gojiberry}*\n${dirigeantName} · ${societe}\n${description}\n\nScore : ${score}/10 — 3 messages générés`,
    {
      inline_keyboard: [[
        { text: '👀 Valider dans le dashboard', url: `${appUrl}/playbooks/c1-linkedin` },
      ]],
    }
  )

  return NextResponse.json({ ok: true, runId, prospect: { dirigeantName, societe, score } })
}
