'use client'

import { useState, useEffect, useRef } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { saveLastSection } from '@/lib/navigation-state'

// ─── TYPES ───────────────────────────────────────────────────────────────────
type TempCategory = 'hot' | 'warm' | 'cold' | 'dead'
type DetailTab = 'sequence' | 'history' | 'config'
type Channel = 'call' | 'email' | 'whatsapp' | 'linkedin' | 'sms'
type PressureBadge = 'normal' | 'vary' | 'stop'

interface Contact {
  id: string
  temp: TempCategory
  name: string
  email?: string
  phone?: string
  job: string
  badges: string[]
  warning?: string
  nextTime: string
  nextChannel: string
  urgent: boolean
  icon: string
  stage?: string
  touchpoints: number
  responses: number
  no_responses: number
  notes?: string
  preferredChannel?: string
  preferredTime?: string
  frequency?: number
  pressure?: string
  themes?: { id: string; name: string; color: string; icon: string }[]
  excludedChannels?: string[]
  sequenceActive?: string | null
}

interface Interaction {
  id: string
  channel: string
  date: string
  note: string
  status: 'pending' | 'seen' | 'replied'
  icon: string
}

interface NurturingDoc {
  id: string
  title: string
  format: string
  url: string | null
  channels_compatible: string[]
  tags: string[]
  already_sent?: boolean
  sent_channels?: string[]
  nurturing_themes?: { id: string; name: string; color: string; icon: string } | null
}

interface NurturingMessage {
  id: string
  title: string
  channel: string
  subject: string | null
  body: string
  tags: string[]
}

interface ContactConfig {
  preferred_channel: string | null
  contact_frequency_days: number
  excluded_channels: string[]
  notes: string
  preferred_time_slot: string | null
}

// ─── MÉTRIQUE DE PRESSION PROSPECT ──────────────────────────────────────────
const PRESSURE_COEFS: Record<string, number> = {
  email: 1,
  appel: 3,
  call: 3,
  linkedin: 1.5,
  linkedin_view: 0.5,
  sms: 2,
  whatsapp: 1.5,
}

function computePressure(interactions: { channel: string; date: string }[]): { score: number; badge: PressureBadge; label: string; color: string } {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 7)

  const score = interactions
    .filter(i => new Date(i.date) >= cutoff)
    .reduce((sum, i) => sum + (PRESSURE_COEFS[i.channel] || 1), 0)

  if (score > 6) return { score, badge: 'stop', label: '🛑 STOP — mettre en pause', color: '#ff6470' }
  if (score >= 4) return { score, badge: 'vary', label: '⚡ Varier le canal ou laisser respirer', color: '#fbbf24' }
  return { score, badge: 'normal', label: '✓ Normale', color: '#4caf50' }
}

// ─── THEME PSG Cosmos ────────────────────────────────────────────────────────
const V = {
  bgDeep: '#0a0e22',
  bgMid: '#0f1430',
  surface1: '#141a3a',
  surface2: '#1a2150',
  surface3: '#232d60',
  line: '#2a3470',
  text: '#d8e1ff',
  textHi: '#ffffff',
  textMid: '#8ea0d9',
  textLo: '#5a6a9a',
  gold: '#e8c878',
  green: '#4caf50',
  cyan: '#4ecdc4',
  purple: '#a78bfa',
  indigo: '#818cf8',
  warn: '#fbbf24',
  red: '#ff6470',
  hot: '#ff4444',
  warm: '#d4a020',
  cold: '#5b9bd5',
}

const tempColors: Record<TempCategory, { border: string; bg: string; iconBg: string; iconBorder: string }> = {
  hot: {
    border: V.hot,
    bg: 'linear-gradient(135deg, #2d0808, #4a1010 30%, #3d0808)',
    iconBg: 'radial-gradient(circle,rgba(255,68,68,0.3),rgba(255,68,68,0.1))',
    iconBorder: 'rgba(255,68,68,0.5)',
  },
  warm: {
    border: V.warm,
    bg: 'linear-gradient(135deg, #2d2208, #3d2e0a 30%, #2d2208)',
    iconBg: 'radial-gradient(circle,rgba(212,160,32,0.25),rgba(212,160,32,0.08))',
    iconBorder: 'rgba(212,160,32,0.45)',
  },
  cold: {
    border: V.cold,
    bg: 'linear-gradient(135deg, #081520, #0c2040 30%, #0a1a30)',
    iconBg: 'radial-gradient(circle,rgba(91,155,213,0.25),rgba(91,155,213,0.08))',
    iconBorder: 'rgba(91,155,213,0.45)',
  },
  dead: {
    border: '#8B4513',
    bg: 'linear-gradient(135deg, #1a1008, #25180a 30%, #1a1008)',
    iconBg: 'radial-gradient(circle,rgba(139,69,19,0.2),rgba(139,69,19,0.05))',
    iconBorder: 'rgba(139,69,19,0.4)',
  },
}

