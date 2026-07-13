'use client'

import { useState, useEffect } from 'react'
import { C } from '@/lib/theme'
import { LinkButton, LinkBadge, LinkChip, LinkInline, buildHref } from '@/lib/cross-links'

type StepType = 'mail' | 'wa' | 'sms' | 'li'

interface SeqStep {
  type: StepType
  day: string
  content: string
}

interface Sequence {
  id: string
  icon: string
  bg: string
  color: string
  name: string
  desc: string
  active: boolean
  usecase: string
  steps: SeqStep[]
}

const STEP_ICONS: Record<StepType, string> = { mail: '✉', wa: '💬', sms: '📱', li: 'in' }
const STEP_COLORS: Record<StepType, string> = { mail: C.indigo, wa: C.green, sms: C.gold, li: C.indigo }
const STEP_LABELS: Record<StepType, string> = { mail: 'Email', wa: 'WhatsApp', sms: 'SMS', li: 'LinkedIn' }

const SEQ_PROSPECTION: Sequence[] = [
  {
    id: 'p1', icon: '📞', bg: '#0d1a2e', color: C.indigo,
    name: 'Séquence post-premier contact TNS', desc: '6 étapes · Après appel initial', active: true,
    usecase: "Utilisée juste après un premier appel téléphonique avec un TNS pour maintenir le lien et obtenir un RDV 1.",
    steps: [
      { type: 'mail', day: 'J+0', content: "Objet : Suite à notre échange — votre patrimoine de {Profession}\nPrésentation cabinet + problématiques TNS spécifiques + proposition diagnostic 20 min gratuit." },
      { type: 'wa', day: 'J+2', content: "Bonjour {Prénom}, c'est Ted (CGP). J'espère que mon email vous a bien été transmis. Je suis spécialisé dans l'accompagnement des {Profession} sur la fiscalité et la retraite. Un créneau de 15 min ?" },
      { type: 'mail', day: 'J+5', content: "Objet : Ce qui change en 2026 pour les {Profession}\n3 points fiscaux importants : plafond PER Madelin augmente, flat tax stable, cotisations Madelin toujours déductibles BNC. Économie moyenne : 4 200 €/an." },
      { type: 'sms', day: 'J+7', content: "Bonjour {Prénom}, c'est Ted (CGP). Avez-vous pu consulter mon email sur la fiscalité 2026 des {Profession} ? Je peux vous rappeler pour un échange rapide." },
      { type: 'li', day: 'J+10', content: "Bonjour {Prénom}, je me permets de vous contacter. CGP indépendant spécialisé {Profession} en IDF — optimisation fiscale et retraite. Ouvert à 15 min d'échange ?" },
      { type: 'mail', day: 'J+14', content: "Objet : Dernière tentative — RDV découverte 20 min\nDernier message. Diagnostic gratuit sans engagement : votre stratégie est-elle optimale ou laissez-vous de l'argent sur la table ? Répondez même dans 6 mois." },
    ],
  },
  {
    id: 'p2', icon: '🔄', bg: '#1a1400', color: C.gold,
    name: 'Relance post-RDV 1 sans réponse', desc: '4 étapes · J+3 après RDV 1', active: true,
    usecase: "Prospect qui a eu son RDV 1 mais n'a pas donné suite pour planifier un RDV 2.",
    steps: [
      { type: 'mail', day: 'J+3', content: "Objet : Suite à notre rendez-vous — récapitulatif\nRappel des points abordés + pistes d'optimisation identifiées pour {Profession}. Simulation chiffrée prête sur feu vert." },
      { type: 'wa', day: 'J+6', content: "Bonjour {Prénom}, c'est Ted. Avez-vous eu le temps de réfléchir à notre échange ? Je peux vous envoyer la simulation personnalisée par email si vous le souhaitez." },
      { type: 'sms', day: 'J+10', content: "Bonjour {Prénom}, Ted CGP. Je reste disponible pour un 2e RDV si vous souhaitez approfondir. Pas d'engagement, juste un échange." },
      { type: 'mail', day: 'J+15', content: "Objet : Votre étude personnalisée est prête\nSimulation retraite avec/sans optimisation + 2-3 leviers fiscaux activables cette année + projection 10 ans. Un simple « oui » suffit." },
    ],
  },
  {
    id: 'p3', icon: '📅', bg: '#0d1f0f', color: C.green,
    name: 'Confirmation RDV automatique', desc: '3 étapes · À la prise de RDV', active: true,
    usecase: "Déclenchée automatiquement dès qu'un RDV est planifié dans l'agenda.",
    steps: [
      { type: 'mail', day: 'J+0', content: "Objet : Confirmation de votre RDV — documents à préparer\nConfirmation date/heure + liste facultative (avis d'imposition, relevés épargne, contrats prévoyance). Lieu ou lien visio." },
      { type: 'wa', day: 'J-1', content: "Bonjour {Prénom}, petit rappel : notre RDV est prévu demain à {Heure}. Confirmez avec un pouce si c'est toujours bon pour vous. À demain !" },
      { type: 'sms', day: 'J-0 8h', content: "Bonjour {Prénom}, rappel RDV aujourd'hui à {Heure} avec Ted (CGP). Au plaisir de vous retrouver !" },
    ],
  },
  {
    id: 'p4', icon: '💼', bg: '#180d2e', color: '#b07aee',
    name: "Séquence chefs d'entreprise", desc: '5 étapes · Dirigeants SAS/SARL', active: true,
    usecase: "Séquence dédiée aux chefs d'entreprise (SAS, SASU, SARL) — optimisation holding, dividendes vs rémunération, cession.",
    steps: [
      { type: 'mail', day: 'J+0', content: "Objet : Optimisez la gestion de votre holding\nProblématiques dirigeant : arbitrage rémunération/dividendes, trésorerie excédentaire, préparation cession. Diagnostic 25 min." },
      { type: 'wa', day: 'J+3', content: "Bonjour {Prénom}, souhaiteriez-vous un point sur votre situation patrimoniale de dirigeant ? Je peux vous envoyer un créneau cette semaine." },
      { type: 'mail', day: 'J+7', content: "Objet : Dividendes vs rémunération — ce qui change en 2026\nFlat tax 30% vs barème progressif : quel est le point de bascule pour votre situation ? Simulation personnalisée offerte." },
      { type: 'li', day: 'J+12', content: "Bonjour {Prénom}, j'accompagne des dirigeants comme vous sur l'optimisation fiscale et la structuration patrimoniale. 20 min sans engagement ?" },
      { type: 'mail', day: 'J+18', content: "Objet : Dernière tentative de contact\nDernier message. Si un jour vous souhaitez optimiser votre situation de dirigeant, je reste à votre disposition." },
    ],
  },
]

