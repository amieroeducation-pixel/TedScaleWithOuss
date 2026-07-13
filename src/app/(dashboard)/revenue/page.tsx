'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import { LinkButton, LinkChip } from '@/lib/cross-links'

// --- TYPES ---
type MonthlyDataPoint = {
  month: string
  monthNum: number
  ca: number
  objectif: number
  current: boolean
}

type StatsResponse = {
  caCurrentMonth: number
  caYTD: number
  objectiveMonth: number
  contractCount: number
  clientCount: number
  commissionAvg: number
  monthlyData: MonthlyDataPoint[]
}

type ProductItem = {
  type: string
  label: string
  montant: number
  pct: number
  color: string
}

type ProductsResponse = {
  products: ProductItem[]
  total: number
}

// --- STATIC DATA (hors scope DATA-01/02/03) ---
const COMMISSIONS_TRIMESTRE = [
  { trimestre: 'T1 2024', av: 6200, per: 3800, ct: 1900, capi: 1200, tontine: 800 },
  { trimestre: 'T2 2024', av: 7100, per: 4200, ct: 2100, capi: 1400, tontine: 950 },
  { trimestre: 'T3 2024', av: 6800, per: 4600, ct: 2400, capi: 1600, tontine: 1050 },
  { trimestre: 'T4 2024', av: 7400, per: 5000, ct: 2500, capi: 1650, tontine: 1100 },
  { trimestre: 'T1 2025', av: 7800, per: 5100, ct: 2600, capi: 1700, tontine: 1200 },
]

