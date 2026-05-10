'use client'

import { useState } from 'react'
import { C } from '@/lib/theme'

type ScoreRow = { label: string; val: number }

const PROFESSIONS: ScoreRow[] = [
  { label: 'Chirurgien', val: 5 },
  { label: 'Radiologue', val: 5 },
  { label: 'Dentiste', val: 4 },
  { label: 'Pharmacien', val: 4 },
  { label: 'Médecin généraliste', val: 4 },
  { label: 'Kinésithérapeute', val: 3 },
  { label: 'Sophrologue', val: 3 },
  { label: 'Infirmier(e) lib.', val: 2 },
  { label: 'Ostéopathe', val: 2 },
]

const ZONES: ScoreRow[] = [
  { label: 'Paris 1–8e', val: 5 },
  { label: 'Paris 9–16e', val: 4 },
  { label: 'Neuilly / Boulogne', val: 4 },
  { label: 'Vincennes / Levallois', val: 4 },
  { label: 'Versailles / St-Germain', val: 4 },
  { label: 'Petite couronne', val: 3 },
  { label: 'Aulnay / St-Denis', val: 2 },
  { label: 'Grande couronne', val: 2 },
  { label: 'Zones périphériques', val: 1 },
]

function useStarRows(initial: ScoreRow[]) {
  const [rows, setRows] = useState<ScoreRow[]>(initial)
  const setVal = (idx: number, val: number) =>
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, val } : r))
  return { rows, setVal }
}

function Panel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: `linear-gradient(180deg,${C.surface1},${C.bgMid})`,
      border: `1px solid ${C.line}`, borderRadius: 10,
      padding: 16, position: 'relative', overflow: 'hidden', ...style,
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,#ff647066,transparent)' }} />
      {children}
    </div>
  )
}

function PanelTitle({ title }: { title: string }) {
  return (
    <div style={{
      fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 600,
      color: C.textHi, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12,
    }}>
      {title}
    </div>
  )
}

function StarRow({ label, val, onSet }: { label: string; val: number; onSet: (v: number) => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '5px 0', borderBottom: `0.5px solid ${C.lineSoft}`,
    }}>
      <div style={{ fontSize: 9, color: C.textMid, flex: 1, fontFamily: 'Inter,sans-serif' }}>{label}</div>
      <div style={{ display: 'flex', gap: 3 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <span
            key={i}
            onClick={() => onSet(i)}
            style={{
              fontSize: 14, cursor: 'pointer',
              color: i <= val ? C.gold : C.surface3,
              textShadow: i <= val ? `0 0 6px ${C.gold}88` : 'none',
              transition: 'color 0.15s',
            }}
          >
            ★
          </span>
        ))}
      </div>
    </div>
  )
}

export default function ScoringPage() {
  const prof = useStarRows(PROFESSIONS)
  const zone = useStarRows(ZONES)

  return (
    <>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap')"}</style>

      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ width: 3, height: 22, background: C.ribbon, borderRadius: 2 }} />
          <h1 style={{ fontFamily: 'Oswald,sans-serif', fontSize: 20, fontWeight: 600, color: C.textHi, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Scoring <span style={{ color: C.cyan }}>Patrimonial</span>
          </h1>
        </div>
        <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo, paddingLeft: 11 }}>
          Scoring patrimonial — configuration
        </div>
      </div>

      {/* Intro description */}
      <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo, marginBottom: 14, lineHeight: 1.6 }}>
        Score = moyenne(profession + zone). Modifiable à la volée, le Kanban se met à jour automatiquement.
      </div>

      {/* Two-column scoring */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Score par profession */}
        <Panel>
          <PanelTitle title="Score par profession" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {prof.rows.map((row, i) => (
              <StarRow key={row.label} label={row.label} val={row.val} onSet={v => prof.setVal(i, v)} />
            ))}
          </div>
        </Panel>

        {/* Score par zone */}
        <Panel>
          <PanelTitle title="Score par zone" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {zone.rows.map((row, i) => (
              <StarRow key={row.label} label={row.label} val={row.val} onSet={v => zone.setVal(i, v)} />
            ))}
          </div>
        </Panel>
      </div>
    </>
  )
}
