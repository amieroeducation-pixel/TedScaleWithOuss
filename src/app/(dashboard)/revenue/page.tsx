'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'
import { C } from '@/lib/theme'

// --- DATA ---
const CA_MENSUEL = [
  { mois: 'Mai',  ca: 9800 },
  { mois: 'Juin', ca: 11200 },
  { mois: 'Juil', ca: 10400 },
  { mois: 'Août', ca: 8900 },
  { mois: 'Sep',  ca: 12300 },
  { mois: 'Oct',  ca: 13700 },
  { mois: 'Nov',  ca: 11200 },
  { mois: 'Déc',  ca: 14100 },
  { mois: 'Jan',  ca: 12800 },
  { mois: 'Fév',  ca: 15400 },
  { mois: 'Mar',  ca: 16400 },
  { mois: 'Avr',  ca: 18400 },
]

const COMMISSIONS = [
  { produit: 'Assurance vie', montant: 7800, pct: 42, width: 85, color: C.gold },
  { produit: 'PER / Retraite', montant: 5100, pct: 28, width: 55, color: C.indigo },
  { produit: 'Compte-titres', montant: 2600, pct: 14, width: 28, color: C.green },
  { produit: 'Contrat Capi.', montant: 1700, pct: 9, width: 18, color: '#9a4a8a' },
  { produit: 'Tontine', montant: 1200, pct: 7, width: 12, color: C.warn },
]

const COMMISSIONS_TRIMESTRE = [
  { trimestre: 'T1 2024', av: 6200, per: 3800, ct: 1900, capi: 1200, tontine: 800 },
  { trimestre: 'T2 2024', av: 7100, per: 4200, ct: 2100, capi: 1400, tontine: 950 },
  { trimestre: 'T3 2024', av: 6800, per: 4600, ct: 2400, capi: 1600, tontine: 1050 },
  { trimestre: 'T4 2024', av: 7400, per: 5000, ct: 2500, capi: 1650, tontine: 1100 },
  { trimestre: 'T1 2025', av: 7800, per: 5100, ct: 2600, capi: 1700, tontine: 1200 },
]

const CA_6MOIS = [
  { mois: 'Novembre', ca: 11200, width: 60 },
  { mois: 'Décembre', ca: 14100, width: 75 },
  { mois: 'Janvier',  ca: 12800, width: 68 },
  { mois: 'Février',  ca: 15400, width: 82 },
  { mois: 'Mars',     ca: 16400, width: 88 },
  { mois: 'Avril',    ca: 18400, width: 100, highlight: true },
]

// --- CUSTOM TOOLTIPS ---
function LineTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: C.surface2, border: `1px solid ${C.line}`,
      borderRadius: 8, padding: '10px 14px', fontSize: 12,
    }}>
      <div style={{ color: C.textMid, marginBottom: 4 }}>{label}</div>
      <div style={{ color: C.gold, fontWeight: 700, fontSize: 15 }}>
        {Number(payload[0].value).toLocaleString('fr-FR')} €
      </div>
    </div>
  )
}

function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: C.surface2, border: `1px solid ${C.line}`,
      borderRadius: 8, padding: '10px 14px', fontSize: 11,
    }}>
      <div style={{ color: C.textMid, marginBottom: 6 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.fill, marginBottom: 2 }}>
          {p.name}: {Number(p.value).toLocaleString('fr-FR')} €
        </div>
      ))}
    </div>
  )
}

