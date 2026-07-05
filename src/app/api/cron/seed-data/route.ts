import { NextRequest } from 'next/server'
import { createSupabaseCronClient } from '@/lib/supabase/cron-client'
import { verifyCronSecret } from '@/lib/cron/auth'
import { apiSuccess, apiError } from '@/lib/api'

const CALL_SCRIPTS = [
  {
    metier: 'kinesitherapeute',
    titre: 'Prise de contact — Kinésithérapeute libéral',
    contenu: `OUVERTURE (10 sec max)\n"Bonjour [Prénom], c'est Ted, conseiller en gestion de patrimoine indépendant. Je vous appelle parce que j'accompagne des kinésithérapeutes libéraux en Île-de-France sur l'optimisation fiscale et la préparation retraite. Est-ce que vous avez 2 minutes ?"\n\nSI OUI — QUALIFICATION (30 sec)\n"Parfait. En tant que kiné libéral, vous avez sûrement un BNC conséquent. Est-ce que vous avez déjà un conseiller qui s'occupe de votre PER Madelin et de votre prévoyance TNS, ou c'est votre comptable qui gère ça ?"\n\nTRANSITION VERS RDV\n"Ce que je propose à mes clients kinés : un diagnostic patrimonial gratuit de 20 min en visio. On regarde votre situation, je vous dis si vous laissez de l'argent sur la table ou pas. Zéro engagement. Vous préférez plutôt en début de semaine ou en fin de semaine ?"\n\nOBJECTIONS\n- "J'ai déjà un conseiller" → "Très bien ! Est-ce qu'il est spécialisé TNS ? Un deuxième avis est toujours gratuit chez moi."\n- "Envoyez-moi un email" → "Avec plaisir. Votre BNC est dans quelle tranche — autour de 80K, 120K ou plus ?"\n- "Je n'ai pas le temps" → "Quel serait le meilleur moment pour vous rappeler ? Tôt le matin ou pause déjeuner ?"\n- "Ça ne m'intéresse pas" → "C'est parce que vous êtes déjà bien accompagné, ou parce que le patrimoine n'est pas votre priorité en ce moment ?"`,
  },
  {
    metier: 'dentiste',
    titre: 'Prise de contact — Chirurgien-dentiste',
    contenu: `OUVERTURE\n"Bonjour [Prénom], c'est Ted, conseiller en gestion de patrimoine. J'accompagne des chirurgiens-dentistes libéraux sur la structuration patrimoniale et l'optimisation fiscale. Vous avez une minute ?"\n\nQUALIFICATION\n"En tant que dentiste avec un BNC généralement élevé, est-ce que vous avez déjà structuré votre épargne professionnelle — PER, contrat Madelin, SCM — ou c'est encore à faire ?"\n\nPITCH VALEUR\n"Ce que je constate souvent chez les dentistes : entre le BNC, les revenus de la SCM, et les charges sociales, il y a facilement 5 à 8 000 € d'économies fiscales non exploitées par an."\n\nOBJECTIONS\n- "Mon comptable gère" → "Votre comptable optimise votre BNC, moi j'optimise ce qui vient après : placement de la trésorerie, retraite supplémentaire, transmission du cabinet."\n- "Je gagne bien ma vie, pas besoin" → "Plus le BNC est élevé, plus les leviers sont importants. Un dentiste à 180K de BNC peut économiser jusqu'à 12 000 €/an."`,
  },
  {
    metier: 'pharmacien',
    titre: 'Prise de contact — Pharmacien titulaire',
    contenu: `OUVERTURE\n"Bonjour [Prénom], c'est Ted, CGP indépendant. Je travaille avec des pharmaciens titulaires en Île-de-France sur la valorisation du patrimoine professionnel et la préparation de la cession. Vous avez 2 minutes ?"\n\nQUALIFICATION\n"En tant que titulaire, votre officine représente sûrement une grosse partie de votre patrimoine. Est-ce que vous avez déjà réfléchi à la stratégie de sortie — cession, association, transmission familiale ?"\n\nPITCH VALEUR\n"Des pharmaciens avec 80% du patrimoine dans l'officine et très peu diversifié à côté. Le jour de la cession, la fiscalité peut prendre 30 à 40% si c'est mal préparé. Mon rôle c'est d'anticiper ça 3-5 ans avant."\n\nOBJECTIONS\n- "La cession c'est pas pour maintenant" → "Justement, les dispositifs comme l'Art. 150-0 B ter se mettent en place sur 2-3 ans minimum."\n- "Mon expert-comptable s'en occupe" → "L'EC structure la cession côté fiscal. Moi j'interviens sur le réinvestissement du produit de cession."`,
  },
  {
    metier: 'medecin',
    titre: 'Prise de contact — Médecin libéral',
    contenu: `OUVERTURE\n"Bonjour Docteur [Nom], c'est Ted, conseiller en gestion de patrimoine indépendant. J'accompagne des médecins libéraux sur la prévoyance, la retraite et l'optimisation fiscale. Vous avez une minute entre deux consultations ?"\n\nQUALIFICATION\n"En secteur 1 ou 2, les problématiques sont différentes. Vous êtes en secteur... ? Et côté prévoyance — arrêt de travail, invalidité — vous êtes couvert par la CARMF de base ou vous avez un complément ?"\n\nPITCH VALEUR\n"La CARMF couvre mal l'arrêt de travail (3 mois de carence, 50% du revenu max). Un accident et c'est la catastrophe financière. Mon diagnostic gratuit identifie les trous dans votre couverture en 20 min."\n\nOBJECTIONS\n- "Je suis bien couvert par la CARMF" → "La CARMF verse max 100 €/jour après 90 jours de carence. Si votre train de vie est à 8 000 €/mois, c'est 5 000 €/mois de manque à gagner."\n- "Pas le temps" → "Je vous envoie un email avec une simulation CARMF vs complément prévoyance. 2 min de lecture."`,
  },
  {
    metier: 'infirmier',
    titre: 'Prise de contact — Infirmier(e) libéral(e)',
    contenu: `OUVERTURE\n"Bonjour [Prénom], c'est Ted, conseiller en gestion de patrimoine. J'accompagne des infirmiers libéraux en Île-de-France sur la retraite et la fiscalité. Vous avez 2 minutes entre deux tournées ?"\n\nQUALIFICATION\n"En tant qu'IDEL, vous cotisez à la CARPIMKO. Est-ce que vous savez combien vous toucherez à la retraite ? La plupart de mes clients IDEL découvrent que c'est autour de 1 200 €/mois..."\n\nPITCH VALEUR\n"Le problème des IDEL : vous travaillez énormément, le BNC est correct (60-90K), mais la retraite CARPIMKO est ridicule. Sans complément, vous passez de 5 000 €/mois à 1 200 €. Mon diagnostic montre exactement combien mettre de côté et où."\n\nOBJECTIONS\n- "J'ai un Madelin" → "Super. La question : est-ce calibré sur votre besoin réel à la retraite, ou c'est un montant standard ?"\n- "Je suis trop jeune" → "À 35-40 ans c'est le moment idéal. 200 €/mois maintenant = 120 000 € à 62 ans. À 50 ans il faudra 500 €/mois pour le même résultat."`,
  },
]

