'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { C } from '@/lib/theme'
import { AgendaEventType, AgendaEvent, AGENDA_COLORS, loadDayAgenda, saveDayAgenda, fantasticalUrl } from '@/lib/agenda'
import { saveLastSection } from '@/lib/navigation-state'
import { LinkButton, LinkBadge, LinkChip, buildHref } from '@/lib/cross-links'

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
  const router = useRouter()
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
          { label: 'Appels semaine', value: '—', sub: 'Chargement...', subColor: C.textLo, target: null },
          { label: 'RDV semaine', value: '—', sub: 'Chargement...', subColor: C.textLo, target: null },
          { label: 'Nouveaux prospects', value: '—', sub: 'Chargement...', subColor: C.textLo, target: null },
          { label: 'Contrats mois', value: '—', sub: 'Chargement...', subColor: C.textLo, target: null },
        ] : [
          { label: 'Appels semaine', value: String(weeklyData.kpis.calls), sub: `Objectif 40`, subColor: weeklyData.kpis.calls >= 40 ? C.green : C.gold, target: '/today?tab=relances' },
          { label: 'RDV semaine', value: String(weeklyData.kpis.rdv), sub: `Cette semaine`, subColor: C.green, target: '/pipeline' },
          { label: 'Nouveaux prospects', value: String(weeklyData.kpis.newProspects), sub: 'Cette semaine', subColor: C.green, target: '/crm' },
          { label: 'Contrats mois', value: String(weeklyData.kpis.contracts), sub: `Obj. ${weeklyData.kpis.targetAmount ? (weeklyData.kpis.targetAmount / 1000).toFixed(0) + 'k€' : '—'}`, subColor: C.gold, target: '/revenue' },
        ]).map(m => (
          <div
            key={m.label}
            onClick={m.target ? () => router.push(m.target) : undefined}
            style={{
              background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 10, padding: '14px 16px',
              cursor: m.target ? 'pointer' : 'default',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (m.target) {
                e.currentTarget.style.borderColor = m.subColor
                e.currentTarget.style.transform = 'translateY(-2px)'
              }
            }}
            onMouseLeave={(e) => {
              if (m.target) {
                e.currentTarget.style.borderColor = C.line
                e.currentTarget.style.transform = 'translateY(0)'
              }
            }}>
            <div style={{ fontSize: 10, color: C.textLo, marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: 1 }}>
              {m.label} {m.target && <span style={{ color: m.subColor }}>→</span>}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.textHi, fontFamily: 'Oswald, sans-serif' }}>{m.value}</div>
            <div style={{ fontSize: 10, color: m.subColor, marginTop: 4 }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Liens transversaux après KPI cards */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, justifyContent: 'center' }}>
        <LinkChip href={buildHref('/today', { tab: 'prospection' })} label="Today" color="cyan" />
        <LinkChip href="/global" label="Vue globale" color="indigo" />
        <LinkChip href="/revenue" label="Revenue" color="gold" />
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
            <div
              key={i}
              onClick={() => router.push('/tasks')}
              style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '7px 10px', marginBottom: 6,
              background: item.urgent ? `${C.gold}0a` : C.surface2,
              border: `1px solid ${item.urgent ? C.gold + '44' : C.lineSoft}`,
              borderLeft: `3px solid ${item.urgent ? C.gold : C.indigo}`,
              borderRadius: 6,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateX(4px)'
                e.currentTarget.style.borderColor = item.urgent ? C.gold : C.indigo
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateX(0)'
                e.currentTarget.style.borderColor = item.urgent ? C.gold + '44' : C.lineSoft
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
              }}>{item.tag} →</span>
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
            { label: 'Appels', pct: weeklyData.barometer.callPct, val: weeklyData.barometer.callVal, color: C.green, target: '/today?tab=relances' },
            { label: 'Blocs travail', pct: weeklyData.barometer.blockPct, val: weeklyData.barometer.blockVal, color: C.green, target: '/today' },
            { label: 'Relances', pct: weeklyData.barometer.relancePct, val: weeklyData.barometer.relanceVal, color: C.indigo, target: '/crm' },
          ] : [
            { label: 'Appels', pct: 0, val: '—', color: C.green, target: null },
            { label: 'Blocs travail', pct: 0, val: '—', color: C.green, target: null },
            { label: 'Relances', pct: 0, val: '—', color: C.indigo, target: null },
          ]).map(bar => (
            <div
              key={bar.label}
              onClick={bar.target ? () => router.push(bar.target) : undefined}
              style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: bar.target ? 'pointer' : 'default', transition: 'all 0.2s ease' }}
              onMouseEnter={(e) => {
                if (bar.target) {
                  e.currentTarget.style.transform = 'translateX(4px)'
                }
              }}
              onMouseLeave={(e) => {
                if (bar.target) {
                  e.currentTarget.style.transform = 'translateX(0)'
                }
              }}>
              <div style={{ fontSize: 9, color: C.textLo, width: 80, flexShrink: 0 }}>
                {bar.label} {bar.target && <span style={{ color: bar.color }}>→</span>}
              </div>
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
                    const isRdv = ev.type === 'rdv'
                    return (
                      <div
                        key={ev.id}
                        onClick={isRdv ? () => router.push('/pipeline') : undefined}
                        style={{
                          background: col.bg, border: `0.5px solid ${col.border}44`, borderLeft: `2px solid ${col.border}`, borderRadius: 4, padding: '4px 6px', marginBottom: 4,
                          cursor: isRdv ? 'pointer' : 'default',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (isRdv) {
                            e.currentTarget.style.borderColor = col.border
                            e.currentTarget.style.transform = 'scale(1.02)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (isRdv) {
                            e.currentTarget.style.borderColor = col.border + '44'
                            e.currentTarget.style.transform = 'scale(1)'
                          }
                        }}>
                        <div style={{ fontSize: 8, color: col.text, fontWeight: 600, fontFamily: 'JetBrains Mono,monospace' }}>{ev.time}</div>
                        <div style={{ fontSize: 9, color: C.textHi, lineHeight: 1.3 }}>
                          {ev.title} {isRdv && <span style={{ color: col.border }}>→</span>}
                        </div>
                        {ev.client && <div style={{ fontSize: 7, color: C.textLo }}>{ev.client}</div>}
                        <div style={{ display: 'flex', gap: 2, marginTop: 3 }}>
                          <a href={fantasticalUrl(ev, d.dateKey)}
                            onClick={(e) => e.stopPropagation()}
                            style={{ fontSize: 9, textDecoration: 'none', color: C.textVlo, cursor: 'pointer', lineHeight: 1 }}
                            title="Ouvrir dans Fantastical">📲</a>
                          <button onClick={(e) => { e.stopPropagation(); removeEvent(d.dateKey, ev.id); }}
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

      {/* ═══ NURTURING SECTION ═══ */}
      <NurturingSection router={router} />
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// NURTURING SECTION — Complete integration from finalized.html
// ═══════════════════════════════════════════════════════════════════════════

type TemperatureLevel = 'hot' | 'warm' | 'cold' | 'dead'
type PressureLevel = 'normal' | 'elevee' | 'a_stopper'
type NurturingTab = 'overview' | 'contacts' | 'documents' | 'messages' | 'settings'

interface Contact {
  id: string
  full_name: string
  profession: string
  temperature: TemperatureLevel
  pressure: PressureLevel
  category: string | null
  sequence_active: string | null
  total_touchpoints: number
  responded_touchpoints: number
  nb_relances_sans_reponse: number
  next_action_date: string | null
  next_action_channel: string | null
  last_contact_at: string | null
}

const CARD_BG_TEXTURE = 'https://media.istockphoto.com/id/2061680164/fr/photo/fond-de-texture-de-basalte-de-pierre-de-roche-de-granit-de-roche-brun-fonc%C3%A9-noir-surface-des.jpg?s=612x612&w=0&k=20&c=jHAF29X3opSh64jeZDLF8YhW3qPR7ASgjpz1CV2qTvo='

const TEMP_IMAGE: Record<TemperatureLevel, string> = {
  hot: '/nurturing/flame.png',
  warm: '/nurturing/sun.png.png',
  cold: '/nurturing/ice.png.png',
  dead: '/nurturing/earth.png.png',
}

const TEMP_CONFIG: Record<TemperatureLevel, { color: string; label: string; icon: string; gradient: string }> = {
  hot: { color: '#ff4444', label: 'Brûlant', icon: '🔥', gradient: 'linear-gradient(135deg, #2d0808 0%, #4a1010 30%, #3d0808 60%, #1a0505 100%)' },
  warm: { color: '#d4a020', label: 'Tiède', icon: '☀️', gradient: 'linear-gradient(135deg, #2d2208 0%, #3d2e0a 30%, #2d2208 60%, #1a1505 100%)' },
  cold: { color: '#5b9bd5', label: 'Froid', icon: '❄️', gradient: 'linear-gradient(135deg, #081520 0%, #0c2040 30%, #0a1a30 60%, #050e1a 100%)' },
  dead: { color: '#8B4513', label: 'Enterré', icon: '🪨', gradient: 'linear-gradient(135deg, #1a1008 0%, #25180a 30%, #1a1008 60%, #0f0a05 100%)' },
}

const PRESSURE_CONFIG: Record<PressureLevel, { color: string; label: string; icon: string }> = {
  normal: { color: C.green, label: 'Normale', icon: '✓' },
  elevee: { color: C.warn, label: 'Élevée', icon: '⚡' },
  a_stopper: { color: '#ff6470', label: 'À stopper', icon: '🛑' },
}

const MOCK_CONTACTS: Contact[] = [
  {
    id: '1', full_name: 'Jean Dupont', profession: 'Dentiste', temperature: 'hot', pressure: 'normal',
    category: '📅 RDV fait →', sequence_active: null, total_touchpoints: 5, responded_touchpoints: 2,
    nb_relances_sans_reponse: 3, next_action_date: new Date().toISOString().split('T')[0],
    next_action_channel: '📞', last_contact_at: '5j',
  },
  {
    id: '2', full_name: 'Marie Laurent', profession: 'Avocate', temperature: 'warm', pressure: 'normal',
    category: null, sequence_active: '▶ Séquence', total_touchpoints: 8, responded_touchpoints: 5,
    nb_relances_sans_reponse: 0, next_action_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    next_action_channel: '✉️', last_contact_at: null,
  },
  {
    id: '3', full_name: 'Thomas Bernard', profession: 'Kinésithérapeute', temperature: 'cold', pressure: 'elevee',
    category: null, sequence_active: null, total_touchpoints: 2, responded_touchpoints: 0,
    nb_relances_sans_reponse: 2, next_action_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    next_action_channel: '💬', last_contact_at: null,
  },
  {
    id: '4', full_name: 'Sophie Moreau', profession: 'Notaire', temperature: 'dead', pressure: 'a_stopper',
    category: null, sequence_active: null, total_touchpoints: 6, responded_touchpoints: 1,
    nb_relances_sans_reponse: 5, next_action_date: null, next_action_channel: null, last_contact_at: '45j',
  },
]

function NurturingSection({ router }: { router: ReturnType<typeof useRouter> }) {
  const [tab, setTab] = useState<NurturingTab>('contacts')
  const [contacts] = useState<Contact[]>(MOCK_CONTACTS)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null)
  const [selectedChannel, setSelectedChannel] = useState<string>('📞 Appel')

  return (
    <div style={{ marginTop: 24, background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 12, padding: '24px 28px' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 24, fontFamily: 'Oswald, sans-serif', color: C.textHi, fontWeight: 600, letterSpacing: 1 }}>
            NURTURING
          </h2>
          <p style={{ fontSize: 11, color: C.textMid, marginTop: 4 }}>
            Maturation & relances · 47 contacts actifs
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <LinkBadge href="/crm" label="CRM" value="12" color="gold" />
            <LinkBadge href="/cercle" label="Cercle" value="8" color="purple" />
            <LinkBadge href="/sequences" label="Séquences" value="5" color="green" />
            <LinkBadge href="/today" label="Today" value="7" color="cyan" />
          </div>
          <button style={{ padding: '6px 10px', borderRadius: 6, background: `${C.gold}12`, color: C.gold, border: `1px solid ${C.gold}40`, fontSize: 11, cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace' }}>
            🔄 Recalculer scores
          </button>
        </div>
      </div>

      {/* TAB BAR */}
      <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${C.line}`, paddingBottom: 12, marginBottom: 20 }}>
        {[
          { id: 'overview' as NurturingTab, label: '📊 Vue globale', count: null },
          { id: 'contacts' as NurturingTab, label: '👥 Contacts', count: 47 },
          { id: 'documents' as NurturingTab, label: '📄 Bibliothèque', count: 12 },
          { id: 'messages' as NurturingTab, label: '💬 Messages', count: 8 },
          { id: 'settings' as NurturingTab, label: '⚙️ Configuration', count: null },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '8px 14px', borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer',
              background: tab === t.id ? C.surface2 : 'transparent',
              color: tab === t.id ? C.textHi : C.textMid, fontSize: 11, fontWeight: tab === t.id ? 700 : 400,
              fontFamily: 'JetBrains Mono, monospace',
              borderBottom: tab === t.id ? `2px solid ${C.gold}` : '2px solid transparent',
              display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
            }}
          >
            {t.label}
            {t.count !== null && (
              <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 8, background: tab === t.id ? `${C.gold}25` : C.surface3, color: tab === t.id ? C.gold : C.textLo, fontWeight: 700 }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      {tab === 'contacts' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => router.push('/crm?action=new')} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: C.gold, color: C.bgDeep, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace' }}>
                + Nouveau contact
              </button>
              <LinkChip href="/crm" label="Ouvrir CRM Kanban" color="gold" />
              <LinkChip href="/prospection/tns" label="Prospecter TNS" color="cyan" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
            <input placeholder="Rechercher un contact..." style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${C.line}`, background: C.surface2, color: C.textHi, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', width: 200 }} />
            <select style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${C.line}`, background: C.surface2, color: C.text, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>
              <option>Température</option>
              <option>🔥 Brûlant</option>
              <option>☀️ Tiède</option>
              <option>❄️ Froid</option>
              <option>🪨 Enterré</option>
            </select>
            <select style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${C.line}`, background: C.surface2, color: C.text, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>
              <option>Pression</option>
              <option>✓ Normale</option>
              <option>⚡ Élevée</option>
              <option>🛑 À stopper</option>
            </select>
          </div>

          <div style={{ fontSize: 10, color: C.textLo, marginBottom: 10 }}>47 résultats</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {contacts.map(c => (
              <NurturingContactCard
                key={c.id}
                contact={c}
                onClick={() => setSelectedContact(c)}
                dropdownOpen={dropdownOpen === c.id}
                onToggleDropdown={(e) => {
                  e.stopPropagation()
                  setDropdownOpen(dropdownOpen === c.id ? null : c.id)
                }}
              />
            ))}
          </div>
        </div>
      )}

      {tab === 'overview' && <NurturingOverview />}
      {tab === 'documents' && <NurturingDocuments />}
      {tab === 'messages' && <NurturingMessages />}
      {tab === 'settings' && <NurturingSettings />}

      {/* MODAL */}
      {selectedContact && (
        <NurturingContactModal
          contact={selectedContact}
          onClose={() => setSelectedContact(null)}
          selectedChannel={selectedChannel}
          setSelectedChannel={setSelectedChannel}
        />
      )}
    </div>
  )
}

