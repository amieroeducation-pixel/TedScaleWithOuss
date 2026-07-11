'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { C } from '@/lib/theme'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { saveLastSection } from '@/lib/navigation-state'
import { LinkButton, LinkChip } from '@/lib/cross-links'

type GlobalKpi = {
  tasks: { done_today: number; active: number; high_priority_remaining: number; this_week: number; total: number }
  prospection: { contacts_today: number; prospects_this_week: number; calls_today: number; rdv1_today: number; rdv2_today: number; blocks_today: number }
}

type KpiData = {
  period: string
  realise: { appels: number; contacts: number; rdv_pris: number; rdv_faits: number; blocks: number }
  objectifs: { appels: number; contacts: number; rdv_pris: number; rdv_faits: number; propositions: number; collecte: number }
  ecarts: { appels: number; contacts: number; rdv_pris: number; rdv_faits: number }
  prev_period: { appels: number; contacts: number; rdv_pris: number; rdv_faits: number }
  tendances: { appels: string; contacts: string; rdv_pris: string; rdv_faits: string }
  ratios: { appels_to_rdv: number; rdv_pris_to_faits: number }
  has_objectives: boolean
}

type GlobalTab = 'synthese' | 'planning' | 'rdvpris' | 'suivi'
type SuiviPeriod = 'day' | 'week' | 'month'

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
const MONTH_WEEKS = ['4s','4s','4s','4s','4s','4s','4s','4s','5s','4s','4s','5s']

function MonthIntensityGrid({ onIntensityChange, initialValues }: { onIntensityChange?: (intensity: number[]) => void; initialValues?: number[] }) {
  const [values, setValues] = useState<Record<string,string>>(
    Object.fromEntries(MONTHS.map((m, i) => [m, String(initialValues?.[i] ?? 1.0)]))
  )
  const initRef = React.useRef(false)

  useEffect(() => {
    if (initialValues && !initRef.current) {
      const newValues = Object.fromEntries(MONTHS.map((m, i) => [m, String(initialValues[i] ?? 1.0)]))
      setValues(newValues)
      initRef.current = true
    }
  }, [initialValues])

  const handleChange = useCallback((month: string, val: string) => {
    setValues(prev => {
      const next = { ...prev, [month]: val }
      if (onIntensityChange) {
        onIntensityChange(MONTHS.map(m => parseFloat(next[m]) || 1))
      }
      return next
    })
  }, [onIntensityChange])
  const selectStyle = {
    width: '100%', padding: 4, background: C.surface1,
    border: `1px solid ${C.line}`, borderRadius: 4, color: C.text, fontSize: 11, textAlign: 'center' as const,
  }
  const renderRow = (slice: string[], offset: number) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 8, marginBottom: 8 }}>
      {slice.map((m, i) => (
        <div key={m} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 8, color: C.textLo, marginBottom: 4 }}>{m} ({MONTH_WEEKS[i + offset]})</div>
          <select value={values[m]} onChange={e => handleChange(m, e.target.value)} style={selectStyle}>
            <option value="">--</option>
            <option value="0.7">↘↘</option>
            <option value="0.9">↘</option>
            <option value="1.0">-</option>
            <option value="1.1">↗</option>
            <option value="1.3">↗↗</option>
          </select>
        </div>
      ))}
    </div>
  )
  return (
    <>
      {renderRow(MONTHS.slice(0, 6), 0)}
      {renderRow(MONTHS.slice(6), 6)}
    </>
  )
}

function IntensityConfig({ onLegendChange }: { onLegendChange: (s: string) => void }) {
  const [dd, setDd] = useState(-30)
  const [d, setD] = useState(-10)
  const [u, setU] = useState(10)
  const [uu, setUu] = useState(30)

  const emit = (newDd: number, newD: number, newU: number, newUu: number) => {
    onLegendChange(`-- Ignorer · ↘↘ ${newDd}% · ↘ ${newD}% · - Normal · ↗ +${newU}% · ↗↗ +${newUu}%`)
  }

  const inp = {
    width: '100%', padding: 4, background: C.surface1,
    border: `1px solid ${C.line}`, borderRadius: 4, color: C.text, fontSize: 9, textAlign: 'center' as const,
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, marginBottom: 16, padding: 10, background: C.bgDeep, borderRadius: 6 }}>
      {([
        { label: '↘↘', val: dd, setVal: (v: number) => { setDd(v); emit(v, d, u, uu) }, min: -100, max: 0 },
        { label: '↘',  val: d,  setVal: (v: number) => { setD(v);  emit(dd, v, u, uu) }, min: -100, max: 0 },
        { label: '-',  val: 0,  setVal: () => {},                                         min: 0,    max: 0, ro: true },
        { label: '↗',  val: u,  setVal: (v: number) => { setU(v);  emit(dd, d, v, uu) }, min: 0,    max: 200 },
        { label: '↗↗', val: uu, setVal: (v: number) => { setUu(v); emit(dd, d, u, v) },  min: 0,    max: 200 },
      ] as Array<{ label: string; val: number; setVal: (v: number) => void; min: number; max: number; ro?: boolean }>).map(({ label, val, setVal, min, max, ro }) => (
        <div key={label} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: C.textMid, marginBottom: 4 }}>{label}</div>
          <input
            type="number" value={val} min={min} max={max} step={5}
            readOnly={ro}
            onChange={ro ? undefined : (e => setVal(+e.target.value))}
            style={ro ? { ...inp, background: C.surface2, color: C.textLo, cursor: 'not-allowed' } : inp}
          />
          <div style={{ fontSize: 7, color: C.textLo, marginTop: 2 }}>%</div>
        </div>
      ))}
    </div>
  )
}

