'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { C } from '@/lib/theme'
import { LinkChip, buildHref } from '@/lib/cross-links'
import React from 'react'

type Period = 'jour' | 'semaine' | 'mois'
type MetricKey = 'appels' | 'prospects' | 'rdv' | 'blocs' | 'relances' | 'contrats' | 'ca'

interface DailyEntry {
  date: string
  appels: number
  prospects: number
  rdv_r1: number
  rdv_r2: number
  rdv_r3: number
  blocs: number
  relances: number
  contrats: number
  ca: number
}

interface MonthlyObjective {
  mois: string
  obj_appels: number
  real_appels: number
  obj_rdv: number
  real_rdv: number
  obj_ca: number
  real_ca: number
  obj_prospects: number
  real_prospects: number
  obj_contrats: number
  real_contrats: number
}

const METRICS: { key: MetricKey; label: string; color: string; unit?: string }[] = [
  { key: 'appels', label: 'Appels', color: C.gold },
  { key: 'prospects', label: 'Prospects contactés', color: C.green },
  { key: 'rdv', label: 'RDV pris', color: '#60a5fa' },
  { key: 'blocs', label: 'Blocs 52min', color: C.purple },
  { key: 'relances', label: 'Relances', color: C.cyan },
  { key: 'contrats', label: 'Contrats', color: '#f59e0b' },
  { key: 'ca', label: 'CA (€)', color: C.gold, unit: '€' },
]

function getMetricValue(entry: DailyEntry, key: MetricKey): number {
  if (key === 'rdv') return entry.rdv_r1 + entry.rdv_r2 + entry.rdv_r3
  return entry[key] as number
}

function groupByWeek(data: DailyEntry[]): { label: string; entries: DailyEntry[] }[] {
  const weeks: { label: string; entries: DailyEntry[] }[] = []
  let currentWeek: DailyEntry[] = []
  let weekStart = ''

  data.forEach((entry, i) => {
    const d = new Date(entry.date)
    if (d.getDay() === 1 || i === 0) {
      if (currentWeek.length > 0) {
        weeks.push({ label: `Sem. ${weekStart}`, entries: currentWeek })
      }
      currentWeek = [entry]
      weekStart = `${d.getDate()}/${d.getMonth() + 1}`
    } else {
      currentWeek.push(entry)
    }
  })
  if (currentWeek.length > 0) {
    weeks.push({ label: `Sem. ${weekStart}`, entries: currentWeek })
  }
  return weeks
}

function groupByMonth(data: DailyEntry[]): { label: string; entries: DailyEntry[] }[] {
  const months: Record<string, DailyEntry[]> = {}
  data.forEach(entry => {
    const m = entry.date.substring(0, 7)
    if (!months[m]) months[m] = []
    months[m].push(entry)
  })
  const MOIS = ['', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
  return Object.entries(months).map(([key, entries]) => ({
    label: MOIS[parseInt(key.split('-')[1])] + ' ' + key.split('-')[0],
    entries,
  }))
}

function KPICard({ value, label, color, onClick }: { value: string; label: string; color: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{ background: `linear-gradient(135deg, ${C.surface1}, ${C.bgMid})`, border: `1px solid ${C.line}`, borderRadius: 10, padding: '16px 12px', textAlign: 'center', cursor: onClick ? 'pointer' : 'default', transition: 'transform 0.2s, border-color 0.2s' }}>
      <div style={{ fontSize: 28, fontWeight: 700, color, fontFamily: 'Oswald,sans-serif' }}>{value}{onClick ? ' →' : ''}</div>
      <div style={{ fontSize: 10, color: C.textLo, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'JetBrains Mono,monospace' }}>{label}</div>
    </div>
  )
}

function MiniChart({ data, color, height = 60 }: { data: number[]; color: string; height?: number }) {
  if (data.length === 0) return null
  const max = Math.max(...data, 1)

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height, padding: '4px 0' }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, background: color, borderRadius: '3px 3px 0 0', height: `${(v / max) * 100}%`, minHeight: v > 0 ? 3 : 0, opacity: 0.8, transition: 'height 0.3s' }} />
      ))}
    </div>
  )
}

