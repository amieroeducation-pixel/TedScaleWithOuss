'use client'

import { useState } from 'react'
import { C } from '@/lib/theme'

type GlobalTab = 'synthese' | 'planning' | 'rdvpris' | 'suivi'
type SuiviPeriod = 'year' | 'month' | 'week'

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
const MONTH_WEEKS = ['4s','4s','4s','4s','4s','4s','4s','4s','5s','4s','4s','5s']

function MonthIntensityGrid() {
  const [values, setValues] = useState<Record<string,string>>(
    Object.fromEntries(MONTHS.map(m => [m, '1.0']))
  )
  const selectStyle = {
    width: '100%', padding: 4, background: C.surface1,
    border: `1px solid ${C.line}`, borderRadius: 4, color: C.text, fontSize: 11, textAlign: 'center' as const,
  }
  const renderRow = (slice: string[], offset: number) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 8, marginBottom: 8 }}>
      {slice.map((m, i) => (
        <div key={m} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 8, color: C.textLo, marginBottom: 4 }}>{m} ({MONTH_WEEKS[i + offset]})</div>
          <select value={values[m]} onChange={e => setValues(v => ({ ...v, [m]: e.target.value }))} style={selectStyle}>
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

function PlanningTabContent({ title, r1Label, r2Label, moneyLabel, r1Default, r2Default, moneyDefault }: {
  title: string; r1Label: string; r2Label: string; moneyLabel: string;
  r1Default: number; r2Default: number; moneyDefault: number
}) {
  const [legend, setLegend] = useState('-- Ignorer · ↘↘ -30% · ↘ -10% · - Normal · ↗ +10% · ↗↗ +30%')

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
            <input type="number" defaultValue={r1Default} min={0} max={2000} style={numInp(C.indigo)} />
          </div>
          <div>
            <label style={{ fontSize: 8, color: C.textLo, display: 'block', marginBottom: 4 }}>{r2Label}</label>
            <input type="number" defaultValue={r2Default} min={0} max={2000} style={numInp(C.green)} />
          </div>
          <div>
            <label style={{ fontSize: 8, color: C.textLo, display: 'block', marginBottom: 4 }}>{moneyLabel}</label>
            <input type="number" defaultValue={moneyDefault} min={0} max={10000000} step={1000} style={numInp(C.gold)} />
          </div>
        </div>
      </div>

      <div style={{ background: C.bgMid, border: `1px solid ${C.line}`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: C.gold, marginBottom: 8 }}>⚙️ Configuration des intensités</div>
        <div style={{ fontSize: 8, color: C.textLo, marginBottom: 12 }}>Définis le pourcentage de variation pour chaque symbole</div>
        <IntensityConfig onLegendChange={setLegend} />
        <div style={{ fontSize: 10, fontWeight: 600, color: C.gold, marginBottom: 8 }}>📅 Intensité par mois (sélectionne les symboles)</div>
        <div style={{ fontSize: 8, color: C.textLo, marginBottom: 12 }}>{legend}</div>
        <MonthIntensityGrid />
        <button style={{ width: '100%', padding: 10, background: C.indigo, border: 'none', borderRadius: 6, color: '#fff', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
          🔄 Actualiser et calculer
        </button>
      </div>

      <div style={{ background: C.bgMid, border: `1px solid ${C.line}`, borderRadius: 8, padding: 16, color: C.textMid, fontSize: 9 }}>
        Le planning calculé s'affichera ici après avoir cliqué sur Actualiser.
      </div>
    </div>
  )
}

function SuiviTabContent() {
  const [period, setPeriod] = useState<SuiviPeriod>('year')

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

  const numInp = (color: string) => ({
    width: '100%', padding: 8, background: C.surface1, border: `1px solid ${C.line}`,
    borderRadius: 6, color, fontSize: 14, fontWeight: 600, textAlign: 'center' as const,
  })

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.textHi, marginBottom: 8 }}>📊 Suivi Objectifs vs Réalisations</div>
        <div style={{ fontSize: 9, color: C.textLo }}>Compare tes objectifs planifiés avec tes résultats réels - Données modifiables</div>
      </div>

      <div style={{ background: C.bgMid, border: `1px solid ${C.line}`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: C.gold, marginBottom: 12 }}>🎯 Période d'analyse</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {pBtn('year', 'Année 2026')}
          {pBtn('month', 'Par mois')}
          {pBtn('week', 'Par semaine')}
        </div>
      </div>

      <div style={{ background: C.bgMid, border: `1px solid ${C.line}`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: C.gold, marginBottom: 8 }}>✍️ Données réelles (modifiables)</div>
        <div style={{ fontSize: 8, color: C.textMid, marginBottom: 12 }}>Les valeurs sont auto-remplies mais tu peux les modifier manuellement</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          <div>
            <label style={{ fontSize: 8, color: C.textLo, display: 'block', marginBottom: 4 }}>RDV R1 réalisés</label>
            <input type="number" defaultValue={150} min={0} max={2000} style={numInp(C.indigo)} />
          </div>
          <div>
            <label style={{ fontSize: 8, color: C.textLo, display: 'block', marginBottom: 4 }}>RDV R2 réalisés</label>
            <input type="number" defaultValue={90} min={0} max={2000} style={numInp(C.green)} />
          </div>
          <div>
            <label style={{ fontSize: 8, color: C.textLo, display: 'block', marginBottom: 4 }}>Collecte réelle (€)</label>
            <input type="number" defaultValue={400000} min={0} max={10000000} step={1000} style={numInp(C.gold)} />
          </div>
        </div>
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
          <div>
            <label style={{ fontSize: 8, color: C.textLo, display: 'block', marginBottom: 4 }}>RDV Pris (réel)</label>
            <input type="number" defaultValue={180} min={0} max={2000} style={numInp('#b07aee')} />
          </div>
          <div>
            <label style={{ fontSize: 8, color: C.textLo, display: 'block', marginBottom: 4 }}>Proposition réelle (€)</label>
            <input type="number" defaultValue={500000} min={0} max={10000000} step={1000} style={numInp(C.cyan)} />
          </div>
        </div>
      </div>

      <div style={{ background: C.bgMid, border: `1px solid ${C.line}`, borderRadius: 8, padding: 16, marginBottom: 16, color: C.textMid, fontSize: 9 }}>
        Le graphique s'affichera ici.
      </div>
      <div style={{ background: C.bgMid, border: `1px solid ${C.line}`, borderRadius: 8, padding: 16, color: C.textMid, fontSize: 9 }}>
        Le tableau de comparaison s'affichera ici.
      </div>
    </div>
  )
}

