import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

const SCRIPTS = [
  // KINESITHERAPEUTE — Variante A
  {
    metier: 'kinesitherapeute',
    titre: 'Variante A — Premier contact professionnel',
    contenu: `Bonjour Monsieur [Nom],

C'est Ted, conseiller en gestion de patrimoine indépendant.

J'accompagne des kinésithérapeutes libéraux en Île-de-France sur l'optimisation fiscale et la préparation retraite.

Est-ce que vous seriez disponible pour un diagnostic patrimonial gratuit de 20 min en visio cette semaine ?

On regarde votre situation BNC, PER Madelin et prévoyance TNS — je vous dis si vous laissez de l'argent sur la table.

Bonne journée,
Ted`,
    is_default: true,
  },
  // KINESITHERAPEUTE — Variante B
  {
    metier: 'kinesitherapeute',
    titre: 'Variante B — Angle retraite CARPIMKO',
    contenu: `Bonjour Madame [Nom],

C'est Ted, CGP spécialisé TNS.

Question rapide : vous savez combien vous toucherez à la retraite avec la CARPIMKO seule ?

La plupart de mes clients kinés découvrent que c'est autour de 1 400 €/mois... Même en cotisant beaucoup aujourd'hui.

Je vous propose un diagnostic gratuit de 15 min pour voir le gap et les leviers d'optimisation.

Intéressée ?

Ted`,
    is_default: false,
  },
  // KINESITHERAPEUTE — Variante C
  {
    metier: 'kinesitherapeute',
    titre: 'Variante C — Social proof chiffré',
    contenu: `Bonjour Monsieur [Nom],

C'est Ted, CGP indépendant.

Je travaille avec 4 kinés libéraux à Paris et je viens de boucler un dossier : 6 800 € d'économies fiscales sur l'année.

Avec un BNC entre 70K et 120K, il y a souvent 3 leviers légaux non exploités.

Je vous propose un diagnostic gratuit de 20 min pour voir si c'est votre cas.

Disponible cette semaine ?

Ted`,
    is_default: false,
  },
  // DENTISTE — Variante A
  {
    metier: 'dentiste',
    titre: 'Variante A — Approche professionnelle',
    contenu: `Bonjour Docteur [Nom],

C'est Ted, conseiller en gestion de patrimoine.

J'accompagne des chirurgiens-dentistes libéraux sur l'optimisation fiscale et la structuration patrimoniale.

Entre le BNC, les revenus de la SCM et les charges sociales, il y a souvent 5 à 8 000 € d'économies fiscales non exploitées par an.

Je vous propose un diagnostic gratuit de 20 min en visio pour identifier les leviers.

Intéressé ?

Cordialement,
Ted`,
    is_default: true,
  },
  // DENTISTE — Variante B
  {
    metier: 'dentiste',
    titre: 'Variante B — Angle prévoyance CARCDSF',
    contenu: `Bonjour Docteur [Nom],

C'est Ted, CGP spécialisé professions libérales.

Question directe : si vous êtes en arrêt de travail 6 mois demain, combien toucheriez-vous par mois ?

La CARCDSF couvre très mal : 90 jours de carence, 50% du revenu plafonné.

Si vous gagnez 12 000 €/mois, vous tomberiez à 2 500 €.

Mon diagnostic gratuit de 20 min identifie les trous dans votre couverture.

Disponible cette semaine ?

Ted`,
    is_default: false,
  },
  // DENTISTE — Variante C
  {
    metier: 'dentiste',
    titre: 'Variante C — Social proof Neuilly',
    contenu: `Bonjour Docteur [Nom],

C'est Ted.

Je viens de boucler un dossier pour un dentiste à Neuilly : 11 200 € d'économies fiscales sur l'année.

Avec un BNC entre 150K et 250K, il y a souvent 8 à 12K d'économies fiscales non exploitées.

Diagnostic gratuit de 20 min en visio pour voir si c'est votre cas ?

Ted`,
    is_default: false,
  },
  // PHARMACIEN — Variante A
  {
    metier: 'pharmacien',
    titre: 'Variante A — Valorisation officine',
    contenu: `Bonjour Monsieur [Nom],

C'est Ted, CGP indépendant.

Je travaille avec des pharmaciens titulaires en Île-de-France sur la valorisation du patrimoine professionnel et la préparation de la cession.

Si votre officine représente 80% de votre patrimoine, la fiscalité peut prendre 30 à 40% le jour de la cession si c'est mal préparé.

Mon rôle : anticiper ça 3-5 ans avant.

Diagnostic gratuit de 20 min en visio cette semaine ?

Cordialement,
Ted`,
    is_default: true,
  },
  // PHARMACIEN — Variante B
  {
    metier: 'pharmacien',
    titre: 'Variante B — Diversification patrimoine',
    contenu: `Bonjour Madame [Nom],

C'est Ted, CGP spécialisé TNS.

Question rapide : combien de votre patrimoine est concentré dans votre officine ? 70% ? 80% ? Plus ?

Ce que je vois souvent : tout est dans l'officine, très peu diversifié à côté.

Le jour où vous vendez, la fiscalité peut prendre 30 à 40%.

Mon diagnostic de 20 min montre comment diversifier maintenant.

Intéressée ?

Ted`,
    is_default: false,
  },
  // MEDECIN — Variante A
  {
    metier: 'medecin',
    titre: 'Variante A — Prévoyance CARMF',
    contenu: `Bonjour Docteur [Nom],

C'est Ted, conseiller en gestion de patrimoine.

J'accompagne des médecins libéraux sur la prévoyance, la retraite et l'optimisation fiscale.

La CARMF couvre très mal l'arrêt de travail : 3 mois de carence, 50% du revenu max.

Un accident ou une maladie et c'est la catastrophe financière.

Mon diagnostic gratuit de 20 min identifie les trous dans votre couverture.

Disponible cette semaine ?

Cordialement,
Ted`,
    is_default: true,
  },
  // MEDECIN — Variante B
  {
    metier: 'medecin',
    titre: 'Variante B — Retraite CARMF plafonnée',
    contenu: `Bonjour Docteur [Nom],

C'est Ted, CGP spécialisé médecins libéraux.

Question directe : vous savez combien vous toucherez à la retraite avec la CARMF seule ?

La retraite CARMF est plafonnée. Même avec un gros BNC, vous touchez max 2 500-3 000 €/mois.

Si vous gagnez 10 000 €/mois aujourd'hui, vous tombez à 3 000 € demain.

Mon diagnostic gratuit de 15 min montre le gap et les leviers.

Intéressé ?

Ted`,
    is_default: false,
  },
  // MEDECIN — Variante C
  {
    metier: 'medecin',
    titre: 'Variante C — Social proof secteur 2',
    contenu: `Bonjour Docteur [Nom],

C'est Ted.

Je viens de boucler un dossier pour un médecin secteur 2 à Paris : 13 400 € d'économies fiscales sur l'année.

Vous êtes secteur 1 ou 2 ?

En secteur 2, le BNC est souvent élevé (180K, 220K+). Il y a généralement 10-15K d'économies fiscales non exploitées.

Diagnostic gratuit de 20 min en visio ?

Ted`,
    is_default: false,
  },
  // INFIRMIER — Variante A
  {
    metier: 'infirmier',
    titre: 'Variante A — Retraite CARPIMKO',
    contenu: `Bonjour Madame [Nom],

C'est Ted, CGP indépendant.

J'accompagne des infirmiers libéraux en Île-de-France sur la retraite et la fiscalité.

Vous savez combien vous toucherez à la retraite avec vos droits actuels ?

La plupart découvrent que c'est autour de 1 200 €/mois...

Sans complément, vous passez de 5 000 €/mois à 1 200 €.

Mon diagnostic de 15 min montre exactement combien il faut mettre de côté et où.

Disponible entre deux tournées ?

Ted`,
    is_default: true,
  },
  // INFIRMIER — Variante B
  {
    metier: 'infirmier',
    titre: 'Variante B — Charges sociales élevées',
    contenu: `Bonjour Monsieur [Nom],

C'est Ted, CGP spécialisé TNS.

Question rapide : vous payez combien de charges sociales par an ? 18K ? 22K ? Plus ?

Vous payez énormément de charges, mais la retraite CARPIMKO est ridicule.

Vous travaillez comme un fou, et à 62 ans vous touchez 1 200 €/mois.

Mon diagnostic gratuit de 15 min montre comment optimiser maintenant.

Intéressé ?

Ted`,
    is_default: false,
  },
  // INFIRMIER — Variante C
  {
    metier: 'infirmier',
    titre: 'Variante C — Social proof 6 IDEL',
    contenu: `Bonjour Madame [Nom],

C'est Ted.

Je travaille avec 6 IDEL en Île-de-France.

Moyenne d'économies fiscales : 4 200 € par an.

Vous mettez combien de côté pour la retraite chaque mois ? 200 € ? 300 € ? Rien ?

Diagnostic gratuit de 15 min pour voir si vous laissez de l'argent sur la table ?

Disponible entre deux tournées ?

Ted`,
    is_default: false,
  },
]

export async function POST(_request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

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
    created,
    skipped,
    message: `${created} scripts créés, ${skipped} déjà présents`,
  })
}
