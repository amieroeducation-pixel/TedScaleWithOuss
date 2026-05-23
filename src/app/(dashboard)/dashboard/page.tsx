'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { C } from '@/lib/theme'

// ---------- TYPES ----------
type EventType = 'rdv' | 'bloc' | 'sport' | 'tache' | 'commerce' | 'interpro'
type DayKey = 'lun' | 'mar' | 'mer' | 'jeu' | 'ven'

interface AgendaEvent {
  id: string
  hour: string
  title: string
  client?: string
  type: EventType
}

type WeekAgenda = Record<DayKey, AgendaEvent[]>

const EVENT_COLORS: Record<EventType, { bg: string; border: string; text: string }> = {
  rdv:      { bg: 'rgba(122,146,232,0.12)', border: '#7a92e8', text: '#7a92e8' },
  bloc:     { bg: 'rgba(74,222,128,0.10)',  border: '#4ade80', text: '#4ade80' },
  sport:    { bg: 'rgba(255,100,112,0.12)', border: '#ff6470', text: '#ff6470' },
  tache:    { bg: 'rgba(216,136,74,0.10)',  border: '#d8884a', text: '#8ea0d9' },
  commerce: { bg: 'rgba(232,200,120,0.10)', border: '#e8c878', text: '#e8c878' },
  interpro: { bg: 'rgba(232,200,120,0.14)', border: '#e8c878', text: '#e8c878' },
}

const HOURS = ['8h', '9h', '10h', '11h', '12h', '13h', '14h', '15h', '16h', '17h', '18h']
const DAY_KEYS: DayKey[] = ['lun', 'mar', 'mer', 'jeu', 'ven']
const EMPTY_WEEK: WeekAgenda = { lun: [], mar: [], mer: [], jeu: [], ven: [] }

// ---------- HELPERS ----------
function getWeekKey(): string {
  const now = new Date()
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

function getWeekDays(): Array<{ key: DayKey; label: string }> {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  const shorts = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven']
  return DAY_KEYS.map((key, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return { key, label: `${shorts[i]} ${d.getDate()}` }
  })
}

function getWeekHeader(): string {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)
  const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
  if (monday.getMonth() === friday.getMonth()) {
    return `${monday.getDate()}-${friday.getDate()} ${months[friday.getMonth()]} ${friday.getFullYear()}`
  }
  return `${monday.getDate()} ${months[monday.getMonth()]} – ${friday.getDate()} ${months[friday.getMonth()]} ${friday.getFullYear()}`
}

function loadWeekAgenda(): WeekAgenda {
  try {
    const s = localStorage.getItem(`week_agenda_${getWeekKey()}`)
    if (s) return { ...EMPTY_WEEK, ...JSON.parse(s) }
  } catch { /* ignore */ }
  return { lun: [], mar: [], mer: [], jeu: [], ven: [] }
}

function saveWeekAgenda(agenda: WeekAgenda) {
  try { localStorage.setItem(`week_agenda_${getWeekKey()}`, JSON.stringify(agenda)) } catch { /* ignore */ }
}

