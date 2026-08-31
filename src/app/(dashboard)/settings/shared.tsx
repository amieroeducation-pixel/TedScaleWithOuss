'use client'

import { useState } from 'react'
import { C } from '@/lib/theme'
import { UserSettings } from '@/hooks/useUserSettings'

export type Tab = 'general' | 'kpi' | 'notifications' | 'integrations' | 'sections' | 'mobile' | 'sequences' | 'variantes' | 'triggers' | 'scripts' | 'menu' | 'rappels' | 'booking'

export type TabProps = {
  settings: UserSettings | null
  save: (p: Partial<UserSettings>) => Promise<unknown>
  saving: boolean
}

export const TABS: { id: Tab; label: string }[] = [
  { id: 'general', label: 'Général' },
  { id: 'kpi', label: '📊 KPI' },
  { id: 'notifications', label: '🔔 Notif' },
  { id: 'integrations', label: '🔗 API' },
  { id: 'menu', label: '📂 Menu' },
  { id: 'sections', label: '👁️ Sections' },
  { id: 'mobile', label: '📱 Mobile' },
  { id: 'booking', label: '📅 Booking' },
  { id: 'sequences', label: '🔗 Séquences' },
  { id: 'variantes', label: '🎯 Variantes' },
  { id: 'triggers', label: '⚡ Triggers' },
  { id: 'scripts', label: '📞 Scripts' },
  { id: 'rappels', label: '📲 Rappels SMS' },
]

export const MONTHS_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
export const MONTHS_ID = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
export const MONTHS_WEEKS = [4, 4, 4, 4, 4, 4, 4, 4, 5, 4, 4, 5]

export const SECTIONS_LIST = [
  { id: 'today', label: '🏠 Vue du jour', desc: 'Dashboard principal quotidien' },
  { id: 'global', label: '🌍 Global', desc: "Vue d'ensemble et planning annuel" },
  { id: 'tns', label: '📊 TNS', desc: 'Travailleurs Non Salariés' },
  { id: 'chefs', label: "💼 Chefs d'entreprise", desc: 'Gestion dirigeants' },
  { id: 'particuliers', label: '👤 Particuliers', desc: 'Gestion clients particuliers' },
  { id: 'interpro', label: '🤝 Cercle Interpro', desc: 'Réseau professionnel' },
  { id: 'agenda', label: '📅 Agenda', desc: 'Calendrier et rendez-vous' },
  { id: 'sequences', label: '📧 Séquences', desc: 'Campagnes automatisées' },
  { id: 'commerce', label: '💰 Commerce', desc: 'Suivi commercial' },
  { id: 'chrono', label: '⏱️ Chronomètre', desc: 'Blocs de production' },
  { id: 'champions', label: '🏆 Champions', desc: 'Classement collecte' },
  { id: 'revenue', label: '💰 Revenue', desc: 'CA et commissions' },
  { id: 'pipeline', label: '📊 Pipeline', desc: 'Suivi des deals' },
  { id: 'tasks', label: '✅ Tâches', desc: 'Gestion des tâches' },
  { id: 'crm', label: '📋 CRM Kanban', desc: 'Pipeline visuel' },
  { id: 'clients', label: '⭐ Premium', desc: 'Clients premium' },
  { id: 'map', label: '🗺️ Carte TNS', desc: 'Cartographie prospects' },
  { id: 'simulator', label: '🎯 Simulateur', desc: 'Simulations collecte' },
  { id: 'auto', label: '⚙️ Automatisations', desc: 'Workflows auto' },
  { id: 'analytics', label: '📊 Analytics', desc: 'Statistiques avancées' },
  { id: 'assistant', label: '🤖 Assistant', desc: 'IA assistant' },
]

export const MOBILE_SECTIONS = [
  { id: 'today', label: '🏠 Vue du jour', defaultOn: true },
  { id: 'global', label: '🌍 Global', defaultOn: true },
  { id: 'champions', label: '🏆 Champions', defaultOn: true },
  { id: 'tns', label: '📊 TNS', defaultOn: true },
  { id: 'chefs', label: '💼 Chefs entreprise', defaultOn: false },
  { id: 'particuliers', label: '👤 Particuliers', defaultOn: false },
  { id: 'agenda', label: '📅 Agenda', defaultOn: true },
  { id: 'sequences', label: '📧 Séquences', defaultOn: false },
  { id: 'commerce', label: '💰 Commerce', defaultOn: true },
  { id: 'crm', label: '📋 CRM', defaultOn: false },
  { id: 'settings', label: '⚙️ Paramètres', defaultOn: true },
]

