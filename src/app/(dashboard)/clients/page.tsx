'use client'

import { useState } from 'react'
import { C } from '@/lib/theme'

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Client {
  id: number
  initials: string
  nom: string
  profession: string
  ville: string
  since: string
  aum: number
  revAn: string
  lastContact: number // days ago
  alertThreshold: number
  contrats: string[]
  telephone: string
  email: string
  nextRdv: string
  satisfaction: number
  rank?: string
  alert?: string
}

interface Prospect {
  initials: string
  nom: string
  profession: string
  ville: string
  rdv: string
  estRevAn: string
  proposition: string
  score: string
}

interface Task {
  text: string
  tag: string
  tagColor: string
  urgent: boolean
}

// ─── DATA ─────────────────────────────────────────────────────────────────────
const PREMIUM_CLIENTS: Client[] = [
  {
    id: 1, initials: 'AP', nom: 'Antoine Perrin', profession: "Chef d'entreprise", ville: 'Paris 8e',
    since: 'fév. 2025', aum: 0, revAn: '18 700 €/an', lastContact: 8, alertThreshold: 30,
    contrats: ['PER', 'Ass. vie', 'Capi.'], telephone: '06 10 00 00 01', email: 'a.perrin@email.fr',
    nextRdv: 'À planifier', satisfaction: 5, rank: 'TOP 1',
  },
  {
    id: 2, initials: 'DM', nom: 'Dr. Martin', profession: 'Chirurgien', ville: 'Vincennes',
    since: 'nov. 2024', aum: 0, revAn: '16 200 €/an', lastContact: 15, alertThreshold: 30,
    contrats: ['Ass. vie', 'PER', 'Tontine'], telephone: '06 10 00 00 02', email: 'dr.martin@email.fr',
    nextRdv: 'Avril 2025', satisfaction: 5, rank: 'TOP 2',
  },
  {
    id: 3, initials: 'LC', nom: 'Lucie Chen', profession: 'Pharmacienne', ville: 'Paris 6e',
    since: 'sep. 2023', aum: 0, revAn: '14 800 €/an', lastContact: 22, alertThreshold: 30,
    contrats: ['Ass. vie', 'Capi.', 'SCPI'], telephone: '06 10 00 00 03', email: 'l.chen@email.fr',
    nextRdv: 'Mai 2025', satisfaction: 5, rank: 'TOP 3',
  },
  {
    id: 4, initials: 'JB', nom: 'Dr. Barré', profession: 'Radiologue', ville: 'Vincennes',
    since: 'jan. 2025', aum: 0, revAn: '13 400 €/an', lastContact: 18, alertThreshold: 30,
    contrats: ['PER', 'Ass. vie'], telephone: '06 10 00 00 04', email: 'dr.barre@email.fr',
    nextRdv: 'À planifier', satisfaction: 4,
  },
  {
    id: 5, initials: 'SR', nom: 'Sophie Renaud', profession: 'Chef de projet', ville: 'Paris',
    since: 'mar. 2024', aum: 0, revAn: '12 100 €/an', lastContact: 34, alertThreshold: 30,
    contrats: ['PER', 'Tontine', 'Ass. vie'], telephone: '06 10 00 00 05', email: 's.renaud@email.fr',
    nextRdv: 'À planifier', satisfaction: 4,
    alert: '34j sans contact — relance urgente',
  },
]

const PROSPECTS: Prospect[] = [
  {
    initials: 'PR', nom: 'Dr. Rousseau', profession: 'Médecin généraliste', ville: 'Paris 16e',
    rdv: 'RDV 3 prévu', estRevAn: '~15 000 €/an', proposition: 'Proposition PER + Ass. vie', score: '5★',
  },
  {
    initials: 'MB', nom: 'Marc Bernard', profession: 'Dentiste', ville: 'Paris 15e',
    rdv: 'RDV 2 en cours', estRevAn: '~13 500 €/an', proposition: 'Étude patrimoniale complète', score: '5★',
  },
]

