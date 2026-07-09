import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

const SCRIPTS = [
  // KINESITHERAPEUTE — Variante A
  {
    metier: 'kinesitherapeute',
    titre: 'Variante A — Approche directe BNC',
    contenu: `OUVERTURE (10 sec max)
"Bonjour [Prénom], c'est Ted, conseiller en gestion de patrimoine indépendant. Je vous appelle parce que j'accompagne des kinésithérapeutes libéraux en Île-de-France sur l'optimisation fiscale et la préparation retraite. Est-ce que vous avez 2 minutes ?"

SI OUI — QUALIFICATION (30 sec)
"Parfait. En tant que kiné libéral, vous avez sûrement un BNC conséquent. Est-ce que vous avez déjà un conseiller qui s'occupe de votre PER Madelin et de votre prévoyance TNS, ou c'est votre comptable qui gère ça ?"

TRANSITION VERS RDV
"Ce que je propose à mes clients kinés : un diagnostic patrimonial gratuit de 20 min en visio. On regarde votre situation, je vous dis si vous laissez de l'argent sur la table ou pas. Zéro engagement. Vous préférez plutôt en début de semaine ou en fin de semaine ?"

SI NON / PAS LE TEMPS
"Je comprends tout à fait. Est-ce que je peux vous envoyer un email avec un cas concret d'optimisation pour un kiné ? Ça prend 2 min à lire et vous me dites si ça vous parle."

OBJECTIONS COURANTES
- "J'ai déjà un conseiller" → "Très bien ! Est-ce qu'il est spécialisé TNS ? Beaucoup de mes clients avaient un conseiller généraliste et passaient à côté du plafond Madelin. Un deuxième avis est toujours gratuit chez moi."
- "Envoyez-moi un email" → "Avec plaisir. Pour que ce soit pertinent, votre BNC est dans quelle tranche — autour de 80K, 120K ou plus ?"
- "Je n'ai pas le temps" → "Je comprends, journées chargées en cabinet. Quel serait le meilleur moment pour vous rappeler ? Tôt le matin avant vos patients, ou la pause déjeuner ?"
- "Ça ne m'intéresse pas" → "D'accord, pas de souci. Juste une question rapide : c'est parce que vous êtes déjà bien accompagné, ou parce que le sujet patrimoine n'est pas votre priorité en ce moment ?"

CLOSING
"Super, je vous envoie une invitation pour [jour] à [heure]. Vous recevrez un email de confirmation avec le lien visio. Bonne fin de journée !"`,
    is_default: true,
  },
  // KINESITHERAPEUTE — Variante B
  {
    metier: 'kinesitherapeute',
    titre: 'Variante B — Angle retraite CARPIMKO',
    contenu: `OUVERTURE
"Bonjour [Prénom], c'est Ted, CGP spécialisé TNS. Question rapide : en tant que kiné libéral, vous savez combien vous toucherez à la retraite avec la CARPIMKO seule ? La plupart de mes clients découvrent que c'est autour de 1 400 €/mois..."

QUALIFICATION
"Avec votre BNC actuel, vous cotisez déjà beaucoup. Mais la retraite CARPIMKO est plafonnée. Sans complément PER Madelin, vous passez de 5 000 €/mois aujourd'hui à 1 400 € demain. Ça fait mal."

PITCH VALEUR
"Mon diagnostic gratuit de 20 min vous dit exactement combien il faut mettre de côté maintenant pour maintenir votre train de vie. Et surtout : quelles enveloppes fiscales utiliser pour que ça vous coûte moins cher."

OBJECTIONS
- "Mon comptable s'en occupe" → "Votre comptable optimise votre BNC. Moi j'optimise ce qui vient après : placement, retraite, transmission. Deux jobs différents."
- "Je verrai plus tard" → "À 35-40 ans, 200 €/mois = 120 000 € à 62 ans. À 50 ans, il faudra 500 €/mois pour le même résultat. Le 'plus tard' coûte cher."

CLOSING
"15 minutes en visio cette semaine. Je vous montre le gap retraite et les leviers. Mardi ou jeudi ?"`,
    is_default: false,
  },
  // KINESITHERAPEUTE — Variante C
  {
    metier: 'kinesitherapeute',
    titre: 'Variante C — Social proof cabinet',
    contenu: `OUVERTURE
"Bonjour [Prénom], c'est Ted. Je travaille avec 4 kinés libéraux à Paris et je viens de boucler un dossier d'optimisation qui a économisé 6 800 € d'impôts sur l'année. Vous avez 2 minutes ?"

QUALIFICATION
"La plupart des kinés que j'accompagne ont un BNC entre 70K et 120K. Vous êtes dans quelle tranche ?"
[Adapter selon réponse]
"Et côté épargne pro : PER Madelin ? Contrat Madelin prévoyance ? Ou rien pour l'instant ?"

PITCH VALEUR
"Ce que je vois souvent : vous payez plein pot alors que 3 leviers légaux existent depuis des années. Mon diagnostic gratuit les identifie en 20 min. Si rien à optimiser, je vous le dis franchement."

OBJECTIONS
- "Envoyez un email" → "Avec plaisir. Pour que ce soit pertinent : votre BNC est autour de combien ? 80K, 100K, plus ?"
- "Pas le temps" → "15 min en visio le soir après vos patients ? 18h30 ça vous va ?"

CLOSING
"Je vous envoie un Calendly. Vous choisissez le créneau qui vous arrange. Deal ?"`,
    is_default: false,
  },
  // DENTISTE — Variante A
  {
    metier: 'dentiste',
    titre: 'Variante A — Approche BNC + SCM',
    contenu: `OUVERTURE
"Bonjour [Prénom], c'est Ted, conseiller en gestion de patrimoine. J'accompagne des chirurgiens-dentistes libéraux sur la structuration patrimoniale et l'optimisation fiscale. Vous avez une minute ?"

QUALIFICATION
"En tant que dentiste avec un BNC généralement élevé, est-ce que vous avez déjà structuré votre épargne professionnelle — PER, contrat Madelin, SCM — ou c'est encore à faire ?"

PITCH VALEUR
"Ce que je constate souvent chez les dentistes : entre le BNC, les revenus de la SCM, et les charges sociales, il y a facilement 5 à 8 000 € d'économies fiscales non exploitées par an. Mon job c'est de les identifier en 20 min."

OBJECTIONS
- "Mon comptable gère" → "Votre comptable optimise votre BNC, moi j'optimise ce qui vient après : placement de la trésorerie, retraite supplémentaire, transmission du cabinet."
- "Je gagne bien ma vie, pas besoin" → "Justement, plus le BNC est élevé, plus les leviers sont importants. Un dentiste à 180K de BNC peut économiser jusqu'à 12 000 €/an avec les bons outils."

CLOSING
"Je vous propose 20 minutes en visio, on fait un diagnostic rapide. Si rien à optimiser, je vous le dis franchement. Mardi ou jeudi matin, qu'est-ce qui vous arrange ?"`,
    is_default: true,
  },
  // DENTISTE — Variante B
  {
    metier: 'dentiste',
    titre: 'Variante B — Angle prévoyance',
    contenu: `OUVERTURE
"Bonjour Docteur [Nom], c'est Ted, CGP spécialisé professions libérales. Question directe : si vous êtes en arrêt de travail 6 mois demain, combien vous touchez par mois ?"

QUALIFICATION
"La plupart des dentistes ne réalisent pas : la CARCDSF couvre très mal l'arrêt de travail. 90 jours de carence, 50% du revenu plafonné. Si vous gagnez 12 000 €/mois, vous tombez à 2 500 €. Le train de vie s'effondre."

PITCH VALEUR
"Mon diagnostic gratuit identifie les trous dans votre couverture en 20 min. Prévoyance, retraite, optimisation fiscale. Si vous êtes déjà bien couvert, je vous le dis. Mais 9 dentistes sur 10 ont des gaps."

OBJECTIONS
- "Mon assureur s'en occupe" → "Votre assureur vend des contrats. Moi je fais du conseil indépendant. Je regarde l'ensemble : prévoyance + retraite + fiscal. Souvent les 3 ne sont pas coordonnés."

CLOSING
"20 min en visio cette semaine. Je vous montre où sont les trous. Mardi 18h ou jeudi 8h ?"`,
    is_default: false,
  },
  // DENTISTE — Variante C
  {
    metier: 'dentiste',
    titre: 'Variante C — Social proof chiffré',
    contenu: `OUVERTURE
"Bonjour Docteur [Nom], c'est Ted. Je viens de boucler un dossier pour un dentiste à Neuilly : 11 200 € d'économies fiscales sur l'année. Vous avez 2 minutes ?"

QUALIFICATION
"Avec un BNC dentiste — généralement entre 150K et 250K — il y a facilement 8 à 12K d'économies fiscales non exploitées. Vous êtes dans quelle tranche de BNC ?"

PITCH VALEUR
"Ce que je constate : entre le BNC, les revenus de la SCM, et les charges sociales, beaucoup de dentistes payent plein pot. Mon diagnostic gratuit de 20 min identifie les leviers. Si rien, je vous le dis franchement."

CLOSING
"Mardi ou jeudi, 20 min en visio. Je vous montre les leviers. Deal ?"`,
    is_default: false,
  },
  // PHARMACIEN — Variante A
  {
    metier: 'pharmacien',
    titre: 'Variante A — Valorisation officine',
    contenu: `OUVERTURE
"Bonjour [Prénom], c'est Ted, CGP indépendant. Je travaille avec des pharmaciens titulaires en Île-de-France sur la valorisation du patrimoine professionnel et la préparation de la cession. Vous avez 2 minutes ?"

QUALIFICATION
"En tant que titulaire, votre officine représente sûrement une grosse partie de votre patrimoine. Est-ce que vous avez déjà réfléchi à la stratégie de sortie — cession, association, transmission familiale — ou c'est encore loin ?"

PITCH VALEUR
"Ce que je vois souvent : des pharmaciens qui ont 80% de leur patrimoine dans l'officine et très peu diversifié à côté. Le jour de la cession, la fiscalité peut prendre 30 à 40% si c'est mal préparé. Mon rôle c'est d'anticiper ça 3-5 ans avant."

OBJECTIONS
- "La cession c'est pas pour maintenant" → "Justement, c'est le meilleur moment pour préparer. Les dispositifs comme l'Art. 150-0 B ter (apport-cession) se mettent en place sur 2-3 ans minimum."
- "Mon expert-comptable s'en occupe" → "L'EC structure la cession côté fiscal. Moi j'interviens sur le réinvestissement : où placer le produit de cession pour 5-8% net avec un risque maîtrisé."

CLOSING
"20 minutes en visio pour faire un point — même si la cession est dans 5 ans, on peut commencer à optimiser la structure dès maintenant. Quel créneau vous arrange cette semaine ?"`,
    is_default: true,
  },
  // PHARMACIEN — Variante B
  {
    metier: 'pharmacien',
    titre: 'Variante B — Angle diversification',
    contenu: `OUVERTURE
"Bonjour [Prénom], c'est Ted, CGP indépendant. Question rapide : combien de votre patrimoine est concentré dans votre officine ? 70% ? 80% ? Plus ?"

QUALIFICATION
"C'est le piège des pharmaciens titulaires : tout est dans l'officine. Le jour où vous vendez, la fiscalité peut prendre 30 à 40% si c'est mal préparé. Et en attendant, votre patrimoine n'est pas diversifié."

PITCH VALEUR
"Mon diagnostic gratuit de 20 min vous montre comment diversifier maintenant — même si la cession est dans 5-10 ans. Immobilier, financier, optimisation fiscale. Si vous êtes déjà bien structuré, je vous le dis."

CLOSING
"Mardi ou jeudi cette semaine, 20 min en visio. Je vous montre la stratégie. Ça vous va ?"`,
    is_default: false,
  },
  // MEDECIN — Variante A
  {
    metier: 'medecin',
    titre: 'Variante A — Prévoyance CARMF',
    contenu: `OUVERTURE
"Bonjour Docteur [Nom], c'est Ted, conseiller en gestion de patrimoine indépendant. J'accompagne des médecins libéraux sur la prévoyance, la retraite et l'optimisation fiscale. Vous avez une minute entre deux consultations ?"

QUALIFICATION
"En secteur 1 ou 2, les problématiques sont différentes. Vous êtes en secteur... ?"
[Adapter selon réponse]
"Et côté prévoyance — arrêt de travail, invalidité — vous êtes couvert par votre contrat CARMF de base ou vous avez un complément ?"

PITCH VALEUR
"Ce que je constate chez mes clients médecins : la CARMF couvre mal l'arrêt de travail (3 mois de carence, 50% du revenu max). Un accident ou une maladie et c'est la catastrophe financière. Mon diagnostic gratuit identifie les trous dans votre couverture en 20 min."

OBJECTIONS
- "Je suis bien couvert par la CARMF" → "La CARMF verse max 100 €/jour après 90 jours de carence. Si votre train de vie est à 8 000 €/mois, c'est 5 000 €/mois de manque à gagner. On peut vérifier ensemble en 10 min."
- "Pas le temps" → "Je comprends. Le plus simple : je vous envoie un email avec une simulation CARMF vs complément prévoyance. 2 min de lecture, et vous me dites si ça vaut un échange."

CLOSING
"Je vous propose un créneau tôt le matin ou sur la pause déjeuner — 20 min en visio ou téléphone, vous choisissez."`,
    is_default: true,
  },
  // MEDECIN — Variante B
  {
    metier: 'medecin',
    titre: 'Variante B — Angle retraite CARMF',
    contenu: `OUVERTURE
"Bonjour Docteur [Nom], c'est Ted, CGP spécialisé médecins libéraux. Question directe : vous savez combien vous toucherez à la retraite avec la CARMF seule ?"

QUALIFICATION
"La plupart des médecins ne réalisent pas : la retraite CARMF est plafonnée. Même avec un gros BNC, vous touchez max 2 500-3 000 €/mois. Si vous gagnez 10 000 €/mois aujourd'hui, vous tombez à 3 000 € demain."

PITCH VALEUR
"Mon diagnostic gratuit de 20 min vous montre le gap retraite et les leviers pour le combler. PER, Madelin, immobilier. Si vous êtes déjà bien structuré, je vous le dis."

CLOSING
"Mardi ou jeudi, 20 min en visio. Je vous montre les chiffres. Deal ?"`,
    is_default: false,
  },
  // MEDECIN — Variante C
  {
    metier: 'medecin',
    titre: 'Variante C — Social proof secteur 2',
    contenu: `OUVERTURE
"Bonjour Docteur [Nom], c'est Ted. Je viens de boucler un dossier pour un médecin secteur 2 à Paris : 13 400 € d'économies fiscales sur l'année. Vous êtes secteur 1 ou 2 ?"

QUALIFICATION
"En secteur 2, le BNC est souvent élevé — 180K, 220K, plus. Mais beaucoup de médecins payent plein pot alors que des leviers légaux existent. Vous utilisez le PER Madelin ? Contrat Madelin prévoyance ?"

PITCH VALEUR
"Mon diagnostic gratuit de 20 min identifie les leviers fiscaux et les trous de couverture. Prévoyance, retraite, optimisation. Si rien, je vous le dis franchement."

CLOSING
"20 min en visio cette semaine. Mardi 18h ou jeudi 8h ?"`,
    is_default: false,
  },
  // INFIRMIER — Variante A
  {
    metier: 'infirmier',
    titre: 'Variante A — Retraite CARPIMKO',
    contenu: `OUVERTURE
"Bonjour [Prénom], c'est Ted, conseiller en gestion de patrimoine. J'accompagne des infirmiers libéraux en Île-de-France sur la retraite et la fiscalité. Vous avez 2 minutes entre deux tournées ?"

QUALIFICATION
"En tant qu'IDEL, vous cotisez à la CARPIMKO. Est-ce que vous savez combien vous toucherez à la retraite avec vos droits actuels ? La plupart de mes clients IDEL découvrent que c'est autour de 1 200 €/mois..."

PITCH VALEUR
"Le problème des IDEL : vous travaillez énormément, le BNC est correct (60-90K en général), mais la retraite CARPIMKO est ridicule. Sans complément, vous passez de 5 000 €/mois à 1 200 €. Mon diagnostic gratuit montre exactement combien il faut mettre de côté et où."

OBJECTIONS
- "J'ai un Madelin avec mon comptable" → "Super, c'est un bon début. La question c'est : est-ce que le montant est calibré sur votre besoin réel à la retraite, ou c'est un montant standard ? On peut vérifier en 10 min."
- "Je suis trop jeune pour la retraite" → "Justement, à 35-40 ans c'est le moment idéal. 200 €/mois placés maintenant = 120 000 € à 62 ans avec les intérêts composés. À 50 ans il faudra 500 €/mois pour le même résultat."
- "Mon mari/femme gère" → "Très bien. Est-ce qu'il/elle a pris en compte la spécificité CARPIMKO ? C'est très différent de la retraite salariée. Je peux vous envoyer un comparatif."

CLOSING
"Je vous propose 15 minutes en visio, le soir après vos tournées si vous préférez — 18h30 ça vous irait ? On fait le point retraite + fiscal en un seul échange."`,
    is_default: true,
  },
  // INFIRMIER — Variante B
  {
    metier: 'infirmier',
    titre: 'Variante B — Angle charges sociales',
    contenu: `OUVERTURE
"Bonjour [Prénom], c'est Ted, CGP spécialisé IDEL. Question rapide : vous payez combien de charges sociales par an ? 18K ? 22K ? Plus ?"

QUALIFICATION
"Le problème des IDEL : vous payez énormément de charges, mais la retraite CARPIMKO est ridicule. Vous travaillez comme un fou, et à 62 ans vous touchez 1 200 €/mois. Sans complément, c'est la catastrophe."

PITCH VALEUR
"Mon diagnostic gratuit de 20 min vous montre comment optimiser : PER Madelin pour réduire les impôts, et complément retraite pour maintenir votre train de vie. Si vous êtes déjà bien structuré, je vous le dis."

CLOSING
"15 min en visio cette semaine. Le soir après vos tournées si vous préférez. 18h30 ça vous va ?"`,
    is_default: false,
  },
  // INFIRMIER — Variante C
  {
    metier: 'infirmier',
    titre: 'Variante C — Social proof tournées',
    contenu: `OUVERTURE
"Bonjour [Prénom], c'est Ted. Je travaille avec 6 IDEL en Île-de-France. Moyenne d'économies fiscales : 4 200 € par an. Vous avez 2 minutes entre deux tournées ?"

QUALIFICATION
"En tant qu'IDEL, vous avez sûrement un BNC autour de 60-80K. Question : vous mettez combien de côté pour la retraite chaque mois ? 200 € ? 300 € ? Rien ?"

PITCH VALEUR
"Mon diagnostic gratuit de 15 min vous dit exactement combien il faut mettre de côté pour maintenir votre train de vie. Et surtout : dans quelles enveloppes fiscales pour que ça vous coûte moins cher."

CLOSING
"15 min en visio le soir après vos tournées. 18h ou 19h, qu'est-ce qui vous arrange ?"`,
    is_default: false,
  },
]

export async function POST(_req: NextRequest) {
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
      .maybeSingle()

    if (existing) { skipped++; continue }

    const { error } = await supabase.from('call_scripts').insert({
      user_id: user.id,
      metier: script.metier,
      titre: script.titre,
      contenu: script.contenu,
      is_default: script.is_default,
    })

    if (!error) created++
  }

  return apiSuccess({ created, skipped, message: `${created} scripts créés, ${skipped} déjà présents` })
}
