// src/lib/playbooks/message-generator.ts
import { SignalType } from './config'

// Messages pré-écrits issus des playbooks (4 variants par signal au J+0)
export const PREWRITTEN_MESSAGES: Record<SignalType, { j0: [string, string, string, string] }> = {
  cession: {
    j0: [
      "Bonjour [Prénom], j'ai vu passer l'annonce concernant [société]. Ce type d'opération ouvre une fenêtre patrimoniale importante qui mérite d'être anticipée rapidement. Je serais ravi d'échanger avec vous avant que les décisions fiscales soient prises. 20 minutes cette semaine ?",
      "Bonjour [Prénom], la cession de [société] est une étape rare. Dans les 90 jours qui suivent, les décisions prises ont un impact direct sur ce que vous en garderez réellement. J'aimerais vous partager quelques pistes. 20 minutes ?",
      "Bonjour [Prénom], j'ai suivi l'opération sur [société]. Ce genre de moment ne se présente qu'une fois — et ce qui se passe dans les semaines qui suivent est souvent plus important que la cession elle-même. On en parle ?",
      "Bonjour [Prénom], votre produit de cession peut être placé hors IFI et hors succession pendant 15 ans, avec un rendement historique supérieur aux fonds euros. C'est exactement ce que propose la tontine. 20 minutes pour vous montrer comment ?",
    ],
  },
  holding: {
    j0: [
      "Bonjour [Prénom], j'ai noté des modifications récentes sur votre structure. Ce type de mouvement mérite souvent un point patrimonial. 20 minutes cette semaine ?",
      "Bonjour [Prénom], la création d'une holding est rarement anodine. Ça m'a amené à penser à vous et à quelques pistes qui pourraient être pertinentes selon votre situation. On en parle ?",
      "Bonjour [Prénom], j'ai vu passer la création de [société]. Ce type de structure ouvre des opportunités que beaucoup de dirigeants n'exploitent pas pleinement. 20 minutes pour échanger ?",
      "Bonjour [Prénom], la trésorerie excédentaire de votre holding peut être placée en tontine : exonérée d'IFI pendant toute la durée, capital garanti, et sortie hors succession. Un outil peu connu mais redoutablement efficace. 20 minutes ?",
    ],
  },
  dividendes: {
    j0: [
      "Bonjour [Prénom], les performances de [société] parlent d'elles-mêmes. Quand les dividendes atteignent ce niveau, la question du placement et de l'optimisation devient centrale. 20 minutes pour qu'on en discute ?",
      "Bonjour [Prénom], j'ai regardé les données de [société] — des résultats solides. À ce niveau de distribution, il y a souvent des marges d'optimisation que peu de dirigeants exploitent. On en parle ?",
      "Bonjour [Prénom], une PME aussi rentable mérite une gestion patrimoniale à la hauteur. Je travaille avec des dirigeants dans votre situation. 20 minutes cette semaine ?",
      "Bonjour [Prénom], à ce niveau de distribution, la question n'est plus combien vous gagnez mais combien vous gardez. La tontine exonère le capital placé d'IFI et le sort de votre succession. 20 minutes pour voir si ça s'applique à votre situation ?",
    ],
  },
  dirigeant_55: {
    j0: [
      "Bonjour [Prénom], à la tête de [société] depuis [X] ans, vous approchez d'une étape où les décisions patrimoniales deviennent déterminantes. Un bilan transmission de 30 minutes pourrait vous éviter des années de regrets fiscaux.",
      "Bonjour [Prénom], diriger une entreprise aussi longtemps crée une valeur importante — qui mérite d'être protégée et transmise dans les meilleures conditions. J'aimerais vous partager quelques réflexions. 30 minutes ?",
      "Bonjour [Prénom], les dirigeants qui ont bâti quelque chose de solide ont souvent les mêmes questions : comment transmettre, quand, et à quel coût fiscal. J'ai des éléments de réponse à partager si vous avez 30 minutes.",
      "Bonjour [Prénom], après [X] ans à bâtir [société], il existe un outil qui protège votre capital hors IFI, hors succession, avec un rendement garanti sur 15-25 ans : la tontine du Conservateur. 30 minutes pour un point ?",
    ],
  },
  creation: {
    j0: [
      "Bonjour [Prénom], je vois que vous avez lancé [société] récemment. Les premières années sont le moment clé pour structurer votre protection et votre retraite de dirigeant. 20 minutes pour en parler ?",
      "Bonjour [Prénom], la création de [société] ne passe pas inaperçue. Beaucoup de dirigeants s'occupent du business et laissent de côté leur propre protection. J'aimerais vous partager quelques pistes. 20 minutes ?",
      "Bonjour [Prénom], lancer une société, c'est souvent le début d'une nouvelle vie patrimoniale aussi. Les décisions des premières années comptent beaucoup. On en parle ?",
      "Bonjour [Prénom], dès les premières années, placer une partie de votre épargne dirigeant en tontine vous exonère d'IFI et prépare une transmission optimisée. Peu de CGP en parlent. 20 minutes ?",
    ],
  },
  heritage: {
    j0: [
      "Bonjour [Prénom], je sais que cette période est délicate. Quand un patrimoine se transmet, les décisions prises dans les premiers mois déterminent souvent ce qu'il en restera dans 10 ans. Un échange de 20 minutes pourrait vous éclairer.",
      "Bonjour [Prénom], recevoir un capital est un moment rare qui mérite d'être accompagné. La plupart des héritiers perdent 30% de la valeur en 5 ans faute de structure. J'aurais quelques pistes à partager. 20 minutes ?",
      "Bonjour [Prénom], un héritage bien placé aujourd'hui peut doubler en 15 ans tout en restant hors IFI et hors succession future. C'est exactement ce dont j'aimerais vous parler. 20 minutes ?",
      "Bonjour [Prénom], le capital hérité placé en tontine est immédiatement exonéré d'IFI et sort de votre succession future — vos enfants n'auront pas à repayer des droits dessus. C'est exactement fait pour votre situation. 20 minutes ?",
    ],
  },
  vente_immo: {
    j0: [
      "Bonjour [Prénom], j'ai vu que vous avez réalisé une belle opération immobilière. La question qui se pose maintenant : où placer ce capital pour faire mieux que le locatif, sans la gestion ? J'ai une réponse concrète. 20 minutes ?",
      "Bonjour [Prénom], après une vente immobilière, la tentation de racheter un autre bien est naturelle. Mais il existe des alternatives qui font mieux en net, sans locataires ni travaux. On en parle ?",
      "Bonjour [Prénom], votre vente récente libère un capital significatif. Le replacer intelligemment dans les 60 jours permet d'optimiser la fiscalité et de sécuriser un rendement supérieur au locatif. 20 minutes ?",
      "Bonjour [Prénom], votre capital de vente immobilière peut faire mieux que le locatif : même rendement, zéro gestion, zéro IFI, hors succession. La tontine du Conservateur fait exactement ça sur 15-25 ans. 20 minutes ?",
    ],
  },
  radiation: {
    j0: [
      "Bonjour [Prénom], la fermeture de [société] libère un capital qui mérite d'être structuré rapidement. Les décisions prises dans les semaines qui suivent sont déterminantes. 20 minutes pour en parler ?",
      "Bonjour [Prénom], j'ai vu la radiation de [société]. Ce type de liquidation génère souvent un capital significatif à replacer intelligemment. J'aurais quelques pistes concrètes. 20 minutes ?",
      "Bonjour [Prénom], la dissolution de [société] ouvre une fenêtre patrimoniale importante. Beaucoup d'associés laissent dormir ce capital — il y a mieux à faire. On en parle ?",
      "Bonjour [Prénom], le capital récupéré de la radiation de [société] peut être placé en tontine : exonéré d'IFI, hors succession, rendement garanti sur 15-25 ans. 20 minutes pour voir si ça s'applique à votre situation ?",
    ],
  },
  linkedin: {
    j0: [
      "Bonjour [Prénom], votre profil attire l'attention. J'aimerais échanger avec vous sur un sujet qui concerne votre situation. 20 minutes ?",
      "Bonjour [Prénom], j'ai vu votre actualité récente — j'aurais quelques réflexions pertinentes à partager. 20 minutes cette semaine ?",
      "Bonjour [Prénom], je travaille avec des profils comme le vôtre et j'ai quelque chose d'utile à vous partager. Un échange rapide ?",
      "Bonjour [Prénom], votre actualité récente me fait penser à un outil patrimonial peu connu mais puissant : la tontine. Capital garanti, exonéré d'IFI, hors succession. Un échange de 20 minutes ?",
    ],
  },
}

