import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'
import { z } from 'zod'

const paramsSchema = z.object({ prospectId: z.string().uuid() })

export async function GET(_req: NextRequest, ctx: { params: Promise<{ prospectId: string }> }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const params = await ctx.params
  const parsed = paramsSchema.safeParse(params)
  if (!parsed.success) return apiError('prospectId invalide', 400)

  const { data: instances, error } = await supabase
    .from('sequence_instances')
    .select(`
      id, user_id, prospect_id, template_id, status,
      started_at, paused_at, completed_at, cancelled_at,
      sequence_templates ( name ),
      sequence_instance_steps (
        id, instance_id, template_step_id, step_order, channel,
        scheduled_at, executed_at, status, error_message, message_sent
      )
    `)
    .eq('user_id', user.id)
    .eq('prospect_id', parsed.data.prospectId)
    .order('started_at', { ascending: false })

  if (error) return apiError(error.message)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const normalized = (instances ?? []).map((inst: any) => ({
    id: inst.id,
    user_id: inst.user_id,
    prospect_id: inst.prospect_id,
    template_id: inst.template_id,
    status: inst.status,
    started_at: inst.started_at,
    paused_at: inst.paused_at,
    completed_at: inst.completed_at,
    cancelled_at: inst.cancelled_at,
    template_name: inst.sequence_templates?.name ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    steps: (inst.sequence_instance_steps ?? []).sort(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (a: any, b: any) => a.step_order - b.step_order
    ),
  }))

  return apiSuccess({ instances: normalized })
}
