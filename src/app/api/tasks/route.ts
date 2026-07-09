import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function GET(_request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  if (error) return apiError(error.message, 500)
  return apiSuccess(data ?? [])
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let body: {
    title: string
    description?: string
    priority?: number
    col?: string
    estimated_time?: string
    badge?: string
    urgency?: string
    this_week?: boolean
  }
  try { body = await request.json() } catch { return apiError('Corps invalide', 400) }

  if (!body.title?.trim()) return apiError('title requis', 400)

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: user.id,
      title: body.title.trim(),
      description: body.description ?? '',
      priority: body.priority ?? 2,
      col: body.col ?? 'todo',
      estimated_time: body.estimated_time ?? '',
      badge: body.badge ?? '',
      urgency: body.urgency ?? 'normal',
      this_week: body.this_week ?? false,
    })
    .select()
    .single()
  if (error) return apiError(error.message, 500)
  return apiSuccess(data, 201)
}
