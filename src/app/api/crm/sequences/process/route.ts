import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'
import { executeStep } from '@/lib/sequences/executor'
import type { SequenceInstanceStep, ProspectForSequence, SequenceChannel } from '@/lib/sequences/types'

export async function GET(_req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  // Récupérer les étapes dues non exécutées de ce user
  // scheduled_at <= now() ET status='pending' ET instance status='active'
  const { data: dueSteps, error: fetchErr } = await supabase
    .from('sequence_instance_steps')
    .select(`
      id, instance_id, template_step_id, step_order, channel,
      scheduled_at, executed_at, status, error_message, message_sent,
      sequence_instances!inner (
        id, user_id, prospect_id, status,
        sequence_template_steps!sequence_instance_steps_template_step_id_fkey (
          message_template
        )
      )
    `)
    .lte('scheduled_at', new Date().toISOString())
    .eq('status', 'pending')
    .eq('sequence_instances.user_id', user.id)
    .eq('sequence_instances.status', 'active')
    .limit(50) // sécurité : max 50 par run (T-02E-03)

  if (fetchErr) return apiError(fetchErr.message)
  if (!dueSteps || dueSteps.length === 0) {
    return apiSuccess({ processed: 0, results: [] })
  }

  const results: Array<{ step_id: string; status: string; error?: string }> = []

  for (const rawStep of dueSteps) {
    const instance = rawStep.sequence_instances as any
    const templateStep = (instance?.sequence_template_steps) as any

    // Canaux client-only : marquer skipped sans erreur (Pitfall 2 RESEARCH)
    const channel = rawStep.channel as SequenceChannel
    if (channel === 'whatsapp' || channel === 'linkedin') {
      await supabase
        .from('sequence_instance_steps')
        .update({
          status: 'skipped',
          executed_at: new Date().toISOString(),
          error_message: 'Canal client-only — action manuelle requise dans le drawer',
        })
        .eq('id', rawStep.id)
      results.push({ step_id: rawStep.id, status: 'skipped' })
      continue
    }

    // Charger le prospect
    const { data: prospect } = await supabase
      .from('prospects')
      .select('id, full_name, phone, phone_normalized, email, pipeline_stage, linkedin_url')
      .eq('id', instance.prospect_id)
      .single()

    if (!prospect) {
      await supabase.from('sequence_instance_steps').update({
        status: 'failed', error_message: 'Prospect introuvable',
      }).eq('id', rawStep.id)
      results.push({ step_id: rawStep.id, status: 'failed', error: 'Prospect introuvable' })
      continue
    }

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
      userId: user.id,
      step,
      prospect: prospectTyped,
      messageTemplate: templateStep?.message_template ?? null,
    })

    results.push({ step_id: rawStep.id, status: res.status, error: res.error })
  }

  return apiSuccess({
    processed: results.length,
    sent: results.filter(r => r.status === 'sent').length,
    failed: results.filter(r => r.status === 'failed').length,
    skipped: results.filter(r => r.status === 'skipped').length,
    results,
  })
}