function NurturingContactCard({ contact, onClick, dropdownOpen, onToggleDropdown }: {
  contact: Contact
  onClick: () => void
  dropdownOpen: boolean
  onToggleDropdown: (e: React.MouseEvent) => void
}) {
  const tempCfg = TEMP_CONFIG[contact.temperature]
  const pressureCfg = PRESSURE_CONFIG[contact.pressure]

  const formatNextAction = () => {
    if (!contact.next_action_date) return null
    const today = new Date().toISOString().split('T')[0]
    const actionDate = contact.next_action_date
    if (actionDate === today) return <span style={{ fontSize: 10, fontWeight: 700, color: '#ff4444' }}>🚨 Aujourd'hui</span>
    const daysUntil = Math.ceil((new Date(actionDate).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24))
    return <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)' }}>dans {daysUntil}j</span>
  }

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative', overflow: 'hidden', borderRadius: 14, padding: '14px 18px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 12, borderLeft: `4px solid ${tempCfg.color}`,
        background: tempCfg.gradient, transition: 'transform 0.15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
    >
      {/* Texture + PNG + Glow */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: `url('${CARD_BG_TEXTURE}')`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.08 }} />
      <div style={{ position: 'absolute', right: -10, bottom: -10, width: 120, height: 120, pointerEvents: 'none', backgroundSize: 'contain', backgroundPosition: 'bottom right', backgroundRepeat: 'no-repeat', opacity: 0.18, backgroundImage: `url('${TEMP_IMAGE[contact.temperature]}')` }} />
      <div style={{ position: 'absolute', top: -25, right: -25, width: 120, height: 120, borderRadius: '50%', pointerEvents: 'none', background: contact.temperature === 'hot' ? 'radial-gradient(circle, rgba(255,68,68,0.15) 0%, transparent 65%)' : contact.temperature === 'warm' ? 'radial-gradient(circle, rgba(212,160,32,0.12) 0%, transparent 65%)' : contact.temperature === 'cold' ? 'radial-gradient(circle, rgba(91,155,213,0.12) 0%, transparent 65%)' : 'radial-gradient(circle, rgba(139,69,19,0.1) 0%, transparent 65%)' }} />

      {/* Avatar */}
      <div style={{ position: 'relative', zIndex: 1, width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, background: contact.temperature === 'hot' ? 'radial-gradient(circle, rgba(255,68,68,0.3), rgba(255,68,68,0.1))' : contact.temperature === 'warm' ? 'radial-gradient(circle, rgba(212,160,32,0.25), rgba(212,160,32,0.08))' : contact.temperature === 'cold' ? 'radial-gradient(circle, rgba(91,155,213,0.25), rgba(91,155,213,0.08))' : 'radial-gradient(circle, rgba(139,69,19,0.2), rgba(139,69,19,0.05))', border: contact.temperature === 'hot' ? '2px solid rgba(255,68,68,0.5)' : contact.temperature === 'warm' ? '2px solid rgba(212,160,32,0.45)' : contact.temperature === 'cold' ? '2px solid rgba(91,155,213,0.45)' : '2px solid rgba(139,69,19,0.4)' }}>
        {tempCfg.icon}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>{contact.full_name}</span>
          {contact.category && <span style={{ fontSize: 9, color: C.gold, background: `${C.gold}20`, padding: '2px 6px', borderRadius: 4 }}>{contact.category}</span>}
          {contact.sequence_active && <span style={{ fontSize: 9, color: C.green, background: `${C.green}16`, padding: '2px 6px', borderRadius: 4 }}>{contact.sequence_active}</span>}
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 4, display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontWeight: 500 }}>{contact.profession}</span>
          <span>📊 {contact.total_touchpoints}tp · {contact.responded_touchpoints} rép.</span>
          {contact.nb_relances_sans_reponse > 0 && <span style={{ color: C.warn, fontWeight: 600 }}>⚠ {contact.nb_relances_sans_reponse} sans réponse</span>}
        </div>
      </div>

      {/* Pressure */}
      <div style={{ position: 'relative', zIndex: 1, fontSize: 9, padding: '4px 7px', borderRadius: 5, background: `${pressureCfg.color}20`, color: pressureCfg.color, fontWeight: 600 }}>
        {pressureCfg.icon} {pressureCfg.label}
      </div>

      {/* Next action */}
      <div style={{ textAlign: 'right', minWidth: 70, position: 'relative', zIndex: 1 }}>
        {formatNextAction()}
        {contact.last_contact_at && !contact.next_action_date && <div style={{ fontSize: 10, color: C.textLo }}>il y a {contact.last_contact_at}</div>}
        {contact.next_action_channel && <div style={{ fontSize: 13, marginTop: 2 }}>{contact.next_action_channel}</div>}
      </div>

      {/* Dropdown toggle */}
      <div onClick={onToggleDropdown} style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 50, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', borderRadius: '8px 8px 0 0', color: C.textLo, fontSize: 8, cursor: 'pointer', zIndex: 5, opacity: 0, transition: 'opacity 0.2s' }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
        onMouseLeave={(e) => { if (!dropdownOpen) e.currentTarget.style.opacity = '0' }}>
        {dropdownOpen ? '▲ Fermer' : '▼ Menu'}
      </div>

      {/* Dropdown */}
      {dropdownOpen && (
        <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: C.surface1, borderTop: `1px solid ${C.line}`, padding: '8px 12px', zIndex: 10, borderRadius: '0 0 14px 14px' }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' }}>
            {contact.temperature !== 'dead' ? (
              <>
                <button style={{ padding: '3px 7px', borderRadius: 4, background: C.surface2, border: `1px solid ${C.line}`, color: C.textMid, fontSize: 9, cursor: 'pointer' }}>📞 Appeler</button>
                <button style={{ padding: '3px 7px', borderRadius: 4, background: C.surface2, border: `1px solid ${C.line}`, color: C.textMid, fontSize: 9, cursor: 'pointer' }}>💬 WhatsApp</button>
                <button style={{ padding: '3px 7px', borderRadius: 4, background: C.surface2, border: `1px solid ${C.line}`, color: C.textMid, fontSize: 9, cursor: 'pointer' }}>📧 Email</button>
                <button style={{ padding: '3px 7px', borderRadius: 4, background: C.surface2, border: `1px solid ${C.line}`, color: C.textMid, fontSize: 9, cursor: 'pointer' }}>🔗 LinkedIn</button>
              </>
            ) : (
              <button style={{ padding: '3px 7px', borderRadius: 4, background: C.surface2, border: `1px solid ${C.line}`, color: C.textMid, fontSize: 9, cursor: 'pointer' }}>📧 Email rupture</button>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 8, color: C.textLo }}>
            {contact.sequence_active ? (
              <>
                <span>Séquence: étape 3/6</span>
                <span style={{ background: 'rgba(255,100,112,0.12)', color: '#ff6470', padding: '2px 5px', borderRadius: 3, cursor: 'pointer' }}>⏸ Pause</span>
              </>
            ) : contact.temperature !== 'dead' ? (
              <>
                <span>Dernier: 📧 il y a {contact.last_contact_at || '?'}</span>
                <span style={{ background: `${C.gold}20`, color: C.gold, padding: '2px 5px', borderRadius: 3, cursor: 'pointer', fontWeight: 600 }}>▶ Lancer séquence</span>
              </>
            ) : (
              <span style={{ color: '#ff6470' }}>5 relances sans réponse — STOP recommandé</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function NurturingOverview() {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 20 }}>
        <NurturingKpi value={47} label="En nurturing" icon="👥" />
        <NurturingKpi value={7} label="À traiter" icon="⚡" highlight />
        <NurturingKpi value={9} label="Chauds" icon="🔥" />
        <NurturingKpi value={3} label="Sur-sollicités" icon="🛑" />
        <NurturingKpi value={11} label="Sans action" icon="😴" />
      </div>
      <div style={{ fontSize: 11, color: C.textMid, textAlign: 'center' }}>Vue globale — Mini calendrier & métriques à venir</div>
    </div>
  )
}

