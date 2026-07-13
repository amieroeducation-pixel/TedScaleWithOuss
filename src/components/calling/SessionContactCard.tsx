'use client'

import { useState, useEffect } from 'react'
import { C } from '@/lib/theme'
import { type SessionContact } from './SessionContactList'

type Objection = { id: string; question: string; reponse: string; ordre: number }

type Props = {
  contact: SessionContact
  script: string
  objections: Objection[]
  onUpdate: (contactId: string, patch: Partial<SessionContact>) => Promise<void>
  onPrev: () => void
  onNext: () => void
  hasPrev: boolean
  hasNext: boolean
}

const STATUTS: Array<{ key: SessionContact['statut_appel']; label: string; color: string; bg: string }> = [
  { key: 'a_appeler',     label: 'À appeler',     color: C.textMid,  bg: C.surface2 },
  { key: 'contacte',      label: 'Contacté',      color: C.indigo,   bg: `${C.indigo}15` },
  { key: 'pas_repondu',   label: 'Pas répondu',   color: C.gold,     bg: '#1a1400' },
  { key: 'chaud',         label: '🔥 Chaud',      color: C.green,    bg: '#0a1f0a' },
  { key: 'pas_interesse', label: 'Pas intéressé', color: '#ff6470',  bg: '#1a0d0d' },
]