const TASKS_CLIENTS: Task[] = [
  { text: 'Sophie Renaud — 34j sans contact — appel urgent', tag: 'Premium', tagColor: C.cyan, urgent: true },
  { text: 'Antoine Perrin — proposition upsell SCPI', tag: 'Upsell', tagColor: C.magenta, urgent: true },
  { text: 'Dr. Martin — renouvellement PER avril', tag: 'Renouvellement', tagColor: C.warn, urgent: true },
  { text: 'Lucie Chen — RDV annuel de suivi mai', tag: 'Suivi', tagColor: C.indigo, urgent: false },
]

const TASKS_PROSPECTS: Task[] = [
  { text: 'Dr. Rousseau — closing RDV 3 cette semaine', tag: 'Closing', tagColor: C.cyan, urgent: true },
  { text: 'Marc Bernard — envoyer proposition détaillée', tag: 'Proposition', tagColor: C.magenta, urgent: true },
  { text: 'Préparer dossiers premium pour RDV semaine', tag: 'Prépa', tagColor: C.indigo, urgent: false },
]

// Existing full client portfolio (from original file)
const ALL_CLIENTS_FULL: Array<{
  id: number; nom: string; profession: string; ville: string; aum: number;
  lastContact: number; alertThreshold: number; contrats: string[];
  telephone: string; email: string; nextRdv: string; satisfaction: number;
}> = [
  { id: 101, nom: 'Mme Sandra Vidal', profession: 'Dirigeante SARL', ville: 'Boulogne', aum: 340000, lastContact: 12, alertThreshold: 90, contrats: ['Assurance vie', 'PER'], telephone: '01 46 20 XX XX', email: 's.vidal@vidalsa.fr', nextRdv: '15 mai 2025', satisfaction: 5 },
  { id: 102, nom: 'M. Leroy Paul', profession: 'Particulier', ville: 'Nice', aum: 185000, lastContact: 18, alertThreshold: 90, contrats: ['Assurance vie', 'Compte-titres'], telephone: '06 99 88 77 66', email: 'p.leroy@email.fr', nextRdv: '22 mai 2025', satisfaction: 5 },
  { id: 103, nom: 'Dr. Pierre Dumont', profession: 'Médecin spécialiste', ville: 'Versailles', aum: 520000, lastContact: 55, alertThreshold: 90, contrats: ['PER', 'Contrat Capi.'], telephone: '01 39 53 XX XX', email: 'p.dumont@cabinet.fr', nextRdv: 'À planifier', satisfaction: 4 },
  { id: 104, nom: 'Mme Sophie Petit', profession: 'Retraitée', ville: 'Paris', aum: 890000, lastContact: 95, alertThreshold: 90, contrats: ['Assurance vie', 'Tontine', 'PER'], telephone: '06 55 66 77 88', email: 'sophie.petit@email.fr', nextRdv: 'À planifier', satisfaction: 4 },
  { id: 105, nom: 'M. Antoine Renault', profession: 'Notaire', ville: 'Paris 8e', aum: 1200000, lastContact: 127, alertThreshold: 60, contrats: ['Assurance vie', 'Compte-titres', 'PER'], telephone: '01 53 89 XX XX', email: 'a.renault@etude.fr', nextRdv: 'À planifier', satisfaction: 3 },
  { id: 106, nom: 'Dr. Nathalie Simon', profession: 'Chirurgien', ville: 'Neuilly', aum: 760000, lastContact: 34, alertThreshold: 90, contrats: ['PER', 'Assurance vie'], telephone: '01 47 22 XX XX', email: 'n.simon@chir.fr', nextRdv: '8 juin 2025', satisfaction: 5 },
  { id: 107, nom: 'M. Jean-Pierre Blanc', profession: 'Dirigeant SAS', ville: 'Courbevoie', aum: 430000, lastContact: 78, alertThreshold: 90, contrats: ['PER Madelin', 'Assurance vie'], telephone: '01 47 68 XX XX', email: 'jp.blanc@blanc-sas.fr', nextRdv: 'À planifier', satisfaction: 4 },
  { id: 108, nom: 'Mme Claire Morel', profession: 'Expert-comptable', ville: 'Levallois', aum: 290000, lastContact: 8, alertThreshold: 90, contrats: ['Compte-titres', 'PER'], telephone: '01 47 57 XX XX', email: 'c.morel@cabinet.fr', nextRdv: '30 mai 2025', satisfaction: 5 },
]

