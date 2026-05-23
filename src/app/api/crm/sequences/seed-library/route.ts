import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

const LIBRARY = [
  {
    name: 'Post-premier contact TNS',
    steps: [
      { channel: 'email', delay_days: 0, message_template: 'Objet : Suite à notre échange — Introduction cabinet CGP' },
      { channel: 'whatsapp', delay_days: 2, message_template: "Bonjour {Prénom}, j'espère que mon email vous a bien..." },
      { channel: 'email', delay_days: 5, message_template: 'Les TNS et la fiscalité 2026 — ce qui change pour vous' },
      { channel: 'sms', delay_days: 7, message_template: "Bonjour {Prénom}, avez-vous pu consulter mon email ?" },
      { channel: 'linkedin', delay_days: 10, message_template: 'InMail LinkedIn : Bonjour {Prénom}, je me permets...' },
      { channel: 'email', delay_days: 14, message_template: 'Dernière tentative — Proposition RDV découverte 20min' },
    ],
  },
  {
    name: 'Relance post-RDV 1 sans réponse',
    steps: [
      { channel: 'email', delay_days: 3, message_template: 'Suite à notre RDV — les points que nous avons abordés' },
      { channel: 'whatsapp', delay_days: 6, message_template: "Bonjour {Prénom}, avez-vous eu le temps de réfléchir ?" },
      { channel: 'sms', delay_days: 10, message_template: "Bonjour {Prénom}, je reste disponible pour un 2e RDV" },
      { channel: 'email', delay_days: 15, message_template: 'Étude personnalisée prête — souhaitez-vous la recevoir ?' },
    ],
  },
  {
    name: 'Confirmation RDV automatique',
    steps: [
      { channel: 'email', delay_days: 0, message_template: 'Confirmation RDV + adresse + documents à préparer' },
      { channel: 'whatsapp', delay_days: 0, message_template: "Rappel RDV demain à {Heure} — confirmez avec 👍" },
      { channel: 'sms', delay_days: 0, message_template: "Bonjour {Prénom}, RDV aujourd'hui à {Heure}. À tout !" },
    ],
  },
  {
    name: 'Constituer votre épargne TNS',
    steps: [
      { channel: 'email', delay_days: 0, message_template: 'Objet : 3 min pour comparer votre épargne' },
      { channel: 'whatsapp', delay_days: 2, message_template: "Bonjour {Prénom}, j'ai envoyé une proposition de diagnostic patrimonial gratuit." },
      { channel: 'email', delay_days: 5, message_template: 'Objet : Comment un {Profession} a multiplié son rendement par 3' },
      { channel: 'sms', delay_days: 8, message_template: "Bonjour {Prénom}, je reste dispo pour un échange rapide sur votre épargne." },
      { channel: 'email', delay_days: 14, message_template: "Objet : Je ne vais plus vous solliciter" },
    ],
  },
  {
    name: 'Valoriser votre patrimoine',
    steps: [
      { channel: 'email', delay_days: 0, message_template: "Objet : Vous venez de libérer 1 500 €/mois. Et maintenant ?" },
      { channel: 'whatsapp', delay_days: 3, message_template: "Bonjour {Prénom}, ma proposition de modélisation vous intéresse ?" },
      { channel: 'email', delay_days: 7, message_template: "Objet : Exemple pour un {Profession} à {Ville}" },
      { channel: 'linkedin', delay_days: 10, message_template: "Bonjour {Prénom}, j'aide des {Profession} à optimiser leur capacité de placement." },
      { channel: 'email', delay_days: 14, message_template: "Objet : Dernière fois" },
    ],
  },
  {
    name: 'Préparer votre retraite TNS',
    steps: [
      { channel: 'email', delay_days: 0, message_template: "Objet : Votre retraite en tant que {Profession} : combien ?" },
      { channel: 'whatsapp', delay_days: 2, message_template: "Bonjour {Prénom}, avez-vous pu lire mon email sur la retraite des {Profession} ?" },
      { channel: 'email', delay_days: 5, message_template: "Objet : Votre simulation retraite" },
      { channel: 'sms', delay_days: 8, message_template: "Bonjour {Prénom}, créneau vendredi 11h pour votre simulation retraite ?" },
      { channel: 'linkedin', delay_days: 12, message_template: "Bonjour {Prénom}, j'aide les {Profession} à reprendre la main sur leur retraite." },
      { channel: 'email', delay_days: 18, message_template: "Objet : Je m'arrête" },
    ],
  },
  {
    name: 'Gérer la fiscalité PER Madelin',
    steps: [
      { channel: 'email', delay_days: 0, message_template: "Objet : 3 200 € d'impôts économisés cette année (tranche 30%)" },
      { channel: 'whatsapp', delay_days: 2, message_template: "Bonjour {Prénom}, la fenêtre fiscale se ferme le 31 décembre." },
      { channel: 'email', delay_days: 5, message_template: "Objet : 3 leviers fiscaux TNS méconnus" },
      { channel: 'sms', delay_days: 8, message_template: "Bonjour {Prénom}, date limite pour optimiser 2026 approche." },
      { channel: 'linkedin', delay_days: 12, message_template: "Bonjour {Prénom}, j'aide les {Profession} à économiser 3-8 000 € d'impôts/an." },
      { channel: 'email', delay_days: 18, message_template: "Objet : Fin de ma relance" },
    ],
  },
  {
    name: 'Transmettre votre patrimoine',
    steps: [
      { channel: 'email', delay_days: 0, message_template: "Objet : Combien vos enfants vont-ils réellement hériter ?" },
      { channel: 'whatsapp', delay_days: 3, message_template: "Bonjour {Prénom}, ma proposition de diagnostic transmission vous intéresse ?" },
      { channel: 'email', delay_days: 7, message_template: "Objet : Un cas réel — 197 000 € économisés" },
      { channel: 'sms', delay_days: 12, message_template: "Bonjour {Prénom}, dispo pour un échange sur votre transmission ?" },
      { channel: 'email', delay_days: 18, message_template: "Objet : Je m'arrête" },
    ],
  },
  {
    name: 'Diversifier votre patrimoine',
    steps: [
      { channel: 'email', delay_days: 0, message_template: "Objet : Votre patrimoine est-il trop immobilier ?" },
      { channel: 'whatsapp', delay_days: 3, message_template: "Bonjour {Prénom}, ma proposition d'audit patrimonial vous intéresse ?" },
      { channel: 'email', delay_days: 6, message_template: "Objet : Un {Profession} qui a rééquilibré son patrimoine" },
      { channel: 'sms', delay_days: 10, message_template: "Bonjour {Prénom}, dispo pour un échange sur la diversification de votre patrimoine ?" },
      { channel: 'email', delay_days: 15, message_template: "Objet : Dernier message" },
    ],
  },
  {
    name: "Séquence chefs d'entreprise",
    steps: [
      { channel: 'email', delay_days: 0, message_template: "Objet : Optimisez la gestion de votre holding" },
      { channel: 'whatsapp', delay_days: 3, message_template: "Bonjour {Prénom}, souhaiteriez-vous un point sur votre situation patrimoniale ?" },
      { channel: 'email', delay_days: 7, message_template: "Objet : Dividendes vs rémunération — ce qui change en 2026" },
      { channel: 'linkedin', delay_days: 12, message_template: "Bonjour {Prénom}, j'accompagne des dirigeants comme vous sur l'optimisation fiscale." },
      { channel: 'email', delay_days: 18, message_template: "Objet : Dernière tentative de contact" },
    ],
  },
]

export async function POST(_req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let created = 0
  let skipped = 0

  for (const lib of LIBRARY) {
    const { data: existing } = await supabase
      .from('sequence_templates')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', lib.name)
      .maybeSingle()

    if (existing) { skipped++; continue }

    const { data: tpl, error: tplErr } = await supabase
      .from('sequence_templates')
      .insert({ user_id: user.id, name: lib.name, auto_trigger: false })
      .select('id')
      .single()

    if (tplErr || !tpl) continue

    const steps = lib.steps.map((s, i) => ({
      template_id: tpl.id,
      step_order: i + 1,
      channel: s.channel,
      delay_days: s.delay_days,
      message_template: s.message_template,
    }))

    await supabase.from('sequence_template_steps').insert(steps)
    created++
  }

  return apiSuccess({ created, skipped, message: `${created} séquences importées, ${skipped} déjà présentes` })
}
