import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  try {
    // 1. All nurturing prospects (non-archived)
    const { data: allProspects, error: prospErr } = await supabase
      .from('prospects')
      .select('id, nurturing_category, computed_pressure, nurturing_archived')
      .eq('user_id', user.id)
      .not('nurturing_category', 'is', null)
      .or('nurturing_archived.is.null,nurturing_archived.eq.false')

    if (prospErr) return apiError(prospErr.message)

    const prospects = allProspects || []
    const contacts_actifs = prospects.length

    // taux_conversion: % with nurturing_category = 'rdv_fait'
    const rdvFait = prospects.filter(p => p.nurturing_category === 'rdv_fait').length
    const taux_conversion = contacts_actifs > 0 ? Math.round((rdvFait / contacts_actifs) * 100) : 0

    // score_global: average of computed_pressure (0-10 scale)
    const pressures = prospects.map(p => p.computed_pressure || 0)
    const score_global = contacts_actifs > 0
      ? Math.round((pressures.reduce((a, b) => a + b, 0) / contacts_actifs) * 10) / 10
      : 0

    // 2. All interactions for this user
    const { data: allInteractions, error: intErr } = await supabase
      .from('interactions')
      .select('id, prospect_id, is_honored, occurred_at, created_at')
      .eq('user_id', user.id)

    if (intErr) return apiError(intErr.message)

    const interactions = allInteractions || []

    // taux_reponse: % of interactions with is_honored=true
    const totalInteractions = interactions.length
    const honoredCount = interactions.filter(i => i.is_honored === true).length
    const taux_reponse = totalInteractions > 0 ? Math.round((honoredCount / totalInteractions) * 100) : 0

    // relances_semaine: interactions created in the last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const relances_semaine = interactions.filter(i => {
      const date = new Date(i.created_at || i.occurred_at)
      return date >= sevenDaysAgo
    }).length

    // temps_moyen_reponse: average days between first contact and first honored response per prospect
    const prospectIds = prospects.map(p => p.id)
    const relevantInteractions = interactions.filter(i => prospectIds.includes(i.prospect_id))

    // Group by prospect
    const byProspect: Record<string, typeof interactions> = {}
    for (const inter of relevantInteractions) {
      if (!byProspect[inter.prospect_id]) byProspect[inter.prospect_id] = []
      byProspect[inter.prospect_id].push(inter)
    }

    let totalResponseDays = 0
    let responseCount = 0

    for (const pid of Object.keys(byProspect)) {
      const pInteractions = byProspect[pid].sort((a, b) =>
        new Date(a.occurred_at || a.created_at).getTime() - new Date(b.occurred_at || b.created_at).getTime()
      )

      if (pInteractions.length === 0) continue

      const firstContact = new Date(pInteractions[0].occurred_at || pInteractions[0].created_at)
      const firstHonored = pInteractions.find(i => i.is_honored === true)

      if (firstHonored) {
        const honoredDate = new Date(firstHonored.occurred_at || firstHonored.created_at)
        const diffDays = Math.max(0, Math.floor((honoredDate.getTime() - firstContact.getTime()) / (1000 * 60 * 60 * 24)))
        totalResponseDays += diffDays
        responseCount++
      }
    }

    const temps_moyen_reponse = responseCount > 0 ? Math.round((totalResponseDays / responseCount) * 10) / 10 : 0

    return apiSuccess({
      taux_conversion,
      temps_moyen_reponse,
      score_global,
      contacts_actifs,
      relances_semaine,
      taux_reponse,
    })
  } catch (e: any) {
    return apiError(e.message || 'Erreur calcul KPIs')
  }
}
