import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized, apiNotFound } from '@/lib/api'
import { z } from 'zod'

const paramsSchema = z.object({ instanceId: z.string().uuid() })
const patchSchema = z.object({ action: z.enum(['pause', 'resume', 'cancel']) })

export async function GET(_req: NextRequest, ctx: { params: Promise<{ instanceId: string }> }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const params = await ctx.params
  const parsed = paramsSchema.safeParse(params)
  if (!parsed.success) return apiError('instanceId invalide', 400)

  const { data: instance, error } = await supabase
    .from('sequence_instances')
    .select(`
      id, status, started_at, paused_at, cancelled_at, completed_at,
      sequence_instance_steps ( id, step_order, channel, scheduled_at, executed_at, status, error_message )
    `)
    .eq('id', parsed.data.instanceId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return apiError(error.message)
  if (!instance) return apiNotFound('Instance')
  return apiSuccess(instance)
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ instanceId: string }> }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const params = await ctx.params
  const paramsParsed = paramsSchema.safeParse(params)
  if (!paramsParsed.success) return apiError('instanceId invalide', 400)

  let body: unknown
  try { body = await request.json() } catch { return apiError('Invalid JSON body', 400) }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues.map((e) => e.message).join(', '), 400)

  const nowIso = new Date().toISOString()
  let update: Record<string, unknown> = {}
  if (parsed.data.action === 'pause') update = { status: 'paused', paused_at: nowIso }
  if (parsed.data.action === 'resume') update = { status: 'active', paused_at: null }
  if (parsed.data.action === 'cancel') update = { status: 'cancelled', cancelled_at: nowIso }

  const { data: updated, error } = await supabase
    .from('sequence_instances')
    .update(update)
    .eq('id', paramsParsed.data.instanceId)
    .eq('user_id', user.id)
    .select('id, status')
    .maybeSingle()

  if (error) return apiError(error.message)
  if (!updated) return apiNotFound('Instance')
  return apiSuccess({ instance_id: updated.id, status: updated.status })
}
