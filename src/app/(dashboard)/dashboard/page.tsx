'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { C } from '@/lib/theme'
import { AgendaEventType, AgendaEvent, AGENDA_COLORS, loadDayAgenda, saveDayAgenda, fantasticalUrl } from '@/lib/agenda'
import { saveLastSection } from '@/lib/navigation-state'

// ---------- TYPES ----------
type WeeklyData = {
  kpis: { calls: number; rdv: number; newProspects: number; contracts: number; targetAmount: number }
  barometer: { globalPct: number; callPct: number; callVal: string; blockPct: number; blockVal: string; relancePct: number; relanceVal: string }
  actions: Array<{ text: string; tag: string; urgent: boolean }>
}

// ---------- HELPERS ----------
function getWeekMonday(offset: number): Date {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function getWeekDates(offset: number): Array<{ dateKey: string; label: string }> {
  const monday = getWeekMonday(offset)
  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return {
      dateKey: d.toISOString().split('T')[0],
      label: `${days[i]} ${d.getDate()}`,
    }
  })
}

function getWeekHeader(offset: number): string {
  const monday = getWeekMonday(offset)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
  if (monday.getMonth() === sunday.getMonth()) {
    return `${monday.getDate()}–${sunday.getDate()} ${months[sunday.getMonth()]} ${sunday.getFullYear()}`
  }
  return `${monday.getDate()} ${months[monday.getMonth()]} – ${sunday.getDate()} ${months[sunday.getMonth()]} ${sunday.getFullYear()}`
}

