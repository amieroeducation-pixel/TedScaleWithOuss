// src/app/api/playbooks/validate/route.ts
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

      const { data: newProspect } = await supabase
        .from('prospects')
        .insert({
          full_name: pp.dirigeant_name ?? pp.company_name ?? 'Inconnu',
          company: pp.company_name,
          source: 'autre',
          signal_type: pp.signal_type,
          playbook_id: pp.playbook_id,
          playbook_prospect_id: pp.id,
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

    if (runId) {
      await getSupabase().rpc('increment_validated', { run_id: runId, count: prospectIds.length })
    }
  }

  return NextResponse.json({ success: true, updated: prospectIds.length })
}
