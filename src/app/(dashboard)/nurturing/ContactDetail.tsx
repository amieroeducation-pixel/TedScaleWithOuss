'use client'

import { useState } from 'react'
import * as Tooltip from '@radix-ui/react-tooltip'
import {
  Contact, Interaction, ContactConfig, PressureData, DetailTab, Channel,
  SequenceStep, UpcomingAction, V, tempColors, channelToIcon,
  interactionTypeToIcon, formatRelativeDate,
} from './nurturing-types'
import MessageComposer from './MessageComposer'
import SequencePanel from './SequencePanel'

interface ContactDetailProps {
  selectedContact: Contact | null
  detailTab: DetailTab
  interactions: Interaction[]
  pressure: PressureData
  contactConfig: ContactConfig
  sequenceSteps: SequenceStep[]
  sequenceLoading: boolean
  upcomingActions: UpcomingAction[]
  selectedChannel: Channel
  showTips: boolean
  messageText: string
  messageSubject: string
  sending: boolean
  attachedDoc: any
  libraryOpen: boolean
  documents: any[]
  messages: any[]
  scheduleOpen: boolean
  scheduleDate: string
  scheduleTime: string
  sequencePanelOpen: boolean
  sequencePanelView: 'list' | 'create' | 'detail'
  sequenceTemplates: { id: string; name: string; description: string }[]
  seedImporting: boolean
  detailTemplateId: string | null
  detailSteps: Array<{ id: string; step_order: number; channel: string; delay_days: number; message_template: string }>
  detailLoading: boolean
  newSequence: { name: string; description: string; steps: { channel: string; delay_days: number; message_template: string }[] }
  onSetDetailTab: (tab: DetailTab) => void
  onSetSelectedChannel: (ch: Channel) => void
  onSetShowTips: (v: boolean) => void
  onSetMessageText: (v: string) => void
  onSetMessageSubject: (v: string) => void
  onSendMessage: () => void
  onScheduleMessage: () => void
  onSetAttachedDoc: (doc: any) => void
  onSetLibraryOpen: (v: boolean) => void
  onSetScheduleOpen: (v: boolean) => void
  onSetScheduleDate: (v: string) => void
  onSetScheduleTime: (v: string) => void
  onLogInteraction: (type: string) => void
  onSaveConfig: () => void
  onSetContactConfig: (config: ContactConfig) => void
  onOpenSequencePanel: () => void
  onSetSequencePanelView: (v: 'list' | 'create' | 'detail') => void
  onSetSequencePanelOpen: (v: boolean) => void
  onAssignSequence: (templateId: string) => void
  onCreateSequence: (assignNow: boolean) => void
  onLoadTemplateDetail: (templateId: string) => void
  onSetNewSequence: (v: any) => void
  onOpenWhatsApp: (phone: string, text: string) => void
  onSelectTemplate: (msg: any) => void
  contacts: Contact[]
  selectedContactIdx: number
  showToast: (msg: string, type?: 'success' | 'error') => void
  onLoadContactDetails: (id: string) => void
  onLoadUpcomingActions: (id: string) => void
  onMarkHonored: (interactionId: string) => void
  historyTypeFilters: string[]
  onSetHistoryTypeFilters: (filters: string[]) => void
  historyDateRange: { start: string | null; end: string | null }
  onSetHistoryDateRange: (range: { start: string | null; end: string | null }) => void
  sequenceInstanceId: string | null
  sequenceStatus: 'active' | 'paused' | 'completed' | 'cancelled' | null
  onPauseSequence: () => void
  onResumeSequence: () => void
  onStopSequence: () => void
}

