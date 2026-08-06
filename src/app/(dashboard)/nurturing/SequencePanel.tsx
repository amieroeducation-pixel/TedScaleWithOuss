'use client'

import { Contact, Channel, SequenceStep, V, formatRelativeDate } from './nurturing-types'

interface SequencePanelProps {
  selectedContact: Contact
  sequenceSteps: SequenceStep[]
  sequencePanelOpen: boolean
  sequencePanelView: 'list' | 'create' | 'detail'
  sequenceTemplates: { id: string; name: string; description: string }[]
  seedImporting: boolean
  detailTemplateId: string | null
  detailSteps: Array<{ id: string; step_order: number; channel: string; delay_days: number; message_template: string }>
  detailLoading: boolean
  newSequence: { name: string; description: string; steps: { channel: string; delay_days: number; message_template: string }[] }
  onOpenSequencePanel: () => void
  onSetSequencePanelView: (v: 'list' | 'create' | 'detail') => void
  onSetSequencePanelOpen: (v: boolean) => void
  onAssignSequence: (templateId: string) => void
  onCreateSequence: (assignNow: boolean) => void
  onLoadTemplateDetail: (templateId: string) => void
  onSetNewSequence: (v: any) => void
  onOpenWhatsApp: (phone: string, text: string) => void
  onLogInteraction: (type: string) => void
  onSetSelectedChannel: (ch: Channel) => void
  onSetScheduleOpen: (v: boolean) => void
  contacts: Contact[]
  selectedContactIdx: number
  showToast: (msg: string, type?: 'success' | 'error') => void
  onLoadContactDetails: (id: string) => void
}

