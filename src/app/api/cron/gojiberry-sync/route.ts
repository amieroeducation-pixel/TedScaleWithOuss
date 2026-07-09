// src/app/api/cron/gojiberry-sync/route.ts
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateLinkedinMessage, LINKEDIN_SIGNAL_CONTEXT } from '@/lib/playbooks/message-generator'
import { sendTelegramMessage } from '@/lib/telegram/bot'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const SIGNAL_SCORE: Record<string, number> = {
  cession: 9,
  levee_fonds: 8,
  creation_holding: 7,
  retraite: 7,
  promotion: 6,
  recrutement: 5,
}

const SIGNAL_EMOJI: Record<string, string> = {
  cession: '🔴',
  promotion: '🚀',
  levee_fonds: '💸',
  creation_holding: '🏗️',
  retraite: '🌅',
  recrutement: '📈',
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('x-cron-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const gojiberryKey = process.env.GOJIBERRY_API_KEY
  if (!gojiberryKey) {
    return NextResponse.json({ error: 'GOJIBERRY_API_KEY manquante' }, { status: 500 })
  }

  // Récupérer les contacts Gojiberry avec signaux récents (dernières 48h)
  const since = new Date()
  since.setHours(since.getHours() - 48)

  let contacts: any[] = []
  try {
    const res = await fetch(
      `https://api.gojiberry.ai/contacts?limit=50&sortBy=createdAt&sortOrder=desc`,
      { headers: { Authorization: `Bearer ${gojiberryKey}` } }
    )
    if (!res.ok) {
      return NextResponse.json({ error: `Gojiberry API error: ${res.status}` }, { status: 502 })
    }
    const data = await res.json()
    // L'API peut retourner { contacts: [...] } ou directement un tableau
    contacts = Array.isArray(data) ? data : (data.contacts ?? data.items ?? data.data ?? [])
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 })
  }

  const sb = getSupabase()
  const today = new Date().toISOString().split('T')[0]

  // Trouver ou créer le run du jour pour c1-linkedin
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

  let inserted = 0
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  for (const contact of contacts) {
    // Dériver le signal depuis intent_keyword ou agent.name
    const keyword = (contact.intent_keyword ?? '').toLowerCase().replace(/['"]/g, '')
    const agentName = (contact.agent?.name ?? contact.list?.name ?? '').toLowerCase()

    let signal_gojiberry = ''
    if (keyword.includes('cession') || agentName.includes('cession')) signal_gojiberry = 'cession'
    else if (keyword.includes('holding') || agentName.includes('holding')) signal_gojiberry = 'creation_holding'
    else if (keyword.includes('retraite') || agentName.includes('retraite')) signal_gojiberry = 'retraite'
    else if (keyword.includes('levée') || keyword.includes('levee') || keyword.includes('fonds') || agentName.includes('levee')) signal_gojiberry = 'levee_fonds'
    else if (keyword.includes('recrut') || agentName.includes('recrut')) signal_gojiberry = 'recrutement'
    else if (agentName.includes('founder') || agentName.includes('fondateur') || agentName.includes('dirigeant') || agentName.includes('ceo') || agentName.includes('pdg')) signal_gojiberry = 'promotion'

    if (!signal_gojiberry || !SIGNAL_SCORE[signal_gojiberry]) continue

    // URL LinkedIn — utiliser profileUrl en priorité, sinon construire depuis linkedinIdentifier
    const linkedin_url: string | null =
      contact.profileUrl ?? (contact.linkedinIdentifier ? `https://www.linkedin.com/in/${contact.linkedinIdentifier}` : null)

    // Déduplication : ne pas insérer si ce contact existe déjà en pending/validated
    if (linkedin_url) {
      const { data: existing } = await sb
        .from('playbook_prospects')
        .select('id')
        .eq('linkedin_profile_url', linkedin_url)
        .in('status', ['pending', 'validated', 'in_sequence'])
        .maybeSingle()
      if (existing) continue
    }

    const prenom: string = contact.firstName ?? contact.first_name ?? contact.prenom ?? 'Dirigeant'
    const nom: string = contact.lastName ?? contact.last_name ?? contact.nom ?? ''
    const societe: string = contact.company ?? contact.companyName ?? contact.company_name ?? 'N/C'
    const localisation: string = contact.location ?? contact.city ?? contact.localisation ?? ''
    // Description du signal pour le contexte
    const rawIntent = (contact.intent ?? '').replace(/<[^>]+>/g, '').trim()
    const signal_description: string = rawIntent || contact.score_reasoning || contact.intent_keyword || signal_gojiberry

    const score = SIGNAL_SCORE[signal_gojiberry]
    const dirigeant_name = `${prenom} ${nom}`.trim()

    const angles = LINKEDIN_SIGNAL_CONTEXT[signal_gojiberry]?.angles ?? [
      'patrimonial global', 'protection personnelle', 'transmission',
    ]

    const [msgA, msgB, msgC] = await Promise.all([
      generateLinkedinMessage({ signal_gojiberry, signal_description, prenom, societe, angle: angles[0] }),
      generateLinkedinMessage({ signal_gojiberry, signal_description, prenom, societe, angle: angles[1] }),
      generateLinkedinMessage({ signal_gojiberry, signal_description, prenom, societe, angle: angles[2] }),
    ])

    const { error } = await sb.from('playbook_prospects').insert({
      run_id: runId,
      playbook_id: 'c1-linkedin',
      signal_type: 'linkedin',
      score,
      company_name: societe,
      dirigeant_name,
      localisation: localisation || null,
      linkedin_profile_url: linkedin_url,
      signal_data: { signal_gojiberry, signal_description, linkedin_url, gojiberry_id: contact.id },
      message_j0_a: msgA,
      message_j0_b: msgB,
      message_j0_c: msgC,
      status: 'pending',
    })

    if (!error) {
      inserted++
      const emoji = SIGNAL_EMOJI[signal_gojiberry] ?? '🔵'

      // Notifier Telegram pour chaque nouveau contact
      await sendTelegramMessage(
        `${emoji} *LinkedIn — ${signal_gojiberry}*\n${dirigeant_name} · ${societe}\n${signal_description}\n\nScore : ${score}/10`,
        {
          inline_keyboard: [[
            { text: '👀 Valider dans le dashboard', url: `${appUrl}/playbooks/c1-linkedin` },
          ]],
        }
      )
    }
  }

  // Mettre à jour le run
  if (inserted > 0) {
    await sb.rpc('increment_prospects_found', { p_run_id: runId, p_count: inserted })
  }

  // Compléter le run si on a tout traité
  await sb.from('playbook_runs')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', runId)
    .eq('status', 'running')

  return NextResponse.json({ ok: true, contacts_checked: contacts.length, inserted })
}
