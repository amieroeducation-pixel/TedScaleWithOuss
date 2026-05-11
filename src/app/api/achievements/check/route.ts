import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiUnauthorized } from '@/lib/api'
import { Achievement, CLIENT_MILESTONES, MONTH_LABELS_FR } from '@/types/achievements'

export async function POST(_request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  // Récupérer CA du mois courant depuis v_monthly_revenue
  const { data: revenueRow } = await supabase
    .from('v_monthly_revenue')
    .select('revenue')
    .eq('user_id', user.id)
    .eq('year', year)
    .eq('month_num', month)
    .single()

  // Récupérer objectif mensuel depuis revenue_objectives (fallback user_settings)
  const { data: objRow } = await supabase
    .from('revenue_objectives')
    .select('amount')
    .eq('user_id', user.id)
    .eq('year', year)
    .eq('month', month)
    .is('product_type', null)
    .single()

  const { data: settingsRow } = await supabase
    .from('user_settings')
    .select('ca_monthly_target')
    .eq('id', user.id)
    .single()

  // Récupérer count clients
  const { count: clientCount } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const caCurrentMonth = Number(revenueRow?.revenue ?? 0)
  const caTarget = Number(objRow?.amount ?? settingsRow?.ca_monthly_target ?? 15000)
  const clients = clientCount ?? 0

  const newAchievements: Achievement[] = []

  // Vérifier objectif CA mensuel (ACH-01, ACH-02)
  if (caCurrentMonth >= caTarget && caTarget > 0) {
    const key = `ca_monthly_${year}_${String(month).padStart(2, '0')}`
    const label = `Objectif CA ${MONTH_LABELS_FR[month - 1]} ${year} atteint`
    const { data } = await supabase
      .from('achievements')
      .upsert(
        { user_id: user.id, achievement_key: key, achievement_type: 'ca_monthly', label, value: caCurrentMonth, target: caTarget },
        { onConflict: 'user_id,achievement_key', ignoreDuplicates: true }
      )
      .select()
      .single()
    // data === null si doublon (ignoreDuplicates retourne null quand pas d'insert)
    if (data) newAchievements.push(data as Achievement)
  }

  // Vérifier seuils clients actifs (ACH-03)
  for (const milestone of CLIENT_MILESTONES) {
    if (clients >= milestone) {
      const key = `clients_${milestone}`
      const label = `${milestone} clients actifs`
      const { data } = await supabase
        .from('achievements')
        .upsert(
          { user_id: user.id, achievement_key: key, achievement_type: 'clients_milestone', label, value: clients, target: milestone },
          { onConflict: 'user_id,achievement_key', ignoreDuplicates: true }
        )
        .select()
        .single()
      if (data) newAchievements.push(data as Achievement)
    }
  }

  return apiSuccess({ newAchievements })
}
