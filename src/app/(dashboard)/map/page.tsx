'use client'

import { useState } from 'react'
import { C } from '@/lib/theme'

interface Dept {
  code: string
  name: string
  prospects: number
  contacted: number
  rdv: number
  avgScore: number
  density: 'high' | 'medium' | 'low'
}

const DEPARTMENTS: Dept[] = [
  { code: '75', name: 'Paris intra', prospects: 142, contacted: 87, rdv: 32, avgScore: 4.2, density: 'high' },
  { code: '92', name: 'Hauts-de-Seine', prospects: 89, contacted: 52, rdv: 21, avgScore: 3.8, density: 'high' },
  { code: '94', name: 'Val-de-Marne', prospects: 64, contacted: 31, rdv: 12, avgScore: 3.4, density: 'medium' },
  { code: '93', name: 'Seine-Saint-Denis', prospects: 52, contacted: 18, rdv: 7, avgScore: 2.6, density: 'low' },
  { code: '78', name: 'Yvelines', prospects: 94, contacted: 19, rdv: 7, avgScore: 3.1, density: 'medium' },
  { code: '77', name: 'Seine-et-Marne', prospects: 78, contacted: 14, rdv: 5, avgScore: 2.9, density: 'low' },
  { code: '91', name: 'Essonne', prospects: 62, contacted: 9, rdv: 3, avgScore: 2.7, density: 'low' },
  { code: '95', name: "Val-d'Oise", prospects: 30, contacted: 4, rdv: 1, avgScore: 2.3, density: 'low' },
]

const densityConfig = {
  high:   { border: '#ff6470', glow: '#ff647030', badge: '#ff647018', label: 'Dense',  pinColor: '#ff6470' },
  medium: { border: '#7a92e8', glow: '#7a92e828', badge: '#7a92e815', label: 'Moyen',  pinColor: '#7a92e8' },
  low:    { border: '#5a6ba8', glow: 'transparent', badge: '#5a6ba812', label: 'Faible', pinColor: '#8ea0d9' },
}

const MAP_PINS = [
  { score: 5, x: 48, y: 30 }, { score: 5, x: 35, y: 55 }, { score: 4, x: 62, y: 42 },
  { score: 4, x: 25, y: 38 }, { score: 3, x: 72, y: 60 }, { score: 5, x: 50, y: 65 },
  { score: 4, x: 40, y: 20 }, { score: 3, x: 80, y: 35 },
]

const pinColors: Record<number, string> = { 5: '#ff6470', 4: '#7a92e8', 3: '#8ea0d9' }
const pinLabels: Record<number, string> = { 5: 'Max (5★)', 4: 'Bon (4★)', 3: 'Standard (3★)' }