export default function SessionContactCard({ contact, script, objections, onUpdate, onPrev, onNext, hasPrev, hasNext }: Props) {
  const [note, setNote] = useState(contact.note ?? '')
  const [rappelDate, setRappelDate] = useState(contact.rappel_date?.split('T')[0] ?? '')
  const [scriptOpen, setScriptOpen] = useState(true)
  const [objectionsOpen, setObjectionsOpen] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setNote(contact.note ?? '')
    setRappelDate(contact.rappel_date?.split('T')[0] ?? '')
  }, [contact.id, contact.note, contact.rappel_date])

  async function setStatut(statut_appel: SessionContact['statut_appel']) {
    setSaving(true)
    await onUpdate(contact.id, {
      statut_appel,
      called_at: new Date().toISOString(),
    })
    setSaving(false)
  }

  async function saveNote() {
    await onUpdate(contact.id, {
      note,
      rappel_date: rappelDate ? new Date(rappelDate).toISOString() : null,
    })
  }

  async function addToCRM() {
    await onUpdate(contact.id, { added_to_crm: true })
    await fetch('/api/prospects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: contact.nom,
        company: contact.entreprise,
        profession: contact.metier,
        city: contact.ville,
        phone: contact.telephone,
        email: contact.email ?? '',
        source: 'tns',
        notes: note,
      }),
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 10 }}>
      {/* En-tête contact */}
      <div style={{ background: C.surface2, borderRadius: 8, padding: 12, border: `1px solid ${C.lineSoft}` }}>
        <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 14, fontWeight: 600, color: C.textHi, marginBottom: 2 }}>{contact.nom}</div>
        {contact.entreprise !== contact.nom && (
          <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textMid, marginBottom: 2 }}>{contact.entreprise}</div>
        )}
        <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo }}>{contact.metier} · {contact.ville}</div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
          <a
            href={`tel:${contact.telephone}`}
            style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 13, fontWeight: 700, color: C.green, textDecoration: 'none', padding: '5px 12px', background: '#0a1f0a', borderRadius: 6, border: `1px solid ${C.green}40` }}
          >
            📞 {contact.telephone}
          </a>
          <a
            href={`https://www.google.com/search?q=${encodeURIComponent(contact.nom + ' ' + (contact.metier || '') + ' ' + (contact.ville || ''))}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.indigo, textDecoration: 'none', padding: '4px 8px', background: `${C.indigo}15`, borderRadius: 5, border: `1px solid ${C.indigo}30` }}
          >
            🔍 Vérifier Google
          </a>
        </div>
      </div>

      {/* Statuts */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const }}>
        {STATUTS.map(s => (
          <button
            key={s.key}
            onClick={() => setStatut(s.key)}
            disabled={saving}
            style={{
              fontFamily: 'JetBrains Mono,monospace', fontSize: 8, padding: '5px 10px', borderRadius: 6,
              background: contact.statut_appel === s.key ? s.bg : C.surface1,
              color: contact.statut_appel === s.key ? s.color : C.textLo,
              border: `1px solid ${contact.statut_appel === s.key ? s.color + '60' : C.lineSoft}`,
              cursor: saving ? 'not-allowed' : 'pointer', fontWeight: contact.statut_appel === s.key ? 600 : 400,
            }}
          >{s.label}</button>
        ))}
      </div>

      {/* Note + rappel */}
      <div style={{ background: C.surface1, borderRadius: 8, padding: 10, border: `1px solid ${C.lineSoft}` }}>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          onBlur={saveNote}
          placeholder="Notes sur l'appel..."
          rows={2}
          style={{ width: '100%', background: 'transparent', border: 'none', color: C.textMid, fontSize: 9, fontFamily: 'JetBrains Mono,monospace', resize: 'none', outline: 'none', boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
          <input
            type="date"
            value={rappelDate}
            onChange={e => setRappelDate(e.target.value)}
            onBlur={saveNote}
            style={{ flex: 1, padding: '4px 8px', background: C.surface2, border: `1px solid ${C.lineSoft}`, borderRadius: 5, color: C.textMid, fontSize: 8, fontFamily: 'JetBrains Mono,monospace' }}
          />
          <button
            onClick={addToCRM}
            disabled={contact.added_to_crm}
            style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, padding: '4px 10px', borderRadius: 5, background: contact.added_to_crm ? '#0a1f0a' : C.surface2, border: `1px solid ${contact.added_to_crm ? C.green + '40' : C.lineSoft}`, color: contact.added_to_crm ? C.green : C.textLo, cursor: contact.added_to_crm ? 'default' : 'pointer' }}
          >
            {contact.added_to_crm ? '✓ Dans le CRM' : '+ Ajouter au CRM'}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onPrev} disabled={!hasPrev} style={{ flex: 1, padding: '7px 0', borderRadius: 6, background: C.surface1, border: `1px solid ${C.lineSoft}`, color: hasPrev ? C.textMid : C.textVlo, fontFamily: 'Oswald,sans-serif', fontSize: 10, cursor: hasPrev ? 'pointer' : 'not-allowed' }}>
          ← Précédent
        </button>
        <button onClick={onNext} disabled={!hasNext} style={{ flex: 1, padding: '7px 0', borderRadius: 6, background: hasNext ? '#0a1f0a' : C.surface1, border: `1px solid ${hasNext ? C.green + '40' : C.lineSoft}`, color: hasNext ? C.green : C.textVlo, fontFamily: 'Oswald,sans-serif', fontSize: 10, fontWeight: hasNext ? 600 : 400, cursor: hasNext ? 'pointer' : 'not-allowed' }}>
          Suivant →
        </button>
      </div>

      {/* Script accordéon */}
      <div style={{ background: C.surface1, borderRadius: 8, border: `1px solid ${C.lineSoft}`, overflow: 'hidden' }}>
        <button
          onClick={() => setScriptOpen(o => !o)}
          style={{ width: '100%', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: C.textHi }}
        >
          <span style={{ fontFamily: 'Oswald,sans-serif', fontSize: 10, fontWeight: 600 }}>📋 SCRIPT</span>
          <span style={{ fontSize: 10, color: C.textLo }}>{scriptOpen ? '▼' : '▶'}</span>
        </button>
        {scriptOpen && (
          <div style={{ padding: '10px 12px 12px', fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textMid, lineHeight: 1.7, whiteSpace: 'pre-wrap', borderTop: `1px solid ${C.lineSoft}` }}>
            {script || 'Aucun script — créez-en un dans les Paramètres.'}
          </div>
        )}
      </div>

      {/* Objections accordéon */}
      <div style={{ background: C.surface1, borderRadius: 8, border: `1px solid ${C.lineSoft}`, overflow: 'hidden' }}>
        <button
          onClick={() => setObjectionsOpen(o => !o)}
          style={{ width: '100%', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: C.textHi }}
        >
          <span style={{ fontFamily: 'Oswald,sans-serif', fontSize: 10, fontWeight: 600 }}>❓ OBJECTIONS ({objections.length})</span>
          <span style={{ fontSize: 10, color: C.textLo }}>{objectionsOpen ? '▼' : '▶'}</span>
        </button>
        {objectionsOpen && (
          <div style={{ borderTop: `1px solid ${C.lineSoft}`, padding: '8px 12px 12px' }}>
            {objections.length === 0 ? (
              <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, fontStyle: 'italic', textAlign: 'center', padding: '8px 0' }}>
                Aucune objection configurée — rendez-vous dans{' '}
                <a href="/settings" style={{ color: C.cyan, textDecoration: 'none' }}>Paramètres › Scripts</a>.
              </div>
            ) : objections.map(o => (
              <div key={o.id} style={{ marginBottom: 8, background: C.bgMid, borderRadius: 6, padding: '7px 10px' }}>
                <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.cyan, fontWeight: 600, marginBottom: 3 }}>❓ {o.question}</div>
                <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textMid, lineHeight: 1.5 }}>💬 {o.reponse}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
