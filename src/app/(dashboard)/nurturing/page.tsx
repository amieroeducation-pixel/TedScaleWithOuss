'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { C } from '@/lib/theme'
import { saveLastSection } from '@/lib/navigation-state'
import { LinkButton, LinkBadge, LinkChip, buildHref } from '@/lib/cross-links'
import type { NurturingCategory, TemperatureLevel, PressureLevel, NurturingChannel, NurturingTheme, NurturingDocument, NurturingMessage } from '@/lib/nurturing/types'

// ─── TEMPERATURE CONFIG (visual identity per level) ─────────────────────────

const TEMP_CONFIG: Record<TemperatureLevel, { color: string; colorAlt: string; label: string; icon: string; gradient: string; bgSvg: string }> = {
  hot: {
    color: '#ff4444', colorAlt: '#ff8800',
    label: 'Brûlant', icon: '🔥',
    gradient: 'linear-gradient(135deg, #1a0505 0%, #2d0a0a 40%, #3d1111 100%)',
    bgSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 80" opacity="0.15"><path d="M50 70 C55 50, 60 30, 55 15 C50 5, 45 5, 45 15 C40 30, 50 45, 50 70Z" fill="%23ff4444"/><path d="M45 70 C48 55, 52 40, 48 28 C45 20, 42 22, 43 30 C40 42, 44 55, 45 70Z" fill="%23ff8800"/><path d="M340 75 C345 55, 350 35, 345 20 C340 10, 335 10, 335 20 C330 35, 340 50, 340 75Z" fill="%23ff4444" opacity="0.6"/><path d="M350 75 C353 60, 356 45, 352 33 C349 25, 346 27, 347 35 C344 47, 348 60, 350 75Z" fill="%23ff6600" opacity="0.5"/><circle cx="200" cy="60" r="3" fill="%23ff4444" opacity="0.3"/><circle cx="180" cy="50" r="2" fill="%23ff8800" opacity="0.25"/></svg>`,
  },
  warm: {
    color: '#d4a020', colorAlt: '#8B6914',
    label: 'Tiède', icon: '☀️',
    gradient: 'linear-gradient(135deg, #1a1505 0%, #2d2208 40%, #3d2e0a 100%)',
    bgSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 80" opacity="0.12"><circle cx="360" cy="20" r="18" fill="%23e8c878" opacity="0.5"/><line x1="360" y1="-2" x2="360" y2="-8" stroke="%23e8c878" stroke-width="2" opacity="0.3"/><line x1="360" y1="42" x2="360" y2="48" stroke="%23e8c878" stroke-width="2" opacity="0.3"/><line x1="338" y1="20" x2="332" y2="20" stroke="%23e8c878" stroke-width="2" opacity="0.3"/><line x1="382" y1="20" x2="388" y2="20" stroke="%23e8c878" stroke-width="2" opacity="0.3"/></svg>`,
  },
  cold: {
    color: '#5b9bd5', colorAlt: '#2c5f8a',
    label: 'Froid', icon: '❄️',
    gradient: 'linear-gradient(135deg, #050e1a 0%, #0a1a2d 40%, #0e2240 100%)',
    bgSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 80" opacity="0.15"><path d="M30 40 L35 35 L30 30 M30 40 L25 35 L30 30 M30 20 L30 60 M20 40 L40 40" stroke="%235b9bd5" stroke-width="1" fill="none" opacity="0.6"/><path d="M370 30 L375 25 L370 20 M370 30 L365 25 L370 20 M370 10 L370 50 M360 30 L380 30" stroke="%235b9bd5" stroke-width="1" fill="none" opacity="0.4"/><circle cx="150" cy="60" r="1" fill="%235b9bd5" opacity="0.25"/><circle cx="250" cy="15" r="1.5" fill="%235b9bd5" opacity="0.2"/></svg>`,
  },
  dead: {
    color: '#8B4513', colorAlt: '#5c3010',
    label: 'Enterré', icon: '🪨',
    gradient: 'linear-gradient(135deg, #0f0a05 0%, #1a1008 40%, #25180a 100%)',
    bgSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 80" opacity="0.12"><path d="M0 75 Q50 70, 100 72 Q150 74, 200 70 Q250 66, 300 72 Q350 78, 400 73 L400 80 L0 80 Z" fill="%238B4513" opacity="0.4"/><ellipse cx="80" cy="68" rx="15" ry="5" fill="%235c3010" opacity="0.3"/><ellipse cx="320" cy="72" rx="12" ry="4" fill="%235c3010" opacity="0.25"/></svg>`,
  },
}

const PRESSURE_CONFIG: Record<PressureLevel, { color: string; label: string; icon: string }> = {
  normal:    { color: C.green, label: 'Normale', icon: '✓' },
  elevee:    { color: C.warn, label: 'Élevée', icon: '⚡' },
  a_stopper: { color: '#ff6470', label: 'À stopper', icon: '🛑' },
}

const CATEGORY_CONFIG: Record<NurturingCategory, { label: string; icon: string; color: string; linkedSection: string }> = {
  rdv_fait:       { label: 'RDV fait', icon: '📅', color: C.gold, linkedSection: '/crm' },
  prospect_froid: { label: 'Prospect froid', icon: '🎯', color: C.indigo, linkedSection: '/prospection/tns' },
  interpro:       { label: 'Interpro', icon: '🤝', color: C.purple, linkedSection: '/cercle' },
}

const CHANNEL_ICONS: Record<NurturingChannel, string> = {
  telephone: '📞', email: '✉️', whatsapp: '💬', linkedin: '🔗', courrier: '📬', sms: '📱',
}

const PIPELINE_LABELS: Record<string, string> = {
  a_contacter: 'À contacter', rdv1: 'RDV 1', rdv2: 'RDV 2', rdv3: 'RDV 3', converti: 'Converti', perdu: 'Perdu',
}

type Tab = 'overview' | 'contacts' | 'documents' | 'messages' | 'settings'

interface Contact {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  profession: string | null
  pipeline_stage: string
  nurturing_category: NurturingCategory | null
  temperature: TemperatureLevel
  pressure_score: PressureLevel
  nb_relances_sans_reponse: number
  last_contact_at: string | null
  next_action_date: string | null
  next_action_channel: NurturingChannel | null
  engagement_score: number
  total_touchpoints: number
  responded_touchpoints: number
  themes: NurturingTheme[]
  sequence_active: string | null
  tags: string[]
}

