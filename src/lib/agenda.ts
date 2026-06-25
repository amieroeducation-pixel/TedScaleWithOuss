import { C } from '@/lib/theme'

export type AgendaEventType = 'rdv' | 'bloc' | 'tache' | 'sport' | 'commerce' | 'interpro' | 'autre'

export interface AgendaEvent {
  id: string
  time: string      // format "HH:MM" (input type="time")
  title: string
  client?: string
  type: AgendaEventType
}

export const AGENDA_COLORS: Record<AgendaEventType, { bg: string; border: string; text: string }> = {
  rdv:      { bg: '#0d1a2e', border: C.indigo,  text: C.indigo },
  bloc:     { bg: '#0d1a0d', border: C.green,   text: C.green },
  tache:    { bg: '#1a1400', border: C.gold,    text: C.gold },
  sport:    { bg: '#1a0d0d', border: C.warn,    text: C.warn },
  commerce: { bg: '#1a1500', border: '#e8c878', text: '#e8c878' },
  interpro: { bg: '#1a1600', border: '#e8c878', text: '#e8c878' },
  autre:    { bg: C.surface1, border: C.line,   text: C.textMid },
}

export function loadDayAgenda(dk: string): AgendaEvent[] {
  if (typeof window === 'undefined') return []
  try {
    const s = localStorage.getItem(`shared_agenda_${dk}`)
    if (s) return JSON.parse(s)
    // Migration automatique depuis l'ancien format Today
    const old = localStorage.getItem(`today_agenda_${dk}`)
    if (old) {
      localStorage.setItem(`shared_agenda_${dk}`, old)
      localStorage.removeItem(`today_agenda_${dk}`)
      return JSON.parse(old)
    }
  } catch { /* ignore */ }
  return []
}

export function saveDayAgenda(dk: string, events: AgendaEvent[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`shared_agenda_${dk}`, JSON.stringify(events))
    window.dispatchEvent(new CustomEvent('agenda-changed', { detail: { dateKey: dk } }))
  } catch { /* ignore */ }
}

export function todayDateKey(): string {
  return new Date().toISOString().split('T')[0]
}

export function fantasticalUrl(event: AgendaEvent, dk: string): string {
  const [year, month, day] = dk.split('-')
  const sentence = `${event.title} le ${day}/${month}/${year} à ${event.time}`
  return `fantastical2://parse?sentence=${encodeURIComponent(sentence)}&add=1`
}
