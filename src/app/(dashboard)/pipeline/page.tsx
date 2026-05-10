'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { C } from '@/lib/theme'

// --- DATA ---
// HTML funnel data (authoritative)
const TUNNEL = [
  { label: 'Appels',           count: 142, pct: 100, color: C.textLo,  bg: C.surface3 },
  { label: 'RDV 1 planifié',  count: 88,  pct: 62,  color: C.indigo,  bg: C.surface2 },
  { label: 'RDV 1 honoré',    count: 77,  pct: 54,  color: '#7ab8e8', bg: C.surface2 },
  { label: 'RDV 2',           count: 58,  pct: 41,  color: C.gold,    bg: '#1a1600' },
  { label: 'RDV 3',           count: 34,  pct: 24,  color: '#9a7acc', bg: '#180d2e' },
  { label: 'Closing signé',   count: 48,  pct: 34,  color: C.green,   bg: '#0d1f0f' },
]

const CLOSING_PAR_PRODUIT = [
  { name: 'Assurance vie',  value: 38, color: C.gold },
  { name: 'PER / Retraite', value: 26, color: C.indigo },
  { name: 'Compte-titres',  value: 18, color: C.green },
  { name: 'Contrat Capi.',  value: 11, color: '#9a4a8a' },
  { name: 'Tontine',        value: 7,  color: C.warn },
]

const RDV_SEMAINE = [
  { jour: 'Lun', honores: 3, manques: 1 },
  { jour: 'Mar', honores: 2, manques: 0 },
  { jour: 'Mer', honores: 4, manques: 2 },
  { jour: 'Jeu', honores: 1, manques: 1 },
  { jour: 'Ven', honores: 3, manques: 0 },
]

const CONVERSION_HISTORIQUE = [
  { mois: 'Nov', taux: 19 },
  { mois: 'Déc', taux: 22 },
  { mois: 'Jan', taux: 18 },
  { mois: 'Fév', taux: 24 },
  { mois: 'Mar', taux: 26 },
  { mois: 'Avr', taux: 28 },
]

// --- TOOLTIP ---
function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: C.surface2, border: `1px solid ${C.line}`,
      borderRadius: 8, padding: '8px 12px', fontSize: 12,
    }}>
      <div style={{ color: payload[0].payload.color, fontWeight: 700 }}>{payload[0].name}</div>
      <div style={{ color: C.text }}>{payload[0].value}%</div>
    </div>
  )
}

// --- COMPONENTS ---
function StatBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 800, color, fontFamily: 'Oswald, sans-serif' }}>{value}</div>
      <div style={{ fontSize: 9, color: C.textLo, marginTop: 2 }}>{label}</div>
    </div>
  )
}

function RdvBar({ jour, honores, manques }: { jour: string; honores: number; manques: number }) {
  const total = honores + manques
  const maxH = 80
  const hH = Math.round((honores / 6) * maxH)
  const mH = Math.round((manques / 6) * maxH)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: maxH }}>
        <div style={{ width: 14, height: hH, background: C.green, borderRadius: '3px 3px 0 0' }} />
        {manques > 0 && (
          <div style={{ width: 14, height: mH, background: C.cyan, borderRadius: '3px 3px 0 0' }} />
        )}
      </div>
      <div style={{ fontSize: 10, color: C.textLo }}>{jour}</div>
      <div style={{ fontSize: 10, color: C.text, fontWeight: 600 }}>{total}</div>
    </div>
  )
}

