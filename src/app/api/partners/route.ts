import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function GET(_request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true })
  if (error) return apiError(error.message, 500)
  return apiSuccess(data ?? [])
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let body: Record<string, unknown>
  try { body = await request.json() } catch { return apiError('Corps invalide', 400) }

  if (!String(body.full_name ?? '').trim()) return apiError('full_name requis', 400)

  const { data, error } = await supabase
    .from('partners')
    .insert({
      user_id: user.id,
      full_name: String(body.full_name).trim(),
      short_name: String(body.short_name ?? '').trim(),
      role: String(body.role ?? ''),
      location: String(body.location ?? ''),
      badge: Number(body.badge ?? 0),
      pressure: String(body.pressure ?? 'low'),
      days_since: Number(body.days_since ?? 0),
      clients: Number(body.clients ?? 0),
      notes: Array.isArray(body.notes) ? body.notes : [],
      action: String(body.action ?? ''),
      mobile: String(body.mobile ?? ''),
      email: String(body.email ?? ''),
      linkedin: String(body.linkedin ?? ''),
      cabinet: String(body.cabinet ?? ''),
      city: String(body.city ?? ''),
      fonction: String(body.fonction ?? ''),
      img: String(body.img ?? ''),
      orbital_top: body.orbital_top ? String(body.orbital_top) : null,
      orbital_bottom: body.orbital_bottom ? String(body.orbital_bottom) : null,
      orbital_left: body.orbital_left ? String(body.orbital_left) : null,
      orbital_right: body.orbital_right ? String(body.orbital_right) : null,
      sort_order: Number(body.sort_order ?? 0),
    })
    .select()
    .single()
  if (error) return apiError(error.message, 500)
  return apiSuccess(data, 201)
}
