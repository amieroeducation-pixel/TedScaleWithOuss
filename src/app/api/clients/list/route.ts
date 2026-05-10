import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export type ClientListRow = {
  id: string
  prospect_id: string | null
  total_aum: number
  last_interaction_at: string | null
  alert_threshold_days: number
  notes: string | null
  created_at: string
  full_name: string
  profession: string | null
  city: string | null
  phone: string | null
  email: string | null
  pipeline_stage: string | null
  tags: string[]
  days_without_contact: number | null
}

export async function GET(_request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { data, error } = await supabase
    .from('clients')
    .select(`
      id, prospect_id, total_aum, last_interaction_at, alert_threshold_days, notes, created_at,
      prospects(full_name, profession, city, phone, email, pipeline_stage, tags)
    `)
    .eq('user_id', user.id)
    .order('last_interaction_at', { ascending: true, nullsFirst: true })

  if (error) return apiError(error.message)

  const now = Date.now()
  const rows: ClientListRow[] = (data ?? []).map((c: any) => {
    const p = Array.isArray(c.prospects) ? c.prospects[0] : c.prospects
    const last = c.last_interaction_at ? new Date(c.last_interaction_at).getTime() : null
    return {
      id: c.id,
      prospect_id: c.prospect_id,
      total_aum: Number(c.total_aum) || 0,
      last_interaction_at: c.last_interaction_at,
      alert_threshold_days: c.alert_threshold_days ?? 90,
      notes: c.notes,
      created_at: c.created_at,
      full_name: p?.full_name ?? 'Client sans nom',
      profession: p?.profession ?? null,
      city: p?.city ?? null,
      phone: p?.phone ?? null,
      email: p?.email ?? null,
      pipeline_stage: p?.pipeline_stage ?? null,
      tags: p?.tags ?? [],
      days_without_contact: last ? Math.floor((now - last) / 86400000) : null,
    }
  })

  const totalAum = rows.reduce((s, r) => s + r.total_aum, 0)

  return apiSuccess({ clients: rows, count: rows.length, totalAum })
}
