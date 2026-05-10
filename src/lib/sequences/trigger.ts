import type { SupabaseLike } from './types'

type TriggerArgs = {
  supabase: SupabaseLike
  userId: string
  prospectId: string
  /** Si fourni : démarrage manuel d'un template précis (SEQ-01). */
  templateId?: string
  /** Si fourni : auto-trigger sur changement de stade (SEQ-02). Cherche un template avec auto_trigger=true et pipeline_stage match. */
  toStage?: string
}

type TriggerResult = {
  instanceId?: string
  error?: string
  /** true si un doublon actif existait — pas d'instance créée */
  alreadyActive?: boolean
}

export async function triggerSequenceForStage(args: TriggerArgs): Promise<TriggerResult> {
  const { supabase, userId, prospectId, templateId, toStage } = args

  // 1. Résoudre le template
  let resolvedTemplateId = templateId
  if (!resolvedTemplateId) {
    if (!toStage) return { error: 'templateId ou toStage requis' }
    const { data: tpl } = await supabase
      .from('sequence_templates')
      .select('id')
      .eq('user_id', userId)
      .eq('pipeline_stage', toStage)
      .eq('auto_trigger', true)
      .limit(1)
      .maybeSingle()
    if (!tpl) return { alreadyActive: false }  // Pas de template auto pour ce stade — non-erreur
    resolvedTemplateId = tpl.id as string
  }

  // 2. Guard doublon (Pitfall 3) — pas d'instance active déjà sur ce prospect+template
  const { data: existing } = await supabase
    .from('sequence_instances')
    .select('id')
    .eq('user_id', userId)
    .eq('prospect_id', prospectId)
    .eq('template_id', resolvedTemplateId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()
  if (existing) return { instanceId: existing.id as string, alreadyActive: true }

  // 3. Charger les steps du template
  const { data: templateSteps, error: stepsErr } = await supabase
    .from('sequence_template_steps')
    .select('id, step_order, channel, delay_days, message_template')
    .eq('template_id', resolvedTemplateId)
    .order('step_order', { ascending: true })
  if (stepsErr) return { error: stepsErr.message }
  if (!templateSteps || templateSteps.length === 0) return { error: 'Template sans étapes' }

  // 4. Créer l'instance
  const startedAt = new Date()
  const { data: instance, error: instErr } = await supabase
    .from('sequence_instances')
    .insert({
      user_id: userId,
      prospect_id: prospectId,
      template_id: resolvedTemplateId,
      status: 'active',
      started_at: startedAt.toISOString(),
    })
    .select('id')
    .single()
  if (instErr || !instance) return { error: instErr?.message || 'Création instance échouée' }

  // 5. Créer les sequence_instance_steps avec scheduled_at = started + delay_days
  const stepsRows = templateSteps.map((s) => {
    const scheduled = new Date(startedAt.getTime() + s.delay_days * 24 * 60 * 60 * 1000)
    return {
      instance_id: instance.id as string,
      template_step_id: s.id,
      step_order: s.step_order,
      channel: s.channel,
      scheduled_at: scheduled.toISOString(),
      status: 'pending',
    }
  })

  const { error: stepsInsErr } = await supabase.from('sequence_instance_steps').insert(stepsRows)
  if (stepsInsErr) return { error: stepsInsErr.message }

  return { instanceId: instance.id as string }
}