interface Settings {
  cold_days_no_response: number
  cold_relances_no_view: number
  warm_days_since_response: number
  hot_days_since_response: number
  pressure_high_relances_7d: number
  pressure_stop_no_view: number
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────

export default function NurturingPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('overview')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [themes, setThemes] = useState<NurturingTheme[]>([])
  const [documents, setDocuments] = useState<NurturingDocument[]>([])
  const [messages, setMessages] = useState<NurturingMessage[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)

  const [categoryFilter, setCategoryFilter] = useState<NurturingCategory | 'all'>('all')
  const [tempFilter, setTempFilter] = useState<TemperatureLevel | 'all'>('all')
  const [pressureFilter, setPressureFilter] = useState<PressureLevel | 'all'>('all')
  const [themeFilter, setThemeFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [showDueOnly, setShowDueOnly] = useState(false)
  const [sortBy, setSortBy] = useState<'date' | 'temperature' | 'pressure' | 'relances'>('date')

  const [showDocForm, setShowDocForm] = useState(false)
  const [showMsgForm, setShowMsgForm] = useState(false)
  const [showThemeForm, setShowThemeForm] = useState(false)
  const [showSettingsEdit, setShowSettingsEdit] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [recalculating, setRecalculating] = useState(false)

  useEffect(() => { saveLastSection('/nurturing') }, [])

  const fetchStatic = useCallback(async () => {
    const [tRes, dRes, mRes, sRes] = await Promise.all([
      fetch('/api/nurturing/themes'),
      fetch('/api/nurturing/documents'),
      fetch('/api/nurturing/messages'),
      fetch('/api/nurturing/settings'),
    ])
    const [tData, dData, mData, sData] = await Promise.all([
      tRes.json(), dRes.json(), mRes.json(), sRes.json(),
    ])
    setThemes(tData.data || [])
    setDocuments(dData.data || [])
    setMessages(mData.data || [])
    setSettings(sData.data || null)
  }, [])

  const fetchContacts = useCallback(async () => {
    const params = new URLSearchParams()
    if (categoryFilter !== 'all') params.set('category', categoryFilter)
    if (tempFilter !== 'all') params.set('temperature', tempFilter)
    if (pressureFilter !== 'all') params.set('pressure', pressureFilter)
    if (search) params.set('search', search)
    if (showDueOnly) params.set('due_today', 'true')

    const cRes = await fetch(`/api/nurturing/contacts?${params}`)
    const cData = await cRes.json()
    setContacts(cData.data || [])
  }, [categoryFilter, tempFilter, pressureFilter, search, showDueOnly])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      await Promise.all([fetchStatic(), fetchContacts()])
    } catch { /* silent */ } finally { setLoading(false) }
  }, [fetchStatic, fetchContacts])

  useEffect(() => { fetchAll() }, [])
  useEffect(() => { fetchContacts() }, [fetchContacts])

  // ─── COMPUTED ──────────────────────────────────────────────────────────────

  const dueToday = contacts.filter(c => c.next_action_date && c.next_action_date <= new Date().toISOString().split('T')[0])
  const hotContacts = contacts.filter(c => c.temperature === 'hot')
  const overPressured = contacts.filter(c => c.pressure_score === 'a_stopper')
  const noAction = contacts.filter(c => !c.next_action_date && c.temperature !== 'dead')
  const withSequence = contacts.filter(c => c.sequence_active)

  const tempCounts = {
    hot: contacts.filter(c => c.temperature === 'hot').length,
    warm: contacts.filter(c => c.temperature === 'warm').length,
    cold: contacts.filter(c => c.temperature === 'cold').length,
    dead: contacts.filter(c => c.temperature === 'dead').length,
  }

  const catCounts = {
    rdv_fait: contacts.filter(c => c.nurturing_category === 'rdv_fait').length,
    prospect_froid: contacts.filter(c => c.nurturing_category === 'prospect_froid').length,
    interpro: contacts.filter(c => c.nurturing_category === 'interpro').length,
  }

  const filteredContacts = contacts.filter(c => {
    if (themeFilter !== 'all' && !c.themes.some(t => t.id === themeFilter)) return false
    return true
  }).sort((a, b) => {
    if (sortBy === 'temperature') {
      const order: Record<string, number> = { hot: 0, warm: 1, cold: 2, dead: 3 }
      return (order[a.temperature] || 3) - (order[b.temperature] || 3)
    }
    if (sortBy === 'pressure') {
      const order: Record<string, number> = { a_stopper: 0, elevee: 1, normal: 2 }
      return (order[a.pressure_score] || 2) - (order[b.pressure_score] || 2)
    }
    if (sortBy === 'relances') return (b.nb_relances_sans_reponse || 0) - (a.nb_relances_sans_reponse || 0)
    return 0
  })

  // ─── HANDLERS ──────────────────────────────────────────────────────────────

  async function handleAddTheme(name: string, color: string, icon: string) {
    await fetch('/api/nurturing/themes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, color, icon }) })
    setShowThemeForm(false); fetchAll()
  }
  async function handleAddDocument(doc: { title: string; theme_id: string; format: string; url: string; channels_compatible: string[]; tags: string[] }) {
    await fetch('/api/nurturing/documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(doc) })
    setShowDocForm(false); fetchAll()
  }
  async function handleAddMessage(msg: { title: string; channel: string; subject: string; body: string; tags: string[] }) {
    await fetch('/api/nurturing/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(msg) })
    setShowMsgForm(false); fetchAll()
  }
  async function handleSaveSettings(s: Settings) {
    await fetch('/api/nurturing/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s) })
    setShowSettingsEdit(false); fetchAll()
  }
  async function handleDeleteDocument(id: string) { await fetch(`/api/nurturing/documents?id=${id}`, { method: 'DELETE' }); fetchAll() }
  async function handleDeleteMessage(id: string) { await fetch(`/api/nurturing/messages?id=${id}`, { method: 'DELETE' }); fetchAll() }
  async function handleRecalculate() {
    setRecalculating(true)
    try {
      await fetch('/api/nurturing/recalculate', { method: 'POST' })
      await fetchAll()
    } finally { setRecalculating(false) }
  }

  // ─── RENDER ────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '24px 32px', fontFamily: 'JetBrains Mono, monospace', color: C.text, minHeight: '100vh' }}>
      {/* ═══ HEADER ═══ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 28, fontFamily: 'Oswald, sans-serif', color: C.textHi, fontWeight: 600, letterSpacing: 1 }}>
            NURTURING
          </h1>
          <p style={{ fontSize: 12, color: C.textMid, marginTop: 4 }}>
            Maturation & relances · {contacts.length} contacts actifs
          </p>
        </div>
        <button onClick={handleRecalculate} disabled={recalculating} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${C.gold}40`, background: recalculating ? C.surface2 : `${C.gold}12`, color: recalculating ? C.textLo : C.gold, fontSize: 11, fontWeight: 600, cursor: recalculating ? 'default' : 'pointer', fontFamily: 'JetBrains Mono, monospace' }}>
          {recalculating ? '⏳ Recalcul...' : '🔄 Recalculer scores'}
        </button>
        {/* Cross-links to related sections */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <LinkBadge href="/crm" label="CRM" value={catCounts.rdv_fait} color="gold" />
          <LinkBadge href="/cercle" label="Cercle" value={catCounts.interpro} color="purple" />
          <LinkBadge href="/sequences" label="Séquences" value={withSequence.length} color="green" />
          <LinkBadge href="/today" label="Today" value={dueToday.length} color="cyan" />
        </div>
      </div>

      {/* ═══ TAB BAR ═══ */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: `1px solid ${C.line}`, paddingBottom: 12 }}>
        {([
          { id: 'overview' as Tab, label: '📊 Vue globale' },
          { id: 'contacts' as Tab, label: '👥 Contacts' },
          { id: 'documents' as Tab, label: '📄 Bibliothèque' },
          { id: 'messages' as Tab, label: '💬 Messages' },
          { id: 'settings' as Tab, label: '⚙️ Configuration' },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '8px 16px', borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer',
            background: tab === t.id ? C.surface2 : 'transparent',
            color: tab === t.id ? C.textHi : C.textMid, fontSize: 12, fontWeight: tab === t.id ? 700 : 400,
            fontFamily: 'JetBrains Mono, monospace',
            borderBottom: tab === t.id ? `2px solid ${C.gold}` : '2px solid transparent',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══ OVERVIEW TAB ═══ */}
      {tab === 'overview' && (
        <OverviewTab
          contacts={contacts}
          dueToday={dueToday}
          hotContacts={hotContacts}
          overPressured={overPressured}
          noAction={noAction}
          tempCounts={tempCounts}
          catCounts={catCounts}
          themes={themes}
          documents={documents}
          messages={messages}
          onSelectContact={setSelectedContact}
          onNavigate={(t: Tab) => setTab(t)}
          router={router}
        />
      )}

      {/* ═══ CONTACTS TAB ═══ */}
      {tab === 'contacts' && (
        <>
          {/* Alert banner */}
          {dueToday.length > 0 && (
            <div style={{ background: `${C.gold}12`, border: `1px solid ${C.gold}30`, borderRadius: 12, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>⚡</span>
              <span style={{ fontSize: 12, color: C.gold, fontWeight: 600 }}>{dueToday.length} action{dueToday.length > 1 ? 's' : ''} en attente</span>
              <button onClick={() => setShowDueOnly(!showDueOnly)} style={{ marginLeft: 'auto', ...chipBtnStyle, background: showDueOnly ? C.gold : C.surface3, color: showDueOnly ? C.bgDeep : C.text }}>
                {showDueOnly ? '✕ Voir tout' : 'Filtrer urgent'}
              </button>
            </div>
          )}

          {/* Filters + Sort */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
            <input placeholder="Rechercher un contact..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, width: 220 }} />
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as NurturingCategory | 'all')} style={selectStyle}>
              <option value="all">Catégorie</option>
              {Object.entries(CATEGORY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label} ({catCounts[k as NurturingCategory]})</option>)}
            </select>
            <select value={tempFilter} onChange={e => setTempFilter(e.target.value as TemperatureLevel | 'all')} style={selectStyle}>
              <option value="all">Température</option>
              {Object.entries(TEMP_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label} ({tempCounts[k as TemperatureLevel]})</option>)}
            </select>
            <select value={pressureFilter} onChange={e => setPressureFilter(e.target.value as PressureLevel | 'all')} style={selectStyle}>
              <option value="all">Pression</option>
              {Object.entries(PRESSURE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
            </select>
            {themes.length > 0 && (
              <select value={themeFilter} onChange={e => setThemeFilter(e.target.value)} style={selectStyle}>
                <option value="all">Thème</option>
                {themes.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
              </select>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: C.textLo }}>Tri :</span>
              {(['date', 'temperature', 'pressure', 'relances'] as const).map(s => (
                <button key={s} onClick={() => setSortBy(s)} style={{ ...chipBtnStyle, background: sortBy === s ? C.surface3 : 'transparent', color: sortBy === s ? C.textHi : C.textLo }}>
                  {s === 'date' ? '📅' : s === 'temperature' ? '🌡️' : s === 'pressure' ? '📊' : '⚠️'}
                </button>
              ))}
            </div>
          </div>

          {/* Results count */}
          <div style={{ fontSize: 11, color: C.textLo, marginBottom: 10 }}>
            {filteredContacts.length} résultat{filteredContacts.length > 1 ? 's' : ''}
          </div>

          {/* Contact list */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: C.textMid }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
              <p style={{ fontSize: 13 }}>Chargement...</p>
            </div>
          ) : filteredContacts.length === 0 ? (
            <EmptyState icon="🌱" text="Aucun contact avec ces filtres" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filteredContacts.map(c => <ContactCard key={c.id} contact={c} onClick={() => setSelectedContact(c)} router={router} />)}
            </div>
          )}
        </>
      )}

      {tab === 'documents' && <DocumentsTab documents={documents} themes={themes} onAdd={() => setShowDocForm(true)} onDelete={handleDeleteDocument} />}
      {tab === 'messages' && <MessagesTab messages={messages} onAdd={() => setShowMsgForm(true)} onDelete={handleDeleteMessage} />}
      {tab === 'settings' && <SettingsTab settings={settings} themes={themes} onSave={handleSaveSettings} onAddTheme={() => setShowThemeForm(true)} showEdit={showSettingsEdit} setShowEdit={setShowSettingsEdit} />}

      {/* Modals */}
      {showDocForm && <DocumentFormModal themes={themes} onSubmit={handleAddDocument} onClose={() => setShowDocForm(false)} />}
      {showMsgForm && <MessageFormModal onSubmit={handleAddMessage} onClose={() => setShowMsgForm(false)} />}
      {showThemeForm && <ThemeFormModal onSubmit={handleAddTheme} onClose={() => setShowThemeForm(false)} />}
      {selectedContact && <ContactDetailModal contact={selectedContact} themes={themes} documents={documents} messages={messages} onClose={() => setSelectedContact(null)} onRefresh={fetchAll} router={router} />}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// OVERVIEW TAB — Dashboard summary with actionable insights
// ═══════════════════════════════════════════════════════════════════════════════

function OverviewTab({ contacts, dueToday, hotContacts, overPressured, noAction, tempCounts, catCounts, themes, documents, messages, onSelectContact, onNavigate, router }: {
  contacts: Contact[]; dueToday: Contact[]; hotContacts: Contact[]; overPressured: Contact[]; noAction: Contact[]
  tempCounts: Record<TemperatureLevel, number>; catCounts: Record<NurturingCategory, number>
  themes: NurturingTheme[]; documents: NurturingDocument[]; messages: NurturingMessage[]
  onSelectContact: (c: Contact) => void; onNavigate: (t: Tab) => void
  router: ReturnType<typeof useRouter>
}) {
  return (
    <div>
      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
        <KpiCard value={contacts.length} label="En nurturing" icon="👥" color={C.indigo} />
        <KpiCard value={dueToday.length} label="À traiter" icon="⚡" color={C.gold} highlight={dueToday.length > 0} />
        <KpiCard value={hotContacts.length} label="Chauds" icon="🔥" color="#ff4444" />
        <KpiCard value={overPressured.length} label="Sur-sollicités" icon="🛑" color="#ff6470" highlight={overPressured.length > 0} />
        <KpiCard value={noAction.length} label="Sans action prévue" icon="😴" color={C.textLo} />
      </div>

      {/* Temperature distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Thermometer */}
        <div style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 14, color: C.textHi, fontFamily: 'Oswald, sans-serif', marginBottom: 16 }}>Répartition température</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            {(Object.entries(TEMP_CONFIG) as [TemperatureLevel, typeof TEMP_CONFIG['hot']][]).map(([key, cfg]) => {
              const count = tempCounts[key]
              const pct = contacts.length ? Math.round((count / contacts.length) * 100) : 0
              return (
                <div key={key} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 4 }}>{cfg.icon}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: cfg.color }}>{count}</div>
                  <div style={{ fontSize: 10, color: C.textLo, marginTop: 2 }}>{pct}%</div>
                  <div style={{ height: 4, borderRadius: 2, background: `${cfg.color}20`, marginTop: 6 }}>
                    <div style={{ height: '100%', borderRadius: 2, background: cfg.color, width: `${pct}%` }} />
                  </div>
                  <div style={{ fontSize: 10, color: C.textMid, marginTop: 4 }}>{cfg.label}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Categories */}
        <div style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 14, color: C.textHi, fontFamily: 'Oswald, sans-serif', marginBottom: 16 }}>Par catégorie</h3>
          {(Object.entries(CATEGORY_CONFIG) as [NurturingCategory, typeof CATEGORY_CONFIG['rdv_fait']][]).map(([key, cfg]) => (
            <div key={key} onClick={() => router.push(cfg.linkedSection)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', cursor: 'pointer', borderBottom: `1px solid ${C.line}20` }}>
              <span style={{ fontSize: 20 }}>{cfg.icon}</span>
              <span style={{ flex: 1, fontSize: 13, color: C.text }}>{cfg.label}</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: cfg.color }}>{catCounts[key]}</span>
              <span style={{ fontSize: 10, color: C.textLo }}>→ {cfg.linkedSection.replace('/', '')}</span>
            </div>
          ))}
          <div style={{ marginTop: 12, display: 'flex', gap: 6 }}>
            <LinkChip href="/crm" label="Ouvrir CRM" color="gold" />
            <LinkChip href="/cercle" label="Ouvrir Cercle" color="purple" />
          </div>
        </div>
      </div>

      {/* Action queue — due today */}
      {dueToday.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, color: C.gold, fontFamily: 'Oswald, sans-serif' }}>À TRAITER AUJOURD'HUI</h3>
            <span style={{ fontSize: 11, color: C.textLo }}>Actions en retard ou dues</span>
            <div style={{ marginLeft: 'auto' }}>
              <LinkChip href="/today" label="Voir dans Today →" color="gold" />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {dueToday.slice(0, 5).map(c => (
              <ActionRow key={c.id} contact={c} onClick={() => onSelectContact(c)} />
            ))}
            {dueToday.length > 5 && (
              <button onClick={() => onNavigate('contacts')} style={{ ...chipBtnStyle, alignSelf: 'center', marginTop: 8 }}>
                Voir les {dueToday.length - 5} autres →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Resources summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <ResourceCard icon="📄" count={documents.length} label="Documents" sublabel={`${themes.length} thèmes`} onClick={() => onNavigate('documents')} />
        <ResourceCard icon="💬" count={messages.length} label="Messages prêts" sublabel="Tous canaux" onClick={() => onNavigate('messages')} />
        <ResourceCard icon="🔄" count={contacts.filter(c => c.sequence_active).length} label="Séquences actives" sublabel="En cours d'envoi" onClick={() => router.push('/sequences')} />
      </div>
    </div>
  )
}

