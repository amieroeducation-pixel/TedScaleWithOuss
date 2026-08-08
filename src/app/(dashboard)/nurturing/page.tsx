'use client'

import { useState, useEffect, useRef } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { saveLastSection } from '@/lib/navigation-state'
import {
  Contact, Interaction, NurturingDoc, NurturingMessage, ContactConfig,
  Channel, DetailTab, TempCategory, PressureData, UpcomingAction, SequenceStep,
  V, tempIcons, calculateTempCategory, formatRelativeDate, channelToIcon,
  interactionTypeToIcon, computePressure,
} from './nurturing-types'
import ContactList from './ContactList'
import ContactDetail from './ContactDetail'

export default function NurturingPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContactIdx, setSelectedContactIdx] = useState(0)
  const [detailTab, setDetailTab] = useState<DetailTab>('sequence')
  const [openMenuIdx, setOpenMenuIdx] = useState<number | null>(null)
  const [selectedChannel, setSelectedChannel] = useState<Channel>('email')
  const [showTips, setShowTips] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [sequencePanelOpen, setSequencePanelOpen] = useState(false)
  const [sequencePanelView, setSequencePanelView] = useState<'list' | 'create' | 'detail'>('list')
  const [seedImporting, setSeedImporting] = useState(false)
  const [detailTemplateId, setDetailTemplateId] = useState<string | null>(null)
  const [detailSteps, setDetailSteps] = useState<Array<{ id: string; step_order: number; channel: string; delay_days: number; message_template: string }>>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [messageText, setMessageText] = useState('')
  const [messageSubject, setMessageSubject] = useState('')
  const [pressure, setPressure] = useState<PressureData>({ score: 0, badge: 'normal', label: '✓ Normale', color: '#4caf50' })
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
  const [showArchived, setShowArchived] = useState(false)
  const [attachedDoc, setAttachedDoc] = useState<NurturingDoc | null>(null)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('09:00')
  const [sequenceSteps, setSequenceSteps] = useState<SequenceStep[]>([])
  const [sequenceLoading, setSequenceLoading] = useState(false)
  const [upcomingActions, setUpcomingActions] = useState<UpcomingAction[]>([])
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

  useEffect(() => {
    loadContacts()
  }, [showArchived])

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // ─── DATA LOADING ────────────────────────────────────────────────────────────
  async function loadContacts(): Promise<number> {
    setLoading(true)
    try {
      const url = showArchived ? '/api/nurturing/contacts?include_archived=true' : '/api/nurturing/contacts'
      const res = await fetch(url)
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
          pressure: (p.computed_pressure || 0) > 6 ? 'stop' : (p.computed_pressure || 0) >= 4 ? 'vary' : undefined,
          pressureScore: (p.computed_pressure || 0) > 6 ? 5
            : (p.computed_pressure || 0) >= 4 ? 4
            : (p.computed_pressure || 0) >= 2 ? 3
            : (p.computed_pressure || 0) >= 1 ? 2
            : 0,
          excludedChannels: [],
          sequenceActive: p.sequence_active || null,
          archived: p.nurturing_archived || false,
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
      if (json.data?.templates) setSequenceTemplates(json.data.templates)
      else if (Array.isArray(json.data)) setSequenceTemplates(json.data)
    } catch (e) {
      console.error('loadSequenceTemplates error:', e)
    }
  }

  async function autoImportSeedLibrary() {
    setSeedImporting(true)
    try {
      const res = await fetch('/api/crm/sequences/seed-library', { method: 'POST' })
      const json = await res.json()
      if (json.data?.created > 0 || json.data?.skipped > 0) {
        await loadSequenceTemplates()
      }
    } catch (e) {
      console.error('autoImportSeedLibrary error:', e)
      showToast('Erreur import séquences', 'error')
    } finally {
      setSeedImporting(false)
    }
  }

  async function handleOpenSequencePanel() {
    if (sequencePanelOpen) {
      setSequencePanelOpen(false)
      return
    }
    setSequencePanelOpen(true)
    setSequencePanelView('list')
    if (sequenceTemplates.length === 0) {
      await autoImportSeedLibrary()
    }
  }

  async function loadTemplateDetail(templateId: string) {
    setDetailTemplateId(templateId)
    setSequencePanelView('detail')
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/crm/sequences/templates/${templateId}/steps`)
      const json = await res.json()
      if (json.data?.steps) setDetailSteps(json.data.steps)
      else setDetailSteps([])
    } catch {
      setDetailSteps([])
    } finally {
      setDetailLoading(false)
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
        status: i.is_honored ? 'replied' : 'pending',
        icon: interactionTypeToIcon(i.type),
      }))
      setInteractions(interactionList)
      setPressure(computePressure(interactionList))
    }

    if (docJson.data) setDocuments(docJson.data)
    if (configJson.data) setContactConfig(configJson.data)

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
        const myEmail = 'tcaboste@conservateur-conseil.fr'
        const subjectLine = messageSubject || 'Suivi - ' + contact.name
        const prospectEmail = contact.email || '(pas d\'email renseigné)'
        const fullBody = `➡️ À transférer à : ${contact.name} <${prospectEmail}>\n\n---\n\n${messageText}${attachedDoc?.url ? `\n\n📎 Document : ${attachedDoc.url}` : ''}`
        const subject = encodeURIComponent(`[Nurturing] ${subjectLine}`)
        const body = encodeURIComponent(fullBody)
        window.open(`mailto:${myEmail}?subject=${subject}&body=${body}`, '_self')
        await fetch('/api/nurturing/interactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prospect_id: contact.id,
            type: 'email',
            notes: `Email préparé : ${subjectLine}`,
          }),
        })
        showToast('Email préparé → vérifie dans Outlook puis transfère')
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

  async function handleDeleteContact(contactId: string) {
    try {
      const res = await fetch('/api/nurturing/contacts/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospect_id: contactId }),
      })
      if (!res.ok) throw new Error('Erreur suppression')
      showToast('Contact supprimé définitivement')
      loadContacts()
    } catch {
      showToast('Erreur suppression', 'error')
    }
  }

  async function handleMarkHonored(interactionId: string) {
    const contact = contacts[selectedContactIdx]
    if (!contact) return

    try {
      const res = await fetch('/api/nurturing/interactions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interaction_id: interactionId, is_honored: true }),
      })
      if (!res.ok) throw new Error('Erreur mise à jour')
      showToast('Retour prospect enregistré')
      loadContactDetails(contact.id)
      loadContacts()
    } catch {
      showToast('Erreur enregistrement retour', 'error')
    }
  }

  async function handleArchiveContact(contactId: string, archived: boolean) {
    try {
      const res = await fetch('/api/nurturing/contacts/archive', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospect_id: contactId, archived }),
      })
      if (!res.ok) throw new Error('Erreur archivage')
      showToast(archived ? 'Contact archivé' : 'Contact désarchivé')
      loadContacts()
    } catch {
      showToast('Erreur archivage', 'error')
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

      const templateId = jsonTemplate.data?.template?.id || jsonTemplate.data?.id

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

  const filteredContacts = contacts.filter(c => {
    if (filterTemp !== 'all' && c.temp !== filterTemp) return false
    if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
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

      {/* HEADER */}
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

      {/* MAIN 2-COL LAYOUT */}
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '20px', height: 'calc(100vh - 160px)' }}>
        <ContactList
          contacts={contacts}
          filteredContacts={filteredContacts}
          selectedContactIdx={selectedContactIdx}
          openMenuIdx={openMenuIdx}
          filterTemp={filterTemp}
          searchQuery={searchQuery}
          loading={loading}
          showArchived={showArchived}
          onSelectContact={setSelectedContactIdx}
          onSetOpenMenuIdx={setOpenMenuIdx}
          onSetFilterTemp={setFilterTemp}
          onSetSearchQuery={setSearchQuery}
          onSetShowArchived={setShowArchived}
          onLogInteraction={handleLogInteraction}
          onArchiveContact={handleArchiveContact}
          onDeleteContact={handleDeleteContact}
          onSetSelectedChannel={setSelectedChannel}
          onSetDetailTab={setDetailTab}
          onSetLibraryOpen={setLibraryOpen}
        />

        <ContactDetail
          selectedContact={selectedContact}
          detailTab={detailTab}
          interactions={interactions}
          pressure={pressure}
          contactConfig={contactConfig}
          sequenceSteps={sequenceSteps}
          sequenceLoading={sequenceLoading}
          upcomingActions={upcomingActions}
          selectedChannel={selectedChannel}
          showTips={showTips}
          messageText={messageText}
          messageSubject={messageSubject}
          sending={sending}
          attachedDoc={attachedDoc}
          libraryOpen={libraryOpen}
          documents={documents}
          messages={messages}
          scheduleOpen={scheduleOpen}
          scheduleDate={scheduleDate}
          scheduleTime={scheduleTime}
          sequencePanelOpen={sequencePanelOpen}
          sequencePanelView={sequencePanelView}
          sequenceTemplates={sequenceTemplates}
          seedImporting={seedImporting}
          detailTemplateId={detailTemplateId}
          detailSteps={detailSteps}
          detailLoading={detailLoading}
          newSequence={newSequence}
          onSetDetailTab={setDetailTab}
          onSetSelectedChannel={setSelectedChannel}
          onSetShowTips={setShowTips}
          onSetMessageText={setMessageText}
          onSetMessageSubject={setMessageSubject}
          onSendMessage={handleSendMessage}
          onScheduleMessage={handleScheduleMessage}
          onSetAttachedDoc={setAttachedDoc}
          onSetLibraryOpen={setLibraryOpen}
          onSetScheduleOpen={setScheduleOpen}
          onSetScheduleDate={setScheduleDate}
          onSetScheduleTime={setScheduleTime}
          onLogInteraction={handleLogInteraction}
          onSaveConfig={handleSaveConfig}
          onSetContactConfig={setContactConfig}
          onOpenSequencePanel={handleOpenSequencePanel}
          onSetSequencePanelView={setSequencePanelView}
          onSetSequencePanelOpen={setSequencePanelOpen}
          onAssignSequence={handleAssignSequence}
          onCreateSequence={handleCreateSequence}
          onLoadTemplateDetail={loadTemplateDetail}
          onSetNewSequence={setNewSequence}
          onOpenWhatsApp={openWhatsApp}
          onSelectTemplate={handleSelectTemplate}
          contacts={contacts}
          selectedContactIdx={selectedContactIdx}
          showToast={showToast}
          onLoadContactDetails={loadContactDetails}
          onLoadUpcomingActions={loadUpcomingActions}
          onMarkHonored={handleMarkHonored}
        />
      </div>
    </div>
  )
}