export const LINKEDIN_SIGNAL_CONTEXT: Record<string, {
  context: string
  angles: [string, string, string]
}> = {
  cession: {
    context: "Ce dirigeant a annoncé ou réalisé une cession d'entreprise récemment.",
    angles: ['fiscalité du produit de cession', 'réinvestissement et structuration post-cession', 'transmission familiale et protection du capital'],
  },
  promotion: {
    context: "Ce profil vient d'être promu ou a changé de poste vers un rôle de direction.",
    angles: ['revalorisation de rémunération et prévoyance dirigeant', 'optimisation du nouveau package (BSPCE, stock-options)', 'protection patrimoniale personnelle en tant que cadre dirigeant'],
  },
  levee_fonds: {
    context: "Cette entreprise vient de réaliser une levée de fonds.",
    angles: ["diversification du patrimoine personnel hors de l'entreprise", 'structuration entre patrimoine pro et perso', 'protection du dirigeant fondateur en phase de croissance'],
  },
  creation_holding: {
    context: "Ce dirigeant vient de créer ou restructurer une holding.",
    angles: ['optimisation de la remontée de dividendes', 'structuration IS et patrimoine via la holding', 'préparation de la transmission capitalistique'],
  },
  retraite: {
    context: "Ce profil prépare activement son départ à la retraite.",
    angles: ["bilan retraite et optimisation des droits acquis", "transmission progressive de l'entreprise", 'gestion du capital post-activité professionnelle'],
  },
  recrutement: {
    context: "Cette entreprise recrute massivement, signe de forte croissance.",
    angles: ['prévoyance collective et épargne salariale en phase de croissance', 'protection du dirigeant face aux risques opérationnels', 'structuration patrimoniale pour une cession future'],
  },
}