// --- PAGE ---
export default function RevenuePage() {
  const totalCommissions = COMMISSIONS.reduce((s, c) => s + c.montant, 0)

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap')`}</style>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.textHi, fontFamily: 'Oswald, sans-serif', letterSpacing: 1, textTransform: 'uppercase' }}>
          💰 Revenue Intelligence
        </div>
        <div style={{ fontSize: 11, color: C.textLo, marginTop: 4 }}>
          Commissions, CA mensuel et performance par produit
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'CA Avril',       value: '18 400 €', sub: '↑ +12%',     subColor: C.green,  note: 'vs mars 16 400 €' },
          { label: 'CA Annualisé',   value: '187 200 €', sub: 'Projection', subColor: C.gold,   note: '12 mois' },
          { label: 'Commission moy.', value: '4 320 €',  sub: 'Par contrat', subColor: C.gold,  note: '+8% vs T4' },
          { label: 'Contrats actifs', value: '67',        sub: '↑ +5',       subColor: C.green,  note: 'Portefeuille' },
        ].map(m => (
          <div key={m.label} style={{
            background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 10, padding: '14px 16px',
          }}>
            <div style={{ fontSize: 10, color: C.textLo, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>{m.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.textHi, fontFamily: 'Oswald, sans-serif' }}>{m.value}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 11, color: C.textLo }}>{m.note}</span>
              <span style={{
                fontSize: 11, fontWeight: 600, color: m.subColor,
                background: m.subColor + '22', borderRadius: 4, padding: '1px 6px',
              }}>{m.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Row 2: Commissions + CA 6 mois (HTML-faithful bars) + Line chart */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 12, marginBottom: 20 }}>

        {/* Commissions par produit — HTML bar style */}
        <div style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textHi, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1 }}>
            📊 Commissions par produit
            <span style={{ float: 'right', color: C.gold, fontSize: 11, fontWeight: 600 }}>
              {totalCommissions.toLocaleString('fr-FR')} €
            </span>
          </div>
          {COMMISSIONS.map(c => (
            <div key={c.produit} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: C.text }}>{c.produit}</span>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 9, color: C.textLo }}>{c.pct}%</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: C.textHi }}>
                    {c.montant.toLocaleString('fr-FR')} €
                  </span>
                </div>
              </div>
              <div style={{ height: 20, background: C.surface3, borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
                <div style={{
                  width: `${c.width}%`, height: '100%',
                  background: c.color + '25', borderRadius: 3,
                  display: 'flex', alignItems: 'center', paddingLeft: 6,
                }}>
                  <span style={{ fontSize: 9, color: c.color, fontWeight: 600 }}>
                    {c.montant.toLocaleString('fr-FR')} €
                  </span>
                </div>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 12px', marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.line}` }}>
            {COMMISSIONS.map(c => (
              <div key={c.produit} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: c.color }} />
                <span style={{ fontSize: 9, color: C.textLo }}>{c.produit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CA 6 mois — HTML bar rows */}
        <div style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textHi, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1 }}>
            📈 Évolution CA — 6 mois
          </div>
          {CA_6MOIS.map(m => (
            <div key={m.mois} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 10, color: C.textMid }}>{m.mois}</span>
              </div>
              <div style={{ height: 20, background: C.surface3, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  width: `${m.width}%`, height: '100%',
                  background: m.highlight ? `${C.gold}45` : `${C.gold}18`,
                  borderRadius: 3, display: 'flex', alignItems: 'center', paddingLeft: 8,
                }}>
                  <span style={{ fontSize: 9, color: C.gold, fontWeight: m.highlight ? 600 : 400 }}>
                    {m.ca.toLocaleString('fr-FR')} €
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Line chart — 12 mois */}
        <div style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textHi, marginBottom: 14, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ textTransform: 'uppercase', letterSpacing: 1 }}>📈 Évolution CA — 12 mois</span>
            <span style={{ fontSize: 10, color: C.textLo, fontWeight: 400 }}>Mai 2024 → Avr 2025</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={CA_MENSUEL} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={C.lineSoft} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="mois" tick={{ fontSize: 10, fill: C.textLo }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 10, fill: C.textLo }} axisLine={false} tickLine={false}
                tickFormatter={v => `${(v / 1000).toFixed(0)}k`} width={32}
              />
              <Tooltip content={<LineTooltip />} />
              <Line
                type="monotone" dataKey="ca" stroke={C.gold} strokeWidth={2.5}
                dot={(props: any) => {
                  const isLast = props.index === CA_MENSUEL.length - 1
                  return (
                    <circle
                      key={props.key}
                      cx={props.cx} cy={props.cy}
                      r={isLast ? 6 : 3}
                      fill={C.gold}
                      stroke={isLast ? C.bgDeep : 'none'}
                      strokeWidth={isLast ? 2 : 0}
                    />
                  )
                }}
                activeDot={{ r: 6, fill: C.gold, stroke: C.bgDeep, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12,
            marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.line}`,
          }}>
            {[
              { label: 'Meilleur mois', value: 'Avr — 18 400 €', color: C.gold },
              { label: 'Croissance 12m', value: '+87.8%',          color: C.green },
              { label: 'Moyenne / mois', value: '13 225 €',        color: C.indigo },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: C.textLo, marginBottom: 3 }}>{s.label}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Stacked bar — commissions trimestrielles */}
      <div style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.textHi, marginBottom: 14, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ textTransform: 'uppercase', letterSpacing: 1 }}>📦 Commissions par produit — Évolution trimestrielle</span>
          <span style={{ fontSize: 10, color: C.textLo, fontWeight: 400 }}>T1 2024 → T1 2025</span>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={COMMISSIONS_TRIMESTRE} margin={{ top: 4, right: 16, left: 0, bottom: 0 }} barSize={32}>
            <CartesianGrid stroke={C.lineSoft} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="trimestre" tick={{ fontSize: 10, fill: C.textLo }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 10, fill: C.textLo }} axisLine={false} tickLine={false}
              tickFormatter={v => `${(v / 1000).toFixed(0)}k`} width={32}
            />
            <Tooltip content={<BarTooltip />} />
            <Bar dataKey="av"      name="Assurance vie"  stackId="a" fill={C.gold} />
            <Bar dataKey="per"     name="PER / Retraite" stackId="a" fill={C.indigo} />
            <Bar dataKey="ct"      name="Compte-titres"  stackId="a" fill={C.green} />
            <Bar dataKey="capi"    name="Contrat Capi."  stackId="a" fill="#9a4a8a" />
            <Bar dataKey="tontine" name="Tontine"         stackId="a" fill={C.warn} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', gap: 16, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.line}`, flexWrap: 'wrap' }}>
          {[
            { label: 'Assurance vie',  color: C.gold },
            { label: 'PER / Retraite', color: C.indigo },
            { label: 'Compte-titres',  color: C.green },
            { label: 'Contrat Capi.',  color: '#9a4a8a' },
            { label: 'Tontine',         color: C.warn },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
              <span style={{ fontSize: 10, color: C.textLo }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Row 4: Objectifs vs Réalisé */}
      <div style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 10, padding: '14px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.textHi, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1 }}>
          🎯 Objectifs vs Réalisé — 2025
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          {[
            { label: 'CA Annuel',       objectif: 220000, realise: 187200, fmt: (v: number) => v.toLocaleString('fr-FR') + ' €' },
            { label: 'Contrats signés', objectif: 90,     realise: 67,     fmt: (v: number) => String(v) },
            { label: 'Taux de closing', objectif: 35,     realise: 28,     fmt: (v: number) => v + '%' },
          ].map(obj => {
            const pct = Math.min(100, Math.round((obj.realise / obj.objectif) * 100))
            const barColor = pct >= 80 ? C.green : pct >= 50 ? C.gold : C.cyan
            return (
              <div key={obj.label} style={{
                background: C.surface2, borderRadius: 10, padding: '16px 18px', border: `1px solid ${C.line}`,
              }}>
                <div style={{ fontSize: 10, color: C.textLo, marginBottom: 8 }}>{obj.label}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 9, color: C.textVlo }}>Réalisé</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: C.textHi, fontFamily: 'Oswald, sans-serif' }}>{obj.fmt(obj.realise)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 9, color: C.textVlo }}>Objectif</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: C.textLo, fontFamily: 'Oswald, sans-serif' }}>{obj.fmt(obj.objectif)}</div>
                  </div>
                </div>
                <div style={{ height: 6, background: C.surface3, borderRadius: 3, marginBottom: 6 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 3 }} />
                </div>
                <div style={{ fontSize: 10, color: barColor, textAlign: 'right', fontWeight: 600 }}>{pct}% atteint</div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
