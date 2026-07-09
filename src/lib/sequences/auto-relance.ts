import type { SupabaseLike } from './types'

/**
 * Planifie automatiquement une relance J+delayDays après un step exécuté,
 * si aucun step n'est déjà prévu dans les 7 prochains jours.
 * Évite de spammer le prospect avec des relances multiples.
 */
export async function scheduleAutoRelance(params: {
  supabase: SupabaseLike
  instanceId: string
  prospectId: string
  lastChannel: 'email' | 'sms' | 'whatsapp'
  delayDays?: number // default 3
}): Promise<void> {
  const { supabase, instanceId, prospectId, lastChannel, delayDays = 3 } = params

  try {
    // 1. Vérifier s'il existe déjà un step pending dans les 7 prochains jours
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: existingSteps } = await supabase
      .from('sequence_instance_steps')
      .select('id')
      .eq('instance_id', instanceId)
      .eq('status', 'pending')
      .lte('scheduled_at', sevenDaysFromNow)
      .limit(1)

    // Si un step est déjà planifié, ne pas ajouter de relance auto
    if (existingSteps && existingSteps.length > 0) {
      return
    }

    // 2. Récupérer le max step_order pour cette instance
    const { data: maxStepData } = await supabase
      .from('sequence_instance_steps')
      .select('step_order')
      .eq('instance_id', instanceId)
      .order('step_order', { ascending: false })
      .limit(1)
      .single()

    const nextStepOrder = (maxStepData?.step_order ?? 0) + 1

    // 3. Message de relance générique
    const messageTemplate =
      'Bonjour {{prenom}}, je me permets de revenir vers vous. Mon message précédent concernait une opportunité patrimoniale qui pourrait vous intéresser. Avez-vous eu le temps d\'y réfléchir ? Bonne journée.'

    // 4. Insérer le nouveau step de relance
    const scheduledAt = new Date(Date.now() + delayDays * 24 * 60 * 60 * 1000).toISOString()

    await supabase.from('sequence_instance_steps').insert({
      instance_id: instanceId,
      step_order: nextStepOrder,
      channel: lastChannel,
      message_template: messageTemplate,
      scheduled_at: scheduledAt,
      status: 'pending',
    })
  } catch (e) {
    // Ne pas faire échouer l'exécution principale si la relance auto échoue
    console.error('[scheduleAutoRelance] Erreur lors de la planification de la relance auto:', e)
  }
}