function NurturingDocuments() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={{ padding: '5px 10px', borderRadius: 6, background: C.surface3, color: C.text, border: 'none', fontSize: 10, cursor: 'pointer' }}>Tous</button>
          <button style={{ padding: '5px 10px', borderRadius: 6, background: C.surface2, color: C.text, border: 'none', fontSize: 10, cursor: 'pointer' }}>📊 Retraite TNS</button>
        </div>
        <button style={{ padding: '7px 12px', borderRadius: 7, background: C.gold, color: C.bgDeep, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>+ Document</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        <div style={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.textHi }}>Simulateur Retraite TNS</div>
          <div style={{ fontSize: 10, color: C.textMid, marginTop: 3 }}>PDF · email, whatsapp</div>
          <span style={{ display: 'inline-block', marginTop: 8, fontSize: 9, padding: '2px 6px', borderRadius: 4, background: `${C.green}20`, color: C.green }}>📊 Retraite TNS</span>
        </div>
        <div style={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.textHi }}>Guide SCPI 2026</div>
          <div style={{ fontSize: 10, color: C.textMid, marginTop: 3 }}>PDF · email, courrier</div>
          <span style={{ display: 'inline-block', marginTop: 8, fontSize: 9, padding: '2px 6px', borderRadius: 4, background: `${C.gold}20`, color: C.gold }}>🏠 Immobilier</span>
        </div>
      </div>
    </div>
  )
}