const SEQ_PATRIMOINE: Sequence[] = [
  {
    id: 'epargne', icon: '💰', bg: '#1a1400', color: C.gold,
    name: 'Constituer votre épargne', desc: '5 étapes · TNS avec trésorerie dormante', active: true,
    usecase: "Prospect TNS qui a de la trésorerie sur comptes courants ou un livret A plein, sans stratégie d'épargne à moyen/long terme.",
    steps: [
      { type: 'mail', day: 'J+0', content: "Objet : 3 min pour comparer votre épargne\n67% des TNS ont une épargne qui rapporte moins que l'inflation. Diagnostic gratuit de 15 min, mardi ou jeudi 13h ?" },
      { type: 'wa', day: 'J+2', content: "Bonjour {Prénom}, j'ai envoyé une proposition de diagnostic patrimonial gratuit il y a 2 jours. Ça vous intéresserait d'échanger 15 min ?" },
      { type: 'mail', day: 'J+5', content: "Objet : Comment un {Profession} a multiplié son rendement par 3\nCas concret : 45 000 € sur Livret A → répartition AV + PER + Tontine. Résultat 10 ans : +38 000 €." },
      { type: 'sms', day: 'J+8', content: "Bonjour {Prénom}, je reste dispo pour un échange rapide sur votre épargne. Mercredi 14h vous convient ?" },
      { type: 'mail', day: 'J+14', content: "Objet : Je ne vais plus vous solliciter\nJe comprends que ce n'est pas le moment. Mon numéro : 06 XX XX XX XX." },
    ],
  },
  {
    id: 'valoriser', icon: '📈', bg: '#141a0d', color: '#6aa83a',
    name: 'Valoriser votre patrimoine', desc: '5 étapes · Fin de crédit, héritage, donation', active: true,
    usecase: "Prospect qui vient de terminer un crédit immobilier, de recevoir un héritage, une donation, ou qui a une capacité d'épargne nouvelle.",
    steps: [
      { type: 'mail', day: 'J+0', content: "Objet : Vous venez de libérer 1 500 €/mois. Et maintenant ?\nPlacer ces 1 500 €/mois sur 10 ans = 220 000 € de capital. 20 min pour modéliser votre situation ?" },
      { type: 'wa', day: 'J+3', content: "Bonjour {Prénom}, ma proposition de modélisation vous intéresse ? Je peux vous envoyer un créneau cette semaine." },
      { type: 'mail', day: 'J+7', content: "Objet : Exemple pour un {Profession} à {Ville}\nStratégie : 60% AV, 30% PER, 10% PEA. Économie fiscale 4 200 €/an. Capital 10 ans : 268 000 €." },
      { type: 'li', day: 'J+10', content: "Bonjour {Prénom}, j'aide des {Profession} à optimiser leur capacité de placement post-crédit. 20 min sans engagement ?" },
      { type: 'mail', day: 'J+14', content: "Objet : Dernière fois\nJe comprends. Si vous souhaitez faire le point un jour, je reste disponible." },
    ],
  },
  {
    id: 'retraite', icon: '🌿', bg: '#0d1f0f', color: '#5aaa6a',
    name: 'Préparer votre retraite', desc: '6 étapes · TNS 35-55 ans', active: true,
    usecase: "TNS (médecin, kiné, pharmacien, chef d'entreprise...) qui touchera une retraite obligatoire de 40-50% de ses revenus d'activité.",
    steps: [
      { type: 'mail', day: 'J+0', content: "Objet : Votre retraite en tant que {Profession} : combien ?\nRevenu 100 000 € aujourd'hui → retraite 22-28 000 €. Chute de 75%. Simulation personnalisée ?" },
      { type: 'wa', day: 'J+2', content: "Bonjour {Prénom}, avez-vous pu lire mon email sur la retraite des {Profession} ? Simulation prête." },
      { type: 'mail', day: 'J+5', content: "Objet : Votre simulation retraite\n{Profession} 42 ans, revenu 90 000 € → sans PER 1 850 €/mois, avec PER 2 940 €/mois. 15 min ?" },
      { type: 'sms', day: 'J+8', content: "Bonjour {Prénom}, créneau vendredi 11h pour votre simulation retraite ?" },
      { type: 'li', day: 'J+12', content: "Bonjour {Prénom}, j'aide les {Profession} à reprendre la main sur leur retraite. 15 min suffisent." },
      { type: 'mail', day: 'J+18', content: "Objet : Je m'arrête\n{Prénom}, pas de réponse = pas de suite. Si ça change un jour, je suis là." },
    ],
  },
  {
    id: 'diversifier', icon: '🧭', bg: '#0d1a2e', color: '#6aa3d9',
    name: 'Diversifier votre patrimoine', desc: '5 étapes · Patrimoine 100% immobilier', active: true,
    usecase: "Prospect avec résidence principale payée + 1 ou 2 biens locatifs. Patrimoine concentré sur l'immobilier.",
    steps: [
      { type: 'mail', day: 'J+0', content: "Objet : Votre patrimoine est-il trop immobilier ?\n90% en pierre = fiscalité lourde, illiquidité, dépendance locale. Audit de répartition 20 min ?" },
      { type: 'wa', day: 'J+3', content: "Bonjour {Prénom}, ma proposition d'audit patrimonial vous intéresse ? Gratuit et sans engagement." },
      { type: 'mail', day: 'J+6', content: "Objet : Un {Profession} qui a rééquilibré son patrimoine\n780 000 € dont 720 000 € immo → arbitrage + AV + SCPI EU. Rendement +1,8 pts. IFI -2 100 €/an." },
      { type: 'sms', day: 'J+10', content: "Bonjour {Prénom}, dispo pour un échange sur la diversification de votre patrimoine ?" },
      { type: 'mail', day: 'J+15', content: "Objet : Dernier message\nSi l'immobilier reste votre priorité aujourd'hui, c'est entendu. À disposition." },
    ],
  },
  {
    id: 'fiscalite', icon: '📋', bg: '#1a1010', color: C.cyan,
    name: 'Gérer la fiscalité', desc: '6 étapes · TNS tranche 30%+', active: true,
    usecase: "TNS imposé dans la tranche à 30% ou plus (revenu net >28 000 € pour un célibataire). Le PER Madelin offre des leviers immédiats.",
    steps: [
      { type: 'mail', day: 'J+0', content: "Objet : 3 200 € d'impôts économisés cette année (tranche 30%)\nTNS qui verse 10 700 € sur PER Madelin récupère 3 210 € d'impôts. Date limite 31 déc." },
      { type: 'wa', day: 'J+2', content: "Bonjour {Prénom}, la fenêtre fiscale se ferme le 31 décembre. 20 min pour voir ce que vous pouvez économiser ?" },
      { type: 'mail', day: 'J+5', content: "Objet : 3 leviers fiscaux TNS méconnus\n1. PER Madelin · 2. AV luxembourgeoise · 3. SCPI démembrement. Lequel pour vous ?" },
      { type: 'sms', day: 'J+8', content: "Bonjour {Prénom}, date limite pour optimiser 2026 approche. Dispo rapidement ?" },
      { type: 'li', day: 'J+12', content: "Bonjour {Prénom}, j'aide les {Profession} à économiser 3-8 000 € d'impôts/an légalement. Échangeons ?" },
      { type: 'mail', day: 'J+18', content: "Objet : Fin de ma relance\nPromis je ne vous relance plus. Si un jour vous voulez optimiser, vous savez où me trouver." },
    ],
  },
  {
    id: 'transmettre', icon: '🤝', bg: '#180d2e', color: '#b07aee',
    name: 'Transmettre votre patrimoine', desc: '5 étapes · 50+ ans avec enfants', active: true,
    usecase: "Prospect 50+ ans, patrimoine construit, n'a pas encore structuré sa transmission. Droits jusqu'à 45%.",
    steps: [
      { type: 'mail', day: 'J+0', content: "Objet : Combien vos enfants vont-ils réellement hériter ?\nPatrimoine 600 000 €, 2 enfants → 90 000 € de droits. Avec stratégie : 0 €. Diagnostic 25 min ?" },
      { type: 'wa', day: 'J+3', content: "Bonjour {Prénom}, ma proposition de diagnostic transmission vous intéresse ? Sujet qu'on repousse souvent et qui coûte cher." },
      { type: 'mail', day: 'J+7', content: "Objet : Un cas réel — 197 000 € économisés\nCouple 58 ans, 1,2 M€, 3 enfants. Sans stratégie : 215 000 €. Après structuration : 18 000 €." },
      { type: 'sms', day: 'J+12', content: "Bonjour {Prénom}, dispo pour un échange sur votre transmission ? Plus on anticipe, plus on optimise." },
      { type: 'mail', day: 'J+18', content: "Objet : Je m'arrête\nSujet sensible, je comprends. À disposition quand vous serez prêt." },
    ],
  },
]

