'use client'

import { useState } from 'react'
import { C } from '@/lib/theme'

const CA_MONTHS = [
  { month: 'Nov', value: 11200, height: 48 },
  { month: 'Déc', value: 14100, height: 60 },
  { month: 'Jan', value: 12800, height: 54 },
  { month: 'Fév', value: 15400, height: 68 },
  { month: 'Mar', value: 16400, height: 74 },
  { month: 'Avr', value: 18400, height: 84, current: true },
]

const CHANNELS = [
  { label: 'Appels directs', width: 85, val: '42%', color: C.gold },
  { label: 'LinkedIn', width: 55, val: '22%', color: C.indigo },
  { label: 'Séquences email', width: 40, val: '18%', color: '#4ade80' },
  { label: 'Bouche à oreille', width: 28, val: '12%', color: '#b07aee' },
  { label: 'WhatsApp', width: 15, val: '6%', color: '#4ade80' },
]

const TOP_ACTIONS = [
  { rank: '🥇', name: 'Appel TNS chirurgien Paris', sub: 'Taux closing 62% · CA moyen 14 200 €', borderColor: C.gold, bg: '#1a1400' },
  { rank: '🥈', name: 'LinkedIn InMail chef d\'entreprise', sub: 'Taux closing 48% · CA moyen 11 800 €', borderColor: C.gold + '80', bg: C.surface1 },
  { rank: '🥉', name: 'Séquence post-RDV 1 radiologue', sub: 'Taux closing 44% · CA moyen 9 600 €', borderColor: C.gold + '60', bg: C.surface1 },
  { rank: '4', name: 'Relance WhatsApp J+3', sub: 'Taux closing 38%', borderColor: C.line, bg: C.surface1 },
  { rank: '5', name: 'Appel pharmacien petite couronne', sub: 'Taux closing 31%', borderColor: C.line, bg: C.surface1 },
]

const ALERTS = [
  { title: 'Taux closing en baisse', desc: '34% ce mois vs 40% objectif. RDV 2→3 à améliorer.', color: C.cyan, bg: '#1f0d0d', border: C.cyan },
  { title: '2 clients premium sans contact +30j', desc: 'Sophie Renaud (34j) · Risque de churn premium.', color: C.gold, bg: '#1a1400', border: C.gold },
  { title: 'Pipeline concentré sur TNS', desc: '78% TNS vs 15% Chefs. Diversifier les cibles.', color: C.indigo, bg: '#0d1a2e', border: C.indigo },
  { title: '💡 Recommandation', desc: 'Augmenter les blocs prospection de 4→5/jour pour atteindre 40% closing.', color: C.green, bg: '#0d1f0f', border: C.green },
]

const OBJECTIVES = [
  { icon: '📞', label: '100 appels', val: '142/100 ✅', achieved: true },
  { icon: '💰', label: 'CA > 15k€', val: '18 400 € ✅', achieved: true },
  { icon: '👥', label: '+5 clients', val: '67 total ✅', achieved: true },
  { icon: '🎯', label: 'Closing 40%', val: '34/40% ❌', achieved: false },
  { icon: '🔥', label: '6 blocs/jour ×5j', val: '3 jours ❌', achieved: false },
]

function Panel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: `linear-gradient(180deg,${C.surface1},${C.bgMid})`,
      border: `1px solid ${C.line}`, borderRadius: 10,
      padding: 14, position: 'relative', overflow: 'hidden', ...style,
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,#ff647066,transparent)' }} />
      {children}
    </div>
  )
}