// ---------- PAGE ----------
export default function WeeklyPage() {
  const [agenda, setAgenda] = useState<WeekAgenda>(EMPTY_WEEK)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ day: 'lun' as DayKey, hour: '9h', title: '', client: '', type: 'rdv' as EventType })

  useEffect(() => {
    setAgenda(loadWeekAgenda())
  }, [])

  const days = getWeekDays()

  function addEvent() {
    if (!form.title.trim()) return
    const ev: AgendaEvent = {
      id: Date.now().toString(),
      hour: form.hour,
      title: form.title.trim(),
      client: form.client.trim() || undefined,
      type: form.type,
    }
    const next = { ...agenda, [form.day]: [...agenda[form.day], ev] }
    setAgenda(next)
    saveWeekAgenda(next)
    setForm(f => ({ ...f, title: '', client: '' }))
    setShowModal(false)
  }

  function removeEvent(day: DayKey, id: string) {
    const next = { ...agenda, [day]: agenda[day].filter(e => e.id !== id) }
    setAgenda(next)
    saveWeekAgenda(next)
  }

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap')`}</style>

      {/* ── Metrics row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'CA avril',     value: '18 400 €', sub: '↑ +12% vs mars',     subColor: C.green },
          { label: 'Taux closing', value: '34%',       sub: 'Objectif 40%',        subColor: C.gold },
          { label: 'RDV semaine',  value: '7',          sub: '5 conf. · 2 en att.', subColor: C.green },
          { label: 'À relancer',   value: '12',         sub: 'Prospects actifs',    subColor: C.gold },
        ].map(m => (
          <div key={m.label} style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: C.textLo, marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: 1 }}>{m.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.textHi, fontFamily: 'Oswald, sans-serif' }}>{m.value}</div>
            <div style={{ fontSize: 10, color: m.subColor, marginTop: 4 }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Two-column: Actions + Barometre ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>

        {/* Actions prioritaires */}
        <div style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textHi, marginBottom: 12, textTransform: 'uppercase' as const, letterSpacing: 1 }}>
            Actions prioritaires
          </div>
          {[
            { text: 'Sophie Renaud — 34j sans contact — appel urgent', tag: 'Premium', urgent: true },
            { text: 'Dr. Rousseau — closing RDV 3 cette semaine',      tag: 'Premium', urgent: true },
            { text: 'Antoine Perrin — proposition upsell SCPI',        tag: 'Premium', urgent: true },
            { text: 'Relancer Dr. Martin — RDV 2 en attente 5j',      tag: 'Relance', urgent: false },
            { text: 'Confirmer RDV mer. 16h — Mme Chen',              tag: 'À confirmer', urgent: false },
            { text: 'Séquence email post-RDV 1 × 4 prospects',        tag: 'Auto',     urgent: false },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '7px 10px', marginBottom: 6,
              background: item.urgent ? `${C.gold}0a` : C.surface2,
              border: `1px solid ${item.urgent ? C.gold + '44' : C.lineSoft}`,
              borderLeft: `3px solid ${item.urgent ? C.gold : C.indigo}`,
              borderRadius: 6,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1, minWidth: 0 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.urgent ? C.gold : C.indigo, flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: C.text, lineHeight: 1.4 }}>{item.text}</span>
              </div>
              <span style={{
                fontSize: 8, padding: '2px 7px', borderRadius: 10, flexShrink: 0, marginLeft: 8,
                background: item.urgent ? `${C.gold}20` : `${C.indigo}20`,
                color: item.urgent ? C.gold : C.indigo,
                border: `0.5px solid ${item.urgent ? C.gold + '60' : C.indigo + '60'}`,
                fontWeight: 600,
              }}>{item.tag}</span>
            </div>
          ))}
        </div>

        {/* Baromètre objectifs */}
        <div style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textHi, marginBottom: 12, textTransform: 'uppercase' as const, letterSpacing: 1 }}>
            Baromètre objectifs semaine
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
            <svg width="180" height="100" viewBox="0 0 180 100">
              <defs>
                <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" style={{ stopColor: '#ff6470', stopOpacity: 1 }} />
                  <stop offset="40%" style={{ stopColor: '#e8c878', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#4ade80', stopOpacity: 1 }} />
                </linearGradient>
              </defs>
              <path d="M 20 80 A 70 70 0 0 1 160 80" fill="none" stroke={C.surface3} strokeWidth="14" strokeLinecap="round" />
              <path d="M 20 80 A 70 70 0 0 1 160 80" fill="none" stroke="url(#gaugeGrad)" strokeWidth="14" strokeLinecap="round" strokeDasharray="220" strokeDashoffset="0" />
              <line x1="90" y1="80" x2="125" y2="45" stroke={C.gold} strokeWidth="3" strokeLinecap="round" />
              <circle cx="90" cy="80" r="5" fill={C.gold} />
              <text x="90" y="73" textAnchor="middle" fontSize="20" fontWeight="500" fill={C.textHi}>68%</text>
              <text x="20" y="95" textAnchor="start" fontSize="9" fill={C.textLo}>0</text>
              <text x="160" y="95" textAnchor="end" fontSize="9" fill={C.textLo}>100</text>
            </svg>
          </div>
          <div style={{ fontSize: 9, color: C.textLo, textAlign: 'center', marginBottom: 14 }}>Objectif global semaine</div>
          {[
            { label: 'Appels',        pct: 75, val: '30/40', color: C.green },
            { label: 'Blocs travail', pct: 60, val: '9/15',  color: C.green },
            { label: 'Relances',      pct: 50, val: '6/12',  color: C.indigo },
          ].map(bar => (
            <div key={bar.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ fontSize: 9, color: C.textLo, width: 80, flexShrink: 0 }}>{bar.label}</div>
              <div style={{ flex: 1, background: C.surface3, height: 8, borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ width: `${bar.pct}%`, height: '100%', background: bar.color, borderRadius: 10 }} />
              </div>
              <div style={{ fontSize: 9, color: bar.color, width: 35, textAlign: 'right' as const, fontWeight: 500 }}>{bar.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Agenda hebdomadaire ── */}
      <div style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 10, padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textHi, textTransform: 'uppercase' as const, letterSpacing: 1 }}>
            Agenda hebdomadaire · {getWeekHeader()}
          </div>
          <button
            onClick={() => setShowModal(true)}
            style={{ padding: '5px 12px', background: C.surface2, border: `1px solid ${C.indigo}`, color: C.indigo, borderRadius: 6, fontSize: 8, fontWeight: 600, cursor: 'pointer' }}
          >
            ➕ Ajouter événement
          </button>
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '36px repeat(5,1fr)', gap: 4 }}>
          {/* Header */}
          <div />
          {days.map(d => (
            <div key={d.key} style={{ fontSize: 9, fontWeight: 700, color: C.textMid, textAlign: 'center', padding: '4px 0', background: C.surface2, borderRadius: 4 }}>
              {d.label}
            </div>
          ))}

          {/* Rows */}
          {HOURS.map((h, hi) => (
            <>
              <div key={`h-${hi}`} style={{ fontSize: 8, color: C.textLo, paddingTop: 4, textAlign: 'right' as const, paddingRight: 6 }}>{h}</div>
              {DAY_KEYS.map(dayKey => {
                const eventsHere = agenda[dayKey].filter(e => e.hour === h)
                return (
                  <div key={`${dayKey}-${hi}`} style={{ minHeight: 32, borderRadius: 4 }}>
                    {eventsHere.length === 0 ? (
                      <div style={{ height: 32 }} />
                    ) : (
                      eventsHere.map(ev => {
                        const col = EVENT_COLORS[ev.type]
                        return (
                          <div key={ev.id} style={{ position: 'relative', background: col.bg, border: `1px solid ${col.border}44`, borderLeft: `2px solid ${col.border}`, borderRadius: 4, padding: '3px 20px 3px 6px', marginBottom: 4, minHeight: 28 }}>
                            <div style={{ fontSize: 9, color: col.text, fontWeight: 600, lineHeight: 1.3 }}>{ev.title}</div>
                            {ev.client && <div style={{ fontSize: 8, color: C.textLo, lineHeight: 1.2 }}>{ev.client}</div>}
                            <button
                              onClick={() => removeEvent(dayKey, ev.id)}
                              style={{ position: 'absolute', top: 3, right: 4, background: 'none', border: 'none', color: C.textVlo, cursor: 'pointer', fontSize: 9, padding: 0, lineHeight: 1 }}
                            >✕</button>
                          </div>
                        )
                      })
                    )}
                  </div>
                )
              })}
            </>
          ))}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const, marginTop: 12 }}>
          {(Object.entries(EVENT_COLORS) as [EventType, typeof EVENT_COLORS[EventType]][]).map(([type, col]) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: col.border }} />
              <span style={{ fontSize: 9, color: C.textLo, textTransform: 'capitalize' as const }}>{type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Modal ajout événement */}
      {showModal && (
        <div onClick={() => setShowModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.bgMid, border: `1px solid ${C.indigo}30`, borderRadius: 14, padding: 24, width: '100%', maxWidth: 420, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: C.ribbon, borderRadius: '14px 14px 0 0' }} />
            <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 14, fontWeight: 600, color: C.indigo, marginBottom: 18, marginTop: 4 }}>➕ Nouvel événement</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 5 }}>Jour</label>
                <select value={form.day} onChange={e => setForm(f => ({ ...f, day: e.target.value as DayKey }))}
                  style={{ width: '100%', padding: '8px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textHi, fontSize: 11 }}>
                  {days.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 5 }}>Heure</label>
                <select value={form.hour} onChange={e => setForm(f => ({ ...f, hour: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textHi, fontSize: 11 }}>
                  {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 5 }}>Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as EventType }))}
                style={{ width: '100%', padding: '8px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textHi, fontSize: 11 }}>
                <option value="rdv">🔵 RDV</option>
                <option value="bloc">🟢 Bloc production</option>
                <option value="tache">⚪ Tâche</option>
                <option value="sport">🔴 Sport</option>
                <option value="commerce">🟡 Commerce</option>
                <option value="interpro">🟡 Interpro</option>
              </select>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 5 }}>Titre *</label>
              <input
                autoFocus type="text" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') addEvent() }}
                placeholder="Ex: RDV Dr. Martin, Bloc appels TNS..."
                style={{ width: '100%', padding: '8px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textHi, fontSize: 11, fontFamily: 'JetBrains Mono,monospace', boxSizing: 'border-box' as const }}
              />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 5 }}>Client / Lieu (optionnel)</label>
              <input
                type="text" value={form.client}
                onChange={e => setForm(f => ({ ...f, client: e.target.value }))}
                placeholder="Ex: Dr. Martin · 📍 16e"
                style={{ width: '100%', padding: '8px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textHi, fontSize: 11, fontFamily: 'JetBrains Mono,monospace', boxSizing: 'border-box' as const }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: 10, borderRadius: 8, background: C.surface1, border: `1px solid ${C.line}`, color: C.textLo, fontFamily: 'Oswald,sans-serif', fontSize: 11, cursor: 'pointer' }}>ANNULER</button>
              <button
                onClick={addEvent}
                disabled={!form.title.trim()}
                style={{ flex: 2, padding: 10, borderRadius: 8, background: '#0d1a2e', border: `1px solid ${C.indigo}66`, color: C.indigo, fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 600, cursor: form.title.trim() ? 'pointer' : 'not-allowed', opacity: form.title.trim() ? 1 : 0.6 }}
              >AJOUTER</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