const PRODUIT_COLORS: Record<string, string> = {
  'Assurance vie': '#e8c878',
  'PER': '#7a92e8',
  'PER Madelin': '#7a92e8',
  'Compte-titres': '#4ade80',
  'Contrat Capi.': '#b07aee',
  'Tontine': '#d8884a',
  'Capi.': '#b07aee',
  'Ass. vie': '#e8c878',
  'SCPI': '#4ade80',
}

function healthStatus(lastContact: number, threshold: number) {
  const ratio = lastContact / threshold
  if (ratio >= 1.2) return { label: 'Critique', color: '#ff6470', urgent: true }
  if (ratio >= 1) return { label: 'Alerte', color: '#d8884a', urgent: true }
  if (ratio >= 0.7) return { label: 'Attention', color: '#e8c878', urgent: false }
  return { label: 'OK', color: '#4ade80', urgent: false }
}

function formatAUM(v: number) {
  if (v >= 1000000) return `${(v / 1000000).toFixed(2)} M€`
  return `${(v / 1000).toFixed(0)} k€`
}

function Stars({ n }: { n: number }) {
  return (
    <span style={{ fontSize: 11 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ color: i <= n ? '#e8c878' : C.textVlo }}>★</span>
      ))}
    </span>
  )
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────
function Panel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: `linear-gradient(180deg,${C.surface1},${C.bgMid})`,
      border: `1px solid ${C.line}`,
      borderRadius: 12, padding: 16,
      position: 'relative', overflow: 'hidden',
      ...style,
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,#ff647055,transparent)' }} />
      {children}
    </div>
  )
}

function PanelTitle({ title, accent = C.cyan }: { title: string; accent?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
      <span style={{ width: 6, height: 6, background: accent, transform: 'rotate(45deg)', display: 'inline-block', flexShrink: 0 }} />
      <span style={{ fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 500, color: C.textHi, textTransform: 'uppercase', letterSpacing: '0.16em' }}>{title}</span>
    </div>
  )
}