function PlanningTabContent({ title, r1Key, r2Key, moneyKey, r1Label, r2Label, moneyLabel, r1Default, r2Default, moneyDefault }: {
  title: string; r1Key: string; r2Key: string; moneyKey: string;
  r1Label: string; r2Label: string; moneyLabel: string;
  r1Default: number; r2Default: number; moneyDefault: number
}) {
  const [legend, setLegend] = useState('-- Ignorer · ↘↘ -30% · ↘ -10% · - Normal · ↗ +10% · ↗↗ +30%')
  const [r1, setR1] = useState(r1Default)
  const [r2, setR2] = useState(r2Default)
  const [money, setMoney] = useState(moneyDefault)
  const [intensity, setIntensity] = useState<number[]>([1,1,1,1,1,1,1,1,1,1,1,1])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [calculated, setCalculated] = useState<{ month: string; r1: number; r2: number; money: number }[] | null>(null)

  useEffect(() => {
    fetch('/api/global/kpi/objectives')
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data) {
          const d = json.data
          if (d[r1Key] != null) setR1(d[r1Key])
          if (d[r2Key] != null) setR2(d[r2Key])
          if (d[moneyKey] != null) setMoney(d[moneyKey])
          if (d.month_intensity) setIntensity(d.month_intensity)
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [r1Key, r2Key, moneyKey])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const body: Record<string, any> = {
        [r1Key]: r1,
        [r2Key]: r2,
        [moneyKey]: money,
        month_intensity: intensity,
      }
      const res = await fetch('/api/global/kpi/objectives', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setError(json.error || `Erreur ${res.status}`)
        setSaving(false)
        return
      }
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)

      const totalIntensity = intensity.reduce((a, b) => a + b, 0)
      const months = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
      setCalculated(months.map((m, i) => {
        const coeff = intensity[i] / totalIntensity
        return {
          month: m,
          r1: Math.round(r1 * coeff),
          r2: Math.round(r2 * coeff),
          money: Math.round(money * coeff),
        }
      }))
    } catch {
      setError('Erreur réseau — vérifie ta connexion')
      setSaving(false)
    }
  }

  const numInp = (color: string) => ({
    width: '100%', padding: 8, background: C.surface1, border: `1px solid ${C.line}`,
    borderRadius: 6, color, fontSize: 14, fontWeight: 600, textAlign: 'center' as const,
  })

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.textHi, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 9, color: C.textLo }}>Configure tes objectifs et l'intensité de chaque mois. Le dashboard calculera automatiquement les objectifs hebdomadaires.</div>
      </div>

      <div style={{ background: C.bgMid, border: `1px solid ${C.line}`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: C.gold, marginBottom: 12 }}>📊 Objectifs annuels 2026</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          <div>
            <label style={{ fontSize: 8, color: C.textLo, display: 'block', marginBottom: 4 }}>{r1Label}</label>
            <input type="number" value={r1} min={0} max={2000} onChange={e => setR1(+e.target.value)} style={numInp(C.indigo)} />
          </div>
          <div>
            <label style={{ fontSize: 8, color: C.textLo, display: 'block', marginBottom: 4 }}>{r2Label}</label>
            <input type="number" value={r2} min={0} max={2000} onChange={e => setR2(+e.target.value)} style={numInp(C.green)} />
          </div>
          <div>
            <label style={{ fontSize: 8, color: C.textLo, display: 'block', marginBottom: 4 }}>{moneyLabel}</label>
            <input type="number" value={money} min={0} max={10000000} step={1000} onChange={e => setMoney(+e.target.value)} style={numInp(C.gold)} />
          </div>
        </div>
      </div>

      <div style={{ background: C.bgMid, border: `1px solid ${C.line}`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: C.gold, marginBottom: 8 }}>⚙️ Configuration des intensités</div>
        <div style={{ fontSize: 8, color: C.textLo, marginBottom: 12 }}>Définis le pourcentage de variation pour chaque symbole</div>
        <IntensityConfig onLegendChange={setLegend} />
        <div style={{ fontSize: 10, fontWeight: 600, color: C.gold, marginBottom: 8 }}>📅 Intensité par mois</div>
        <div style={{ fontSize: 8, color: C.textLo, marginBottom: 12 }}>{legend}</div>
        <MonthIntensityGrid key={loaded ? 'loaded' : 'init'} onIntensityChange={setIntensity} initialValues={intensity} />
        {error && (
          <div style={{ background: '#1a0d0d', border: '1px solid #ff6b6b40', borderRadius: 6, padding: 8, marginTop: 8 }}>
            <div style={{ fontSize: 9, color: '#ff6b6b' }}>❌ {error}</div>
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ width: '100%', padding: 10, background: saving ? C.surface2 : saved ? '#0d1a0d' : C.indigo, border: 'none', borderRadius: 6, color: '#fff', fontSize: 10, fontWeight: 600, cursor: saving ? 'wait' : 'pointer', marginTop: 8 }}
        >
          {saving ? '⏳ Sauvegarde...' : saved ? '✅ Sauvegardé !' : '💾 Sauvegarder et calculer'}
        </button>
      </div>

      {calculated && (
        <div style={{ background: C.bgMid, border: `1px solid ${C.line}`, borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.gold, marginBottom: 12 }}>📅 Objectifs mensuels calculés</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
            <div style={{ fontSize: 8, color: C.textLo, fontWeight: 600 }}>Mois</div>
            <div style={{ fontSize: 8, color: C.indigo, fontWeight: 600 }}>{r1Label}</div>
            <div style={{ fontSize: 8, color: C.green, fontWeight: 600 }}>{r2Label}</div>
            <div style={{ fontSize: 8, color: C.gold, fontWeight: 600 }}>€</div>
            {calculated.map(row => (
              <React.Fragment key={row.month}>
                <div style={{ fontSize: 9, color: C.textMid }}>{row.month}</div>
                <div style={{ fontSize: 9, color: C.textHi }}>{row.r1}</div>
                <div style={{ fontSize: 9, color: C.textHi }}>{row.r2}</div>
                <div style={{ fontSize: 9, color: C.textHi }}>{(row.money / 100).toLocaleString('fr-FR')}€</div>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

type HistoryPoint = {
  label: string
  appels: number; contacts: number; rdv_pris: number; rdv_faits: number
  obj_appels?: number; obj_contacts?: number; obj_rdv_pris?: number; obj_rdv_faits?: number
}

type ComparisonData = { week: number; year: number; appels: number; contacts: number; rdv_pris: number; rdv_faits: number }

function SuiviTabContent() {
  const [period, setPeriod] = useState<SuiviPeriod>('week')
  const [kpiData, setKpiData] = useState<KpiData | null>(null)
  const [loading, setLoading] = useState(true)

  const [granularity, setGranularity] = useState<'week' | 'month'>('week')
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)

  const [compareWeek, setCompareWeek] = useState('')
  const [comparison, setComparison] = useState<ComparisonData | null>(null)

  const [selectedKpi, setSelectedKpi] = useState<'appels' | 'contacts' | 'rdv_pris' | 'rdv_faits'>('appels')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/global/kpi?period=${period}`)
      .then(r => r.json())
      .then(json => { if (json.success) setKpiData(json.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [period])

  useEffect(() => {
    setHistoryLoading(true)
    fetch(`/api/global/kpi/history?granularity=${granularity}&weeks_back=12`)
      .then(r => r.json())
      .then(json => { if (json.success) setHistory(json.data.points) })
      .catch(() => {})
      .finally(() => setHistoryLoading(false))
  }, [granularity])

  const handleCompare = () => {
    if (!compareWeek) return
    const [y, w] = compareWeek.split('-W')
    fetch(`/api/global/kpi/history?granularity=week&weeks_back=1&compare_week=${w}&compare_year=${y}`)
      .then(r => r.json())
      .then(json => { if (json.success) setComparison(json.data.comparison) })
      .catch(() => {})
  }

  const pBtn = (p: SuiviPeriod, label: string) => (
    <button
      key={p}
      onClick={() => setPeriod(p)}
      style={{
        flex: 1, padding: 8,
        background: period === p ? '#1a1400' : C.surface1,
        border: `1px solid ${period === p ? C.gold : C.line}`,
        color: period === p ? C.gold : C.textLo,
        borderRadius: 6, fontSize: 9, fontWeight: period === p ? 600 : 500, cursor: 'pointer',
      }}
    >{label}</button>
  )

  const gBtn = (g: 'week' | 'month', label: string) => (
    <button
      key={g}
      onClick={() => setGranularity(g)}
      style={{
        flex: 1, padding: 6,
        background: granularity === g ? '#0d1a2e' : C.surface1,
        border: `1px solid ${granularity === g ? C.indigo : C.line}`,
        color: granularity === g ? C.indigo : C.textLo,
        borderRadius: 4, fontSize: 8, fontWeight: granularity === g ? 600 : 500, cursor: 'pointer',
      }}
    >{label}</button>
  )

  const kpiBtn = (k: typeof selectedKpi, label: string, color: string) => (
    <button
      key={k}
      onClick={() => setSelectedKpi(k)}
      style={{
        padding: '4px 8px',
        background: selectedKpi === k ? `${color}20` : C.surface1,
        border: `1px solid ${selectedKpi === k ? color : C.line}`,
        color: selectedKpi === k ? color : C.textLo,
        borderRadius: 4, fontSize: 8, fontWeight: selectedKpi === k ? 600 : 500, cursor: 'pointer',
      }}
    >{label}</button>
  )

  const tendanceIcon = (t: string) => t === 'up' ? '↗️' : t === 'down' ? '↘️' : '→'
  const ecartColor = (e: number) => e >= 0 ? C.green : '#ff6b6b'

  const barData = kpiData ? [
    { categorie: 'Appels', objectif: kpiData.objectifs.appels, realise: kpiData.realise.appels },
    { categorie: 'Contacts', objectif: kpiData.objectifs.contacts, realise: kpiData.realise.contacts },
    { categorie: 'RDV Pris', objectif: kpiData.objectifs.rdv_pris, realise: kpiData.realise.rdv_pris },
    { categorie: 'RDV Faits', objectif: kpiData.objectifs.rdv_faits, realise: kpiData.realise.rdv_faits },
  ] : []

  const kpiColors: Record<string, string> = { appels: C.green, contacts: C.indigo, rdv_pris: C.gold, rdv_faits: '#b07aee' }
  const objKey = `obj_${selectedKpi}` as string

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.textHi, marginBottom: 8 }}>📊 Suivi Objectifs vs Réalisations</div>
        <div style={{ fontSize: 9, color: C.textLo }}>Comparaison en temps réel, évolution historique, et comparateur de périodes</div>
      </div>

      {/* Période actuelle */}
      <div style={{ background: C.bgMid, border: `1px solid ${C.line}`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: C.gold, marginBottom: 12 }}>🎯 Période en cours</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {pBtn('day', "Aujourd'hui")}
          {pBtn('week', 'Semaine')}
          {pBtn('month', 'Mois')}
        </div>
      </div>

      {loading && <div style={{ textAlign: 'center', color: C.textLo, padding: 20, fontSize: 10 }}>Chargement...</div>}

      {!loading && kpiData && !kpiData.has_objectives && (
        <div style={{ background: '#1a1400', border: `1px solid ${C.gold}40`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: C.gold, fontWeight: 600, marginBottom: 6 }}>⚠️ Objectifs non configurés</div>
          <div style={{ fontSize: 9, color: C.textMid }}>Configure tes objectifs annuels dans l'onglet "Rétro Planning" pour voir la comparaison.</div>
        </div>
      )}

      {!loading && kpiData && (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 16 }}>
            {([
              { label: 'Appels', realise: kpiData.realise.appels, obj: kpiData.objectifs.appels, ecart: kpiData.ecarts.appels, tendance: kpiData.tendances.appels, prev: kpiData.prev_period.appels, color: C.green },
              { label: 'Contacts', realise: kpiData.realise.contacts, obj: kpiData.objectifs.contacts, ecart: kpiData.ecarts.contacts, tendance: kpiData.tendances.contacts, prev: kpiData.prev_period.contacts, color: C.indigo },
              { label: 'RDV Pris', realise: kpiData.realise.rdv_pris, obj: kpiData.objectifs.rdv_pris, ecart: kpiData.ecarts.rdv_pris, tendance: kpiData.tendances.rdv_pris, prev: kpiData.prev_period.rdv_pris, color: C.gold },
              { label: 'RDV Faits', realise: kpiData.realise.rdv_faits, obj: kpiData.objectifs.rdv_faits, ecart: kpiData.ecarts.rdv_faits, tendance: kpiData.tendances.rdv_faits, prev: kpiData.prev_period.rdv_faits, color: '#b07aee' },
            ] as Array<{ label: string; realise: number; obj: number; ecart: number; tendance: string; prev: number; color: string }>).map(({ label, realise, obj, ecart, tendance, prev, color }) => (
              <div key={label} style={{ background: C.bgMid, border: `1px solid ${C.line}`, borderRadius: 8, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 9, color: C.textMid }}>{label}</div>
                  <div style={{ fontSize: 9 }}>{tendanceIcon(tendance)}</div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: C.textHi, marginBottom: 4 }}>{realise}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 9, color: C.textLo }}>Obj: {obj}</div>
                  <div style={{ fontSize: 9, fontWeight: 600, color: ecartColor(ecart) }}>{ecart >= 0 ? '+' : ''}{ecart}%</div>
                </div>
                <div style={{ background: C.surface3, height: 6, borderRadius: 3, marginTop: 8, overflow: 'hidden' }}>
                  <div style={{ background: color, height: '100%', width: `${Math.min(obj > 0 ? (realise / obj) * 100 : 0, 100)}%`, transition: 'width 0.3s' }} />
                </div>
                <div style={{ fontSize: 8, color: C.textLo, marginTop: 6 }}>Période préc. : {prev}</div>
              </div>
            ))}
          </div>

          {/* BarChart - Objectifs vs Réalisé */}
          <div style={{ background: C.bgMid, border: `1px solid ${C.line}`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: C.gold, marginBottom: 12 }}>🎯 Objectifs vs Réalisé ({period === 'day' ? "aujourd'hui" : period === 'week' ? 'semaine' : 'mois'})</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.line} />
                <XAxis dataKey="categorie" tick={{ fill: C.textLo, fontSize: 9 }} stroke={C.line} />
                <YAxis tick={{ fill: C.textLo, fontSize: 10 }} stroke={C.line} />
                <Tooltip contentStyle={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 6, fontSize: 11, color: C.text }} />
                <Bar dataKey="objectif" fill={C.gold} name="Objectif" radius={[4, 4, 0, 0]} />
                <Bar dataKey="realise" fill={C.indigo} name="Réalisé" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Ratios */}
          <div style={{ background: C.bgMid, border: `1px solid ${C.line}`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: C.gold, marginBottom: 12 }}>🔗 Taux de conversion</div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: C.textHi }}>{kpiData.ratios.appels_to_rdv}%</div>
                <div style={{ fontSize: 8, color: C.textLo, marginTop: 4 }}>Appels → RDV</div>
              </div>
              <div style={{ width: 1, background: C.line }} />
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: C.textHi }}>{kpiData.ratios.rdv_pris_to_faits}%</div>
                <div style={{ fontSize: 8, color: C.textLo, marginTop: 4 }}>RDV Pris → Faits</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══════ ÉVOLUTION HISTORIQUE ═══════ */}
      <div style={{ background: C.bgMid, border: `1px solid ${C.line}`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.gold }}>📈 Évolution historique</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {gBtn('week', 'Par semaine')}
            {gBtn('month', 'Par mois')}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          {kpiBtn('appels', 'Appels', C.green)}
          {kpiBtn('contacts', 'Contacts', C.indigo)}
          {kpiBtn('rdv_pris', 'RDV Pris', C.gold)}
          {kpiBtn('rdv_faits', 'RDV Faits', '#b07aee')}
        </div>

        {historyLoading ? (
          <div style={{ textAlign: 'center', color: C.textLo, padding: 20, fontSize: 10 }}>Chargement...</div>
        ) : history.length === 0 ? (
          <div style={{ textAlign: 'center', color: C.textLo, padding: 20, fontSize: 10 }}>Aucune donnée sur cette période</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={history} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.line} />
              <XAxis dataKey="label" tick={{ fill: C.textLo, fontSize: 8 }} stroke={C.line} />
              <YAxis tick={{ fill: C.textLo, fontSize: 9 }} stroke={C.line} />
              <Tooltip contentStyle={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 6, fontSize: 10, color: C.text }} />
              <Legend wrapperStyle={{ fontSize: 9 }} />
              <Line type="monotone" dataKey={selectedKpi} stroke={kpiColors[selectedKpi]} strokeWidth={2} name="Réalisé" dot={{ r: 3 }} />
              {history[0] && objKey in history[0] && (
                <Line type="monotone" dataKey={objKey} stroke={`${kpiColors[selectedKpi]}80`} strokeWidth={1.5} strokeDasharray="5 5" name="Objectif" dot={false} />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ═══════ COMPARATEUR DE SEMAINES ═══════ */}
      <div style={{ background: C.bgMid, border: `1px solid ${C.line}`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: C.gold, marginBottom: 12 }}>⚖️ Comparer avec une semaine</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <input
            type="week"
            value={compareWeek}
            onChange={e => setCompareWeek(e.target.value)}
            style={{ flex: 1, padding: 8, background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.text, fontSize: 10 }}
          />
          <button
            onClick={handleCompare}
            disabled={!compareWeek}
            style={{ padding: '8px 14px', background: compareWeek ? C.indigo : C.surface2, border: 'none', borderRadius: 6, color: '#fff', fontSize: 9, fontWeight: 600, cursor: compareWeek ? 'pointer' : 'not-allowed' }}
          >
            Comparer
          </button>
        </div>

        {comparison && kpiData && (
          <div>
            <div style={{ fontSize: 9, color: C.textMid, marginBottom: 10 }}>Semaine {comparison.week} ({comparison.year}) vs semaine en cours</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
              {([
                { label: 'Appels', current: kpiData.realise.appels, compare: comparison.appels, color: C.green },
                { label: 'Contacts', current: kpiData.realise.contacts, compare: comparison.contacts, color: C.indigo },
                { label: 'RDV Pris', current: kpiData.realise.rdv_pris, compare: comparison.rdv_pris, color: C.gold },
                { label: 'RDV Faits', current: kpiData.realise.rdv_faits, compare: comparison.rdv_faits, color: '#b07aee' },
              ]).map(({ label, current, compare, color }) => {
                const diff = compare > 0 ? Math.round(((current - compare) / compare) * 100) : 0
                return (
                  <div key={label} style={{ background: C.bgDeep, borderRadius: 6, padding: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: 8, color: C.textLo, marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color }}>{current}</div>
                    <div style={{ fontSize: 9, color: C.textLo, margin: '4px 0' }}>vs {compare}</div>
                    <div style={{ fontSize: 9, fontWeight: 600, color: diff >= 0 ? C.green : '#ff6b6b' }}>
                      {diff >= 0 ? '+' : ''}{diff}%
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ═══════ VUE MULTI-KPI (toutes les courbes) ═══════ */}
      <div style={{ background: C.bgMid, border: `1px solid ${C.line}`, borderRadius: 8, padding: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: C.gold, marginBottom: 12 }}>📊 Vue d'ensemble — tous les KPI</div>
        {historyLoading ? (
          <div style={{ textAlign: 'center', color: C.textLo, padding: 20, fontSize: 10 }}>Chargement...</div>
        ) : history.length === 0 ? (
          <div style={{ textAlign: 'center', color: C.textLo, padding: 20, fontSize: 10 }}>Aucune donnée</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={history} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.line} />
              <XAxis dataKey="label" tick={{ fill: C.textLo, fontSize: 8 }} stroke={C.line} />
              <YAxis tick={{ fill: C.textLo, fontSize: 9 }} stroke={C.line} />
              <Tooltip contentStyle={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 6, fontSize: 10, color: C.text }} />
              <Legend wrapperStyle={{ fontSize: 9 }} />
              <Bar dataKey="appels" fill={C.green} name="Appels" radius={[2, 2, 0, 0]} />
              <Bar dataKey="contacts" fill={C.indigo} name="Contacts" radius={[2, 2, 0, 0]} />
              <Bar dataKey="rdv_pris" fill={C.gold} name="RDV Pris" radius={[2, 2, 0, 0]} />
              <Bar dataKey="rdv_faits" fill="#b07aee" name="RDV Faits" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Navigation transversale Suivi */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
        <LinkButton href="/donnees" label="Données complètes" color="indigo" />
        <LinkButton href="/analytics" label="Analytics pipeline" color="green" />
        <LinkButton href="/revenue" label="CA mensuel" color="gold" />
      </div>
    </div>
  )
}

export default function GlobalPage() {
  const router = useRouter()
  const [tab, setTab] = useState<GlobalTab>('synthese')
  const [kpi, setKpi] = useState<GlobalKpi | null>(null)
  const [interpro, setInterpro] = useState<{ count: number; lastContact: string | null } | null>(null)
  const [commerce, setCommerce] = useState<{ contracts: number; revenue: number; target: number } | null>(null)
  const [weekScores, setWeekScores] = useState<{ label: string; pct: number; today: boolean }[] | null>(null)
  const [dailyObj, setDailyObj] = useState<{ calls: number; contacts: number; rdv1: number; rdv2: number } | null>(null)

  useEffect(() => { saveLastSection('/global') }, [])

  useEffect(() => {
    fetch('/api/global/stats')
      .then(r => r.json())
      .then(json => { if (json.success) setKpi(json.data) })
      .catch(() => {})
    fetch('/api/global/interpro')
      .then(r => r.json())
      .then(json => { if (json.success) setInterpro(json.data) })
      .catch(() => {})
    fetch('/api/global/commerce')
      .then(r => r.json())
      .then(json => { if (json.success) setCommerce(json.data) })
      .catch(() => {})
    fetch('/api/global/kpi/week-scores')
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setWeekScores(json.data.scores)
          setDailyObj(json.data.dailyObjectives)
        }
      })
      .catch(() => {})
  }, [])

  const tabBtn = (key: GlobalTab, label: string) => {
    const active = tab === key
    return (
      <button
        key={key}
        onClick={() => setTab(key)}
        style={{
          flex: 1, padding: 8, borderRadius: '6px 6px 0 0', border: 'none',
          background: active ? '#1a1400' : C.surface1,
          color: active ? C.gold : C.textLo,
          fontSize: 9, fontWeight: active ? 600 : 500, cursor: 'pointer',
          borderBottom: `2px solid ${active ? C.gold : 'transparent'}`,
        }}
      >{label}</button>
    )
  }

  const barDays = (weekScores ?? []).map(s => ({
    label: s.label,
    pct: s.pct,
    height: Math.max(Math.round((s.pct / 100) * 180), 10),
    bg: s.pct >= 80 ? '#2a5a2a' : s.pct >= 50 ? '#5a4f2a' : s.pct > 0 ? '#4a3f1a' : C.surface1,
    txtColor: s.today ? '#fff' : s.pct > 0 ? '#ccc' : C.textLo,
    today: s.today,
  }))

  return (
    <div style={{ background: C.bgDeep, minHeight: '100vh', padding: 16, color: C.text, fontFamily: 'JetBrains Mono, monospace' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap')`}</style>

      {/* Tab bar */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 6, borderBottom: `0.5px solid ${C.line}`, paddingBottom: 8 }}>
          {tabBtn('synthese', 'Vue Synthèse')}
          {tabBtn('planning', 'Rétro Planning RDV Fait')}
          {tabBtn('rdvpris', 'Rétro RDV Pris')}
          {tabBtn('suivi', 'Suivi')}
        </div>
      </div>

      {/* ─── SYNTHESE ─── */}
      {tab === 'synthese' && (
        <div>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.textHi, marginBottom: 8 }}>📊 Global - Vue Synthèse</div>
              <div style={{ fontSize: 9, color: C.textMid }}>Suivi quotidien et hebdomadaire des 4 piliers de performance</div>
            </div>
            <button
              onClick={() => window.open('/api/export/rdv', '_blank')}
              style={{
                padding: '8px 14px', borderRadius: 6,
                background: '#0d1a0d', border: `1px solid ${C.green}60`,
                color: C.green, fontSize: 10, fontWeight: 600, cursor: 'pointer',
              }}
            >
              📥 Export Excel RDV
            </button>
          </div>

          {/* KPI row — données réelles */}
          {(() => {
            const TARGET_CONTACTS = dailyObj ? (dailyObj.calls + dailyObj.contacts) : 10
            const TARGET_TASKS = 3
            const contactsPct = kpi ? Math.min(Math.round((kpi.prospection.calls_today + kpi.prospection.contacts_today) / TARGET_CONTACTS * 100), 100) : null
            const tasksPct    = kpi ? Math.min(Math.round(kpi.tasks.done_today / TARGET_TASKS * 100), 100) : null
            const perfJour    = contactsPct !== null && tasksPct !== null ? Math.round((contactsPct + tasksPct) / 2) : null
            const objAtteints = [
              kpi ? (kpi.prospection.calls_today + kpi.prospection.contacts_today) >= TARGET_CONTACTS : false,
              kpi ? kpi.tasks.done_today >= TARGET_TASKS : false,
              dailyObj && kpi ? kpi.prospection.rdv1_today >= dailyObj.rdv1 : false,
            ].filter(Boolean).length
            const totalObj = dailyObj ? 3 : 2
            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>
                {([
                  { label: 'Performance Jour',    value: perfJour !== null ? `${perfJour}%` : '–',  sub: perfJour === null ? 'Chargement…' : perfJour >= 80 ? '🟢 Excellente' : perfJour >= 50 ? '🟡 En cours' : '🔴 À rattraper', subColor: perfJour !== null && perfJour >= 80 ? C.green : C.gold },
                  { label: 'Prospects sem.',      value: kpi ? String(kpi.prospection.prospects_this_week) : '–', sub: 'Ajoutés cette semaine', subColor: C.green },
                  { label: 'Objectifs atteints',  value: kpi ? `${objAtteints}/${totalObj}` : '–', sub: 'Prospection · Tâches · RDV', subColor: C.gold },
                  { label: 'Tâches actives',      value: kpi ? String(kpi.tasks.active) : '–', sub: `${kpi?.tasks.this_week ?? '–'} cette semaine`, subColor: C.indigo },
                ] as Array<{ label: string; value: string; sub: string; subColor: string }>).map(({ label, value, sub, subColor }) => (
                  <div key={label} style={{ background: C.surface1, border: `0.5px solid ${C.line}`, borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 9, color: C.textMid, marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: C.textHi, marginBottom: 4 }}>{value}</div>
                    <div style={{ fontSize: 9, color: subColor }}>{sub}</div>
                  </div>
                ))}
              </div>
            )
          })()}

          {/* 4 Pillars */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 20 }}>

            {/* Prospection */}
            <div style={{ background: C.bgMid, borderRadius: 8, padding: 16, border: `0.5px solid ${C.line}` }}>
              {(() => {
                const TARGET_CONTACTS = dailyObj ? (dailyObj.calls + dailyObj.contacts) : 10
                const contactsVal = (kpi?.prospection.calls_today ?? 0) + (kpi?.prospection.contacts_today ?? 0)
                const pct = Math.min(Math.round(contactsVal / TARGET_CONTACTS * 100), 100)
                return (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.green }}>📞 Prospection</div>
                      <div style={{ background: '#0d1a0d', color: C.green, padding: '3px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>{kpi ? `${pct}%` : '–'}</div>
                    </div>
                    <div style={{ background: C.surface3, height: 8, borderRadius: 4, marginBottom: 12, overflow: 'hidden' }}>
                      <div style={{ background: C.green, height: '100%', width: `${pct}%`, transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 9, color: C.textMid }}>Appels + Contacts auj.</div>
                        <div style={{ fontSize: 10, color: C.textHi, fontWeight: 600 }}>{contactsVal}<span style={{ color: C.textLo }}>/{TARGET_CONTACTS}</span></div>
                      </div>
                      {kpi && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: 9, color: C.textMid }}>RDV pris auj.</div>
                          <div style={{ fontSize: 9, color: C.textLo }}>{kpi.prospection.rdv1_today}{dailyObj ? ` / ${dailyObj.rdv1}` : ''}</div>
                        </div>
                      )}
                      {kpi && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: 9, color: C.textMid }}>Prospects cette semaine</div>
                          <div style={{ fontSize: 9, color: C.textLo }}>{kpi.prospection.prospects_this_week}</div>
                        </div>
                      )}
                    </div>
                    <button onClick={() => router.push('/analytics')} style={{ width: '100%', marginTop: 10, padding: 6, background: '#0d1a0d', border: `0.5px solid ${C.green}40`, color: C.green, borderRadius: 4, fontSize: 8, cursor: 'pointer', fontWeight: 600 }}>
                      → Voir détails
                    </button>
                    <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                      <LinkChip href="/pipeline" label="Pipeline" color="indigo" />
                      <LinkChip href="/scoring" label="Scoring" color="purple" />
                      <LinkChip href="/donnees" label="Données" color="gold" />
                    </div>
                  </>
                )
              })()}
            </div>

            {/* Interpro */}
            <div style={{ background: C.bgMid, borderRadius: 8, padding: 16, border: `0.5px solid ${C.line}` }}>
              {(() => {
                const TARGET_INTERPRO = 3
                const interproCount = interpro?.count ?? 0
                const pct = Math.min(Math.round(interproCount / TARGET_INTERPRO * 100), 100)
                return (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.gold }}>🤝 Interpro</div>
                      <div style={{ background: '#1a1400', color: C.gold, padding: '3px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>{interpro ? `${pct}%` : '–'}</div>
                    </div>
                    <div style={{ background: C.surface3, height: 8, borderRadius: 4, marginBottom: 12, overflow: 'hidden' }}>
                      <div style={{ background: C.gold, height: '100%', width: `${pct}%`, transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 9, color: C.textMid }}>Partenaires actifs</div>
                        <div style={{ fontSize: 10, color: C.textHi, fontWeight: 600 }}>{interproCount}<span style={{ color: C.textLo }}>/{TARGET_INTERPRO}</span></div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 9, color: C.textMid }}>Dernier contact</div>
                        <div style={{ fontSize: 9, color: C.textLo }}>{interpro?.lastContact ?? '–'}</div>
                      </div>
                    </div>
                    <button onClick={() => router.push('/cercle')} style={{ width: '100%', marginTop: 10, padding: 6, background: '#1a1400', border: `0.5px solid ${C.gold}40`, color: C.gold, borderRadius: 4, fontSize: 8, cursor: 'pointer', fontWeight: 600 }}>
                      → Voir cercle
                    </button>
                    <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                      <LinkChip href="/clients" label="Clients" color="green" />
                      <LinkChip href="/crm" label="CRM" color="gold" />
                    </div>
                  </>
                )
              })()}
            </div>

            {/* Tâches */}
            <div style={{ background: C.bgMid, borderRadius: 8, padding: 16, border: `0.5px solid ${C.line}` }}>
              {(() => {
                const TARGET_TASKS = 3
                const doneTodayVal = kpi?.tasks.done_today ?? 0
                const pct = Math.min(Math.round(doneTodayVal / TARGET_TASKS * 100), 100)
                const highPrio = kpi?.tasks.high_priority_remaining ?? '–'
                return (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.indigo }}>✅ Tâches</div>
                      <div style={{ background: '#0d1a2e', color: C.indigo, padding: '3px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>{kpi ? `${pct}%` : '–'}</div>
                    </div>
                    <div style={{ background: C.surface3, height: 8, borderRadius: 4, marginBottom: 12, overflow: 'hidden' }}>
                      <div style={{ background: C.indigo, height: '100%', width: `${pct}%`, transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 9, color: C.textMid }}>Tâches complétées auj.</div>
                        <div style={{ fontSize: 10, color: C.textHi, fontWeight: 600 }}>{doneTodayVal}<span style={{ color: C.textLo }}>/{TARGET_TASKS}</span></div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 9, color: C.textMid }}>Haute priorité restantes</div>
                        <div style={{ fontSize: 9, color: highPrio === '–' || highPrio === 0 ? C.textLo : C.warn }}>{String(highPrio)}</div>
                      </div>
                      {kpi && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: 9, color: C.textMid }}>Actives en cours</div>
                          <div style={{ fontSize: 9, color: C.textLo }}>{kpi.tasks.active}</div>
                        </div>
                      )}
                    </div>
                    <button onClick={() => router.push('/tasks')} style={{ width: '100%', marginTop: 10, padding: 6, background: '#0d1a2e', border: `0.5px solid ${C.indigo}40`, color: C.indigo, borderRadius: 4, fontSize: 8, cursor: 'pointer', fontWeight: 600 }}>
                      → Voir tâches
                    </button>
                    <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                      <LinkChip href="/today" label="Aujourd'hui" color="cyan" />
                      <LinkChip href="/sequences" label="Séquences" color="green" />
                    </div>
                  </>
                )
              })()}
            </div>

            {/* Commerce */}
            <div style={{ background: C.bgMid, borderRadius: 8, padding: 16, border: `0.5px solid ${C.line}` }}>
              {(() => {
                const target = commerce?.target || 1
                const pct = commerce ? Math.min(Math.round((commerce.revenue / target) * 100), 100) : 0
                return (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#b07aee' }}>📚 Commerce</div>
                      <div style={{ background: '#140d1e', color: '#b07aee', padding: '3px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>{commerce ? `${pct}%` : '–'}</div>
                    </div>
                    <div style={{ background: C.surface3, height: 8, borderRadius: 4, marginBottom: 12, overflow: 'hidden' }}>
                      <div style={{ background: '#b07aee', height: '100%', width: `${pct}%`, transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 9, color: C.textMid }}>Contrats ce mois</div>
                        <div style={{ fontSize: 10, color: C.textHi, fontWeight: 600 }}>{commerce?.contracts ?? 0}</div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 9, color: C.textMid }}>CA vs Objectif</div>
                        <div style={{ fontSize: 9, color: C.textLo }}>{commerce ? `${(commerce.revenue / 1000).toFixed(0)}k / ${(commerce.target / 1000).toFixed(0)}k€` : '–'}</div>
                      </div>
                    </div>
                    <button onClick={() => router.push('/commerce')} style={{ width: '100%', marginTop: 10, padding: 6, background: '#140d1e', border: '0.5px solid #b07aee40', color: '#b07aee', borderRadius: 4, fontSize: 8, cursor: 'pointer', fontWeight: 600 }}>
                      → Voir formation
                    </button>
                    <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                      <LinkChip href="/revenue" label="Revenue" color="gold" />
                      <LinkChip href="/simulator" label="Simulateur" color="indigo" />
                    </div>
                  </>
                )
              })()}
            </div>

          </div>

          {/* Weekly bar chart */}
          <div style={{ background: C.bgMid, borderRadius: 8, padding: 16, border: `0.5px solid ${C.line}`, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.textHi, marginBottom: 12 }}>📈 Performance hebdomadaire</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 180 }}>
              {barDays.map(day => (
                <div key={day.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    height: day.height, width: '100%', background: day.bg, borderRadius: 8,
                    border: day.today ? `2px solid ${C.gold}` : undefined,
                    boxSizing: 'border-box',
                    display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 6,
                  }}>
                    <span style={{ fontSize: 9, color: day.txtColor, fontWeight: 600 }}>{day.pct}%</span>
                  </div>
                  <span style={{ fontSize: 8, color: day.today ? C.gold : C.textLo, fontWeight: day.today ? 600 : 400 }}>{day.label}</span>
                </div>
              ))}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ height: 24, width: '100%', background: C.surface1, borderRadius: 8, border: `1px dashed ${C.surface3}` }} />
                <span style={{ fontSize: 8, color: C.textVlo }}>Sam</span>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ height: 24, width: '100%', background: C.surface1, borderRadius: 8, border: `1px dashed ${C.surface3}` }} />
                <span style={{ fontSize: 8, color: C.textVlo }}>Dim</span>
              </div>
            </div>
          </div>

          {/* Score explanation */}
          <div style={{ background: '#0a1929', border: '1px solid #0a66c240', borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 10, color: C.indigo, fontWeight: 600, marginBottom: 6 }}>🧮 Calcul du score</div>
            <div style={{ fontSize: 9, color: C.textMid, lineHeight: 1.5 }}>
              <strong>Score Jour</strong> = (Appels + Contacts + RDV pris + RDV faits) / objectifs journaliers calculés<br />
              <strong>Score Semaine</strong> = Moyenne des scores quotidiens (Lun→Ven)<br />
              <br />
              Les objectifs journaliers sont calculés depuis tes objectifs annuels :<br />
              • Objectif annuel × intensité du mois / total intensités<br />
              • ÷ semaines du mois ÷ 5 jours ouvrés<br />
              <br />
              Configure tes objectifs dans l'onglet "Rétro Planning" pour personnaliser.
            </div>
          </div>

          {/* Navigation transversale */}
          <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
            <LinkButton href="/today" label="Actions du jour" color="cyan" />
            <LinkButton href="/revenue" label="Revenue détail" color="gold" />
            <LinkButton href="/donnees" label="Historique KPIs" color="indigo" />
          </div>
        </div>
      )}

      {/* ─── PLANNING ─── */}
      {tab === 'planning' && (
        <PlanningTabContent
          title="📅 Rétro Planning RDV Fait 2026"
          r1Key="obj_rdv_faits_annuel"
          r2Key="obj_rdv_pris_annuel"
          moneyKey="obj_collecte_annuel"
          r1Label="RDV R1 annuel"
          r2Label="RDV R2 annuel"
          moneyLabel="Collecte annuelle (€)"
          r1Default={200}
          r2Default={300}
          moneyDefault={100000000}
        />
      )}

      {/* ─── RDVPRIS ─── */}
      {tab === 'rdvpris' && (
        <PlanningTabContent
          title="📅 Rétro RDV Pris 2026"
          r1Key="obj_rdv_pris_annuel"
          r2Key="obj_appels_annuel"
          moneyKey="obj_propositions_annuel"
          r1Label="RDV Pris annuel"
          r2Label="Appels annuel"
          moneyLabel="Propositions annuelles"
          r1Default={300}
          r2Default={2400}
          moneyDefault={100}
        />
      )}

      {/* ─── SUIVI ─── */}
      {tab === 'suivi' && <SuiviTabContent />}
    </div>
  )
}
