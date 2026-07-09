'use client'

import { C } from '@/lib/theme'

export type SessionContact = {
  id: string
  ordre: number
  nom: string
  entreprise: string
  metier: string
  ville: string
  telephone: string
  email: string | null
  adresse: string | null
  siren: string | null
  source: string
  statut_appel: 'a_appeler' | 'contacte' | 'pas_repondu' | 'pas_interesse' | 'chaud'
  note: string | null
  rappel_date: string | null
  added_to_crm: boolean
  called_at: string | null
  script_rating: number | null
  objections_rencontrees: Array<{ id: string; rating: number }> | null
}

const STATUT_CONFIG: Record<SessionContact['statut_appel'], { color: string; emoji: string; label: string }> = {
  a_appeler:      { color: C.textLo,  emoji: '⚪', label: 'À appeler' },
  pas_repondu:    { color: C.gold,    emoji: '🟡', label: 'Pas répondu' },
  chaud:          { color: C.green,   emoji: '🟢', label: 'Chaud' },
  contacte:       { color: C.indigo,  emoji: '🔵', label: 'Contacté' },
  pas_interesse:  { color: '#ff6470', emoji: '🔴', label: 'Pas intéressé' },
}

type Props = {
  contacts: SessionContact[]
  activeId: string | null
  onSelect: (contact: SessionContact) => void
}

export default function SessionContactList({ contacts, activeId, onSelect }: Props) {
  const groupes = {
    a_appeler: contacts.filter(c => c.statut_appel === 'a_appeler'),
    autres:    contacts.filter(c => c.statut_appel !== 'a_appeler'),
  }

  const renderContact = (c: SessionContact) => {
    const cfg = STATUT_CONFIG[c.statut_appel]
    const isActive = c.id === activeId
    const initials = c.nom.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '??'

    return (
      <div
        key={c.id}
        onClick={() => onSelect(c)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
          background: isActive ? `${C.indigo}20` : C.surface2,
          border: `1px solid ${isActive ? C.indigo + '60' : C.lineSoft}`,
          borderRadius: 7, cursor: 'pointer', marginBottom: 3,
          transition: 'background 0.15s',
        }}
      >
        <div style={{ width: 28, height: 28, borderRadius: 7, background: C.surface3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Oswald,sans-serif', fontSize: 9, fontWeight: 700, color: isActive ? C.indigo : C.textMid, flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 10, color: C.textHi, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nom}</div>
          <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7.5, color: C.textLo }}>{c.telephone} · {c.ville}</div>
        </div>
        <span style={{ fontSize: 12, flexShrink: 0 }}>{cfg.emoji}</span>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', paddingRight: 4 }}>
      {groupes.a_appeler.length > 0 && (
        <>
          <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7, color: C.textVlo, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 5, paddingLeft: 2 }}>
            À appeler ({groupes.a_appeler.length})
          </div>
          {groupes.a_appeler.map(renderContact)}
        </>
      )}
      {groupes.autres.length > 0 && (
        <>
          <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7, color: C.textVlo, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 5, marginTop: 10, paddingLeft: 2 }}>
            Traités ({groupes.autres.length})
          </div>
          {groupes.autres.map(renderContact)}
        </>
      )}
    </div>
  )
}