function NurturingMessages() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={{ padding: '5px 10px', borderRadius: 6, background: C.surface3, color: C.text, border: 'none', fontSize: 10, cursor: 'pointer' }}>Tous</button>
        </div>
        <button style={{ padding: '7px 12px', borderRadius: 7, background: C.gold, color: C.bgDeep, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>+ Message</button>
      </div>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 12, color: C.gold, marginBottom: 10 }}>SUGGESTIONS D'EXPERTS PPP/Vendue</h3>
        <div style={{ background: `${C.gold}06`, border: `1px solid ${C.gold}20`, borderRadius: 10, padding: 12, marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <span style={{ fontSize: 13 }}>✉️</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: C.textHi }}>Relance contextualisée après rencontre</span>
              </div>
              <div style={{ fontSize: 10, color: C.textMid, lineHeight: 1.4, marginBottom: 5 }}>{'{Prénom}, on a échangé {lieu} — votre situation m\'a interpellé...'}</div>
              <div style={{ fontSize: 9, color: C.gold, fontStyle: 'italic' }}>💡 Les 2 premières lignes sont décisives. Ancrez dans un contexte réel partagé.</div>
            </div>
            <button style={{ padding: '5px 9px', borderRadius: 6, background: `${C.gold}16`, color: C.gold, border: 'none', fontSize: 10, cursor: 'pointer', marginLeft: 8 }}>✏️ Adapter</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function NurturingSettings() {
  return (
    <div style={{ maxWidth: 650 }}>
      <h3 style={{ fontSize: 14, color: C.textHi, marginBottom: 12 }}>Cadence recommandée PPP2</h3>
      <div style={{ background: C.surface2, border: `1px solid ${C.gold}32`, borderRadius: 10, padding: 14 }}>
        <h4 style={{ fontSize: 10, color: C.gold, marginBottom: 8, textTransform: 'uppercase' }}>Séquence optimale B2B</h4>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, padding: '3px 7px', borderRadius: 5, background: C.surface1, color: C.textHi }}>✉️ email</span>
          <span style={{ color: C.textLo, fontSize: 9 }}>→</span>
          <span style={{ fontSize: 10, padding: '3px 7px', borderRadius: 5, background: C.surface1, color: C.textHi }}>🔗 linkedin</span>
          <span style={{ color: C.textLo, fontSize: 9 }}>→</span>
          <span style={{ fontSize: 10, padding: '3px 7px', borderRadius: 5, background: C.surface1, color: C.textHi }}>📞 téléphone</span>
          <span style={{ color: C.textLo, fontSize: 9 }}>→</span>
          <span style={{ fontSize: 10, padding: '3px 7px', borderRadius: 5, background: C.surface1, color: C.textHi }}>💬 whatsapp</span>
          <span style={{ color: C.textLo, fontSize: 9 }}>→</span>
          <span style={{ fontSize: 10, padding: '3px 7px', borderRadius: 5, background: C.surface1, color: C.textHi }}>✉️ email rupture</span>
        </div>
        <div style={{ fontSize: 9, color: C.textLo, marginTop: 7 }}>6 touches max prospect froid · 8 touches tiède · 5 touches post-RDV</div>
      </div>
      <div style={{ background: 'rgba(255,100,112,0.05)', border: '1px solid rgba(255,100,112,0.15)', borderRadius: 9, padding: 11, marginTop: 11 }}>
        <div style={{ fontSize: 9, color: '#ff6470', fontWeight: 600, marginBottom: 3 }}>Règles anti-pression PPP2</div>
        <div style={{ fontSize: 9, color: C.textMid }}>• Max 2 touches/semaine, jamais 2 canaux le même jour</div>
        <div style={{ fontSize: 9, color: C.textMid }}>• STOP après 6 tentatives sans interaction (froid)</div>
        <div style={{ fontSize: 9, color: C.textMid }}>• Si 3 messages sans vue → STOP et changer de canal</div>
      </div>
    </div>
  )
}

