import { NextRequest } from 'next/server'
import { createSupabaseCronClient } from '@/lib/supabase/cron-client'
import { verifyCronSecret } from '@/lib/cron/auth'
import { logCronRun } from '@/lib/cron/logger'
import { apiSuccess, apiError } from '@/lib/api'
import { executeStep } from '@/lib/sequences/executor'
import type { SequenceInstanceStep, ProspectForSequence, SequenceChannel } from '@/lib/sequences/types'

export async function GET(req: NextRequest) {
  const authError = verifyCronSecret(req)
  if (authError) return authError

  const supabase = createSupabaseCronClient()

  const { data: dueSteps, error: fetchErr } = await supabase
    .from('sequence_instance_steps')
    .select(`
      id, instance_id, template_step_id, step_order, channel,
      scheduled_at, executed_at, status, error_message, message_sent,
      sequence_instances!inner (
        id, user_id, prospect_id, status, template_id
      )
    `)
    .lte('scheduled_at', new Date().toISOString())
    .eq('status', 'pending')
    .eq('sequence_instances.status', 'active')
    .limit(50)

  if (fetchErr) return apiError(fetchErr.message)
  if (!dueSteps || dueSteps.length === 0) {
    return apiSuccess({ processed: 0, results: [] })
  }

  const results: Array<{ step_id: string; user_id: string; status: string; error?: string }> = []

  for (const rawStep of dueSteps) {
    const instance = rawStep.sequence_instances as any
    const userId = instance?.user_id as string

    const channel = rawStep.channel as SequenceChannel
    if (channel === 'whatsapp' || channel === 'linkedin') {
      await supabase
        .from('sequence_instance_steps')
        .update({
          status: 'skipped',
          executed_at: new Date().toISOString(),
          error_message: 'Canal client-only — action manuelle requise',
        })
        .eq('id', rawStep.id)
      results.push({ step_id: rawStep.id, user_id: userId, status: 'skipped' })
      continue
    }

    const { data: prospect } = await supabase
      .from('prospects')
      .select('id, full_name, phone, phone_normalized, email, pipeline_stage, linkedin_url, profession, city')
      .eq('id', instance.prospect_id)
      .single()

    if (!prospect) {
      await supabase.from('sequence_instance_steps').update({
        status: 'failed', error_message: 'Prospect introuvable',
      }).eq('id', rawStep.id)
      results.push({ step_id: rawStep.id, user_id: userId, status: 'failed', error: 'Prospect introuvable' })
      continue
    }

    const { data: templateStep } = await supabase
      .from('sequence_template_steps')
      .select('message_template')
      .eq('id', rawStep.template_step_id)
      .single()

    const step: SequenceInstanceStep = {
      id: rawStep.id,
      instance_id: rawStep.instance_id,
      template_step_id: rawStep.template_step_id,
      step_order: rawStep.step_order,
      channel,
      scheduled_at: rawStep.scheduled_at,
      executed_at: rawStep.executed_at,
      status: rawStep.status as any,
      error_message: rawStep.error_message,
      message_sent: rawStep.message_sent,
    }

    const prospectTyped: ProspectForSequence = {
      id: prospect.id,
      full_name: prospect.full_name,
      phone: prospect.phone,
      phone_normalized: prospect.phone_normalized,
      email: prospect.email,
      pipeline_stage: prospect.pipeline_stage,
      linkedin_url: prospect.linkedin_url,
    }

    const res = await executeStep({
      supabase,
      userId,
      step,
      prospect: prospectTyped,
      messageTemplate: templateStep?.message_template ?? null,
      prospectExtra: { profession: prospect.profession, city: prospect.city },
    })

    results.push({ step_id: rawStep.id, user_id: userId, status: res.status, error: res.error })
  }

  const userIds = [...new Set(results.map(r => r.user_id).filter(Boolean))]
  for (const uid of userIds) {
    const userResults = results.filter(r => r.user_id === uid)
    await logCronRun({
      userId: uid,
      jobName: 'sequences-process',
      status: userResults.some(r => r.status === 'failed') ? 'error' : 'success',
      details: {
        processed: userResults.length,
        sent: userResults.filter(r => r.status === 'sent').length,
        failed: userResults.filter(r => r.status === 'failed').length,
        skipped: userResults.filter(r => r.status === 'skipped').length,
      },
    })
  }

  return apiSuccess({
    processed: results.length,
    sent: results.filter(r => r.status === 'sent').length,
    failed: results.filter(r => r.status === 'failed').length,
    skipped: results.filter(r => r.status === 'skipped').length,
    results,
  })
}
