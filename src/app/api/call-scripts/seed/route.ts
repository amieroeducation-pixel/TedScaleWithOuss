import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

const SCRIPTS = [
  // KINESITHERAPEUTE — Variante A
  {
    metier: 'kinesitherapeute',
    titre: 'Message 1 — Premier contact',
    contenu: `Bonjour Monsieur [Nom],

C'est Ted, conseiller en gestion de patrimoine.

J'accompagne des kinésithérapeutes libéraux en Île-de-France sur l'optimisation fiscale et la préparation retraite.

Je vous propose un diagnostic gratuit de 20 min cette semaine pour voir si vous laissez de l'argent sur la table.

Disponible ?

Ted`,
    is_default: true,
  },
  // KINESITHERAPEUTE — Variante B
  {
    metier: 'kinesitherapeute',
    titre: 'Message 2 — Retraite',
    contenu: `Bonjour Madame [Nom],

Ted, CGP spécialisé TNS.

Vous savez combien vous toucherez à la retraite avec la CARPIMKO seule ?

La plupart découvrent que c'est autour de 1 400 €/mois...

Je vous propose un diagnostic gratuit de 15 min pour voir comment optimiser.

Intéressée ?

Ted`,
    is_default: false,
  },
  // KINESITHERAPEUTE — Variante C
  {
    metier: 'kinesitherapeute',
    titre: 'Message 3 — Économies',
    contenu: `Bonjour Monsieur [Nom],

Ted, CGP.

Je viens de faire économiser 6 800 € à un kiné parisien sur l'année.

Si vous avez un BNC entre 70K et 120K, il y a sûrement des leviers non exploités.

Diagnostic gratuit de 20 min ?

Ted`,
    is_default: false,
  },
  // DENTISTE — Variante A
  {
    metier: 'dentiste',
    titre: 'Message 1 — Premier contact',
    contenu: `Bonjour Docteur [Nom],

Ted, conseiller en gestion de patrimoine.

J'accompagne des chirurgiens-dentistes sur l'optimisation fiscale.

Entre le BNC, la SCM et les charges sociales, il y a souvent 5 à 8 000 € d'économies par an non exploitées.

Diagnostic gratuit de 20 min ?

Ted`,
    is_default: true,
  },
  // DENTISTE — Variante B
  {
    metier: 'dentiste',
    titre: 'Message 2 — Prévoyance',
    contenu: `Bonjour Docteur [Nom],

Ted, CGP.

Si vous êtes en arrêt 6 mois demain, vous toucheriez combien ?

La CARCDSF couvre mal : 90 jours de carence, 50% du revenu plafonné.

À 12 000 €/mois, vous tombez à 2 500 €.

Diagnostic gratuit de 20 min pour voir les trous ?

Ted`,
    is_default: false,
  },
  // DENTISTE — Variante C
  {
    metier: 'dentiste',
    titre: 'Message 3 — Économies',
    contenu: `Bonjour Docteur [Nom],

Ted.

Je viens de faire économiser 11 200 € à un dentiste de Neuilly.

Si vous avez un BNC entre 150K et 250K, il y a sûrement 8 à 12K non exploités.

Diagnostic gratuit de 20 min ?

Ted`,
    is_default: false,
  },
  // PHARMACIEN — Variante A
  {
    metier: 'pharmacien',
    titre: 'Message 1 — Cession',
    contenu: `Bonjour Monsieur [Nom],

Ted, CGP.

Je travaille avec des pharmaciens titulaires sur la préparation de la cession.

Si votre officine = 80% de votre patrimoine, la fiscalité peut prendre 30-40% si c'est mal préparé.

Diagnostic gratuit de 20 min pour anticiper ?

Ted`,
    is_default: true,
  },
  // PHARMACIEN — Variante B
  {
    metier: 'pharmacien',
    titre: 'Message 2 — Diversification',
    contenu: `Bonjour Madame [Nom],

Ted, CGP.

Combien de votre patrimoine est dans l'officine ? 70% ? 80% ?

Le jour de la vente, la fiscalité peut prendre 30-40%.

Mon diagnostic de 20 min montre comment diversifier maintenant.

Intéressée ?

Ted`,
    is_default: false,
  },
  // MEDECIN — Variante A
  {
    metier: 'medecin',
    titre: 'Message 1 — Prévoyance',
    contenu: `Bonjour Docteur [Nom],

Ted, CGP.

J'accompagne des médecins libéraux sur la prévoyance et l'optimisation fiscale.

La CARMF couvre mal l'arrêt de travail : 3 mois de carence, 50% du revenu max.

Mon diagnostic de 20 min identifie les trous.

Disponible cette semaine ?

Ted`,
    is_default: true,
  },
  // MEDECIN — Variante B
  {
    metier: 'medecin',
    titre: 'Message 2 — Retraite',
    contenu: `Bonjour Docteur [Nom],

Ted, CGP.

Vous savez combien vous toucherez à la retraite avec la CARMF seule ?

Même avec un gros BNC : max 2 500-3 000 €/mois.

Si vous gagnez 10 000 € aujourd'hui, vous tombez à 3 000 € demain.

Diagnostic gratuit de 15 min ?

Ted`,
    is_default: false,
  },
  // MEDECIN — Variante C
  {
    metier: 'medecin',
    titre: 'Message 3 — Économies',
    contenu: `Bonjour Docteur [Nom],

Ted.

Je viens de faire économiser 13 400 € à un médecin secteur 2 parisien.

Vous êtes secteur 1 ou 2 ?

En secteur 2, il y a généralement 10-15K non exploités.

Diagnostic de 20 min ?

Ted`,
    is_default: false,
  },
  // INFIRMIER — Variante A
  {
    metier: 'infirmier',
    titre: 'Message 1 — Retraite',
    contenu: `Bonjour Madame [Nom],

Ted, CGP.

Vous savez combien vous toucherez à la retraite ?

La plupart découvrent : 1 200 €/mois...

Vous passez de 5 000 € à 1 200 €.

Mon diagnostic de 15 min montre combien mettre de côté et où.

Disponible ?

Ted`,
    is_default: true,
  },
  // INFIRMIER — Variante B
  {
    metier: 'infirmier',
    titre: 'Message 2 — Charges',
    contenu: `Bonjour Monsieur [Nom],

Ted, CGP.

Vous payez combien de charges par an ? 18K ? 22K ?

Vous payez énormément mais la retraite CARPIMKO est ridicule : 1 200 €/mois.

Mon diagnostic de 15 min montre comment optimiser.

Intéressé ?

Ted`,
    is_default: false,
  },
  // INFIRMIER — Variante C
  {
    metier: 'infirmier',
    titre: 'Message 3 — Économies',
    contenu: `Bonjour Madame [Nom],

Ted.

Je travaille avec 6 IDEL en Île-de-France.

Moyenne d'économies : 4 200 €/an.

Vous mettez combien de côté pour la retraite par mois ?

Diagnostic gratuit de 15 min ?

Ted`,
    is_default: false,
  },
  // GENERIQUE — Tous métiers
  {
    metier: 'generique',
    titre: 'Message générique — Homme',
    contenu: `Bonjour Monsieur [Nom],

Ted, conseiller en gestion de patrimoine.

Je travaille avec des professionnels libéraux comme vous sur la préparation retraite et l'optimisation fiscale.

Bilan patrimonial gratuit de 20 min cette semaine ?

Ted`,
    is_default: true,
  },
  {
    metier: 'generique',
    titre: 'Message générique — Femme',
    contenu: `Bonjour Madame [Nom],

Ted, conseiller en gestion de patrimoine.

Je travaille avec des professionnels libéraux comme vous sur la préparation retraite et l'optimisation fiscale.

Bilan patrimonial gratuit de 20 min cette semaine ?

Ted`,
    is_default: false,
  },
]

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  // Check if reset=true in query params
  const url = new URL(request.url)
  const reset = url.searchParams.get('reset') === 'true'

  let deleted = 0
  if (reset) {
    // Delete all existing scripts
    const { error: deleteError } = await supabase
      .from('call_scripts')
      .delete()
      .eq('user_id', user.id)

    if (!deleteError) {
      const { count } = await supabase
        .from('call_scripts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
      deleted = count || 0
    }
  }

  let created = 0
  let skipped = 0

  for (const script of SCRIPTS) {
    const { data: existing } = await supabase
      .from('call_scripts')
      .select('id')
      .eq('user_id', user.id)
      .eq('metier', script.metier)
      .eq('titre', script.titre)
      .single()

    if (existing) {
      skipped++
      continue
    }

    const { error } = await supabase.from('call_scripts').insert({
      user_id: user.id,
      ...script,
    })

    if (!error) created++
  }

  return apiSuccess({
    deleted,
    created,
    skipped,
    message: reset
      ? `${deleted} scripts supprimés, ${created} nouveaux créés`
      : `${created} scripts créés, ${skipped} déjà présents`,
  })
}