function PanelTitle({ title }: { title: string }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 600, color: C.textHi, marginBottom: 10, fontFamily: 'Oswald,sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
      {title}
    </div>
  )
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<'mois' | 'trimestre' | 'année'>('mois')

  return (
    <>
      <style>{'@import url(\'https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap\')'}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ width: 3, height: 22, background: C.ribbon, borderRadius: 2 }} />
            <h1 style={{ fontFamily: 'Oswald,sans-serif', fontSize: 20, fontWeight: 600, color: C.textHi, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              📊 Analytics
            </h1>
          </div>
          <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo, paddingLeft: 11 }}>
            Analyse de performance · Tendances · Insights
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['mois', 'trimestre', 'année'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                fontSize: 8, padding: '3px 8px', borderRadius: 10, cursor: 'pointer', border: 'none',
                background: period === p ? '#1a1400' : C.surface1,
                color: period === p ? C.gold : C.textLo,
                outline: period === p ? `0.5px solid ${C.gold}40` : `0.5px solid ${C.line}40`,
                fontFamily: 'JetBrains Mono,monospace',
              }}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* 4 KPI Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
        {[
          { label: 'Score productivité', value: '78/100', sub: '↑ +12 vs mois dernier', color: C.green },
          { label: 'Taux conversion global', value: '34%', sub: 'Appel → Signing', color: C.textHi },
          { label: 'CA moyen / client', value: '2 752 €', sub: '↑ +8%', color: C.textHi },
          { label: 'Temps moyen closing', value: '18 jours', sub: '↓ -3j vs mars', color: C.textHi },
        ].map((m, i) => (
          <Panel key={i}>
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{m.label}</div>
            <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 22, fontWeight: 700, color: m.color, lineHeight: 1 }}>{m.value}</div>
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.green, marginTop: 4 }}>{m.sub}</div>
          </Panel>
        ))}
      </div>

      {/* Row 1: CA Chart + Canal Acquisition */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        {/* CA Chart */}
        <Panel>
          <PanelTitle title="📈 Évolution du CA — 6 derniers mois" />
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120, padding: '10px 0' }}>
            {CA_MONTHS.map((m, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: '100%',
                  height: m.height,
                  background: m.current
                    ? `linear-gradient(to top,${C.gold}40,${C.gold}80)`
                    : `linear-gradient(to top,${C.gold}20,${C.gold}40)`,
                  borderRadius: 3,
                  border: m.current ? `1px solid ${C.gold}60` : 'none',
                  boxShadow: m.current ? `0 0 8px ${C.gold}33` : 'none',
                }} />
                <span style={{ fontSize: 7, color: m.current ? C.gold : C.textLo, fontWeight: m.current ? 600 : 400, fontFamily: 'JetBrains Mono,monospace' }}>{m.month}</span>
                <span style={{ fontSize: 7, color: C.gold, fontWeight: m.current ? 600 : 400, fontFamily: 'JetBrains Mono,monospace' }}>{(m.value / 1000).toFixed(1)}k</span>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', fontSize: 8, color: C.green, fontWeight: 500, marginTop: 4, fontFamily: 'JetBrains Mono,monospace' }}>
            📈 Tendance : +10.3% / mois en moyenne
          </div>
        </Panel>

        {/* Canal acquisition */}
        <Panel>
          <PanelTitle title="🎯 Performance par canal d'acquisition" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {CHANNELS.map((ch, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 9, color: C.textMid, width: 110, fontFamily: 'Inter,sans-serif', flexShrink: 0 }}>{ch.label}</div>
                <div style={{ flex: 1, background: C.surface3, borderRadius: 3, height: 6, position: 'relative' }}>
                  <div style={{ width: `${ch.width}%`, height: '100%', background: ch.color, borderRadius: 3, boxShadow: `0 0 6px ${ch.color}66` }} />
                </div>
                <div style={{ fontSize: 9, color: ch.color, fontWeight: 600, width: 30, textAlign: 'right', fontFamily: 'JetBrains Mono,monospace', flexShrink: 0 }}>{ch.val}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Row 2: Top Actions + Points d'attention */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        {/* Top 5 actions */}
        <Panel>
          <PanelTitle title="🏆 Top 5 actions les plus rentables" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {TOP_ACTIONS.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 6, background: a.bg, borderRadius: 5, borderLeft: `2px solid ${a.borderColor}` }}>
                <span style={{ fontSize: i < 3 ? 11 : 9, color: i >= 3 ? C.textLo : undefined, flexShrink: 0 }}>{a.rank}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, color: i < 3 ? C.textHi : C.textMid, fontWeight: 500, fontFamily: 'Inter,sans-serif' }}>{a.name}</div>
                  <div style={{ fontSize: 7, color: C.textLo, marginTop: 1, fontFamily: 'JetBrains Mono,monospace' }}>{a.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Points d'attention */}
        <Panel>
          <PanelTitle title="⚠️ Points d'attention" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {ALERTS.map((a, i) => (
              <div key={i} style={{ padding: 8, background: a.bg, borderRadius: 5, borderLeft: `2px solid ${a.border}` }}>
                <div style={{ fontSize: 9, color: a.color, fontWeight: 500, fontFamily: 'Inter,sans-serif' }}>{a.title}</div>
                <div style={{ fontSize: 8, color: C.textLo, marginTop: 2, fontFamily: 'JetBrains Mono,monospace' }}>{a.desc}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Objectifs atteints */}
      <Panel>
        <PanelTitle title="🏅 Objectifs atteints ce mois" />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {OBJECTIVES.map((obj, i) => (
            <div
              key={i}
              style={{
                padding: '8px 12px',
                background: obj.achieved ? '#0d1f0f' : C.surface1,
                border: `0.5px solid ${obj.achieved ? C.green + '40' : C.line + '40'}`,
                borderRadius: 6,
                textAlign: 'center',
                cursor: obj.achieved ? 'pointer' : 'default',
                opacity: obj.achieved ? 1 : 0.5,
                minWidth: 80,
              }}
            >
              <div style={{ fontSize: 18 }}>{obj.icon}</div>
              <div style={{ fontSize: 8, color: obj.achieved ? C.green : C.textLo, fontWeight: 500, marginTop: 2, fontFamily: 'Inter,sans-serif' }}>{obj.label}</div>
              <div style={{ fontSize: 7, color: obj.achieved ? C.textLo : '#3a4885', fontFamily: 'JetBrains Mono,monospace' }}>{obj.val}</div>
            </div>
          ))}
        </div>
      </Panel>
    </>
  )
}
