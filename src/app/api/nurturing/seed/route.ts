import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function POST() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  // 1. Créer Jean Test (colonnes de base du schéma 001 uniquement)
  const { data: jeanData, error: jeanError } = await supabase
    .from('prospects')
    .insert({
      user_id: user.id,
      full_name: 'Jean Test',
      email: 'jean.test@exemple.fr',
      phone: '0612345678',
      profession: 'Dentiste',
      company: 'Cabinet Test',
      city: 'Paris',
      linkedin_url: 'https://linkedin.com/in/jean-test',
      pipeline_stage: 'rdv1',
      nurturing_category: 'rdv_fait',
      source: 'recommandation',
      next_action_date: new Date().toISOString().split('T')[0],
      last_contact_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      notes: 'Aime le golf, enfants en études sup, sensible défiscalisation. Préfère qu\'on l\'appelle le matin.',
    })
    .select()
    .single()

  if (jeanError && jeanError.code !== '23505') {
    return apiError(jeanError.message)
  }

  const jeanId = jeanData?.id

  // 2. Historique d'interactions
  if (jeanId) {
    await supabase.from('interactions').insert([
      {
        user_id: user.id,
        prospect_id: jeanId,
        type: 'appel',
        notes: 'Premier appel — intéressé retraite TNS, veut une simulation',
        occurred_at: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
        is_honored: true,
      },
      {
        user_id: user.id,
        prospect_id: jeanId,
        type: 'email',
        notes: 'Envoi simulation retraite TNS + doc SCPI',
        occurred_at: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        user_id: user.id,
        prospect_id: jeanId,
        type: 'rdv1',
        notes: 'RDV cabinet 45min — retraite TNS + prévoyance. Très réceptif.',
        occurred_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        responded_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        user_id: user.id,
        prospect_id: jeanId,
        type: 'email',
        notes: 'Relance post-RDV avec récapitulatif + devis',
        occurred_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        user_id: user.id,
        prospect_id: jeanId,
        type: 'whatsapp',
        notes: 'Micro-relance J+5 — pas de réponse',
        occurred_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        user_id: user.id,
        prospect_id: jeanId,
        type: 'linkedin',
        notes: 'Like + commentaire sur son post entrepreneuriat',
        occurred_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ])
  }

  // 3. Messages PP1/PP2
  const messages = [
    {
      title: 'Relance contextualisée après rencontre',
      channel: 'email',
      subject: 'Suite à notre échange',
      body: "{Prénom}, on a échangé {contexte_lieu} — votre situation en tant que {profession} m'a interpellé. J'ai quelques pistes concrètes sur {besoin_détecté}...",
      tip: "PP1 : Les 2 premières lignes sont décisives. Ancrez dans un contexte réel partagé. Évitez le pitch, créez la curiosité.",
      tag: 'PP1',
      tags: ['pp1', 'premier_contact'],
    },
    {
      title: 'Micro-relance WhatsApp (J+5)',
      channel: 'whatsapp',
      body: "{Prénom}, je reviens vers vous suite à notre échange sur {sujet}. Est-ce que le sujet est toujours d'actualité ? Si ce n'est pas le bon moment, pas de souci.",
      tip: "PP2 : Court, pas intrusif, offre une porte de sortie. Un vocal 30s vaut 10 messages écrits. Max 2 touchpoints/semaine.",
      tag: 'PP2',
      tags: ['pp2', 'relance'],
    },
    {
      title: 'Demande connexion LinkedIn ultra-personnalisée',
      channel: 'linkedin',
      body: "{Prénom}, j'ai vu votre parcours dans {secteur} — particulièrement votre expérience chez {entreprise}. Mon expertise en {domaine} pourrait vous être utile. Connectons-nous ?",
      tip: "PP1 : Pas de pitch dans le message de connexion. L'accroche = reconnaissance + curiosité. Citer un élément concret du profil.",
      tag: 'PP1',
      tags: ['pp1', 'cold_outreach'],
    },
    {
      title: 'Script téléphone post-RDV',
      channel: 'telephone',
      body: "Bonjour {Prénom}, c'est {votre_nom}. On s'est échangé lors de {contexte}. Je vous appelle parce que j'ai finalisé {livrable_promis}. Vous avez 2 minutes ou je vous rappelle ?",
      tip: "PP1 : Identifiez-vous + contexte en 10s. UNE question ouverte. 2 min max si non qualifié. Meilleur créneau : mardi-jeudi 9h-11h30.",
      tag: 'PP1',
      tags: ['pp1', 'telephone', 'chaud'],
    },
    {
      title: 'Email de rupture bienveillant',
      channel: 'email',
      subject: 'Je vous laisse tranquille',
      body: "{Prénom}, je comprends que ce n'est peut-être pas le bon moment pour échanger sur {sujet}. Je vous laisse mes coordonnées si besoin à l'avenir. Belle continuation !",
      tip: "PP2 : Après 6 tentatives sans interaction (froid) ou 3 non-réponses (tiède), STOP propre obligatoire. Préserve la relation long terme.",
      tag: 'PP2',
      tags: ['pp2', 'rupture', 'obligatoire'],
    },
    {
      title: 'Vocal WhatsApp valeur (30s)',
      channel: 'whatsapp',
      body: "[Vocal] Salut {Prénom} ! Écoute, je viens de tomber sur {info_pertinente_secteur} et j'ai pensé à toi direct. Ça pourrait t'intéresser pour {bénéfice_concret}. Dis-moi si tu veux qu'on en parle 2 minutes !",
      tip: "PP1 : Un vocal 30s vaut 10 messages écrits. Ton conversationnel, apport de valeur immédiat. PP2 : Ne jamais spammer WhatsApp, J+5 ou J+10 max.",
      tag: 'PP1+PP2',
      tags: ['pp1', 'pp2', 'whatsapp', 'vocal'],
    },
  ]

  let messagesCreated = 0
  for (const m of messages) {
    const { error } = await supabase
      .from('nurturing_messages')
      .insert({ ...m, user_id: user.id })
    if (!error) messagesCreated++
  }

  // 4. Thèmes (si table existe)
  await supabase.from('nurturing_themes').insert([
    { user_id: user.id, name: 'Retraite TNS', color: '#4ecdc4', icon: '🏦' },
    { user_id: user.id, name: 'Immobilier SCPI', color: '#a78bfa', icon: '🏠' },
    { user_id: user.id, name: 'Défiscalisation', color: '#fbbf24', icon: '📉' },
    { user_id: user.id, name: 'Prévoyance', color: '#ff6470', icon: '🛡️' },
    { user_id: user.id, name: 'Entreprise', color: '#818cf8', icon: '🏢' },
  ])

  return apiSuccess({
    prospect: jeanId ? 'Jean Test créé' : 'existait déjà',
    messages: messagesCreated,
  })
}
