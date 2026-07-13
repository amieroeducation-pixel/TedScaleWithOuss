'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { C } from '@/lib/theme'
import { LinkButton, LinkBadge, LinkChip, buildHref } from '@/lib/cross-links'

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
    <div onClick={onClick} style={{ background: `linear-gradient(135deg, ${C.surface1}, ${C.bgMid})`, border: `1px solid ${C.line}`, borderRadius: 10, padding: '16px 12px', textAlign: 'center', cursor: onClick ? 'pointer' : 'default', transition: 'transform 0.2s, border-color 0.2s', ...(onClick ? { ':hover': { transform: 'translateY(-2px)', borderColor: color } } : {}) }}>
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

export default function DonneesPage() {
  const router = useRouter()
  const [period, setPeriod] = useState<Period>('jour')
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>(['appels', 'prospects', 'rdv', 'ca'])
  const [data, setData] = useState<DailyEntry[]>([])
  const [objectives, setObjectives] = useState<MonthlyObjective | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [compareMode, setCompareMode] = useState(false)

  // Current month navigation
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

  // Compare mode: split month in half
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
        </div>
      </div>

      {/* Liens transversaux après header */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, justifyContent: 'center' }}>
        <LinkChip href="/global" label="Vue globale" color="cyan" />
        <LinkChip href="/revenue" label="CA & Revenue" color="gold" />
        <LinkChip href={buildHref('/today', { tab: 'prospection' })} label="Prospection jour" color="indigo" />
      </div>

      {/* Month Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <button
          onClick={() => navigateMonth(-1)}
          style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${C.line}`, background: C.surface1, color: C.textMid, fontSize: 14, cursor: 'pointer' }}
        >
          &larr;
        </button>
        <span style={{ fontFamily: 'Oswald,sans-serif', fontSize: 16, color: C.textHi, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {formatMonthLabel(currentMonth)}
        </span>
        <button
          onClick={() => navigateMonth(1)}
          style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${C.line}`, background: C.surface1, color: C.textMid, fontSize: 14, cursor: 'pointer' }}
        >
          &rarr;
        </button>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 40, color: C.textLo, fontFamily: 'JetBrains Mono,monospace', fontSize: 12 }}>
          Chargement des données...
        </div>
      )}

      {error && (
        <div style={{ textAlign: 'center', padding: 20, color: C.cyan, fontFamily: 'JetBrains Mono,monospace', fontSize: 11, background: C.surface1, border: `1px solid ${C.cyan}`, borderRadius: 8, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {!loading && !error && data.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: C.textLo, fontFamily: 'JetBrains Mono,monospace', fontSize: 12 }}>
          Aucune donnée pour ce mois. Commence à saisir tes KPIs quotidiens !
        </div>
      )}

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
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{ padding: '6px 14px', borderRadius: 6, border: `1px solid ${period === p ? C.gold : C.line}`, background: period === p ? '#1a1400' : C.surface1, color: period === p ? C.gold : C.textMid, fontSize: 10, cursor: 'pointer', fontFamily: 'Oswald,sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em' }}
              >
                {p}
              </button>
            ))}
            <span style={{ margin: '0 8px', color: C.lineSoft }}>|</span>
            <span style={{ fontSize: 10, color: C.textLo, fontFamily: 'JetBrains Mono,monospace' }}>Métriques :</span>
            {METRICS.map(m => (
              <button
                key={m.key}
                onClick={() => toggleMetric(m.key)}
                style={{ padding: '4px 10px', borderRadius: 12, border: `1px solid ${selectedMetrics.includes(m.key) ? m.color : C.lineSoft}`, background: selectedMetrics.includes(m.key) ? m.color + '15' : 'transparent', color: selectedMetrics.includes(m.key) ? m.color : C.textVlo, fontSize: 9, cursor: 'pointer', fontFamily: 'JetBrains Mono,monospace' }}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Graphiques mini-barres par métrique */}
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
                    <span style={{ fontSize: 10, color: C.textMid, fontFamily: 'JetBrains Mono,monospace' }}>
                      Total: {key === 'ca' ? total.toLocaleString('fr-FR') + '€' : total} | Moy: {key === 'ca' ? avg.toLocaleString('fr-FR') + '€' : avg} | Max: {key === 'ca' ? max.toLocaleString('fr-FR') + '€' : max}
                    </span>
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
                {/* Période 1 */}
                <div>
                  <div style={{ fontSize: 10, color: C.textLo, marginBottom: 6, fontFamily: 'JetBrains Mono,monospace' }}>
                    1ère moitié ({comparePeriod1Data.length > 0 ? comparePeriod1Data[0].date.substring(5) : ''} — {comparePeriod1Data.length > 0 ? comparePeriod1Data[comparePeriod1Data.length - 1].date.substring(5) : ''})
                  </div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {METRICS.map(m => {
                      const val = comparePeriod1Data.reduce((s, e) => s + getMetricValue(e, m.key), 0)
                      return (
                        <div key={m.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: C.surface2, borderRadius: 4 }}>
                          <span style={{ fontSize: 10, color: m.color }}>{m.label}</span>
                          <span style={{ fontSize: 10, color: C.textHi, fontWeight: 600 }}>{m.key === 'ca' ? val.toLocaleString('fr-FR') + '€' : val}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* VS */}
                <div style={{ fontSize: 20, color: C.gold, fontWeight: 700, paddingTop: 40, fontFamily: 'Oswald,sans-serif' }}>VS</div>

                {/* Période 2 */}
                <div>
                  <div style={{ fontSize: 10, color: C.textLo, marginBottom: 6, fontFamily: 'JetBrains Mono,monospace' }}>
                    2ème moitié ({comparePeriod2Data.length > 0 ? comparePeriod2Data[0].date.substring(5) : ''} — {comparePeriod2Data.length > 0 ? comparePeriod2Data[comparePeriod2Data.length - 1].date.substring(5) : ''})
                  </div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {METRICS.map(m => {
                      const val2 = comparePeriod2Data.reduce((s, e) => s + getMetricValue(e, m.key), 0)
                      const val1 = comparePeriod1Data.reduce((s, e) => s + getMetricValue(e, m.key), 0)
                      const diff = val1 > 0 ? Math.round(((val2 - val1) / val1) * 100) : 0
                      return (
                        <div key={m.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: C.surface2, borderRadius: 4 }}>
                          <span style={{ fontSize: 10, color: m.color }}>{m.label}</span>
                          <span style={{ fontSize: 10, fontWeight: 600 }}>
                            <span style={{ color: C.textHi }}>{m.key === 'ca' ? val2.toLocaleString('fr-FR') + '€' : val2}</span>
                            {' '}
                            <span style={{ color: diff >= 0 ? C.green : C.cyan }}>({diff >= 0 ? '+' : ''}{diff}%)</span>
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tableau détaillé */}
          <div style={{ background: `linear-gradient(135deg, ${C.surface1}, ${C.bgMid})`, border: `1px solid ${C.line}`, borderRadius: 10, padding: 20, marginBottom: 24 }}>
            <div style={{ fontSize: 12, color: C.gold, fontFamily: 'Oswald,sans-serif', letterSpacing: '0.08em', marginBottom: 16 }}>
              TABLEAU DÉTAILLÉ — VUE PAR {period.toUpperCase()}
            </div>
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
    </>
  )
}