function StepBubble({ step }: { step: SeqStep }) {
  const color = STEP_COLORS[step.type]
  const icon = STEP_ICONS[step.type]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flexShrink: 0 }}>
      <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7, color: C.textVlo }}>{step.day}</div>
      <div title={step.content} style={{
        width: 26, height: 26, borderRadius: '50%', background: `${color}20`,
        border: `1.5px solid ${color}`, display: 'flex', alignItems: 'center',
        justifyContent: 'center', boxShadow: `0 0 6px ${color}40`,
        fontSize: step.type === 'li' ? 7 : 10, color,
        fontFamily: 'JetBrains Mono,monospace', fontWeight: 700, cursor: 'help',
      }}>
        {icon}
      </div>
    </div>
  )
}

function SeqCard({ seq }: { seq: Sequence }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div style={{
      background: `linear-gradient(180deg,${C.surface1},${C.bgMid})`,
      border: `1px solid ${seq.active ? seq.color + '40' : C.lineSoft}`,
      borderRadius: 12, padding: 14, marginBottom: 10,
      opacity: seq.active ? 1 : 0.7,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 18 }}>{seq.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'Oswald,sans-serif', fontSize: 13, fontWeight: 500, color: seq.color, letterSpacing: '0.06em' }}>{seq.name}</span>
            <span style={{
              fontFamily: 'JetBrains Mono,monospace', fontSize: 8, fontWeight: 700,
              color: seq.active ? C.green : C.textLo,
              background: seq.active ? `${C.green}18` : `${C.textLo}18`,
              border: `1px solid ${seq.active ? C.green : C.textLo}40`,
              padding: '1px 7px', borderRadius: 4, flexShrink: 0,
            }}>{seq.active ? 'Actif' : 'Inactif'}</span>
          </div>
          <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo }}>{seq.desc}</div>
        </div>
        <button
          onClick={() => setExpanded(v => !v)}
          style={{
            background: 'none', border: `1px solid ${C.line}`, borderRadius: 6,
            color: C.textMid, fontSize: 9, fontFamily: 'JetBrains Mono,monospace',
            padding: '4px 10px', cursor: 'pointer', flexShrink: 0,
          }}
        >
          {expanded ? '▲ Réduire' : '▼ Voir détails'}
        </button>
      </div>

      {/* Steps timeline */}
      {seq.steps.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', paddingBottom: 4, gap: 0 }}>
          {seq.steps.map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <StepBubble step={step} />
              {i < seq.steps.length - 1 && (
                <div style={{ width: 14, height: 1, background: `${seq.color}40`, flexShrink: 0, marginBottom: 10 }} />
              )}
            </div>
          ))}
        </div>
      )}

      {seq.steps.length === 0 && (
        <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textVlo, fontStyle: 'italic', padding: '8px 0' }}>
          Aucune étape — séquence en construction
        </div>
      )}

      {/* Expanded: use case + step details */}
      {expanded && (
        <div style={{ marginTop: 12, borderTop: `1px solid ${C.lineSoft}`, paddingTop: 12 }}>
          {/* Use case block — blue left border */}
          <div style={{
            marginBottom: 12, padding: '10px 14px',
            background: `${C.indigo}0e`, border: `1px solid ${C.indigo}30`,
            borderLeft: `3px solid ${C.indigo}`, borderRadius: 8,
          }}>
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.indigo, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Cas d&apos;usage</div>
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textMid, lineHeight: 1.6 }}>
              {seq.usecase}
              {seq.id === 'premier-contact' && <span style={{ marginLeft: 8 }}><LinkInline href={buildHref('/crm', { stage: 'a_contacter' })} label="Voir prospects" color="gold" /></span>}
              {seq.id === 'rdv-suivi' && <span style={{ marginLeft: 8 }}><LinkInline href={buildHref('/crm', { stage: 'rdv1' })} label="RDV actifs" color="cyan" /></span>}
            </div>
          </div>

          {/* Step detail rows */}
          {seq.steps.map((step, i) => {
            const color = STEP_COLORS[step.type]
            const icon = STEP_ICONS[step.type]
            const label = STEP_LABELS[step.type]
            return (
              <div key={i} style={{
                display: 'flex', gap: 10, marginBottom: 8, padding: '10px 12px',
                background: C.surface2, border: `1px solid ${C.lineSoft}`, borderRadius: 8,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', background: `${color}18`,
                  border: `1.5px solid ${color}`, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: step.type === 'li' ? 8 : 11,
                  color, fontFamily: 'JetBrains Mono,monospace', fontWeight: 700, flexShrink: 0,
                }}>
                  {icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color, background: `${color}18`, padding: '1px 6px', borderRadius: 4 }}>{step.day}</span>
                    <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textMid, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{step.content}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function SequencesPage() {
  const [dbTemplates, setDbTemplates] = useState<{ id: string; name: string; pipeline_stage: string | null; auto_trigger: boolean }[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetch('/api/crm/sequences/templates')
      .then(r => r.json())
      .then(json => { if (json.success) setDbTemplates(json.data.templates) })
      .catch(() => {})
  }, [])

  async function handleCreate() {
    if (!createName.trim()) return
    setCreating(true)
    setCreateError(null)
    try {
      const res = await fetch('/api/crm/sequences/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: createName.trim() }),
      })
      const json = await res.json()
      if (json.error) { setCreateError(json.error); return }
      setDbTemplates(prev => [...prev, { id: json.data.template.id, name: json.data.template.name, pipeline_stage: null, auto_trigger: false }])
      setShowCreateModal(false)
      setCreateName('')
      alert(`Séquence "${createName.trim()}" créée ! Allez dans Paramètres → Séquences pour y ajouter des étapes, puis utilisez-la depuis une fiche prospect.`)
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Erreur inconnue')
    }
    setCreating(false)
  }

  return (
    <>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap')"}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 3, height: 24, background: C.ribbon, borderRadius: 2 }} />
            <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 22, fontWeight: 600, color: C.textHi, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Séquences <span style={{ color: C.indigo }}>Multi-Canal</span>
            </div>
          </div>
          <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo, marginTop: 2, paddingLeft: 13 }}>
            {dbTemplates.length > 0
              ? `${dbTemplates.length} séquences personnalisées · 2 bibliothèques par défaut`
              : `2 bibliothèques · ${SEQ_PROSPECTION.length + SEQ_PATRIMOINE.length} séquences`
            }
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{ fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 500, color: C.bgDeep, background: `linear-gradient(90deg,${C.cyan},${C.indigo})`, border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', letterSpacing: '0.1em' }}
        >
          + CRÉER SÉQUENCE
        </button>
      </div>

      {/* Liens transversaux après header */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, justifyContent: 'center' }}>
        <LinkChip href="/automatisations" label="Automatisations" color="cyan" />
        <LinkChip href="/settings" label="Paramètres" color="indigo" />
        <LinkChip href={buildHref('/today', { tab: 'relances' })} label="Relances actives" color="purple" />
        <LinkChip href="/crm" label="CRM" color="gold" />
      </div>

      {/* Channel legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, padding: '10px 14px', background: C.surface1, border: `1px solid ${C.lineSoft}`, borderRadius: 8 }}>
        {(Object.entries(STEP_ICONS) as [StepType, string][]).map(([type, icon]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{
              width: 18, height: 18, borderRadius: '50%',
              background: `${STEP_COLORS[type]}20`, border: `1.5px solid ${STEP_COLORS[type]}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: type === 'li' ? 7 : 9, color: STEP_COLORS[type],
              fontFamily: 'JetBrains Mono,monospace', fontWeight: 700,
            }}>{icon}</div>
            <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textMid }}>{STEP_LABELS[type]}</span>
          </div>
        ))}
      </div>

      {/* Mes séquences (DB) — affiché uniquement si des templates existent */}
      {dbTemplates.length > 0 && (
        <>
          <div style={{
            fontFamily: 'Oswald,sans-serif', fontSize: 14, fontWeight: 600,
            color: C.green, letterSpacing: '0.1em', marginBottom: 4, textTransform: 'uppercase',
          }}>
            Mes séquences
          </div>
          <div style={{ height: 1, background: `linear-gradient(90deg,${C.green},transparent)`, marginBottom: 6 }} />
          <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo, marginBottom: 12 }}>
            Séquences créées et enregistrées dans votre compte
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {dbTemplates.map(t => (
              <div key={t.id} style={{
                background: `linear-gradient(180deg,${C.surface1},${C.bgMid})`,
                border: `1px solid ${C.green}40`, borderRadius: 12, padding: '12px 14px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16 }}>📋</span>
                  <div>
                    <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 500, color: C.green }}>{t.name}</div>
                    {t.pipeline_stage && (
                      <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, marginTop: 2 }}>
                        Étape : {t.pipeline_stage}
                      </div>
                    )}
                  </div>
                </div>
                <span style={{
                  fontFamily: 'JetBrains Mono,monospace', fontSize: 8, fontWeight: 700,
                  color: t.auto_trigger ? C.gold : C.textLo,
                  background: t.auto_trigger ? `${C.gold}18` : `${C.textLo}18`,
                  border: `1px solid ${t.auto_trigger ? C.gold : C.textLo}40`,
                  padding: '1px 7px', borderRadius: 4,
                }}>
                  {t.auto_trigger ? 'Auto' : 'Manuel'}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Library 1 — Tunnel de prospection */}
      <div style={{
        fontFamily: 'Oswald,sans-serif', fontSize: 14, fontWeight: 600,
        color: C.indigo, letterSpacing: '0.1em', marginBottom: 4, textTransform: 'uppercase',
      }}>
        Bibliothèque · Tunnel de prospection
      </div>
      {/* Gold separator */}
      <div style={{ height: 1, background: `linear-gradient(90deg,${C.gold},transparent)`, marginBottom: 6 }} />
      <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo, marginBottom: 12 }}>
        Séquences liées aux étapes du pipeline commercial (premier contact, relance, confirmation RDV)
      </div>
      {SEQ_PROSPECTION.map(seq => <SeqCard key={seq.id} seq={seq} />)}

      {/* Library 2 — Scénarios patrimoniaux */}
      <div style={{
        fontFamily: 'Oswald,sans-serif', fontSize: 14, fontWeight: 600,
        color: C.gold, letterSpacing: '0.1em', marginBottom: 4, marginTop: 8, textTransform: 'uppercase',
      }}>
        Bibliothèque · Scénarios patrimoniaux
      </div>
      {/* Gold separator */}
      <div style={{ height: 1, background: `linear-gradient(90deg,${C.gold},transparent)`, marginBottom: 6 }} />
      <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo, marginBottom: 12 }}>
        Séquences thématiques basées sur la situation patrimoniale du prospect — à déclencher depuis sa fiche
      </div>
      {SEQ_PATRIMOINE.map(seq => <SeqCard key={seq.id} seq={seq} />)}

      {/* New sequence CTA */}
      <div
        onClick={() => setShowCreateModal(true)}
        style={{
          textAlign: 'center', padding: '14px 0',
          border: `1.5px dashed ${C.line}`, borderRadius: 10,
          fontFamily: 'Oswald,sans-serif', fontSize: 12, color: C.textLo,
          cursor: 'pointer', letterSpacing: '0.1em', marginTop: 4,
        }}
      >
        + Créer une nouvelle séquence
      </div>

      {showCreateModal && (
        <div onClick={() => setShowCreateModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.bgMid, border: `1px solid ${C.indigo}30`, borderRadius: 14, padding: 24, width: '100%', maxWidth: 420, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: C.ribbon, borderRadius: '14px 14px 0 0' }} />
            <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 14, fontWeight: 600, color: C.indigo, marginBottom: 8, marginTop: 4 }}>+ Créer une séquence</div>
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, marginBottom: 18, lineHeight: 1.6 }}>
              Crée un nom de séquence ici. Ensuite, dans <strong style={{ color: C.gold }}>Paramètres → Séquences</strong>, ouvre-la et ajoute les étapes (email J+0, WhatsApp J+2, etc.).
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 5 }}>Nom de la séquence *</label>
              <input
                autoFocus type="text" value={createName}
                onChange={e => setCreateName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
                placeholder="Ex : Séquence Médecins Paris, Relance RDV 1..."
                style={{ width: '100%', padding: '10px 12px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textHi, fontSize: 12, fontFamily: 'JetBrains Mono,monospace', boxSizing: 'border-box' as const }}
              />
            </div>
            {createError && <div style={{ fontSize: 9, color: C.warn, marginBottom: 12, fontFamily: 'JetBrains Mono,monospace' }}>{createError}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowCreateModal(false)} style={{ flex: 1, padding: 10, borderRadius: 8, background: C.surface1, border: `1px solid ${C.line}`, color: C.textLo, fontFamily: 'Oswald,sans-serif', fontSize: 11, cursor: 'pointer' }}>ANNULER</button>
              <button
                onClick={handleCreate}
                disabled={creating || !createName.trim()}
                style={{ flex: 2, padding: 10, borderRadius: 8, background: '#0d1a2e', border: `1px solid ${C.indigo}66`, color: C.indigo, fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 600, cursor: (creating || !createName.trim()) ? 'not-allowed' : 'pointer', opacity: (creating || !createName.trim()) ? 0.6 : 1 }}
              >
                {creating ? 'CRÉATION...' : '+ CRÉER'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