export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ position: 'relative', display: 'inline-block', width: 48, height: 24, flexShrink: 0, cursor: 'pointer' }}>
      <input
        type="checkbox"
        role="switch"
        aria-checked={checked}
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        style={{ opacity: 0, width: 0, height: 0 }}
      />
      <span style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        background: checked ? C.green : C.textVlo,
        borderRadius: 24, transition: '0.3s',
      }} />
      <span style={{
        position: 'absolute',
        height: 18, width: 18,
        left: checked ? 27 : 3,
        bottom: 3,
        background: 'white', borderRadius: '50%', transition: '0.3s',
      }} />
    </label>
  )
}

export function SetRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 12px', background: C.surface1, borderRadius: 6,
      border: `1px solid ${C.lineSoft}`, marginBottom: 8,
    }}>
      {children}
    </div>
  )
}

export function SetLabel({ label, desc }: { label: string; desc?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 500, color: C.textHi, fontFamily: 'Inter,sans-serif' }}>{label}</div>
      {desc && <div style={{ fontSize: 8, color: C.textLo, marginTop: 2, fontFamily: 'JetBrains Mono,monospace' }}>{desc}</div>}
    </div>
  )
}

export function NumInput({ id, value, min, max, step, onChange }: { id?: string; value: number; min: number; max: number; step?: number; onChange?: (v: number) => void }) {
  const [val, setVal] = useState(value)
  return (
    <input
      id={id}
      type="number"
      value={val}
      onChange={e => {
        const n = Number(e.target.value)
        setVal(n)
        onChange?.(n)
      }}
      min={min} max={max} step={step || 1}
      style={{
        width: 70, padding: '6px 8px', background: C.surface2,
        border: `1px solid ${C.line}`, borderRadius: 5,
        color: C.gold, fontSize: 13, fontWeight: 600,
        textAlign: 'center', fontFamily: 'JetBrains Mono,monospace',
      }}
    />
  )
}

export function SectionPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: `linear-gradient(180deg,${C.surface1},${C.bgMid})`,
      border: `1px solid ${C.line}`, borderRadius: 10,
      padding: 14, marginBottom: 12, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,#ff647066,transparent)' }} />
      <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 600, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

// TabMenu - Phase 1A s01-menu Sections sommeil
export function TabMenu({ settings, save }: TabProps) {
  const [visible, setVisible] = useState<Record<string, boolean>>(
    settings?.menu_sections_visible ?? {
      principal: true,
      clients: true,
      acquisition: true,
      outils: true,
      pilotage: true,
    }
  )
  const [status, setStatus] = useState<string>('')

  const sections = [
    { key: 'principal', label: 'Principal', desc: 'Dashboard, Aujourd\'hui, Global' },
    { key: 'clients', label: 'Clients', desc: 'Clients Premium, CRM Kanban, Revenue' },
    { key: 'acquisition', label: 'Acquisition', desc: 'TNS, Chefs d\'entreprise, Particuliers' },
    { key: 'outils', label: 'Outils', desc: 'Assistant, Simulateur, Scoring, Map' },
    { key: 'pilotage', label: 'Pilotage', desc: 'Analytics, Achievements, Automatisations' },
  ]

  async function handleToggle(key: string, value: boolean) {
    const next = { ...visible, [key]: value }
    setVisible(next)
    setStatus('Sauvegarde...')
    try {
      const result = await save({ menu_sections_visible: next })
      if (result) {
        setStatus('✅ Sauvegardé — rechargement...')
        setTimeout(() => window.location.reload(), 600)
      } else {
        setStatus('❌ Erreur de sauvegarde')
      }
    } catch (err) {
      setStatus('❌ Erreur: ' + (err instanceof Error ? err.message : 'inconnue'))
    }
  }

  return (
    <SectionPanel title="Visibilité Sections Menu">
      <div style={{ fontSize: 9, color: C.textLo, marginBottom: 14, fontFamily: 'JetBrains Mono,monospace' }}>
        Masquez les sections du menu latéral que vous n'utilisez pas.
      </div>
      {status && (
        <div style={{ fontSize: 10, color: status.includes('❌') ? '#ff6470' : C.green, marginBottom: 10, fontFamily: 'JetBrains Mono,monospace' }}>
          {status}
        </div>
      )}
      {sections.map(s => (
        <SetRow key={s.key}>
          <SetLabel label={s.label} desc={s.desc} />
          <Toggle
            checked={visible[s.key] ?? true}
            onChange={(v) => handleToggle(s.key, v)}
          />
        </SetRow>
      ))}
    </SectionPanel>
  )
}

