// src/app/api/today/kpis/route.ts
import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function GET(_request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const today = new Date().toISOString().split('T')[0]

  const [kpiRes, settingsRes] = await Promise.all([
    supabase
      .from('daily_kpis')
      .select('contacts, calls, rdv1, rdv2, blocks')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle(),
    supabase
      .from('user_settings')
      .select('daily_targets')
      .eq('id', user.id)
      .maybeSingle(),
  ])

  const kpi = kpiRes.data ?? { contacts: 0, calls: 0, rdv1: 0, rdv2: 0, blocks: 0 }
  const targets = settingsRes.data?.daily_targets ?? { contacts: 10, calls: 20, rdv1: 5, rdv2: 3 }

  return apiSuccess({ kpi, targets })
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let body: { contacts?: number; calls?: number; rdv1?: number; rdv2?: number; blocks?: number }
  try { body = await request.json() } catch { return apiError('Corps invalide', 400) }

  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

  const { error } = await supabase
    .from('daily_kpis')
    .upsert(
      {
        user_id:  user.id,
        date:     today,
        contacts: body.contacts ?? 0,
        calls:    body.calls    ?? 0,
        rdv1:     body.rdv1    ?? 0,
        rdv2:     body.rdv2    ?? 0,
        blocks:   body.blocks  ?? 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,date' }
    )

  if (error) return apiError(error.message, 500)
  return apiSuccess({ saved: true })
}