function ComparisonTable({ data, period, metrics }: { data: DailyEntry[]; period: Period; metrics: MetricKey[] }) {
  let grouped: { label: string; entries: DailyEntry[] }[]

  if (period === 'jour') {
    grouped = data.map(e => ({ label: new Date(e.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }), entries: [e] }))
  } else if (period === 'semaine') {
    grouped = groupByWeek(data)
  } else {
    grouped = groupByMonth(data)
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'JetBrains Mono,monospace' }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.line}` }}>
            <th style={{ padding: '8px 12px', textAlign: 'left', color: C.textLo, fontWeight: 500 }}>Période</th>
            {metrics.map(m => {
              const metric = METRICS.find(mt => mt.key === m)!
              return <th key={m} style={{ padding: '8px 12px', textAlign: 'right', color: metric.color, fontWeight: 500 }}>{metric.label}</th>
            })}
            <th style={{ padding: '8px 12px', textAlign: 'right', color: C.textLo, fontWeight: 500 }}>Évolution</th>
          </tr>
        </thead>
        <tbody>
          {grouped.map((group, i) => {
            const totals = metrics.map(m => group.entries.reduce((sum, e) => sum + getMetricValue(e, m), 0))
            const prevGroup = i > 0 ? grouped[i - 1] : null
            const prevTotals = prevGroup ? metrics.map(m => prevGroup.entries.reduce((sum, e) => sum + getMetricValue(e, m), 0)) : null

            return (
              <tr key={i} style={{ borderBottom: `1px solid ${C.lineSoft}` }}>
                <td style={{ padding: '10px 12px', color: C.textHi, fontWeight: 500 }}>{group.label}</td>
                {totals.map((total, j) => (
                  <td key={j} style={{ padding: '10px 12px', textAlign: 'right', color: C.text }}>
                    {metrics[j] === 'ca' ? total.toLocaleString('fr-FR') + '€' : total}
                  </td>
                ))}
                <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                  {prevTotals ? (() => {
                    const diff = totals[0] - prevTotals[0]
                    const pct = prevTotals[0] > 0 ? Math.round((diff / prevTotals[0]) * 100) : 0
                    return (
                      <span style={{ color: diff >= 0 ? C.green : C.cyan, fontWeight: 600 }}>
                        {diff >= 0 ? '↑' : '↓'} {Math.abs(pct)}%
                      </span>
                    )
                  })() : <span style={{ color: C.textVlo }}>—</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: `2px solid ${C.gold}` }}>
            <td style={{ padding: '10px 12px', color: C.gold, fontWeight: 700 }}>TOTAL</td>
            {metrics.map((m, j) => {
              const total = data.reduce((sum, e) => sum + getMetricValue(e, m), 0)
              return (
                <td key={j} style={{ padding: '10px 12px', textAlign: 'right', color: C.gold, fontWeight: 700 }}>
                  {m === 'ca' ? total.toLocaleString('fr-FR') + '€' : total}
                </td>
              )
            })}
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function ObjectivesPanel({ objectives }: { objectives: MonthlyObjective }) {
  const MOIS_LABELS = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
  const monthNum = parseInt(objectives.mois.split('-')[1])
  const monthLabel = MOIS_LABELS[monthNum] + ' ' + objectives.mois.split('-')[0]

  const bars: { label: string; obj: number; real: number; color: string; format?: (v: number) => string }[] = [
    { label: 'Appels', obj: objectives.obj_appels, real: objectives.real_appels, color: C.gold },
    { label: 'CA', obj: objectives.obj_ca, real: objectives.real_ca, color: '#60a5fa', format: (v) => v.toLocaleString('fr-FR') + '€' },
    { label: 'RDV', obj: objectives.obj_rdv, real: objectives.real_rdv, color: C.purple },
    { label: 'Prospects', obj: objectives.obj_prospects, real: objectives.real_prospects, color: C.green },
    { label: 'Contrats', obj: objectives.obj_contrats, real: objectives.real_contrats, color: '#f59e0b' },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
      {bars.map(({ label, obj, real, color, format }) => {
        const pct = obj > 0 ? Math.min((real / obj) * 100, 100) : 0
        const fmt = format ?? ((v: number) => String(v))
        return (
          <div key={label} style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 11, color, fontFamily: 'Oswald,sans-serif', letterSpacing: '0.08em', marginBottom: 12 }}>
              {label.toUpperCase()} — {monthLabel.toUpperCase()}
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.textMid, marginBottom: 4 }}>
                <span>Réalisé</span>
                <span>{fmt(real)} / {fmt(obj)}</span>
              </div>
              <div style={{ height: 10, background: C.surface2, borderRadius: 5, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? C.green : color, borderRadius: 5, transition: 'width 0.5s' }} />
              </div>
              <div style={{ fontSize: 9, color: pct >= 100 ? C.green : C.textLo, marginTop: 4, textAlign: 'right', fontFamily: 'JetBrains Mono,monospace' }}>
                {Math.round(pct)}%
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function formatMonthLabel(dateStr: string): string {
  const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
  const d = new Date(dateStr)
  return `${MOIS[d.getMonth()]} ${d.getFullYear()}`
}

type TabKey = 'historique' | 'performance'

export default function DonneesPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabKey>('historique')
  const [period, setPeriod] = useState<Period>('jour')
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>(['appels', 'prospects', 'rdv', 'ca'])
  const [data, setData] = useState<DailyEntry[]>([])
  const [objectives, setObjectives] = useState<MonthlyObjective | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [compareMode, setCompareMode] = useState(false)

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  })

  const navigateMonth = (direction: -1 | 1) => {
    const d = new Date(currentMonth)
    d.setMonth(d.getMonth() + direction)
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`)
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/donnees/stats?period=month&date=${currentMonth}`)
        if (!res.ok) throw new Error(`Erreur ${res.status}`)
        const json = await res.json()
        if (!json.success) throw new Error(json.error || 'Erreur inconnue')
        setData(json.data.daily ?? [])
        setObjectives(json.data.objectives ?? null)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Erreur de chargement')
        setData([])
        setObjectives(null)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [currentMonth])

  const totalAppels = data.reduce((s, e) => s + e.appels, 0)
  const totalProspects = data.reduce((s, e) => s + e.prospects, 0)
  const totalRDV = data.reduce((s, e) => s + e.rdv_r1 + e.rdv_r2 + e.rdv_r3, 0)
  const totalCA = data.reduce((s, e) => s + e.ca, 0)
  const totalContrats = data.reduce((s, e) => s + e.contrats, 0)
  const totalBlocs = data.reduce((s, e) => s + e.blocs, 0)
  const avgAppelsJour = data.length > 0 ? Math.round(totalAppels / data.length) : 0
  const tauxClosing = totalRDV > 0 ? Math.round((totalContrats / totalRDV) * 100) : 0

  const toggleMetric = (key: MetricKey) => {
    setSelectedMetrics(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  const midIndex = Math.floor(data.length / 2)
  const comparePeriod1Data = data.slice(0, midIndex)
  const comparePeriod2Data = data.slice(midIndex)

  return (
    <>
      <style>{'@import url(\'https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap\')'}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ width: 3, height: 22, background: C.ribbon, borderRadius: 2 }} />
            <h1 style={{ fontFamily: 'Oswald,sans-serif', fontSize: 20, fontWeight: 600, color: C.textHi, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Données & KPI
            </h1>
          </div>
          <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo, paddingLeft: 11 }}>
            Historique complet de ton activité — Compare par jour, semaine ou mois
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {activeTab === 'historique' && (
            <>
              <button
                onClick={() => setCompareMode(!compareMode)}
                style={{ fontSize: 10, padding: '7px 14px', borderRadius: 6, cursor: 'pointer', border: `1px solid ${compareMode ? C.gold : C.line}`, background: compareMode ? '#1a1400' : C.surface1, color: compareMode ? C.gold : C.textMid, fontFamily: 'Oswald,sans-serif', letterSpacing: '0.05em' }}
              >
                Comparer
              </button>
              <button
                style={{ fontSize: 10, padding: '7px 14px', borderRadius: 6, cursor: 'pointer', border: `1px solid ${C.green}`, background: '#0d1f0f', color: C.green, fontFamily: 'Oswald,sans-serif', letterSpacing: '0.05em' }}
              >
                Export Excel
              </button>
            </>
          )}
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: C.surface1, borderRadius: 8, padding: 4, border: `1px solid ${C.line}` }}>
        {([
          { key: 'historique' as TabKey, label: 'Historique & Détail' },
          { key: 'performance' as TabKey, label: 'Performance Avancée' },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{ flex: 1, padding: '10px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'Oswald,sans-serif', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', transition: 'all 0.2s', background: activeTab === tab.key ? C.gold : 'transparent', color: activeTab === tab.key ? C.bgDeep : C.textMid, fontWeight: activeTab === tab.key ? 700 : 400 }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Liens transversaux */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, justifyContent: 'center' }}>
        <LinkChip href="/global" label="Vue globale" color="cyan" />
        <LinkChip href="/revenue" label="CA & Revenue" color="gold" />
        <LinkChip href={buildHref('/today', { tab: 'prospection' })} label="Prospection jour" color="indigo" />
      </div>

      {/* ====== TAB: PERFORMANCE AVANCÉE ====== */}
      {activeTab === 'performance' && !loading && data.length > 0 && (
        <PerformanceTab data={data} objectives={objectives} currentMonth={currentMonth} />
      )}
      {activeTab === 'performance' && loading && (
        <div style={{ textAlign: 'center', padding: 40, color: C.textLo, fontFamily: 'JetBrains Mono,monospace', fontSize: 12 }}>
          Chargement des données...
        </div>
      )}
      {activeTab === 'performance' && !loading && data.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: C.textLo, fontFamily: 'JetBrains Mono,monospace', fontSize: 12 }}>
          Aucune donnée pour ce mois.
        </div>
      )}

      {/* ====== TAB: HISTORIQUE (original) ====== */}
      {activeTab === 'historique' && (<>

      {/* Month Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <button onClick={() => navigateMonth(-1)} style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${C.line}`, background: C.surface1, color: C.textMid, fontSize: 14, cursor: 'pointer' }}>&larr;</button>
        <span style={{ fontFamily: 'Oswald,sans-serif', fontSize: 16, color: C.textHi, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{formatMonthLabel(currentMonth)}</span>
        <button onClick={() => navigateMonth(1)} style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${C.line}`, background: C.surface1, color: C.textMid, fontSize: 14, cursor: 'pointer' }}>&rarr;</button>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40, color: C.textLo, fontFamily: 'JetBrains Mono,monospace', fontSize: 12 }}>Chargement des données...</div>}
      {error && <div style={{ textAlign: 'center', padding: 20, color: C.cyan, fontFamily: 'JetBrains Mono,monospace', fontSize: 11, background: C.surface1, border: `1px solid ${C.cyan}`, borderRadius: 8, marginBottom: 20 }}>{error}</div>}
      {!loading && !error && data.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: C.textLo, fontFamily: 'JetBrains Mono,monospace', fontSize: 12 }}>Aucune donnée pour ce mois. Commence à saisir tes KPIs quotidiens !</div>}

      {!loading && data.length > 0 && (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
            <KPICard value={totalAppels.toString()} label="Appels total" color={C.gold} onClick={() => router.push('/today')} />
            <KPICard value={totalProspects.toString()} label="Prospects contactés" color={C.green} onClick={() => router.push('/crm')} />
            <KPICard value={totalRDV.toString()} label="RDV pris" color="#60a5fa" onClick={() => router.push('/pipeline')} />
            <KPICard value={totalCA.toLocaleString('fr-FR') + '€'} label="CA généré" color={C.gold} onClick={() => router.push('/revenue')} />
            <KPICard value={totalContrats.toString()} label="Contrats signés" color="#f59e0b" onClick={() => router.push('/analytics')} />
            <KPICard value={avgAppelsJour.toString()} label="Moy. appels/jour" color={C.purple} />
            <KPICard value={totalBlocs.toString()} label="Blocs 52min" color={C.purple} />
            <KPICard value={tauxClosing + '%'} label="Taux closing" color={C.green} onClick={() => router.push('/analytics')} />
          </div>

          {/* Filtres période */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, color: C.textLo, fontFamily: 'JetBrains Mono,monospace' }}>Période :</span>
            {(['jour', 'semaine', 'mois'] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{ padding: '6px 14px', borderRadius: 6, border: `1px solid ${period === p ? C.gold : C.line}`, background: period === p ? '#1a1400' : C.surface1, color: period === p ? C.gold : C.textMid, fontSize: 10, cursor: 'pointer', fontFamily: 'Oswald,sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{p}</button>
            ))}
            <span style={{ margin: '0 8px', color: C.lineSoft }}>|</span>
            <span style={{ fontSize: 10, color: C.textLo, fontFamily: 'JetBrains Mono,monospace' }}>Métriques :</span>
            {METRICS.map(m => (
              <button key={m.key} onClick={() => toggleMetric(m.key)} style={{ padding: '4px 10px', borderRadius: 12, border: `1px solid ${selectedMetrics.includes(m.key) ? m.color : C.lineSoft}`, background: selectedMetrics.includes(m.key) ? m.color + '15' : 'transparent', color: selectedMetrics.includes(m.key) ? m.color : C.textVlo, fontSize: 9, cursor: 'pointer', fontFamily: 'JetBrains Mono,monospace' }}>{m.label}</button>
            ))}
          </div>

          {/* Graphiques mini-barres */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 24 }}>
            {selectedMetrics.map(key => {
              const metric = METRICS.find(m => m.key === key)!
              const values = data.map(e => getMetricValue(e, key))
              const total = values.reduce((s, v) => s + v, 0)
              const avg = values.length > 0 ? Math.round(total / values.length) : 0
              const max = Math.max(...values)
              return (
                <div key={key} style={{ background: `linear-gradient(135deg, ${C.surface1}, ${C.bgMid})`, border: `1px solid ${C.line}`, borderRadius: 10, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: metric.color, fontFamily: 'Oswald,sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{metric.label}</span>
                    <span style={{ fontSize: 10, color: C.textMid, fontFamily: 'JetBrains Mono,monospace' }}>Total: {key === 'ca' ? total.toLocaleString('fr-FR') + '€' : total} | Moy: {key === 'ca' ? avg.toLocaleString('fr-FR') + '€' : avg} | Max: {key === 'ca' ? max.toLocaleString('fr-FR') + '€' : max}</span>
                  </div>
                  <MiniChart data={values} color={metric.color} height={80} />
                </div>
              )
            })}
          </div>

          {/* Mode comparaison */}
          {compareMode && data.length > 1 && (
            <div style={{ background: C.surface1, border: `1px solid ${C.gold}`, borderRadius: 10, padding: 20, marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: C.gold, fontFamily: 'Oswald,sans-serif', letterSpacing: '0.08em', marginBottom: 12 }}>COMPARAISON DE PÉRIODES</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'start' }}>
                <div>
                  <div style={{ fontSize: 10, color: C.textLo, marginBottom: 6, fontFamily: 'JetBrains Mono,monospace' }}>1ère moitié ({comparePeriod1Data.length > 0 ? comparePeriod1Data[0].date.substring(5) : ''} — {comparePeriod1Data.length > 0 ? comparePeriod1Data[comparePeriod1Data.length - 1].date.substring(5) : ''})</div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {METRICS.map(m => {
                      const val = comparePeriod1Data.reduce((s, e) => s + getMetricValue(e, m.key), 0)
                      return <div key={m.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: C.surface2, borderRadius: 4 }}><span style={{ fontSize: 10, color: m.color }}>{m.label}</span><span style={{ fontSize: 10, color: C.textHi, fontWeight: 600 }}>{m.key === 'ca' ? val.toLocaleString('fr-FR') + '€' : val}</span></div>
                    })}
                  </div>
                </div>
                <div style={{ fontSize: 20, color: C.gold, fontWeight: 700, paddingTop: 40, fontFamily: 'Oswald,sans-serif' }}>VS</div>
                <div>
                  <div style={{ fontSize: 10, color: C.textLo, marginBottom: 6, fontFamily: 'JetBrains Mono,monospace' }}>2ème moitié ({comparePeriod2Data.length > 0 ? comparePeriod2Data[0].date.substring(5) : ''} — {comparePeriod2Data.length > 0 ? comparePeriod2Data[comparePeriod2Data.length - 1].date.substring(5) : ''})</div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {METRICS.map(m => {
                      const val2 = comparePeriod2Data.reduce((s, e) => s + getMetricValue(e, m.key), 0)
                      const val1 = comparePeriod1Data.reduce((s, e) => s + getMetricValue(e, m.key), 0)
                      const diff = val1 > 0 ? Math.round(((val2 - val1) / val1) * 100) : 0
                      return <div key={m.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: C.surface2, borderRadius: 4 }}><span style={{ fontSize: 10, color: m.color }}>{m.label}</span><span style={{ fontSize: 10, fontWeight: 600 }}><span style={{ color: C.textHi }}>{m.key === 'ca' ? val2.toLocaleString('fr-FR') + '€' : val2}</span> <span style={{ color: diff >= 0 ? C.green : C.cyan }}>({diff >= 0 ? '+' : ''}{diff}%)</span></span></div>
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tableau détaillé */}
          <div style={{ background: `linear-gradient(135deg, ${C.surface1}, ${C.bgMid})`, border: `1px solid ${C.line}`, borderRadius: 10, padding: 20, marginBottom: 24 }}>
            <div style={{ fontSize: 12, color: C.gold, fontFamily: 'Oswald,sans-serif', letterSpacing: '0.08em', marginBottom: 16 }}>TABLEAU DÉTAILLÉ — VUE PAR {period.toUpperCase()}</div>
            <ComparisonTable data={data} period={period} metrics={selectedMetrics} />
          </div>

          {/* Objectifs vs Réalisé */}
          {objectives && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: C.gold, fontFamily: 'Oswald,sans-serif', letterSpacing: '0.08em', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>OBJECTIFS VS RÉALISÉ — {formatMonthLabel(currentMonth).toUpperCase()}</span>
                <span onClick={() => router.push('/settings?tab=kpi')} style={{ fontSize: 10, color: C.textMid, cursor: 'pointer', letterSpacing: '0.05em' }}>Modifier objectifs →</span>
              </div>
              <ObjectivesPanel objectives={objectives} />
            </div>
          )}
        </>
      )}

      </>)}
    </>
  )
}

// =============================================
// PERFORMANCE TAB — Identique au dashboard HTML avec Chart.js
// =============================================
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, RadialLinearScale, ArcElement, Filler, Tooltip, Legend } from 'chart.js'
import { Bar, Line, Radar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, RadialLinearScale, ArcElement, Filler, Tooltip, Legend)

function ScoreRing({ score }: { score: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const color = score >= 75 ? C.green : score >= 60 ? C.gold : score >= 45 ? '#fbbf24' : C.cyan

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const cx = 80, cy = 80, r = 65
    const startAngle = -Math.PI / 2
    const endAngle = startAngle + (2 * Math.PI * score / 100)

    ctx.clearRect(0, 0, 160, 160)
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, 2 * Math.PI)
    ctx.strokeStyle = C.line
    ctx.lineWidth = 10
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(cx, cy, r, startAngle, endAngle)
    ctx.strokeStyle = color
    ctx.lineWidth = 10
    ctx.lineCap = 'round'
    ctx.stroke()
  }, [score, color])

  const verdict = score >= 90 ? 'Exceptionnel' : score >= 75 ? 'Excellent' : score >= 60 ? 'Solide' : score >= 45 ? 'En dessous' : 'Alerte'

  return (
    <div style={{ textAlign: 'center', marginBottom: 28 }}>
      <div style={{ position: 'relative', width: 160, height: 160, margin: '0 auto 12px' }}>
        <canvas ref={canvasRef} width={160} height={160} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: 42, fontWeight: 800, color, fontFamily: 'Oswald,sans-serif' }}>{score}</div>
      </div>
      <div style={{ fontSize: 13, color: C.textLo, textTransform: 'uppercase', letterSpacing: '1px' }}>Score de performance global</div>
      <div style={{ fontSize: 16, color, fontWeight: 600, marginTop: 4, fontFamily: 'Oswald,sans-serif' }}>{verdict}</div>
    </div>
  )
}

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: { legend: { display: false } },
  scales: {
    x: { ticks: { color: '#8888aa' }, grid: { color: '#1a1e3a' } },
    y: { ticks: { color: '#8888aa' }, grid: { color: '#1a1e3a' } }
  }
}

function PerformanceTab({ data, objectives, currentMonth }: { data: DailyEntry[]; objectives: MonthlyObjective | null; currentMonth: string }) {
  const totalAppels = data.reduce((s, e) => s + e.appels, 0)
  const totalProspects = data.reduce((s, e) => s + e.prospects, 0)
  const totalRDV = data.reduce((s, e) => s + e.rdv_r1 + e.rdv_r2 + e.rdv_r3, 0)
  const totalCA = data.reduce((s, e) => s + e.ca, 0)
  const totalContrats = data.reduce((s, e) => s + e.contrats, 0)
  const totalBlocs = data.reduce((s, e) => s + e.blocs, 0)
  const totalRelances = data.reduce((s, e) => s + e.relances, 0)
  const joursPasses = data.length
  const joursOuvres = 22
  void totalRelances

  const obj = objectives ? {
    appels: objectives.obj_appels, ca: objectives.obj_ca, rdv: objectives.obj_rdv,
    prospects: objectives.obj_prospects, contrats: objectives.obj_contrats, blocs: Math.round(objectives.obj_appels * 0.2)
  } : { appels: 400, ca: 10000, rdv: 20, prospects: 100, contrats: 5, blocs: 90 }

  // Weekly aggregation
  const weeks: { label: string; entries: DailyEntry[]; days: string[] }[] = []
  let currentWeek: DailyEntry[] = []
  let weekStart = ''
  data.forEach((entry, i) => {
    const d = new Date(entry.date)
    if (d.getDay() === 1 || i === 0) {
      if (currentWeek.length > 0) weeks.push({ label: `S${weeks.length + 1} (${weekStart})`, entries: currentWeek, days: currentWeek.map(e => new Date(e.date).toLocaleDateString('fr-FR', { weekday: 'short' })) })
      currentWeek = [entry]
      weekStart = `${d.getDate()}/${d.getMonth() + 1}`
    } else {
      currentWeek.push(entry)
    }
  })
  if (currentWeek.length > 0) weeks.push({ label: `S${weeks.length + 1} (${weekStart})`, entries: currentWeek, days: currentWeek.map(e => new Date(e.date).toLocaleDateString('fr-FR', { weekday: 'short' })) })

  const weeklyData = weeks.map(w => ({
    label: w.label,
    appels: w.entries.reduce((s, e) => s + e.appels, 0),
    prospects: w.entries.reduce((s, e) => s + e.prospects, 0),
    rdv: w.entries.reduce((s, e) => s + e.rdv_r1 + e.rdv_r2 + e.rdv_r3, 0),
    ca: w.entries.reduce((s, e) => s + e.ca, 0),
    contrats: w.entries.reduce((s, e) => s + e.contrats, 0),
    blocs: w.entries.reduce((s, e) => s + e.blocs, 0),
  }))

  function calcScore(wd: typeof weeklyData[0]) {
    const numWeeks = weeks.length || 1
    const weekTarget = { appels: obj.appels / numWeeks, prospects: obj.prospects / numWeeks, rdv: obj.rdv / numWeeks, ca: obj.ca / numWeeks, blocs: obj.blocs / numWeeks }
    const a = Math.min(100, wd.appels / (weekTarget.appels || 1) * 100)
    const p = Math.min(100, wd.prospects / (weekTarget.prospects || 1) * 100)
    const r = Math.min(100, wd.rdv / (weekTarget.rdv || 1) * 100)
    const c = Math.min(100, wd.ca / (weekTarget.ca || 1) * 100)
    const b = Math.min(100, wd.blocs / (weekTarget.blocs || 1) * 100)
    return Math.min(100, Math.round(a * 0.15 + p * 0.2 + r * 0.25 + c * 0.25 + b * 0.15))
  }

  const weekScores = weeklyData.map(w => calcScore(w))
  const globalScore = weekScores.length > 0 ? Math.round(weekScores.reduce((s, v) => s + v, 0) / weekScores.length) : 0

  // Projection
  const rythmeCA = joursPasses > 0 ? totalCA / joursPasses : 0
  const projCA = Math.round(rythmeCA * joursOuvres)
  const pctObj = obj.ca > 0 ? Math.round(projCA / obj.ca * 100) : 0

  // Pacing
  const expectedPct = joursPasses / joursOuvres
  const pacingItems = [
    { label: 'Appels', actual: totalAppels, target: obj.appels, color: C.gold },
    { label: 'CA', actual: totalCA, target: obj.ca, color: C.green, fmt: (v: number) => v.toLocaleString('fr-FR') + '€' },
    { label: 'RDV', actual: totalRDV, target: obj.rdv, color: '#60a5fa' },
    { label: 'Contrats', actual: totalContrats, target: obj.contrats, color: C.purple },
    { label: 'Prospects', actual: totalProspects, target: obj.prospects, color: C.gold },
  ]

  // Insights
  const insights: { text: string; type: 'positive' | 'negative' | 'neutral' }[] = []
  if (totalCA / obj.ca > expectedPct * 1.1) insights.push({ text: `CA en avance de +${Math.round((totalCA / obj.ca / expectedPct - 1) * 100)}% sur le rythme attendu`, type: 'positive' })
  else if (obj.ca > 0 && totalCA / obj.ca < expectedPct * 0.85) insights.push({ text: `CA en retard de ${Math.round((1 - totalCA / obj.ca / expectedPct) * 100)}% — il faut accélérer`, type: 'negative' })
  if (totalRDV > 0 && totalContrats / totalRDV >= 0.4) insights.push({ text: `Taux closing RDV→Contrat : ${Math.round(totalContrats / totalRDV * 100)}% — excellent`, type: 'positive' })
  if (totalAppels > 0) insights.push({ text: `Chaque appel rapporte en moyenne ${Math.round(totalCA / totalAppels)}€`, type: 'neutral' })
  if (joursPasses > 0 && totalBlocs / joursPasses >= 4) insights.push({ text: `Discipline blocs : ${(totalBlocs / joursPasses).toFixed(1)} blocs/jour — régulier`, type: 'positive' })
  if (weekScores.length >= 3) {
    const trend = weekScores[weekScores.length - 1] - weekScores[0]
    if (trend > 10) insights.push({ text: `Tendance haussière : +${trend} pts de score sur le mois`, type: 'positive' })
    else if (trend < -10) insights.push({ text: `Tendance baissière : ${trend} pts — attention`, type: 'negative' })
  }
  const projContrats = Math.round(totalContrats / joursPasses * joursOuvres)
  if (projContrats < obj.contrats) insights.push({ text: `Il manque ~${obj.contrats - projContrats} contrat(s) pour l'objectif au rythme actuel`, type: 'negative' })

  // Efficiency
  const efficiencyData = [
    { value: totalAppels > 0 ? Math.round(totalCA / totalAppels) + '€' : '—', label: 'CA / Appel', context: 'Revenu moyen par appel' },
    { value: totalRDV > 0 ? Math.round(totalCA / totalRDV) + '€' : '—', label: 'CA / RDV', context: 'Revenu par rendez-vous' },
    { value: totalBlocs > 0 ? Math.round(totalCA / totalBlocs) + '€' : '—', label: 'CA / Bloc', context: 'Rendement par bloc 52min' },
    { value: totalAppels > 0 ? Math.round(totalProspects / totalAppels * 100) + '%' : '—', label: 'Taux contact', context: 'Prospects/Appels' },
    { value: totalProspects > 0 ? Math.round(totalRDV / totalProspects * 100) + '%' : '—', label: 'Prospect → RDV', context: 'Conversion 1er filtre' },
    { value: totalRDV > 0 ? Math.round(totalContrats / totalRDV * 100) + '%' : '—', label: 'RDV → Contrat', context: 'Taux closing final' },
    { value: joursPasses > 0 ? (totalAppels / joursPasses).toFixed(1) : '—', label: 'Appels / Jour', context: `Objectif : ${Math.round(obj.appels / joursOuvres)}/j` },
    { value: totalContrats > 0 ? Math.round(totalCA / totalContrats).toLocaleString('fr-FR') + '€' : '—', label: 'CA / Contrat', context: 'Panier moyen' },
  ]

  // Funnel
  const rdvHonores = Math.round(totalRDV * 0.85)
  const convAP = totalAppels > 0 ? Math.round(totalProspects / totalAppels * 100) : 0
  const convPR = totalProspects > 0 ? Math.round(totalRDV / totalProspects * 100) : 0
  const convRH = totalRDV > 0 ? Math.round(rdvHonores / totalRDV * 100) : 0
  const convHC = rdvHonores > 0 ? Math.round(totalContrats / rdvHonores * 100) : 0

  // Heatmap: week x day
  const JOURS_SEMAINE = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven']
  const heatmapMatrix = weeks.map(w => {
    const row: Record<string, number | null> = {}
    JOURS_SEMAINE.forEach(d => { row[d] = null })
    w.entries.forEach(e => {
      const dayIdx = new Date(e.date).getDay()
      const dayName = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][dayIdx]
      if (JOURS_SEMAINE.includes(dayName)) row[dayName] = e.appels
    })
    return row
  })
  const allHeatVals = data.map(e => e.appels).filter(v => v > 0)
  const heatMin = allHeatVals.length > 0 ? Math.min(...allHeatVals) : 0
  const heatMax = allHeatVals.length > 0 ? Math.max(...allHeatVals) : 1

  function heatColor(val: number | null): string {
    if (val === null) return 'transparent'
    const pct = heatMax > heatMin ? (val - heatMin) / (heatMax - heatMin) : 0.5
    if (pct >= 0.8) return 'rgba(74,222,128,0.8)'
    if (pct >= 0.6) return 'rgba(74,222,128,0.5)'
    if (pct >= 0.4) return 'rgba(232,200,120,0.5)'
    if (pct >= 0.2) return 'rgba(232,200,120,0.3)'
    return 'rgba(255,100,112,0.4)'
  }

  // Radar data
  const radarAxes = [
    { label: 'Volume', pct: Math.min(100, Math.round(totalAppels / obj.appels * 100)) },
    { label: 'Conversion', pct: Math.min(100, Math.round(totalRDV / obj.rdv * 100)) },
    { label: 'Revenue', pct: Math.min(100, Math.round(totalCA / obj.ca * 100)) },
    { label: 'Closing', pct: Math.min(100, Math.round(totalContrats / obj.contrats * 100)) },
    { label: 'Discipline', pct: Math.min(100, Math.round(totalBlocs / obj.blocs * 100)) },
  ]

  // Daily charts data
  const dailyAppels = data.map(e => e.appels)
  const dailyCA = data.map(e => e.ca)
  const cumulativeCA = data.reduce<number[]>((acc, e) => { acc.push((acc.length > 0 ? acc[acc.length - 1] : 0) + e.ca); return acc }, [])
  const projLine = data.map((_, i) => Math.round(obj.ca / joursOuvres * (i + 1)))
  const movingAvg5 = dailyAppels.map((_, i) => {
    const start = Math.max(0, i - 4)
    const slice = dailyAppels.slice(start, i + 1)
    return Math.round(slice.reduce((s, v) => s + v, 0) / slice.length)
  })

  // Compare state
  const [perfCompareActive, setPerfCompareActive] = useState(false)
  const [perfCompareA, setPerfCompareA] = useState(0)
  const [perfCompareB, setPerfCompareB] = useState(Math.min(1, weeklyData.length - 1))

  // Drill-down state
  const [drillWeek, setDrillWeek] = useState<number | null>(null)

  // Date labels
  const dateLabels = data.map(e => { const d = new Date(e.date); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}` })

  return (
    <>
      {/* SCORE RING */}
      <ScoreRing score={globalScore} />

      {/* PROJECTION BANNER */}
      <div style={{ background: projCA >= obj.ca ? 'rgba(74,222,128,0.06)' : 'rgba(255,100,112,0.06)', border: `1px solid ${projCA >= obj.ca ? 'rgba(74,222,128,0.2)' : 'rgba(255,100,112,0.2)'}`, borderRadius: 10, padding: '14px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 22 }}>📈</span>
        <span style={{ flex: 1, fontSize: 12, color: C.text, fontFamily: 'JetBrains Mono,monospace' }}>
          Au rythme actuel ({Math.round(rythmeCA).toLocaleString('fr-FR')}€/jour), projection fin de mois : <strong style={{ color: C.textHi }}>{projCA.toLocaleString('fr-FR')}€</strong> — {pctObj}% de l{"'"}objectif
        </span>
        <span style={{ fontSize: 18, fontWeight: 700, color: projCA >= obj.ca ? C.green : C.cyan, fontFamily: 'Oswald,sans-serif' }}>{projCA >= obj.ca ? '▲' : '▼'} {projCA.toLocaleString('fr-FR')}€</span>
      </div>

      {/* PACING BARS */}
      <div style={{ background: `linear-gradient(135deg, ${C.surface1}, ${C.bgMid})`, border: `1px solid ${C.line}`, borderRadius: 12, padding: '16px 24px', marginBottom: 24, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {pacingItems.map(p => {
          const pct = p.target > 0 ? Math.min(100, Math.round(p.actual / p.target * 100)) : 0
          const ahead = pct / 100 >= expectedPct
          const fmt = p.fmt ?? ((v: number) => String(v))
          return (
            <div key={p.label} style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 11, color: C.textLo, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>{p.label} — {pct}%</div>
              <div style={{ height: 8, background: C.surface2, borderRadius: 6, position: 'relative', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: ahead ? p.color : C.cyan, borderRadius: 6, transition: 'width 0.6s' }} />
                <div style={{ position: 'absolute', top: -2, left: `${Math.round(expectedPct * 100)}%`, width: 2, height: 12, background: '#fff', borderRadius: 1, opacity: 0.7 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11 }}>
                <span style={{ color: C.gold, fontWeight: 700 }}>{fmt(p.actual)}</span>
                <span style={{ color: C.textLo }}>/ {fmt(p.target)}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* INSIGHTS */}
      {insights.length > 0 && (
        <div style={{ background: `linear-gradient(135deg, ${C.surface1}, ${C.bgMid})`, border: `1px solid ${C.line}`, borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
          <div style={{ fontSize: 14, color: C.gold, marginBottom: 12, fontWeight: 600 }}>💡 Insights automatiques</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 8 }}>
            {insights.map((ins, i) => (
              <div key={i} style={{ fontSize: 13, color: C.text, padding: '8px 12px', background: 'rgba(232,200,120,0.04)', borderRadius: 6, borderLeft: `3px solid ${ins.type === 'positive' ? C.green : ins.type === 'negative' ? C.cyan : '#60a5fa'}` }}>{ins.text}</div>
            ))}
          </div>
        </div>
      )}

      {/* COMPARE MODE */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: C.textLo, fontSize: 13 }}>Mode comparé</span>
          <div onClick={() => setPerfCompareActive(!perfCompareActive)} style={{ width: 44, height: 24, background: perfCompareActive ? C.gold : C.surface2, borderRadius: 12, cursor: 'pointer', position: 'relative', transition: 'background 0.3s' }}>
            <div style={{ position: 'absolute', top: 3, left: perfCompareActive ? 23 : 3, width: 18, height: 18, background: '#fff', borderRadius: '50%', transition: 'left 0.3s' }} />
          </div>
        </div>
        {perfCompareActive && weeklyData.length >= 2 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <select value={perfCompareA} onChange={e => setPerfCompareA(Number(e.target.value))} style={{ background: C.surface1, border: `1px solid ${C.line}`, color: C.text, padding: '6px 10px', borderRadius: 6, fontSize: 12 }}>
              {weeklyData.map((w, i) => <option key={i} value={i}>{w.label}</option>)}
            </select>
            <span style={{ color: C.textLo, fontSize: 12 }}>vs</span>
            <select value={perfCompareB} onChange={e => setPerfCompareB(Number(e.target.value))} style={{ background: C.surface1, border: `1px solid ${C.line}`, color: C.text, padding: '6px 10px', borderRadius: 6, fontSize: 12 }}>
              {weeklyData.map((w, i) => <option key={i} value={i}>{w.label}</option>)}
            </select>
          </div>
        )}
      </div>

      {perfCompareActive && weeklyData.length >= 2 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
          {(['appels', 'prospects', 'rdv', 'ca', 'contrats', 'blocs'] as const).map(key => {
            const a = weeklyData[perfCompareA]?.[key] ?? 0
            const b = weeklyData[perfCompareB]?.[key] ?? 0
            const diff = a - b
            const pct = b === 0 ? (a > 0 ? 100 : 0) : Math.round(diff / b * 100)
            const fmtA = key === 'ca' ? a.toLocaleString('fr-FR') + '€' : a
            const fmtB = key === 'ca' ? b.toLocaleString('fr-FR') + '€' : b
            const absDiff = key === 'ca' ? (diff >= 0 ? '+' : '') + diff.toLocaleString('fr-FR') + '€' : (diff >= 0 ? '+' : '') + diff
            return (
              <div key={key} style={{ background: `linear-gradient(135deg, ${C.surface1}, ${C.bgMid})`, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: C.textLo, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>{key}</div>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 20, fontWeight: 700, color: C.gold, fontFamily: 'Oswald,sans-serif' }}>{fmtA}</span>
                  <span style={{ fontSize: 12, color: C.textLo }}>vs</span>
                  <span style={{ fontSize: 16, color: C.textMid }}>{fmtB}</span>
                </div>
                <div style={{ marginTop: 4, fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 4, display: 'inline-block', background: pct > 0 ? 'rgba(74,222,128,0.15)' : pct < 0 ? 'rgba(255,100,112,0.15)' : 'rgba(136,136,170,0.15)', color: pct > 0 ? C.green : pct < 0 ? C.cyan : C.textLo }}>
                  {pct > 0 ? `▲ +${pct}%` : pct < 0 ? `▼ ${pct}%` : '= 0%'} ({absDiff})
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* KPI CARDS WITH SPARKLINES */}
      <div style={{ fontSize: 14, color: C.gold, marginBottom: 12, fontWeight: 600 }}>📊 KPI du mois</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        {(() => {
          const kpiCards = [
            { key: 'appels', label: 'Appels ce mois', value: totalAppels, weeklyVals: weeklyData.map(w => w.appels), color: C.gold },
            { key: 'rdv', label: 'RDV pris', value: totalRDV, weeklyVals: weeklyData.map(w => w.rdv), color: C.green },
            { key: 'ca', label: 'CA Généré', value: totalCA, weeklyVals: weeklyData.map(w => w.ca), color: '#60a5fa', isCa: true },
            { key: 'contrats', label: 'Contrats signés', value: totalContrats, weeklyVals: weeklyData.map(w => w.contrats), color: C.purple },
            { key: 'prospects', label: 'Prospects contactés', value: totalProspects, weeklyVals: weeklyData.map(w => w.prospects), color: C.gold },
            { key: 'closing', label: 'Taux closing', value: totalRDV > 0 ? Math.round(totalContrats / totalRDV * 100) : 0, weeklyVals: weeklyData.map(w => w.rdv > 0 ? Math.round(w.contrats / w.rdv * 100) : 0), color: C.green, unit: '%' },
          ]
          return kpiCards.map(kpi => {
            const curr = kpi.weeklyVals.length > 0 ? kpi.weeklyVals[kpi.weeklyVals.length - 1] : 0
            const prev = kpi.weeklyVals.length > 1 ? kpi.weeklyVals[kpi.weeklyVals.length - 2] : 0
            const diff = curr - prev
            const pct = prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(diff / prev * 100)
            const prevAvg = kpi.weeklyVals.length > 1 ? kpi.weeklyVals.slice(0, -1).reduce((s, v) => s + v, 0) / (kpi.weeklyVals.length - 1) : 0
            const alertDrop = prevAvg > 0 && curr < prevAvg * 0.8
            return (
              <div key={kpi.key} style={{ background: `linear-gradient(135deg, ${C.surface1}, ${C.bgMid})`, border: `1px solid ${C.line}`, borderRadius: 12, padding: 20, textAlign: 'center', position: 'relative', transition: 'transform 0.2s, box-shadow 0.2s' }}>
                {alertDrop && (
                  <div style={{ position: 'absolute', top: 8, right: 8, background: '#f87171', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>
                    ⚠️ {Math.round((1 - curr / prevAvg) * 100)}%
                  </div>
                )}
                <div style={{ fontSize: 32, fontWeight: 700, color: kpi.color, fontFamily: 'Oswald,sans-serif' }}>
                  {kpi.isCa ? kpi.value.toLocaleString('fr-FR') + '€' : kpi.value}{kpi.unit || ''}
                </div>
                <div style={{ fontSize: 11, color: C.textLo, marginTop: 4, textTransform: 'uppercase', letterSpacing: '1px' }}>{kpi.label}</div>
                <div style={{ height: 30, marginTop: 8 }}>
                  {kpi.weeklyVals.length > 1 && (
                    <Line data={{ labels: kpi.weeklyVals.map((_, i) => `S${i + 1}`), datasets: [{ data: kpi.weeklyVals, borderColor: kpi.color, borderWidth: 2, pointRadius: 0, fill: false, tension: 0.4 }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } } } as never} />
                  )}
                </div>
                {kpi.weeklyVals.length > 1 && (
                  <div style={{ marginTop: 4 }}>
                    <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: pct > 0 ? 'rgba(74,222,128,0.15)' : pct < 0 ? 'rgba(248,113,113,0.15)' : 'rgba(136,136,170,0.15)', color: pct > 0 ? C.green : pct < 0 ? '#f87171' : C.textLo }} title="vs semaine précédente">
                      {pct > 0 ? `▲ +${pct}%` : pct < 0 ? `▼ ${pct}%` : '= 0%'}
                    </span>
                  </div>
                )}
              </div>
            )
          })
        })()}
      </div>

      {/* EFFICIENCY RATIOS */}
      <div style={{ fontSize: 14, color: C.gold, marginBottom: 12, fontWeight: 600 }}>⚡ Ratios d{"'"}efficience</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 32 }}>
        {efficiencyData.map((e, i) => (
          <div key={i} style={{ background: `linear-gradient(135deg, ${C.surface1}, ${C.bgMid})`, border: `1px solid ${C.line}`, borderRadius: 10, padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#60a5fa', fontFamily: 'Oswald,sans-serif' }}>{e.value}</div>
            <div style={{ fontSize: 10, color: C.textLo, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 4 }}>{e.label}</div>
            <div style={{ fontSize: 10, color: C.textVlo, marginTop: 2 }}>{e.context}</div>
          </div>
        ))}
      </div>

      {/* RADAR + SCORE EVOLUTION — Chart.js */}
      <div style={{ fontSize: 14, color: C.gold, marginBottom: 12, fontWeight: 600 }}>🎯 Profil de performance</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 24, marginBottom: 32 }}>
        <div style={{ background: `linear-gradient(135deg, ${C.surface1}, ${C.bgMid})`, border: `1px solid ${C.line}`, borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 14, color: C.gold, marginBottom: 16 }}>5 axes de performance (Radar)</div>
          <Radar data={{ labels: radarAxes.map(a => a.label), datasets: [
            { label: 'Réalisé', data: radarAxes.map(a => a.pct), backgroundColor: 'rgba(232,200,120,0.15)', borderColor: C.gold, borderWidth: 2, pointBackgroundColor: C.gold },
            { label: 'Objectif (100%)', data: [100, 100, 100, 100, 100], backgroundColor: 'rgba(42,46,74,0.2)', borderColor: C.line, borderWidth: 1, borderDash: [4, 4], pointRadius: 0 }
          ] }} options={{ responsive: true, plugins: { legend: { labels: { color: '#8888aa' } } }, scales: { r: { beginAtZero: true, max: 100, ticks: { color: '#8888aa', backdropColor: 'transparent', stepSize: 25 }, grid: { color: C.line }, pointLabels: { color: '#e0e0e0', font: { size: 11 } } } } } as never} />
        </div>
        <div style={{ background: `linear-gradient(135deg, ${C.surface1}, ${C.bgMid})`, border: `1px solid ${C.line}`, borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 14, color: C.gold, marginBottom: 16 }}>Score par semaine (progression)</div>
          <Line data={{ labels: weeklyData.map(w => w.label), datasets: [{ label: 'Score /100', data: weekScores, borderColor: C.gold, backgroundColor: 'rgba(232,200,120,0.1)', fill: true, tension: 0.3, pointBackgroundColor: weekScores.map(s => s >= 75 ? C.green : s >= 60 ? C.gold : s >= 45 ? '#fbbf24' : C.cyan), pointRadius: 6, pointHoverRadius: 8 }] }} options={{ ...chartDefaults, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#8888aa' }, grid: { color: '#1a1e3a' } }, y: { min: 0, max: 100, ticks: { color: '#8888aa', stepSize: 25 }, grid: { color: '#1a1e3a' } } } } as never} />
        </div>
      </div>

      {/* FUNNEL */}
      <div style={{ fontSize: 14, color: C.gold, marginBottom: 12, fontWeight: 600 }}>🔄 Funnel de conversion</div>
      <div style={{ background: `linear-gradient(135deg, ${C.surface1}, ${C.bgMid})`, border: `1px solid ${C.line}`, borderRadius: 12, padding: 24, marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, flexWrap: 'wrap' }}>
          {[
            { value: totalAppels, label: 'Appels' },
            { pct: convAP },
            { value: totalProspects, label: 'Prospects' },
            { pct: convPR },
            { value: totalRDV, label: 'RDV pris' },
            { pct: convRH },
            { value: rdvHonores, label: 'RDV honorés' },
            { pct: convHC },
            { value: totalContrats, label: 'Contrats' },
            { pct: totalContrats > 0 ? -1 : undefined, caPerContract: totalContrats > 0 ? Math.round(totalCA / totalContrats) : 0 },
            { value: totalCA, label: 'CA Total', isCa: true },
          ].map((step, i) => {
            if ('pct' in step && step.pct !== undefined) {
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 8px' }}>
                  <span style={{ color: C.lineSoft, fontSize: 24 }}>→</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.green, background: 'rgba(74,222,128,0.1)', padding: '2px 8px', borderRadius: 4 }}>
                    {step.caPerContract ? step.caPerContract.toLocaleString('fr-FR') + '€/c' : step.pct + '%'}
                  </span>
                </div>
              )
            }
            if ('value' in step) {
              return (
                <div key={i} style={{ textAlign: 'center', padding: '16px 24px' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: C.gold, fontFamily: 'Oswald,sans-serif' }}>
                    {step.isCa ? step.value.toLocaleString('fr-FR') + '€' : step.value}
                  </div>
                  <div style={{ fontSize: 11, color: C.textLo, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 4 }}>{step.label}</div>
                </div>
              )
            }
            return null
          })}
        </div>
        <div style={{ marginTop: 16, padding: '12px', background: 'rgba(232,200,120,0.04)', borderRadius: 8, fontSize: 12, color: C.textMid }}>
          <strong style={{ color: C.gold }}>Résumé :</strong> Pour 1 contrat signé, il faut en moyenne{' '}
          <strong style={{ color: C.textHi }}>{totalContrats > 0 ? Math.round(totalAppels / totalContrats) : '—'} appels</strong>,{' '}
          <strong style={{ color: C.textHi }}>{totalContrats > 0 ? Math.round(totalProspects / totalContrats) : '—'} prospects</strong>,{' '}
          <strong style={{ color: C.textHi }}>{totalContrats > 0 ? (totalRDV / totalContrats).toFixed(1) : '—'} RDV</strong>.
          Taux global Appel→Contrat : <strong style={{ color: C.green }}>{totalAppels > 0 ? Math.round(totalContrats / totalAppels * 100) : 0}%</strong>
        </div>
      </div>

      {/* HEATMAP */}
      <div style={{ fontSize: 14, color: C.gold, marginBottom: 12, fontWeight: 600 }}>🗓️ Heatmap — Appels par jour/semaine</div>
      <div style={{ background: `linear-gradient(135deg, ${C.surface1}, ${C.bgMid})`, border: `1px solid ${C.line}`, borderRadius: 12, padding: 24, marginBottom: 32 }}>
        <div style={{ display: 'grid', gridTemplateColumns: `auto repeat(${JOURS_SEMAINE.length}, 1fr)`, gap: 4, fontSize: 11 }}>
          <div />
          {JOURS_SEMAINE.map(d => <div key={d} style={{ textAlign: 'center', color: C.textLo, fontWeight: 600, padding: '6px 4px' }}>{d}</div>)}
          {heatmapMatrix.map((row, wi) => (
            <React.Fragment key={wi}>
              <div style={{ color: C.textLo, padding: '6px 8px', display: 'flex', alignItems: 'center' }}>S{wi + 1}</div>
              {JOURS_SEMAINE.map(d => (
                <div key={d} style={{ borderRadius: 4, padding: '8px 4px', textAlign: 'center', fontWeight: 600, color: row[d] !== null ? '#fff' : 'transparent', minHeight: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: heatColor(row[d]) }}>
                  {row[d] !== null ? row[d] : ''}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* WEEKLY TABLE */}
      <div style={{ fontSize: 14, color: C.gold, marginBottom: 12, fontWeight: 600 }}>📅 Production hebdomadaire</div>
      <div style={{ background: `linear-gradient(135deg, ${C.surface1}, ${C.bgMid})`, border: `1px solid ${C.line}`, borderRadius: 12, padding: 24, marginBottom: 24, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.line}` }}>
              <th style={{ padding: '10px 12px', textAlign: 'left', color: C.gold, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Semaine</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', color: C.gold, fontSize: 11 }}>Appels</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', color: C.gold, fontSize: 11 }}>Prospects</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', color: C.gold, fontSize: 11 }}>RDV</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', color: C.gold, fontSize: 11 }}>Blocs</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', color: C.gold, fontSize: 11 }}>CA (€)</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', color: C.gold, fontSize: 11 }}>Contrats</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', color: C.gold, fontSize: 11 }}>Score</th>
            </tr>
          </thead>
          <tbody>
            {weeklyData.map((w, i) => {
              const maxA = Math.max(...weeklyData.map(x => x.appels))
              const maxCA = Math.max(...weeklyData.map(x => x.ca))
              const sc = weekScores[i] >= 75 ? C.green : weekScores[i] >= 60 ? C.gold : weekScores[i] >= 45 ? '#fbbf24' : C.cyan
              return (
                <React.Fragment key={i}>
                  <tr onClick={() => setDrillWeek(drillWeek === i ? null : i)} style={{ borderBottom: `1px solid ${C.lineSoft}`, cursor: 'pointer' }}>
                    <td style={{ padding: '10px 12px', color: C.gold, fontWeight: 600 }}>{w.label}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: w.appels === maxA ? C.green : C.text, fontWeight: w.appels === maxA ? 700 : 400 }}>{w.appels}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: C.text }}>{w.prospects}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: C.text }}>{w.rdv}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: C.text }}>{w.blocs}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: w.ca === maxCA ? C.green : C.text, fontWeight: w.ca === maxCA ? 700 : 400 }}>{w.ca.toLocaleString('fr-FR')}€</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: C.text }}>{w.contrats}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: sc, fontWeight: 700 }}>{weekScores[i]}/100</td>
                  </tr>
                  {drillWeek === i && (
                    <tr><td colSpan={8}>
                      <div style={{ background: C.bgDeep, border: `1px solid ${C.line}`, borderRadius: 8, padding: 16, margin: '8px 0' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                          <thead><tr>{['Jour', 'Appels', 'Prospects', 'RDV', 'Blocs', 'CA'].map(h => <th key={h} style={{ color: C.textLo, padding: '6px 8px', textAlign: 'center', fontSize: 10, textTransform: 'uppercase' }}>{h}</th>)}</tr></thead>
                          <tbody>
                            {weeks[i].entries.map((e, j) => (
                              <tr key={j}><td style={{ padding: '6px 8px', textAlign: 'center', color: C.text }}>{new Date(e.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}</td><td style={{ padding: '6px 8px', textAlign: 'center', color: C.text }}>{e.appels}</td><td style={{ padding: '6px 8px', textAlign: 'center', color: C.text }}>{e.prospects}</td><td style={{ padding: '6px 8px', textAlign: 'center', color: C.text }}>{e.rdv_r1 + e.rdv_r2 + e.rdv_r3}</td><td style={{ padding: '6px 8px', textAlign: 'center', color: C.text }}>{e.blocs}</td><td style={{ padding: '6px 8px', textAlign: 'center', color: C.text }}>{e.ca.toLocaleString('fr-FR')}€</td></tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td></tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* WEEKLY CHARTS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24, marginBottom: 32 }}>
        <div style={{ background: `linear-gradient(135deg, ${C.surface1}, ${C.bgMid})`, border: `1px solid ${C.line}`, borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 14, color: C.gold, marginBottom: 16 }}>Production par semaine</div>
          <Bar data={{ labels: weeklyData.map(w => w.label), datasets: [
            { label: 'Appels', data: weeklyData.map(w => w.appels), backgroundColor: C.gold, borderRadius: 4 },
            { label: 'Prospects', data: weeklyData.map(w => w.prospects), backgroundColor: C.green, borderRadius: 4 },
            { label: 'RDV', data: weeklyData.map(w => w.rdv), backgroundColor: '#60a5fa', borderRadius: 4 }
          ] }} options={{ ...chartDefaults, plugins: { legend: { display: true, labels: { color: '#8888aa' } } } } as never} />
        </div>
        <div style={{ background: `linear-gradient(135deg, ${C.surface1}, ${C.bgMid})`, border: `1px solid ${C.line}`, borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 14, color: C.gold, marginBottom: 16 }}>CA par semaine + moyenne mobile</div>
          <Bar data={{ labels: weeklyData.map(w => w.label), datasets: [
            { label: 'CA', data: weeklyData.map(w => w.ca), backgroundColor: C.purple, borderRadius: 4 },
            { type: 'line', label: 'Moy. mobile', data: weeklyData.map((_, i, arr) => {
              const start = Math.max(0, i - 2)
              const slice = arr.slice(start, i + 1).map(w => w.ca)
              return Math.round(slice.reduce((s, v) => s + v, 0) / slice.length)
            }), borderColor: C.gold, borderWidth: 2, pointRadius: 3, tension: 0.4, fill: false } as never
          ] }} options={{ ...chartDefaults, plugins: { legend: { display: true, labels: { color: '#8888aa' } } } } as never} />
        </div>
      </div>

      {/* DAILY CHARTS — Chart.js */}
      <div style={{ fontSize: 14, color: C.gold, marginBottom: 12, fontWeight: 600 }}>📈 Évolution quotidienne</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24, marginBottom: 32 }}>
        <div style={{ background: `linear-gradient(135deg, ${C.surface1}, ${C.bgMid})`, border: `1px solid ${C.line}`, borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 14, color: C.gold, marginBottom: 16 }}>Appels passés par jour + moyenne mobile 5j</div>
          <Bar data={{ labels: dateLabels, datasets: [
            { data: dailyAppels, backgroundColor: C.gold, borderRadius: 4, label: 'Appels' },
            { type: 'line', data: movingAvg5, borderColor: C.cyan, borderWidth: 2, pointRadius: 0, tension: 0.4, label: 'Moy. mobile 5j', fill: false } as never
          ] }} options={{ ...chartDefaults, plugins: { legend: { display: true, labels: { color: '#8888aa' } } } } as never} />
        </div>
        <div style={{ background: `linear-gradient(135deg, ${C.surface1}, ${C.bgMid})`, border: `1px solid ${C.line}`, borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 14, color: C.gold, marginBottom: 16 }}>Prospects contactés par jour</div>
          <Line data={{ labels: dateLabels, datasets: [{ data: data.map(e => e.prospects), borderColor: C.green, backgroundColor: 'rgba(74,222,128,0.1)', fill: true, tension: 0.3 }] }} options={chartDefaults as never} />
        </div>
        <div style={{ background: `linear-gradient(135deg, ${C.surface1}, ${C.bgMid})`, border: `1px solid ${C.line}`, borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 14, color: C.gold, marginBottom: 16 }}>RDV pris par jour</div>
          <Bar data={{ labels: dateLabels, datasets: [{ data: data.map(e => e.rdv_r1 + e.rdv_r2 + e.rdv_r3), backgroundColor: '#60a5fa', borderRadius: 4 }] }} options={chartDefaults as never} />
        </div>
        <div style={{ background: `linear-gradient(135deg, ${C.surface1}, ${C.bgMid})`, border: `1px solid ${C.line}`, borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 14, color: C.gold, marginBottom: 16 }}>CA cumulé vs projection linéaire</div>
          <Line data={{ labels: dateLabels, datasets: [
            { label: 'CA Réel', data: cumulativeCA, borderColor: C.gold, backgroundColor: 'rgba(232,200,120,0.1)', fill: true, tension: 0.3 },
            { label: 'Projection', data: projLine, borderColor: '#8888aa', borderWidth: 1, borderDash: [5, 5], pointRadius: 0, fill: false }
          ] }} options={{ ...chartDefaults, plugins: { legend: { display: true, labels: { color: '#8888aa' } } } } as never} />
        </div>
        <div style={{ background: `linear-gradient(135deg, ${C.surface1}, ${C.bgMid})`, border: `1px solid ${C.line}`, borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 14, color: C.gold, marginBottom: 16 }}>Blocs de 52 min / jour</div>
          <Bar data={{ labels: dateLabels, datasets: [{ data: data.map(e => e.blocs), backgroundColor: C.purple, borderRadius: 4 }] }} options={chartDefaults as never} />
        </div>
        <div style={{ background: `linear-gradient(135deg, ${C.surface1}, ${C.bgMid})`, border: `1px solid ${C.line}`, borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 14, color: C.gold, marginBottom: 16 }}>Contrats signés (cumulé)</div>
          <Line data={{ labels: dateLabels, datasets: [{ data: data.reduce<number[]>((acc, e) => { acc.push((acc.length > 0 ? acc[acc.length - 1] : 0) + e.contrats); return acc }, []), borderColor: C.green, backgroundColor: 'rgba(74,222,128,0.1)', fill: true, tension: 0.1, stepped: true }] }} options={chartDefaults as never} />
        </div>
      </div>

      {/* OBJECTIVES — 3 Chart.js charts identiques au HTML */}
      <div style={{ fontSize: 14, color: C.gold, marginBottom: 12, fontWeight: 600 }}>🏆 Objectifs vs Réalisé</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24, marginBottom: 32 }}>
        <div style={{ background: `linear-gradient(135deg, ${C.surface1}, ${C.bgMid})`, border: `1px solid ${C.line}`, borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 14, color: C.gold, marginBottom: 16 }}>Objectifs mensuels — Appels</div>
          <Bar data={{ labels: ['Ce mois', 'M+1', 'M+2', 'M+3', 'M+4', 'M+5'], datasets: [
            { label: 'Objectif', data: [obj.appels, obj.appels, obj.appels, obj.appels, obj.appels, obj.appels], backgroundColor: '#2a2e4a', borderRadius: 4 },
            { label: 'Réalisé', data: [totalAppels, 0, 0, 0, 0, 0], backgroundColor: C.gold, borderRadius: 4 }
          ] }} options={{ ...chartDefaults, plugins: { legend: { display: true, labels: { color: '#8888aa' } } } } as never} />
        </div>
        <div style={{ background: `linear-gradient(135deg, ${C.surface1}, ${C.bgMid})`, border: `1px solid ${C.line}`, borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 14, color: C.gold, marginBottom: 16 }}>Objectifs mensuels — CA (€)</div>
          <Bar data={{ labels: ['Ce mois', 'M+1', 'M+2', 'M+3', 'M+4', 'M+5'], datasets: [
            { label: 'Objectif', data: [obj.ca, obj.ca, obj.ca, Math.round(obj.ca * 1.15), Math.round(obj.ca * 1.15), Math.round(obj.ca * 1.4)], backgroundColor: '#2a2e4a', borderRadius: 4 },
            { label: 'Réalisé', data: [totalCA, 0, 0, 0, 0, 0], backgroundColor: C.green, borderRadius: 4 }
          ] }} options={{ ...chartDefaults, plugins: { legend: { display: true, labels: { color: '#8888aa' } } } } as never} />
        </div>
        <div style={{ background: `linear-gradient(135deg, ${C.surface1}, ${C.bgMid})`, border: `1px solid ${C.line}`, borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 14, color: C.gold, marginBottom: 16 }}>Atteinte objectifs — Jauges</div>
          <Bar data={{ labels: ['Appels', 'CA', 'RDV', 'Contrats', 'Prospects', 'Blocs'], datasets: [{
            label: '% objectif',
            data: [
              Math.min(100, Math.round(totalAppels / obj.appels * 100)),
              Math.min(100, Math.round(totalCA / obj.ca * 100)),
              Math.min(100, Math.round(totalRDV / obj.rdv * 100)),
              Math.min(100, Math.round(totalContrats / obj.contrats * 100)),
              Math.min(100, Math.round(totalProspects / obj.prospects * 100)),
              Math.min(100, Math.round(totalBlocs / obj.blocs * 100)),
            ],
            backgroundColor: [
              Math.round(totalAppels / obj.appels * 100) >= 90 ? C.green : Math.round(totalAppels / obj.appels * 100) >= 70 ? C.gold : Math.round(totalAppels / obj.appels * 100) >= 50 ? '#fbbf24' : '#f87171',
              Math.round(totalCA / obj.ca * 100) >= 90 ? C.green : Math.round(totalCA / obj.ca * 100) >= 70 ? C.gold : Math.round(totalCA / obj.ca * 100) >= 50 ? '#fbbf24' : '#f87171',
              Math.round(totalRDV / obj.rdv * 100) >= 90 ? C.green : Math.round(totalRDV / obj.rdv * 100) >= 70 ? C.gold : Math.round(totalRDV / obj.rdv * 100) >= 50 ? '#fbbf24' : '#f87171',
              Math.round(totalContrats / obj.contrats * 100) >= 90 ? C.green : Math.round(totalContrats / obj.contrats * 100) >= 70 ? C.gold : Math.round(totalContrats / obj.contrats * 100) >= 50 ? '#fbbf24' : '#f87171',
              Math.round(totalProspects / obj.prospects * 100) >= 90 ? C.green : Math.round(totalProspects / obj.prospects * 100) >= 70 ? C.gold : Math.round(totalProspects / obj.prospects * 100) >= 50 ? '#fbbf24' : '#f87171',
              Math.round(totalBlocs / obj.blocs * 100) >= 90 ? C.green : Math.round(totalBlocs / obj.blocs * 100) >= 70 ? C.gold : Math.round(totalBlocs / obj.blocs * 100) >= 50 ? '#fbbf24' : '#f87171',
            ],
            borderRadius: 4
          }] }} options={{ ...chartDefaults, indexAxis: 'y' as const, plugins: { legend: { display: false } }, scales: { x: { max: 100, ticks: { color: '#8888aa', callback: (v: string | number) => v + '%' }, grid: { color: '#1a1e3a' } }, y: { ticks: { color: '#8888aa' }, grid: { color: '#1a1e3a' } } } } as never} />
        </div>
      </div>

      {/* EXPORT */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
        <button
          onClick={() => {
            let csv = 'Date;Jour;Appels;Prospects;RDV;Blocs;CA;Contrats\n'
            data.forEach(e => { const dn = new Date(e.date).toLocaleDateString('fr-FR', { weekday: 'short' }); csv += `${e.date};${dn};${e.appels};${e.prospects};${e.rdv_r1+e.rdv_r2+e.rdv_r3};${e.blocs};${e.ca};${e.contrats}\n` })
            csv += '\nSemaine;Appels;Prospects;RDV;Blocs;CA;Contrats;Score\n'
            weeklyData.forEach((w, i) => { csv += `${w.label};${w.appels};${w.prospects};${w.rdv};${w.blocs};${w.ca};${w.contrats};${weekScores[i]}\n` })
            csv += `\nScore Global;${globalScore}/100\nCA Projeté;${projCA}\n`
            const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `Performance_CGP_${currentMonth}_${new Date().toISOString().slice(0, 10)}.csv`
            a.click()
            URL.revokeObjectURL(url)
          }}
          style={{ background: `linear-gradient(135deg, ${C.gold}, #d4a843)`, color: C.bgDeep, border: 'none', padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          📥 Export CSV Performance
        </button>
      </div>
    </>
  )
}
