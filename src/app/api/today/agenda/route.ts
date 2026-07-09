// src/app/api/today/agenda/route.ts
import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'
import { todayParis } from '@/lib/date-utils'

/**
 * Agenda events — stored in `tasks` table with badge='agenda'
 * Mapping:
 *   title          → event title
 *   estimated_time → time (HH:MM)
 *   description    → "dateKey|eventType" (e.g. "2026-07-03|rdv")
 *   urgency        → 'normal' (fixed, due to CHECK constraint)
 *   col            → 'todo' (fixed)
 */

const VALID_TYPES = ['rdv', 'bloc', 'tache', 'sport', 'commerce', 'interpro', 'autre']

function encodeDesc(dateKey: string, eventType: string): string {
  return `${dateKey}|${eventType}`
}

function decodeDesc(desc: string): { dateKey: string; eventType: string } {
  const parts = desc.split('|')
  return { dateKey: parts[0] || '', eventType: parts[1] || 'autre' }
}

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  // Get date from query params, default to today
  const { searchParams } = new URL(request.url)
  const dateKey = searchParams.get('date') ?? todayParis()

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .eq('badge', 'agenda')
    .like('description', `${dateKey}|%`)
    .order('estimated_time', { ascending: true })

  if (error) return apiError(error.message, 500)

  const events = (data ?? []).map(row => {
    const { eventType } = decodeDesc(row.description || '')
    return {
      id: row.id,
      time: row.estimated_time || '09:00',
      title: row.title,
      type: VALID_TYPES.includes(eventType) ? eventType : 'autre',
    }
  })

  return apiSuccess(events)
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let body: { title: string; time: string; type?: string; date?: string }
  try { body = await request.json() } catch { return apiError('Corps invalide', 400) }

  if (!body.title?.trim()) return apiError('title requis', 400)
  if (!body.time) return apiError('time requis', 400)

  const eventType = body.type && VALID_TYPES.includes(body.type) ? body.type : 'autre'
  const dateKey = body.date ?? todayParis()

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: user.id,
      title: body.title.trim(),
      estimated_time: body.time,
      description: encodeDesc(dateKey, eventType),
      badge: 'agenda',
      urgency: 'normal',
      priority: 2,
      col: 'todo',
      this_week: true,
    })
    .select()
    .single()

  if (error) return apiError(error.message, 500)

  const { eventType: storedType } = decodeDesc(data.description || '')
  return apiSuccess({
    id: data.id,
    time: data.estimated_time,
    title: data.title,
    type: storedType,
  }, 201)
}

export async function DELETE(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return apiError('id requis', 400)

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('badge', 'agenda')

  if (error) return apiError(error.message, 500)
  return apiSuccess({ deleted: true })
}