function NurturingKpi({ value, label, icon, highlight }: { value: number; label: string; icon: string; highlight?: boolean }) {
  return (
    <div style={{ background: highlight ? `${C.gold}10` : C.surface2, border: highlight ? `1px solid ${C.gold}64` : `1px solid ${C.line}`, borderRadius: 9, padding: '12px 14px', textAlign: 'center', cursor: 'pointer', transition: 'transform 0.1s' }}>
      <div style={{ fontSize: 18 }}>{icon}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: highlight ? C.gold : C.indigo, marginTop: 3 }}>{value}</div>
      <div style={{ fontSize: 9, color: C.textMid, marginTop: 2 }}>{label}</div>
    </div>
  )
}

function NurturingContactModal({ contact, onClose, selectedChannel, setSelectedChannel }: {
  contact: Contact
  onClose: () => void
  selectedChannel: string
  setSelectedChannel: (ch: string) => void
}) {
  return (
    <div onClick={onClose} style={{ display: 'flex', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.bgMid, border: `1px solid ${C.line}`, borderRadius: 14, padding: 24, width: '100%', maxWidth: 850, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <h2 style={{ fontSize: 20, color: C.textHi }}>{contact.full_name}</h2>
            <div style={{ fontSize: 10, color: C.textMid, marginTop: 3 }}>{contact.profession} · {TEMP_CONFIG[contact.temperature].icon} {TEMP_CONFIG[contact.temperature].label}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.textLo, fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        {/* Timeline */}
        <div style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14, marginBottom: 18 }}>
          <h4 style={{ fontSize: 10, color: C.cyan, marginBottom: 9, textTransform: 'uppercase' }}>⚡ Séquence en cours</h4>
          <div style={{ display: 'flex', gap: 7, overflowX: 'auto', padding: '10px 0' }}>
            {[
              { icon: '📧', day: 'J+1', label: 'Email', status: 'done' },
              { icon: '🔗', day: 'J+3', label: 'LinkedIn', status: 'done' },
              { icon: '📞', day: 'J+7', label: 'Appel', status: 'current' },
              { icon: '💬', day: 'J+10', label: 'WhatsApp', status: 'pending' },
              { icon: '📧', day: 'J+14', label: 'Rupture', status: 'pending' },
            ].map((step, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 80 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: step.status === 'done' ? 'rgba(52,211,153,0.12)' : step.status === 'current' ? 'rgba(34,211,238,0.12)' : C.surface2, border: step.status === 'done' ? `2px solid ${C.green}` : step.status === 'current' ? `2px solid ${C.cyan}` : `2px solid ${C.line}`, fontSize: 13, cursor: 'pointer', boxShadow: step.status === 'current' ? `0 0 10px ${C.cyan}50` : 'none' }}>
                  {step.icon}
                </div>
                <div style={{ fontSize: 8, color: C.textLo, marginTop: 3, fontWeight: 600 }}>{step.day}</div>
                <div style={{ fontSize: 8, color: C.textMid, marginTop: 1 }}>{step.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Send */}
        <div style={{ background: `${C.gold}06`, border: `1px solid ${C.gold}30`, borderRadius: 10, padding: 14, marginBottom: 18 }}>
          <h4 style={{ fontSize: 10, color: C.gold, textTransform: 'uppercase', marginBottom: 10 }}>📨 Envoyer un message</h4>
          <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
            {['📞 Appel', '✉️ Email', '💬 WhatsApp'].map(ch => (
              <button key={ch} onClick={() => setSelectedChannel(ch)} style={{ padding: '5px 10px', borderRadius: 7, border: selectedChannel === ch ? `1px solid ${C.gold}` : `1px solid ${C.line}`, background: selectedChannel === ch ? `${C.gold}20` : C.surface2, color: selectedChannel === ch ? C.gold : C.textMid, fontSize: 11, cursor: 'pointer', transition: 'all 0.15s' }}>
                {ch}
              </button>
            ))}
          </div>
          <textarea style={{ width: '100%', minHeight: 70, padding: '9px 12px', borderRadius: 7, border: `1px solid ${C.line}`, background: C.surface2, color: C.textHi, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', resize: 'vertical', lineHeight: 1.4 }} placeholder="Votre message..." defaultValue="Bonjour Jean, c'est [votre_nom]. On s'est échangé lors de notre rendez-vous. Je vous appelle parce que j'ai finalisé la simulation retraite. Est-ce que vous avez 2 minutes ou je vous rappelle ?" />
          <div style={{ background: `${C.gold}10`, border: `1px solid ${C.gold}20`, borderRadius: 7, padding: '7px 9px', marginTop: 7 }}>
            <div style={{ fontSize: 9, color: C.gold, fontWeight: 600 }}>💡 Préconisation PPP — Téléphone</div>
            <div style={{ fontSize: 9, color: C.textMid, marginTop: 2 }}>Identifiez-vous + contexte en 10s. UNE question ouverte. 2 min max si non qualifié. Meilleur créneau: mardi-jeudi 9h-11h30.</div>
          </div>
          <button style={{ padding: '7px 14px', borderRadius: 7, border: 'none', background: C.gold, color: C.bgDeep, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace', marginTop: 9 }}>📞 Appeler maintenant</button>
        </div>

        {/* Quick log */}
        <div style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 10, padding: 12 }}>
          <h4 style={{ fontSize: 10, color: C.textMid, marginBottom: 9, textTransform: 'uppercase' }}>✏️ Enregistrer une interaction</h4>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {['📞 Appel fait', '✉️ Email envoyé', '💬 WhatsApp envoyé', '🔗 LinkedIn envoyé'].map(action => (
              <button key={action} style={{ padding: '7px 12px', borderRadius: 7, border: `1px dashed ${C.line}`, background: 'transparent', color: C.textMid, fontSize: 10, cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace', transition: 'all 0.15s' }}>
                {action}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