export default function ContactDetail(props: ContactDetailProps) {
  const {
    selectedContact, detailTab, interactions, pressure, contactConfig,
    sequenceSteps, upcomingActions, selectedChannel,
    showTips, messageText, messageSubject, sending, attachedDoc,
    libraryOpen, documents, messages, scheduleOpen, scheduleDate, scheduleTime,
    sequencePanelOpen, sequencePanelView, sequenceTemplates, seedImporting,
    detailTemplateId, detailSteps, detailLoading, newSequence,
    onSetDetailTab, onSetSelectedChannel, onSetShowTips, onSetMessageText,
    onSetMessageSubject, onSendMessage, onScheduleMessage, onSetAttachedDoc,
    onSetLibraryOpen, onSetScheduleOpen, onSetScheduleDate, onSetScheduleTime,
    onLogInteraction, onSaveConfig, onSetContactConfig, onOpenSequencePanel,
    onSetSequencePanelView, onSetSequencePanelOpen, onAssignSequence,
    onCreateSequence, onLoadTemplateDetail, onSetNewSequence,
    onOpenWhatsApp, onSelectTemplate, contacts, selectedContactIdx,
    showToast, onLoadContactDetails, onLoadUpcomingActions, onMarkHonored,
    historyTypeFilters, onSetHistoryTypeFilters,
    historyDateRange, onSetHistoryDateRange,
    sequenceInstanceId, sequenceStatus,
    onPauseSequence, onResumeSequence, onStopSequence,
    availableThemes, selectedThemeIds, onSetSelectedThemeIds, onSaveProspectThemes,
  } = props

  // État local pour l'édition des coordonnées
  const [editedName, setEditedName] = useState(selectedContact?.name || '')
  const [editedEmail, setEditedEmail] = useState(selectedContact?.email || '')
  const [editedPhone, setEditedPhone] = useState(selectedContact?.phone || '')
  const [editedJob, setEditedJob] = useState(selectedContact?.job || '')
  const [savingContact, setSavingContact] = useState(false)

  // Réinitialiser les valeurs quand le contact change
  if (selectedContact && (editedName !== selectedContact.name || editedEmail !== (selectedContact.email || '') || editedPhone !== (selectedContact.phone || '') || editedJob !== selectedContact.job)) {
    setEditedName(selectedContact.name)
    setEditedEmail(selectedContact.email || '')
    setEditedPhone(selectedContact.phone || '')
    setEditedJob(selectedContact.job)
  }

  async function handleSaveContactIdentity() {
    if (!selectedContact) return
    setSavingContact(true)
    try {
      const res = await fetch('/api/nurturing/contacts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospect_id: selectedContact.id,
          full_name: editedName,
          email: editedEmail || null,
          phone: editedPhone || null,
          profession: editedJob || null,
        }),
      })
      if (res.ok) {
        showToast('Contact mis à jour')
        onLoadContactDetails(selectedContact.id)
      } else {
        const json = await res.json()
        showToast(json.error || 'Erreur mise à jour', 'error')
      }
    } catch {
      showToast('Erreur mise à jour', 'error')
    }
    setSavingContact(false)
  }

  const colors = selectedContact ? tempColors[selectedContact.temp] : tempColors.cold

  return (
    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', borderBottom: `1px solid ${V.line}`, paddingBottom: '8px', flexShrink: 0 }}>
        {(['sequence', 'history', 'config'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => onSetDetailTab(tab)}
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

      {/* Prospect header */}
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

      {/* Panel content */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
        {!selectedContact && (
          <div style={{ padding: '40px', textAlign: 'center', color: V.textMid }}>
            Sélectionnez un contact pour voir les détails
          </div>
        )}

        {/* TAB: SEQUENCE & MESSAGES */}
        {selectedContact && detailTab === 'sequence' && (
          <div>
            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
              <Tooltip.Provider>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <div style={{ background: V.surface1, border: `1px solid ${V.line}`, borderRadius: '10px', padding: '10px', textAlign: 'center', cursor: 'help', position: 'relative' }}>
                      {selectedContact.forcedTemperature && (
                        <div style={{ position: 'absolute', top: '4px', right: '4px', fontSize: '10px', opacity: 0.7 }}>🔒</div>
                      )}
                      <div style={{ fontSize: '18px', fontWeight: 700 }}>{selectedContact.icon}</div>
                      <div style={{ fontSize: '9px', color: V.textMid, marginTop: '2px' }}>
                        {selectedContact.temp === 'hot' ? 'Brûlant' : selectedContact.temp === 'warm' ? 'Tiède' : selectedContact.temp === 'cold' ? 'Froid' : 'Enterré'}
                        {selectedContact.forcedTemperature && <span style={{ marginLeft: '3px', opacity: 0.6 }}>(forcé)</span>}
                      </div>
                    </div>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      style={{
                        background: V.surface2,
                        border: `1px solid ${V.line}`,
                        borderRadius: '8px',
                        padding: '10px 12px',
                        fontSize: '11px',
                        color: V.textHi,
                        maxWidth: '250px',
                        lineHeight: '1.5',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                        zIndex: 9999,
                      }}
                      sideOffset={5}
                    >
                      <div style={{ fontWeight: 600, marginBottom: '6px', color: V.gold }}>🔥 Calcul température</div>
                      {selectedContact.forcedTemperature ? (
                        <div style={{ fontSize: '10px', color: V.warn, marginBottom: '6px' }}>
                          🔒 Température forcée manuellement — le calcul automatique est désactivé.
                        </div>
                      ) : (
                        <div style={{ fontSize: '10px', color: V.textMid }}>
                          <div>• +1 point par interaction</div>
                          <div>• +3 points par RDV</div>
                          <div>• -1 point par semaine de silence</div>
                        </div>
                      )}
                      <Tooltip.Arrow style={{ fill: V.surface2 }} />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </Tooltip.Provider>
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
            <SequencePanel
              selectedContact={selectedContact}
              sequenceSteps={sequenceSteps}
              sequencePanelOpen={sequencePanelOpen}
              sequencePanelView={sequencePanelView}
              sequenceTemplates={sequenceTemplates}
              seedImporting={seedImporting}
              detailTemplateId={detailTemplateId}
              detailSteps={detailSteps}
              detailLoading={detailLoading}
              newSequence={newSequence}
              onOpenSequencePanel={onOpenSequencePanel}
              onSetSequencePanelView={onSetSequencePanelView}
              onSetSequencePanelOpen={onSetSequencePanelOpen}
              onAssignSequence={onAssignSequence}
              onCreateSequence={onCreateSequence}
              onLoadTemplateDetail={onLoadTemplateDetail}
              onSetNewSequence={onSetNewSequence}
              onOpenWhatsApp={onOpenWhatsApp}
              onLogInteraction={onLogInteraction}
              onSetSelectedChannel={onSetSelectedChannel}
              onSetScheduleOpen={onSetScheduleOpen}
              contacts={contacts}
              selectedContactIdx={selectedContactIdx}
              showToast={showToast}
              onLoadContactDetails={onLoadContactDetails}
              sequenceInstanceId={sequenceInstanceId}
              sequenceStatus={sequenceStatus}
              onPauseSequence={onPauseSequence}
              onResumeSequence={onResumeSequence}
              onStopSequence={onStopSequence}
            />

            {/* QUICK COMPOSE */}
            <MessageComposer
              selectedContact={selectedContact}
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
              onSetSelectedChannel={onSetSelectedChannel}
              onSetShowTips={onSetShowTips}
              onSetMessageText={onSetMessageText}
              onSetMessageSubject={onSetMessageSubject}
              onSendMessage={onSendMessage}
              onScheduleMessage={onScheduleMessage}
              onSetAttachedDoc={onSetAttachedDoc}
              onSetLibraryOpen={onSetLibraryOpen}
              onSetScheduleOpen={onSetScheduleOpen}
              onSetScheduleDate={onSetScheduleDate}
              onSetScheduleTime={onSetScheduleTime}
              onSelectTemplate={onSelectTemplate}
            />

            {/* PROCHAINES ACTIONS */}
            <div style={{ background: V.surface1, border: `1px solid ${V.line}`, borderRadius: '12px', padding: '14px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: V.textHi, textTransform: 'uppercase', letterSpacing: '0.5px' }}>📅 Prochaines actions planifiées</div>
                <button onClick={() => onSetScheduleOpen(true)} style={{ padding: '3px 8px', fontSize: '10px', borderRadius: '5px', border: `1px solid ${V.line}`, background: 'transparent', color: V.textMid, cursor: 'pointer' }}>+ Planifier</button>
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
                            const channelMap: Record<string, 'call' | 'email' | 'whatsapp' | 'linkedin' | 'sms'> = { email: 'email', whatsapp: 'whatsapp', linkedin: 'linkedin', telephone: 'call', sms: 'sms' }
                            if (channelMap[action.channel]) onSetSelectedChannel(channelMap[action.channel])
                            showToast('Canal sélectionné — composez votre message')
                          } else {
                            await fetch('/api/cron/sequences-process', { headers: { 'x-cron-secret': '' } })
                            showToast('Étape exécutée')
                            onLoadContactDetails(action.prospectId)
                            onLoadUpcomingActions(action.prospectId)
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
            {documents.filter((d: any) => d.already_sent).length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: V.textHi, marginBottom: '8px' }}>📎 Documents envoyés à ce prospect</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {documents.filter((d: any) => d.already_sent).map((doc: any) => (
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

        {/* TAB: HISTORY */}
        {selectedContact && detailTab === 'history' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: V.textHi }}>Historique des interactions</div>
              <span style={{ fontSize: '10px', color: V.textLo }}>{interactions.length} total</span>
            </div>

            {/* FILTRES PAR TYPE ET PÉRIODE */}
            <div style={{ background: V.surface1, border: `1px solid ${V.line}`, borderRadius: '10px', padding: '12px', marginBottom: '16px' }}>
              {/* Filtres par type */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '10px', fontWeight: 600, color: V.textMid, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Filtrer par type</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {['appel', 'email', 'whatsapp', 'rdv1', 'linkedin'].map(type => {
                    const isSelected = historyTypeFilters.includes(type)
                    const typeLabels: Record<string, string> = {
                      appel: '📞 Appel',
                      email: '✉️ Email',
                      whatsapp: '💬 WhatsApp',
                      rdv1: '📅 RDV',
                      linkedin: '🔗 LinkedIn',
                    }
                    return (
                      <button
                        key={type}
                        onClick={() => {
                          if (isSelected) {
                            onSetHistoryTypeFilters(historyTypeFilters.filter(t => t !== type))
                          } else {
                            onSetHistoryTypeFilters([...historyTypeFilters, type])
                          }
                        }}
                        style={{
                          padding: '5px 10px', fontSize: '11px', borderRadius: '6px', cursor: 'pointer',
                          border: isSelected ? `1px solid ${V.gold}` : `1px solid ${V.line}`,
                          background: isSelected ? 'rgba(232,200,120,0.1)' : 'transparent',
                          color: isSelected ? V.gold : V.textMid,
                          fontWeight: isSelected ? 600 : 400,
                        }}
                      >
                        {typeLabels[type] || type}
                      </button>
                    )
                  })}
                  {historyTypeFilters.length > 0 && (
                    <button
                      onClick={() => onSetHistoryTypeFilters([])}
                      style={{
                        padding: '5px 10px', fontSize: '11px', borderRadius: '6px', cursor: 'pointer',
                        border: `1px solid ${V.red}`, background: 'rgba(255,100,112,0.1)', color: V.red, fontWeight: 600,
                      }}
                    >
                      ✕ Réinitialiser
                    </button>
                  )}
                </div>
              </div>

              {/* Filtres par période */}
              <div>
                <div style={{ fontSize: '10px', fontWeight: 600, color: V.textMid, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Filtrer par période</div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div>
                    <label style={{ fontSize: '10px', color: V.textLo, display: 'block', marginBottom: '2px' }}>Du</label>
                    <input
                      type="date"
                      value={historyDateRange.start || ''}
                      onChange={e => onSetHistoryDateRange({ ...historyDateRange, start: e.target.value || null })}
                      style={{
                        padding: '6px 8px', fontSize: '11px', borderRadius: '6px',
                        border: `1px solid ${V.line}`, background: V.surface2, color: V.textHi,
                        fontFamily: 'inherit', outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', color: V.textLo, display: 'block', marginBottom: '2px' }}>Au</label>
                    <input
                      type="date"
                      value={historyDateRange.end || ''}
                      onChange={e => onSetHistoryDateRange({ ...historyDateRange, end: e.target.value || null })}
                      style={{
                        padding: '6px 8px', fontSize: '11px', borderRadius: '6px',
                        border: `1px solid ${V.line}`, background: V.surface2, color: V.textHi,
                        fontFamily: 'inherit', outline: 'none',
                      }}
                    />
                  </div>
                  {(historyDateRange.start || historyDateRange.end) && (
                    <button
                      onClick={() => onSetHistoryDateRange({ start: null, end: null })}
                      style={{
                        padding: '6px 10px', fontSize: '10px', borderRadius: '6px', cursor: 'pointer', marginTop: '16px',
                        border: `1px solid ${V.red}`, background: 'rgba(255,100,112,0.1)', color: V.red, fontWeight: 600,
                      }}
                    >
                      ✕ Effacer
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      if (!selectedContact) return
                      const params = new URLSearchParams()
                      params.set('prospect_id', selectedContact.id)
                      params.set('format', 'csv')
                      if (historyTypeFilters.length > 0) {
                        params.set('types', historyTypeFilters.join(','))
                      }
                      if (historyDateRange.start) params.set('start_date', historyDateRange.start)
                      if (historyDateRange.end) params.set('end_date', historyDateRange.end)
                      window.open(`/api/nurturing/interactions/export?${params.toString()}`, '_blank')
                    }}
                    style={{
                      padding: '6px 12px', fontSize: '11px', borderRadius: '6px', cursor: 'pointer', marginTop: '16px',
                      border: `1px solid ${V.cyan}`, background: 'rgba(78,205,196,0.1)', color: V.cyan, fontWeight: 600,
                    }}
                  >
                    📥 Exporter CSV
                  </button>
                </div>
              </div>
            </div>

            {/* Channel stats */}
            {(() => {
              // Apply filters to interactions
              let filteredInteractions = interactions

              // Filter by type
              if (historyTypeFilters.length > 0) {
                filteredInteractions = filteredInteractions.filter(i => historyTypeFilters.includes(i.channel))
              }

              // Filter by date range
              if (historyDateRange.start || historyDateRange.end) {
                filteredInteractions = filteredInteractions.filter(i => {
                  const iDate = new Date(i.date)
                  const startOk = !historyDateRange.start || iDate >= new Date(historyDateRange.start)
                  const endOk = !historyDateRange.end || iDate <= new Date(historyDateRange.end + 'T23:59:59')
                  return startOk && endOk
                })
              }

              const stats: Record<string, { total: number; replied: number }> = {}
              for (const i of filteredInteractions) {
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
            {(() => {
              // Apply same filters as channel stats
              let filteredInteractions = interactions

              // Filter by type
              if (historyTypeFilters.length > 0) {
                filteredInteractions = filteredInteractions.filter(i => historyTypeFilters.includes(i.channel))
              }

              // Filter by date range
              if (historyDateRange.start || historyDateRange.end) {
                filteredInteractions = filteredInteractions.filter(i => {
                  const iDate = new Date(i.date)
                  const startOk = !historyDateRange.start || iDate >= new Date(historyDateRange.start)
                  const endOk = !historyDateRange.end || iDate <= new Date(historyDateRange.end + 'T23:59:59')
                  return startOk && endOk
                })
              }

              return (
                <div style={{ background: V.surface1, border: `1px solid ${V.line}`, borderRadius: '12px', padding: '14px' }}>
                  {filteredInteractions.length === 0 && (
                    <div style={{ padding: '20px', textAlign: 'center', color: V.textMid }}>
                      {interactions.length === 0 ? 'Aucune interaction enregistrée' : 'Aucune interaction ne correspond aux filtres'}
                    </div>
                  )}
                  {filteredInteractions.map((interaction) => (
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
                  {interaction.status === 'pending' ? (
                    <button
                      onClick={() => onMarkHonored(interaction.id)}
                      title="Marquer comme répondu"
                      style={{ padding: '2px 6px', fontSize: '9px', borderRadius: '4px', border: `1px solid ${V.green}`, background: 'rgba(76,175,80,0.1)', color: V.green, cursor: 'pointer', flexShrink: 0, fontWeight: 600 }}
                    >
                      ✓ Répondu
                    </button>
                  ) : (
                    <span style={{ fontSize: '12px', flexShrink: 0 }}>✅</span>
                  )}
                </div>
                  ))}
                </div>
              )
            })()}

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
                    onClick={() => onLogInteraction(type)}
                    style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '6px', border: `1px solid ${V.line}`, background: 'transparent', color: V.text, cursor: 'pointer' }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB: CONFIG */}
        {selectedContact && detailTab === 'config' && (
          <div>
            {/* Édition identité */}
            <div style={{ background: V.surface1, border: '1px solid rgba(232,200,120,0.2)', borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: V.gold }}>Identité & Coordonnées</div>
                <button
                  onClick={handleSaveContactIdentity}
                  disabled={savingContact}
                  style={{
                    padding: '5px 10px', fontSize: '11px', borderRadius: '6px', border: 'none',
                    background: savingContact ? V.surface3 : V.gold, color: savingContact ? V.textLo : V.bgDeep,
                    cursor: savingContact ? 'not-allowed' : 'pointer', fontWeight: 600,
                  }}
                >
                  {savingContact ? '⏳ Sauvegarde...' : '💾 Sauvegarder'}
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '10px', color: V.textMid, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nom complet</div>
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    style={{ padding: '7px 10px', borderRadius: '8px', border: `1px solid ${V.line}`, background: V.surface2, color: V.textHi, fontSize: '12px', fontFamily: 'inherit', width: '100%', outline: 'none' }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: V.textMid, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Profession</div>
                  <input
                    type="text"
                    value={editedJob}
                    onChange={(e) => setEditedJob(e.target.value)}
                    style={{ padding: '7px 10px', borderRadius: '8px', border: `1px solid ${V.line}`, background: V.surface2, color: V.textHi, fontSize: '12px', fontFamily: 'inherit', width: '100%', outline: 'none' }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: V.textMid, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</div>
                  <input
                    type="email"
                    value={editedEmail}
                    onChange={(e) => setEditedEmail(e.target.value)}
                    placeholder="email@example.com"
                    style={{ padding: '7px 10px', borderRadius: '8px', border: `1px solid ${V.line}`, background: V.surface2, color: V.textHi, fontSize: '12px', fontFamily: 'inherit', width: '100%', outline: 'none' }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: V.textMid, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Téléphone</div>
                  <input
                    type="tel"
                    value={editedPhone}
                    onChange={(e) => setEditedPhone(e.target.value)}
                    placeholder="+33 6 12 34 56 78"
                    style={{ padding: '7px 10px', borderRadius: '8px', border: `1px solid ${V.line}`, background: V.surface2, color: V.textHi, fontSize: '12px', fontFamily: 'inherit', width: '100%', outline: 'none' }}
                  />
                </div>
              </div>
            </div>

            {/* Configuration nurturing */}
            <div style={{ background: V.surface1, border: '1px solid rgba(232,200,120,0.2)', borderRadius: '12px', padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: V.gold }}>Configuration nurturing</div>
                <button
                  onClick={onSaveConfig}
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
                    onChange={(e) => onSetContactConfig({ ...contactConfig, preferred_channel: e.target.value || null })}
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
                    onChange={(e) => onSetContactConfig({ ...contactConfig, contact_frequency_days: parseInt(e.target.value) })}
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
                    onChange={(e) => onSetContactConfig({ ...contactConfig, preferred_time_slot: e.target.value || null })}
                    style={{ padding: '7px 10px', borderRadius: '8px', border: `1px solid ${V.line}`, background: V.surface2, color: V.text, fontSize: '12px', fontFamily: 'inherit', width: '100%', outline: 'none' }}
                  >
                    <option value="">Non défini</option>
                    <option value="matin">Matin (8h-12h)</option>
                    <option value="apres-midi">Après-midi (14h-18h)</option>
                    <option value="soir">Soir (18h-20h)</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: V.textMid, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Timezone</div>
                  <select
                    value={contactConfig.timezone || 'Europe/Paris'}
                    onChange={(e) => onSetContactConfig({ ...contactConfig, timezone: e.target.value })}
                    style={{ padding: '7px 10px', borderRadius: '8px', border: `1px solid ${V.line}`, background: V.surface2, color: V.text, fontSize: '12px', fontFamily: 'inherit', width: '100%', outline: 'none' }}
                  >
                    <option value="Europe/Paris">🇫🇷 Paris (UTC+1/+2)</option>
                    <option value="America/New_York">🇺🇸 New York (UTC-5/-4)</option>
                    <option value="America/Los_Angeles">🇺🇸 Los Angeles (UTC-8/-7)</option>
                    <option value="Europe/London">🇬🇧 Londres (UTC+0/+1)</option>
                    <option value="Asia/Dubai">🇦🇪 Dubaï (UTC+4)</option>
                    <option value="Asia/Tokyo">🇯🇵 Tokyo (UTC+9)</option>
                    <option value="Australia/Sydney">🇦🇺 Sydney (UTC+10/+11)</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: V.textMid, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Forcer température</div>
                  <select
                    value={contactConfig.forced_temperature || ''}
                    onChange={(e) => onSetContactConfig({ ...contactConfig, forced_temperature: e.target.value || null })}
                    style={{ padding: '7px 10px', borderRadius: '8px', border: `1px solid ${V.line}`, background: V.surface2, color: V.text, fontSize: '12px', fontFamily: 'inherit', width: '100%', outline: 'none' }}
                  >
                    <option value="">⚙️ Auto (calcul normal)</option>
                    <option value="hot">🔥 Forcer Chaud</option>
                    <option value="warm">⚡ Forcer Tiède</option>
                    <option value="cold">❄️ Forcer Froid</option>
                    <option value="dead">💀 Forcer Dead</option>
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
                            onSetContactConfig({
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ fontSize: '10px', color: V.textMid, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Thèmes de prospection</div>
                    <button
                      onClick={async () => {
                        if (selectedContact) {
                          await onSaveProspectThemes(selectedContact.id, selectedThemeIds)
                        }
                      }}
                      style={{ padding: '3px 8px', fontSize: '10px', borderRadius: '5px', border: `1px solid ${V.gold}`, background: 'rgba(232,200,120,0.1)', color: V.gold, cursor: 'pointer', fontWeight: 600 }}
                    >
                      💾 Sauvegarder thèmes
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                    {availableThemes.map(theme => {
                      const isSelected = selectedThemeIds.includes(theme.id)
                      return (
                        <button
                          key={theme.id}
                          onClick={() => {
                            if (isSelected) {
                              onSetSelectedThemeIds(selectedThemeIds.filter(id => id !== theme.id))
                            } else {
                              onSetSelectedThemeIds([...selectedThemeIds, theme.id])
                            }
                          }}
                          style={{
                            padding: '6px 12px', fontSize: '11px', borderRadius: '8px', cursor: 'pointer',
                            border: isSelected ? `1.5px solid ${theme.color}` : `1px solid ${V.line}`,
                            background: isSelected ? `${theme.color}20` : 'transparent',
                            color: isSelected ? theme.color : V.textMid,
                            fontWeight: isSelected ? 700 : 400,
                            display: 'flex', alignItems: 'center', gap: '6px',
                          }}
                        >
                          <span>{theme.icon}</span>
                          <span>{theme.name}</span>
                          {isSelected && <span style={{ fontSize: '10px' }}>✓</span>}
                        </button>
                      )
                    })}
                    {availableThemes.length === 0 && (
                      <span style={{ fontSize: '11px', color: V.textLo }}>Aucun thème disponible</span>
                    )}
                  </div>
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <div style={{ fontSize: '10px', color: V.textMid, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Notes personnelles</div>
                  <textarea
                    value={contactConfig.notes}
                    onChange={(e) => onSetContactConfig({ ...contactConfig, notes: e.target.value })}
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
  )
}
