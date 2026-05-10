'use client'

import { C } from '@/lib/theme'

// ---------- AGENDA DATA ----------
type EventType = 'rdv' | 'bloc' | 'sport' | 'tache' | 'commerce' | 'interpro'

interface AgendaEvent {
  time: string
  title: string
  client?: string
  type: EventType
}

type DayKey = 'lun' | 'mar' | 'mer' | 'jeu' | 'ven'

const EVENT_COLORS: Record<EventType, { bg: string; border: string; text: string; dot: string }> = {
  rdv:      { bg: 'rgba(122,146,232,0.12)', border: '#7a92e8', text: '#7a92e8',  dot: '#7a92e8' },
  bloc:     { bg: 'rgba(74,222,128,0.10)',  border: '#4ade80', text: '#4ade80',  dot: '#4ade80' },
  sport:    { bg: 'rgba(255,100,112,0.12)', border: '#ff6470', text: '#ff6470',  dot: '#ff6470' },
  tache:    { bg: 'rgba(216,136,74,0.10)',  border: '#d8884a', text: '#8ea0d9',  dot: '#5a6ba8' },
  commerce: { bg: 'rgba(232,200,120,0.10)', border: '#e8c878', text: '#e8c878',  dot: '#e8c878' },
  interpro: { bg: 'rgba(232,200,120,0.14)', border: '#e8c878', text: '#e8c878',  dot: '#e8c878' },
}

// Each hour slot per day — null = empty
const AGENDA: Record<DayKey, (AgendaEvent | null)[]> = {
  lun: [
    { time: '8h00-8h30',   title: '📚 Formation closing',     type: 'commerce' },
    { time: '9h00-10h30',  title: '🟢 Bloc 1 • Appels TNS',  client: '📍 Bureau', type: 'bloc' },
    { time: '10h30-11h00', title: '⚪ Emails & Admin',         type: 'tache' },
    { time: '11h00-12h00', title: '⚪ Dossier Dr. Rousseau',  type: 'tache' },
    null,
    null,
    { time: '14h00-15h00', title: '🔵 RDV 1',                 client: 'Dr. Rondeau • 📍 17e', type: 'rdv' },
    { time: '15h00-16h00', title: '⚪ Étude M. Bernard',      type: 'tache' },
    { time: '16h00-17h00', title: '🟢 Bloc 3 • LinkedIn',     client: '📍 Bureau', type: 'bloc' },
    null,
    null,
  ],
  mar: [
    { time: '8h30-10h00',  title: '🟢 Bloc 1 • Prospection', client: '📍 Bureau', type: 'bloc' },
    { time: '9h30-11h00',  title: '🔴 Sport / Salle',         client: '📍 Basic Fit Ternes', type: 'sport' },
    null,
    { time: '11h00-12h00', title: '🔵 RDV 2',                 client: 'M. Petit • 📍 Neuilly', type: 'rdv' },
    null,
    { time: '13h00-14h00', title: '🟡 Déj Expert-comptable',  client: 'Lefebvre • 📍 9e', type: 'interpro' },
    { time: '14h00-15h30', title: '🟢 Bloc 2 • Dossiers',    client: '📍 Bureau (après déj 9e)', type: 'bloc' },
    null,
    { time: '16h00-17h00', title: '🔵 RDV 1',                 client: 'M. Dubois • 📍 14e', type: 'rdv' },
    { time: '17h00-18h00', title: '⚪ Séquence email RDV1',   type: 'tache' },
    null,
  ],
  mer: [
    { time: '8h00-8h30',   title: '📚 Formation objections',  type: 'commerce' },
    { time: '9h00-10h30',  title: '🟢 Bloc 1 • Stratégies',  client: '📍 Bureau', type: 'bloc' },
    { time: '10h30-11h00', title: '⚪ Relances prospects',    type: 'tache' },
    { time: '11h00-12h00', title: '🔵 RDV 1',                 client: 'Mme Durand • 📍 15e', type: 'rdv' },
    null,
    null,
    { time: '14h00-15h30', title: '🟢 Bloc 2 • Prépa RDV',   client: '📍 Café 15e (avant RDV)', type: 'bloc' },
    null,
    { time: '16h00-17h00', title: '🔵 RDV 2',                 client: 'Mme Chen • 📍 Visio', type: 'rdv' },
    null,
    null,
  ],
  jeu: [
    { time: '8h30-10h00',  title: '🟢 Bloc 1 • Dossiers',    client: '📍 Bureau', type: 'bloc' },
    { time: '9h30-11h00',  title: '🔴 Sport / Musculation',   client: '📍 Basic Fit Ternes', type: 'sport' },
    null,
    { time: '11h00-12h00', title: '🟡 Notaire',               client: 'Me Dupont • 📍 8e', type: 'interpro' },
    null,
    null,
    { time: '14h00-15h00', title: '🔵 RDV 3 • Closing',       client: 'M. Bernard • 📍 Visio', type: 'rdv' },
    { time: '15h00-16h00', title: '⚪ Rapport hebdo',         type: 'tache' },
    { time: '16h00-17h00', title: '🟡 Courtier immo',         client: 'Laforet • 📍 Café 17e', type: 'interpro' },
    null,
    null,
  ],
  ven: [
    { time: '8h00-8h30',   title: '📚 Formation prospection', type: 'commerce' },
    { time: '9h00-10h30',  title: '🟢 Bloc 1 • Content',      client: '📍 Bureau', type: 'bloc' },
    { time: '10h30-11h00', title: '⚪ Prep semaine suiv.',    type: 'tache' },
    { time: '11h00-12h00', title: '🔵 RDV 2',                 client: 'Dr. Martin • 📍 16e', type: 'rdv' },
    null,
    null,
    { time: '14h00-15h30', title: '🟢 Bloc 2 • Analyse',      client: '📍 Bureau (après RDV 16e)', type: 'bloc' },
    null,
    null,
    { time: '17h00-18h00', title: '⚪ Planif semaine',        type: 'tache' },
    null,
  ],
}

