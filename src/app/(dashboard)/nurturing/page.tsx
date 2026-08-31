'use client'

import { useState, useEffect, useRef } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'
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
import { interpolateTemplate, prepareContactData } from '@/lib/nurturing/interpolate'
import { generateNurturingPDF } from '@/lib/nurturing/pdf-export'

export default function NurturingPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContactIdx, setSelectedContactIdx] = useState(0)
  const [detailTab, setDetailTab] = useState<DetailTab>('sequence')
  const [openMenuIdx, setOpenMenuIdx] = useState<number | null>(null)
  const [selectedChannel, setSelectedChannel] = useState<Channel>('email')
  const [showTips, setShowTips] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [sequencePanelOpen, setSequencePanelOpen] = useState(false)
  const [sequencePanelView, setSequencePanelView] = useState<'list' | 'create' | 'detail' | 'edit'>('list')
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
  const [importOpen, setImportOpen] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvParsed, setCsvParsed] = useState<any[]>([])
  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState<{ total: number; imported: number; skipped: number; errors: any[] } | null>(null)
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
  const [sequenceInstanceId, setSequenceInstanceId] = useState<string | null>(null)
  const [sequenceStatus, setSequenceStatus] = useState<'active' | 'paused' | 'completed' | 'cancelled' | null>(null)
  const [upcomingActions, setUpcomingActions] = useState<UpcomingAction[]>([])
  const [sequenceTemplates, setSequenceTemplates] = useState<Array<{ id: string; name: string; description: string }>>([])
  const [newSequence, setNewSequence] = useState({ name: '', description: '', steps: [{ channel: 'email', delay_days: 0, message_template: '' }] })
  const [kpis, setKpis] = useState<{ taux_conversion: number; temps_moyen_reponse: number; score_global: number; contacts_actifs: number; relances_semaine: number; taux_reponse: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [historyTypeFilters, setHistoryTypeFilters] = useState<string[]>([])
  const [historyDateRange, setHistoryDateRange] = useState<{ start: string | null; end: string | null }>({ start: null, end: null })
  const [kpisDateRange, setKpisDateRange] = useState<{ start: string | null; end: string | null }>({ start: null, end: null })
  const [availableThemes, setAvailableThemes] = useState<Array<{ id: string; name: string; color: string; icon: string }>>([])
  const [selectedThemeIds, setSelectedThemeIds] = useState<string[]>([])

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
    loadKpis()
    loadAvailableThemes()

    const scheduledInterval = setInterval(checkScheduledMessages, 30000)
    return () => clearInterval(scheduledInterval)
  }, [])

  useEffect(() => {
    if (contacts.length > 0) {
      loadContactDetails(contacts[selectedContactIdx].id)
      loadUpcomingActions(contacts[selectedContactIdx].id)
      loadProspectThemes(contacts[selectedContactIdx].id)
    }
  }, [selectedContactIdx, contacts.length])

  useEffect(() => {
    loadContacts()
  }, [showArchived])

  useEffect(() => {
    loadKpis()
  }, [kpisDateRange])

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // ─── DRAFT AUTOSAVE ──────────────────────────────────────────────────────────
  const saveDraft = useDebouncedCallback(async (contactId: string, channel: Channel, text: string, subject: string, docId: string | null) => {
    if (!text.trim() && !subject.trim()) return // Pas de brouillon vide

    try {
      await fetch('/api/nurturing/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospect_id: contactId,
          channel,
          message_text: text,
          message_subject: subject,
          document_id: docId,
        }),
      })
    } catch (e) {
      console.error('Erreur sauvegarde brouillon:', e)
    }
  }, 1000)

  useEffect(() => {
    if (contacts.length > 0 && (messageText || messageSubject)) {
      saveDraft(contacts[selectedContactIdx].id, selectedChannel, messageText, messageSubject, attachedDoc?.id || null)
    }
  }, [messageText, messageSubject, attachedDoc, selectedContactIdx, selectedChannel])

  async function deleteDraft(contactId: string, channel: Channel) {
    try {
      await fetch(`/api/nurturing/drafts?prospect_id=${contactId}&channel=${channel}`, {
        method: 'DELETE',
      })
    } catch (e) {
      console.error('Erreur suppression brouillon:', e)
    }
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
        // Use actual temperature_score computed by backend cron
        const temperatureScore = p.temperature_score || 0

        const temp = calculateTempCategory(
          temperatureScore,
          p.nb_relances_sans_reponse || 0,
          p.forced_temperature
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
          city: p.city || null,
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
          forcedTemperature: p.forced_temperature || null,
          timezone: p.timezone || 'Europe/Paris',
          linkedin_url: p.linkedin_url || null,
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

  async function loadKpis() {
    try {
      const params = new URLSearchParams()
      if (kpisDateRange.start) params.set('start_date', kpisDateRange.start)
      if (kpisDateRange.end) params.set('end_date', kpisDateRange.end)

      const url = params.toString() ? `/api/nurturing/kpis?${params.toString()}` : '/api/nurturing/kpis'
      const res = await fetch(url)
      const json = await res.json()
      if (json.data) setKpis(json.data)
    } catch (e) {
      console.error('loadKpis error:', e)
    }
  }

  async function loadAvailableThemes() {
    try {
      const res = await fetch('/api/nurturing/themes')
      const json = await res.json()
      if (json.data) setAvailableThemes(json.data)
    } catch (e) {
      console.error('loadAvailableThemes error:', e)
    }
  }

  async function loadProspectThemes(prospectId: string) {
    try {
      const res = await fetch(`/api/nurturing/prospect-themes?prospect_id=${prospectId}`)
      const json = await res.json()
      if (json.data) {
        setSelectedThemeIds(json.data.map((t: any) => t.id))
      } else {
        setSelectedThemeIds([])
      }
    } catch (e) {
      console.error('loadProspectThemes error:', e)
      setSelectedThemeIds([])
    }
  }

  async function saveProspectThemes(prospectId: string, themeIds: string[]) {
    try {
      const res = await fetch('/api/nurturing/prospect-themes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospect_id: prospectId, theme_ids: themeIds }),
      })
      if (res.ok) {
        showToast('Thèmes mis à jour')
        await loadContacts() // Recharger pour voir les badges
      } else {
        const json = await res.json()
        showToast(json.error || 'Erreur sauvegarde thèmes', 'error')
      }
    } catch (e) {
      console.error('saveProspectThemes error:', e)
      showToast('Erreur sauvegarde thèmes', 'error')
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
    const [interRes, docRes, configRes, draftRes] = await Promise.all([
      fetch(`/api/nurturing/interactions?prospect_id=${contactId}`),
      fetch(`/api/nurturing/documents?prospect_id=${contactId}`),
      fetch(`/api/nurturing/contact-config?prospect_id=${contactId}`),
      fetch(`/api/nurturing/drafts?prospect_id=${contactId}&channel=${selectedChannel}`),
    ])

    const [interJson, docJson, configJson, draftJson] = await Promise.all([
      interRes.json(), docRes.json(), configRes.json(), draftRes.json(),
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

    // Charger brouillon si existe
    if (draftJson.data) {
      setMessageText(draftJson.data.message_text || '')
      setMessageSubject(draftJson.data.message_subject || '')
      if (draftJson.data.document_id) {
        const doc = documents.find(d => d.id === draftJson.data.document_id)
        if (doc) setAttachedDoc(doc)
      }
    } else {
      // Réinitialiser si pas de brouillon
      setMessageText('')
      setMessageSubject('')
      setAttachedDoc(null)
    }

    const { data: seqData } = await supabase
      .from('sequence_instance_steps')
      .select('id, step_order, channel, status, scheduled_at, executed_at, message_sent, error_message, instance_id, sequence_instances!inner(id, prospect_id, status)')
      .eq('sequence_instances.prospect_id', contactId)
      .in('sequence_instances.status', ['active', 'paused'])
      .order('step_order', { ascending: true })

    if (seqData && seqData.length > 0) {
      const firstStep: any = seqData[0]
      const instanceData: any = firstStep.sequence_instances
      setSequenceInstanceId(instanceData.id)
      setSequenceStatus(instanceData.status)

      setSequenceSteps(seqData.map((s: any) => ({
        id: s.id,
        step_order: s.step_order,
        channel: s.channel,
        status: s.status,
        scheduled_at: s.scheduled_at,
        executed_at: s.executed_at,
        message_sent: s.message_sent,
        error_message: s.error_message,
      })))
    } else {
      setSequenceInstanceId(null)
      setSequenceStatus(null)
      setSequenceSteps([])
    }
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
      // Canaux avec envoi direct Brevo
      if (sendChannel === 'email' || sendChannel === 'sms') {
        const res = await fetch('/api/nurturing/send-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prospect_id: contact.id,
            channel: sendChannel,
            message: messageText,
            subject: messageSubject || null,
            document_url: attachedDoc?.url || null,
          }),
        })
        const json = await res.json()
        if (!res.ok) {
          showToast(json.error || 'Erreur envoi', 'error')
          setSending(false)
          return
        }
        showToast(`${sendChannel === 'email' ? 'Email' : 'SMS'} envoyé via Brevo`)
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

      if (attachedDoc && sendChannel !== 'email' && sendChannel !== 'sms') {
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

      // Supprimer le brouillon après envoi
      await deleteDraft(contact.id, sendChannel)

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

    // Convert contact timezone to UTC
    const contactTimezone = contact.timezone || 'Europe/Paris'
    const localDateTime = new Date(`${scheduleDate}T${scheduleTime}:00`)
    const scheduledAtUTC = fromZonedTime(localDateTime, contactTimezone)

    if (scheduledAtUTC <= new Date()) {
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
        scheduled_at: scheduledAtUTC.toISOString(),
        phone: contact.phone || null,
        email: contact.email || null,
        prospect_name: contact.name,
      })
      showToast(`Planifié pour le ${new Date(localDateTime).toLocaleDateString('fr-FR')} à ${scheduleTime} (${contactTimezone})`)
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
    const contact = contacts[selectedContactIdx]
    if (!contact) {
      setMessageText(msg.body)
      if (msg.subject) setMessageSubject(msg.subject)
    } else {
      // Interpolate variables using Handlebars
      const contactData = prepareContactData({
        full_name: contact.name,
        metier: contact.job,
        ville: contact.city,
        email: contact.email,
        phone: contact.phone,
      })
      setMessageText(interpolateTemplate(msg.body, contactData))
      if (msg.subject) setMessageSubject(interpolateTemplate(msg.subject, contactData))
    }
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

  async function handlePauseSequence() {
    if (!sequenceInstanceId) return
    const contact = contacts[selectedContactIdx]
    if (!contact) return

    try {
      const res = await fetch(`/api/crm/sequences/${sequenceInstanceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erreur pause séquence')
      showToast('Séquence mise en pause')
      loadContactDetails(contact.id)
      loadContacts()
    } catch (e: any) {
      showToast(e.message || 'Erreur pause', 'error')
    }
  }

  async function handleResumeSequence() {
    if (!sequenceInstanceId) return
    const contact = contacts[selectedContactIdx]
    if (!contact) return

    try {
      const res = await fetch(`/api/crm/sequences/${sequenceInstanceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resume' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erreur reprise séquence')
      showToast('Séquence reprise')
      loadContactDetails(contact.id)
      loadContacts()
    } catch (e: any) {
      showToast(e.message || 'Erreur reprise', 'error')
    }
  }

  async function handleStopSequence() {
    if (!sequenceInstanceId) return
    const contact = contacts[selectedContactIdx]
    if (!contact) return

    if (!confirm('Voulez-vous vraiment arrêter définitivement cette séquence ? Cette action est irréversible.')) {
      return
    }

    try {
      const res = await fetch(`/api/crm/sequences/${sequenceInstanceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erreur arrêt séquence')
      showToast('Séquence arrêtée')
      loadContactDetails(contact.id)
      loadContacts()
    } catch (e: any) {
      showToast(e.message || 'Erreur arrêt', 'error')
    }
  }

  async function handleDuplicateTemplate(templateId: string) {
    try {
      const res = await fetch(`/api/crm/sequences/templates/${templateId}/duplicate`, {
        method: 'POST',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erreur duplication')
      showToast('Séquence dupliquée avec succès')
      await loadSequenceTemplates()
      setSequencePanelView('list')
    } catch (e: any) {
      showToast(e.message || 'Erreur duplication', 'error')
    }
  }

  async function handleEditTemplate(templateId: string) {
    // Charger le template et ses steps
    setDetailTemplateId(templateId)
    setDetailLoading(true)
    try {
      const [templateRes, stepsRes] = await Promise.all([
        fetch(`/api/crm/sequences/templates/${templateId}`),
        fetch(`/api/crm/sequences/templates/${templateId}/steps`)
      ])
      const [templateJson, stepsJson] = await Promise.all([
        templateRes.json(),
        stepsRes.json()
      ])

      if (templateJson.data?.template) {
        const tpl = templateJson.data.template
        setNewSequence({
          name: tpl.name,
          description: tpl.description || '',
          steps: stepsJson.data?.steps?.map((s: any) => ({
            channel: s.channel,
            delay_days: s.delay_days,
            message_template: s.message_template || ''
          })) || []
        })
      }
      setSequencePanelView('edit')
    } catch (e) {
      showToast('Erreur chargement template', 'error')
    } finally {
      setDetailLoading(false)
    }
  }

  async function handleSaveEditedTemplate(templateId: string) {
    if (!newSequence.name.trim()) {
      showToast('Nom de séquence requis', 'error')
      return
    }

    try {
      // Mettre à jour le template
      const resTemplate = await fetch(`/api/crm/sequences/templates/${templateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSequence.name,
        }),
      })
      if (!resTemplate.ok) {
        const json = await resTemplate.json()
        throw new Error(json.error || 'Erreur mise à jour template')
      }

      // Supprimer les anciens steps et recréer
      const { data: oldSteps } = await supabase
        .from('sequence_template_steps')
        .select('id')
        .eq('template_id', templateId)

      if (oldSteps && oldSteps.length > 0) {
        for (const step of oldSteps) {
          await fetch(`/api/crm/sequences/templates/${templateId}/steps/${step.id}`, {
            method: 'DELETE',
          })
        }
      }

      // Créer les nouveaux steps
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

      showToast('Séquence mise à jour avec succès')
      await loadSequenceTemplates()
      setSequencePanelView('list')
      setDetailTemplateId(null)
    } catch (e: any) {
      showToast(e.message || 'Erreur sauvegarde', 'error')
    }
  }

  async function handleExportPDF() {
    if (!kpis) {
      showToast('Aucune donnée KPI à exporter', 'error')
      return
    }

    try {
      // Préparer top 5 contacts actifs
      const sortedContacts = [...contacts]
        .filter(c => !c.archived)
        .sort((a, b) => b.touchpoints - a.touchpoints)
        .slice(0, 5)

      const topContacts = sortedContacts.map(c => ({
        name: c.name,
        temperature: c.temp,
        touchpoints: c.touchpoints,
        responses: c.responses,
      }))

      // Calculer stats canaux depuis interactions de tous les contacts
      const channelStats: Record<string, { total: number; replied: number }> = {}
      for (const contact of contacts) {
        // Charger interactions du contact
        const res = await fetch(`/api/nurturing/interactions?prospect_id=${contact.id}`)
        const json = await res.json()
        if (json.data) {
          for (const i of json.data) {
            if (!channelStats[i.type]) channelStats[i.type] = { total: 0, replied: 0 }
            channelStats[i.type].total++
            if (i.is_honored) channelStats[i.type].replied++
          }
        }
      }

      const channelStatsArray = Object.entries(channelStats).map(([channel, stats]) => ({
        channel,
        total: stats.total,
        replied: stats.replied,
        rate: stats.total > 0 ? (stats.replied / stats.total) * 100 : 0,
      }))

      // Générer PDF
      await generateNurturingPDF(kpis, kpisDateRange, topContacts, channelStatsArray)
      showToast('Rapport PDF généré avec succès')
    } catch (e: any) {
      console.error('Export PDF error:', e)
      showToast(e.message || 'Erreur génération PDF', 'error')
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
            onClick={() => {
              const params = new URLSearchParams()
              params.set('format', 'csv')
              if (filterTemp !== 'all') params.set('temp', filterTemp)
              if (searchQuery) params.set('search', searchQuery)
              if (showArchived) params.set('include_archived', 'true')
              window.open(`/api/nurturing/contacts/export?${params.toString()}`, '_blank')
            }}
            style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid rgba(78,205,196,0.25)', cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit', color: V.cyan, background: 'transparent' }}
          >
            📥 Exporter CSV
          </button>
          <button
            onClick={() => setImportOpen(true)}
            style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid rgba(168,139,250,0.25)', cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit', color: V.purple, background: 'transparent' }}
          >
            📤 Importer CSV
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

      {/* Import CSV modal */}
      {importOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => { setImportOpen(false); setCsvFile(null); setCsvParsed([]); setImportResults(null) }}>
          <div style={{ background: V.bgMid, border: `1px solid ${V.line}`, borderRadius: '16px', padding: '28px', width: '700px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '18px', color: V.textHi, marginBottom: '6px', fontFamily: 'Oswald, sans-serif', letterSpacing: '0.5px' }}>Importer des contacts CSV</h3>
            <p style={{ fontSize: '11px', color: V.textMid, marginBottom: '20px' }}>
              Format attendu : Nom, Email, Téléphone, Profession, Entreprise, Ville, Notes, Catégorie
            </p>

            {!csvFile && !importResults && (
              <div>
                <input
                  type="file"
                  accept=".csv"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${V.line}`, background: V.surface2, color: V.text, fontSize: '12px', marginBottom: '12px' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    setCsvFile(file)

                    const reader = new FileReader()
                    reader.onload = (evt) => {
                      const text = evt.target?.result as string
                      const lines = text.split('\n').filter(l => l.trim())
                      if (lines.length === 0) return

                      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
                      const rows = lines.slice(1).map(line => {
                        const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
                        const obj: any = {}
                        headers.forEach((h, i) => {
                          obj[h] = values[i] || ''
                        })
                        return obj
                      })

                      // Mapping automatique des colonnes vers les champs attendus
                      const mapped = rows.map(row => ({
                        full_name: row.Nom || row.nom || row.Name || row.name || row.full_name || '',
                        email: row.Email || row.email || row.mail || '',
                        phone: row.Téléphone || row.Telephone || row.telephone || row.Phone || row.phone || row.Tel || row.tel || '',
                        profession: row.Profession || row.profession || row.Job || row.job || row.Métier || row.metier || '',
                        company: row.Entreprise || row.entreprise || row.Company || row.company || row.Société || row.societe || '',
                        city: row.Ville || row.ville || row.City || row.city || '',
                        notes: row.Notes || row.notes || row.Note || row.note || '',
                        nurturing_category: (() => {
                          const cat = (row.Catégorie || row.Categorie || row.categorie || row.Category || row.category || '').toLowerCase()
                          if (cat.includes('tiède') || cat.includes('tiede') || cat.includes('warm')) return 'prospect_tiede'
                          if (cat.includes('rdv') || cat.includes('meeting')) return 'rdv_fait'
                          if (cat.includes('client') || cat.includes('customer')) return 'client_existant'
                          return 'prospect_froid'
                        })(),
                      }))

                      setCsvParsed(mapped)
                    }
                    reader.readAsText(file)
                  }}
                />
                <p style={{ fontSize: '10px', color: V.textLo }}>Format CSV avec colonnes : Nom, Email, Téléphone, Profession, Entreprise, Ville, Notes, Catégorie</p>
              </div>
            )}

            {csvParsed.length > 0 && !importResults && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: V.gold, marginBottom: '10px' }}>
                  Preview — {csvParsed.length} contacts détectés
                </div>
                <div style={{ maxHeight: '300px', overflowY: 'auto', background: V.surface1, border: `1px solid ${V.line}`, borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                  <table style={{ width: '100%', fontSize: '10px', color: V.text, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${V.line}` }}>
                        <th style={{ textAlign: 'left', padding: '6px', color: V.textMid }}>Nom</th>
                        <th style={{ textAlign: 'left', padding: '6px', color: V.textMid }}>Email</th>
                        <th style={{ textAlign: 'left', padding: '6px', color: V.textMid }}>Téléphone</th>
                        <th style={{ textAlign: 'left', padding: '6px', color: V.textMid }}>Profession</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvParsed.slice(0, 5).map((row, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${V.lineSoft}` }}>
                          <td style={{ padding: '6px', color: V.textHi }}>{row.full_name}</td>
                          <td style={{ padding: '6px', color: V.textMid }}>{row.email}</td>
                          <td style={{ padding: '6px', color: V.textMid }}>{row.phone}</td>
                          <td style={{ padding: '6px', color: V.textMid }}>{row.profession}</td>
                        </tr>
                      ))}
                      {csvParsed.length > 5 && (
                        <tr>
                          <td colSpan={4} style={{ padding: '6px', textAlign: 'center', color: V.textLo, fontSize: '9px' }}>
                            ... et {csvParsed.length - 5} autres
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => { setCsvFile(null); setCsvParsed([]) }}
                    style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid ${V.line}`, background: 'transparent', color: V.text, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Annuler
                  </button>
                  <button
                    disabled={importing}
                    onClick={async () => {
                      setImporting(true)
                      try {
                        const res = await fetch('/api/nurturing/contacts/import', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ contacts: csvParsed }),
                        })
                        const json = await res.json()
                        if (res.ok) {
                          setImportResults(json.data)
                          await loadContacts()
                        } else {
                          showToast(json.error || 'Erreur import', 'error')
                        }
                      } catch (e: any) {
                        showToast(e.message || 'Erreur import', 'error')
                      } finally {
                        setImporting(false)
                      }
                    }}
                    style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: importing ? V.surface3 : 'linear-gradient(135deg, #a78bfa, #818cf8)', color: importing ? V.textLo : '#fff', fontSize: '12px', fontWeight: 600, cursor: importing ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                  >
                    {importing ? 'Import en cours...' : `Importer ${csvParsed.length} contacts`}
                  </button>
                </div>
              </div>
            )}

            {importResults && (
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: V.gold, marginBottom: '12px' }}>
                  Résultat de l&apos;import
                </div>
                <div style={{ background: V.surface1, border: `1px solid ${V.line}`, borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', fontWeight: 700, color: V.textHi }}>{importResults.total}</div>
                      <div style={{ fontSize: '10px', color: V.textMid }}>Total lignes</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', fontWeight: 700, color: V.green }}>{importResults.imported}</div>
                      <div style={{ fontSize: '10px', color: V.textMid }}>Importés</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', fontWeight: 700, color: V.warn }}>{importResults.skipped}</div>
                      <div style={{ fontSize: '10px', color: V.textMid }}>Ignorés</div>
                    </div>
                  </div>
                  {importResults.errors.length > 0 && (
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: V.warn, marginBottom: '8px' }}>
                        Erreurs détectées :
                      </div>
                      <div style={{ maxHeight: '200px', overflowY: 'auto', fontSize: '10px', color: V.textLo }}>
                        {importResults.errors.map((err, i) => (
                          <div key={i} style={{ padding: '4px 0', borderBottom: `1px solid ${V.lineSoft}` }}>
                            <span style={{ color: V.red }}>Ligne {err.row}</span> : {err.error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => { setImportOpen(false); setCsvFile(null); setCsvParsed([]); setImportResults(null) }}
                  style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: V.gold, color: V.bgDeep, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}
                >
                  Fermer
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* KPI DATE RANGE FILTER */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{ fontSize: '11px', color: V.textMid, fontWeight: 600 }}>Période KPIs:</span>
        <input
          type="date"
          value={kpisDateRange.start || ''}
          onChange={e => setKpisDateRange({ ...kpisDateRange, start: e.target.value || null })}
          style={{
            padding: '5px 8px', fontSize: '11px', borderRadius: '6px',
            border: `1px solid ${V.line}`, background: V.surface2, color: V.textHi,
            fontFamily: 'inherit', outline: 'none',
          }}
        />
        <span style={{ fontSize: '11px', color: V.textLo }}>au</span>
        <input
          type="date"
          value={kpisDateRange.end || ''}
          onChange={e => setKpisDateRange({ ...kpisDateRange, end: e.target.value || null })}
          style={{
            padding: '5px 8px', fontSize: '11px', borderRadius: '6px',
            border: `1px solid ${V.line}`, background: V.surface2, color: V.textHi,
            fontFamily: 'inherit', outline: 'none',
          }}
        />
        {(kpisDateRange.start || kpisDateRange.end) && (
          <button
            onClick={() => setKpisDateRange({ start: null, end: null })}
            style={{
              padding: '5px 10px', fontSize: '10px', borderRadius: '6px', cursor: 'pointer',
              border: `1px solid ${V.red}`, background: 'rgba(255,100,112,0.1)', color: V.red, fontWeight: 600,
            }}
          >
            ✕ Tout afficher
          </button>
        )}
        <button
          onClick={handleExportPDF}
          style={{
            padding: '5px 12px', fontSize: '11px', borderRadius: '6px', cursor: 'pointer',
            border: `1px solid ${V.cyan}`, background: 'rgba(78,205,196,0.1)', color: V.cyan, fontWeight: 600,
          }}
        >
          📥 Exporter PDF
        </button>
      </div>

      {/* KPI BAR */}
      {kpis && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: V.surface1, border: `1px solid ${V.line}`,
          borderRadius: '12px', padding: '14px 20px', marginBottom: '16px',
          gap: '12px', flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '100px' }}>
            <span style={{ fontSize: '10px', color: V.textMid }}>Conversion</span>
            <span style={{ fontSize: '18px', fontWeight: 700, color: V.gold }}>{kpis.taux_conversion}%</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '100px' }}>
            <span style={{ fontSize: '10px', color: V.textMid }}>Temps rép. moy.</span>
            <span style={{ fontSize: '18px', fontWeight: 700, color: V.textHi }}>{kpis.temps_moyen_reponse}j</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '100px' }}>
            <span style={{ fontSize: '10px', color: V.textMid }}>Score pression</span>
            <span style={{ fontSize: '18px', fontWeight: 700, color: kpis.score_global > 5 ? V.red : kpis.score_global >= 3 ? V.warn : V.green }}>{kpis.score_global}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '100px' }}>
            <span style={{ fontSize: '10px', color: V.textMid }}>Contacts actifs</span>
            <span style={{ fontSize: '18px', fontWeight: 700, color: V.textHi }}>{kpis.contacts_actifs}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '100px' }}>
            <span style={{ fontSize: '10px', color: V.textMid }}>Relances /7j</span>
            <span style={{ fontSize: '18px', fontWeight: 700, color: V.textHi }}>{kpis.relances_semaine}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '100px' }}>
            <span style={{ fontSize: '10px', color: V.textMid }}>Taux réponse</span>
            <span style={{ fontSize: '18px', fontWeight: 700, color: V.gold }}>{kpis.taux_reponse}%</span>
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
          historyTypeFilters={historyTypeFilters}
          onSetHistoryTypeFilters={setHistoryTypeFilters}
          historyDateRange={historyDateRange}
          onSetHistoryDateRange={setHistoryDateRange}
          sequenceInstanceId={sequenceInstanceId}
          sequenceStatus={sequenceStatus}
          onPauseSequence={handlePauseSequence}
          onResumeSequence={handleResumeSequence}
          onStopSequence={handleStopSequence}
          onDuplicateTemplate={handleDuplicateTemplate}
          onEditTemplate={handleEditTemplate}
          onSaveEditedTemplate={handleSaveEditedTemplate}
          availableThemes={availableThemes}
          selectedThemeIds={selectedThemeIds}
          onSetSelectedThemeIds={setSelectedThemeIds}
          onSaveProspectThemes={saveProspectThemes}
        />
      </div>
    </div>
  )
}