// --- PAGE ---
export default function PipelinePage() {
  const rdvTotalHonores = RDV_SEMAINE.reduce((s, r) => s + r.honores, 0)
  const rdvTotalManques = RDV_SEMAINE.reduce((s, r) => s + r.manques, 0)
  const rdvTauxHonore = Math.round((rdvTotalHonores / (rdvTotalHonores + rdvTotalManques)) * 100)

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap')`}</style>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.textHi, fontFamily: 'Oswald, sans-serif', letterSpacing: 1, textTransform: 'uppercase' }}>
          🔄 Pipeline & Conversion
        </div>
        <div style={{ fontSize: 11, color: C.textLo, marginTop: 4 }}>
          Funnel de conversion, taux de closing et performance par étape
        </div>
      </div>

      {/* KPI row — from HTML */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Appels / mois',  value: '142',  sub: 'Top tunnel',       subColor: C.gold,   color: C.indigo },
          { label: 'Taux RDV 1',     value: '62%',  sub: '↑ +4pts',          subColor: C.green,  color: C.gold },
          { label: 'Taux closing',   value: '34%',  sub: '↓ -6pts',          subColor: C.cyan,   color: C.cyan },
          { label: 'Durée cycle',    value: '18j',  sub: 'Appel→Signing',    subColor: C.gold,   color: C.green },
        ].map(k => (
          <div key={k.label} style={{
            background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 10, padding: '14px 16px',
          }}>
            <div style={{ fontSize: 10, color: C.textLo, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: k.color, fontFamily: 'Oswald, sans-serif' }}>{k.value}</div>
            <div style={{ marginTop: 4 }}>
              <span style={{
                fontSize: 10, fontWeight: 600, color: k.subColor,
                background: k.subColor + '22', borderRadius: 4, padding: '1px 6px',
              }}>{k.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Row 2: HTML Tunnel + Pie closing */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 12, marginBottom: 20 }}>

        {/* Tunnel de conversion — HTML style */}
        <div style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textHi, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>
            🎯 Tunnel de conversion
            <span style={{ float: 'right', fontSize: 10, color: C.textLo, fontWeight: 400 }}>Avril 2025</span>
          </div>
          {TUNNEL.map((step, i) => (
            <div key={step.label} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <div style={{ fontSize: 10, color: C.textMid, width: 120, flexShrink: 0 }}>{step.label}</div>
                <div style={{ flex: 1, height: 24, background: C.surface3, borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                  <div style={{
                    width: `${step.pct}%`, height: '100%',
                    background: step.bg === C.surface3 ? C.surface3 : step.color + '25',
                    borderRadius: 4,
                    display: 'flex', alignItems: 'center', paddingLeft: 8,
                  }}>
                    <span style={{ fontSize: 11, color: step.color, fontWeight: 600 }}>{step.count}</span>
                  </div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: step.color, width: 36, textAlign: 'right' }}>
                  {step.pct}%
                </div>
              </div>
              {i < TUNNEL.length - 1 && (
                <div style={{ marginLeft: 130, height: 1, background: C.lineSoft }} />
              )}
            </div>
          ))}

          {/* Summary */}
          <div style={{
            marginTop: 16, padding: '12px 16px',
            background: C.surface2, borderRadius: 8, border: `1px solid ${C.line}`,
            display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12,
          }}>
            <StatBadge label="Taux Appel→RDV1" value="62%" color={C.indigo} />
            <StatBadge label="Taux RDV1→Closing" value="54%" color={C.gold} />
            <StatBadge label="Taux closing global" value="34%" color={C.green} />
          </div>
        </div>

        {/* Closing par produit — Pie */}
        <div style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textHi, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>
            🥧 Closing par produit
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={CLOSING_PAR_PRODUIT}
                cx="50%" cy="50%"
                innerRadius={52} outerRadius={82}
                paddingAngle={3}
                dataKey="value"
              >
                {CLOSING_PAR_PRODUIT.map(entry => (
                  <Cell key={entry.name} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {CLOSING_PAR_PRODUIT.map(p => (
              <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
                  <span style={{ fontSize: 10, color: C.text }}>{p.name}</span>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, color: p.color }}>{p.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: RDV honorés + Taux closing historique */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>

        {/* RDV semaine */}
        <div style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textHi, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>
            📅 RDV cette semaine
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 16 }}>
            {RDV_SEMAINE.map(r => <RdvBar key={r.jour} {...r} />)}
          </div>
          <div style={{ display: 'flex', gap: 16, padding: '12px 0', borderTop: `1px solid ${C.line}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, background: C.green, borderRadius: 2 }} />
              <span style={{ fontSize: 10, color: C.textLo }}>Honorés</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.green }}>{rdvTotalHonores}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, background: C.cyan, borderRadius: 2 }} />
              <span style={{ fontSize: 10, color: C.textLo }}>Manqués</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.cyan }}>{rdvTotalManques}</span>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <span style={{ fontSize: 10, color: C.textLo }}>Taux honoré </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: rdvTauxHonore >= 80 ? C.green : C.gold }}>
                {rdvTauxHonore}%
              </span>
            </div>
          </div>
        </div>

        {/* Taux closing historique */}
        <div style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textHi, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>
            📊 Évolution taux de closing — 6 mois
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120, padding: '0 8px' }}>
            {CONVERSION_HISTORIQUE.map((m, i) => {
              const isLast = i === CONVERSION_HISTORIQUE.length - 1
              const h = Math.round((m.taux / 35) * 100)
              return (
                <div key={m.mois} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ fontSize: 10, color: isLast ? C.gold : C.textLo, fontWeight: isLast ? 700 : 400 }}>
                    {m.taux}%
                  </div>
                  <div style={{
                    width: '100%', height: `${h}%`,
                    background: isLast ? C.gold : C.surface3,
                    borderRadius: '4px 4px 0 0',
                    border: `1px solid ${isLast ? C.gold : C.line}`,
                    minHeight: 8,
                  }} />
                  <div style={{ fontSize: 10, color: C.textLo }}>{m.mois}</div>
                </div>
              )
            })}
          </div>
          <div style={{
            marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12,
            paddingTop: 14, borderTop: `1px solid ${C.line}`,
          }}>
            {[
              { label: 'Objectif mensuel', value: '35%',     color: C.textLo },
              { label: 'Meilleur mois',    value: 'Avr 28%', color: C.green },
              { label: 'Progression 6m',   value: '+9pts',   color: C.gold },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: C.textLo, marginBottom: 3 }}>{s.label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
