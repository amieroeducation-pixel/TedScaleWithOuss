// src/app/api/playbooks/validate/route.ts
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getPlaybook } from '@/lib/playbooks/config'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const { prospectIds, action, variant = 'a', runId } = await req.json()

  if (!prospectIds?.length || !action) {
    return NextResponse.json({ error: 'Missing prospectIds or action' }, { status: 400 })
  }

  if (!['validate', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const newStatus = action === 'validate' ? 'validated' : 'rejected'

  const { error } = await getSupabase()
    .from('playbook_prospects')
    .update({
      status: newStatus,
      selected_variant: variant,
      validated_at: new Date().toISOString(),
    })
    .in('id', prospectIds)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (action === 'validate') {
    const supabase = getSupabase()
    const { data: playProspects } = await supabase
      .from('playbook_prospects')
      .select('*')
      .in('id', prospectIds)

    for (const pp of playProspects ?? []) {
      const messageField = `message_j0_${variant}` as keyof typeof pp
      const message = pp[messageField] as string ?? ''

      // Calculer next_action_date = today + urgencyDays du playbook
      const playbook = getPlaybook(pp.playbook_id)
      const nextActionDate = new Date(Date.now() + playbook.urgencyDays * 86400000).toISOString().split('T')[0]

      // Mapping source depuis signal_type
      let source = 'autre'
      const signalType = pp.signal_type as string
      if (['cession', 'heritage', 'vente_immo', 'holding', 'dividendes', 'dirigeant_55'].includes(signalType)) {
        source = 'chefs_entreprise'
      } else if (signalType === 'creation') {
        source = 'tns'
      } else if (signalType === 'linkedin') {
        source = 'linkedin'
      }

      // Mapping capital_event_type depuis signal_type
      let capitalEventType: string | null = null
      if (signalType === 'cession') {
        capitalEventType = 'cession'
      } else if (signalType === 'heritage') {
        capitalEventType = 'heritage'
      } else if (signalType === 'vente_immo') {
        capitalEventType = 'vente_immo'
      } else if (signalType === 'dividendes') {
        capitalEventType = 'dividendes'
      }

      // Capital amount détecté (depuis ca_estime pour les capital events)
      let capitalAmountDetected: number | null = null
      if (capitalEventType && pp.ca_estime) {
        capitalAmountDetected = pp.ca_estime
      }

      const { data: newProspect } = await supabase
        .from('prospects')
        .insert({
          full_name: pp.dirigeant_name ?? pp.company_name ?? 'Inconnu',
          company: pp.company_name,
          source,
          signal_type: pp.signal_type,
          playbook_id: pp.playbook_id,
          playbook_prospect_id: pp.id,
          pipeline_stage: 'a_contacter',
          lead_score: pp.score ?? null,
          next_action_date: nextActionDate,
          temperature: 'cold',
          capital_event_type: capitalEventType,
          capital_amount_detected: capitalAmountDetected,
          urgency_window_days: playbook.urgencyDays,
          notes: JSON.stringify({ siren: pp.siren, score: pp.score, message_j0: message, signal_data: pp.signal_data }),
        })
        .select()
        .single()

      if (newProspect) {
        await supabase
          .from('playbook_prospects')
          .update({ status: 'in_sequence', prospect_id: newProspect.id })
          .eq('id', pp.id)
      }
    }

    // Outbound LinkedIn : si prospect c1-linkedin, déclencher l'envoi via API Gojiberry directement
    const gojiberryKey = process.env.GOJIBERRY_API_KEY
    if (gojiberryKey) {
      const linkedinProspects = (playProspects ?? []).filter(
        (pp) => pp.playbook_id === 'c1-linkedin' && pp.signal_data?.gojiberry_id
      )
      for (const pp of linkedinProspects) {
        const messageField = `message_j0_${variant}` as keyof typeof pp
        const chosenMessage = pp[messageField] as string ?? ''
        const gojiberryId = pp.signal_data.gojiberry_id
        void (async () => {
          try {
            await fetch(`https://api.gojiberry.ai/contacts/${gojiberryId}`, {
              method: 'PUT',
              headers: { Authorization: `Bearer ${gojiberryKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ linkedin_template: chosenMessage, readyForCampaign: true }),
            })
          } catch { /* non-bloquant */ }
        })()
      }
    }

    if (runId) {
      await getSupabase().rpc('increment_validated', { run_id: runId, count: prospectIds.length })
    }
  }

  return NextResponse.json({ success: true, updated: prospectIds.length })
}