const SEQUENCE_TEMPLATES = [
  {
    name: 'Post-premier contact TNS',
    steps: [
      { channel: 'email', delay_days: 0, message_template: 'Objet : {{profession}} à {{ville}} — un point rapide sur votre situation\n\nBonjour {{prenom}},\n\nJe me permets de vous écrire suite à notre premier échange.\n\nUne question directe : savez-vous combien vous perdez chaque année en n\'optimisant pas votre fiscalité TNS ? Pour la plupart des {{profession}} que j\'accompagne, c\'est entre 3 000 et 8 000 € par an qui restent sur la table.\n\nCe n\'est pas un reproche — c\'est simplement que votre comptable optimise votre BNC, pas ce qui vient après.\n\nJe vous propose un diagnostic de 15 minutes, sans engagement, pour vérifier si c\'est votre cas ou non. Si tout est déjà optimisé, je vous le dirai.\n\nSeriez-vous disponible cette semaine ?\n\nTed — CGP Indépendant' },
      { channel: 'whatsapp', delay_days: 2, message_template: 'Bonjour {{prenom}}, c\'est Ted. Je vous ai envoyé un email il y a 2 jours sur l\'optimisation fiscale des {{profession}}. Est-ce que vous avez eu l\'occasion d\'y jeter un œil ? Je peux aussi vous résumer en 2 minutes au téléphone si c\'est plus simple.' },
      { channel: 'email', delay_days: 5, message_template: 'Objet : 4 200 € — c\'est ce qu\'un {{profession}} à {{ville}} économise en moyenne\n\nBonjour {{prenom}},\n\nCe n\'est pas un chiffre inventé. C\'est la moyenne constatée chez mes clients {{profession}} après optimisation.\n\nComment ? Trois leviers principaux :\n1. PER Madelin au plafond réel (pas le montant standard de votre comptable)\n2. Contrat de prévoyance recalibré sur votre BNC actuel\n3. Épargne réallouée pour battre l\'inflation au lieu de stagner\n\nLe plus frustrant ? Ces leviers existent depuis des années. Mais personne ne vous les a montrés parce que votre comptable ne vend pas de solutions financières, et votre banquier ne connaît pas la fiscalité TNS.\n\nC\'est exactement mon métier.\n\nToujours d\'accord pour 15 minutes cette semaine ?\n\nTed — CGP Indépendant' },
      { channel: 'sms', delay_days: 7, message_template: '{{prenom}}, c\'est Ted (CGP). Avez-vous pu lire mon email sur les leviers fiscaux des {{profession}} ? Un créneau de 15 min cette semaine pour en parler ? Pas d\'engagement.' },
      { channel: 'linkedin', delay_days: 10, message_template: 'Bonjour {{prenom}}, je me permets de vous contacter ici. J\'accompagne des {{profession}} en IDF sur un sujet précis : réduire leur fiscalité de 3 à 8K€/an tout en préparant leur retraite. Si le sujet vous parle, je suis disponible pour un échange de 15 min.' },
      { channel: 'email', delay_days: 14, message_template: 'Objet : Dernier message — la balle est dans votre camp\n\n{{prenom}},\n\nC\'est mon dernier email. Je ne vais pas vous harceler.\n\nTrois possibilités :\n1. Vous êtes déjà bien accompagné(e) → félicitations, c\'est rare\n2. Le sujet ne vous intéresse pas maintenant → aucun problème\n3. Vous n\'avez pas eu le temps → cet email peut attendre 6 mois\n\nDans tous les cas, gardez mes coordonnées. Le jour où vous vous demanderez "est-ce que je pourrais payer moins d\'impôts ?" ou "combien je toucherai à la retraite ?", vous saurez qui appeler.\n\nBonne continuation,\nTed — CGP Indépendant\n\nP.S. : Un simple "plus tard" me suffit. Je vous recontacterai quand VOUS serez prêt(e).' },
    ],
  },
  {
    name: 'Relance post-RDV 1 sans réponse',
    steps: [
      { channel: 'email', delay_days: 3, message_template: 'Objet : Suite à notre rendez-vous — votre récap\n\nBonjour {{prenom}},\n\nMerci pour notre échange de la semaine dernière. Je reviens vers vous avec le récapitulatif des points abordés :\n\n- Votre situation actuelle et les axes d\'amélioration identifiés\n- Les leviers spécifiques à votre profil de {{profession}}\n- Le calendrier optimal pour agir (avant ou après votre clôture annuelle)\n\nJ\'ai commencé à travailler sur votre simulation personnalisée. Elle sera prête d\'ici 48h.\n\nSouhaitez-vous que je vous l\'envoie par email, ou préférez-vous qu\'on la parcoure ensemble en 15 min ?\n\nTed — CGP Indépendant' },
      { channel: 'whatsapp', delay_days: 6, message_template: 'Bonjour {{prenom}}, c\'est Ted. Votre simulation est prête — 3 scénarios personnalisés pour votre profil de {{profession}}. Je vous l\'envoie par email ou vous préférez qu\'on en parle 10 min au téléphone ?' },
      { channel: 'sms', delay_days: 10, message_template: '{{prenom}}, Ted CGP. Votre étude est prête depuis quelques jours. Souhaitez-vous qu\'on se cale un créneau cette semaine ? 15 min suffisent pour parcourir les résultats.' },
      { channel: 'email', delay_days: 15, message_template: 'Objet : Votre étude patrimoniale — dernière relance\n\n{{prenom}},\n\nJe vous avais préparé une simulation personnalisée suite à notre RDV. Elle montre :\n- L\'économie fiscale réalisable dès cette année\n- La projection de votre capital à 10 ans\n- 2 actions concrètes à mettre en place avant le 31 décembre\n\nJe la garde de côté. Le jour où vous aurez 15 minutes, faites-moi signe et on la parcourt ensemble.\n\nPas d\'insistance de ma part — c\'est votre patrimoine, c\'est votre rythme.\n\nTed — CGP Indépendant' },
    ],
  },
  {
    name: 'Confirmation RDV automatique',
    steps: [
      { channel: 'email', delay_days: 0, message_template: 'Objet : Confirmation de votre RDV du {{date}} à {{heure}}\n\nBonjour {{prenom}},\n\nJe vous confirme notre rendez-vous le {{date}} à {{heure}}.\n\nPour que notre échange soit le plus utile possible, voici ce qui peut être pratique (facultatif) :\n- Votre dernier avis d\'imposition\n- Vos relevés d\'épargne ou assurance-vie\n- Tout contrat de prévoyance en cours\n\nSi vous n\'avez rien sous la main, ce n\'est pas grave — on travaillera avec ce qu\'on a.\n\nÀ très bientôt,\nTed — CGP Indépendant' },
      { channel: 'whatsapp', delay_days: 0, message_template: 'Bonjour {{prenom}}, petit rappel : notre RDV est demain à {{heure}}. Toujours bon pour vous ? Un pouce suffit pour confirmer. À demain !' },
      { channel: 'sms', delay_days: 0, message_template: 'Bonjour {{prenom}}, rappel RDV aujourd\'hui à {{heure}} avec Ted (CGP). Au plaisir d\'échanger avec vous !' },
    ],
  },
]

