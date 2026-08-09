import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized, apiNotFound } from '@/lib/api'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  // Récupérer le template source
  const { data: sourceTemplate, error: templateError } = await supabase
    .from('sequence_templates')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (templateError) return apiError(templateError.message)
  if (!sourceTemplate) return apiNotFound('Template')

  // Récupérer les steps du template source
  const { data: sourceSteps, error: stepsError } = await supabase
    .from('sequence_template_steps')
    .select('*')
    .eq('template_id', id)
    .order('step_order', { ascending: true })

  if (stepsError) return apiError(stepsError.message)

  // Créer le nouveau template (copie)
  const { data: newTemplate, error: createError } = await supabase
    .from('sequence_templates')
    .insert({
      user_id: user.id,
      name: `${sourceTemplate.name} (Copie)`,
      pipeline_stage: sourceTemplate.pipeline_stage,
      auto_trigger: false, // Désactiver auto_trigger pour la copie
    })
    .select()
    .single()

  if (createError) return apiError(createError.message)
  if (!newTemplate) return apiError('Erreur création copie')

  // Copier les steps si existants
  if (sourceSteps && sourceSteps.length > 0) {
    const newSteps = sourceSteps.map(step => ({
      template_id: newTemplate.id,
      step_order: step.step_order,
      channel: step.channel,
      delay_days: step.delay_days,
      message_template: step.message_template,
    }))

    const { error: insertStepsError } = await supabase
      .from('sequence_template_steps')
      .insert(newSteps)

    if (insertStepsError) return apiError(insertStepsError.message)
  }

  return apiSuccess({ template: newTemplate })
}
