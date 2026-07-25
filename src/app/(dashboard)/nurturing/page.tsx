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
  lineSoft: '#1e2860',
  text: '#d8e1ff',
  textHi: '#ffffff',
  textMid: '#8ea0d9',
  textLo: '#5a6a9a',
  gold: '#e8c878',
  goldDim: '#b89f5f',
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
  const [showTips, setShowTips] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [sequencePanelOpen, setSequencePanelOpen] = useState(false)
  const [sequencePanelView, setSequencePanelView] = useState<'list' | 'create'>('list')
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
  const [newContactOpen, setNewContactOpen] = useState(false)
  const [newContact, setNewContact] = useState({ full_name: '', email: '', phone: '', profession: '', company: '', city: '', linkedin_url: '', notes: '', nurturing_category: 'prospect_froid', preferred_channel: 'email', contact_frequency_days: 14, next_action_channel: 'email', source: 'autre' as string })
  const [filterTemp, setFilterTemp] = useState<TempCategory | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [attachedDoc, setAttachedDoc] = useState<NurturingDoc | null>(null)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('09:00')
  const [sequenceSteps, setSequenceSteps] = useState<Array<{ id: string; step_order: number; channel: string; status: string; scheduled_at: string; executed_at: string | null; message_sent: string | null; error_message: string | null }>>([])
  const [sequenceLoading, setSequenceLoading] = useState(false)
  const [upcomingActions, setUpcomingActions] = useState<Array<{ id: string; type: 'scheduled' | 'sequence'; channel: string; date: string; label: string; prospectId: string }>>([])
  const [sequenceTemplates, setSequenceTemplates] = useState<Array<{ id: string; name: string; description: string }>>([])
  const [newSequence, setNewSequence] = useState({ name: '', description: '', steps: [{ channel: 'email', delay_days: 0, message_template: '' }] })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    saveLastSection('/nurturing')
    loadContacts().then(count => {
      if (count === 0) {
        fetch('/api/nurturing/seed', { method: 'POST' }).then(() => loadContacts())
      }
    })
    loadMessages()
    loadSequenceTemplates()

    const scheduledInterval = setInterval(checkScheduledMessages, 30000)
    return () => clearInterval(scheduledInterval)
  }, [])

  useEffect(() => {
    if (contacts.length > 0) {
      loadContactDetails(contacts[selectedContactIdx].id)
      loadUpcomingActions(contacts[selectedContactIdx].id)
    }
  }, [selectedContactIdx, contacts.length])

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // ─── DATA LOADING ────────────────────────────────────────────────────────────
  async function loadContacts(): Promise<number> {
    setLoading(true)
    try {
      const res = await fetch('/api/nurturing/contacts')
      const json = await res.json()
      if (!json.data) { setLoading(false); return 0 }

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
      setLoading(false)
      return contactList.length
    } catch (e) {
      console.error('loadContacts error:', e)
    }
    setLoading(false)
    return 0
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

  async function loadSequenceTemplates() {
    try {
      const res = await fetch('/api/crm/sequences/templates')
      const json = await res.json()
      if (json.data) setSequenceTemplates(json.data)
    } catch (e) {
      console.error('loadSequenceTemplates error:', e)
    }
  }

  async function loadUpcomingActions(contactId: string) {
    try {
      const [scheduledRes, seqRes] = await Promise.all([
        fetch(`/api/nurturing/scheduled?prospect_id=${contactId}`),
        supabase
          .from('sequence_instance_steps')
          .select('id, step_order, channel, scheduled_at, message_sent, sequence_instances!inner(prospect_id, status)')
          .eq('sequence_instances.prospect_id', contactId)
          .eq('sequence_instances.status', 'active')
          .eq('status', 'pending')
          .order('scheduled_at', { ascending: true })
      ])

      const scheduledJson = await scheduledRes.json()
      const scheduled = (scheduledJson.data || []).map((s: any) => ({
        id: s.id,
        type: 'scheduled' as const,
        channel: s.channel,
        date: s.scheduled_at,
        label: s.message?.slice(0, 50) || `Message ${s.channel}`,
        prospectId: contactId,
      }))

      const seqSteps = (seqRes.data || []).map((s: any) => ({
        id: s.id,
        type: 'sequence' as const,
        channel: s.channel,
        date: s.scheduled_at,
        label: s.message_sent?.slice(0, 50) || `Étape ${s.step_order}`,
        prospectId: contactId,
      }))

      const all = [...scheduled, ...seqSteps].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      setUpcomingActions(all)
    } catch (e) {
      console.error('loadUpcomingActions error:', e)
    }
  }

  async function loadContactDetails(contactId: string) {
    setSequenceLoading(true)
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

    // Charger les étapes de séquence active
    const { data: seqData } = await supabase
      .from('sequence_instance_steps')
      .select('id, step_order, channel, status, scheduled_at, executed_at, message_sent, error_message, sequence_instances!inner(prospect_id, status)')
      .eq('sequence_instances.prospect_id', contactId)
      .eq('sequence_instances.status', 'active')
      .order('step_order', { ascending: true })

    setSequenceSteps((seqData || []).map((s: any) => ({
      id: s.id,
      step_order: s.step_order,
      channel: s.channel,
      status: s.status,
      scheduled_at: s.scheduled_at,
      executed_at: s.executed_at,
      message_sent: s.message_sent,
      error_message: s.error_message,
    })))
    setSequenceLoading(false)
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

    const sendChannel: Channel = selectedChannel

    setSending(true)
    try {
      if (sendChannel === 'email') {
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
      } else if (sendChannel === 'whatsapp') {
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
            type: sendChannel === 'call' ? 'appel' : sendChannel,
            notes: messageText,
          }),
        })
        showToast(`${sendChannel === 'call' ? 'Appel' : sendChannel} enregistré`)
      }

      if (attachedDoc) {
        await fetch('/api/nurturing/document-sends', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prospect_id: contact.id,
            document_id: attachedDoc.id,
            channel: sendChannel === 'call' ? 'telephone' : sendChannel,
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

  async function handleAssignSequence(templateId: string) {
    const contact = contacts[selectedContactIdx]
    if (!contact) return

    try {
      const res = await fetch('/api/crm/sequences/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospect_id: contact.id,
          template_id: templateId,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erreur assignation')
      showToast('Séquence lancée avec succès')
      setSequencePanelOpen(false)
      loadContacts()
      loadContactDetails(contact.id)
      loadUpcomingActions(contact.id)
    } catch (e: any) {
      showToast(e.message || 'Erreur assignation', 'error')
    }
  }

  async function handleCreateSequence(assignNow: boolean) {
    if (!newSequence.name.trim()) {
      showToast('Nom de séquence requis', 'error')
      return
    }

    try {
      const resTemplate = await fetch('/api/crm/sequences/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSequence.name,
          description: newSequence.description,
        }),
      })
      const jsonTemplate = await resTemplate.json()
      if (!resTemplate.ok) throw new Error(jsonTemplate.error || 'Erreur création template')

      const templateId = jsonTemplate.data.id

      for (let i = 0; i < newSequence.steps.length; i++) {
        const step = newSequence.steps[i]
        await fetch(`/api/crm/sequences/templates/${templateId}/steps`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            step_order: i + 1,
            channel: step.channel,
            delay_days: step.delay_days,
            message_template: step.message_template,
          }),
        })
      }

      showToast('Séquence créée avec succès')
      setSequencePanelOpen(false)
      setSequencePanelView('list')
      setNewSequence({ name: '', description: '', steps: [{ channel: 'email', delay_days: 0, message_template: '' }] })
      loadSequenceTemplates()

      if (assignNow) {
        handleAssignSequence(templateId)
      }
    } catch (e: any) {
      showToast(e.message || 'Erreur création', 'error')
    }
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
    const map: Record<string, string> = { email: 'email', whatsapp: 'whatsapp', linkedin: 'linkedin', call: 'telephone', sms: 'sms' }
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
            Maturation & relances multicanales PP1/PP2 · {contacts.length} contacts actifs
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, background: 'rgba(232,200,120,0.1)', color: V.gold, border: '1px solid rgba(232,200,120,0.25)' }}>
            Séquences <strong>{contacts.filter(c => c.sequenceActive).length}</strong>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, background: 'rgba(78,205,196,0.1)', color: V.cyan, border: '1px solid rgba(78,205,196,0.25)' }}>
            Today <strong>{contacts.filter(c => c.urgent).length}</strong>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, background: 'rgba(76,175,80,0.1)', color: V.green, border: '1px solid rgba(76,175,80,0.25)' }}>
            Conversion <strong>{contacts.length > 0 ? Math.round((contacts.filter(c => c.stage === 'rdv_fait').length / contacts.length) * 100) : 0}%</strong>
          </span>
          <button
            onClick={() => setNewContactOpen(true)}
            style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid rgba(232,200,120,0.25)', cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit', color: V.text, background: 'transparent' }}
          >
            + Nouveau contact
          </button>
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

      {/* Modal Nouveau Contact */}
      {newContactOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setNewContactOpen(false)}>
          <div style={{ background: V.bgMid, border: `1px solid ${V.line}`, borderRadius: '16px', padding: '28px', width: '560px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '18px', color: V.textHi, marginBottom: '6px', fontFamily: 'Oswald, sans-serif', letterSpacing: '0.5px' }}>Nouveau contact nurturing</h3>
            <p style={{ fontSize: '11px', color: V.textMid, marginBottom: '20px' }}>Remplissez les informations du prospect. Il apparaîtra dans votre liste nurturing.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Identité */}
              <div style={{ fontSize: '10px', fontWeight: 700, color: V.gold, textTransform: 'uppercase', letterSpacing: '1px' }}>Identité</div>
              <div>
                <label style={{ fontSize: '11px', color: V.textMid, display: 'block', marginBottom: '4px' }}>Nom complet *</label>
                <input value={newContact.full_name} onChange={e => setNewContact(p => ({ ...p, full_name: e.target.value }))} placeholder="Ex: Jean Dupont" style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${V.line}`, background: V.surface2, color: V.textHi, fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: V.textMid, display: 'block', marginBottom: '4px' }}>Téléphone</label>
                  <input value={newContact.phone} onChange={e => setNewContact(p => ({ ...p, phone: e.target.value }))} placeholder="06 12 34 56 78" style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${V.line}`, background: V.surface2, color: V.textHi, fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: V.textMid, display: 'block', marginBottom: '4px' }}>Email</label>
                  <input value={newContact.email} onChange={e => setNewContact(p => ({ ...p, email: e.target.value }))} placeholder="jean@exemple.fr" style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${V.line}`, background: V.surface2, color: V.textHi, fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: V.textMid, display: 'block', marginBottom: '4px' }}>Profession</label>
                  <input value={newContact.profession} onChange={e => setNewContact(p => ({ ...p, profession: e.target.value }))} placeholder="Dentiste, Pharmacien, Avocat..." style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${V.line}`, background: V.surface2, color: V.textHi, fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: V.textMid, display: 'block', marginBottom: '4px' }}>Entreprise / Cabinet</label>
                  <input value={newContact.company} onChange={e => setNewContact(p => ({ ...p, company: e.target.value }))} placeholder="Cabinet Dupont & Associés" style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${V.line}`, background: V.surface2, color: V.textHi, fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: V.textMid, display: 'block', marginBottom: '4px' }}>Ville</label>
                  <input value={newContact.city} onChange={e => setNewContact(p => ({ ...p, city: e.target.value }))} placeholder="Paris, Lyon, Marseille..." style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${V.line}`, background: V.surface2, color: V.textHi, fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: V.textMid, display: 'block', marginBottom: '4px' }}>Profil LinkedIn</label>
                  <input value={newContact.linkedin_url} onChange={e => setNewContact(p => ({ ...p, linkedin_url: e.target.value }))} placeholder="https://linkedin.com/in/..." style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${V.line}`, background: V.surface2, color: V.textHi, fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
              </div>

              {/* Nurturing config */}
              <div style={{ fontSize: '10px', fontWeight: 700, color: V.gold, textTransform: 'uppercase', letterSpacing: '1px', marginTop: '6px' }}>Configuration nurturing</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: V.textMid, display: 'block', marginBottom: '4px' }}>Catégorie</label>
                  <select value={newContact.nurturing_category} onChange={e => setNewContact(p => ({ ...p, nurturing_category: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${V.line}`, background: V.surface2, color: V.textHi, fontSize: '13px', fontFamily: 'inherit', outline: 'none' }}>
                    <option value="prospect_froid">Prospect froid</option>
                    <option value="prospect_tiede">Prospect tiède</option>
                    <option value="rdv_fait">RDV fait</option>
                    <option value="client_existant">Client existant</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: V.textMid, display: 'block', marginBottom: '4px' }}>Source</label>
                  <select value={newContact.source} onChange={e => setNewContact(p => ({ ...p, source: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${V.line}`, background: V.surface2, color: V.textHi, fontSize: '13px', fontFamily: 'inherit', outline: 'none' }}>
                    <option value="autre">Autre</option>
                    <option value="recommandation">Recommandation</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="tns">TNS (prospection)</option>
                    <option value="chefs_entreprise">Chefs d&apos;entreprise</option>
                    <option value="particuliers">Particuliers</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: V.textMid, display: 'block', marginBottom: '4px' }}>Canal préféré</label>
                  <select value={newContact.preferred_channel} onChange={e => setNewContact(p => ({ ...p, preferred_channel: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${V.line}`, background: V.surface2, color: V.textHi, fontSize: '13px', fontFamily: 'inherit', outline: 'none' }}>
                    <option value="email">Email</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="telephone">Téléphone</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="sms">SMS</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: V.textMid, display: 'block', marginBottom: '4px' }}>Prochaine action via</label>
                  <select value={newContact.next_action_channel} onChange={e => setNewContact(p => ({ ...p, next_action_channel: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${V.line}`, background: V.surface2, color: V.textHi, fontSize: '13px', fontFamily: 'inherit', outline: 'none' }}>
                    <option value="email">Email</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="telephone">Téléphone</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="sms">SMS</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: V.textMid, display: 'block', marginBottom: '4px' }}>Fréquence (jours)</label>
                  <input type="number" min={1} max={90} value={newContact.contact_frequency_days} onChange={e => setNewContact(p => ({ ...p, contact_frequency_days: parseInt(e.target.value) || 14 }))} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${V.line}`, background: V.surface2, color: V.textHi, fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
              </div>

              {/* Notes */}
              <div style={{ fontSize: '10px', fontWeight: 700, color: V.gold, textTransform: 'uppercase', letterSpacing: '1px', marginTop: '6px' }}>Notes</div>
              <div>
                <textarea value={newContact.notes} onChange={e => setNewContact(p => ({ ...p, notes: e.target.value }))} placeholder="Contexte de rencontre, besoins détectés, points d'attention..." rows={3} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${V.line}`, background: V.surface2, color: V.textHi, fontSize: '12px', fontFamily: 'inherit', outline: 'none', resize: 'vertical' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button onClick={() => setNewContactOpen(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid ${V.line}`, background: 'transparent', color: V.text, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                Annuler
              </button>
              <button
                disabled={!newContact.full_name.trim() || sending}
                onClick={async () => {
                  if (sending) return
                  setSending(true)
                  try {
                    const res = await fetch('/api/nurturing/contacts', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        full_name: newContact.full_name,
                        email: newContact.email || null,
                        phone: newContact.phone || null,
                        profession: newContact.profession || null,
                        company: newContact.company || null,
                        city: newContact.city || null,
                        linkedin_url: newContact.linkedin_url || null,
                        notes: newContact.notes || null,
                        nurturing_category: newContact.nurturing_category,
                        source: newContact.source,
                        preferred_channel: newContact.preferred_channel,
                        contact_frequency_days: newContact.contact_frequency_days,
                        next_action_channel: newContact.next_action_channel,
                      }),
                    })
                    if (res.ok) {
                      showToast('Contact créé — il apparaît dans la liste')
                      setNewContactOpen(false)
                      setNewContact({ full_name: '', email: '', phone: '', profession: '', company: '', city: '', linkedin_url: '', notes: '', nurturing_category: 'prospect_froid', preferred_channel: 'email', contact_frequency_days: 14, next_action_channel: 'email', source: 'autre' })
                      loadContacts()
                    } else {
                      const json = await res.json()
                      showToast(json.error || 'Erreur création', 'error')
                    }
                  } finally {
                    setSending(false)
                  }
                }}
                style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: (!newContact.full_name.trim() || sending) ? V.surface3 : 'linear-gradient(135deg, #e8c878, #d4a020)', color: (!newContact.full_name.trim() || sending) ? V.textLo : '#0a0e22', fontSize: '12px', fontWeight: 600, cursor: (newContact.full_name.trim() && !sending) ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
              >
                {sending ? 'Création...' : 'Enregistrer le contact'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MAIN 2-COL LAYOUT ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '20px', height: 'calc(100vh - 160px)' }}>

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
          <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', borderBottom: `1px solid ${V.line}`, paddingBottom: '8px', flexShrink: 0 }}>
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

          {/* Prospect header — sticky */}
          {selectedContact && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: colors.bg, borderRadius: '12px', border: `1px solid ${colors.border}`, marginBottom: '12px', flexShrink: 0 }}>
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
          )}

          {/* Panel content — scrollable */}
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
            {!selectedContact && (
              <div style={{ padding: '40px', textAlign: 'center', color: V.textMid }}>
                Sélectionnez un contact pour voir les détails
              </div>
            )}

            {/* ═══ TAB: SEQUENCE & MESSAGES ═══ */}
            {selectedContact && detailTab === 'sequence' && (
              <div>

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

                {/* SÉQUENCE ACTIVE */}
                {sequenceSteps.length > 0 ? (
                <div style={{ background: V.surface1, border: `1px solid ${V.line}`, borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(76,175,80,0.12)', color: V.green, fontWeight: 600 }}>▶ Séquence active</span>
                      <span style={{ fontSize: '10px', color: V.textLo }}>
                        Étape {sequenceSteps.filter(s => s.status === 'sent' || s.status === 'skipped').length + 1}/{sequenceSteps.length}
                      </span>
                    </div>
                    <button onClick={() => { setSequencePanelOpen(true); setSequencePanelView('list') }} style={{ padding: '4px 8px', fontSize: '10px', borderRadius: '5px', border: `1px solid ${V.line}`, background: 'transparent', color: V.textMid, cursor: 'pointer' }}>Modifier séquence</button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {sequenceSteps.map((step) => {
                      const isDone = step.status === 'sent' || step.status === 'skipped'
                      const isCurrent = step.status === 'pending' && !sequenceSteps.some(s => s.status === 'pending' && s.step_order < step.step_order)
                      const channelIcon = ({ email: '✉️', whatsapp: '💬', sms: '📱', call_reminder: '📞', linkedin: '🔗' } as Record<string, string>)[step.channel] || '📝'
                      const channelLabel = ({ email: 'Email', whatsapp: 'WhatsApp', sms: 'SMS', call_reminder: 'Appel', linkedin: 'LinkedIn' } as Record<string, string>)[step.channel] || step.channel

                      return (
                        <div key={step.id} style={{
                          display: 'flex', alignItems: 'flex-start', gap: '10px',
                          padding: isCurrent ? '10px 12px' : '8px 10px',
                          borderRadius: '8px',
                          borderLeft: `3px solid ${isDone ? V.green : isCurrent ? V.gold : V.line}`,
                          background: isCurrent ? 'rgba(232,200,120,0.05)' : 'transparent',
                          opacity: isDone ? 0.7 : isCurrent ? 1 : 0.5,
                        }}>
                          <span style={{ fontSize: '14px' }}>{channelIcon}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '11px', fontWeight: 600, color: V.textHi }}>{channelLabel} — Étape {step.step_order}</div>
                            <div style={{ fontSize: '10px', color: isDone ? V.textLo : isCurrent ? V.hot : V.textLo, fontWeight: isCurrent ? 600 : 400, marginTop: '2px' }}>
                              {isDone ? `${new Date(step.executed_at!).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · ${step.status === 'sent' ? 'Envoyé ✅' : 'Ignoré'}` :
                               isCurrent ? 'Maintenant' :
                               formatRelativeDate(new Date(step.scheduled_at))}
                            </div>
                            {step.message_sent && (
                              <div style={{ fontSize: '10px', color: V.textMid, fontStyle: 'italic', marginTop: '3px' }}>
                                &quot;{step.message_sent.slice(0, 100)}{step.message_sent.length > 100 ? '...' : ''}&quot;
                              </div>
                            )}
                            {isCurrent && (
                              <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                                <button onClick={async () => {
                                  const contact = contacts[selectedContactIdx]
                                  if (!contact) return
                                  if (step.channel === 'call_reminder') {
                                    handleLogInteraction('appel')
                                  } else if (step.channel === 'whatsapp') {
                                    if (contact.phone) openWhatsApp(contact.phone, '')
                                  } else if (step.channel === 'email') {
                                    setSelectedChannel('email')
                                    showToast('Composez et envoyez le message ci-dessous')
                                    return
                                  }
                                  await fetch('/api/cron/sequences-process', { headers: { 'x-cron-secret': '' } })
                                  showToast('Étape exécutée')
                                  loadContactDetails(contact.id)
                                }} style={{ padding: '4px 10px', fontSize: '10px', borderRadius: '5px', border: 'none', background: V.gold, color: V.bgDeep, fontWeight: 600, cursor: 'pointer' }}>{channelIcon} Exécuter maintenant</button>
                                <button onClick={async () => { const contact = contacts[selectedContactIdx]; if (!contact) return; const d = new Date(); d.setDate(d.getDate() + 2); await fetch('/api/nurturing/contact-config', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prospect_id: contact.id, next_action_date: d.toISOString().split('T')[0] }) }); showToast('Reporté de 2 jours') }} style={{ padding: '4px 10px', fontSize: '10px', borderRadius: '5px', border: `1px solid ${V.line}`, background: 'transparent', color: V.textMid, cursor: 'pointer' }}>Reporter +2j</button>
                                <button onClick={() => { setSelectedChannel('whatsapp'); showToast('Canal changé — compose en WhatsApp') }} style={{ padding: '4px 10px', fontSize: '10px', borderRadius: '5px', border: `1px solid ${V.line}`, background: 'transparent', color: V.textMid, cursor: 'pointer' }}>Changer canal</button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <button onClick={() => { setScheduleOpen(true); showToast('Planifiez la prochaine étape ci-dessous') }} style={{ marginTop: '10px', padding: '5px 10px', fontSize: '10px', borderRadius: '6px', border: `1px dashed ${V.line}`, background: 'transparent', color: V.textLo, cursor: 'pointer', width: '100%' }}>+ Ajouter une étape à la séquence</button>
                </div>
                ) : (
                <div style={{ background: V.surface1, border: `1px dashed ${V.line}`, borderRadius: '12px', padding: '20px', marginBottom: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: V.textLo, marginBottom: '8px' }}>Aucune séquence active</div>
                  <button onClick={() => { setSequencePanelOpen(true); setSequencePanelView('list') }} style={{ padding: '6px 14px', fontSize: '11px', borderRadius: '6px', border: `1px solid ${V.gold}`, background: 'rgba(232,200,120,0.08)', color: V.gold, cursor: 'pointer', fontWeight: 600 }}>Lancer une séquence</button>
                </div>
                )}

                {/* QUICK COMPOSE */}
                <div style={{ position: 'relative', background: 'rgba(232,200,120,0.04)', border: '1px solid rgba(232,200,120,0.18)', borderRadius: '14px', padding: '18px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: V.gold, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Composer un message
                    </div>
                    <span style={{ fontSize: '9px', color: V.textLo }}>Variables : {'{prenom}, {metier}, {theme}'}</span>
                  </div>

                  {/* Channel selector + TIPS toggle */}
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', alignItems: 'center' }}>
                    {(['email', 'call', 'whatsapp', 'linkedin', 'sms'] as Channel[]).map((ch) => (
                      <button
                        key={ch}
                        onClick={() => { setSelectedChannel(ch); setShowTips(false) }}
                        style={{
                          padding: '6px 12px', borderRadius: '8px',
                          border: `1px solid ${selectedChannel === ch && !showTips ? V.gold : V.line}`,
                          background: selectedChannel === ch && !showTips ? 'rgba(232,200,120,0.12)' : V.surface2,
                          color: selectedChannel === ch && !showTips ? V.gold : V.textMid,
                          fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        {ch === 'call' ? '📞 Appel' : ch === 'email' ? '✉️ Email' : ch === 'whatsapp' ? '💬 WhatsApp' : ch === 'linkedin' ? '🔗 LinkedIn' : '📱 SMS'}
                      </button>
                    ))}
                    <div style={{ width: '1px', height: '24px', background: V.line, margin: '0 4px' }} />
                    <button
                      onClick={() => setShowTips(!showTips)}
                      style={{
                        padding: '6px 12px', borderRadius: '8px',
                        border: `1px solid ${showTips ? V.gold : V.line}`,
                        background: showTips ? 'rgba(232,200,120,0.12)' : V.surface2,
                        color: showTips ? V.gold : V.textMid,
                        fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: showTips ? 700 : 400,
                      }}
                    >
                      💡 TIPS
                    </button>
                  </div>

                  {/* TIPS panel OR compose form */}
                  {showTips ? (
                    <div style={{ fontSize: '10px', color: V.text, lineHeight: '1.5', padding: '4px 0' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        {/* PP1 */}
                        <div style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(232,200,120,0.04)', border: `1px solid rgba(232,200,120,0.2)` }}>
                          <div style={{ fontWeight: 700, color: V.gold, fontSize: '11px', marginBottom: '8px' }}>📋 RÈGLES PP1 — PROSPECTION PRIME</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '10px', color: V.textMid }}>
                            <div><strong style={{ color: V.text }}>Accroche contextualisée</strong> : Les 2 premières lignes sont décisives. Ancrez dans un contexte réel partagé.</div>
                            <div><strong style={{ color: V.text }}>Pas de pitch dans la connexion</strong> : LinkedIn = reconnaissance + curiosité uniquement.</div>
                            <div><strong style={{ color: V.text }}>Email premier contact</strong> : 60% de préférence, taux d&apos;ouverture optimal mardi-jeudi 9h-11h30.</div>
                            <div><strong style={{ color: V.text }}>WhatsApp micro-relance</strong> : Court, pas intrusif, offre une porte de sortie. Un vocal 30s vaut 10 messages écrits.</div>
                            <div><strong style={{ color: V.text }}>Téléphone</strong> : Identifiez-vous + contexte en 10s. UNE question ouverte. 2 min max si non qualifié.</div>
                          </div>
                        </div>
                        {/* PP2 */}
                        <div style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(255,100,112,0.04)', border: '1px solid rgba(255,100,112,0.2)' }}>
                          <div style={{ fontWeight: 700, color: '#ff6470', fontSize: '11px', marginBottom: '8px' }}>🛑 RÈGLES PP2 — ANTI-PRESSION</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '10px', color: V.textMid }}>
                            <div><strong style={{ color: V.text }}>Max 2 touchpoints/semaine</strong> : Jamais 2 canaux le même jour.</div>
                            <div><strong style={{ color: V.text }}>STOP après 6 tentatives sans interaction</strong> (prospect froid) — Préserver la relation long terme.</div>
                            <div><strong style={{ color: V.text }}>STOP après 3 non-réponses consécutives</strong> (prospect tiède) — Email de rupture bienveillant obligatoire.</div>
                            <div><strong style={{ color: V.text }}>Si 3 messages sans vue</strong> → STOP et changer de canal. Le prospect ne lit pas ce canal.</div>
                            <div><strong style={{ color: V.text }}>Ré-engagement après 60-90j</strong> + événement déclencheur (actualité secteur, nouveau produit).</div>
                            <div><strong style={{ color: V.text }}>WhatsApp 97% ouverture</strong> mais ne JAMAIS spammer. Utiliser en J+5 ou J+10 uniquement.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
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

                  {/* Sequence panel overlay */}
                  {sequencePanelOpen && (
                    <div style={{
                      position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: '6px',
                      background: V.bgMid, border: `1px solid ${V.line}`, borderRadius: '12px',
                      padding: '14px', maxHeight: '400px', overflowY: 'auto',
                      boxShadow: '0 -8px 32px rgba(0,0,0,0.5)', zIndex: 50,
                    }}>
                      {sequencePanelView === 'list' ? (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <div style={{ fontSize: '11px', color: V.textMid, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Séquences disponibles ({sequenceTemplates.length})
                            </div>
                            <button onClick={() => setSequencePanelOpen(false)} style={{ border: 'none', background: 'transparent', color: V.textLo, cursor: 'pointer', fontSize: '16px' }}>×</button>
                          </div>

                          {sequenceTemplates.length === 0 ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: V.textLo, fontSize: '12px' }}>
                              Aucune séquence disponible
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                              {sequenceTemplates.map(tpl => (
                                <div
                                  key={tpl.id}
                                  onClick={() => { handleAssignSequence(tpl.id); setSequencePanelOpen(false) }}
                                  style={{
                                    padding: '10px 12px',
                                    borderRadius: '8px',
                                    border: `1px solid ${V.line}`,
                                    background: V.surface1,
                                    cursor: 'pointer',
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.borderColor = V.gold; e.currentTarget.style.background = V.surface2 }}
                                  onMouseLeave={e => { e.currentTarget.style.borderColor = V.line; e.currentTarget.style.background = V.surface1 }}
                                >
                                  <div style={{ fontSize: '12px', fontWeight: 600, color: V.textHi, marginBottom: '3px' }}>{tpl.name}</div>
                                  <div style={{ fontSize: '10px', color: V.textMid }}>{tpl.description || 'Séquence multicanale'}</div>
                                </div>
                              ))}
                            </div>
                          )}

                          <button
                            onClick={() => setSequencePanelView('create')}
                            style={{
                              width: '100%',
                              padding: '8px 14px',
                              borderRadius: '8px',
                              border: `1px solid ${V.gold}`,
                              background: 'rgba(232,200,120,0.08)',
                              color: V.gold,
                              fontSize: '11px',
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                          >
                            + Nouvelle séquence
                          </button>
                        </>
                      ) : (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <button onClick={() => setSequencePanelView('list')} style={{ border: 'none', background: 'transparent', color: V.textMid, cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              ← Retour
                            </button>
                            <button onClick={() => setSequencePanelOpen(false)} style={{ border: 'none', background: 'transparent', color: V.textLo, cursor: 'pointer', fontSize: '16px' }}>×</button>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <input
                              value={newSequence.name}
                              onChange={e => setNewSequence(p => ({ ...p, name: e.target.value }))}
                              placeholder="Nom de la séquence *"
                              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: `1px solid ${V.line}`, background: V.surface2, color: V.textHi, fontSize: '11px', fontFamily: 'inherit', outline: 'none' }}
                            />
                            <input
                              value={newSequence.description}
                              onChange={e => setNewSequence(p => ({ ...p, description: e.target.value }))}
                              placeholder="Description"
                              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: `1px solid ${V.line}`, background: V.surface2, color: V.textHi, fontSize: '11px', fontFamily: 'inherit', outline: 'none' }}
                            />

                            <div style={{ borderTop: `1px solid ${V.line}`, paddingTop: '10px', marginTop: '4px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <div style={{ fontSize: '10px', color: V.textMid, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Étapes ({newSequence.steps.length})</div>
                                <button
                                  onClick={() => setNewSequence(p => ({ ...p, steps: [...p.steps, { channel: 'email', delay_days: p.steps.length, message_template: '' }] }))}
                                  style={{ padding: '3px 8px', fontSize: '9px', borderRadius: '4px', border: `1px solid ${V.gold}`, background: 'rgba(232,200,120,0.08)', color: V.gold, cursor: 'pointer', fontWeight: 600 }}
                                >
                                  + Étape
                                </button>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                                {newSequence.steps.map((step, idx) => (
                                  <div key={idx} style={{ padding: '10px', borderRadius: '8px', background: V.surface1, border: `1px solid ${V.line}` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                      <div style={{ fontSize: '10px', fontWeight: 600, color: V.textHi }}>Étape {idx + 1}</div>
                                      {newSequence.steps.length > 1 && (
                                        <button
                                          onClick={() => setNewSequence(p => ({ ...p, steps: p.steps.filter((_, i) => i !== idx) }))}
                                          style={{ padding: '2px 6px', fontSize: '9px', borderRadius: '3px', border: `1px solid ${V.line}`, background: 'transparent', color: V.red, cursor: 'pointer' }}
                                        >
                                          Suppr.
                                        </button>
                                      )}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: '6px', marginBottom: '6px' }}>
                                      <select
                                        value={step.channel}
                                        onChange={e => {
                                          const updated = [...newSequence.steps]
                                          updated[idx].channel = e.target.value
                                          setNewSequence(p => ({ ...p, steps: updated }))
                                        }}
                                        style={{ padding: '5px 8px', borderRadius: '5px', border: `1px solid ${V.line}`, background: V.surface2, color: V.text, fontSize: '10px', fontFamily: 'inherit', outline: 'none' }}
                                      >
                                        <option value="email">✉️ Email</option>
                                        <option value="whatsapp">💬 WhatsApp</option>
                                        <option value="sms">📱 SMS</option>
                                        <option value="call_reminder">📞 Appel</option>
                                        <option value="linkedin">🔗 LinkedIn</option>
                                      </select>
                                      <input
                                        type="number"
                                        value={step.delay_days}
                                        onChange={e => {
                                          const updated = [...newSequence.steps]
                                          updated[idx].delay_days = parseInt(e.target.value) || 0
                                          setNewSequence(p => ({ ...p, steps: updated }))
                                        }}
                                        placeholder="J+"
                                        style={{ padding: '5px 8px', borderRadius: '5px', border: `1px solid ${V.line}`, background: V.surface2, color: V.text, fontSize: '10px', fontFamily: 'inherit', outline: 'none' }}
                                      />
                                    </div>
                                    <textarea
                                      value={step.message_template}
                                      onChange={e => {
                                        const updated = [...newSequence.steps]
                                        updated[idx].message_template = e.target.value
                                        setNewSequence(p => ({ ...p, steps: updated }))
                                      }}
                                      placeholder="Message avec {{nom}}, {{prenom}}..."
                                      style={{
                                        width: '100%', minHeight: '50px', padding: '6px 8px', borderRadius: '5px',
                                        border: `1px solid ${V.line}`, background: V.surface2, color: V.textHi,
                                        fontSize: '10px', fontFamily: 'inherit', resize: 'vertical', lineHeight: '1.4',
                                        outline: 'none',
                                      }}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                              <button onClick={() => handleCreateSequence(true)} style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: 'none', background: V.gold, color: V.bgDeep, fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>
                                Créer et assigner
                              </button>
                              <button onClick={() => handleCreateSequence(false)} style={{ padding: '8px 12px', borderRadius: '6px', border: `1px solid ${V.line}`, background: 'transparent', color: V.text, fontSize: '10px', cursor: 'pointer' }}>
                                Créer
                              </button>
                            </div>
                          </div>
                        </>
                      )}
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
                      <div style={{ fontSize: '11px', fontWeight: 600, color: V.gold, marginBottom: '8px' }}>📅 Planifier l&apos;envoi</div>
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
                    </>
                  )}
                </div>

                {/* PROCHAINES ACTIONS PLANIFIÉES */}
                <div style={{ background: V.surface1, border: `1px solid ${V.line}`, borderRadius: '12px', padding: '14px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: V.textHi, textTransform: 'uppercase', letterSpacing: '0.5px' }}>📅 Prochaines actions planifiées</div>
                    <button onClick={() => setScheduleOpen(true)} style={{ padding: '3px 8px', fontSize: '10px', borderRadius: '5px', border: `1px solid ${V.line}`, background: 'transparent', color: V.textMid, cursor: 'pointer' }}>+ Planifier</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {upcomingActions.length === 0 ? (
                      <div style={{ padding: '16px', textAlign: 'center', fontSize: '11px', color: V.textLo }}>
                        Aucune action planifiée · Cliquez &quot;+ Planifier&quot;
                      </div>
                    ) : (
                      upcomingActions.slice(0, 4).map(action => {
                        const channelIcon = ({ email: '✉️', whatsapp: '💬', sms: '📱', telephone: '📞', call_reminder: '📞', linkedin: '🔗' } as Record<string, string>)[action.channel] || '📝'
                        const actionDate = new Date(action.date)
                        const isToday = actionDate.toDateString() === new Date().toDateString()
                        const dateLabel = isToday ? "Aujourd'hui" : actionDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

                        return (
                          <div key={action.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px', borderRadius: '6px', background: isToday ? 'rgba(255,68,68,0.05)' : 'transparent', border: isToday ? '1px solid rgba(255,68,68,0.15)' : 'none' }}>
                            <span style={{ fontSize: '10px', color: isToday ? V.hot : V.textLo, fontWeight: isToday ? 600 : 400, minWidth: '70px' }}>{dateLabel}</span>
                            <span style={{ fontSize: '13px' }}>{channelIcon}</span>
                            <span style={{ fontSize: '11px', color: V.textHi, flex: 1 }}>{action.label}</span>
                            <button onClick={async () => {
                              if (action.type === 'scheduled') {
                                const channelMap: Record<string, Channel> = { email: 'email', whatsapp: 'whatsapp', linkedin: 'linkedin', telephone: 'call', sms: 'sms' }
                                if (channelMap[action.channel]) setSelectedChannel(channelMap[action.channel])
                                showToast('Canal sélectionné — composez votre message')
                              } else {
                                await fetch('/api/cron/sequences-process', { headers: { 'x-cron-secret': '' } })
                                showToast('Étape exécutée')
                                loadContactDetails(action.prospectId)
                                loadUpcomingActions(action.prospectId)
                              }
                            }} style={{ padding: '2px 6px', fontSize: '9px', borderRadius: '4px', border: `1px solid ${V.line}`, background: 'transparent', color: V.textLo, cursor: 'pointer' }}>
                              {action.type === 'scheduled' ? 'Composer' : 'Fait ✓'}
                            </button>
                          </div>
                        )
                      })
                    )}
                  </div>
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