function Panel({ children, accent = C.indigo }: { children: React.ReactNode; accent?: string }) {
  return (
    <div style={{ background: `linear-gradient(180deg,${C.surface1},${C.bgMid})`, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${accent}88,transparent)` }} />
      {children}
    </div>
  )
}

function PanelTitle({ title, accent = C.indigo }: { title: string; accent?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
      <span style={{ width: 6, height: 6, background: accent, transform: 'rotate(45deg)', display: 'inline-block', boxShadow: `0 0 7px ${accent}`, flexShrink: 0 }} />
      <span style={{ fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 500, color: C.textHi, textTransform: 'uppercase', letterSpacing: '0.16em' }}>{title}</span>
    </div>
  )
}

export default function MapPage() {
  const [activeZone, setActiveZone] = useState<string | null>(null)

  const totals = {
    prospects: DEPARTMENTS.reduce((s, d) => s + d.prospects, 0),
    contacted: DEPARTMENTS.reduce((s, d) => s + d.contacted, 0),
    rdv: DEPARTMENTS.reduce((s, d) => s + d.rdv, 0),
    converted: 34,
  }

  const avgScore = (DEPARTMENTS.reduce((s, d) => s + d.avgScore, 0) / DEPARTMENTS.length).toFixed(1)

  return (
    <>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap')"}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div>
          <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 22, fontWeight: 600, color: C.textHi, letterSpacing: '0.06em' }}>CARTE TNS · ÎLE-DE-FRANCE</div>
          <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo, marginTop: 2 }}>347 prospects · Pins colorés par score patrimonial · Cliquez sur une zone</div>
        </div>
        <button style={{ fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 500, color: C.bgDeep, background: `linear-gradient(90deg,${C.cyan},${C.indigo})`, border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', letterSpacing: '0.1em' }}>
          IMPORT SIRET
        </button>
      </div>

      {/* Zone Stats — from HTML mrow */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
        {[
          { label: 'Paris intra', val: '142', sub: `★ ${(4.2).toFixed(1)} moy.`, accent: C.cyan },
          { label: 'Hauts-de-Seine', val: '89', sub: `★ ${(3.8).toFixed(1)} moy.`, accent: C.indigo },
          { label: 'Val-de-Marne', val: '64', sub: `★ ${(3.4).toFixed(1)} moy.`, accent: C.gold },
          { label: 'Autres zones', val: '52', sub: `★ ${(2.6).toFixed(1)} moy.`, accent: C.textMid },
        ].map(k => (
          <div key={k.label} style={{ background: `linear-gradient(180deg,${C.surface2},${C.surface1})`, border: `1px solid ${C.line}`, borderRadius: 10, padding: '12px 14px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: k.accent, opacity: 0.6 }} />
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{k.label}</div>
            <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 28, fontWeight: 600, color: C.textHi, lineHeight: 1, marginBottom: 3 }}>{k.val}</div>
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: k.accent }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Map box + Department tiles side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 12 }}>

        {/* Map Box */}
        <Panel accent={C.cyan}>
          <PanelTitle title="Carte des TNS — IDF" accent={C.cyan} />
          <div style={{ background: C.surface3, borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 220, position: 'relative', border: `1px solid ${C.line}`, overflow: 'hidden' }}>
            {/* Subtle grid bg */}
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `repeating-linear-gradient(0deg,${C.line}18 0,${C.line}18 1px,transparent 1px,transparent 28px),repeating-linear-gradient(90deg,${C.line}18 0,${C.line}18 1px,transparent 1px,transparent 28px)` }} />
            {/* Pins */}
            <div style={{ position: 'relative', width: '100%', height: 160 }}>
              {MAP_PINS.map((pin, i) => (
                <div key={i} style={{ position: 'absolute', left: `${pin.x}%`, top: `${pin.y}%`, transform: 'translate(-50%,-50%)' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50% 50% 50% 0', background: pinColors[pin.score], transform: 'rotate(-45deg)', boxShadow: `0 0 8px ${pinColors[pin.score]}80` }} />
                </div>
              ))}
            </div>
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, textAlign: 'center', marginTop: 6 }}>
              Carte Google Maps interactive<br />
              <span style={{ fontSize: 7, color: C.textVlo }}>Cliquez sur une zone pour voir les TNS disponibles</span>
            </div>
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 12, marginTop: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[5, 4, 3].map(score => (
              <div key={score} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50% 50% 50% 0', background: pinColors[score], transform: 'rotate(-45deg)' }} />
                <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textMid }}>{pinLabels[score]}</span>
              </div>
            ))}
          </div>
        </Panel>

        {/* Department grid */}
        <Panel accent={C.indigo}>
          <PanelTitle title="Départements IDF" accent={C.indigo} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
            {DEPARTMENTS.map(dept => {
              const ds = densityConfig[dept.density]
              const contactedPct = Math.round((dept.contacted / dept.prospects) * 100)
              const isActive = activeZone === dept.code
              return (
                <div
                  key={dept.code}
                  onClick={() => setActiveZone(isActive ? null : dept.code)}
                  style={{
                    background: isActive ? `linear-gradient(180deg,${C.surface3},${C.surface2})` : `linear-gradient(180deg,${C.surface2},${C.surface1})`,
                    border: `1px solid ${isActive ? ds.border : ds.border + '50'}`,
                    borderRadius: 10, padding: 12, position: 'relative', overflow: 'hidden',
                    boxShadow: isActive ? `0 0 16px ${ds.glow}` : `0 0 6px ${ds.glow}`,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  <div style={{ position: 'absolute', top: 6, right: 6, fontFamily: 'JetBrains Mono,monospace', fontSize: 7, color: ds.border, background: ds.badge, padding: '2px 5px', borderRadius: 4 }}>
                    {ds.label}
                  </div>
                  <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 26, fontWeight: 700, color: ds.border, lineHeight: 1, marginBottom: 1 }}>{dept.code}</div>
                  <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 9, color: C.textMid, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{dept.name}</div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7.5, color: C.textLo }}>Prospects</span>
                      <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7.5, color: C.textHi, fontWeight: 600 }}>{dept.prospects}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7.5, color: C.textLo }}>Contactés</span>
                      <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7.5, color: C.gold }}>{contactedPct}%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7.5, color: C.textLo }}>Moy. score</span>
                      <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7.5, color: ds.border }}>★ {dept.avgScore.toFixed(1)}</span>
                    </div>
                  </div>

                  <div style={{ height: 2, background: C.surface3, borderRadius: 2, overflow: 'hidden', marginTop: 7 }}>
                    <div style={{ height: '100%', width: `${contactedPct}%`, background: ds.border, borderRadius: 2 }} />
                  </div>

                  <button
                    onClick={e => { e.stopPropagation() }}
                    style={{ marginTop: 8, width: '100%', fontFamily: 'Oswald,sans-serif', fontSize: 8, color: ds.border, background: ds.badge, border: `1px solid ${ds.border}40`, borderRadius: 5, padding: '4px 0', cursor: 'pointer', letterSpacing: '0.1em' }}
                  >
                    LANCER PROSPECTION →
                  </button>
                </div>
              )
            })}
          </div>
        </Panel>
      </div>

      {/* Totals + funnel */}
      <Panel accent={C.gold}>
        <PanelTitle title="Entonnoir de Conversion · IDF Totaux" accent={C.gold} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
          {[
            { label: 'TNS Identifiés', val: totals.prospects, accent: C.indigo },
            { label: 'Contactés', val: totals.contacted, accent: C.gold },
            { label: 'RDV Obtenus', val: totals.rdv, accent: C.cyan },
            { label: 'Convertis', val: totals.converted, accent: C.green },
          ].map(k => (
            <div key={k.label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 28, fontWeight: 600, color: k.accent, lineHeight: 1 }}>{k.val}</div>
              <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, marginTop: 4, textTransform: 'uppercase' }}>{k.label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 0, height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
          <div style={{ flex: totals.prospects, background: C.indigo }} />
          <div style={{ flex: totals.contacted, background: C.gold }} />
          <div style={{ flex: totals.rdv, background: C.cyan }} />
          <div style={{ flex: totals.converted, background: C.green }} />
        </div>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            { label: 'Identifiés', val: totals.prospects, color: C.indigo },
            { label: 'Contactés', val: totals.contacted, color: C.gold },
            { label: 'RDV', val: totals.rdv, color: C.cyan },
            { label: 'Convertis', val: totals.converted, color: C.green },
          ].map(f => (
            <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: f.color }} />
              <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textMid }}>{f.label} <span style={{ color: C.textHi, fontWeight: 600 }}>{f.val}</span></span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginLeft: 8 }}>
            <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo }}>Score moy. IDF:</span>
            <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.gold, fontWeight: 600 }}>★ {avgScore}</span>
          </div>
        </div>
      </Panel>
    </>
  )
}
