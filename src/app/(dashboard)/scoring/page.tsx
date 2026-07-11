'use client'

import { useState, useEffect } from 'react'
import { C } from '@/lib/theme'
import { LinkButton, LinkChip } from '@/lib/cross-links'

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

type ProspectRow = { id: string; full_name: string; profession: string | null; city: string | null; lead_score: number | null; pipeline_stage: string | null }

export default function ScoringPage() {
  const prof = useStarRows(PROFESSIONS)
  const zone = useStarRows(ZONES)
  const [topProspects, setTopProspects] = useState<ProspectRow[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data?.scoring_grids) {
          const g = json.data.scoring_grids
          if (g.professions) g.professions.forEach((row: ScoreRow, i: number) => prof.setVal(i, row.val))
          if (g.zones) g.zones.forEach((row: ScoreRow, i: number) => zone.setVal(i, row.val))
        }
      })
      .catch(() => {})
    fetch('/api/prospects?limit=50')
      .then(r => r.json())
      .then(json => {
        if (json.success && Array.isArray(json.data)) {
          const sorted = [...json.data]
            .sort((a, b) => (b.lead_score ?? 0) - (a.lead_score ?? 0))
            .slice(0, 8)
          setTopProspects(sorted)
        }
      })
      .catch(() => {})
  }, [])

  async function saveGrids() {
    setSaving(true)
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scoring_grids: { professions: prof.rows, zones: zone.rows } }),
    }).catch(() => {})
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

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

      {/* Top prospects scorés */}
      {topProspects.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Panel style={{ paddingBottom: 8 }}>
            <PanelTitle title="Top prospects — par lead score" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {topProspects.map((p, i) => {
                const score = p.lead_score ?? 0
                const scoreCol = score >= 80 ? C.green : score >= 60 ? C.gold : C.cyan
                return (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '6px 0', borderBottom: `0.5px solid ${C.lineSoft}`,
                  }}>
                    <span style={{ fontSize: 9, color: C.textVlo, width: 14, textAlign: 'right', fontFamily: 'JetBrains Mono,monospace' }}>{i + 1}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, color: C.textHi, fontWeight: 600 }}>{p.full_name}</div>
                      {(p.profession || p.city) && (
                        <div style={{ fontSize: 8, color: C.textLo }}>{[p.profession, p.city].filter(Boolean).join(' — ')}</div>
                      )}
                    </div>
                    <div style={{ fontSize: 8, color: C.textLo, fontFamily: 'JetBrains Mono,monospace' }}>
                      {p.pipeline_stage ?? '—'}
                    </div>
                    <div style={{
                      fontSize: 11, fontWeight: 800, color: scoreCol,
                      background: scoreCol + '22', borderRadius: 4, padding: '1px 7px',
                      fontFamily: 'JetBrains Mono,monospace',
                    }}>{score}</div>
                  </div>
                )
              })}
            </div>
          </Panel>
        </div>
      )}
      {topProspects.length === 0 && (
        <div style={{
          padding: '12px 16px', borderRadius: 8, marginBottom: 16,
          background: C.surface1, border: `1px solid ${C.lineSoft}`,
          fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo, textAlign: 'center',
        }}>
          Aucun prospect scoré — ajoutez des prospects depuis le CRM pour voir leur classement ici.
        </div>
      )}

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

      {/* Save button */}
      <div style={{ marginTop: 16 }}>
        <button
          onClick={saveGrids}
          disabled={saving}
          style={{
            width: '100%', padding: 12, borderRadius: 8, border: 'none',
            background: saved ? '#0d1a0d' : saving ? C.surface2 : `linear-gradient(90deg,${C.gold},${C.indigo})`,
            color: '#fff', fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 600,
            letterSpacing: '0.1em', cursor: saving ? 'wait' : 'pointer',
          }}
        >
          {saving ? '⏳ Sauvegarde...' : saved ? '✅ Grilles sauvegardées !' : '💾 SAUVEGARDER LES GRILLES'}
        </button>
      </div>

      {/* Navigation transversale */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
        <LinkButton href="/crm" label="CRM Kanban" color="gold" />
        <LinkButton href="/map" label="Carte prospection" color="indigo" />
        <LinkButton href="/prospection/tns" label="Prospecter TNS" color="cyan" />
        <LinkButton href="/settings" label="Config scoring" color="purple" />
      </div>
    </>
  )
}
