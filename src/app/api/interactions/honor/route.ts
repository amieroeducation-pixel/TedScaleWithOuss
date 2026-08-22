import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server-client'
import { apiSuccess, apiError } from '@/lib/api'

/**
 * PATCH /api/interactions/honor
 * Mark a LinkedIn interaction as honored (is_honored: true)
 */
export async function PATCH(req: NextRequest) {
  const supabase = await createSupabaseServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return apiError('Non authentifié', 401)
  }

  const body = await req.json()
  const { step_id } = body

  if (!step_id) {
    return apiError('step_id requis', 400)
  }

  // Find the interaction associated with this step
  // We need to get the prospect_id from the step first
  const { data: step, error: stepErr } = await supabase
    .from('sequence_instance_steps')
    .select('instance_id, sequence_instances!inner(prospect_id)')
    .eq('id', step_id)
    .single()

  if (stepErr || !step) {
    return apiError('Étape introuvable', 404)
  }

  const prospectId = (step.sequence_instances as any).prospect_id

  // Update the most recent LinkedIn interaction for this prospect to is_honored: true
  const { error: updateErr } = await supabase
    .from('interactions')
    .update({ is_honored: true })
    .eq('user_id', user.id)
    .eq('prospect_id', prospectId)
    .eq('type', 'linkedin')
    .eq('is_honored', false)
    .order('occurred_at', { ascending: false })
    .limit(1)

  if (updateErr) {
    return apiError(updateErr.message, 500)
  }

  return apiSuccess({ message: 'Interaction honorée' })
}
