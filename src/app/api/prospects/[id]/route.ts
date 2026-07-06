import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized, apiNotFound } from '@/lib/api'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { id } = await params
  const { data, error } = await supabase
    .from('prospects')
    .select(`*, interactions(*)`)
    .eq('id', id)
    .single()

  if (error || !data) return apiNotFound('Prospect')
  return apiSuccess(data)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { id } = await params
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return apiError('Invalid JSON body', 400)
  }

  // Récupère stage actuel avant update pour audit trail
  const { data: oldProspect } = await supabase
    .from('prospects')
    .select('pipeline_stage, full_name')
    .eq('id', id)
    .single()

  const { data, error } = await supabase
    .from('prospects')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) return apiError(error.message)
  if (!data) return apiNotFound('Prospect')

  // Audit trail: log interaction si stage change (fire-and-forget)
  if (oldProspect && 'pipeline_stage' in body && body.pipeline_stage !== oldProspect.pipeline_stage) {
    void supabase.from('interactions').insert({
      user_id: user.id,
      prospect_id: id,
      type: body.pipeline_stage as string,
      occurred_at: new Date().toISOString(),
      notes: `Stage changé: ${oldProspect.pipeline_stage} → ${body.pipeline_stage}`,
    })
  }

  return apiSuccess(data)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { id } = await params
  const { error } = await supabase
    .from('prospects')
    .delete()
    .eq('id', id)

  if (error) return apiError(error.message)
  return apiSuccess({ deleted: true })
}
