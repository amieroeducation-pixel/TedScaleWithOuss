import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'
import { z } from 'zod'
import { triggerSequenceForStage } from '@/lib/sequences/trigger'

const startSchema = z.object({
  prospect_id: z.string().uuid(),
  template_id: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let body: unknown
  try { body = await request.json() } catch { return apiError('Invalid JSON body', 400) }

  const parsed = startSchema.safeParse(body)
  if (!parsed.success) {
    return apiError(parsed.error.issues.map((e) => e.message).join(', '), 400)
  }

  const result = await triggerSequenceForStage({
    supabase,
    userId: user.id,
    prospectId: parsed.data.prospect_id,
    templateId: parsed.data.template_id,
  })

  if (result.error) return apiError(result.error)
  return apiSuccess({
    instance_id: result.instanceId,
    already_active: result.alreadyActive ?? false,
  })
}
