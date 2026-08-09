'use client'

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Contact, Channel, NurturingDoc, NurturingMessage, V } from './nurturing-types'
import { interpolateTemplate } from '@/lib/nurturing/template-engine'

interface MessageComposerProps {
  selectedContact: Contact
  selectedChannel: Channel
  showTips: boolean
  messageText: string
  messageSubject: string
  sending: boolean
  attachedDoc: NurturingDoc | null
  libraryOpen: boolean
  documents: NurturingDoc[]
  messages: NurturingMessage[]
  scheduleOpen: boolean
  scheduleDate: string
  scheduleTime: string
  onSetSelectedChannel: (ch: Channel) => void
  onSetShowTips: (v: boolean) => void
  onSetMessageText: (v: string) => void
  onSetMessageSubject: (v: string) => void
  onSendMessage: () => void
  onScheduleMessage: () => void
  onSetAttachedDoc: (doc: NurturingDoc | null) => void
  onSetLibraryOpen: (v: boolean) => void
  onSetScheduleOpen: (v: boolean) => void
  onSetScheduleDate: (v: string) => void
  onSetScheduleTime: (v: string) => void
  onSelectTemplate: (msg: NurturingMessage) => void
}

export default function MessageComposer({
  selectedContact, selectedChannel, showTips, messageText, messageSubject, sending,
  attachedDoc, libraryOpen, documents, messages, scheduleOpen,
  scheduleDate, scheduleTime,
  onSetSelectedChannel, onSetShowTips, onSetMessageText, onSetMessageSubject,
  onSendMessage, onScheduleMessage, onSetAttachedDoc, onSetLibraryOpen,
  onSetScheduleOpen, onSetScheduleDate, onSetScheduleTime, onSelectTemplate,
}: MessageComposerProps) {
  const [previewOpen, setPreviewOpen] = useState(false)

  const channelMessages = messages.filter(m => {
    const map: Record<string, string> = { email: 'email', whatsapp: 'whatsapp', linkedin: 'linkedin', call: 'telephone', sms: 'sms' }
    return m.channel === map[selectedChannel]
  })

  function getInterpolatedMessage(): string {
    if (!messageText.trim()) return ''
    return interpolateTemplate(messageText, {
      full_name: selectedContact.name,
      email: selectedContact.email || null,
      phone: selectedContact.phone || null,
      profession: selectedContact.job,
      city: '', // Pas d'info ville dans Contact type actuel
    })
  }

  function getInterpolatedSubject(): string {
    if (!messageSubject.trim()) return ''
    return interpolateTemplate(messageSubject, {
      full_name: selectedContact.name,
      email: selectedContact.email || null,
      phone: selectedContact.phone || null,
      profession: selectedContact.job,
      city: '',
    })
  }

  return (
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
            onClick={() => { onSetSelectedChannel(ch); onSetShowTips(false) }}
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
          onClick={() => onSetShowTips(!showTips)}
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
                  if (msg) onSelectTemplate(msg)
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
              onChange={(e) => onSetMessageSubject(e.target.value)}
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
            onChange={(e) => onSetMessageText(e.target.value)}
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
              <button onClick={() => onSetAttachedDoc(null)} style={{ border: 'none', background: 'transparent', color: V.red, cursor: 'pointer', fontSize: '14px' }}>×</button>
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
                <button onClick={() => onSetLibraryOpen(false)} style={{ border: 'none', background: 'transparent', color: V.textLo, cursor: 'pointer', fontSize: '16px' }}>×</button>
              </div>
              {documents.length === 0 && (
                <div style={{ padding: '16px', textAlign: 'center', color: V.textLo, fontSize: '12px' }}>
                  Aucun document — uploadez-en un avec le bouton en haut
                </div>
              )}
              {documents.map(doc => (
                <div
                  key={doc.id}
                  onClick={() => { onSetAttachedDoc(doc); onSetLibraryOpen(false) }}
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
                onClick={onSendMessage}
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
                onClick={() => setPreviewOpen(true)}
                disabled={!messageText.trim()}
                style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '6px', border: `1px solid ${V.line}`, background: 'transparent', color: !messageText.trim() ? V.textLo : V.text, cursor: !messageText.trim() ? 'not-allowed' : 'pointer' }}
              >
                👁️ Prévisualiser
              </button>
              <button
                onClick={() => onSetLibraryOpen(!libraryOpen)}
                style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '6px', border: `1px solid ${V.line}`, background: 'transparent', color: V.text, cursor: 'pointer' }}
              >
                📄 Joindre document
              </button>
              <button
                onClick={() => onSetScheduleOpen(!scheduleOpen)}
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
                  onChange={(e) => onSetScheduleDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  style={{ padding: '6px 10px', borderRadius: '6px', border: `1px solid ${V.line}`, background: V.surface2, color: V.text, fontSize: '12px', fontFamily: 'inherit' }}
                />
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => onSetScheduleTime(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: '6px', border: `1px solid ${V.line}`, background: V.surface2, color: V.text, fontSize: '12px', fontFamily: 'inherit' }}
                />
                <button
                  onClick={onScheduleMessage}
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
                  onClick={() => onSetScheduleOpen(false)}
                  style={{ padding: '6px 10px', borderRadius: '6px', border: `1px solid ${V.line}`, background: 'transparent', color: V.textLo, fontSize: '11px', cursor: 'pointer' }}
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Preview Modal */}
      <Dialog.Root open={previewOpen} onOpenChange={setPreviewOpen}>
        <Dialog.Portal>
          <Dialog.Overlay style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100,
            animation: 'fadeIn 150ms ease-out',
          }} />
          <Dialog.Content style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            background: V.bgMid, border: `1px solid ${V.line}`, borderRadius: '16px',
            padding: '24px', maxWidth: '600px', width: '90%', maxHeight: '80vh', overflowY: 'auto',
            zIndex: 101, boxShadow: '0 16px 64px rgba(0,0,0,0.6)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <Dialog.Title style={{ fontSize: '16px', fontWeight: 700, color: V.gold }}>
                👁️ Prévisualisation du message
              </Dialog.Title>
              <Dialog.Close asChild>
                <button style={{ border: 'none', background: 'transparent', color: V.textLo, cursor: 'pointer', fontSize: '20px' }}>×</button>
              </Dialog.Close>
            </div>

            {/* Contact info */}
            <div style={{ marginBottom: '16px', padding: '10px 12px', borderRadius: '8px', background: V.surface1, border: `1px solid ${V.line}` }}>
              <div style={{ fontSize: '11px', color: V.textMid, marginBottom: '4px' }}>Destinataire</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: V.textHi }}>
                {selectedContact.name} {selectedContact.job && `· ${selectedContact.job}`}
              </div>
              {selectedChannel === 'email' && selectedContact.email && (
                <div style={{ fontSize: '11px', color: V.textMid, marginTop: '2px' }}>✉️ {selectedContact.email}</div>
              )}
              {(selectedChannel === 'sms' || selectedChannel === 'whatsapp') && selectedContact.phone && (
                <div style={{ fontSize: '11px', color: V.textMid, marginTop: '2px' }}>📱 {selectedContact.phone}</div>
              )}
            </div>

            {/* Subject (email only) */}
            {selectedChannel === 'email' && messageSubject && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', color: V.textMid, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Objet</div>
                <div style={{ padding: '10px 12px', borderRadius: '8px', background: V.surface1, border: `1px solid ${V.line}`, fontSize: '13px', color: V.textHi, fontWeight: 500 }}>
                  {getInterpolatedSubject()}
                </div>
              </div>
            )}

            {/* Message body */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: V.textMid, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Message</div>
              <div style={{ padding: '14px 16px', borderRadius: '10px', background: V.surface1, border: `1px solid ${V.line}`, fontSize: '13px', color: V.text, lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
                {getInterpolatedMessage()}
              </div>
            </div>

            {/* Attached doc */}
            {attachedDoc && (
              <div style={{ marginBottom: '16px', padding: '10px 12px', borderRadius: '8px', background: 'rgba(76,175,80,0.1)', border: '1px solid rgba(76,175,80,0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>📎</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: V.green }}>{attachedDoc.title}</div>
                  <div style={{ fontSize: '10px', color: V.textMid, marginTop: '2px' }}>{attachedDoc.format}</div>
                </div>
              </div>
            )}

            {/* Info box */}
            <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(100,150,255,0.08)', border: '1px solid rgba(100,150,255,0.2)', fontSize: '11px', color: V.textMid, lineHeight: '1.5' }}>
              💡 Cette prévisualisation montre le message final avec toutes les variables remplacées par les données réelles du contact.
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <Dialog.Close asChild>
                <button style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: V.gold, color: V.bgDeep, fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                  Fermer
                </button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
