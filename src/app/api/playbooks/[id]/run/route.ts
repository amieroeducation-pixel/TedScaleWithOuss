// src/app/api/playbooks/[id]/run/route.ts
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runCessionsBodacc, runCreationsRecentes, runHoldings, runDividendes, runDirigeants55 } from '@/lib/playbooks/engine-a'
import { runSurveillanceBook, runDetectionLiquidite, runPreparationRdv, runCartographieHolding } from '@/lib/playbooks/engine-b'
import { sendPlaybookReport } from '@/lib/telegram/bot'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ENGINES: Record<string, (runId: string, body?: any) => Promise<number>> = {
  'a1-creations': runCreationsRecentes,
  'a2-cessions': runCessionsBodacc,
  'a3-holdings': runHoldings,
  'a4-dividendes': runDividendes,
  'a5-dirigeants': runDirigeants55,
  'b1-surveillance': runSurveillanceBook,
  'b3-liquidite': runDetectionLiquidite,
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: playbookId } = await params
  const body = await req.json().catch(() => ({}))

  const { data: run, error: runError } = await supabase
    .from('playbook_runs')
    .insert({ playbook_id: playbookId, status: 'running' })
    .select()
    .single()

  if (runError || !run) {
    return NextResponse.json({ error: 'Failed to create run' }, { status: 500 })
  }

  if (playbookId === 'b2-rdv') {
    ;(async () => {
      try {
        const fiche = await runPreparationRdv({ runId: run.id, ...body })
        await supabase.from('playbook_runs').update({ status: 'completed', completed_at: new Date().toISOString(), prospects_found: 1 }).eq('id', run.id)
      } catch (err: any) {
        await supabase.from('playbook_runs').update({ status: 'failed', error: err.message }).eq('id', run.id)
      }
    })()
    return NextResponse.json({ runId: run.id, status: 'running' })
  }

  if (playbookId === 'b4-cartographie') {
    ;(async () => {
      try {
        await runCartographieHolding({ runId: run.id, ...body })
        await supabase.from('playbook_runs').update({ status: 'completed', completed_at: new Date().toISOString(), prospects_found: 1 }).eq('id', run.id)
      } catch (err: any) {
        await supabase.from('playbook_runs').update({ status: 'failed', error: err.message }).eq('id', run.id)
      }
    })()
    return NextResponse.json({ runId: run.id, status: 'running' })
  }

  const engine = ENGINES[playbookId]
  if (!engine) {
    await supabase.from('playbook_runs').update({ status: 'failed', error: 'Unknown playbook' }).eq('id', run.id)
    return NextResponse.json({ error: 'Unknown playbook' }, { status: 400 })
  }

  ;(async () => {
    try {
      const count = await engine(run.id)
      await supabase
        .from('playbook_runs')
        .update({ status: 'completed', completed_at: new Date().toISOString(), prospects_found: count })
        .eq('id', run.id)

      await sendPlaybookReport({ playbookId, runId: run.id, prospectsFound: count })
    } catch (err: any) {
      await supabase
        .from('playbook_runs')
        .update({ status: 'failed', error: err.message })
        .eq('id', run.id)
    }
  })()

  return NextResponse.json({ runId: run.id, status: 'running' })
}
