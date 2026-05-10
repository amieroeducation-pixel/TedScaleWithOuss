import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'
import { z } from 'zod'

const moveSchema = z.object({
  prospect_id: z.string().uuid(),
  to_stage: z.enum(['a_contacter', 'rdv1', 'rdv2', 'rdv3', 'converti', 'perdu']),
  notes: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('Invalid JSON body', 400)
  }

  const parsed = moveSchema.safeParse(body)
  if (!parsed.success) {
    return apiError(parsed.error.issues.map((e) => e.message).join(', '), 400)
  }

  const { prospect_id, to_stage, notes } = parsed.data

  // Get current stage
  const { data: prospect } = await supabase
    .from('prospects')
    .select('pipeline_stage')
    .eq('id', prospect_id)
    .single()

  // Update prospect stage
  const { error: updateError } = await supabase
    .from('prospects')
    .update({ pipeline_stage: to_stage, updated_at: new Date().toISOString() })
    .eq('id', prospect_id)

  if (updateError) return apiError(updateError.message)

  // Log pipeline event
  const { error: eventError } = await supabase
    .from('pipeline_events')
    .insert({
      user_id: user.id,
      prospect_id,
      from_stage: prospect?.pipeline_stage || null,
      to_stage,
      notes: notes || null,
    })

  if (eventError) {
    console.error('Failed to log pipeline event:', eventError.message)
    // Non-blocking — stage was updated, just log warning
  }

  return apiSuccess({ prospect_id, to_stage })
}