export function buildMessages(params: {
  signalType: SignalType
  prenom: string
  societe: string
  anneesExistence?: number
}): { a: string; b: string; c: string; d: string } {
  const templates = PREWRITTEN_MESSAGES[params.signalType].j0
  const replace = (t: string) =>
    t
      .replace('[Prénom]', params.prenom)
      .replace('[société]', params.societe)
      .replace('[holding]', params.societe)
      .replace('[X]', String(params.anneesExistence ?? '?'))

  return { a: replace(templates[0]), b: replace(templates[1]), c: replace(templates[2]), d: replace(templates[3]) }
}

// Templates pré-écrits pour les 6 signaux Gojiberry (3 angles × signal)
// Indexés dans le même ordre que LINKEDIN_SIGNAL_CONTEXT[signal].angles
const LINKEDIN_TEMPLATES: Record<string, [string, string, string]> = {
  cession: [
    "Bonjour [Prénom], j'ai suivi la cession de [Société] — ce type d'opération ouvre une fenêtre patrimoniale où les décisions fiscales prises dans les 90 jours sont souvent déterminantes. Un échange de 20 minutes ?",
    "Bonjour [Prénom], la cession de [Société] est une étape rare. La question du réinvestissement du produit et de la structuration qui suit mérite d'être anticipée rapidement. On en parle ?",
    "Bonjour [Prénom], j'ai vu l'opération sur [Société]. Ce genre de moment est souvent le bon pour réfléchir à la transmission et à la protection du capital constitué. 20 minutes ?",
  ],
  promotion: [
    "Bonjour [Prénom], félicitations pour votre nouveau rôle chez [Société]. Un changement de poste à ce niveau mérite souvent un point sur la prévoyance et la retraite dirigeant. 20 minutes ?",
    "Bonjour [Prénom], votre promotion chez [Société] ne passe pas inaperçue. Les packages de direction ont des subtilités d'optimisation que peu exploitent. On en parle ?",
    "Bonjour [Prénom], j'ai vu votre nouvelle responsabilité chez [Société]. À ce niveau, la protection patrimoniale personnelle mérite une attention particulière. Un échange rapide ?",
  ],
  levee_fonds: [
    "Bonjour [Prénom], belle levée pour [Société]. Les fondateurs dans cette situation ont souvent intérêt à diversifier leur patrimoine personnel en parallèle. 20 minutes ?",
    "Bonjour [Prénom], j'ai suivi le tour de table de [Société] — félicitations. La frontière entre patrimoine pro et perso mérite d'être structurée à ce stade. On en parle ?",
    "Bonjour [Prénom], une levée réussie chez [Société] — c'est le bon moment pour sécuriser votre situation personnelle en tant que fondateur. Un échange ?",
  ],
  creation_holding: [
    "Bonjour [Prénom], j'ai noté la création de [Société]. L'optimisation de la remontée de dividendes est souvent la première question à traiter à ce stade. 20 minutes ?",
    "Bonjour [Prénom], la structuration holding de [Société] ouvre des options que peu de dirigeants exploitent pleinement côté fiscal et patrimonial. On en parle ?",
    "Bonjour [Prénom], créer une holding autour de [Société] est rarement anodin — c'est souvent le premier pas vers une transmission bien structurée. Un échange ?",
  ],
  retraite: [
    "Bonjour [Prénom], j'ai vu que vous préparez votre prochain chapitre après [Société]. Un bilan des droits acquis et des marges d'optimisation pourrait vous éclairer. 30 minutes ?",
    "Bonjour [Prénom], anticiper sa sortie de [Société] dans les meilleures conditions fiscales et humaines, c'est quelque chose que j'accompagne régulièrement. On en parle ?",
    "Bonjour [Prénom], les dirigeants qui ont bâti quelque chose de solide méritent une gestion du capital post-activité à la hauteur. J'aurais quelques idées à partager. 30 minutes ?",
  ],
  recrutement: [
    "Bonjour [Prénom], la croissance de [Société] est visible — belle dynamique. À ce stade, la prévoyance collective et l'épargne salariale deviennent stratégiques. 20 minutes ?",
    "Bonjour [Prénom], une équipe qui grandit chez [Société] crée aussi de nouveaux risques opérationnels pour le dirigeant. C'est un point qu'on aborde rarement assez tôt. On en parle ?",
    "Bonjour [Prénom], une entreprise qui recrute autant chez [Société] sera regardée de près par des acquéreurs dans quelques années. La structuration en amont fait toute la différence. 20 minutes ?",
  ],
}

const DEFAULT_TEMPLATES: [string, string, string] = [
  "Bonjour [Prénom], votre actualité récente m'a amené à penser à vous. J'aurais quelques réflexions pertinentes à partager selon votre situation. 20 minutes ?",
  "Bonjour [Prénom], j'ai vu votre profil et je travaille avec des dirigeants dans des situations similaires. Un échange rapide pourrait être utile. 20 minutes ?",
  "Bonjour [Prénom], je travaille avec des profils comme le vôtre et j'aurais quelque chose d'utile à vous partager. Un échange rapide ?",
]

export async function generateLinkedinMessage(params: {
  signal_gojiberry: string
  signal_description: string
  prenom: string
  societe: string
  angle: string
}): Promise<string> {
  const { signal_gojiberry, prenom, societe, angle } = params
  const angles = LINKEDIN_SIGNAL_CONTEXT[signal_gojiberry]?.angles ?? []
  const idx = angles.indexOf(angle)
  const templates = LINKEDIN_TEMPLATES[signal_gojiberry] ?? DEFAULT_TEMPLATES
  const template = templates[idx >= 0 ? idx : 0]
  return template
    .replace('[Prénom]', prenom)
    .replace('[Société]', societe)
}
