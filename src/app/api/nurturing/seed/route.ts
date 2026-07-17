import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function POST() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  // Créer prospect de test
  const { data: prospect, error: prospectError } = await supabase
    .from('prospects')
    .insert({
      user_id: user.id,
      full_name: 'Jean Dupont',
      email: 'jean.dupont@exemple.fr',
      phone: '0612345678',
      profession: 'Entrepreneur TNS',
      pipeline_stage: 'en_discussion',
      nurturing_category: 'rdv_fait',
      nb_relances_sans_reponse: 0,
      next_action_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      next_action_channel: 'email',
      last_contact_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      total_touchpoints: 8,
      responded_touchpoints: 5,
      notes: 'Prospect test pour démonstration nurturing',
    })
    .select()
    .single()

  if (prospectError && prospectError.code !== '23505') {
    return apiError(prospectError.message)
  }

  if (prospect) {
    // Ajouter interactions de test
    await supabase.from('interactions').insert([
      {
        user_id: user.id,
        prospect_id: prospect.id,
        type: 'email',
        notes: 'Email de suivi envoyé',
        occurred_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        user_id: user.id,
        prospect_id: prospect.id,
        type: 'appel',
        notes: 'Appel téléphonique — intéressé retraite TNS',
        occurred_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        responded_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ])
  }

  return apiSuccess({ created: true, prospect: prospect?.full_name || 'Déjà existant' })
}
