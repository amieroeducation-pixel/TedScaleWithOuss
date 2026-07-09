import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'
import { z } from 'zod'

const INTERACTION_TYPES = ['appel', 'rdv1', 'rdv2', 'rdv3', 'email', 'sms', 'whatsapp', 'linkedin', 'interpro', 'autre'] as const

const PostSchema = z.object({
  prospect_id: z.string().uuid(),
  type: z.enum(INTERACTION_TYPES),
  notes: z.string().optional(),
  duration_min: z.number().int().min(0).optional(),
  is_honored: z.boolean().default(true),
  occurred_at: z.string().optional(),
  planned_at: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const prospectId = req.nextUrl.searchParams.get('prospect_id')
  if (!prospectId) return apiError('prospect_id requis', 400)

  const { data, error } = await supabase
    .from('interactions')
    .select('id, type, notes, duration_min, is_honored, occurred_at, created_at')
    .eq('user_id', user.id)
    .eq('prospect_id', prospectId)
    .order('occurred_at', { ascending: false })
    .limit(20)

  if (error) return apiError(error.message)
  return apiSuccess({ interactions: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let body: unknown
  try { body = await req.json() } catch { return apiError('Invalid JSON', 400) }
  const parsed = PostSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400)

  const { prospect_id, type, notes, duration_min, is_honored, occurred_at, planned_at } = parsed.data

  const { data, error } = await supabase
    .from('interactions')
    .insert({
      user_id: user.id,
      prospect_id,
      type,
      notes,
      duration_min,
      is_honored,
      occurred_at: occurred_at ?? new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) return apiError(error.message)

  if (planned_at) {
    await supabase
      .from('prospects')
      .update({ next_action_date: planned_at.split('T')[0], last_contact_at: new Date().toISOString() })
      .eq('id', prospect_id)
      .eq('user_id', user.id)
  } else if (type === 'appel') {
    await supabase
      .from('prospects')
      .update({ last_contact_at: new Date().toISOString() })
      .eq('id', prospect_id)
      .eq('user_id', user.id)
  }

  return apiSuccess({ interaction: data }, 201)
}
