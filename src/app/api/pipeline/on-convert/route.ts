// src/app/api/pipeline/on-convert/route.ts
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
  const { prospectId, userId } = await req.json()
  if (!prospectId || !userId) {
    return NextResponse.json({ error: 'Missing prospectId or userId' }, { status: 400 })
  }

  const supabase = getSupabase()

  // 1. Vérifier que le prospect existe et est bien converti
  const { data: prospect } = await supabase
    .from('prospects')
    .select('*')
    .eq('id', prospectId)
    .eq('user_id', userId)
    .single()

  if (!prospect || prospect.pipeline_stage !== 'converti') {
    return NextResponse.json({ error: 'Prospect not converted' }, { status: 400 })
  }

  // 2. Vérifier qu'un client n'existe pas déjà
  const { data: existingClient } = await supabase
    .from('clients')
    .select('id')
    .eq('prospect_id', prospectId)
    .maybeSingle()

  if (existingClient) {
    return NextResponse.json({ message: 'Client already exists', clientId: existingClient.id })
  }

  // 3. Créer le client
  const { data: client, error } = await supabase
    .from('clients')
    .insert({
      user_id: userId,
      prospect_id: prospectId,
      total_aum: prospect.capital_amount_detected ?? 0,
      last_interaction_at: new Date().toISOString(),
      alert_threshold_days: 90,
      notes: `Converti depuis ${prospect.source ?? 'inconnu'} — signal: ${prospect.signal_type ?? 'N/A'}`,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 4. Mettre à jour le prospect
  await supabase
    .from('prospects')
    .update({
      temperature: 'hot',
      last_engagement_at: new Date().toISOString(),
    })
    .eq('id', prospectId)

  return NextResponse.json({ clientId: client.id, message: 'Client created' })
}
