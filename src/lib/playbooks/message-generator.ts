// src/lib/playbooks/message-generator.ts
import Anthropic from '@anthropic-ai/sdk'
import { SignalType } from './config'

const client = new Anthropic()

// Messages pré-écrits issus des playbooks (3 variants par signal au J+0)
export const PREWRITTEN_MESSAGES: Record<SignalType, { j0: [string, string, string] }> = {
  cession: {
    j0: [
      "Bonjour [Prénom], j'ai vu passer l'annonce concernant [société]. Ce type d'opération ouvre une fenêtre patrimoniale importante qui mérite d'être anticipée rapidement. Je serais ravi d'échanger avec vous avant que les décisions fiscales soient prises. 20 minutes cette semaine ?",
      "Bonjour [Prénom], la cession de [société] est une étape rare. Dans les 90 jours qui suivent, les décisions prises ont un impact direct sur ce que vous en garderez réellement. J'aimerais vous partager quelques pistes. 20 minutes ?",
      "Bonjour [Prénom], j'ai suivi l'opération sur [société]. Ce genre de moment ne se présente qu'une fois — et ce qui se passe dans les semaines qui suivent est souvent plus important que la cession elle-même. On en parle ?",
    ],
  },
  holding: {
    j0: [
      "Bonjour [Prénom], j'ai noté des modifications récentes sur votre structure. Ce type de mouvement mérite souvent un point patrimonial. 20 minutes cette semaine ?",
      "Bonjour [Prénom], la création d'une holding est rarement anodine. Ça m'a amené à penser à vous et à quelques pistes qui pourraient être pertinentes selon votre situation. On en parle ?",
      "Bonjour [Prénom], j'ai vu passer la création de [société]. Ce type de structure ouvre des opportunités que beaucoup de dirigeants n'exploitent pas pleinement. 20 minutes pour échanger ?",
    ],
  },
  dividendes: {
    j0: [
      "Bonjour [Prénom], les performances de [société] parlent d'elles-mêmes. Quand les dividendes atteignent ce niveau, la question du placement et de l'optimisation devient centrale. 20 minutes pour qu'on en discute ?",
      "Bonjour [Prénom], j'ai regardé les données de [société] — des résultats solides. À ce niveau de distribution, il y a souvent des marges d'optimisation que peu de dirigeants exploitent. On en parle ?",
      "Bonjour [Prénom], une PME aussi rentable mérite une gestion patrimoniale à la hauteur. Je travaille avec des dirigeants dans votre situation. 20 minutes cette semaine ?",
    ],
  },
  dirigeant_55: {
    j0: [
      "Bonjour [Prénom], à la tête de [société] depuis [X] ans, vous approchez d'une étape où les décisions patrimoniales deviennent déterminantes. Un bilan transmission de 30 minutes pourrait vous éviter des années de regrets fiscaux.",
      "Bonjour [Prénom], diriger une entreprise aussi longtemps crée une valeur importante — qui mérite d'être protégée et transmise dans les meilleures conditions. J'aimerais vous partager quelques réflexions. 30 minutes ?",
      "Bonjour [Prénom], les dirigeants qui ont bâti quelque chose de solide ont souvent les mêmes questions : comment transmettre, quand, et à quel coût fiscal. J'ai des éléments de réponse à partager si vous avez 30 minutes.",
    ],
  },
  creation: {
    j0: [
      "Bonjour [Prénom], je vois que vous avez lancé [société] récemment. Les premières années sont le moment clé pour structurer votre protection et votre retraite de dirigeant. 20 minutes pour en parler ?",
      "Bonjour [Prénom], la création de [société] ne passe pas inaperçue. Beaucoup de dirigeants s'occupent du business et laissent de côté leur propre protection. J'aimerais vous partager quelques pistes. 20 minutes ?",
      "Bonjour [Prénom], lancer une société, c'est souvent le début d'une nouvelle vie patrimoniale aussi. Les décisions des premières années comptent beaucoup. On en parle ?",
    ],
  },
  linkedin: {
    j0: [
      "Bonjour [Prénom], votre profil attire l'attention. J'aimerais échanger avec vous sur un sujet qui concerne votre situation. 20 minutes ?",
      "Bonjour [Prénom], j'ai vu votre actualité récente — j'aurais quelques réflexions pertinentes à partager. 20 minutes cette semaine ?",
      "Bonjour [Prénom], je travaille avec des profils comme le vôtre et j'ai quelque chose d'utile à vous partager. Un échange rapide ?",
    ],
  },
}

export function buildMessages(params: {
  signalType: SignalType
  prenom: string
  societe: string
  anneesExistence?: number
}): { a: string; b: string; c: string } {
  const templates = PREWRITTEN_MESSAGES[params.signalType].j0
  const replace = (t: string) =>
    t
      .replace('[Prénom]', params.prenom)
      .replace('[société]', params.societe)
      .replace('[holding]', params.societe)
      .replace('[X]', String(params.anneesExistence ?? '?'))

  return { a: replace(templates[0]), b: replace(templates[1]), c: replace(templates[2]) }
}

export async function generateClaudeMessage(params: {
  signalType: SignalType
  prenom: string
  societe: string
  signalContext: string
  angle: string
}): Promise<string> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    messages: [
      {
        role: 'user',
        content: `Tu es un expert en gestion de patrimoine avec 15 ans d'expérience. Rédige un message de prise de contact pour ce prospect.
Prénom : ${params.prenom}
Société : ${params.societe}
Signal détecté : ${params.signalContext}
Angle patrimonial à aborder : ${params.angle}
Objectif : obtenir un échange informel de 20 minutes.
Contraintes : maximum 5 lignes, référence naturelle à l'événement, aucun jargon financier, ton chaleureux et expert, ne jamais mentionner de produits financiers.
Réponds uniquement avec le message.`,
      },
    ],
  })
  const block = response.content[0]
  return block.type === 'text' ? block.text.trim() : ''
}