const tempIcons: Record<TempCategory, string> = {
  hot: '🔥',
  warm: '☀️',
  cold: '❄️',
  dead: '🪨',
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function calculateTempCategory(
  lastContactDays: number | null,
  hasActiveSequence: boolean,
  noResponseCount: number,
  pressureScore: string | null
): TempCategory {
  if (pressureScore === 'a_stopper' || noResponseCount >= 5) return 'dead'
  if (lastContactDays === null) return 'cold'
  if (lastContactDays <= 3 || hasActiveSequence) return 'hot'
  if (lastContactDays <= 7) return 'warm'
  return 'cold'
}

function formatRelativeDate(date: Date): string {
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return 'Aujourd\'hui'
  if (days === 1) return 'Demain'
  if (days < 0) {
    const absDays = Math.abs(days)
    return `il y a ${absDays}j`
  }
  return `dans ${days}j`
}

function channelToIcon(channel: string | null): string {
  const map: Record<string, string> = {
    telephone: '📞', email: '✉️', whatsapp: '💬', linkedin: '🔗', sms: '📱', courrier: '📬',
  }
  return channel && map[channel] ? map[channel] : '📞'
}

function interactionTypeToIcon(type: string): string {
  const map: Record<string, string> = {
    appel: '📞', email: '✉️', whatsapp: '💬', linkedin: '🔗', rdv1: '📅', rdv2: '📅', rdv3: '📅', sms: '📱',
  }
  return map[type] || '📝'
}

// ─── COMPOSANT PRINCIPAL ─────────────────────────────────────────────────────
export default function NurturingPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContactIdx, setSelectedContactIdx] = useState(0)
  const [detailTab, setDetailTab] = useState<DetailTab>('sequence')
  const [openMenuIdx, setOpenMenuIdx] = useState<number | null>(null)
  const [selectedChannel, setSelectedChannel] = useState<Channel>('email')
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [messageText, setMessageText] = useState('')
  const [messageSubject, setMessageSubject] = useState('')
  const [pressure, setPressure] = useState<{ score: number; badge: PressureBadge; label: string; color: string }>({ score: 0, badge: 'normal', label: '✓ Normale', color: '#4caf50' })
  const [documents, setDocuments] = useState<NurturingDoc[]>([])
  const [messages, setMessages] = useState<NurturingMessage[]>([])
  const [contactConfig, setContactConfig] = useState<ContactConfig>({ preferred_channel: null, contact_frequency_days: 14, excluded_channels: [], notes: '', preferred_time_slot: null })
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [filterTemp, setFilterTemp] = useState<TempCategory | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [attachedDoc, setAttachedDoc] = useState<NurturingDoc | null>(null)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('09:00')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    saveLastSection('/nurturing')
    loadContacts()
    loadMessages()

    const scheduledInterval = setInterval(checkScheduledMessages, 30000)
    return () => clearInterval(scheduledInterval)
  }, [])

  useEffect(() => {
    if (contacts.length > 0) {
      loadContactDetails(contacts[selectedContactIdx].id)
    }
  }, [selectedContactIdx, contacts.length])

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // ─── DATA LOADING ────────────────────────────────────────────────────────────
  async function loadContacts() {
    setLoading(true)
    try {
      const res = await fetch('/api/nurturing/contacts')
      const json = await res.json()
      if (!json.data) { setLoading(false); return }

      const contactList: Contact[] = json.data.map((p: any) => {
        const lastContactDays = p.last_contact_at
          ? Math.floor((Date.now() - new Date(p.last_contact_at).getTime()) / (1000 * 60 * 60 * 24))
          : null

        const temp = calculateTempCategory(
          lastContactDays,
          !!p.sequence_active,
          p.nb_relances_sans_reponse || 0,
          p.pressure_score
        )

        const nextTime = p.next_action_date ? formatRelativeDate(new Date(p.next_action_date)) : 'Non planifié'

        const badges: string[] = []
        if (p.nurturing_category === 'rdv_fait') badges.push('RDV fait')

        return {
          id: p.id,
          temp,
          name: p.full_name,
          email: p.email || null,
          phone: p.phone || null,
          job: p.profession || 'Non renseigné',
          badges,
          warning: p.nb_relances_sans_reponse > 0 ? `⚠ ${p.nb_relances_sans_reponse} NR` : undefined,
          nextTime,
          nextChannel: channelToIcon(p.next_action_channel),
          urgent: nextTime === 'Aujourd\'hui',
          icon: tempIcons[temp],
          stage: p.nurturing_category || undefined,
          touchpoints: p.total_touchpoints || 0,
          responses: p.responded_touchpoints || 0,
          no_responses: p.nb_relances_sans_reponse || 0,
          notes: '',
          preferredChannel: p.preferred_channel || null,
          themes: p.themes || [],
          excludedChannels: [],
          sequenceActive: p.sequence_active || null,
        }
      })

      setContacts(contactList)
    } catch (e) {
      console.error('loadContacts error:', e)
    }
    setLoading(false)
  }

  async function loadMessages() {
    try {
      const res = await fetch('/api/nurturing/messages')
      const json = await res.json()
      if (json.data) setMessages(json.data)
    } catch (e) {
      console.error('loadMessages error:', e)
    }
  }

  async function loadContactDetails(contactId: string) {
    const [interRes, docRes, configRes] = await Promise.all([
      fetch(`/api/nurturing/interactions?prospect_id=${contactId}`),
      fetch(`/api/nurturing/documents?prospect_id=${contactId}`),
      fetch(`/api/nurturing/contact-config?prospect_id=${contactId}`),
    ])

    const [interJson, docJson, configJson] = await Promise.all([
      interRes.json(), docRes.json(), configRes.json(),
    ])

    if (interJson.data) {
      const interactionList: Interaction[] = interJson.data.map((i: any) => ({
        id: i.id,
        channel: i.type,
        date: i.created_at || i.occurred_at,
        note: i.notes || 'Aucune note',
        status: i.responded_at ? 'replied' : i.seen_at ? 'seen' : 'pending',
        icon: interactionTypeToIcon(i.type),
      }))
      setInteractions(interactionList)
      setPressure(computePressure(interactionList))
    }

    if (docJson.data) setDocuments(docJson.data)
    if (configJson.data) setContactConfig(configJson.data)
  }

  // ─── SCHEDULED MESSAGES CHECK ─────────────────────────────────────────────────
  async function checkScheduledMessages() {
    try {
      await fetch('/api/cron/send-scheduled', { method: 'POST' })

      const { data: readyMessages } = await supabase
        .from('scheduled_messages')
        .select('*')
        .eq('status', 'ready_to_send')
        .order('scheduled_at', { ascending: true })

      if (readyMessages && readyMessages.length > 0) {
        for (const msg of readyMessages) {
          if (msg.channel === 'whatsapp' && msg.phone) {
            const cleanPhone = msg.phone.replace(/[^0-9+]/g, '').replace(/^0/, '33')
            const text = encodeURIComponent(msg.message + (msg.document_url ? `\n\n📎 ${msg.document_url}` : ''))
            window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank')

            await supabase
              .from('scheduled_messages')
              .update({ status: 'sent', sent_at: new Date().toISOString() })
              .eq('id', msg.id)

            await supabase.from('interactions').insert({
              user_id: msg.user_id,
              prospect_id: msg.prospect_id,
              type: 'whatsapp',
              notes: `[Planifié] WhatsApp : ${msg.message.slice(0, 80)}`,
            })

            showToast(`WhatsApp planifié ouvert pour ${msg.prospect_name}`)
          }
        }
      }
    } catch (e) {
      console.error('checkScheduledMessages:', e)
    }
  }

  // ─── ACTIONS ─────────────────────────────────────────────────────────────────
  function openWhatsApp(phone: string, text: string) {
    const cleanPhone = phone.replace(/[^0-9+]/g, '').replace(/^0/, '33')
    const encoded = encodeURIComponent(text + (attachedDoc?.url ? `\n\n📎 ${attachedDoc.url}` : ''))
    window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank')
  }

  async function handleSendMessage() {
    const contact = contacts[selectedContactIdx]
    if (!contact || !messageText.trim()) return

    setSending(true)
    try {
      if (selectedChannel === 'email') {
        if (!contact.email) {
          showToast('Pas d\'email pour ce prospect', 'error')
          setSending(false)
          return
        }
        const res = await fetch('/api/crm/actions/email-manual', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prospect_id: contact.id,
            to_email: contact.email,
            to_name: contact.name,
            subject: messageSubject || 'Suivi - ' + contact.name,
            body: messageText + (attachedDoc?.url ? `\n\n📎 Document joint : ${attachedDoc.url}` : ''),
          }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Erreur envoi')
        showToast('Email envoyé avec succès')
      } else if (selectedChannel === 'whatsapp') {
        if (!contact.phone) {
          showToast('Pas de numéro pour ce prospect', 'error')
          setSending(false)
          return
        }
        openWhatsApp(contact.phone, messageText)
        await fetch('/api/nurturing/interactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prospect_id: contact.id,
            type: 'whatsapp',
            notes: messageText,
          }),
        })
        showToast('WhatsApp ouvert — interaction enregistrée')
      } else {
        await fetch('/api/nurturing/interactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prospect_id: contact.id,
            type: selectedChannel === 'call' ? 'appel' : selectedChannel,
            notes: messageText,
          }),
        })
        showToast(`${selectedChannel === 'call' ? 'Appel' : selectedChannel} enregistré`)
      }

      if (attachedDoc) {
        await fetch('/api/nurturing/document-sends', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prospect_id: contact.id,
            document_id: attachedDoc.id,
            channel: selectedChannel === 'call' ? 'telephone' : selectedChannel,
          }),
        })
      }

      setMessageText('')
      setMessageSubject('')
      setAttachedDoc(null)
      loadContactDetails(contact.id)
    } catch (e: any) {
      showToast(e.message || 'Erreur', 'error')
    }
    setSending(false)
  }

  async function handleScheduleMessage() {
    const contact = contacts[selectedContactIdx]
    if (!contact || !messageText.trim() || !scheduleDate) return

    const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}:00`)
    if (scheduledAt <= new Date()) {
      showToast('La date doit être dans le futur', 'error')
      return
    }

    try {
      await supabase.from('scheduled_messages').insert({
        prospect_id: contact.id,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        channel: selectedChannel === 'call' ? 'telephone' : selectedChannel,
        message: messageText,
        subject: messageSubject || null,
        document_url: attachedDoc?.url || null,
        scheduled_at: scheduledAt.toISOString(),
        phone: contact.phone || null,
        email: contact.email || null,
        prospect_name: contact.name,
      })
      showToast(`Planifié pour le ${scheduledAt.toLocaleDateString('fr-FR')} à ${scheduleTime}`)
      setScheduleOpen(false)
      setScheduleDate('')
      setMessageText('')
      setMessageSubject('')
      setAttachedDoc(null)
    } catch {
      showToast('Erreur planification', 'error')
    }
  }

  async function handleLogInteraction(type: string) {
    const contact = contacts[selectedContactIdx]
    if (!contact) return

    try {
      await fetch('/api/nurturing/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospect_id: contact.id,
          type,
          notes: null,
        }),
      })
      showToast(`${type} enregistré`)
      loadContactDetails(contact.id)
    } catch {
      showToast('Erreur enregistrement', 'error')
    }
  }

  async function handleSaveConfig() {
    const contact = contacts[selectedContactIdx]
    if (!contact) return

    try {
      const res = await fetch('/api/nurturing/contact-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospect_id: contact.id,
          ...contactConfig,
        }),
      })
      if (!res.ok) throw new Error('Erreur sauvegarde')
      showToast('Configuration sauvegardée')
    } catch {
      showToast('Erreur sauvegarde', 'error')
    }
  }

  async function handleUploadDocument(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', file.name.replace(/\.[^/.]+$/, ''))
    formData.append('channels_compatible', 'email,whatsapp,linkedin')

    try {
      const res = await fetch('/api/nurturing/documents/upload', {
        method: 'POST',
        body: formData,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Upload échoué')
      showToast('Document uploadé')
      setUploadOpen(false)
      const contact = contacts[selectedContactIdx]
      if (contact) loadContactDetails(contact.id)
    } catch (e: any) {
      showToast(e.message || 'Erreur upload', 'error')
    }
  }

  function handleSelectTemplate(msg: NurturingMessage) {
    setMessageText(msg.body)
    if (msg.subject) setMessageSubject(msg.subject)
    const channelMap: Record<string, Channel> = { email: 'email', whatsapp: 'whatsapp', linkedin: 'linkedin', telephone: 'call', sms: 'sms' }
    if (channelMap[msg.channel]) setSelectedChannel(channelMap[msg.channel])
  }

  // ─── RENDER ────────────────────────────────────────────────────────────────
  const selectedContact = contacts[selectedContactIdx]
  const colors = selectedContact ? tempColors[selectedContact.temp] : tempColors.cold

  const filteredContacts = contacts.filter(c => {
    if (filterTemp !== 'all' && c.temp !== filterTemp) return false
    if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const channelMessages = messages.filter(m => {
    const map: Record<Channel, string> = { email: 'email', whatsapp: 'whatsapp', linkedin: 'linkedin', call: 'telephone', sms: 'sms' }
    return m.channel === map[selectedChannel]
  })

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1800px', margin: '0 auto', position: 'relative' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
          padding: '12px 20px', borderRadius: '10px',
          background: toast.type === 'success' ? 'rgba(76,175,80,0.95)' : 'rgba(255,100,112,0.95)',
          color: '#fff', fontSize: '13px', fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          {toast.msg}
        </div>
      )}

      {/* ═══ HEADER ═══ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '28px', color: V.textHi, fontWeight: 600, letterSpacing: '1px', fontFamily: 'Oswald, sans-serif' }}>
            NURTURING
          </h1>
          <p style={{ fontSize: '12px', color: V.textMid, marginTop: '4px' }}>
            Maturation & relances multicanales · {contacts.length} contacts actifs
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, background: 'rgba(78,205,196,0.1)', color: V.cyan, border: '1px solid rgba(78,205,196,0.25)' }}>
            Today <strong>{contacts.filter(c => c.urgent).length}</strong>
          </span>
          <button
            onClick={() => setUploadOpen(true)}
            style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid rgba(232,200,120,0.25)', cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit', color: V.text, background: 'transparent' }}
          >
            + Upload document
          </button>
        </div>
      </div>

      {/* Upload modal */}
      {uploadOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setUploadOpen(false)}>
          <div style={{ background: V.bgMid, border: `1px solid ${V.line}`, borderRadius: '16px', padding: '24px', width: '400px', maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '16px', color: V.textHi, marginBottom: '16px' }}>Upload un document</h3>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.gif"
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${V.line}`, background: V.surface2, color: V.text, fontSize: '12px' }}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleUploadDocument(f)
              }}
            />
            <p style={{ fontSize: '11px', color: V.textLo, marginTop: '8px' }}>PDF, PNG, JPG — max 10 MB</p>
            <button onClick={() => setUploadOpen(false)} style={{ marginTop: '12px', padding: '6px 14px', borderRadius: '6px', border: `1px solid ${V.line}`, background: 'transparent', color: V.text, fontSize: '12px', cursor: 'pointer' }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* ═══ MAIN 2-COL LAYOUT ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '20px', minHeight: 'calc(100vh - 160px)' }}>

        {/* ─── LEFT: PROSPECT LIST ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <input
            type="text"
            placeholder="Rechercher un prospect..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: '8px',
              border: `1px solid ${V.line}`, background: V.surface2, color: V.textHi,
              fontSize: '12px', fontFamily: 'inherit', outline: 'none', marginBottom: '8px',
            }}
          />

          <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
            {([['all', `Tous (${contacts.length})`, V.gold], ['hot', `Chauds (${contacts.filter(c => c.temp === 'hot').length})`, V.hot], ['warm', `Tièdes (${contacts.filter(c => c.temp === 'warm').length})`, V.warm], ['cold', `Froids (${contacts.filter(c => c.temp === 'cold').length})`, V.cold]] as const).map(([key, label, color]) => (
              <button
                key={key}
                onClick={() => setFilterTemp(key)}
                style={{
                  padding: '5px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                  fontSize: '11px', fontFamily: 'inherit', color,
                  background: filterTemp === key ? `${color}25` : V.surface2,
                  fontWeight: filterTemp === key ? 600 : 400,
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', paddingRight: '4px' }}>
            {loading && (
              <div style={{ padding: '20px', textAlign: 'center', color: V.textMid }}>Chargement...</div>
            )}
            {!loading && filteredContacts.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: V.textMid }}>Aucun contact trouvé</div>
            )}
            {!loading && filteredContacts.map((contact) => {
              const idx = contacts.findIndex(c => c.id === contact.id)
              const cColors = tempColors[contact.temp]
              return (
                <div
                  key={contact.id}
                  onClick={() => { setSelectedContactIdx(idx); setOpenMenuIdx(null) }}
                  style={{
                    position: 'relative', padding: '12px 14px', borderRadius: '12px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                    transition: 'all 0.15s', borderLeft: `4px solid ${cColors.border}`,
                    background: idx === selectedContactIdx ? V.surface2 : 'transparent',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = V.surface1}
                  onMouseLeave={(e) => { if (idx !== selectedContactIdx) e.currentTarget.style.background = 'transparent' }}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); setOpenMenuIdx(openMenuIdx === idx ? null : idx) }}
                    style={{
                      position: 'absolute', top: '8px', right: '8px', width: '24px', height: '24px',
                      borderRadius: '6px', border: 'none', background: 'transparent', color: V.textLo,
                      cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: idx === selectedContactIdx || openMenuIdx === idx ? 1 : 0, transition: 'opacity 0.15s',
                    }}
                  >
                    ⋮
                  </button>

                  {openMenuIdx === idx && (
                    <div
                      style={{
                        position: 'absolute', top: '32px', right: '8px', zIndex: 100,
                        background: V.bgMid, border: `1px solid ${V.line}`, borderRadius: '10px',
                        padding: '6px', minWidth: '180px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div onClick={() => { handleLogInteraction('appel'); setOpenMenuIdx(null) }} style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '11px', color: V.text, cursor: 'pointer' }}>📞 Appeler maintenant</div>
                      <div onClick={() => { setSelectedChannel('whatsapp'); setDetailTab('sequence'); setOpenMenuIdx(null) }} style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '11px', color: V.text, cursor: 'pointer' }}>💬 WhatsApp rapide</div>
                      <div onClick={() => { setSelectedChannel('email'); setDetailTab('sequence'); setOpenMenuIdx(null) }} style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '11px', color: V.text, cursor: 'pointer' }}>✉️ Envoyer un email</div>
                      <div style={{ height: '1px', background: V.line, margin: '4px 0' }} />
                      <div onClick={() => { setLibraryOpen(true); setOpenMenuIdx(null) }} style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '11px', color: V.text, cursor: 'pointer' }}>📄 Envoyer document</div>
                    </div>
                  )}

                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0, background: cColors.iconBg, border: `2px solid ${cColors.iconBorder}` }}>
                    {contact.icon}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: V.textHi, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {contact.name}
                    </div>
                    <div style={{ fontSize: '10px', color: V.textMid, marginTop: '2px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span>{contact.job}</span>
                      {contact.sequenceActive && <span style={{ color: V.gold, fontWeight: 600 }}>▶ Seq.</span>}
                      {contact.warning && <span style={{ color: V.warn, fontWeight: 600 }}>{contact.warning}</span>}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '10px', color: contact.urgent ? V.hot : V.textLo, fontWeight: contact.urgent ? 700 : 400 }}>
                      {contact.nextTime}
                    </div>
                    <div style={{ fontSize: '14px', marginTop: '2px' }}>{contact.nextChannel}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ─── RIGHT: DETAIL PANEL ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', borderBottom: `1px solid ${V.line}`, paddingBottom: '8px' }}>
            {(['sequence', 'history', 'config'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setDetailTab(tab)}
                style={{
                  padding: '8px 14px', borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer',
                  background: detailTab === tab ? V.surface2 : 'transparent',
                  color: detailTab === tab ? V.textHi : V.textMid,
                  fontSize: '12px', fontFamily: 'inherit',
                  borderBottom: `2px solid ${detailTab === tab ? V.gold : 'transparent'}`,
                  fontWeight: detailTab === tab ? 700 : 400,
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                {tab === 'sequence' ? 'Séquence & Messages' : tab === 'history' ? 'Historique' : 'Config'}
                {tab === 'history' && (
                  <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '8px', background: detailTab === 'history' ? 'rgba(232,200,120,0.15)' : V.surface3, color: detailTab === 'history' ? V.gold : V.textLo, fontWeight: 700 }}>
                    {interactions.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
            {!selectedContact && (
              <div style={{ padding: '40px', textAlign: 'center', color: V.textMid }}>
                Sélectionnez un contact pour voir les détails
              </div>
            )}

            {/* ═══ TAB: SEQUENCE & MESSAGES ═══ */}
            {selectedContact && detailTab === 'sequence' && (
              <div>
                {/* Prospect header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', padding: '12px 16px', background: colors.bg, borderRadius: '12px', border: `1px solid ${colors.border}` }}>
                  <div style={{ fontSize: '24px' }}>{selectedContact.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: V.textHi }}>{selectedContact.name}</div>
                    <div style={{ fontSize: '11px', color: V.textMid, display: 'flex', gap: '10px', marginTop: '3px' }}>
                      <span>{selectedContact.job} · {selectedContact.stage || 'Prospect'}</span>
                      {selectedContact.themes && selectedContact.themes.length > 0 && (
                        <span style={{ color: V.gold }}>
                          {selectedContact.themes.map(t => `${t.icon} ${t.name}`).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {selectedContact.preferredChannel && (
                      <span style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '4px', background: 'rgba(232,200,120,0.12)', color: V.gold, border: '1px solid rgba(232,200,120,0.2)', fontWeight: 600 }}>
                        {channelToIcon(selectedContact.preferredChannel)} Préféré
                      </span>
                    )}
                    <span style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '4px', background: `${pressure.color}20`, color: pressure.color, border: `1px solid ${pressure.color}40`, fontWeight: 600 }}>
                      {pressure.label}
                    </span>
                  </div>
                </div>

                {/* KPIs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
                  <div style={{ background: V.surface1, border: `1px solid ${V.line}`, borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: 700 }}>{selectedContact.icon}</div>
                    <div style={{ fontSize: '9px', color: V.textMid, marginTop: '2px' }}>
                      {selectedContact.temp === 'hot' ? 'Brûlant' : selectedContact.temp === 'warm' ? 'Tiède' : selectedContact.temp === 'cold' ? 'Froid' : 'Enterré'}
                    </div>
                  </div>
                  <div style={{ background: V.surface1, border: `1px solid ${V.line}`, borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: V.textHi }}>{selectedContact.touchpoints}</div>
                    <div style={{ fontSize: '9px', color: V.textMid, marginTop: '2px' }}>Touchpoints</div>
                  </div>
                  <div style={{ background: V.surface1, border: `1px solid ${V.line}`, borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: V.green }}>{selectedContact.responses}</div>
                    <div style={{ fontSize: '9px', color: V.textMid, marginTop: '2px' }}>Réponses</div>
                  </div>
                  <div style={{ background: V.surface1, border: `1px solid ${V.line}`, borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: V.warn }}>{selectedContact.no_responses}</div>
                    <div style={{ fontSize: '9px', color: V.textMid, marginTop: '2px' }}>Sans réponse</div>
                  </div>
                </div>

                {/* QUICK COMPOSE */}
                <div style={{ position: 'relative', background: 'rgba(232,200,120,0.04)', border: '1px solid rgba(232,200,120,0.18)', borderRadius: '14px', padding: '18px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: V.gold, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Composer un message
                    </div>
                    <span style={{ fontSize: '9px', color: V.textLo }}>Variables : {'{prenom}, {metier}, {theme}'}</span>
                  </div>

                  {/* Channel selector */}
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                    {(['email', 'call', 'whatsapp', 'linkedin', 'sms'] as Channel[]).map((ch) => (
                      <button
                        key={ch}
                        onClick={() => setSelectedChannel(ch)}
                        style={{
                          padding: '6px 12px', borderRadius: '8px',
                          border: `1px solid ${selectedChannel === ch ? V.gold : V.line}`,
                          background: selectedChannel === ch ? 'rgba(232,200,120,0.12)' : V.surface2,
                          color: selectedChannel === ch ? V.gold : V.textMid,
                          fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        {ch === 'call' ? '📞 Appel' : ch === 'email' ? '✉️ Email' : ch === 'whatsapp' ? '💬 WhatsApp' : ch === 'linkedin' ? '🔗 LinkedIn' : '📱 SMS'}
                      </button>
                    ))}
                  </div>

                  {/* Template dropdown */}
                  {channelMessages.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <select
                        onChange={(e) => {
                          const msg = channelMessages.find(m => m.id === e.target.value)
                          if (msg) handleSelectTemplate(msg)
                        }}
                        style={{
                          width: '100%', padding: '8px 12px', borderRadius: '8px',
                          border: `1px solid ${V.line}`, background: V.surface2, color: V.text,
                          fontSize: '12px', fontFamily: 'inherit', cursor: 'pointer', appearance: 'none', outline: 'none',
                        }}
                      >
                        <option value="">Choisir un template ({channelMessages.length} disponibles)...</option>
                        {channelMessages.map(m => (
                          <option key={m.id} value={m.id}>{m.title}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Subject (email only) */}
                  {selectedChannel === 'email' && (
                    <input
                      type="text"
                      value={messageSubject}
                      onChange={(e) => setMessageSubject(e.target.value)}
                      placeholder="Objet du mail..."
                      style={{
                        width: '100%', padding: '8px 12px', borderRadius: '8px', marginBottom: '8px',
                        border: `1px solid ${V.line}`, background: V.surface1, color: V.textHi,
                        fontSize: '12px', fontFamily: 'inherit', outline: 'none',
                      }}
                    />
                  )}

                  {/* Textarea */}
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Rédigez votre message ici ou sélectionnez un template..."
                    style={{
                      width: '100%', minHeight: '90px', padding: '12px 14px', borderRadius: '10px',
                      border: `1px solid ${V.line}`, background: V.surface1, color: V.textHi,
                      fontSize: '12px', fontFamily: 'inherit', resize: 'vertical', lineHeight: '1.6', outline: 'none',
                    }}
                  />

                  {/* Attached doc indicator */}
                  {attachedDoc && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', padding: '6px 10px', borderRadius: '8px', background: 'rgba(76,175,80,0.1)', border: '1px solid rgba(76,175,80,0.2)' }}>
                      <span style={{ fontSize: '14px' }}>📎</span>
                      <span style={{ fontSize: '11px', color: V.green, flex: 1 }}>{attachedDoc.title}</span>
                      <button onClick={() => setAttachedDoc(null)} style={{ border: 'none', background: 'transparent', color: V.red, cursor: 'pointer', fontSize: '14px' }}>×</button>
                    </div>
                  )}

                  {/* Document library overlay */}
                  {libraryOpen && (
                    <div style={{
                      position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: '6px',
                      background: V.bgMid, border: `1px solid ${V.line}`, borderRadius: '12px',
                      padding: '12px', maxHeight: '280px', overflowY: 'auto',
                      boxShadow: '0 -8px 32px rgba(0,0,0,0.5)', zIndex: 50,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ fontSize: '11px', color: V.textMid, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Bibliothèque de documents ({documents.length})
                        </div>
                        <button onClick={() => setLibraryOpen(false)} style={{ border: 'none', background: 'transparent', color: V.textLo, cursor: 'pointer', fontSize: '16px' }}>×</button>
                      </div>
                      {documents.length === 0 && (
                        <div style={{ padding: '16px', textAlign: 'center', color: V.textLo, fontSize: '12px' }}>
                          Aucun document — uploadez-en un avec le bouton en haut
                        </div>
                      )}
                      {documents.map(doc => (
                        <div
                          key={doc.id}
                          onClick={() => { setAttachedDoc(doc); setLibraryOpen(false) }}
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', marginBottom: '4px' }}
                          onMouseEnter={e => e.currentTarget.style.background = V.surface2}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <div style={{ fontSize: '18px', flexShrink: 0 }}>{doc.format === 'pdf' ? '📄' : doc.format === 'image' ? '🖼️' : '📎'}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '12px', fontWeight: 500, color: V.textHi }}>{doc.title}</div>
                            <div style={{ fontSize: '10px', color: V.textLo, marginTop: '2px' }}>
                              {doc.format} · {doc.channels_compatible.join(', ')}
                              {doc.already_sent && <span style={{ color: V.green, marginLeft: '6px' }}>✓ déjà envoyé</span>}
                            </div>
                          </div>
                          {doc.nurturing_themes && (
                            <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: `${doc.nurturing_themes.color}20`, color: doc.nurturing_themes.color }}>
                              {doc.nurturing_themes.icon} {doc.nurturing_themes.name}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Footer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        onClick={handleSendMessage}
                        disabled={sending || !messageText.trim()}
                        style={{
                          padding: '8px 16px', borderRadius: '8px', border: 'none',
                          background: sending || !messageText.trim() ? V.surface3 : V.gold,
                          color: sending || !messageText.trim() ? V.textLo : V.bgDeep,
                          fontSize: '12px', fontWeight: 600, cursor: sending || !messageText.trim() ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {sending ? '⏳ Envoi...' : selectedChannel === 'email' ? '✉️ Envoyer' : selectedChannel === 'call' ? '📞 Log appel' : '📤 Envoyer'}
                      </button>
                      <button
                        onClick={() => setLibraryOpen(!libraryOpen)}
                        style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '6px', border: `1px solid ${V.line}`, background: 'transparent', color: V.text, cursor: 'pointer' }}
                      >
                        📄 Joindre document
                      </button>
                      <button
                        onClick={() => setScheduleOpen(!scheduleOpen)}
                        style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '6px', border: `1px solid ${V.line}`, background: 'transparent', color: V.text, cursor: 'pointer' }}
                      >
                        📅 Planifier
                      </button>
                    </div>
                  </div>

                  {/* Schedule panel */}
                  {scheduleOpen && (
                    <div style={{ marginTop: '10px', padding: '12px', borderRadius: '10px', background: V.surface1, border: `1px solid ${V.line}` }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: V.gold, marginBottom: '8px' }}>📅 Planifier l'envoi</div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="date"
                          value={scheduleDate}
                          onChange={(e) => setScheduleDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          style={{ padding: '6px 10px', borderRadius: '6px', border: `1px solid ${V.line}`, background: V.surface2, color: V.text, fontSize: '12px', fontFamily: 'inherit' }}
                        />
                        <input
                          type="time"
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                          style={{ padding: '6px 10px', borderRadius: '6px', border: `1px solid ${V.line}`, background: V.surface2, color: V.text, fontSize: '12px', fontFamily: 'inherit' }}
                        />
                        <button
                          onClick={handleScheduleMessage}
                          disabled={!scheduleDate || !messageText.trim()}
                          style={{
                            padding: '6px 14px', borderRadius: '6px', border: 'none',
                            background: !scheduleDate || !messageText.trim() ? V.surface3 : V.gold,
                            color: !scheduleDate || !messageText.trim() ? V.textLo : V.bgDeep,
                            fontSize: '11px', fontWeight: 600, cursor: !scheduleDate || !messageText.trim() ? 'not-allowed' : 'pointer',
                          }}
                        >
                          Confirmer
                        </button>
                        <button
                          onClick={() => setScheduleOpen(false)}
                          style={{ padding: '6px 10px', borderRadius: '6px', border: `1px solid ${V.line}`, background: 'transparent', color: V.textLo, fontSize: '11px', cursor: 'pointer' }}
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Documents envoyés */}
                {documents.filter(d => d.already_sent).length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: V.textHi, marginBottom: '8px' }}>📎 Documents envoyés à ce prospect</div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {documents.filter(d => d.already_sent).map(doc => (
                        <div key={doc.id} style={{ padding: '6px 10px', borderRadius: '8px', background: V.surface1, border: `1px solid ${V.line}`, fontSize: '11px', color: V.textMid, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{doc.format === 'pdf' ? '📄' : '🖼️'}</span>
                          {doc.title}
                          <span style={{ color: V.green, fontSize: '9px' }}>✓ {doc.sent_channels?.join(', ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══ TAB: HISTORY ═══ */}
            {selectedContact && detailTab === 'history' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: V.textHi }}>Historique des interactions</div>
                  <span style={{ fontSize: '10px', color: V.textLo }}>{interactions.length} total</span>
                </div>

                {/* Channel stats (computed from real data) */}
                {(() => {
                  const stats: Record<string, { total: number; replied: number }> = {}
                  for (const i of interactions) {
                    if (!stats[i.channel]) stats[i.channel] = { total: 0, replied: 0 }
                    stats[i.channel].total++
                    if (i.status === 'replied') stats[i.channel].replied++
                  }
                  const channels = ['appel', 'email', 'whatsapp', 'linkedin', 'sms']
                  const bestChannel = channels.reduce((best, ch) => {
                    const s = stats[ch]
                    if (!s || s.total === 0) return best
                    const rate = s.replied / s.total
                    return rate > (best.rate || 0) ? { ch, rate } : best
                  }, { ch: '', rate: 0 })

                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '20px' }}>
                      {channels.map(ch => {
                        const s = stats[ch] || { total: 0, replied: 0 }
                        const rate = s.total > 0 ? Math.round((s.replied / s.total) * 100) : 0
                        const isBest = ch === bestChannel.ch
                        return (
                          <div key={ch} style={{ background: isBest ? 'rgba(232,200,120,0.06)' : V.surface1, border: `1px solid ${isBest ? 'rgba(232,200,120,0.25)' : V.line}`, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                            <div style={{ fontSize: '16px' }}>{interactionTypeToIcon(ch)}</div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: s.total > 0 ? (rate >= 50 ? V.green : V.warn) : V.textLo, marginTop: '4px' }}>
                              {s.total > 0 ? `${rate}%` : '—'}
                            </div>
                            <div style={{ fontSize: '9px', color: V.textLo }}>{s.total > 0 ? `${s.replied}/${s.total} rép.` : 'jamais'}</div>
                            {isBest && <div style={{ fontSize: '8px', color: V.gold, fontWeight: 700, marginTop: '2px' }}>MEILLEUR</div>}
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}

                {/* Timeline */}
                <div style={{ background: V.surface1, border: `1px solid ${V.line}`, borderRadius: '12px', padding: '14px' }}>
                  {interactions.length === 0 && (
                    <div style={{ padding: '20px', textAlign: 'center', color: V.textMid }}>Aucune interaction enregistrée</div>
                  )}
                  {interactions.map((interaction) => (
                    <div
                      key={interaction.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '8px',
                        borderLeft: `3px solid ${interaction.status === 'replied' ? V.green : interaction.status === 'seen' ? V.gold : V.warn}`,
                        marginBottom: '4px',
                      }}
                    >
                      <span style={{ fontSize: '14px', flexShrink: 0 }}>{interaction.icon}</span>
                      <span style={{ fontSize: '10px', color: V.textMid, minWidth: '65px' }}>{interaction.channel}</span>
                      <span style={{ fontSize: '10px', color: V.textLo, minWidth: '75px' }}>
                        {new Date(interaction.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </span>
                      <span style={{ fontSize: '10px', color: V.textLo, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {interaction.note}
                      </span>
                      <span style={{ fontSize: '12px', flexShrink: 0 }}>
                        {interaction.status === 'replied' ? '✅' : interaction.status === 'seen' ? '👁️' : '⏳'}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Quick log */}
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: V.textHi, marginBottom: '8px' }}>Enregistrer une interaction</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {[
                      { type: 'appel', label: '📞 Appel fait' },
                      { type: 'email', label: '✉️ Email envoyé' },
                      { type: 'whatsapp', label: '💬 WhatsApp envoyé' },
                      { type: 'linkedin', label: '🔗 LinkedIn envoyé' },
                      { type: 'rdv1', label: '📅 RDV pris' },
                    ].map(({ type, label }) => (
                      <button
                        key={type}
                        onClick={() => handleLogInteraction(type)}
                        style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '6px', border: `1px solid ${V.line}`, background: 'transparent', color: V.text, cursor: 'pointer' }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ═══ TAB: CONFIG ═══ */}
            {selectedContact && detailTab === 'config' && (
              <div>
                <div style={{ background: V.surface1, border: '1px solid rgba(232,200,120,0.2)', borderRadius: '12px', padding: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: V.gold }}>Configuration nurturing — {selectedContact.name}</div>
                    <button
                      onClick={handleSaveConfig}
                      style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '6px', border: 'none', background: V.gold, color: V.bgDeep, cursor: 'pointer', fontWeight: 600 }}
                    >
                      💾 Sauvegarder
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <div style={{ fontSize: '10px', color: V.textMid, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Canal préféré</div>
                      <select
                        value={contactConfig.preferred_channel || ''}
                        onChange={(e) => setContactConfig({ ...contactConfig, preferred_channel: e.target.value || null })}
                        style={{ padding: '7px 10px', borderRadius: '8px', border: `1px solid ${V.line}`, background: V.surface2, color: V.text, fontSize: '12px', fontFamily: 'inherit', width: '100%', outline: 'none' }}
                      >
                        <option value="">Non défini</option>
                        <option value="telephone">📞 Téléphone</option>
                        <option value="email">✉️ Email</option>
                        <option value="whatsapp">💬 WhatsApp</option>
                        <option value="linkedin">🔗 LinkedIn</option>
                        <option value="sms">📱 SMS</option>
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: V.textMid, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fréquence de relance</div>
                      <select
                        value={contactConfig.contact_frequency_days}
                        onChange={(e) => setContactConfig({ ...contactConfig, contact_frequency_days: parseInt(e.target.value) })}
                        style={{ padding: '7px 10px', borderRadius: '8px', border: `1px solid ${V.line}`, background: V.surface2, color: V.text, fontSize: '12px', fontFamily: 'inherit', width: '100%', outline: 'none' }}
                      >
                        <option value={7}>Hebdomadaire (7j)</option>
                        <option value={14}>Bi-mensuel (14j)</option>
                        <option value={30}>Mensuel (30j)</option>
                        <option value={60}>Bimensuel (60j)</option>
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: V.textMid, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Créneau préféré</div>
                      <select
                        value={contactConfig.preferred_time_slot || ''}
                        onChange={(e) => setContactConfig({ ...contactConfig, preferred_time_slot: e.target.value || null })}
                        style={{ padding: '7px 10px', borderRadius: '8px', border: `1px solid ${V.line}`, background: V.surface2, color: V.text, fontSize: '12px', fontFamily: 'inherit', width: '100%', outline: 'none' }}
                      >
                        <option value="">Non défini</option>
                        <option value="matin">Matin (8h-12h)</option>
                        <option value="apres-midi">Après-midi (14h-18h)</option>
                        <option value="soir">Soir (18h-20h)</option>
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: V.textMid, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pression actuelle</div>
                      <div style={{ padding: '7px 10px', borderRadius: '8px', border: `1px solid ${pressure.color}40`, background: `${pressure.color}10`, color: pressure.color, fontSize: '12px', fontWeight: 600 }}>
                        {pressure.label} ({pressure.score.toFixed(1)}/sem)
                      </div>
                    </div>
                    <div style={{ gridColumn: '1/-1' }}>
                      <div style={{ fontSize: '10px', color: V.textMid, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Canaux exclus</div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                        {(['telephone', 'email', 'whatsapp', 'linkedin', 'courrier', 'sms'] as const).map(ch => {
                          const excluded = contactConfig.excluded_channels.includes(ch)
                          return (
                            <button
                              key={ch}
                              onClick={() => {
                                setContactConfig({
                                  ...contactConfig,
                                  excluded_channels: excluded
                                    ? contactConfig.excluded_channels.filter(c => c !== ch)
                                    : [...contactConfig.excluded_channels, ch],
                                })
                              }}
                              style={{
                                padding: '5px 10px', fontSize: '11px', borderRadius: '6px', cursor: 'pointer',
                                border: excluded ? '1px solid rgba(255,100,112,0.3)' : `1px solid ${V.line}`,
                                background: excluded ? 'rgba(255,100,112,0.1)' : 'transparent',
                                color: excluded ? V.red : V.text,
                                textDecoration: excluded ? 'line-through' : 'none',
                              }}
                            >
                              {channelToIcon(ch)}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div style={{ gridColumn: '1/-1' }}>
                      <div style={{ fontSize: '10px', color: V.textMid, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Thèmes identifiés</div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                        {selectedContact.themes && selectedContact.themes.map(t => (
                          <span key={t.id} style={{ padding: '5px 10px', borderRadius: '6px', background: `${t.color}20`, color: t.color, fontSize: '11px', fontWeight: 600, border: `1px solid ${t.color}35` }}>
                            {t.icon} {t.name}
                          </span>
                        ))}
                        {(!selectedContact.themes || selectedContact.themes.length === 0) && (
                          <span style={{ fontSize: '11px', color: V.textLo }}>Aucun thème associé</span>
                        )}
                      </div>
                    </div>
                    <div style={{ gridColumn: '1/-1' }}>
                      <div style={{ fontSize: '10px', color: V.textMid, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Notes personnelles</div>
                      <textarea
                        value={contactConfig.notes}
                        onChange={(e) => setContactConfig({ ...contactConfig, notes: e.target.value })}
                        placeholder="Notes sur les préférences de contact, contexte..."
                        style={{
                          width: '100%', minHeight: '60px', padding: '12px 14px', borderRadius: '10px',
                          border: `1px solid ${V.line}`, background: V.surface1, color: V.textHi,
                          fontSize: '12px', fontFamily: 'inherit', resize: 'vertical', lineHeight: '1.6',
                          outline: 'none', marginTop: '4px',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