const HOURS = ['8h', '9h', '10h', '11h', '12h', '13h', '14h', '15h', '16h', '17h', '18h']
const DAYS: { key: DayKey; label: string }[] = [
  { key: 'lun', label: 'Lun 21' },
  { key: 'mar', label: 'Mar 22' },
  { key: 'mer', label: 'Mer 23' },
  { key: 'jeu', label: 'Jeu 24' },
  { key: 'ven', label: 'Ven 25' },
]

// ---------- COMPONENTS ----------
function AgendaCell({ event }: { event: AgendaEvent | null }) {
  if (!event) return <div style={{ height: 32 }} />
  const col = EVENT_COLORS[event.type]
  return (
    <div style={{
      background: col.bg,
      border: `1px solid ${col.border}44`,
      borderLeft: `2px solid ${col.border}`,
      borderRadius: 4,
      padding: '3px 6px',
      marginBottom: 4,
      minHeight: 28,
    }}>
      <div style={{ fontSize: 8, color: C.textLo, lineHeight: 1.2 }}>{event.time}</div>
      <div style={{ fontSize: 9, color: col.text, fontWeight: 600, lineHeight: 1.2 }}>{event.title}</div>
      {event.client && <div style={{ fontSize: 8, color: C.textLo, lineHeight: 1.2 }}>{event.client}</div>}
    </div>
  )
}