export default function SequencePanel({
  selectedContact, sequenceSteps, sequencePanelOpen, sequencePanelView,
  sequenceTemplates, seedImporting, detailTemplateId, detailSteps,
  detailLoading, newSequence,
  onOpenSequencePanel, onSetSequencePanelView, onSetSequencePanelOpen,
  onAssignSequence, onCreateSequence, onLoadTemplateDetail, onSetNewSequence,
  onOpenWhatsApp, onLogInteraction, onSetSelectedChannel, onSetScheduleOpen,
  contacts, selectedContactIdx, showToast, onLoadContactDetails,
}: SequencePanelProps) {

  if (sequenceSteps.length > 0) {
    return (
      <div style={{ background: V.surface1, border: `1px solid ${V.line}`, borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(76,175,80,0.12)', color: V.green, fontWeight: 600 }}>▶ Séquence active</span>
            <span style={{ fontSize: '10px', color: V.textLo }}>
              Étape {sequenceSteps.filter(s => s.status === 'sent' || s.status === 'skipped').length + 1}/{sequenceSteps.length}
            </span>
          </div>
          <button onClick={() => { onSetSequencePanelOpen(true); onSetSequencePanelView('list') }} style={{ padding: '4px 8px', fontSize: '10px', borderRadius: '5px', border: `1px solid ${V.line}`, background: 'transparent', color: V.textMid, cursor: 'pointer' }}>Modifier séquence</button>
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
                          onLogInteraction('appel')
                        } else if (step.channel === 'whatsapp') {
                          if (contact.phone) onOpenWhatsApp(contact.phone, '')
                        } else if (step.channel === 'email') {
                          onSetSelectedChannel('email')
                          showToast('Composez et envoyez le message ci-dessous')
                          return
                        }
                        await fetch('/api/cron/sequences-process', { headers: { 'x-cron-secret': '' } })
                        showToast('Étape exécutée')
                        onLoadContactDetails(contact.id)
                      }} style={{ padding: '4px 10px', fontSize: '10px', borderRadius: '5px', border: 'none', background: V.gold, color: V.bgDeep, fontWeight: 600, cursor: 'pointer' }}>{channelIcon} Exécuter maintenant</button>
                      <button onClick={async () => { const contact = contacts[selectedContactIdx]; if (!contact) return; const d = new Date(); d.setDate(d.getDate() + 2); await fetch('/api/nurturing/contact-config', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prospect_id: contact.id, next_action_date: d.toISOString().split('T')[0] }) }); showToast('Reporté de 2 jours') }} style={{ padding: '4px 10px', fontSize: '10px', borderRadius: '5px', border: `1px solid ${V.line}`, background: 'transparent', color: V.textMid, cursor: 'pointer' }}>Reporter +2j</button>
                      <button onClick={() => { onSetSelectedChannel('whatsapp'); showToast('Canal changé — compose en WhatsApp') }} style={{ padding: '4px 10px', fontSize: '10px', borderRadius: '5px', border: `1px solid ${V.line}`, background: 'transparent', color: V.textMid, cursor: 'pointer' }}>Changer canal</button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <button onClick={() => { onSetScheduleOpen(true); showToast('Planifiez la prochaine étape ci-dessous') }} style={{ marginTop: '10px', padding: '5px 10px', fontSize: '10px', borderRadius: '6px', border: `1px dashed ${V.line}`, background: 'transparent', color: V.textLo, cursor: 'pointer', width: '100%' }}>+ Ajouter une étape à la séquence</button>
      </div>
    )
  }

  return (
    <div style={{ background: V.surface1, border: `1px dashed ${V.line}`, borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
      <div style={{ textAlign: 'center', marginBottom: sequencePanelOpen ? '12px' : '0' }}>
        <div style={{ fontSize: '11px', color: V.textLo, marginBottom: '8px' }}>Aucune séquence active</div>
        <button onClick={onOpenSequencePanel} style={{ padding: '6px 14px', fontSize: '11px', borderRadius: '6px', border: `1px solid ${V.gold}`, background: 'rgba(232,200,120,0.08)', color: V.gold, cursor: 'pointer', fontWeight: 600 }}>
          {seedImporting ? '⏳ Import...' : sequencePanelOpen ? '✕ Fermer' : '⚡ Lancer une séquence'}
        </button>
      </div>

      {sequencePanelOpen && sequencePanelView === 'list' && (
        <div style={{ borderTop: `1px solid ${V.line}`, paddingTop: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: V.gold }}>Séquences disponibles ({sequenceTemplates.length})</div>
          </div>

          {sequenceTemplates.length === 0 && !seedImporting ? (
            <div style={{ padding: '12px', textAlign: 'center', color: V.textLo, fontSize: '11px' }}>
              Aucune séquence — créez-en une ci-dessous
            </div>
          ) : seedImporting ? (
            <div style={{ padding: '16px', textAlign: 'center', color: V.gold, fontSize: '11px' }}>
              ⏳ Import des séquences en cours...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px', maxHeight: '240px', overflowY: 'auto' }}>
              {sequenceTemplates.map(tpl => (
                <div
                  key={tpl.id}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '8px', border: `1px solid ${V.line}`, background: V.surface2 }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = V.gold }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = V.line }}
                >
                  <span style={{ fontSize: '14px' }}>⚡</span>
                  <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => { onAssignSequence(tpl.id); onSetSequencePanelOpen(false) }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: V.textHi }}>{tpl.name}</div>
                    <div style={{ fontSize: '10px', color: V.textMid }}>{tpl.description || 'Séquence multicanale'}</div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onLoadTemplateDetail(tpl.id) }}
                    style={{ padding: '3px 8px', fontSize: '9px', borderRadius: '4px', border: `1px solid ${V.line}`, background: 'transparent', color: V.textMid, cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    ⚙️ Voir
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => onSetSequencePanelView('create')}
            style={{ width: '100%', padding: '7px 12px', borderRadius: '6px', border: `1px solid ${V.gold}`, background: 'rgba(232,200,120,0.08)', color: V.gold, fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
          >
            + Nouvelle séquence
          </button>
        </div>
      )}

      {sequencePanelOpen && sequencePanelView === 'detail' && detailTemplateId && (
        <div style={{ borderTop: `1px solid ${V.line}`, paddingTop: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <button onClick={() => onSetSequencePanelView('list')} style={{ border: 'none', background: 'transparent', color: V.textMid, cursor: 'pointer', fontSize: '11px' }}>← Retour à la liste</button>
            <div style={{ fontSize: '11px', fontWeight: 600, color: V.gold }}>
              {sequenceTemplates.find(t => t.id === detailTemplateId)?.name}
            </div>
          </div>

          {detailLoading ? (
            <div style={{ padding: '16px', textAlign: 'center', color: V.textLo, fontSize: '11px' }}>Chargement...</div>
          ) : detailSteps.length === 0 ? (
            <div style={{ padding: '12px', textAlign: 'center', color: V.textLo, fontSize: '11px' }}>Aucune étape configurée</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
              {detailSteps.map((step) => {
                const channelLabel = ({ email: '✉️ Email', whatsapp: '💬 WhatsApp', sms: '📱 SMS', call_reminder: '📞 Appel', linkedin: '🔗 LinkedIn' } as Record<string, string>)[step.channel] || step.channel
                return (
                  <div key={step.id} style={{ padding: '10px', borderRadius: '8px', background: V.surface2, border: `1px solid ${V.line}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 600, color: V.textHi }}>Étape {step.step_order} — {channelLabel}</span>
                      <span style={{ fontSize: '9px', color: V.textLo }}>J+{step.delay_days}</span>
                    </div>
                    <div style={{ fontSize: '10px', color: V.textMid, lineHeight: '1.5', whiteSpace: 'pre-wrap', maxHeight: '80px', overflowY: 'auto' }}>
                      {step.message_template ? step.message_template.slice(0, 200) + (step.message_template.length > 200 ? '...' : '') : '(pas de message)'}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
            <button
              onClick={() => { onAssignSequence(detailTemplateId); onSetSequencePanelOpen(false) }}
              style={{ flex: 1, padding: '7px 12px', borderRadius: '6px', border: 'none', background: V.gold, color: V.bgDeep, fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
            >
              ▶ Lancer cette séquence
            </button>
          </div>
        </div>
      )}

      {sequencePanelOpen && sequencePanelView === 'create' && (
        <div style={{ borderTop: `1px solid ${V.line}`, paddingTop: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <button onClick={() => onSetSequencePanelView('list')} style={{ border: 'none', background: 'transparent', color: V.textMid, cursor: 'pointer', fontSize: '11px' }}>← Retour</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input
              value={newSequence.name}
              onChange={e => onSetNewSequence({ ...newSequence, name: e.target.value })}
              placeholder="Nom de la séquence *"
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: `1px solid ${V.line}`, background: V.surface2, color: V.textHi, fontSize: '11px', fontFamily: 'inherit', outline: 'none' }}
            />
            <input
              value={newSequence.description}
              onChange={e => onSetNewSequence({ ...newSequence, description: e.target.value })}
              placeholder="Description (optionnel)"
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: `1px solid ${V.line}`, background: V.surface2, color: V.textHi, fontSize: '11px', fontFamily: 'inherit', outline: 'none' }}
            />

            <div style={{ borderTop: `1px solid ${V.line}`, paddingTop: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ fontSize: '10px', color: V.textMid, textTransform: 'uppercase' }}>Étapes ({newSequence.steps.length})</div>
                <button
                  onClick={() => onSetNewSequence({ ...newSequence, steps: [...newSequence.steps, { channel: 'email', delay_days: newSequence.steps.length, message_template: '' }] })}
                  style={{ padding: '3px 8px', fontSize: '9px', borderRadius: '4px', border: `1px solid ${V.gold}`, background: 'rgba(232,200,120,0.08)', color: V.gold, cursor: 'pointer', fontWeight: 600 }}
                >
                  + Étape
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {newSequence.steps.map((step, idx) => (
                  <div key={idx} style={{ padding: '8px', borderRadius: '6px', background: V.surface2, border: `1px solid ${V.line}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <div style={{ fontSize: '10px', fontWeight: 600, color: V.textHi }}>Étape {idx + 1}</div>
                      {newSequence.steps.length > 1 && (
                        <button onClick={() => onSetNewSequence({ ...newSequence, steps: newSequence.steps.filter((_: any, i: number) => i !== idx) })} style={{ padding: '2px 6px', fontSize: '9px', borderRadius: '3px', border: `1px solid ${V.line}`, background: 'transparent', color: V.red, cursor: 'pointer' }}>×</button>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px', gap: '4px', marginBottom: '4px' }}>
                      <select
                        value={step.channel}
                        onChange={e => { const u = [...newSequence.steps]; u[idx] = { ...u[idx], channel: e.target.value }; onSetNewSequence({ ...newSequence, steps: u }) }}
                        style={{ padding: '4px 6px', borderRadius: '4px', border: `1px solid ${V.line}`, background: V.surface1, color: V.text, fontSize: '10px', fontFamily: 'inherit', outline: 'none' }}
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
                        onChange={e => { const u = [...newSequence.steps]; u[idx] = { ...u[idx], delay_days: parseInt(e.target.value) || 0 }; onSetNewSequence({ ...newSequence, steps: u }) }}
                        placeholder="J+"
                        style={{ padding: '4px 6px', borderRadius: '4px', border: `1px solid ${V.line}`, background: V.surface1, color: V.text, fontSize: '10px', fontFamily: 'inherit', outline: 'none', textAlign: 'center' }}
                      />
                    </div>
                    <textarea
                      value={step.message_template}
                      onChange={e => { const u = [...newSequence.steps]; u[idx] = { ...u[idx], message_template: e.target.value }; onSetNewSequence({ ...newSequence, steps: u }) }}
                      placeholder="Message avec {{prenom}}, {{nom}}..."
                      style={{ width: '100%', minHeight: '40px', padding: '5px 7px', borderRadius: '4px', border: `1px solid ${V.line}`, background: V.surface1, color: V.textHi, fontSize: '10px', fontFamily: 'inherit', resize: 'vertical', lineHeight: '1.4', outline: 'none' }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
              <button onClick={() => onCreateSequence(true)} style={{ flex: 1, padding: '7px 12px', borderRadius: '6px', border: 'none', background: V.gold, color: V.bgDeep, fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>
                Créer et assigner
              </button>
              <button onClick={() => onCreateSequence(false)} style={{ padding: '7px 12px', borderRadius: '6px', border: `1px solid ${V.line}`, background: 'transparent', color: V.text, fontSize: '10px', cursor: 'pointer' }}>
                Créer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