// ---------- PAGE ----------
export default function WeeklyPage() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [weekAgenda, setWeekAgenda] = useState<Record<string, AgendaEvent[]>>({})
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ dateKey: '', time: '09:00', title: '', client: '', type: 'rdv' as AgendaEventType })
  const [weeklyData, setWeeklyData] = useState<WeeklyData | null>(null)
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => { saveLastSection('/dashboard') }, [])

  useEffect(() => {
    setLoadingData(true)
    fetch('/api/dashboard/weekly')
      .then(r => r.json())
      .then(res => { if (res.data) setWeeklyData(res.data) })
      .catch(() => {})
      .finally(() => setLoadingData(false))
  }, [])

  const reloadWeekAgenda = useCallback(() => {
    const dates = getWeekDates(weekOffset)
    const loaded: Record<string, AgendaEvent[]> = {}
    dates.forEach(d => { loaded[d.dateKey] = loadDayAgenda(d.dateKey) })
    setWeekAgenda(loaded)
  }, [weekOffset])

  useEffect(() => {
    reloadWeekAgenda()
    const dates = getWeekDates(weekOffset)
    setForm(f => ({ ...f, dateKey: dates[0].dateKey }))
  }, [weekOffset, reloadWeekAgenda])

  // Sync agenda across views (Today <-> Weekly)
  useEffect(() => {
    const handleAgendaChanged = () => reloadWeekAgenda()
    const handleStorage = (e: StorageEvent) => {
      if (e.key?.startsWith('shared_agenda_')) reloadWeekAgenda()
    }
    window.addEventListener('agenda-changed', handleAgendaChanged)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener('agenda-changed', handleAgendaChanged)
      window.removeEventListener('storage', handleStorage)
    }
  }, [reloadWeekAgenda])

  function addEvent() {
    if (!form.title.trim()) return
    const ev: AgendaEvent = {
      id: Date.now().toString(),
      time: form.time,
      title: form.title.trim(),
      client: form.client.trim() || undefined,
      type: form.type,
    }
    const dayEvents = [...(weekAgenda[form.dateKey] ?? []), ev]
    setWeekAgenda(prev => ({ ...prev, [form.dateKey]: dayEvents }))
    saveDayAgenda(form.dateKey, dayEvents)
    setForm(f => ({ ...f, title: '', client: '' }))
    setShowModal(false)
  }

  function removeEvent(dk: string, id: string) {
    const dayEvents = (weekAgenda[dk] ?? []).filter(e => e.id !== id)
    setWeekAgenda(prev => ({ ...prev, [dk]: dayEvents }))
    saveDayAgenda(dk, dayEvents)
  }

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap')`}</style>

      {/* ── Metrics row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
        {(loadingData || !weeklyData ? [
          { label: 'Appels semaine', value: '—', sub: 'Chargement...', subColor: C.textLo },
          { label: 'RDV semaine', value: '—', sub: 'Chargement...', subColor: C.textLo },
          { label: 'Nouveaux prospects', value: '—', sub: 'Chargement...', subColor: C.textLo },
          { label: 'Contrats mois', value: '—', sub: 'Chargement...', subColor: C.textLo },
        ] : [
          { label: 'Appels semaine', value: String(weeklyData.kpis.calls), sub: `Objectif 40`, subColor: weeklyData.kpis.calls >= 40 ? C.green : C.gold },
          { label: 'RDV semaine', value: String(weeklyData.kpis.rdv), sub: `Cette semaine`, subColor: C.green },
          { label: 'Nouveaux prospects', value: String(weeklyData.kpis.newProspects), sub: 'Cette semaine', subColor: C.green },
          { label: 'Contrats mois', value: String(weeklyData.kpis.contracts), sub: `Obj. ${weeklyData.kpis.targetAmount ? (weeklyData.kpis.targetAmount / 1000).toFixed(0) + 'k€' : '—'}`, subColor: C.gold },
        ]).map(m => (
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
          {(weeklyData?.actions ?? [
            { text: 'Chargement des tâches...', tag: '—', urgent: false },
          ]).map((item, i) => (
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
              <text x="90" y="73" textAnchor="middle" fontSize="20" fontWeight="500" fill={C.textHi}>{weeklyData?.barometer.globalPct ?? '—'}%</text>
              <text x="20" y="95" textAnchor="start" fontSize="9" fill={C.textLo}>0</text>
              <text x="160" y="95" textAnchor="end" fontSize="9" fill={C.textLo}>100</text>
            </svg>
          </div>
          <div style={{ fontSize: 9, color: C.textLo, textAlign: 'center', marginBottom: 14 }}>Objectif global semaine</div>
          {(weeklyData ? [
            { label: 'Appels', pct: weeklyData.barometer.callPct, val: weeklyData.barometer.callVal, color: C.green },
            { label: 'Blocs travail', pct: weeklyData.barometer.blockPct, val: weeklyData.barometer.blockVal, color: C.green },
            { label: 'Relances', pct: weeklyData.barometer.relancePct, val: weeklyData.barometer.relanceVal, color: C.indigo },
          ] : [
            { label: 'Appels', pct: 0, val: '—', color: C.green },
            { label: 'Blocs travail', pct: 0, val: '—', color: C.green },
            { label: 'Relances', pct: 0, val: '—', color: C.indigo },
          ]).map(bar => (
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
        {/* Header avec navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setWeekOffset(o => o - 1)}
              style={{ padding: '4px 10px', background: C.surface2, border: `1px solid ${C.line}`, color: C.textMid, borderRadius: 5, fontSize: 11, cursor: 'pointer' }}>←</button>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textHi, textTransform: 'uppercase' as const, letterSpacing: 1 }}>
              Agenda · {getWeekHeader(weekOffset)}
            </div>
            <button onClick={() => setWeekOffset(o => o + 1)}
              style={{ padding: '4px 10px', background: C.surface2, border: `1px solid ${C.line}`, color: C.textMid, borderRadius: 5, fontSize: 11, cursor: 'pointer' }}>→</button>
            {weekOffset !== 0 && (
              <button onClick={() => setWeekOffset(0)}
                style={{ padding: '4px 8px', background: '#1a1400', border: `1px solid ${C.gold}40`, color: C.gold, borderRadius: 5, fontSize: 8, cursor: 'pointer' }}>Aujourd&apos;hui</button>
            )}
          </div>
          <button onClick={() => setShowModal(true)}
            style={{ padding: '5px 12px', background: C.surface2, border: `1px solid ${C.indigo}`, color: C.indigo, borderRadius: 6, fontSize: 8, fontWeight: 600, cursor: 'pointer' }}>
            ➕ Ajouter
          </button>
        </div>

        {/* Grille 7 colonnes — liste par colonne */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6 }}>
          {getWeekDates(weekOffset).map(d => {
            const isToday = d.dateKey === new Date().toISOString().split('T')[0]
            const events = [...(weekAgenda[d.dateKey] ?? [])].sort((a, b) => a.time.localeCompare(b.time))
            return (
              <div key={d.dateKey}>
                <div style={{ fontSize: 9, fontWeight: 700, color: isToday ? C.gold : C.textMid, textAlign: 'center' as const, padding: '5px 4px', background: isToday ? '#1a1400' : C.surface2, borderRadius: 4, marginBottom: 4, border: isToday ? `1px solid ${C.gold}40` : 'none' }}>
                  {d.label}
                </div>
                {events.length === 0 ? (
                  <div style={{ fontSize: 8, color: C.textVlo, textAlign: 'center' as const, padding: '8px 0' }}>—</div>
                ) : (
                  events.map(ev => {
                    const col = AGENDA_COLORS[ev.type]
                    return (
                      <div key={ev.id} style={{ background: col.bg, border: `0.5px solid ${col.border}44`, borderLeft: `2px solid ${col.border}`, borderRadius: 4, padding: '4px 6px', marginBottom: 4 }}>
                        <div style={{ fontSize: 8, color: col.text, fontWeight: 600, fontFamily: 'JetBrains Mono,monospace' }}>{ev.time}</div>
                        <div style={{ fontSize: 9, color: C.textHi, lineHeight: 1.3 }}>{ev.title}</div>
                        {ev.client && <div style={{ fontSize: 7, color: C.textLo }}>{ev.client}</div>}
                        <div style={{ display: 'flex', gap: 2, marginTop: 3 }}>
                          <a href={fantasticalUrl(ev, d.dateKey)}
                            style={{ fontSize: 9, textDecoration: 'none', color: C.textVlo, cursor: 'pointer', lineHeight: 1 }}
                            title="Ouvrir dans Fantastical">📲</a>
                          <button onClick={() => removeEvent(d.dateKey, ev.id)}
                            style={{ background: 'none', border: 'none', color: C.textVlo, cursor: 'pointer', fontSize: 8, padding: 0, lineHeight: 1 }}>✕</button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal ajout événement */}
      {showModal && (
        <div onClick={() => setShowModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.bgMid, border: `1px solid ${C.indigo}30`, borderRadius: 14, padding: 24, width: '100%', maxWidth: 420, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: C.ribbon, borderRadius: '14px 14px 0 0' }} />
            <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 14, fontWeight: 600, color: C.indigo, marginBottom: 18, marginTop: 4 }}>📅 Nouvel événement</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 5 }}>Jour</label>
                <select value={form.dateKey} onChange={e => setForm(f => ({ ...f, dateKey: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textHi, fontSize: 11 }}>
                  {getWeekDates(weekOffset).map(d => (
                    <option key={d.dateKey} value={d.dateKey}>{d.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 5 }}>Heure</label>
                <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textHi, fontSize: 12, boxSizing: 'border-box' as const }} />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 5 }}>Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as AgendaEventType }))}
                style={{ width: '100%', padding: '8px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textHi, fontSize: 11 }}>
                <option value="rdv">🔵 RDV</option>
                <option value="bloc">🟢 Bloc production</option>
                <option value="tache">⚪ Tâche</option>
                <option value="sport">🔴 Sport</option>
                <option value="commerce">🟡 Commerce</option>
                <option value="interpro">🟡 Interpro</option>
                <option value="autre">⚫ Autre</option>
              </select>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 5 }}>Titre *</label>
              <input autoFocus type="text" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') addEvent() }}
                placeholder="Ex: RDV Dr. Martin, Bloc appels TNS..."
                style={{ width: '100%', padding: '8px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textHi, fontSize: 11, fontFamily: 'JetBrains Mono,monospace', boxSizing: 'border-box' as const }} />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 5 }}>Client / Lieu (optionnel)</label>
              <input type="text" value={form.client}
                onChange={e => setForm(f => ({ ...f, client: e.target.value }))}
                placeholder="Ex: Dr. Martin · 16e"
                style={{ width: '100%', padding: '8px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textHi, fontSize: 11, fontFamily: 'JetBrains Mono,monospace', boxSizing: 'border-box' as const }} />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: 10, borderRadius: 8, background: C.surface1, border: `1px solid ${C.line}`, color: C.textLo, fontFamily: 'Oswald,sans-serif', fontSize: 11, cursor: 'pointer' }}>ANNULER</button>
              <button onClick={addEvent} disabled={!form.title.trim()}
                style={{ flex: 2, padding: 10, borderRadius: 8, background: '#0d1a2e', border: `1px solid ${C.indigo}66`, color: C.indigo, fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 600, cursor: form.title.trim() ? 'pointer' : 'not-allowed', opacity: form.title.trim() ? 1 : 0.6 }}>AJOUTER</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