// Noms longs pour le mois courant dynamique
const MONTH_LABELS_LONG = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
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
  const router = useRouter()
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [products, setProducts] = useState<ProductsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([
      fetch('/api/revenue/stats').then(r => r.json()),
      fetch('/api/revenue/products').then(r => r.json()),
    ])
      .then(([statsJson, productsJson]) => {
        if (cancelled) return
        if (statsJson.error) {
          setError(statsJson.error)
          return
        }
        if (productsJson.error) {
          setError(productsJson.error)
          return
        }
        setStats(statsJson.data)
        setProducts(productsJson.data)
      })
      .catch(e => {
        if (!cancelled) setError(e.message ?? 'Erreur réseau')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  if (loading) {
    return <div style={{ padding: 40, color: C.textLo, fontSize: 12 }}>Chargement…</div>
  }
  if (error || !stats || !products) {
    return <div style={{ padding: 40, color: C.warn, fontSize: 12 }}>Erreur : {error ?? 'Données non disponibles'}</div>
  }

  // Dérivations depuis les données API
  const currentMonthName = MONTH_LABELS_LONG[new Date().getMonth()]
  const totalCommissions = products.total

  // CA 6 derniers mois depuis monthlyData
  const last6 = stats.monthlyData.slice(-6)
  const max6 = Math.max(...last6.map(m => m.ca), 1)

  // Variation vs mois précédent
  const prevMonthIdx = new Date().getMonth() === 0 ? 11 : new Date().getMonth() - 1
  const lastMonthCa = stats.monthlyData[prevMonthIdx]?.ca ?? 0
  const pctVsLastMonth = lastMonthCa > 0
    ? Math.round(((stats.caCurrentMonth - lastMonthCa) / lastMonthCa) * 100)
    : null

  // Stats bandeau LineChart
  const monthsWithData = stats.monthlyData.filter(m => m.ca > 0).length || 1
  const bestMonth = stats.monthlyData.reduce(
    (best, m) => m.ca > best.ca ? m : best,
    stats.monthlyData[0]
  )
  const nonZero = stats.monthlyData.filter(m => m.ca > 0)
  const firstNonZero = nonZero[0]?.ca ?? 0
  const lastNonZero = nonZero[nonZero.length - 1]?.ca ?? 0
  const croissance12m = firstNonZero > 0
    ? Math.round(((lastNonZero - firstNonZero) / firstNonZero) * 100)
    : null
  const moyenneMois = Math.round(stats.caYTD / monthsWithData)

  // Calcul bornes du titre LineChart
  const now = new Date()
  const startYear = now.getFullYear()
  const startMonthLabel = MONTH_LABELS_LONG[0].slice(0, 3) // Jan
  const endMonthLabel = currentMonthName.slice(0, 3)

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap')`}</style>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.textHi, fontFamily: 'Oswald, sans-serif', letterSpacing: 1, textTransform: 'uppercase' }}>
          Revenue Intelligence
        </div>
        <div style={{ fontSize: 11, color: C.textLo, marginTop: 4 }}>
          Commissions, CA mensuel et performance par produit
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          <LinkChip href="/analytics" label="Taux conversion" color="green" />
          <LinkChip href="/clients" label="Clients" color="gold" />
          <LinkChip href="/pipeline" label="Pipeline" color="indigo" />
          <LinkChip href="/donnees" label="Données" color="cyan" />
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {/* CA mois courant */}
        <div
          onClick={() => router.push('/global')}
          style={{
            background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 10, padding: '14px 16px',
            cursor: 'pointer', transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = C.surface2
            e.currentTarget.style.borderColor = C.gold
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = C.surface1
            e.currentTarget.style.borderColor = C.line
          }}
        >
          <div style={{ fontSize: 10, color: C.textLo, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
            CA {currentMonthName} →
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.textHi, fontFamily: 'Oswald, sans-serif' }}>
            {stats.caCurrentMonth.toLocaleString('fr-FR')} €
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 11, color: C.textLo }}>vs mois préc.</span>
            {pctVsLastMonth !== null ? (
              <span style={{
                fontSize: 11, fontWeight: 600,
                color: pctVsLastMonth >= 0 ? C.green : C.warn,
                background: (pctVsLastMonth >= 0 ? C.green : C.warn) + '22',
                borderRadius: 4, padding: '1px 6px',
              }}>
                {pctVsLastMonth >= 0 ? '+' : ''}{pctVsLastMonth}%
              </span>
            ) : (
              <span style={{ fontSize: 11, color: C.textLo }}>—</span>
            )}
          </div>
        </div>

        {/* CA Annualisé (YTD) */}
        <div style={{
          background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 10, padding: '14px 16px',
        }}>
          <div style={{ fontSize: 10, color: C.textLo, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>CA Annualisé</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.textHi, fontFamily: 'Oswald, sans-serif' }}>
            {stats.caYTD.toLocaleString('fr-FR')} €
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 11, color: C.textLo }}>YTD {startYear}</span>
            <span style={{
              fontSize: 11, fontWeight: 600, color: C.gold,
              background: C.gold + '22', borderRadius: 4, padding: '1px 6px',
            }}>Cumulé</span>
          </div>
        </div>

        {/* Commission moyenne */}
        <div style={{
          background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 10, padding: '14px 16px',
        }}>
          <div style={{ fontSize: 10, color: C.textLo, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Commission moy.</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.textHi, fontFamily: 'Oswald, sans-serif' }}>
            {stats.commissionAvg > 0 ? `${stats.commissionAvg.toLocaleString('fr-FR')} €` : '—'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 11, color: C.textLo }}>Par contrat perçu</span>
          </div>
        </div>

        {/* Contrats */}
        <div
          onClick={() => router.push('/analytics')}
          style={{
            background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 10, padding: '14px 16px',
            cursor: 'pointer', transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = C.surface2
            e.currentTarget.style.borderColor = C.gold
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = C.surface1
            e.currentTarget.style.borderColor = C.line
          }}
        >
          <div style={{ fontSize: 10, color: C.textLo, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Contrats perçus →</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.textHi, fontFamily: 'Oswald, sans-serif' }}>
            {stats.contractCount}
          </div>
          <div
            onClick={() => router.push('/clients')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, cursor: 'pointer' }}
          >
            <span style={{ fontSize: 11, color: C.textLo, textDecoration: 'underline' }}>
              {stats.clientCount} clients →
            </span>
          </div>
        </div>
      </div>

      {/* Row 2: Commissions + CA 6 mois (HTML-faithful bars) + Line chart */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 12, marginBottom: 20 }}>

        {/* Commissions par produit — HTML bar style */}
        <div style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textHi, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1 }}>
            Commissions par produit
            <span style={{ float: 'right', color: C.gold, fontSize: 11, fontWeight: 600 }}>
              {totalCommissions.toLocaleString('fr-FR')} €
            </span>
          </div>
          {products.products.length === 0 ? (
            <div style={{ fontSize: 11, color: C.textLo, padding: '20px 0', textAlign: 'center' }}>
              Aucune commission perçue
            </div>
          ) : (
            <>
              {products.products.map(c => (
                <div
                  key={c.type}
                  style={{
                    marginBottom: 10,
                    padding: '4px 6px',
                    borderRadius: 6,
                    transition: 'background 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span
                      onClick={() => router.push(`/pipeline?product=${c.type}`)}
                      style={{ fontSize: 10, color: C.text, cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      {c.label} →
                    </span>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: 9, color: C.textLo }}>{c.pct}%</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: C.textHi }}>
                        {c.montant.toLocaleString('fr-FR')} €
                      </span>
                    </div>
                  </div>
                  <div style={{ height: 20, background: C.surface3, borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
                    <div style={{
                      width: `${Math.min(100, c.pct * 1.5)}%`, height: '100%',
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
                {products.products.map(c => (
                  <div key={c.type} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: c.color }} />
                    <span style={{ fontSize: 9, color: C.textLo }}>{c.label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* CA 6 mois — HTML bar rows */}
        <div style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textHi, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1 }}>
            Evolution CA — 6 mois
          </div>
          {last6.map(m => {
            const isLowCA = m.ca < (max6 * 0.4)
            return (
              <div key={m.monthNum} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span
                    onClick={() => isLowCA ? router.push('/analytics') : null}
                    style={{
                      fontSize: 10, color: C.textMid,
                      cursor: isLowCA ? 'pointer' : 'default',
                      textDecoration: isLowCA ? 'underline' : 'none'
                    }}
                  >
                    {MONTH_LABELS_LONG[m.monthNum - 1]}{isLowCA ? ' →' : ''}
                  </span>
                </div>
                <div style={{ height: 20, background: C.surface3, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.round((m.ca / max6) * 100)}%`, height: '100%',
                    background: m.current ? `${C.gold}45` : `${C.gold}18`,
                    borderRadius: 3, display: 'flex', alignItems: 'center', paddingLeft: 8,
                  }}>
                    <span style={{ fontSize: 9, color: C.gold, fontWeight: m.current ? 600 : 400 }}>
                      {m.ca > 0 ? m.ca.toLocaleString('fr-FR') + ' €' : '0 €'}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Line chart — 12 mois */}
        <div style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textHi, marginBottom: 14, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ textTransform: 'uppercase', letterSpacing: 1 }}>Evolution CA — 12 mois</span>
            <span style={{ fontSize: 10, color: C.textLo, fontWeight: 400 }}>
              Jan {startYear} → {endMonthLabel} {startYear}
            </span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={stats.monthlyData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={C.lineSoft} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: C.textLo }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 10, fill: C.textLo }} axisLine={false} tickLine={false}
                tickFormatter={v => `${(v / 1000).toFixed(0)}k`} width={32}
              />
              <Tooltip content={<LineTooltip />} />
              <Line
                type="monotone" dataKey="ca" stroke={C.gold} strokeWidth={2.5}
                dot={(props: any) => {
                  const isCurrent = stats.monthlyData[props.index]?.current
                  return (
                    <circle
                      key={props.key}
                      cx={props.cx} cy={props.cy}
                      r={isCurrent ? 6 : 3}
                      fill={C.gold}
                      stroke={isCurrent ? C.bgDeep : 'none'}
                      strokeWidth={isCurrent ? 2 : 0}
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
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: C.textLo, marginBottom: 3 }}>Meilleur mois</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.gold }}>
                {bestMonth.ca > 0 ? `${bestMonth.month} — ${bestMonth.ca.toLocaleString('fr-FR')} €` : '—'}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: C.textLo, marginBottom: 3 }}>Croissance 12m</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.green }}>
                {croissance12m !== null ? `${croissance12m >= 0 ? '+' : ''}${croissance12m}%` : '—'}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: C.textLo, marginBottom: 3 }}>Moyenne / mois</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.indigo }}>
                {moyenneMois > 0 ? `${moyenneMois.toLocaleString('fr-FR')} €` : '—'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Stacked bar — commissions trimestrielles (hors scope DATA-01/02/03) */}
      <div style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.textHi, marginBottom: 14, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ textTransform: 'uppercase', letterSpacing: 1 }}>Commissions par produit — Evolution trimestrielle</span>
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

      {/* Row 4: Objectifs vs Réalisé (hors scope) */}
      <div style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 10, padding: '14px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.textHi, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1 }}>
          Objectifs vs Réalisé — 2025
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
