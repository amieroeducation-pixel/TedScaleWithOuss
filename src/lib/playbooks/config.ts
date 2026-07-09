// src/lib/playbooks/config.ts
export type PlaybookId =
  | 'a1-creations'
  | 'a2-cessions'
  | 'a3-holdings'
  | 'a4-dividendes'
  | 'a5-dirigeants'
  | 'a6-heritiers'
  | 'a7-vendeurs-immo'
  | 'a8-radiations'
  | 'b1-surveillance'
  | 'b2-rdv'
  | 'b3-liquidite'
  | 'b4-cartographie'
  | 'c1-linkedin'

export type SignalType =
  | 'creation'
  | 'cession'
  | 'holding'
  | 'dividendes'
  | 'dirigeant_55'
  | 'heritage'
  | 'vente_immo'
  | 'radiation'
  | 'linkedin'

export interface PlaybookConfig {
  id: PlaybookId
  name: string
  family: 'A' | 'B' | 'C'
  description: string
  signalType: SignalType
  scheduleDescription: string
  urgencyDays: number
  sequenceSlug: string
  isOnDemand: boolean
}

export const PLAYBOOKS: PlaybookConfig[] = [
  {
    id: 'a2-cessions',
    name: 'Cessions BODACC',
    family: 'A',
    description: 'Cessions de fonds de commerce et parts sociales publiées au BODACC',
    signalType: 'cession',
    scheduleDescription: 'Chaque lundi 8h',
    urgencyDays: 2,
    sequenceSlug: 'cession',
    isOnDemand: false,
  },
  {
    id: 'a1-creations',
    name: 'Créations Récentes',
    family: 'A',
    description: 'Nouvelles sociétés créées (médical, juridique, conseil, immobilier, industrie, BTP)',
    signalType: 'creation',
    scheduleDescription: 'Chaque mardi 8h',
    urgencyDays: 90,
    sequenceSlug: 'creation',
    isOnDemand: false,
  },
  {
    id: 'a3-holdings',
    name: 'Holdings Fraîches',
    family: 'A',
    description: 'Holdings créées (NAF 6420Z/6430Z) avec capital > 50 000€',
    signalType: 'holding',
    scheduleDescription: '1er du mois — mercredi 8h',
    urgencyDays: 7,
    sequenceSlug: 'holding',
    isOnDemand: false,
  },
  {
    id: 'a4-dividendes',
    name: 'Dividendes Non Structurés',
    family: 'A',
    description: 'Entreprises distribuant > 150 000€/an de dividendes',
    signalType: 'dividendes',
    scheduleDescription: '1er du mois — jeudi 8h',
    urgencyDays: 30,
    sequenceSlug: 'dividendes',
    isOnDemand: false,
  },
  {
    id: 'a5-dirigeants',
    name: 'Dirigeants 55+',
    family: 'A',
    description: 'Dirigeants nés avant 1970, PME rentable depuis > 10 ans',
    signalType: 'dirigeant_55',
    scheduleDescription: '1er du mois — vendredi 8h',
    urgencyDays: 30,
    sequenceSlug: 'dirigeant-55',
    isOnDemand: false,
  },
  {
    id: 'a6-heritiers',
    name: 'Héritiers BODACC',
    family: 'A',
    description: 'Attestations et déclarations de succession publiées au BODACC — héritiers avec capital à placer',
    signalType: 'heritage',
    scheduleDescription: 'Chaque mercredi 8h',
    urgencyDays: 30,
    sequenceSlug: 'heritage',
    isOnDemand: false,
  },
  {
    id: 'a7-vendeurs-immo',
    name: 'Vendeurs Immobilier IDF',
    family: 'A',
    description: 'Ventes immobilières > 400k€ en Île-de-France (DVF open data) — capital à réinvestir',
    signalType: 'vente_immo',
    scheduleDescription: '1er du mois — lundi 8h',
    urgencyDays: 60,
    sequenceSlug: 'vente-immo',
    isOnDemand: false,
  },
  {
    id: 'a8-radiations',
    name: 'Radiations BODACC',
    family: 'A',
    description: 'Entreprises radiées (capital distribué aux associés) — capital disponible à placer',
    signalType: 'radiation',
    scheduleDescription: 'Chaque jeudi 8h',
    urgencyDays: 45,
    sequenceSlug: 'radiation',
    isOnDemand: false,
  },
  {
    id: 'b1-surveillance',
    name: 'Surveillance Book',
    family: 'B',
    description: 'Événements BODACC sur les clients existants (30 derniers jours)',
    signalType: 'cession',
    scheduleDescription: 'Chaque lundi 9h',
    urgencyDays: 7,
    sequenceSlug: 'cession',
    isOnDemand: false,
  },
  {
    id: 'b2-rdv',
    name: 'Préparation RDV',
    family: 'B',
    description: 'Fiche complète Pappers pour un prospect avant RDV (5 min)',
    signalType: 'cession',
    scheduleDescription: 'À la demande',
    urgencyDays: 0,
    sequenceSlug: '',
    isOnDemand: true,
  },
  {
    id: 'b3-liquidite',
    name: 'Détection Liquidité',
    family: 'B',
    description: 'Cessions publiées au BODACC — dirigeants 45-65 ans en phase de liquidité',
    signalType: 'cession',
    scheduleDescription: '1er du mois — mardi 8h',
    urgencyDays: 30,
    sequenceSlug: 'cession',
    isOnDemand: false,
  },
  {
    id: 'b4-cartographie',
    name: 'Cartographie Holding',
    family: 'B',
    description: 'Arborescence capitalistique complète + schémas patrimoniaux',
    signalType: 'holding',
    scheduleDescription: 'À la demande',
    urgencyDays: 0,
    sequenceSlug: '',
    isOnDemand: true,
  },
  {
    id: 'c1-linkedin',
    name: 'LinkedIn Gojiberry',
    family: 'C',
    description: 'Signaux LinkedIn détectés par Gojiberry (cessions, promotions, levées de fonds) — via Make.com',
    signalType: 'linkedin',
    scheduleDescription: 'Temps réel via webhook Make.com',
    urgencyDays: 2,
    sequenceSlug: 'linkedin',
    isOnDemand: false,
  },
]

export function getPlaybook(id: PlaybookId): PlaybookConfig {
  const p = PLAYBOOKS.find(p => p.id === id)
  if (!p) throw new Error(`Playbook ${id} not found`)
  return p
}