function TaskItem({ task }: { task: Task }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 10px', borderRadius: 7, marginBottom: 6,
      background: task.urgent ? `${C.surface2}` : C.surface1,
      border: `1px solid ${task.urgent ? C.line : C.lineSoft}`,
      borderLeft: `3px solid ${task.tagColor}`,
    }}>
      <div style={{ fontSize: 11, color: task.urgent ? C.text : C.textMid, flex: 1, marginRight: 8 }}>{task.text}</div>
      <span style={{
        fontSize: 9, padding: '2px 6px', borderRadius: 8,
        background: task.tagColor + '22', color: task.tagColor,
        fontWeight: 600, whiteSpace: 'nowrap' as const,
      }}>{task.tag}</span>
    </div>
  )
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function ClientsPage() {
  const [tab, setTab] = useState<'premium' | 'portfolio'>('premium')
  const [selected, setSelected] = useState<typeof ALL_CLIENTS_FULL[number] | null>(null)
  const [sort, setSort] = useState<'aum' | 'lastContact' | 'satisfaction'>('lastContact')
  const [search, setSearch] = useState('')
  const [fullClients, setFullClients] = useState(ALL_CLIENTS_FULL)

  const alerts = fullClients.filter(c => c.lastContact >= c.alertThreshold)
  const totalAUM = fullClients.reduce((s, c) => s + c.aum, 0)

  const sorted = [...fullClients]
    .filter(c => !search || c.nom.toLowerCase().includes(search.toLowerCase()) || c.profession.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'aum') return b.aum - a.aum
      if (sort === 'lastContact') return b.lastContact - a.lastContact
      return b.satisfaction - a.satisfaction
    })

  function updateThreshold(id: number, threshold: number) {
    setFullClients(prev => prev.map(c => c.id === id ? { ...c, alertThreshold: threshold } : c))
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, alertThreshold: threshold } : null)
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '9px 0', borderRadius: '7px 7px 0 0',
    border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
    fontFamily: 'Oswald,sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase',
    background: active ? C.surface2 : C.surface1,
    color: active ? C.gold : C.textLo,
    borderBottom: active ? `2px solid ${C.gold}` : `2px solid transparent`,
    transition: 'all 0.15s',
  })

  return (
    <>
      <style>{'@import url(\'https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap\')'}</style>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 3, height: 24, background: C.ribbon, borderRadius: 2 }} />
          <h1 style={{ fontFamily: 'Oswald,sans-serif', fontSize: 22, fontWeight: 600, color: C.textHi, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Clients <span style={{ color: C.gold }}>Premium</span>
          </h1>
        </div>
        <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: C.textLo, paddingLeft: 13 }}>
          Suivi portefeuille — alertes contacts, AUM, satisfaction
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: `1px solid ${C.lineSoft}` }}>
        <button style={tabStyle(tab === 'premium')} onClick={() => setTab('premium')}>Top Premium</button>
        <button style={tabStyle(tab === 'portfolio')} onClick={() => setTab('portfolio')}>Portefeuille complet</button>
      </div>

      {/* ══════════════ TAB: PREMIUM ══════════════ */}
      {tab === 'premium' && (
        <>
          {/* KPI Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Clients actifs', value: '67', note: '↑ +5 ce mois', noteColor: C.green },
              { label: 'Clients premium', value: '14', note: 'Top 20% · 82% CA', noteColor: C.gold },
              { label: 'CA premium', value: '151 200 €', note: '82% du total', noteColor: C.gold },
              { label: 'Sans contact +30j', value: '2', note: 'Premium à relancer', noteColor: C.cyan },
            ].map((k, i) => (
              <Panel key={i} style={{ textAlign: 'center' as const }}>
                <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo, textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.1em' }}>{k.label}</div>
                <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 22, fontWeight: 700, color: C.textHi, lineHeight: 1 }}>{k.value}</div>
                <div style={{ fontSize: 9, color: k.noteColor, marginTop: 5 }}>{k.note}</div>
              </Panel>
            ))}
          </div>

          {/* Focus banner */}
          <div style={{
            padding: '10px 14px', marginBottom: 16, borderRadius: 8,
            background: `${C.gold}10`, border: `0.5px solid ${C.gold}40`,
          }}>
            <div style={{ fontSize: 11, color: C.gold, fontWeight: 600, marginBottom: 4 }}>
              Focus : 14 clients premium = 151 200 € / 184 400 € CA total
            </div>
            <div style={{ fontSize: 10, color: C.textLo }}>
              Suivi rapproché requis · Contact min. tous les 30j · Propositions upsell prioritaires
            </div>
          </div>

          {/* Premium clients list */}
          <Panel style={{ marginBottom: 16 }}>
            <PanelTitle title="Clients Premium — Top 20% qui génèrent 82% du CA" accent={C.gold} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {PREMIUM_CLIENTS.map((c) => (
                <div key={c.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 8,
                  background: c.alert ? `${C.cyan}08` : `${C.gold}08`,
                  border: `0.5px solid ${c.alert ? C.cyan + '60' : C.gold + '40'}`,
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                    background: `${C.gold}20`,
                    border: `1.5px solid ${c.alert ? C.cyan : C.gold}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 700, color: C.gold,
                  }}>
                    {c.initials}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: C.textHi }}>{c.nom}</span>
                      {c.rank && (
                        <span style={{
                          fontSize: 9, padding: '1px 6px', borderRadius: 8,
                          background: `${C.gold}20`, color: C.gold, fontWeight: 600,
                        }}>{c.rank}</span>
                      )}
                    </div>
                    {c.alert ? (
                      <div style={{ fontSize: 10, color: C.cyan, marginTop: 2 }}>⚠ {c.alert}</div>
                    ) : (
                      <div style={{ fontSize: 10, color: C.textLo, marginTop: 2 }}>
                        {c.profession} · {c.ville} · depuis {c.since}
                      </div>
                    )}
                    {!c.alert && (
                      <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' as const }}>
                        {c.contrats.map(ct => (
                          <span key={ct} style={{
                            fontSize: 9, padding: '1px 5px', borderRadius: 3,
                            background: (PRODUIT_COLORS[ct] || '#888') + '22',
                            color: PRODUIT_COLORS[ct] || '#888',
                          }}>{ct}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Revenue */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 13, color: C.gold, fontWeight: 700 }}>{c.revAn}</div>
                    {c.alert && (
                      <div style={{ display: 'flex', gap: 4, marginTop: 4, justifyContent: 'flex-end', flexWrap: 'wrap' as const }}>
                        {c.contrats.map(ct => (
                          <span key={ct} style={{
                            fontSize: 9, padding: '1px 5px', borderRadius: 3,
                            background: (PRODUIT_COLORS[ct] || '#888') + '22',
                            color: PRODUIT_COLORS[ct] || '#888',
                          }}>{ct}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* See more */}
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <span style={{
                fontSize: 10, color: C.textLo, cursor: 'pointer',
                padding: '4px 12px', borderRadius: 12, border: `0.5px solid ${C.line}`,
              }}>
                Voir les 9 autres clients premium →
              </span>
            </div>
          </Panel>

          {/* Prospects */}
          <Panel style={{ marginBottom: 16 }}>
            <PanelTitle title="Prospects premium potentiels — Pipeline à fort potentiel" accent={C.indigo} />

            {/* Prospects banner */}
            <div style={{
              padding: '8px 12px', marginBottom: 12, borderRadius: 7,
              background: `${C.indigo}10`, border: `0.5px solid ${C.indigo}40`,
            }}>
              <div style={{ fontSize: 11, color: C.indigo, fontWeight: 600, marginBottom: 4 }}>
                Prospects à fort potentiel · Scoring 5★ · En RDV 2 ou 3
              </div>
              <div style={{ fontSize: 10, color: C.textLo }}>
                Conversion estimée : 12 000-18 000 €/an par prospect
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {PROSPECTS.map((p, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 8,
                  background: `${C.indigo}08`, border: `0.5px solid ${C.indigo}40`,
                }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                    background: `${C.indigo}20`, border: `1.5px solid ${C.indigo}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 700, color: C.indigo,
                  }}>
                    {p.initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: C.textHi }}>{p.nom}</span>
                      <span style={{
                        fontSize: 9, padding: '1px 6px', borderRadius: 8,
                        background: `${C.indigo}20`, color: C.indigo, fontWeight: 600,
                      }}>{p.score}</span>
                    </div>
                    <div style={{ fontSize: 10, color: C.textLo, marginTop: 2 }}>
                      {p.profession} · {p.ville} · {p.rdv}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 12, color: C.indigo, fontWeight: 600 }}>{p.estRevAn}</div>
                    <div style={{ fontSize: 10, color: C.textLo, marginTop: 2 }}>{p.proposition}</div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          {/* Two-col task lists */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Panel>
              <PanelTitle title="Actions prioritaires clients premium" accent={C.cyan} />
              {TASKS_CLIENTS.map((t, i) => <TaskItem key={i} task={t} />)}
            </Panel>
            <Panel>
              <PanelTitle title="Actions prospects premium" accent={C.indigo} />
              {TASKS_PROSPECTS.map((t, i) => <TaskItem key={i} task={t} />)}
            </Panel>
          </div>
        </>
      )}

      {/* ══════════════ TAB: PORTFOLIO ══════════════ */}
      {tab === 'portfolio' && (
        <>
          {/* Alert banner */}
          {alerts.length > 0 && (
            <div style={{
              background: `${C.cyan}10`, border: `1px solid ${C.cyan}44`,
              borderRadius: 10, padding: '12px 16px', marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ fontSize: 20 }}>🚨</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.cyan }}>
                  {alerts.length} client{alerts.length > 1 ? 's' : ''} sans contact depuis trop longtemps
                </div>
                <div style={{ fontSize: 11, color: `${C.cyan}88`, marginTop: 2 }}>
                  {alerts.map(c => c.nom).join(', ')}
                </div>
              </div>
            </div>
          )}

          {/* KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Clients actifs', value: fullClients.length, color: C.textHi },
              { label: 'AUM total', value: formatAUM(totalAUM), color: C.gold },
              { label: 'AUM moyen', value: formatAUM(totalAUM / fullClients.length), color: C.indigo },
              { label: 'Alertes actives', value: alerts.length, color: alerts.length > 0 ? C.cyan : C.green },
            ].map((k, i) => (
              <Panel key={i} style={{ textAlign: 'center' as const }}>
                <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo, textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.1em' }}>{k.label}</div>
                <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 22, fontWeight: 700, color: k.color, lineHeight: 1 }}>{k.value}</div>
              </Panel>
            ))}
          </div>

          {/* Table + drawer */}
          <div style={{ display: 'flex', gap: 16 }}>
            <Panel style={{ flex: 1 }}>
              {/* Toolbar */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <input
                  placeholder="Rechercher client..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    flex: 1, padding: '7px 12px', borderRadius: 7, fontSize: 11,
                    background: C.surface2, border: `1px solid ${C.line}`,
                    color: C.textHi, outline: 'none',
                  }}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  {([['aum', 'AUM'], ['lastContact', 'Dernier contact'], ['satisfaction', 'Satisfaction']] as const).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setSort(key)}
                      style={{
                        fontSize: 10, padding: '5px 10px', borderRadius: 5, cursor: 'pointer',
                        border: sort === key ? `1px solid ${C.gold}` : `1px solid ${C.line}`,
                        background: sort === key ? `${C.gold}15` : C.surface1,
                        color: sort === key ? C.gold : C.textLo,
                        fontFamily: 'Oswald,sans-serif', letterSpacing: '0.06em',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1.8fr 1fr 0.8fr 1fr 1fr 0.8fr 0.7fr',
                gap: 8, padding: '7px 12px',
                background: C.surface1, borderRadius: '6px 6px 0 0',
                borderBottom: `1px solid ${C.lineSoft}`,
              }}>
                {['Client', 'Profession', 'AUM', 'Dernier contact', 'Prochain RDV', 'Santé', 'Score'].map(h => (
                  <div key={h} style={{ fontSize: 10, color: C.textLo, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>{h}</div>
                ))}
              </div>

              {sorted.map((c, i) => {
                const hs = healthStatus(c.lastContact, c.alertThreshold)
                const isSelected = selected?.id === c.id
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelected(isSelected ? null : c)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.8fr 1fr 0.8fr 1fr 1fr 0.8fr 0.7fr',
                      gap: 8, padding: '10px 12px', alignItems: 'center',
                      borderBottom: `1px solid ${C.lineSoft}`,
                      background: isSelected ? `${C.gold}08` : i % 2 === 0 ? 'transparent' : C.surface1,
                      cursor: 'pointer',
                      borderLeft: isSelected ? `3px solid ${C.gold}` : `3px solid transparent`,
                      transition: 'background 0.15s',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{c.nom}</div>
                      <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' as const }}>
                        {c.contrats.map(ct => (
                          <span key={ct} style={{
                            fontSize: 9, padding: '1px 5px', borderRadius: 3,
                            background: (PRODUIT_COLORS[ct] || '#888') + '22',
                            color: PRODUIT_COLORS[ct] || '#888',
                          }}>{ct}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: C.textMid }}>{c.profession}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.gold }}>{formatAUM(c.aum)}</div>
                    <div style={{ fontSize: 11, color: c.lastContact > c.alertThreshold ? C.cyan : C.textMid }}>
                      {c.lastContact === 0 ? "Aujourd'hui" : `il y a ${c.lastContact}j`}
                    </div>
                    <div style={{ fontSize: 11, color: C.textLo }}>{c.nextRdv}</div>
                    <div style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                      background: hs.color + '22', color: hs.color,
                      border: `1px solid ${hs.color}44`, textAlign: 'center' as const,
                    }}>
                      {hs.urgent && '⚠ '}{hs.label}
                    </div>
                    <Stars n={c.satisfaction} />
                  </div>
                )
              })}
            </Panel>

            {/* Detail drawer */}
            {selected && (
              <div style={{
                width: 280, flexShrink: 0,
                background: `linear-gradient(180deg,${C.surface1},${C.bgMid})`,
                borderRadius: 12, border: `1px solid ${C.line}`,
                height: 'fit-content', position: 'sticky', top: 0,
              }}>
                <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${C.lineSoft}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.textHi, marginBottom: 2 }}>{selected.nom}</div>
                  <div style={{ fontSize: 11, color: C.textLo }}>{selected.profession} — {selected.ville}</div>
                  <div style={{ marginTop: 8 }}><Stars n={selected.satisfaction} /></div>
                </div>

                <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.lineSoft}` }}>
                  <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo, marginBottom: 8, fontWeight: 600, letterSpacing: '0.1em' }}>PATRIMOINE GÉRÉ</div>
                  <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 22, fontWeight: 800, color: C.gold }}>{formatAUM(selected.aum)}</div>
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column' as const, gap: 4 }}>
                    {selected.contrats.map(ct => (
                      <div key={ct} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: PRODUIT_COLORS[ct] || '#888' }} />
                        <span style={{ fontSize: 11, color: C.textMid }}>{ct}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.lineSoft}` }}>
                  <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo, marginBottom: 8, fontWeight: 600, letterSpacing: '0.1em' }}>CONTACT</div>
                  <div style={{ fontSize: 11, color: C.textMid, marginBottom: 4 }}>📞 {selected.telephone}</div>
                  <div style={{ fontSize: 11, color: C.textMid, marginBottom: 4 }}>✉️ {selected.email}</div>
                  <div style={{ fontSize: 11, color: C.textLo }}>Dernier contact : il y a {selected.lastContact}j</div>
                  <div style={{ fontSize: 11, color: C.indigo, marginTop: 4 }}>Prochain RDV : {selected.nextRdv}</div>
                </div>

                <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.lineSoft}` }}>
                  <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo, marginBottom: 8, fontWeight: 600, letterSpacing: '0.1em' }}>SEUIL D'ALERTE</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                    {[30, 60, 90, 120].map(d => (
                      <button
                        key={d}
                        onClick={() => updateThreshold(selected.id, d)}
                        style={{
                          fontSize: 10, padding: '4px 8px', borderRadius: 4, cursor: 'pointer',
                          border: selected.alertThreshold === d ? `1px solid ${C.gold}` : `1px solid ${C.line}`,
                          background: selected.alertThreshold === d ? `${C.gold}15` : C.surface1,
                          color: selected.alertThreshold === d ? C.gold : C.textLo,
                        }}
                      >
                        {d}j
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                    <button style={{
                      padding: '8px 0', borderRadius: 7, border: `1px solid #25D36644`,
                      background: 'rgba(37,211,102,0.08)', color: '#25D366',
                      fontWeight: 600, fontSize: 11, cursor: 'pointer',
                    }}>
                      💬 WhatsApp
                    </button>
                    <button style={{
                      padding: '8px 0', borderRadius: 7, border: `1px solid ${C.indigo}44`,
                      background: `${C.indigo}10`, color: C.indigo,
                      fontWeight: 600, fontSize: 11, cursor: 'pointer',
                    }}>
                      ✉️ Email Brevo
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}