// ---------- PAGE ----------
export default function WeeklyPage() {
  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap')`}</style>

      {/* ── Metrics row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'CA avril',     value: '18 400 €', sub: '↑ +12% vs mars',     subColor: C.green },
          { label: 'Taux closing', value: '34%',       sub: 'Objectif 40%',        subColor: C.gold },
          { label: 'RDV semaine',  value: '7',          sub: '5 conf. · 2 en att.', subColor: C.green },
          { label: 'À relancer',   value: '12',         sub: 'Prospects actifs',    subColor: C.gold },
        ].map(m => (
          <div key={m.label} style={{
            background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 10,
            padding: '14px 16px',
          }}>
            <div style={{ fontSize: 10, color: C.textLo, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>{m.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.textHi, fontFamily: 'Oswald, sans-serif' }}>{m.value}</div>
            <div style={{ fontSize: 10, color: m.subColor, marginTop: 4 }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Two-column: Actions + Barometre ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>

        {/* Actions prioritaires */}
        <div style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textHi, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
            Actions prioritaires
          </div>
          {[
            { text: 'Sophie Renaud — 34j sans contact — appel urgent', tag: 'Premium', urgent: true },
            { text: 'Dr. Rousseau — closing RDV 3 cette semaine',      tag: 'Premium', urgent: true },
            { text: 'Antoine Perrin — proposition upsell SCPI',        tag: 'Premium', urgent: true },
            { text: 'Relancer Dr. Martin — RDV 2 en attente 5j',      tag: 'Relance', urgent: false },
            { text: 'Confirmer RDV mer. 16h — Mme Chen',              tag: 'À confirmer', urgent: false },
            { text: 'Séquence email post-RDV 1 × 4 prospects',        tag: 'Auto',     urgent: false },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '7px 10px', marginBottom: 6,
              background: item.urgent ? `${C.gold}0a` : C.surface2,
              border: `1px solid ${item.urgent ? C.gold + '44' : C.lineSoft}`,
              borderLeft: `3px solid ${item.urgent ? C.gold : C.indigo}`,
              borderRadius: 6,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1, minWidth: 0 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.urgent ? C.gold : C.indigo, flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: C.text, lineHeight: 1.4 }}>{item.text}</span>
              </div>
              <span style={{
                fontSize: 8, padding: '2px 7px', borderRadius: 10, flexShrink: 0, marginLeft: 8,
                background: item.urgent ? `${C.gold}20` : `${C.indigo}20`,
                color: item.urgent ? C.gold : C.indigo,
                border: `0.5px solid ${item.urgent ? C.gold + '60' : C.indigo + '60'}`,
                fontWeight: 600,
              }}>{item.tag}</span>
            </div>
          ))}
        </div>

        {/* Baromètre objectifs */}
        <div style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textHi, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
            Baromètre objectifs semaine
          </div>

          {/* Gauge SVG */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
            <svg width="180" height="100" viewBox="0 0 180 100">
              <defs>
                <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" style={{ stopColor: '#ff6470', stopOpacity: 1 }} />
                  <stop offset="40%" style={{ stopColor: '#e8c878', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#4ade80', stopOpacity: 1 }} />
                </linearGradient>
              </defs>
              <path d="M 20 80 A 70 70 0 0 1 160 80" fill="none" stroke={C.surface3} strokeWidth="14" strokeLinecap="round" />
              <path d="M 20 80 A 70 70 0 0 1 160 80" fill="none" stroke="url(#gaugeGrad)" strokeWidth="14" strokeLinecap="round" strokeDasharray="220" strokeDashoffset="0" />
              <line x1="90" y1="80" x2="125" y2="45" stroke={C.gold} strokeWidth="3" strokeLinecap="round" />
              <circle cx="90" cy="80" r="5" fill={C.gold} />
              <text x="90" y="73" textAnchor="middle" fontSize="20" fontWeight="500" fill={C.textHi}>68%</text>
              <text x="20" y="95" textAnchor="start" fontSize="9" fill={C.textLo}>0</text>
              <text x="160" y="95" textAnchor="end" fontSize="9" fill={C.textLo}>100</text>
            </svg>
          </div>
          <div style={{ fontSize: 9, color: C.textLo, textAlign: 'center', marginBottom: 14 }}>Objectif global semaine</div>

          {/* Progress bars */}
          {[
            { label: 'Appels',       pct: 75, val: '30/40', color: C.green },
            { label: 'Blocs travail', pct: 60, val: '9/15',  color: C.green },
            { label: 'Relances',      pct: 50, val: '6/12',  color: C.indigo },
          ].map(bar => (
            <div key={bar.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ fontSize: 9, color: C.textLo, width: 80, flexShrink: 0 }}>{bar.label}</div>
              <div style={{ flex: 1, background: C.surface3, height: 8, borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ width: `${bar.pct}%`, height: '100%', background: bar.color, borderRadius: 10 }} />
              </div>
              <div style={{ fontSize: 9, color: bar.color, width: 35, textAlign: 'right', fontWeight: 500 }}>{bar.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Agenda hebdomadaire ── */}
      <div style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 10, padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textHi, textTransform: 'uppercase', letterSpacing: 1 }}>
            Agenda hebdomadaire · 21-25 avril 2026
          </div>
          <button style={{
            padding: '5px 12px', background: C.surface2,
            border: `1px solid ${C.indigo}`, color: C.indigo,
            borderRadius: 6, fontSize: 8, fontWeight: 600, cursor: 'pointer',
          }}>
            ➕ Ajouter événement
          </button>
        </div>
        <div style={{ fontSize: 8, color: C.textLo, marginBottom: 12 }}>
          🏃 Sport : Mar/Jeu 9h30-11h · 📍 Blocs optimisés selon lieux RDV · ⚪ Tâches liées au planning
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '36px repeat(5,1fr)', gap: 4 }}>
          {/* Header */}
          <div />
          {DAYS.map(d => (
            <div key={d.key} style={{
              fontSize: 9, fontWeight: 700, color: C.textMid,
              textAlign: 'center', padding: '4px 0',
              background: C.surface2, borderRadius: 4,
            }}>{d.label}</div>
          ))}

          {/* Rows */}
          {HOURS.map((h, hi) => (
            <>
              <div key={`h-${hi}`} style={{
                fontSize: 8, color: C.textLo, paddingTop: 4,
                textAlign: 'right', paddingRight: 6,
              }}>{h}</div>
              {DAYS.map(d => (
                <AgendaCell key={`${d.key}-${hi}`} event={AGENDA[d.key][hi]} />
              ))}
            </>
          ))}
        </div>

        {/* Legend */}
        <div style={{
          marginTop: 12, padding: '10px 12px',
          background: C.bgDeep, borderRadius: 6, border: `1px solid ${C.line}`,
        }}>
          <div style={{ fontSize: 9, fontWeight: 600, color: C.gold, marginBottom: 6 }}>
            📍 Optimisation blocs selon lieux RDV
          </div>
          <div style={{ fontSize: 8, color: C.textLo, lineHeight: 1.7 }}>
            • Blocs placés <strong style={{ color: C.textMid }}>avant/après RDV</strong> selon proximité géographique<br />
            • Sport fixe : <strong style={{ color: C.cyan }}>Mar/Jeu 9h30-11h</strong> (Basic Fit Ternes)<br />
            • Tâches planifiées dans créneaux libres optimisés
          </div>
        </div>

        {/* Event type legend */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 10 }}>
          {(Object.entries(EVENT_COLORS) as [EventType, typeof EVENT_COLORS[EventType]][]).map(([type, col]) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: col.border }} />
              <span style={{ fontSize: 9, color: C.textLo, textTransform: 'capitalize' }}>{type}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