export async function GET(req: NextRequest) {
  const authError = verifyCronSecret(req)
  if (authError) return authError

  const supabase = createSupabaseCronClient()

  // Récupérer le premier user (single-tenant)
  const { data: users } = await supabase.from('user_settings').select('id').limit(1)
  if (!users || users.length === 0) return apiError('Aucun utilisateur trouvé')
  const userId = users[0].id

  const results = { scripts_created: 0, scripts_skipped: 0, sequences_created: 0, sequences_skipped: 0 }

  // 1. Seed call scripts
  for (const script of CALL_SCRIPTS) {
    const { data: existing } = await supabase
      .from('call_scripts')
      .select('id')
      .eq('user_id', userId)
      .eq('metier', script.metier)
      .eq('titre', script.titre)
      .maybeSingle()

    if (existing) { results.scripts_skipped++; continue }

    const { error } = await supabase.from('call_scripts').insert({
      user_id: userId,
      metier: script.metier,
      titre: script.titre,
      contenu: script.contenu,
      is_default: true,
    })
    if (!error) results.scripts_created++
  }

  // 2. Seed sequence templates
  for (const seq of SEQUENCE_TEMPLATES) {
    const { data: existing } = await supabase
      .from('sequence_templates')
      .select('id')
      .eq('user_id', userId)
      .eq('name', seq.name)
      .maybeSingle()

    if (existing) { results.sequences_skipped++; continue }

    const { data: tpl, error: tplErr } = await supabase
      .from('sequence_templates')
      .insert({ user_id: userId, name: seq.name, auto_trigger: false })
      .select('id')
      .single()

    if (tplErr || !tpl) continue

    const steps = seq.steps.map((s, i) => ({
      template_id: tpl.id,
      step_order: i + 1,
      channel: s.channel,
      delay_days: s.delay_days,
      message_template: s.message_template,
    }))

    await supabase.from('sequence_template_steps').insert(steps)
    results.sequences_created++
  }

  return apiSuccess(results)
}