function KpiCard({ value, label, icon, color, highlight }: { value: number; label: string; icon: string; color: string; highlight?: boolean }) {
  return (
    <div style={{
      background: highlight ? `${color}12` : C.surface1,
      border: `1px solid ${highlight ? `${color}40` : C.line}`,
      borderRadius: 10, padding: '14px 16px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 20 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: highlight ? color : C.textHi, marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 10, color: C.textMid, marginTop: 2 }}>{label}</div>
    </div>
  )
}

function ResourceCard({ icon, count, label, sublabel, onClick }: { icon: string; count: number; label: string; sublabel: string; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 10, padding: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ fontSize: 24 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.textHi }}>{count}</div>
        <div style={{ fontSize: 11, color: C.textMid }}>{label}</div>
        <div style={{ fontSize: 10, color: C.textLo }}>{sublabel}</div>
      </div>
    </div>
  )
}

function ActionRow({ contact, onClick }: { contact: Contact; onClick: () => void }) {
  const temp = TEMP_CONFIG[contact.temperature || 'cold']
  return (
    <div onClick={onClick} style={{
      background: `${C.gold}08`, border: `1px solid ${C.gold}20`, borderRadius: 10,
      padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <span style={{ fontSize: 16 }}>{temp.icon}</span>
      <span style={{ flex: 1, fontSize: 13, color: C.textHi, fontWeight: 600 }}>{contact.full_name}</span>
      {contact.profession && <span style={{ fontSize: 11, color: C.textMid }}>{contact.profession}</span>}
      {contact.next_action_channel && <span style={{ fontSize: 14 }}>{CHANNEL_ICONS[contact.next_action_channel]}</span>}
      <span style={{ fontSize: 11, color: '#ff4444', fontWeight: 600 }}>{formatDate(contact.next_action_date!)}</span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTACT CARD — with temperature-themed background
// ═══════════════════════════════════════════════════════════════════════════════

function ContactCard({ contact, onClick, router }: { contact: Contact; onClick: () => void; router: ReturnType<typeof useRouter> }) {
  const temp = TEMP_CONFIG[contact.temperature || 'cold']
  const pressure = PRESSURE_CONFIG[contact.pressure_score || 'normal']
  const category = contact.nurturing_category ? CATEGORY_CONFIG[contact.nurturing_category] : null
  const isOverdue = contact.next_action_date && contact.next_action_date <= new Date().toISOString().split('T')[0]
  const bgImage = `url("data:image/svg+xml,${encodeURIComponent(temp.bgSvg)}")`

  return (
    <div onClick={onClick} style={{
      position: 'relative', overflow: 'hidden',
      background: temp.gradient,
      border: `1px solid ${temp.color}30`,
      borderRadius: 14, padding: '14px 20px',
      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
      borderLeft: `4px solid ${temp.color}`,
      transition: 'transform 0.15s, box-shadow 0.15s',
      boxShadow: `0 2px 12px ${temp.color}15, inset 0 1px 0 ${temp.color}10`,
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 4px 20px ${temp.color}25` }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 2px 12px ${temp.color}15, inset 0 1px 0 ${temp.color}10` }}
    >
      {/* BG illustration */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: bgImage, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} />
      <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', pointerEvents: 'none', background: `radial-gradient(circle, ${temp.color}12 0%, transparent 70%)` }} />

      {/* Temperature badge */}
      <div style={{ position: 'relative', zIndex: 1, width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, background: `radial-gradient(circle, ${temp.color}30 0%, ${temp.color}10 100%)`, border: `2px solid ${temp.color}50`, boxShadow: `0 0 10px ${temp.color}25` }}>
        {temp.icon}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>{contact.full_name}</span>
          {category && (
            <span onClick={e => { e.stopPropagation(); router.push(category.linkedSection) }} style={{
              fontSize: 10, color: category.color, background: `${category.color}15`, padding: '2px 7px', borderRadius: 4, cursor: 'pointer',
              border: `1px solid ${category.color}30`,
            }}>
              {category.icon} {category.label} →
            </span>
          )}
          {contact.sequence_active && (
            <span onClick={e => { e.stopPropagation(); router.push('/sequences') }} style={{ fontSize: 10, color: C.green, background: `${C.green}12`, padding: '2px 7px', borderRadius: 4, cursor: 'pointer' }}>
              ▶ Séquence
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 3, display: 'flex', gap: 10 }}>
          {contact.profession && <span>{contact.profession}</span>}
          <span>{PIPELINE_LABELS[contact.pipeline_stage] || contact.pipeline_stage}</span>
          <span>📊 {contact.total_touchpoints}tp · {contact.responded_touchpoints} rép.</span>
          {contact.nb_relances_sans_reponse > 0 && <span style={{ color: C.warn }}>⚠{contact.nb_relances_sans_reponse} s/r</span>}
        </div>
      </div>

      {/* Themes */}
      {contact.themes.length > 0 && (
        <div style={{ display: 'flex', gap: 3, position: 'relative', zIndex: 1 }}>
          {contact.themes.slice(0, 3).map(t => (
            <span key={t.id} style={{ fontSize: 10, padding: '3px 6px', borderRadius: 4, background: `${t.color}20`, color: t.color, border: `1px solid ${t.color}25` }}>{t.icon}</span>
          ))}
        </div>
      )}

      {/* Pressure */}
      <div style={{ position: 'relative', zIndex: 1, fontSize: 10, padding: '4px 8px', borderRadius: 5, background: `${pressure.color}18`, color: pressure.color, fontWeight: 600, border: `1px solid ${pressure.color}25` }}>
        {pressure.icon} {pressure.label}
      </div>

      {/* Next action */}
      <div style={{ textAlign: 'right', minWidth: 80, position: 'relative', zIndex: 1 }}>
        {contact.next_action_date && (
          <div style={{ fontSize: 11, fontWeight: isOverdue ? 700 : 400, color: isOverdue ? '#ff4444' : 'rgba(255,255,255,0.65)' }}>
            {isOverdue ? '🚨 ' : ''}{formatDate(contact.next_action_date)}
          </div>
        )}
        {contact.next_action_channel && <div style={{ fontSize: 14, marginTop: 2 }}>{CHANNEL_ICONS[contact.next_action_channel]}</div>}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENTS TAB
// ═══════════════════════════════════════════════════════════════════════════════

function DocumentsTab({ documents, themes, onAdd, onDelete }: { documents: NurturingDocument[]; themes: NurturingTheme[]; onAdd: () => void; onDelete: (id: string) => void }) {
  const [filterTheme, setFilterTheme] = useState<string>('all')
  const filtered = filterTheme === 'all' ? documents : documents.filter(d => d.theme_id === filterTheme)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setFilterTheme('all')} style={{ ...chipBtnStyle, background: filterTheme === 'all' ? C.surface3 : 'transparent', color: filterTheme === 'all' ? C.textHi : C.textMid }}>Tous</button>
          {themes.map(t => (
            <button key={t.id} onClick={() => setFilterTheme(filterTheme === t.id ? 'all' : t.id)} style={{
              ...chipBtnStyle, background: filterTheme === t.id ? `${t.color}25` : 'transparent', color: filterTheme === t.id ? t.color : C.textMid, border: filterTheme === t.id ? `1px solid ${t.color}40` : '1px solid transparent',
            }}>{t.icon} {t.name}</button>
          ))}
        </div>
        <button onClick={onAdd} style={goldBtnStyle}>+ Document</button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="📄" text="Aucun document — ajoutez votre première brochure ou simulation" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
          {filtered.map(doc => (
            <div key={doc.id} style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.textHi }}>{doc.title}</div>
                  <div style={{ fontSize: 11, color: C.textMid, marginTop: 3 }}>{doc.format.toUpperCase()} · {doc.channels_compatible.join(', ')}</div>
                </div>
                <button onClick={() => onDelete(doc.id)} style={{ background: 'none', border: 'none', color: C.textLo, cursor: 'pointer', fontSize: 14 }}>✕</button>
              </div>
              {doc.theme && <span style={{ display: 'inline-block', marginTop: 8, fontSize: 10, padding: '2px 7px', borderRadius: 4, background: `${doc.theme.color}18`, color: doc.theme.color }}>{doc.theme.icon} {doc.theme.name}</span>}
              {doc.tags.length > 0 && (
                <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {doc.tags.map(tag => <span key={tag} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: C.surface3, color: C.textMid }}>{tag}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGES TAB
// ═══════════════════════════════════════════════════════════════════════════════

function MessagesTab({ messages, onAdd, onDelete }: { messages: NurturingMessage[]; onAdd: () => void; onDelete: (id: string) => void }) {
  const [filterChannel, setFilterChannel] = useState<string>('all')
  const filtered = filterChannel === 'all' ? messages : messages.filter(m => m.channel === filterChannel)
  const channels: NurturingChannel[] = ['email', 'whatsapp', 'linkedin', 'telephone', 'sms', 'courrier']

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setFilterChannel('all')} style={{ ...chipBtnStyle, background: filterChannel === 'all' ? C.surface3 : 'transparent', color: filterChannel === 'all' ? C.textHi : C.textMid }}>Tous</button>
          {channels.map(ch => (
            <button key={ch} onClick={() => setFilterChannel(filterChannel === ch ? 'all' : ch)} style={{ ...chipBtnStyle, background: filterChannel === ch ? C.surface3 : 'transparent', color: filterChannel === ch ? C.textHi : C.textMid }}>
              {CHANNEL_ICONS[ch]}
            </button>
          ))}
        </div>
        <button onClick={onAdd} style={goldBtnStyle}>+ Message</button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="💬" text="Aucun message pré-enregistré — créez votre premier template" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(msg => (
            <div key={msg.id} style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 12, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 15 }}>{CHANNEL_ICONS[msg.channel]}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.textHi }}>{msg.title}</span>
                    <span style={{ fontSize: 10, color: C.textLo, background: C.surface2, padding: '1px 6px', borderRadius: 4 }}>{msg.channel}</span>
                  </div>
                  {msg.subject && <div style={{ fontSize: 11, color: C.textMid, marginTop: 3 }}>Objet : {msg.subject}</div>}
                  <div style={{ fontSize: 11, color: C.textLo, marginTop: 5, whiteSpace: 'pre-wrap', maxHeight: 50, overflow: 'hidden', lineHeight: 1.4 }}>{msg.body}</div>
                </div>
                <button onClick={() => onDelete(msg.id)} style={{ background: 'none', border: 'none', color: C.textLo, cursor: 'pointer', fontSize: 14, marginLeft: 8 }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SETTINGS TAB
// ═══════════════════════════════════════════════════════════════════════════════

function SettingsTab({ settings, themes, onSave, onAddTheme, showEdit, setShowEdit }: {
  settings: Settings | null; themes: NurturingTheme[]; onSave: (s: Settings) => void; onAddTheme: () => void; showEdit: boolean; setShowEdit: (v: boolean) => void
}) {
  const [form, setForm] = useState<Settings>(settings || { cold_days_no_response: 14, cold_relances_no_view: 3, warm_days_since_response: 7, hot_days_since_response: 3, pressure_high_relances_7d: 4, pressure_stop_no_view: 5 })
  useEffect(() => { if (settings) setForm(settings) }, [settings])

  return (
    <div style={{ maxWidth: 720 }}>
      {/* Themes */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 15, color: C.textHi, fontFamily: 'Oswald, sans-serif' }}>Thèmes / Besoins</h3>
          <button onClick={onAddTheme} style={{ ...chipBtnStyle, background: C.surface3 }}>+ Ajouter thème</button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {themes.map(t => (
            <div key={t.id} style={{ padding: '8px 14px', borderRadius: 8, background: `${t.color}15`, border: `1px solid ${t.color}35`, color: t.color, fontSize: 12, fontWeight: 600 }}>
              {t.icon} {t.name}
            </div>
          ))}
          {themes.length === 0 && <span style={{ fontSize: 12, color: C.textLo }}>Aucun thème créé</span>}
        </div>
      </div>

      {/* Scoring thresholds */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 15, color: C.textHi, fontFamily: 'Oswald, sans-serif' }}>Seuils de scoring</h3>
          <button onClick={() => setShowEdit(!showEdit)} style={{ ...chipBtnStyle, background: showEdit ? '#ff647020' : C.surface3, color: showEdit ? '#ff6470' : C.text }}>
            {showEdit ? '✕ Annuler' : '✏️ Modifier'}
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <SettingField label="Froid après (jours)" value={form.cold_days_no_response} editing={showEdit} onChange={v => setForm({ ...form, cold_days_no_response: v })} />
          <SettingField label="Froid après (relances sans vue)" value={form.cold_relances_no_view} editing={showEdit} onChange={v => setForm({ ...form, cold_relances_no_view: v })} />
          <SettingField label="Tiède si réponse < (jours)" value={form.warm_days_since_response} editing={showEdit} onChange={v => setForm({ ...form, warm_days_since_response: v })} />
          <SettingField label="Chaud si réponse < (jours)" value={form.hot_days_since_response} editing={showEdit} onChange={v => setForm({ ...form, hot_days_since_response: v })} />
          <SettingField label="Pression élevée (relances/7j)" value={form.pressure_high_relances_7d} editing={showEdit} onChange={v => setForm({ ...form, pressure_high_relances_7d: v })} />
          <SettingField label="Stop pression (sans vue)" value={form.pressure_stop_no_view} editing={showEdit} onChange={v => setForm({ ...form, pressure_stop_no_view: v })} />
        </div>
        {showEdit && <button onClick={() => onSave(form)} style={{ ...goldBtnStyle, marginTop: 14 }}>Sauvegarder les seuils</button>}
      </div>

      {/* Linked sections info */}
      <div style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 12, padding: 20 }}>
        <h3 style={{ fontSize: 15, color: C.textHi, fontFamily: 'Oswald, sans-serif', marginBottom: 12 }}>Sections liées</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <LinkButton href="/crm" label="CRM Kanban → Pipeline stages" color="gold" />
          <LinkButton href="/cercle" label="Cercle → Partenaires interpro" color="purple" />
          <LinkButton href="/sequences" label="Séquences → Templates de relance" color="green" />
          <LinkButton href="/today" label="Today → Actions du jour" color="cyan" />
        </div>
      </div>
    </div>
  )
}

function SettingField({ label, value, editing, onChange }: { label: string; value: number; editing: boolean; onChange: (v: number) => void }) {
  return (
    <div style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 8, padding: 10 }}>
      <div style={{ fontSize: 10, color: C.textMid, marginBottom: 4 }}>{label}</div>
      {editing ? (
        <input type="number" value={value} onChange={e => onChange(parseInt(e.target.value) || 0)} style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: `1px solid ${C.line}`, background: C.surface2, color: C.textHi, fontSize: 16, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }} />
      ) : (
        <div style={{ fontSize: 20, fontWeight: 700, color: C.textHi }}>{value}</div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTACT DETAIL MODAL — fully interconnected
// ═══════════════════════════════════════════════════════════════════════════════

function ContactDetailModal({ contact, themes, documents, messages, onClose, onRefresh, router }: {
  contact: Contact; themes: NurturingTheme[]; documents: NurturingDocument[]; messages: NurturingMessage[]; onClose: () => void; onRefresh: () => void; router: ReturnType<typeof useRouter>
}) {
  const temp = TEMP_CONFIG[contact.temperature || 'cold']
  const pressure = PRESSURE_CONFIG[contact.pressure_score || 'normal']
  const category = contact.nurturing_category ? CATEGORY_CONFIG[contact.nurturing_category] : null
  const matchedDocs = documents.filter(d => d.theme_id && contact.themes.some(t => t.id === d.theme_id))
  const suggestedMessages = messages.filter(m => {
    if (contact.next_action_channel && m.channel === contact.next_action_channel) return true
    return false
  })

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.bgMid, border: `1px solid ${C.line}`, borderRadius: 16, padding: 28, width: '100%', maxWidth: 750, maxHeight: '85vh', overflow: 'auto' }}>
        {/* Header with navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 22, color: C.textHi, fontFamily: 'Oswald, sans-serif' }}>{contact.full_name}</h2>
            <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: C.textMid }}>{contact.profession}</span>
              <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: C.surface2, color: C.textMid }}>{PIPELINE_LABELS[contact.pipeline_stage] || contact.pipeline_stage}</span>
              {category && (
                <span onClick={() => { onClose(); router.push(category.linkedSection) }} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: `${category.color}15`, color: category.color, cursor: 'pointer', border: `1px solid ${category.color}25` }}>
                  {category.icon} {category.label} →
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button onClick={() => { onClose(); router.push(buildHref('/crm', { search: contact.full_name })) }} style={smallLinkStyle}>CRM →</button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.textLo, fontSize: 22, cursor: 'pointer' }}>✕</button>
          </div>
        </div>

        {/* Score cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
          <div style={{ background: `${temp.color}12`, border: `1px solid ${temp.color}30`, borderRadius: 10, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 22 }}>{temp.icon}</div>
            <div style={{ fontSize: 11, color: temp.color, fontWeight: 600, marginTop: 3 }}>{temp.label}</div>
          </div>
          <div style={{ background: `${pressure.color}12`, border: `1px solid ${pressure.color}30`, borderRadius: 10, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 22 }}>{pressure.icon}</div>
            <div style={{ fontSize: 11, color: pressure.color, fontWeight: 600, marginTop: 3 }}>{pressure.label}</div>
          </div>
          <div style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 10, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.textHi }}>{contact.total_touchpoints}</div>
            <div style={{ fontSize: 10, color: C.textMid, marginTop: 2 }}>touchpoints ({contact.responded_touchpoints} rép.)</div>
          </div>
          <div style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 10, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: contact.nb_relances_sans_reponse > 2 ? C.warn : C.textHi }}>{contact.nb_relances_sans_reponse}</div>
            <div style={{ fontSize: 10, color: C.textMid, marginTop: 2 }}>sans réponse</div>
          </div>
        </div>

        {/* Two columns: themes + next action */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
          {/* Themes */}
          <div style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14 }}>
            <h4 style={{ fontSize: 11, color: C.textMid, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Thèmes / Besoins</h4>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {contact.themes.length > 0 ? contact.themes.map(t => (
                <span key={t.id} style={{ padding: '4px 10px', borderRadius: 6, background: `${t.color}18`, color: t.color, fontSize: 11, fontWeight: 600, border: `1px solid ${t.color}25` }}>
                  {t.icon} {t.name}
                </span>
              )) : <span style={{ fontSize: 11, color: C.textLo }}>Aucun thème attribué</span>}
            </div>
          </div>

          {/* Next action + sequence */}
          <div style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14 }}>
            <h4 style={{ fontSize: 11, color: C.textMid, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Prochaine action</h4>
            {contact.next_action_date ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {contact.next_action_channel && <span style={{ fontSize: 18 }}>{CHANNEL_ICONS[contact.next_action_channel]}</span>}
                <span style={{ fontSize: 13, color: C.textHi, fontWeight: 600 }}>{formatDate(contact.next_action_date)}</span>
              </div>
            ) : <span style={{ fontSize: 11, color: C.textLo }}>Non planifiée</span>}
            {contact.sequence_active && (
              <div style={{ marginTop: 8 }}>
                <span onClick={() => { onClose(); router.push('/sequences') }} style={{ fontSize: 10, color: C.green, cursor: 'pointer', borderBottom: `1px dashed ${C.green}50` }}>▶ Séquence en cours → Voir</span>
              </div>
            )}
          </div>
        </div>

        {/* Documents suggérés */}
        {matchedDocs.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h4 style={{ fontSize: 11, color: C.textMid, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>📄 Documents suggérés (par thème)</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {matchedDocs.map(doc => (
                <div key={doc.id} style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: C.textHi }}>{doc.title}</span>
                    <span style={{ fontSize: 9, color: C.textLo }}>{doc.format.toUpperCase()}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {doc.channels_compatible.slice(0, 3).map(ch => <span key={ch} style={{ fontSize: 12 }}>{CHANNEL_ICONS[ch as NurturingChannel] || ch}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messages suggérés */}
        {suggestedMessages.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h4 style={{ fontSize: 11, color: C.textMid, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>💬 Messages prêts ({contact.next_action_channel})</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {suggestedMessages.slice(0, 3).map(msg => (
                <div key={msg.id} style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: 12, color: C.textHi, fontWeight: 600 }}>{msg.title}</div>
                  <div style={{ fontSize: 10, color: C.textLo, marginTop: 3, whiteSpace: 'pre-wrap', maxHeight: 36, overflow: 'hidden' }}>{msg.body}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14 }}>
          <h4 style={{ fontSize: 11, color: C.textMid, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Actions rapides</h4>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {contact.phone && <button onClick={() => window.open(`tel:${contact.phone}`)} style={actionBtnStyle}>📞 Appeler</button>}
            {contact.email && <button onClick={() => window.open(`mailto:${contact.email}`)} style={actionBtnStyle}>✉️ Email</button>}
            {contact.phone && <button onClick={() => window.open(`https://wa.me/${contact.phone?.replace(/\D/g, '')}`)} style={actionBtnStyle}>💬 WhatsApp</button>}
            <button onClick={() => { onClose(); router.push('/sequences') }} style={actionBtnStyle}>🔄 Lancer séquence</button>
            <button onClick={() => { onClose(); router.push(buildHref('/crm', { search: contact.full_name })) }} style={actionBtnStyle}>📋 Voir dans CRM</button>
            {contact.nurturing_category === 'interpro' && <button onClick={() => { onClose(); router.push('/cercle') }} style={actionBtnStyle}>🤝 Voir partenaire</button>}
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORM MODALS
// ═══════════════════════════════════════════════════════════════════════════════

function DocumentFormModal({ themes, onSubmit, onClose }: { themes: NurturingTheme[]; onSubmit: (doc: { title: string; theme_id: string; format: string; url: string; channels_compatible: string[]; tags: string[] }) => void; onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [themeId, setThemeId] = useState('')
  const [format, setFormat] = useState('pdf')
  const [url, setUrl] = useState('')
  const [channels, setChannels] = useState<string[]>(['email'])
  const [tagsStr, setTagsStr] = useState('')

  return (
    <Modal title="Nouveau document" onClose={onClose}>
      <FormField label="Titre" value={title} onChange={setTitle} />
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Thème</label>
        <select value={themeId} onChange={e => setThemeId(e.target.value)} style={{ ...inputStyle, width: '100%' }}>
          <option value="">Aucun</option>
          {themes.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
        </select>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Format</label>
        <select value={format} onChange={e => setFormat(e.target.value)} style={{ ...inputStyle, width: '100%' }}>
          <option value="pdf">PDF</option><option value="image">Image</option><option value="lien">Lien</option><option value="texte">Texte</option>
        </select>
      </div>
      <FormField label="URL (optionnel)" value={url} onChange={setUrl} />
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Canaux compatibles</label>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {['email', 'whatsapp', 'linkedin', 'courrier', 'sms'].map(ch => (
            <button key={ch} onClick={() => setChannels(channels.includes(ch) ? channels.filter(c => c !== ch) : [...channels, ch])} style={{ ...chipBtnStyle, background: channels.includes(ch) ? `${C.gold}25` : C.surface2, color: channels.includes(ch) ? C.gold : C.textMid, border: channels.includes(ch) ? `1px solid ${C.gold}40` : `1px solid ${C.line}` }}>{ch}</button>
          ))}
        </div>
      </div>
      <FormField label="Tags (virgule)" value={tagsStr} onChange={setTagsStr} />
      <button onClick={() => onSubmit({ title, theme_id: themeId, format, url, channels_compatible: channels, tags: tagsStr.split(',').map(s => s.trim()).filter(Boolean) })} style={goldBtnStyle}>Ajouter</button>
    </Modal>
  )
}

function MessageFormModal({ onSubmit, onClose }: { onSubmit: (msg: { title: string; channel: string; subject: string; body: string; tags: string[] }) => void; onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [channel, setChannel] = useState<string>('email')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [tagsStr, setTagsStr] = useState('')

  return (
    <Modal title="Nouveau message" onClose={onClose}>
      <FormField label="Titre (interne)" value={title} onChange={setTitle} />
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Canal</label>
        <select value={channel} onChange={e => setChannel(e.target.value)} style={{ ...inputStyle, width: '100%' }}>
          <option value="email">✉️ Email</option><option value="whatsapp">💬 WhatsApp</option><option value="linkedin">🔗 LinkedIn</option>
          <option value="telephone">📞 Téléphone</option><option value="sms">📱 SMS</option><option value="courrier">📬 Courrier</option>
        </select>
      </div>
      {channel === 'email' && <FormField label="Objet" value={subject} onChange={setSubject} />}
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Corps du message</label>
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={5} style={{ ...inputStyle, width: '100%', resize: 'vertical' }} placeholder="Variables : {prénom}, {nom}, {profession}..." />
      </div>
      <FormField label="Tags (virgule)" value={tagsStr} onChange={setTagsStr} />
      <button onClick={() => onSubmit({ title, channel, subject, body, tags: tagsStr.split(',').map(s => s.trim()).filter(Boolean) })} style={goldBtnStyle}>Ajouter</button>
    </Modal>
  )
}

function ThemeFormModal({ onSubmit, onClose }: { onSubmit: (name: string, color: string, icon: string) => void; onClose: () => void }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#e8c878')
  const [icon, setIcon] = useState('📁')

  return (
    <Modal title="Nouveau thème" onClose={onClose}>
      <FormField label="Nom" value={name} onChange={setName} />
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1 }}><label style={labelStyle}>Couleur</label><input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: '100%', height: 34, border: 'none', borderRadius: 6, cursor: 'pointer' }} /></div>
        <div style={{ flex: 1 }}><label style={labelStyle}>Icône</label><input value={icon} onChange={e => setIcon(e.target.value)} style={{ ...inputStyle, width: '100%' }} /></div>
      </div>
      <button onClick={() => onSubmit(name, color, icon)} style={goldBtnStyle}>Ajouter</button>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED UI PRIMITIVES
// ═══════════════════════════════════════════════════════════════════════════════

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.bgMid, border: `1px solid ${C.line}`, borderRadius: 16, padding: 28, width: '100%', maxWidth: 460 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 style={{ fontSize: 17, color: C.textHi, fontFamily: 'Oswald, sans-serif' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.textLo, fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function FormField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={labelStyle}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} style={{ ...inputStyle, width: '100%' }} />
    </div>
  )
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ textAlign: 'center', padding: 50, color: C.textLo }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>{icon}</div>
      <p style={{ fontSize: 13 }}>{text}</p>
    </div>
  )
}

// ─── STYLES ──────────────────────────────────────────────────────────────────

const selectStyle: React.CSSProperties = { padding: '7px 10px', borderRadius: 8, border: '1px solid #3a4690', background: '#11163a', color: '#d8e1ff', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', cursor: 'pointer' }
const inputStyle: React.CSSProperties = { padding: '8px 12px', borderRadius: 8, border: '1px solid #3a4690', background: '#11163a', color: '#ffffff', fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 10, color: '#8ea0d9', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }
const chipBtnStyle: React.CSSProperties = { padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: '#d8e1ff' }
const goldBtnStyle: React.CSSProperties = { padding: '9px 18px', borderRadius: 8, border: 'none', background: '#e8c878', color: '#0a0e22', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace', width: '100%' }
const actionBtnStyle: React.CSSProperties = { padding: '6px 12px', borderRadius: 8, border: '1px solid #3a4690', background: '#1a2150', color: '#d8e1ff', fontSize: 11, cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace' }
const smallLinkStyle: React.CSSProperties = { padding: '3px 8px', borderRadius: 4, border: `1px solid ${C.gold}30`, background: `${C.gold}10`, color: C.gold, fontSize: 10, cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace' }

function formatDate(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.floor((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return "Aujourd'hui"
  if (diff === 1) return 'Demain'
  if (diff === -1) return 'Hier'
  if (diff < -1) return `il y a ${Math.abs(diff)}j`
  return `dans ${diff}j`
}
