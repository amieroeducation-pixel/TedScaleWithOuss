// src/app/api/today/relances/route.ts
import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

/**
 * Relances du jour — stored in `tasks` table with badge='relance'
 * Mapping:
 *   title          → name
 *   priority       → priority (1-3)
 *   estimated_time → relance status (arappeler, appelee, replanifier, terminee)
 *   description    → note
 *   col            → 'todo' (active) or 'done' (terminee) — satisfies DB CHECK constraint
 *   badge          → 'relance' (discriminator)
 *   this_week      → true
 */

const VALID_STATUSES = ['arappeler', 'appelee', 'replanifier', 'terminee']

function statusToCol(status: string): string {
  return status === 'terminee' ? 'done' : 'todo'
}

export async function GET(_request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .eq('badge', 'relance')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) return apiError(error.message, 500)

  // Map DB rows to relance shape
  const relances = (data ?? []).map(row => ({
    id: row.id,
    name: row.title,
    priority: Math.min(3, Math.max(1, row.priority)) as 1 | 2 | 3,
    status: VALID_STATUSES.includes(row.estimated_time) ? row.estimated_time : 'arappeler',
    note: row.description || undefined,
  }))

  return apiSuccess(relances)
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let body: { name: string; priority?: number; note?: string; status?: string }
  try { body = await request.json() } catch { return apiError('Corps invalide', 400) }

  if (!body.name?.trim()) return apiError('name requis', 400)

  const status = body.status && VALID_STATUSES.includes(body.status) ? body.status : 'arappeler'
  const priority = Math.min(3, Math.max(1, body.priority ?? 1))

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: user.id,
      title: body.name.trim(),
      description: body.note?.trim() ?? '',
      priority,
      col: statusToCol(status),
      estimated_time: status,
      badge: 'relance',
      urgency: priority === 3 ? 'urgent' : 'normal',
      this_week: true,
    })
    .select()
    .single()

  if (error) return apiError(error.message, 500)

  return apiSuccess({
    id: data.id,
    name: data.title,
    priority: data.priority as 1 | 2 | 3,
    status: VALID_STATUSES.includes(data.estimated_time) ? data.estimated_time : 'arappeler',
    note: data.description || undefined,
  }, 201)
}

export async function PATCH(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let body: { id: string; status?: string; priority?: number; note?: string }
  try { body = await request.json() } catch { return apiError('Corps invalide', 400) }

  if (!body.id) return apiError('id requis', 400)

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.status && VALID_STATUSES.includes(body.status)) {
    updates.estimated_time = body.status
    updates.col = statusToCol(body.status)
  }
  if (body.priority !== undefined) {
    updates.priority = Math.min(3, Math.max(1, body.priority))
    updates.urgency = body.priority >= 3 ? 'urgent' : 'normal'
  }
  if (body.note !== undefined) updates.description = body.note

  const { error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', body.id)
    .eq('user_id', user.id)
    .eq('badge', 'relance')

  if (error) return apiError(error.message, 500)
  return apiSuccess({ updated: true })
}