export function SetBtn({ onClick, color, bg, children }: { onClick?: () => void; color: string; bg: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 12px', background: bg,
        border: `1px solid ${color}`, color,
        borderRadius: 6, fontSize: 9, fontWeight: 600,
        cursor: 'pointer', fontFamily: 'Oswald,sans-serif', letterSpacing: '0.05em',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}

export function TabBooking({ settings, save, saving }: TabProps) {
  const [slug, setSlug] = useState(settings?.booking_slug || '')
  const [generating, setGenerating] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

  const generateSlug = async () => {
    if (generating) return
    setGenerating(true)

    // Generate slug from user name or random string
    const baseName = settings?.nom?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'booking'
    const randomSuffix = Math.random().toString(36).substring(2, 6)
    const suggested = `${baseName}-${randomSuffix}`

    setSlug(suggested)
    await save({ booking_slug: suggested })
    setGenerating(false)
  }

  const handleBlur = async () => {
    if (slug !== settings?.booking_slug) {
      await save({ booking_slug: slug })
    }
  }

  const bookingUrl = slug ? `${typeof window !== 'undefined' ? window.location.origin : ''}/booking/${slug}` : ''

  const copyToClipboard = () => {
    if (bookingUrl && typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(bookingUrl).then(() => {
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 2000)
      })
    }
  }

  return (
    <SectionPanel title="Lien de Réservation">
      <div style={{ fontSize: 9, color: C.textLo, marginBottom: 14, fontFamily: 'JetBrains Mono,monospace' }}>
        Partagez ce lien pour recevoir des demandes de rendez-vous en ligne. Les prospects peuvent sélectionner un créneau disponible directement.
      </div>

      <SetRow>
        <SetLabel
          label="Votre slug de booking"
          desc="Identifiant unique pour votre page de réservation"
        />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            onBlur={handleBlur}
            placeholder="mon-nom"
            style={{
              flex: '0 0 200px',
              background: C.surface2,
              border: `1px solid ${C.line}`,
              borderRadius: 6,
              padding: '8px 12px',
              color: C.textHi,
              fontSize: 11,
              fontFamily: 'JetBrains Mono,monospace',
            }}
          />
          <button
            onClick={generateSlug}
            disabled={generating || saving}
            style={{
              background: generating ? C.textVlo : C.indigo,
              color: C.textHi,
              border: 'none',
              borderRadius: 6,
              padding: '8px 16px',
              fontSize: 10,
              fontWeight: 600,
              cursor: generating ? 'not-allowed' : 'pointer',
              fontFamily: 'Oswald,sans-serif',
            }}
          >
            {generating ? 'Génération...' : 'Générer'}
          </button>
        </div>
      </SetRow>

      {bookingUrl && (
        <SetRow>
          <SetLabel label="URL complète" desc="Copiez ce lien pour le partager avec vos prospects" />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1 }}>
            <input
              type="text"
              value={bookingUrl}
              readOnly
              style={{
                flex: 1,
                background: C.surface2,
                border: `1px solid ${C.line}`,
                borderRadius: 6,
                padding: '8px 12px',
                color: C.gold,
                fontSize: 10,
                fontFamily: 'JetBrains Mono,monospace',
              }}
            />
            <button
              onClick={copyToClipboard}
              style={{
                background: copySuccess ? C.green : C.indigo,
                color: copySuccess ? C.bgDeep : C.textHi,
                border: 'none',
                borderRadius: 6,
                padding: '8px 16px',
                fontSize: 10,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Oswald,sans-serif',
                whiteSpace: 'nowrap',
              }}
            >
              {copySuccess ? '✓ Copié' : '📋 Copier'}
            </button>
          </div>
        </SetRow>
      )}
    </SectionPanel>
  )
}
