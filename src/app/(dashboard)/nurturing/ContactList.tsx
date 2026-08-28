'use client'

import { Contact, TempCategory, V, tempColors } from './nurturing-types'

interface ContactListProps {
  contacts: Contact[]
  filteredContacts: Contact[]
  selectedContactIdx: number
  openMenuIdx: number | null
  filterTemp: TempCategory | 'all'
  searchQuery: string
  loading: boolean
  showArchived: boolean
  onSelectContact: (idx: number) => void
  onSetOpenMenuIdx: (idx: number | null) => void
  onSetFilterTemp: (temp: TempCategory | 'all') => void
  onSetSearchQuery: (query: string) => void
  onSetShowArchived: (v: boolean) => void
  onLogInteraction: (type: string) => void
  onArchiveContact: (contactId: string, archived: boolean) => void
  onDeleteContact: (contactId: string) => void
  onSetSelectedChannel: (channel: 'call' | 'email' | 'whatsapp' | 'linkedin' | 'sms') => void
  onSetDetailTab: (tab: 'sequence' | 'history' | 'config') => void
  onSetLibraryOpen: (open: boolean) => void
}

export default function ContactList({
  contacts,
  filteredContacts,
  selectedContactIdx,
  openMenuIdx,
  filterTemp,
  searchQuery,
  loading,
  showArchived,
  onSelectContact,
  onSetOpenMenuIdx,
  onSetFilterTemp,
  onSetSearchQuery,
  onSetShowArchived,
  onLogInteraction,
  onArchiveContact,
  onDeleteContact,
  onSetSelectedChannel,
  onSetDetailTab,
  onSetLibraryOpen,
}: ContactListProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <input
        type="text"
        placeholder="Rechercher un prospect..."
        value={searchQuery}
        onChange={(e) => onSetSearchQuery(e.target.value)}
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
            onClick={() => onSetFilterTemp(key)}
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
        <button
          onClick={() => onSetShowArchived(!showArchived)}
          style={{
            padding: '5px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer',
            fontSize: '11px', fontFamily: 'inherit',
            color: showArchived ? V.textHi : V.textLo,
            background: showArchived ? V.surface3 : V.surface2,
            fontWeight: showArchived ? 600 : 400,
          }}
        >
          {showArchived ? '📦 Archivés' : '📦'}
        </button>
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
              onClick={() => { onSelectContact(idx); onSetOpenMenuIdx(null) }}
              style={{
                position: 'relative', padding: '12px 14px', borderRadius: '12px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                transition: 'all 0.15s', borderLeft: `4px solid ${cColors.border}`,
                background: idx === selectedContactIdx ? V.surface2 : 'transparent',
                opacity: contact.archived ? 0.5 : 1,
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = V.surface1}
              onMouseLeave={(e) => { if (idx !== selectedContactIdx) e.currentTarget.style.background = 'transparent' }}
            >
              <button
                onClick={(e) => { e.stopPropagation(); onSetOpenMenuIdx(openMenuIdx === idx ? null : idx) }}
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
                  <div onClick={() => { onLogInteraction('appel'); onSetOpenMenuIdx(null) }} style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '11px', color: V.text, cursor: 'pointer' }}>📞 Appeler maintenant</div>
                  <div onClick={() => { onSetSelectedChannel('whatsapp'); onSetDetailTab('sequence'); onSetOpenMenuIdx(null) }} style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '11px', color: V.text, cursor: 'pointer' }}>💬 WhatsApp rapide</div>
                  <div onClick={() => { onSetSelectedChannel('email'); onSetDetailTab('sequence'); onSetOpenMenuIdx(null) }} style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '11px', color: V.text, cursor: 'pointer' }}>✉️ Envoyer un email</div>
                  <div style={{ height: '1px', background: V.line, margin: '4px 0' }} />
                  <div onClick={() => { onSetLibraryOpen(true); onSetOpenMenuIdx(null) }} style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '11px', color: V.text, cursor: 'pointer' }}>📄 Envoyer document</div>
                  <div style={{ height: '1px', background: V.line, margin: '4px 0' }} />
                  <div onClick={() => { onArchiveContact(contact.id, true); onSetOpenMenuIdx(null) }} style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '11px', color: V.green, cursor: 'pointer' }}>
                    ✅ Deal fait (archiver)
                  </div>
                  <div onClick={() => { if (confirm(`Supprimer ${contact.name} ? (plus de relance à faire)`)) { onDeleteContact(contact.id); onSetOpenMenuIdx(null) } }} style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '11px', color: V.warn, cursor: 'pointer' }}>
                    🚫 Plus de relance (supprimer)
                  </div>
                  <div style={{ height: '1px', background: V.line, margin: '4px 0' }} />
                  <div onClick={() => { onArchiveContact(contact.id, !contact.archived); onSetOpenMenuIdx(null) }} style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '11px', color: contact.archived ? V.green : V.textLo, cursor: 'pointer' }}>
                    {contact.archived ? '📤 Désarchiver' : '📦 Archiver'}
                  </div>
                  <div onClick={() => { if (confirm(`Supprimer définitivement ${contact.name} ?`)) { onDeleteContact(contact.id); onSetOpenMenuIdx(null) } }} style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '11px', color: V.red, cursor: 'pointer' }}>
                    🗑️ Supprimer
                  </div>
                </div>
              )}

              <div style={{ width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0, background: cColors.iconBg, border: `2px solid ${cColors.iconBorder}` }}>
                {contact.icon}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: V.textHi, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {contact.name}
                </div>
                <div style={{ fontSize: '10px', color: V.textMid, marginTop: '2px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span>{contact.job}</span>
                  {(contact.pressureScore ?? 0) >= 1 && (
                    <span style={{ letterSpacing: '-1px', fontSize: '9px' }} title={`Pression : ${contact.pressureScore}/5`}>
                      {Array.from({ length: 5 }, (_, i) => {
                        const score = contact.pressureScore ?? 0
                        const activeColor = score <= 2 ? '#4caf50' : score <= 3 ? '#ff9800' : '#ff6470'
                        return <span key={i} style={{ color: i < score ? activeColor : V.surface3 }}>●</span>
                      })}
                    </span>
                  )}
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
  )
}
