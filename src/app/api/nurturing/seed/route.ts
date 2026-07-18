import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function POST() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  // 3 contacts exacts du HTML
  const prospects = [
    {
      full_name: 'Jean Dupont',
      email: 'jean.dupont@exemple.fr',
      phone: '0612345678',
      profession: 'Dentiste',
      pipeline_stage: 'en_discussion',
      nurturing_category: 'rdv_fait',
      nb_relances_sans_reponse: 3,
      next_action_date: new Date().toISOString().split('T')[0],
      next_action_channel: 'telephone',
      last_contact_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      full_name: 'Pierre Martin',
      email: 'pierre.martin@exemple.fr',
      phone: '0623456789',
      profession: 'Pharmacien',
      pipeline_stage: 'rdv2',
      nurturing_category: 'rdv_fait',
      nb_relances_sans_reponse: 0,
      next_action_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      next_action_channel: 'email',
      last_contact_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      full_name: 'Marie Laurent',
      email: 'marie.laurent@exemple.fr',
      phone: '0634567890',
      profession: 'Avocate',
      pipeline_stage: 'en_discussion',
      nurturing_category: 'rdv_fait',
      nb_relances_sans_reponse: 0,
      next_action_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      next_action_channel: 'whatsapp',
      last_contact_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ]

  // 8 messages pré-enregistrés exacts du HTML
  const messages = [
    {
      title: 'Relance retraite TNS - Projections finalisées',
      channel: 'email',
      subject: 'Vos projections retraite TNS',
      body: "Jean, suite a notre echange sur votre retraite TNS, j'ai finalise les projections. Avez-vous 5 minutes cette semaine pour qu'on en discute ?",
      tags: ['retraite', 'tns'],
    },
    {
      title: 'Envoi simulateur retraite TNS',
      channel: 'email',
      subject: 'Simulateur retraite TNS',
      body: "Jean, je vous envoie le simulateur retraite TNS dont on a parle. Les chiffres sont parlants — appelez-moi si vous avez des questions.",
      tags: ['retraite', 'tns', 'simulateur'],
    },
    {
      title: 'Relance douce retraite',
      channel: 'email',
      subject: 'Suivi retraite',
      body: "Jean, je me permets de revenir vers vous. Le sujet retraite est-il toujours d'actualite ? Je reste dispo.",
      tags: ['retraite', 'relance'],
    },
    {
      title: 'Guide SCPI 2026',
      channel: 'email',
      subject: 'Guide SCPI 2026',
      body: "Jean, voici le guide SCPI 2026 qui pourrait vous interesser dans le cadre de votre projet immobilier.",
      tags: ['immobilier', 'scpi'],
    },
    {
      title: 'Relance investissement immobilier',
      channel: 'email',
      subject: 'Nouvelles opportunités immobilier',
      body: "Jean, ou en etes-vous dans votre reflexion sur l'investissement immobilier ? De nouvelles opportunites se presentent.",
      tags: ['immobilier'],
    },
    {
      title: 'Optimisation fiscale fin d\'année',
      channel: 'email',
      subject: 'Optimisation fiscale',
      body: "Jean, nous approchons de la fin d'annee — c'est le moment ideal pour optimiser votre fiscalite.",
      tags: ['fiscalite'],
    },
    {
      title: 'Infographie Girardin',
      channel: 'email',
      subject: 'Girardin - Infographie',
      body: "Jean, cette infographie resume parfaitement les avantages du Girardin pour votre profil.",
      tags: ['girardin', 'fiscalite'],
    },
    {
      title: 'Relance prévoyance',
      channel: 'email',
      subject: 'Volet prévoyance',
      body: "Jean, suite a notre echange, je souhaitais revenir sur le volet prevoyance de votre protection.",
      tags: ['prevoyance'],
    },
  ]

  const created = []

  // Créer les prospects
  for (const p of prospects) {
    const { data, error } = await supabase
      .from('prospects')
      .insert({ ...p, user_id: user.id })
      .select()
      .single()

    if (!error || error.code === '23505') {
      created.push(p.full_name)
      if (data) {
        await supabase.from('interactions').insert([
          {
            user_id: user.id,
            prospect_id: data.id,
            type: 'email',
            notes: 'Relance post-RDV',
            occurred_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            user_id: user.id,
            prospect_id: data.id,
            type: 'appel',
            notes: 'Premier contact téléphonique',
            occurred_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            responded_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ])
      }
    }
  }

  // Créer les messages pré-enregistrés
  let messagesCreated = 0
  for (const m of messages) {
    const { error } = await supabase
      .from('nurturing_messages')
      .insert({ ...m, user_id: user.id })

    if (!error || error.code === '23505') {
      messagesCreated++
    }
  }

  return apiSuccess({
    prospects: created.length,
    messages: messagesCreated,
    names: created
  })
}