export default function GlobalPage() {
  const [tab, setTab] = useState<GlobalTab>('synthese')

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

  const barDays = [
    { label: 'Lun', pct: 85, height: 153, bg: '#4a3f1a', txtColor: '#999', today: false },
    { label: 'Mar', pct: 75, height: 135, bg: '#5a4f2a', txtColor: '#aaa', today: false },
    { label: 'Mer', pct: 55, height: 99,  bg: '#6a5f3a', txtColor: '#bbb', today: false },
    { label: 'Jeu', pct: 70, height: 126, bg: '#8a7f5a', txtColor: '#ccc', today: false },
    { label: 'Ven', pct: 68, height: 122, bg: '#aa9a6a', txtColor: '#fff', today: true },
  ]

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
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.textHi, marginBottom: 8 }}>📊 Global - Vue Synthèse</div>
            <div style={{ fontSize: 9, color: C.textMid }}>Suivi quotidien et hebdomadaire des 4 piliers de performance</div>
          </div>

          {/* KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>
            {([
              { label: 'Performance Jour',     value: '68%', sub: '🟡 En cours',                 subColor: C.gold  },
              { label: 'Performance Semaine',  value: '72%', sub: '+8% vs semaine dernière',      subColor: C.green },
              { label: 'Objectifs atteints',   value: '2/4', sub: 'Prospection + Tâches',         subColor: C.gold  },
              { label: 'Série active',         value: '5j',  sub: 'Record: 12j',                  subColor: C.green },
            ] as Array<{ label: string; value: string; sub: string; subColor: string }>).map(({ label, value, sub, subColor }) => (
              <div key={label} style={{ background: C.surface1, border: `0.5px solid ${C.line}`, borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 9, color: C.textMid, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: C.textHi, marginBottom: 4 }}>{value}</div>
                <div style={{ fontSize: 9, color: subColor }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* 4 Pillars */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 20 }}>

            {/* Prospection */}
            <div style={{ background: C.bgMid, borderRadius: 8, padding: 16, border: `0.5px solid ${C.line}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.green }}>📞 Prospection</div>
                <div style={{ background: '#0d1a0d', color: C.green, padding: '3px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>80%</div>
              </div>
              <div style={{ background: C.surface3, height: 8, borderRadius: 4, marginBottom: 12, overflow: 'hidden' }}>
                <div style={{ background: C.green, height: '100%', width: '80%', transition: 'width 0.3s' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 9, color: C.textMid }}>Contacts jour</div>
                  <div style={{ fontSize: 10, color: C.textHi, fontWeight: 600 }}>8<span style={{ color: C.textLo }}>/10</span></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 9, color: C.textMid }}>Blocs production</div>
                  <div style={{ fontSize: 10, color: C.textHi, fontWeight: 600 }}>3<span style={{ color: C.textLo }}>/4</span></div>
                </div>
              </div>
              <button style={{ width: '100%', marginTop: 10, padding: 6, background: '#0d1a0d', border: `0.5px solid ${C.green}40`, color: C.green, borderRadius: 4, fontSize: 8, cursor: 'pointer', fontWeight: 600 }}>
                → Voir détails
              </button>
            </div>

            {/* Interpro */}
            <div style={{ background: C.bgMid, borderRadius: 8, padding: 16, border: `0.5px solid ${C.line}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.gold }}>🤝 Interpro</div>
                <div style={{ background: '#1a1400', color: C.gold, padding: '3px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>67%</div>
              </div>
              <div style={{ background: C.surface3, height: 8, borderRadius: 4, marginBottom: 12, overflow: 'hidden' }}>
                <div style={{ background: C.gold, height: '100%', width: '67%', transition: 'width 0.3s' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 9, color: C.textMid }}>Contacts ID</div>
                  <div style={{ fontSize: 10, color: C.textHi, fontWeight: 600 }}>2<span style={{ color: C.textLo }}>/3</span></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 9, color: C.textMid }}>Dernière prise contact</div>
                  <div style={{ fontSize: 9, color: C.textLo }}>Hier 14h</div>
                </div>
              </div>
              <button style={{ width: '100%', marginTop: 10, padding: 6, background: '#1a1400', border: `0.5px solid ${C.gold}40`, color: C.gold, borderRadius: 4, fontSize: 8, cursor: 'pointer', fontWeight: 600 }}>
                → Voir cercle
              </button>
            </div>

            {/* Tâches */}
            <div style={{ background: C.bgMid, borderRadius: 8, padding: 16, border: `0.5px solid ${C.line}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.indigo }}>✅ Tâches</div>
                <div style={{ background: '#0d1a2e', color: C.indigo, padding: '3px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>100%</div>
              </div>
              <div style={{ background: C.surface3, height: 8, borderRadius: 4, marginBottom: 12, overflow: 'hidden' }}>
                <div style={{ background: C.indigo, height: '100%', width: '100%', transition: 'width 0.3s' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 9, color: C.textMid }}>Tâches complétées</div>
                  <div style={{ fontSize: 10, color: C.textHi, fontWeight: 600 }}>3<span style={{ color: C.textLo }}>/3</span></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 9, color: C.textMid }}>Haute priorité restantes</div>
                  <div style={{ fontSize: 9, color: C.textLo }}>0</div>
                </div>
              </div>
              <button style={{ width: '100%', marginTop: 10, padding: 6, background: '#0d1a2e', border: `0.5px solid ${C.indigo}40`, color: C.indigo, borderRadius: 4, fontSize: 8, cursor: 'pointer', fontWeight: 600 }}>
                → Voir tâches
              </button>
            </div>

            {/* Commerce */}
            <div style={{ background: C.bgMid, borderRadius: 8, padding: 16, border: `0.5px solid ${C.line}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#b07aee' }}>📚 Commerce</div>
                <div style={{ background: '#140d1e', color: '#b07aee', padding: '3px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>0%</div>
              </div>
              <div style={{ background: C.surface3, height: 8, borderRadius: 4, marginBottom: 12, overflow: 'hidden' }}>
                <div style={{ background: '#b07aee', height: '100%', width: '0%', transition: 'width 0.3s' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 9, color: C.textMid }}>Vidéo du jour</div>
                  <div style={{ fontSize: 10, color: C.textHi, fontWeight: 600 }}>0<span style={{ color: C.textLo }}>/1</span></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 9, color: C.textMid }}>Thème actuel</div>
                  <div style={{ fontSize: 9, color: C.textLo }}>Découverte</div>
                </div>
              </div>
              <button style={{ width: '100%', marginTop: 10, padding: 6, background: '#140d1e', border: '0.5px solid #b07aee40', color: '#b07aee', borderRadius: 4, fontSize: 8, cursor: 'pointer', fontWeight: 600 }}>
                → Voir formation
              </button>
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
            <div style={{ fontSize: 10, color: C.indigo, fontWeight: 600, marginBottom: 6 }}>🧮 Calcul du score global</div>
            <div style={{ fontSize: 9, color: C.textMid, lineHeight: 1.5 }}>
              <strong>Score Jour</strong> = Moyenne des 4 piliers (Prospection + Interpro + Tâches + Commerce) / 4<br />
              <strong>Score Semaine</strong> = Moyenne des scores quotidiens de lundi à vendredi<br />
              <br />
              Chaque pilier a son propre objectif 100% :<br />
              • Prospection : 10 contacts + 4 blocs = 100%<br />
              • Interpro : 3 contacts ID = 100%<br />
              • Tâches : 3 tâches faites = 100%<br />
              • Commerce : 1 vidéo vue = 100%
            </div>
          </div>
        </div>
      )}

      {/* ─── PLANNING ─── */}
      {tab === 'planning' && (
        <PlanningTabContent
          title="📅 Rétro Planning RDV Fait 2026"
          r1Label="RDV R1 annuel"
          r2Label="RDV R2 annuel"
          moneyLabel="Collecte annuelle (€)"
          r1Default={240}
          r2Default={144}
          moneyDefault={600000}
        />
      )}

      {/* ─── RDVPRIS ─── */}
      {tab === 'rdvpris' && (
        <PlanningTabContent
          title="📅 Rétro RDV Pris 2026"
          r1Label="RDV Pris R1 annuel"
          r2Label="RDV Pris R2 annuel"
          moneyLabel="Proposition annuelle (€)"
          r1Default={240}
          r2Default={144}
          moneyDefault={600000}
        />
      )}

      {/* ─── SUIVI ─── */}
      {tab === 'suivi' && <SuiviTabContent />}
    </div>
  )
}
