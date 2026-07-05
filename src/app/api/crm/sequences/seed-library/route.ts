import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

// Chaque step a 2-3 variantes. La variante A est celle installée par défaut.
// L'utilisateur peut switcher via Settings → Séquences ou éditer librement.

const LIBRARY = [
  {
    name: 'Post-premier contact TNS',
    steps: [
      {
        channel: 'email', delay_days: 0,
        variants: [
          `Objet : {{profession}} à {{ville}} — un point rapide sur votre situation

Bonjour {{prenom}},

Je me permets de vous écrire suite à notre premier échange.

Une question directe : savez-vous combien vous perdez chaque année en n'optimisant pas votre fiscalité TNS ? Pour la plupart des {{profession}} que j'accompagne, c'est entre 3 000 et 8 000 € par an qui restent sur la table.

Ce n'est pas un reproche — c'est simplement que votre comptable optimise votre BNC, pas ce qui vient après.

Je vous propose un diagnostic de 15 minutes, sans engagement, pour vérifier si c'est votre cas ou non. Si tout est déjà optimisé, je vous le dirai.

Seriez-vous disponible cette semaine ?

Ted — CGP Indépendant`,
          `Objet : Une question pour vous, {{prenom}}

Bonjour {{prenom}},

Je vais être direct : j'accompagne des {{profession}} en Île-de-France, et 9 sur 10 découvrent qu'ils laissent entre 3 000 et 8 000 € par an à l'État sans le savoir.

Le problème n'est pas votre comptable — il fait son travail sur le BNC. Le problème, c'est que personne ne regarde ce qui se passe APRÈS : votre épargne, votre retraite, votre prévoyance.

Est-ce que 15 minutes de votre temps valent potentiellement 5 000 € d'économies annuelles ?

Si oui, dites-moi quel créneau vous arrange.

Ted — CGP Indépendant`,
          `Objet : Ce que votre comptable ne vous dit pas

Bonjour {{prenom}},

Votre comptable gère votre 2035. C'est son métier, il le fait bien.

Mais qui s'occupe du reste ? Qui vérifie que :
- Votre PER Madelin est calibré au bon montant (pas un forfait standard)
- Votre prévoyance couvre réellement votre train de vie en cas d'arrêt
- Votre épargne fait mieux que l'inflation

En tant que {{profession}}, vous avez des leviers spécifiques que peu de conseillers maîtrisent.

15 minutes au téléphone pour savoir si vous êtes dans les clous ou pas. Intéressé ?

Ted — CGP Indépendant`,
          `Objet : {{profession}} — l'erreur que personne ne vous signale

Bonjour {{prenom}},

Vous savez ce qui m'agace le plus dans mon métier ?

C'est de voir des {{profession}} perdre 5 000 à 8 000 € par an en optimisation fiscale... et que PERSONNE ne leur dise.

Pas leur comptable (qui optimise le BNC, pas le reste).
Pas leur banquier (qui n'est pas formé sur la fiscalité TNS).
Pas leur assureur (qui vend de la prévoyance, pas du conseil patrimonial).

Résultat : vous payez plein pot alors que des leviers légaux existent depuis des années.

Je vous propose 15 minutes au téléphone. Sans produit à vendre. Juste un constat : êtes-vous dans cette situation ou pas ?

Si oui, je vous montre les leviers. Si non, tant mieux pour vous.

Ted — CGP Indépendant`,
          `Objet : Une question directe pour vous, {{prenom}}

Bonjour {{prenom}},

Savez-vous exactement combien vous toucherez à la retraite avec vos droits actuels CIPAV/CARPIMKO/CARMF ?

La plupart des {{profession}} que je rencontre découvrent un chiffre qui fait mal :
- BNC actuel : 85 000 €/an → Vie confortable
- Retraite obligatoire : 22 000 €/an → Chute de 74%

C'est mathématique. Ce n'est pas une opinion.

La question n'est pas "faut-il anticiper ?" (évidemment oui). La question est "combien, où, et à partir de quand ?".

15 minutes pour votre simulation personnalisée. Pas de produit à vendre. Juste les chiffres.

Ted — CGP Indépendant`,
          `Objet : Ce que votre comptable ne vous dira jamais

{{prenom}},

Votre comptable fait son travail. Il optimise votre 2035, gère vos charges, calcule votre BNC.

Mais il ne vous parlera JAMAIS de :
- Votre plafond PER Madelin réel (vs le forfait standard qu'il utilise)
- La retraite complémentaire obligatoire (qui versera 30% de votre revenu actuel)
- L'épargne qui dort sur vos comptes et perd face à l'inflation

Pourquoi ? Ce n'est pas son métier. Il ne vend pas de produits financiers.

Le problème : personne d'autre ne le fait non plus.

Résultat : des {{profession}} à {{ville}} qui perdent 4 000 à 7 000 €/an sans le savoir.

15 minutes pour vérifier si c'est votre cas.

Ted — CGP Indépendant`,
        ],
      },
      {
        channel: 'whatsapp', delay_days: 2,
        variants: [
          `Bonjour {{prenom}}, c'est Ted. Je vous ai envoyé un email il y a 2 jours sur l'optimisation fiscale des {{profession}}. Est-ce que vous avez eu l'occasion d'y jeter un œil ? Je peux aussi vous résumer en 2 minutes au téléphone si c'est plus simple.`,
          `Bonjour {{prenom}}, Ted ici (CGP). Petite question rapide : est-ce que vous savez combien vous toucherez à la retraite avec vos droits actuels ? Pour les {{profession}}, c'est souvent une mauvaise surprise. Mon email de mardi en parlait — n'hésitez pas si vous voulez qu'on en discute.`,
          `Bonjour {{prenom}}, c'est Ted. Je ne vais pas vous faire un pitch par WhatsApp — juste vous poser une question : est-ce que quelqu'un a déjà fait un audit complet de votre situation patrimoniale de {{profession}} ? Si la réponse est non, ça vaut 15 minutes de votre temps. Si oui, tant mieux !`,
          `Bonjour {{prenom}}, Ted (CGP). Mon email de lundi parlait d'optimisation fiscale des {{profession}}. Petite question : avez-vous déjà fait chiffrer l'écart entre votre train de vie actuel et votre retraite future ? La plupart découvrent un trou de 3 000 €/mois. 15 min pour votre calcul personnalisé ?`,
          `{{prenom}}, Ted ici. Une question rapide : si vous deviez vous arrêter 6 mois pour raison médicale demain, combien toucheriez-vous par mois de votre prévoyance ? Si vous ne connaissez pas le chiffre précis, c'est mauvais signe. La plupart des {{profession}} découvrent qu'ils sont sous-couverts. 10 min pour vérifier ?`,
          `Bonjour {{prenom}}, c'est Ted (CGP). J'ai accompagné 3 {{profession}} à {{ville}} ce mois-ci. Résultat moyen : 4 800 € d'économies fiscales la première année. Pas de magie — juste les bons leviers au bon moment. Curieux de savoir ce que ça donnerait pour vous ? 15 min cette semaine ?`,
        ],
      },
      {
        channel: 'email', delay_days: 5,
        variants: [
          `Objet : 4 200 € — c'est ce qu'un {{profession}} à {{ville}} économise en moyenne

Bonjour {{prenom}},

Ce n'est pas un chiffre inventé. C'est la moyenne constatée chez mes clients {{profession}} après optimisation.

Comment ? Trois leviers principaux :
1. PER Madelin au plafond réel (pas le montant standard de votre comptable)
2. Contrat de prévoyance recalibré sur votre BNC actuel
3. Épargne réallouée pour battre l'inflation au lieu de stagner

Le plus frustrant ? Ces leviers existent depuis des années. Mais personne ne vous les a montrés parce que votre comptable ne vend pas de solutions financières, et votre banquier ne connaît pas la fiscalité TNS.

C'est exactement mon métier.

Toujours d'accord pour 15 minutes cette semaine ?

Ted — CGP Indépendant`,
          `Objet : Le piège dans lequel tombent 80% des {{profession}}

Bonjour {{prenom}},

Le piège, c'est de croire que "ça tourne" = "c'est optimisé".

Votre cabinet tourne, votre BNC est correct, vous payez vos charges. Tout va bien en surface.

Mais en dessous :
- Votre retraite CIPAV/CARPIMKO versera 30-40% de votre revenu actuel (le saviez-vous ?)
- Votre prévoyance a probablement une carence de 90 jours (survivez-vous 3 mois sans revenus ?)
- Votre épargne sur Livret A rapporte moins que l'inflation (vous perdez du pouvoir d'achat chaque mois)

Ce n'est pas de votre faute. C'est juste que personne ne vous a posé ces questions.

Je vous les pose maintenant. 15 minutes, pas de produit à vendre, juste un constat.

Ted — CGP Indépendant`,
          `Objet : Un {{profession}} comme vous — les chiffres qui font mal

Bonjour {{prenom}},

Cas réel (anonymisé) : {{profession}}, 44 ans, BNC 92 000 €/an.

Situation avant mon intervention :
- Retraite projetée CARPIMKO : 1 950 €/mois
- Train de vie actuel : 5 200 €/mois
- Écart : -3 250 €/mois = -39 000 €/an
- Durée retraite estimée : 25 ans
- Manque à gagner total : 975 000 €

Après mise en place PER Madelin + épargne diversifiée :
- Complément retraite : +2 100 €/mois
- Coût réel après déduction fiscale : 420 €/mois
- Écart comblé : 64%

Il reste un gap. Mais c'est 642 000 € de moins à perdre.

Votre situation est différente. Mais les leviers sont les mêmes.

20 minutes pour votre simulation ?

Ted — CGP Indépendant`,
          `Objet : Dans 10 ans, vous regretterez de ne pas avoir lu cet email

{{prenom}},

J'ai un client {{profession}} de 54 ans qui me dit souvent :
"Si j'avais su à 40 ans ce que je sais maintenant, j'aurais 180 000 € de plus sur mon patrimoine."

Le coût de l'inaction n'est pas visible. Il est silencieux.

Chaque année sans PER Madelin optimisé = 3 200 € d'économies fiscales perdues.
Chaque année sans épargne qui bat l'inflation = 2 400 € de pouvoir d'achat évaporé.
Chaque année sans prévoyance calibrée = risque d'effondrement si accident.

Sur 15 ans : 84 000 € partis en fumée.

Vous avez 40 ans ? Vous avez le temps.
Vous avez 50 ans ? Vous avez encore une fenêtre.
Vous avez 55 ans ? C'est maintenant ou jamais.

15 minutes pour savoir où vous en êtes.

Ted — CGP Indépendant`,
          `Objet : Benchmark {{profession}} IDF — où vous situez-vous ?

Bonjour {{prenom}},

J'accompagne 23 {{profession}} en Île-de-France. Voici ce que montrent les chiffres :

**Top 20% (les mieux préparés)**
- PER Madelin au plafond réel : 100%
- Prévoyance complète arrêt travail : 100%
- Épargne diversifiée > Livret A : 85%
- Retraite projetée / train de vie : 72%

**80% restants (la majorité)**
- PER Madelin absent ou sous-optimal : 73%
- Prévoyance standard insuffisante : 68%
- Épargne concentrée Livret A / fonds euros : 82%
- Retraite projetée / train de vie : 34%

La différence ? Pas le BNC. Pas le talent. Juste l'anticipation.

Dans quelle catégorie êtes-vous ?

15 minutes pour le découvrir.

Ted — CGP Indépendant`,
        ],
      },
      {
        channel: 'sms', delay_days: 7,
        variants: [
          `{{prenom}}, c'est Ted (CGP). Avez-vous pu lire mon email sur les leviers fiscaux des {{profession}} ? Un créneau de 15 min cette semaine pour en parler ? Pas d'engagement.`,
          `Bonjour {{prenom}}, Ted CGP. Question directe : votre PER Madelin est-il calibré sur votre BNC réel ou sur un forfait standard ? Si vous ne savez pas, c'est mauvais signe. On peut vérifier en 10 min.`,
          `{{prenom}}, Ted ici. Je ne vais pas vous relancer 10 fois — juste une fois de plus. 15 min pour savoir si vous laissez de l'argent à l'État. Intéressé(e) ?`,
          `{{prenom}}, Ted CGP. Dernière relance SMS. Si le sujet optimisation fiscale TNS ne vous parle pas maintenant, gardez mes coordonnées pour plus tard. Mais sachez qu'attendre 5 ans = 20 000 € de manque à gagner. 15 min si vous voulez voir les chiffres.`,
          `Bonjour {{prenom}}, Ted (CGP). Question simple : préférez-vous économiser 3 500 € d'impôts cette année ou les donner au fisc ? Si option 1, 15 min d'appel avant le 31 décembre. Pas de produit à vendre.`,
          `{{prenom}}, c'est Ted. 3 {{profession}} à {{ville}} m'ont dit cette semaine "j'aurais dû faire ça plus tôt". Ne soyez pas le 4ème dans 5 ans. 15 min pour savoir si vous êtes bien couvert ou pas.`,
        ],
      },
      {
        channel: 'linkedin', delay_days: 10,
        variants: [
          `Bonjour {{prenom}}, je me permets de vous contacter ici. J'accompagne des {{profession}} en IDF sur un sujet précis : réduire leur fiscalité de 3 à 8K€/an tout en préparant leur retraite. Si le sujet vous parle, je suis disponible pour un échange de 15 min.`,
          `{{prenom}}, bonjour. CGP indépendant, je travaille exclusivement avec des professionnels libéraux. Une question : avez-vous déjà fait chiffrer l'écart entre votre retraite obligatoire et votre train de vie actuel ? C'est souvent le déclic. Ouvert à un échange ?`,
          `{{prenom}}, bonjour. CGP indépendant, j'aide des {{profession}} à éviter la chute de revenus à la retraite (-60% en moyenne). Si vous n'avez jamais fait simuler votre retraite TNS vs votre train de vie actuel, ça vaut 20 min. Ouvert à un échange ?`,
          `Bonjour {{prenom}}, Ted — CGP spécialisé TNS. Une stat qui fait réfléchir : 78% des {{profession}} que je rencontre sont sous-optimisés fiscalement (PER Madelin absent ou mal calibré). Si vous voulez vérifier que vous n'êtes pas dans ce cas, échangeons 15 min ?`,
          `{{prenom}}, bonjour. J'accompagne des {{profession}} en IDF sur un sujet précis : transformer leur BNC élevé en patrimoine qui travaille pour eux (et pas l'inverse). Si le sujet vous parle, je suis dispo pour un échange de 20 min.`,
        ],
      },
      {
        channel: 'email', delay_days: 14,
        variants: [
          `Objet : Dernier message — la balle est dans votre camp

{{prenom}},

C'est mon dernier email. Je ne vais pas vous harceler.

Trois possibilités :
1. Vous êtes déjà bien accompagné(e) → félicitations, c'est rare
2. Le sujet ne vous intéresse pas maintenant → aucun problème
3. Vous n'avez pas eu le temps → cet email peut attendre 6 mois

Dans tous les cas, gardez mes coordonnées. Le jour où vous vous demanderez "est-ce que je pourrais payer moins d'impôts ?" ou "combien je toucherai à la retraite ?", vous saurez qui appeler.

Bonne continuation,
Ted — CGP Indépendant

P.S. : Un simple "plus tard" me suffit. Je vous recontacterai quand VOUS serez prêt(e).`,
          `Objet : Je m'arrête ici

Bonjour {{prenom}},

Pas de réponse = je comprends le message. Pas de souci.

Mais avant de clore ce chapitre, un dernier chiffre : un {{profession}} qui optimise sa situation avec un CGP gagne en moyenne 4 200 €/an. Sur 10 ans, c'est 42 000 € + les intérêts composés.

Si un jour ce chiffre vous interpelle, répondez à cet email. Même dans un an.

Excellente continuation à vous,
Ted — CGP Indépendant`,
          `Objet : Je m'arrête ici — mais la porte reste ouverte

{{prenom}},

C'est mon dernier email sur ce sujet.

Vous n'avez pas répondu. Trois raisons possibles :
1. Vous êtes déjà bien accompagné → tant mieux
2. Le timing n'est pas bon → je comprends
3. Vous pensez que "ça peut attendre" → erreur coûteuse

Si c'est la raison 3, un chiffre à retenir :
Repousser l'optimisation fiscale de 5 ans = 22 000 € de manque à gagner minimum.

La porte reste ouverte. Répondez à cet email dans 6 mois, un an, deux ans. Je serai là.

Ted — CGP Indépendant

P.S. : Si un jour vous vous dites "j'aurais dû", vous saurez qui contacter.`,
          `Objet : Le scénario que personne ne veut imaginer

{{prenom}},

Dernier email. Je vous laisse avec un scénario.

Vous avez 48 ans. BNC 95 000 €. Train de vie 6 000 €/mois.
Vous partez à la retraite à 64 ans.
Votre caisse obligatoire vous verse 2 100 €/mois.

Vous avez deux options :

**Option A — Vous anticipez maintenant**
- 15 ans d'épargne optimisée = complément retraite de 2 400 €/mois
- Retraite totale : 4 500 €/mois
- Niveau de vie : 75% maintenu

**Option B — Vous ne faites rien**
- Retraite : 2 100 €/mois
- Niveau de vie : 35% maintenu
- Vous vendez la résidence secondaire, vous rognez sur tout, vous regrettez

Ce n'est pas du catastrophisme. C'est de l'arithmétique.

La balle est dans votre camp.

Ted — CGP Indépendant`,
          `Objet : Dernière fenêtre avant clôture de dossier

{{prenom}},

Je ne vais pas vous relancer indéfiniment.

Soit le sujet vous intéresse → répondez "oui" et on cale 15 min
Soit ça ne vous parle pas → répondez "non merci" et je clos le dossier

Pas de jugement. Pas d'insistance. Juste de la clarté.

Ce que je sais après 7 ans à accompagner des TNS :
- Ceux qui anticipent gagnent en moyenne 68 000 € sur 15 ans
- Ceux qui repoussent le regrettent tous (sans exception)

Vous êtes dans quelle catégorie ?

Ted — CGP Indépendant

P.S. : "Plus tard" = jamais. Si vous voulez agir, c'est maintenant.`,
        ],
      },
    ],
  },
  {
    name: 'Relance post-RDV 1 sans réponse',
    steps: [
      {
        channel: 'email', delay_days: 3,
        variants: [
          `Objet : Suite à notre rendez-vous — votre récap

Bonjour {{prenom}},

Merci pour notre échange de la semaine dernière. Je reviens vers vous avec le récapitulatif des points abordés :

- Votre situation actuelle et les axes d'amélioration identifiés
- Les leviers spécifiques à votre profil de {{profession}}
- Le calendrier optimal pour agir (avant ou après votre clôture annuelle)

J'ai commencé à travailler sur votre simulation personnalisée. Elle sera prête d'ici 48h.

Souhaitez-vous que je vous l'envoie par email, ou préférez-vous qu'on la parcoure ensemble en 15 min ?

Ted — CGP Indépendant`,
          `Objet : Votre simulation est en cours

{{prenom}},

Notre échange m'a permis d'identifier 2-3 pistes concrètes pour votre situation.

Je travaille actuellement sur une simulation chiffrée qui montrera :
- L'économie fiscale potentielle sur 2026
- La projection de votre retraite avec vs sans optimisation
- Le coût réel de l'inaction (ce que vous "perdez" chaque mois)

Question : est-ce que je vous envoie ça par email ou on en reparle ensemble pour que je vous explique les hypothèses ?

Ted — CGP Indépendant`,
        ],
      },
      {
        channel: 'whatsapp', delay_days: 6,
        variants: [
          `Bonjour {{prenom}}, c'est Ted. Votre simulation est prête — 3 scénarios personnalisés pour votre profil de {{profession}}. Je vous l'envoie par email ou vous préférez qu'on en parle 10 min au téléphone ?`,
          `{{prenom}}, bonjour. Ted ici. J'ai finalisé l'étude dont on avait parlé. Résultat : il y a clairement de la marge d'optimisation. On se fait un point rapide cette semaine pour que je vous montre les chiffres ?`,
          `Bonjour {{prenom}}, Ted (CGP). Simple question : avez-vous eu le temps de réfléchir à notre échange ? Pas de pression — je veux juste savoir si je continue à avancer sur votre dossier ou si on repousse.`,
        ],
      },
      {
        channel: 'sms', delay_days: 10,
        variants: [
          `{{prenom}}, Ted CGP. Votre étude est prête depuis quelques jours. Souhaitez-vous qu'on se cale un créneau cette semaine ? 15 min suffisent pour parcourir les résultats.`,
          `Bonjour {{prenom}}, votre simulation personnalisée montre un potentiel d'économie intéressant. Dispo pour un rapide échange ? Ted — CGP`,
        ],
      },
      {
        channel: 'email', delay_days: 15,
        variants: [
          `Objet : Votre étude patrimoniale — dernière relance

{{prenom}},

Je vous avais préparé une simulation personnalisée suite à notre RDV. Elle montre :
- L'économie fiscale réalisable dès cette année
- La projection de votre capital à 10 ans
- 2 actions concrètes à mettre en place avant le 31 décembre

Je la garde de côté. Le jour où vous aurez 15 minutes, faites-moi signe et on la parcourt ensemble.

Pas d'insistance de ma part — c'est votre patrimoine, c'est votre rythme.

Ted — CGP Indépendant`,
          `Objet : Je garde votre dossier ouvert

{{prenom}},

Notre échange m'a confirmé qu'il y a des leviers activables pour votre situation de {{profession}}.

Je ne vais plus vous relancer — vous avez mes coordonnées, vous savez ce que je fais.

Quand le moment sera bon pour vous (déclaration fiscale, changement de situation, question retraite...), n'hésitez pas à me recontacter. Votre dossier reste ouvert.

Bonne continuation,
Ted — CGP Indépendant`,
        ],
      },
    ],
  },
  {
    name: 'Confirmation RDV automatique',
    steps: [
      {
        channel: 'email', delay_days: 0,
        variants: [
          `Objet : Confirmation de votre RDV du {{date}} à {{heure}}

Bonjour {{prenom}},

Je vous confirme notre rendez-vous le {{date}} à {{heure}}.

Pour que notre échange soit le plus utile possible, voici ce qui peut être pratique (facultatif) :
- Votre dernier avis d'imposition
- Vos relevés d'épargne ou assurance-vie
- Tout contrat de prévoyance en cours

Si vous n'avez rien sous la main, ce n'est pas grave — on travaillera avec ce qu'on a.

À très bientôt,
Ted — CGP Indépendant`,
          `Objet : RDV confirmé — {{date}} {{heure}}

{{prenom}},

C'est noté pour le {{date}} à {{heure}}.

Pas besoin de préparer un dossier complet — si vous avez votre dernier avis d'imposition et une idée de votre épargne actuelle, c'est largement suffisant pour qu'on avance.

On se retrouve en visio (le lien suivra) ou par téléphone selon votre préférence.

À bientôt,
Ted`,
        ],
      },
      {
        channel: 'whatsapp', delay_days: 0,
        variants: [
          `Bonjour {{prenom}}, petit rappel : notre RDV est demain à {{heure}}. Toujours bon pour vous ? Un pouce suffit pour confirmer. À demain !`,
          `{{prenom}}, rappel pour demain {{heure}}. Si vous avez un empêchement, pas de souci — on décale. Sinon, à demain ! Ted`,
        ],
      },
      {
        channel: 'sms', delay_days: 0,
        variants: [
          `Bonjour {{prenom}}, rappel RDV aujourd'hui à {{heure}} avec Ted (CGP). Au plaisir d'échanger avec vous !`,
          `{{prenom}}, RDV dans quelques heures ({{heure}}). À tout à l'heure ! Ted — CGP`,
        ],
      },
    ],
  },
  {
    name: 'Constituer votre épargne TNS',
    steps: [
      {
        channel: 'email', delay_days: 0,
        variants: [
          `Objet : Votre épargne travaille-t-elle vraiment pour vous ?

Bonjour {{prenom}},

Question directe : où est votre épargne aujourd'hui ?

Si la réponse est "Livret A + un peu d'assurance-vie en fonds euros", alors vous perdez de l'argent chaque mois. Littéralement. L'inflation est à 2,5%, votre Livret A rapporte 2,4%, votre fonds euros 1,8%.

En tant que {{profession}}, vous avez un avantage que les salariés n'ont pas : le PER Madelin est déductible à 100% de votre BNC. Ça veut dire que chaque euro placé vous fait économiser 30 à 41 centimes d'impôt immédiatement.

Et pourtant, 67% des TNS n'ont pas de PER, ou un PER mal calibré.

15 minutes pour vérifier si vous êtes dans le bon tiers ou dans les deux mauvais. Intéressé ?

Ted — CGP Indépendant`,
          `Objet : 3 min de lecture qui valent potentiellement 4 000 €/an

{{prenom}},

Un chiffre : 4 217 €. C'est l'économie fiscale moyenne que réalisent mes clients {{profession}} la première année après optimisation.

Comment ? Pas de magie :
- PER Madelin recalibré sur le vrai plafond (pas le forfait comptable)
- Épargne sortie du Livret A vers des supports qui battent l'inflation
- Prévoyance ajustée (souvent sur-assurée sur certains risques, sous-assurée sur d'autres)

La vraie question : est-ce que VOTRE épargne est optimisée, ou est-ce qu'elle "dort" ?

Un diagnostic de 15 min permet de le savoir. Pas de produit à vendre — juste un constat.

Ted — CGP Indépendant`,
        ],
      },
      {
        channel: 'whatsapp', delay_days: 2,
        variants: [
          `Bonjour {{prenom}}, Ted (CGP). Je vous ai envoyé un email sur l'optimisation de l'épargne des {{profession}}. Si vous avez 2 min, une seule question : votre PER Madelin est-il au maximum déductible ou en-dessous ? La réponse vaut potentiellement 3 000 €/an.`,
          `{{prenom}}, c'est Ted. Petite question : combien rapporte votre épargne actuellement ? Si c'est moins de 4%, il y a probablement mieux à faire sans prendre plus de risques. Mon email de cette semaine en parle — jetez-y un œil ?`,
        ],
      },
      {
        channel: 'email', delay_days: 5,
        variants: [
          `Objet : Un {{profession}} comme vous a triplé son rendement — voici comment

Bonjour {{prenom}},

Cas réel (anonymisé) : un {{profession}} à {{ville}}, 42 ans, BNC 95 000 €.

Avant :
- 45 000 € sur Livret A (rapporte 1 080 €/an)
- 30 000 € en fonds euros (rapporte 540 €/an)
- Pas de PER Madelin
- Total rendement : 1 620 €/an

Après réallocation :
- 25 000 € en PER Madelin (économie fiscale : 7 500 €/an à TMI 30%)
- 30 000 € en AV multisupports (rendement moyen 5,2%)
- 20 000 € en liquidités de sécurité
- Total gain : 9 060 €/an (rendement + économie fiscale)

Différence : +7 440 €/an. En 10 ans, avec les intérêts composés : +94 000 €.

Votre situation est-elle similaire ? 15 min pour le savoir.

Ted — CGP Indépendant`,
          `Objet : Ce que font les {{profession}} qui gèrent bien leur argent

{{prenom}},

Après 5 ans à accompagner des {{profession}}, voici ce que font ceux qui s'en sortent le mieux :

1. Ils maximisent leur PER Madelin (économie fiscale immédiate de 30-41% du montant versé)
2. Ils gardent 3 mois de charges en liquidités, pas plus
3. Ils placent le reste sur des supports qui battent l'inflation (AV multisupports, SCPI, PEA)
4. Ils revoient leur allocation chaque année

Et ceux qui ne font rien ? Ils perdent en moyenne 4 000 €/an en opportunités manquées.

Vous êtes dans quel camp ?

Ted — CGP Indépendant`,
        ],
      },
      {
        channel: 'sms', delay_days: 8,
        variants: [
          `{{prenom}}, Ted (CGP). Avez-vous eu le temps de lire mon email sur l'épargne des {{profession}} ? Un créneau jeudi ou vendredi pour un point rapide ?`,
          `Bonjour {{prenom}}, Ted CGP. Question simple : votre épargne bat-elle l'inflation ? Si vous ne savez pas, la réponse est probablement non. 15 min pour vérifier ?`,
        ],
      },
      {
        channel: 'email', delay_days: 14,
        variants: [
          `Objet : Je ne vous écrirai plus sur ce sujet

{{prenom}},

Dernier email de ma part sur l'épargne. Pas d'insistance.

Un seul chiffre à garder en tête : chaque année qui passe sans optimisation, c'est ~4 000 € d'économies en moins sur votre patrimoine final.

Sur 10 ans = 40 000 €. Sur 20 ans = 100 000 €+ (intérêts composés).

Le jour où vous voudrez faire le point, répondez à cet email. Même dans un an ou deux.

Bonne continuation,
Ted — CGP Indépendant`,
          `Objet : La porte reste ouverte

{{prenom}},

Je comprends que ce n'est peut-être pas le bon moment. Les journées de {{profession}} sont longues et le patrimoine passe souvent après.

Mais le temps joue contre vous — pas pour vous. Chaque année sans optimisation a un coût réel.

Je ne vous relancerai plus. Quand le moment sera bon, vous saurez où me trouver.

Ted — CGP Indépendant`,
        ],
      },
    ],
  },
  {
    name: 'Valoriser votre patrimoine',
    steps: [
      { channel: 'email', delay_days: 0, variants: [
        `Objet : Vous venez de libérer de la capacité d'épargne — et maintenant ?

Bonjour {{prenom}},

Fin de crédit, prime, héritage, augmentation de revenus... Quand on libère 1 000 à 2 000 €/mois de capacité d'épargne, la tentation est de ne rien faire. Ou de laisser ça sur le compte courant "en attendant".

Sauf que "en attendant" a un coût : 1 500 €/mois placés à 5% net pendant 10 ans = 232 000 €. Laissés sur un compte courant = 180 000 € (et encore, sans compter l'inflation).

Différence : 52 000 €. C'est le prix de l'inaction.

En tant que {{profession}}, vous avez en plus des leviers fiscaux (PER Madelin, AV luxembourgeoise) qui amplifient le rendement.

20 minutes pour modéliser votre situation et voir le potentiel réel. Intéressé ?

Ted — CGP Indépendant`,
        `Objet : 1 500 €/mois × 10 ans = combien exactement ?

{{prenom}},

La réponse dépend de ce que vous en faites :
- Compte courant : 180 000 € (et l'inflation mange 2% par an)
- Fonds euros : 198 000 €
- Stratégie diversifiée (AV + PER + PEA) : 232 000 à 260 000 €

Ça vaut 20 minutes de votre temps pour voir quel scénario est possible pour vous ?

Ted — CGP Indépendant`,
      ]},
      { channel: 'whatsapp', delay_days: 3, variants: [
        `Bonjour {{prenom}}, Ted (CGP). Mon email de cette semaine parlait d'optimisation de votre capacité d'épargne. Une question : avez-vous un plan pour votre excédent mensuel ou ça reste sur le compte courant ? Pas de jugement — c'est le cas de 70% des TNS.`,
        `{{prenom}}, Ted ici. Vous avez probablement de la capacité d'épargne non utilisée. La question n'est pas SI vous devez la placer, mais OÙ et COMMENT pour maximiser le rendement. Un point rapide ?`,
      ]},
      { channel: 'email', delay_days: 7, variants: [
        `Objet : Exemple réel — un {{profession}} à {{ville}}

Bonjour {{prenom}},

Cas concret : {{profession}}, 44 ans, {{ville}}. BNC 110 000 €.

Situation avant :
- 2 200 €/mois d'excédent → compte courant
- Pas de PER (économie fiscale perdue : 6 600 €/an)
- Assurance-vie fonds euros à 1,8%

Stratégie mise en place :
- 800 €/mois sur PER Madelin (économie immédiate : 240 €/mois d'impôts)
- 1 000 €/mois sur AV multisupports (profil équilibré, 5-6% visé)
- 400 €/mois en épargne de précaution

Résultat année 1 : +6 600 € d'économies fiscales + 3 800 € de rendement = 10 400 € de gain vs ne rien faire.

Votre situation permet-elle mieux ? Pire ? Pareil ? 20 min pour le savoir.

Ted — CGP Indépendant`,
      ]},
      { channel: 'linkedin', delay_days: 10, variants: [
        `{{prenom}}, bonjour. CGP spécialisé TNS — j'aide des {{profession}} à transformer leur capacité d'épargne dormante en patrimoine productif. Si le sujet vous parle, ouvert à un échange de 20 min ?`,
      ]},
      { channel: 'email', delay_days: 14, variants: [
        `Objet : Dernière fois

{{prenom}},

Le temps passe, l'argent dort. Chaque mois sans stratégie est un mois de rendement perdu.

Je ne vous relancerai plus — vous connaissez maintenant mon approche. Le jour où vous voudrez faire travailler votre argent au lieu de le laisser dormir, vous saurez qui contacter.

Bonne continuation,
Ted — CGP Indépendant`,
      ]},
    ],
  },
  {
    name: 'Préparer votre retraite TNS',
    steps: [
      { channel: 'email', delay_days: 0, variants: [
        `Objet : Votre retraite de {{profession}} : le chiffre qui fait mal

Bonjour {{prenom}},

Combien toucherez-vous à la retraite ? Avez-vous déjà fait le calcul ?

Pour un {{profession}} avec un BNC de 80 000 €, la retraite obligatoire (CIPAV/CARPIMKO/CARMF) verse environ 1 800 à 2 200 €/mois. Soit une chute de 60 à 70% de vos revenus.

Dit autrement : vous passez de 5 500 €/mois nets à 2 000 €. Du jour au lendemain.

La bonne nouvelle : plus tôt on s'y prend, moins l'effort est important. À 40 ans, 500 €/mois suffisent pour combler le gap. À 55 ans, il faut 1 500 €/mois.

Un diagnostic retraite prend 20 minutes. Il permet de savoir exactement :
- Combien vous toucherez (calcul réel, pas une estimation)
- Combien il manque par rapport à votre train de vie
- Quel effort mensuel est nécessaire pour combler l'écart

Intéressé ?

Ted — CGP Indépendant`,
        `Objet : Retraite des {{profession}} — la vérité en chiffres

{{prenom}},

Posons les chiffres. Un {{profession}} qui gagne 90 000 €/an touchera environ 24 000 €/an à la retraite de la caisse obligatoire.

C'est 66 000 € de moins par an. Soit 5 500 €/mois de manque à gagner.

Personne ne peut maintenir son train de vie avec une chute de 73%.

La question n'est pas "faut-il anticiper ?" (la réponse est évidemment oui). La question est "comment, et combien par mois ?".

20 minutes pour une simulation personnalisée basée sur VOS chiffres. Pas des moyennes.

Ted — CGP Indépendant`,
      ]},
      { channel: 'whatsapp', delay_days: 2, variants: [
        `Bonjour {{prenom}}, Ted (CGP). Avez-vous lu mon email sur la retraite des {{profession}} ? Le chiffre clé : -65% de revenus le jour de la retraite sans complément. Je peux vous faire une simulation personnalisée en 20 min si le sujet vous parle.`,
        `{{prenom}}, Ted ici. Une question simple : savez-vous combien vous toucherez à la retraite ? Pas une estimation vague — le vrai chiffre. Si vous ne le connaissez pas, c'est exactement le problème. 20 min pour le calculer ensemble ?`,
      ]},
      { channel: 'email', delay_days: 5, variants: [
        `Objet : Votre simulation retraite — ce que montrent les chiffres

Bonjour {{prenom}},

Pour vous donner un ordre de grandeur (à affiner ensemble) :

{{profession}}, BNC 90 000 €, 42 ans :
- Sans rien faire : retraite à 62 ans = ~2 100 €/mois
- Avec PER Madelin 600 €/mois dès maintenant : retraite = ~3 200 €/mois
- Bonus : économie fiscale immédiate de 2 160 €/an (TMI 30%)

L'effort net réel après avantage fiscal : 420 €/mois (pas 600 €).

C'est comme si l'État finançait 30% de votre retraite supplémentaire. Mais il faut agir pour en bénéficier.

20 minutes pour votre simulation personnalisée ?

Ted — CGP Indépendant`,
      ]},
      { channel: 'sms', delay_days: 8, variants: [
        `{{prenom}}, Ted CGP. Votre simulation retraite est prête à être lancée — il me manque juste 20 min avec vous. Créneau cette semaine ?`,
        `Bonjour {{prenom}}, Ted (CGP). Plus on repousse le sujet retraite, plus l'effort mensuel augmente. 20 min maintenant pour quantifier. Dispo cette semaine ?`,
      ]},
      { channel: 'linkedin', delay_days: 12, variants: [
        `{{prenom}}, bonjour. J'aide des {{profession}} à anticiper la chute de revenus à la retraite (-60 à 70% pour les TNS). Si vous n'avez jamais fait le calcul précis, ça vaut 20 min de votre temps. Ouvert à un échange ?`,
      ]},
      { channel: 'email', delay_days: 18, variants: [
        `Objet : Le temps qui passe a un coût

{{prenom}},

Dernier email sur ce sujet. Un seul point à retenir :

Chaque année qui passe sans complément retraite augmente l'effort futur de 15-20%. Attendre 5 ans, c'est devoir mettre 45% de plus par mois pour le même résultat.

Le jour où le sujet deviendra prioritaire, vous saurez où me trouver.

Ted — CGP Indépendant`,
      ]},
    ],
  },
  {
    name: 'Gérer la fiscalité PER Madelin',
    steps: [
      { channel: 'email', delay_days: 0, variants: [
        `Objet : 3 200 à 8 000 € d'impôts en moins cette année — mode d'emploi

Bonjour {{prenom}},

En tant que {{profession}} imposé(e) dans la tranche à 30% ou plus, vous avez un levier que beaucoup de TNS n'exploitent pas correctement : le PER Madelin.

Le principe est simple : chaque euro versé sur votre PER est déductible de votre BNC. À TMI 30%, c'est 30 centimes rendus par l'État pour chaque euro épargné.

Versez 10 700 € → récupérez 3 210 € d'impôts.
Versez 26 000 € (plafond courant) → récupérez 7 800 € d'impôts.

La clé, c'est de connaître votre VRAI plafond (pas celui que votre comptable utilise par défaut).

15 minutes pour le calculer ensemble. Date limite : 31 décembre.

Ted — CGP Indépendant`,
        `Objet : Payez-vous trop d'impôts ? (spoiler : probablement)

{{prenom}},

Votre comptable optimise votre BNC. C'est son métier.

Mais optimise-t-il ce qui sort de votre poche après le BNC ? La tranche d'imposition, les versements PER, les abattements disponibles ?

En tant que {{profession}}, votre plafond PER Madelin est probablement plus élevé que ce que vous versez actuellement. L'écart = de l'argent donné à l'État sans raison.

15 min pour vérifier. Si vous êtes déjà au max, je vous le dirai.

Ted — CGP Indépendant`,
      ]},
      { channel: 'whatsapp', delay_days: 2, variants: [
        `{{prenom}}, Ted (CGP). Question rapide : est-ce que vous versez sur un PER Madelin ? Si oui, est-ce le montant maximum déductible ou un forfait standard ? La différence peut valoir 3 000 à 5 000 € d'impôts par an.`,
        `Bonjour {{prenom}}, Ted ici. La fenêtre fiscale 2026 se ferme le 31 décembre. Avez-vous vérifié votre plafond PER Madelin ? Si vous ne l'utilisez pas entièrement, vous offrez de l'argent au fisc. 15 min pour vérifier ?`,
      ]},
      { channel: 'email', delay_days: 5, variants: [
        `Objet : 3 leviers fiscaux TNS que votre comptable ne vous proposera pas

Bonjour {{prenom}},

Votre comptable ne vend pas de produits financiers. Ce n'est pas son métier. Donc il ne vous parlera jamais de ces 3 leviers :

1. **PER Madelin au plafond réel** — pas le montant standard, le VRAI plafond calculé sur votre BNC des 3 dernières années (souvent 20 à 40% plus élevé)
2. **AV luxembourgeoise** — protection renforcée du capital + fiscalité succession allégée (à partir de 250K)
3. **SCPI en démembrement** — revenus fonciers sans fiscalité pendant 10-15 ans, puis pleine propriété

Ces 3 leviers combinés peuvent réduire votre imposition de 5 000 à 12 000 €/an selon votre BNC.

Intéressé par une simulation chiffrée ?

Ted — CGP Indépendant`,
      ]},
      { channel: 'sms', delay_days: 8, variants: [
        `{{prenom}}, Ted CGP. Date limite pour optimiser votre fiscalité 2026 : 31 décembre. Dispo cette semaine pour un point rapide ?`,
        `Bonjour {{prenom}}, Ted (CGP). Votre plafond PER est-il atteint ? Si non, chaque mois qui passe = argent donné au fisc. Un appel de 15 min ?`,
      ]},
      { channel: 'linkedin', delay_days: 12, variants: [
        `{{prenom}}, bonjour. J'aide des {{profession}} à économiser 3 à 8 000 € d'impôts/an via des leviers légaux (PER Madelin optimisé, démembrement, AV luxembourgeoise). Si le sujet vous intéresse, échangeons 15 min ?`,
      ]},
      { channel: 'email', delay_days: 18, variants: [
        `Objet : Fin de ma relance

{{prenom}},

Je m'arrête ici. Pas d'insistance.

Un rappel : le 31 décembre ne se déplace pas. Chaque année sans optimisation est une année d'impôts payés en trop.

Quand le sujet sera prioritaire pour vous, répondez à cet email. Je serai là.

Ted — CGP Indépendant`,
      ]},
    ],
  },
  {
    name: 'Transmettre votre patrimoine',
    steps: [
      { channel: 'email', delay_days: 0, variants: [
        `Objet : Combien vos enfants vont-ils réellement hériter ?

Bonjour {{prenom}},

Avez-vous déjà fait le calcul de ce que vos enfants recevront réellement ?

Pour un patrimoine de 600 000 € transmis à 2 enfants sans stratégie :
- Droits de succession : ~90 000 €
- Net transmis : ~510 000 €

Avec une stratégie de transmission anticipée (donation-partage + AV après 70 ans + démembrement) :
- Droits de succession : ~8 000 €
- Net transmis : ~592 000 €

Différence : 82 000 € de plus pour vos enfants. Et plus le patrimoine est élevé, plus l'écart se creuse.

25 minutes pour un diagnostic transmission personnalisé. Intéressé ?

Ted — CGP Indépendant`,
        `Objet : Le sujet que tout le monde repousse (et qui coûte cher)

{{prenom}},

La transmission patrimoniale, c'est le sujet qu'on repousse toujours "à plus tard". Sauf que "plus tard" coûte de plus en plus cher.

Pourquoi ? Les abattements de 100 000 € par enfant se rechargent tous les 15 ans. Commencer à 50 ans = 2 donations possibles avant 80 ans. Commencer à 65 ans = 1 seule.

Résultat : repousser de 15 ans peut coûter 100 000 € de droits supplémentaires pour un patrimoine de 1M€.

Un diagnostic transmission prend 25 minutes. Il permet de chiffrer exactement ce que vos enfants recevront — avec et sans stratégie.

Ted — CGP Indépendant`,
      ]},
      { channel: 'whatsapp', delay_days: 3, variants: [
        `Bonjour {{prenom}}, Ted (CGP). Mon email de cette semaine parlait de transmission patrimoniale. Un chiffre : 82 000 € d'écart entre "avec" et "sans" stratégie pour un patrimoine de 600K. Ça vaut 25 min de votre temps ?`,
        `{{prenom}}, Ted ici. Question sensible mais importante : avez-vous déjà anticipé la transmission de votre patrimoine ? Plus on s'y prend tôt, moins c'est taxé. Mon email en parlait — n'hésitez pas si le sujet vous intéresse.`,
      ]},
      { channel: 'email', delay_days: 7, variants: [
        `Objet : Un cas réel — 197 000 € économisés en droits de succession

Bonjour {{prenom}},

Cas réel : couple de 58 ans, 1,2M€ de patrimoine, 3 enfants.

Sans anticipation : droits de succession estimés à 215 000 €.
Après mise en place d'une stratégie (donation-partage + SCI familiale + assurance-vie après 70 ans) : droits ramenés à 18 000 €.

Économie : 197 000 € pour les enfants.

Temps de mise en place : 3 rendez-vous sur 2 mois.

Votre situation est différente, mais les leviers sont souvent les mêmes. Souhaitez-vous un diagnostic ?

Ted — CGP Indépendant`,
      ]},
      { channel: 'sms', delay_days: 12, variants: [
        `{{prenom}}, Ted CGP. Transmission patrimoniale : plus on anticipe, moins les enfants paient. Dispo pour un point de 25 min cette semaine ?`,
      ]},
      { channel: 'email', delay_days: 18, variants: [
        `Objet : Je m'arrête — mais gardez ce chiffre en tête

{{prenom}},

Je ne vous relancerai plus sur ce sujet. Mais gardez un chiffre en tête : les abattements de 100 000 €/enfant se rechargent tous les 15 ans.

Chaque année perdue ne se rattrape pas.

Le jour où vous voudrez faire le point, vous savez où me trouver.

Ted — CGP Indépendant`,
      ]},
    ],
  },
  {
    name: 'Diversifier votre patrimoine',
    steps: [
      { channel: 'email', delay_days: 0, variants: [
        `Objet : 90% de votre patrimoine en immobilier — est-ce un problème ?

Bonjour {{prenom}},

Si votre patrimoine est composé à plus de 70-80% d'immobilier (résidence principale + locatif), vous êtes exposé(e) à trois risques :

1. **Illiquidité** — besoin de cash rapide ? Il faut vendre un bien (6-12 mois minimum)
2. **Fiscalité lourde** — revenus fonciers imposés à TMI + prélèvements sociaux = 47,2% à la tranche 30%
3. **Concentration géographique** — si le marché local baisse, tout votre patrimoine baisse

Ce n'est pas un problème si c'est un CHOIX. C'en est un si c'est par défaut.

Un audit de répartition patrimoniale prend 20 minutes. Il montre exactement votre exposition et les options de rééquilibrage.

Intéressé ?

Ted — CGP Indépendant`,
      ]},
      { channel: 'whatsapp', delay_days: 3, variants: [
        `Bonjour {{prenom}}, Ted (CGP). Question : quel pourcentage de votre patrimoine est en immobilier ? Si c'est plus de 70%, il y a probablement des arbitrages à envisager. Mon email de cette semaine en parlait. Ouvert à un échange ?`,
      ]},
      { channel: 'email', delay_days: 6, variants: [
        `Objet : Comment un {{profession}} a rééquilibré son patrimoine (cas réel)

Bonjour {{prenom}},

Cas réel : {{profession}}, 780 000 € de patrimoine dont 720 000 € en immobilier (92%).

Problèmes identifiés : fiscalité foncière excessive (12 800 €/an), aucune liquidité, IFI de 2 100 €/an.

Stratégie mise en place :
- Vente d'un studio locatif (180 000 €) pour réallouer vers AV + SCPI européennes (pas d'imposition foncière française)
- Passage en LMNP pour le bien restant (amortissement = quasi 0 d'impôt foncier)

Résultat : rendement global +1,8 points, IFI ramené à 0 €, liquidité récupérée.

Votre situation est-elle similaire ?

Ted — CGP Indépendant`,
      ]},
      { channel: 'sms', delay_days: 10, variants: [
        `{{prenom}}, Ted CGP. Votre patrimoine est-il trop concentré en immobilier ? 20 min d'audit permettent de le savoir. Dispo cette semaine ?`,
      ]},
      { channel: 'email', delay_days: 15, variants: [
        `Objet : Dernier message sur ce sujet

{{prenom}},

Si votre patrimoine est diversifié et que vous êtes satisfait(e) de vos rendements, tant mieux.

Sinon, le diagnostic reste disponible. 20 minutes, sans engagement.

Bonne continuation,
Ted — CGP Indépendant`,
      ]},
    ],
  },
  {
    name: "Séquence chefs d'entreprise",
    steps: [
      { channel: 'email', delay_days: 0, variants: [
        `Objet : Dirigeant(e) — votre patrimoine pro et perso sont-ils vraiment séparés ?

Bonjour {{prenom}},

En tant que dirigeant(e), votre patrimoine professionnel et personnel sont souvent entremêlés. Compte courant d'associé, trésorerie excédentaire en société, rémunération vs dividendes...

La question clé : votre structure actuelle est-elle optimale fiscalement ?

Un exemple fréquent : un dirigeant qui se verse 100% en rémunération paie 15 à 25% de charges en plus qu'un mix rémunération/dividendes bien calibré.

À l'inverse, un dirigeant qui prend 100% en dividendes perd ses droits retraite et prévoyance.

Le bon équilibre dépend de VOTRE situation (revenus du foyer, TMI, âge, projet de cession...).

25 minutes pour un diagnostic personnalisé. Intéressé ?

Ted — CGP Indépendant`,
        `Objet : Ce que coûte une trésorerie excédentaire qui dort

{{prenom}},

Si votre société a plus de 3 mois de BFR en trésorerie, cet excédent vous coûte de l'argent chaque jour (inflation + coût d'opportunité).

100 000 € de trésorerie excédentaire à 0% = 2 500 €/an perdus (inflation seule). Sur un compte pro rémunéré à 1% = encore 1 500 € de manque à gagner vs un placement adapté.

Solutions : contrat de capitalisation en société, SCPI en démembrement, compte-titres société...

25 min pour évaluer vos options. Intéressé ?

Ted — CGP Indépendant`,
      ]},
      { channel: 'whatsapp', delay_days: 3, variants: [
        `Bonjour {{prenom}}, Ted (CGP). Mon email parlait de l'optimisation de votre rémunération de dirigeant. Question : êtes-vous certain(e) que votre mix rémunération/dividendes est optimal pour 2026 ? Ça se recalcule chaque année.`,
        `{{prenom}}, Ted ici. Petite question : votre trésorerie excédentaire en société est-elle placée ou elle dort sur le compte pro ? Si elle dort, ça vous coûte de l'argent. On peut en parler 20 min ?`,
      ]},
      { channel: 'email', delay_days: 7, variants: [
        `Objet : Dividendes vs rémunération 2026 — le point de bascule

Bonjour {{prenom}},

Flat tax à 30% vs barème progressif + charges sociales : où est votre point de bascule ?

En 2026, pour un dirigeant marié avec 2 enfants :
- En dessous de ~45 000 € de revenus du foyer : la rémunération est plus intéressante
- Au-dessus : les dividendes deviennent avantageux
- Mais attention : les dividendes > 10% du capital social sont soumis aux charges TNS

Le calcul dépend de VOTRE situation précise. Une erreur de 10 000 € de répartition peut coûter 2 000 à 4 000 €/an.

20 min pour trouver VOTRE optimum. Intéressé ?

Ted — CGP Indépendant`,
      ]},
      { channel: 'linkedin', delay_days: 12, variants: [
        `{{prenom}}, bonjour. CGP indépendant, j'accompagne des dirigeants de PME sur l'optimisation rémunération/patrimoine : mix dividendes/salaire, trésorerie excédentaire, préparation de cession. Si un de ces sujets vous parle, échangeons 20 min ?`,
      ]},
      { channel: 'email', delay_days: 18, variants: [
        `Objet : Dernière tentative

{{prenom}},

Je comprends que vous êtes pris(e) par votre activité. Gérer une entreprise ne laisse pas beaucoup de temps pour optimiser son patrimoine personnel.

Pourtant, c'est exactement quand on est le plus occupé que l'argent a le plus besoin d'être bien placé.

Quand vous aurez 25 minutes, je serai là. Pas d'urgence — mais n'attendez pas la cession pour y penser.

Ted — CGP Indépendant`,
      ]},
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
      message_template: s.variants[0], // Variante A par défaut
    }))

    await supabase.from('sequence_template_steps').insert(steps)
    created++
  }

  return apiSuccess({ created, skipped, message: `${created} séquences importées, ${skipped} déjà présentes` })
}

// GET pour récupérer toutes les variantes (permet au front de proposer le choix)
export async function GET(_req: NextRequest) {
  return apiSuccess(LIBRARY.map(lib => ({
    name: lib.name,
    steps: lib.steps.map((s, i) => ({
      step_order: i + 1,
      channel: s.channel,
      delay_days: s.delay_days,
      variants: s.variants,
    })),
  })))
}
