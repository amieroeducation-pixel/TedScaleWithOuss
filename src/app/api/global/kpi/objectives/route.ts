import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function GET(_request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const year = new Date().getFullYear()

  const { data, error } = await supabase
    .from('kpi_objectives')
    .select('*')
    .eq('user_id', user.id)
    .eq('year', year)
    .maybeSingle()

  if (error) return apiError(error.message, 500)

  return apiSuccess(data)
}

export async function PUT(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const body = await request.json()
  const year = body.year ?? new Date().getFullYear()

  const { data, error } = await supabase
    .from('kpi_objectives')
    .upsert({
      user_id: user.id,
      year,
      obj_appels_annuel: body.obj_appels_annuel,
      obj_contacts_annuel: body.obj_contacts_annuel,
      obj_rdv_pris_annuel: body.obj_rdv_pris_annuel,
      obj_rdv_faits_annuel: body.obj_rdv_faits_annuel,
      obj_propositions_annuel: body.obj_propositions_annuel,
      obj_collecte_annuel: body.obj_collecte_annuel,
      month_intensity: body.month_intensity,
      weeks_per_month: body.weeks_per_month,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,year' })
    .select()
    .single()

  if (error) return apiError(error.message, 500)

  return apiSuccess(data)
}
