'use client'

import { useState, useEffect } from 'react'
import { saveLastSection } from '@/lib/navigation-state'

// ─── VARIABLES CSS (thème PSG Cosmos) ───────────────────────────────────────
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

type DetailTab = 'sequence' | 'history' | 'config'

export default function NurturingPage() {
  const [selectedContactIdx, setSelectedContactIdx] = useState(0)
  const [detailTab, setDetailTab] = useState<DetailTab>('sequence')
  const [openMenuIdx, setOpenMenuIdx] = useState<number | null>(null)
  const [selectedChannel, setSelectedChannel] = useState('📞 Appel')
  const [libraryOpen, setLibraryOpen] = useState(false)

  useEffect(() => { saveLastSection('/nurturing') }, [])

  // Mock contact data
  const contacts = [
    {
      temp: 'hot' as const,
      icon: '🔥',
      name: 'Jean Dupont',
      job: 'Dentiste',
      stage: 'RDV 1 fait',
      stats: '5tp · 2 rép.',
      warning: '⚠ 3 NR',
      preferredChannel: '📞 préféré',
      badges: ['▶ Seq.'],
      nextTime: 'Aujourd\'hui',
      nextChannel: '📞',
      urgent: true,
    },
    {
      temp: 'hot' as const,
      icon: '🔥',
      name: 'Pierre Martin',
      job: 'Pharmacien',
      stage: 'RDV 2',
      stats: '7tp · 3 rép.',
      nextTime: 'Demain',
      nextChannel: '✉️',
      urgent: false,
    },
    {
      temp: 'warm' as const,
      icon: '☀️',
      name: 'Marie Laurent',
      job: 'Avocate',
      stage: 'RDV fait',
      stats: '8tp · 5 rép.',
      badges: ['▶ Seq.'],
      nextTime: 'dans 2j',
      nextChannel: '💬',
      urgent: false,
    },
    {
      temp: 'warm' as const,
      icon: '☀️',
      name: 'Claire Rousseau',
      job: 'Architecte',
      stage: 'Prospect tiède',
      stats: '4tp · 1 rép.',
      warning: '⚠ 2 NR',
      nextTime: 'dans 3j',
      nextChannel: '🔗',
      urgent: false,
    },
    {
      temp: 'cold' as const,
      icon: '❄️',
      name: 'Thomas Bernard',
      job: 'Kinésithérapeute',
      stage: 'Prospect froid',
      stats: '2tp · 0 rép.',
      nextTime: 'dans 5j',
      nextChannel: '✉️',
      urgent: false,
    },
    {
      temp: 'cold' as const,
      icon: '❄️',
      name: 'Nathalie Petit',
      job: 'Notaire',
      stage: 'Interpro',
      stats: '3tp · 1 rép.',
      nextTime: 'dans 7j',
      nextChannel: '📞',
      urgent: false,
    },
    {
      temp: 'dead' as const,
      icon: '🪨',
      name: 'Sophie Moreau',
      job: 'Sage-femme',
      stage: 'Perdu',
      stats: '6tp · 1 rép.',
      warning: '5 NR · Stop',
      nextTime: 'il y a 45j',
      urgent: false,
    },
  ]

  const selectedContact = contacts[selectedContactIdx]

  const tempColors: Record<string, { border: string; bg: string; iconBg: string; iconBorder: string }> = {
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

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1800px', margin: '0 auto' }}>
      {/* ═══ HEADER ═══ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '28px', color: V.textHi, fontWeight: 600, letterSpacing: '1px', fontFamily: 'Oswald, sans-serif' }}>NURTURING</h1>
          <p style={{ fontSize: '12px', color: V.textMid, marginTop: '4px' }}>Maturation & relances multicanales · 47 contacts actifs · 5 séquences</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, background: 'rgba(232,200,120,0.1)', color: V.gold, border: `1px solid rgba(232,200,120,0.25)`, cursor: 'pointer' }}>Séquences <strong>5</strong></span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, background: 'rgba(78,205,196,0.1)', color: V.cyan, border: `1px solid rgba(78,205,196,0.25)`, cursor: 'pointer' }}>Today <strong>7</strong></span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, background: 'rgba(76,175,80,0.1)', color: V.green, border: `1px solid rgba(76,175,80,0.25)`, cursor: 'pointer' }}>Conversion <strong>23%</strong></span>
          <button style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid rgba(232,200,120,0.25)', cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit', color: V.gold, background: 'rgba(232,200,120,0.08)' }}>+ Nouveau contact</button>
        </div>
      </div>

      {/* ═══ MAIN 2-COL LAYOUT ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '20px', minHeight: 'calc(100vh - 160px)' }}>

        {/* ─── LEFT: PROSPECT LIST ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Search + filters */}
          <div style={{ marginBottom: '12px' }}>
            <input
              type="text"
              placeholder="Rechercher un prospect..."
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: `1px solid ${V.line}`,
                background: V.surface2,
                color: V.textHi,
                fontSize: '12px',
                fontFamily: 'inherit',
                outline: 'none',
                marginBottom: '8px',
              }}
            />
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit', color: V.textHi, background: 'rgba(232,200,120,0.15)', fontWeight: 600 }}>Tous (47)</button>
              <button style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit', color: V.hot, background: V.surface2 }}>Chauds (9)</button>
              <button style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit', color: V.warm, background: V.surface2 }}>Tièdes (18)</button>
              <button style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit', color: V.cold, background: V.surface2 }}>Froids (14)</button>
            </div>
          </div>

          {/* Contact list */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', paddingRight: '4px' }}>
            {contacts.map((contact, idx) => {
              const colors = tempColors[contact.temp]
              return (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedContactIdx(idx)
                    setOpenMenuIdx(null)
                  }}
                  style={{
                    position: 'relative',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    transition: 'all 0.15s',
                    borderLeft: `4px solid ${colors.border}`,
                    background: selectedContactIdx === idx ? V.surface2 : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedContactIdx !== idx) {
                      e.currentTarget.style.background = V.surface1
                      e.currentTarget.style.transform = 'translateX(2px)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedContactIdx !== idx) {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.transform = 'translateX(0)'
                    }
                  }}
                >
                  {/* Dropdown menu button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpenMenuIdx(openMenuIdx === idx ? null : idx)
                    }}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '6px',
                      border: 'none',
                      background: 'transparent',
                      color: V.textLo,
                      cursor: 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: selectedContactIdx === idx || openMenuIdx === idx ? 1 : 0,
                      transition: 'opacity 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = V.surface3
                      e.currentTarget.style.color = V.textMid
                      e.currentTarget.style.opacity = '1'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = V.textLo
                      if (selectedContactIdx !== idx && openMenuIdx !== idx) {
                        e.currentTarget.style.opacity = '0'
                      }
                    }}
                  >
                    ⋮
                  </button>

                  {/* Dropdown menu */}
                  {openMenuIdx === idx && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: 'absolute',
                        top: '32px',
                        right: '8px',
                        zIndex: 100,
                        background: V.bgMid,
                        border: `1px solid ${V.line}`,
                        borderRadius: '10px',
                        padding: '6px',
                        minWidth: '180px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                      }}
                    >
                      {['📞 Appeler maintenant', '💬 WhatsApp rapide', '✉️ Envoyer un email', null, '▶ Lancer séquence', '📄 Envoyer document', null, '📅 Planifier relance', '🔗 Ouvrir CRM'].map((item, i) =>
                        item === null ? (
                          <div key={i} style={{ height: '1px', background: V.line, margin: '4px 0' }} />
                        ) : (
                          <div
                            key={i}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              color: V.text,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              transition: 'background 0.1s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = V.surface2
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent'
                            }}
                          >
                            {item}
                          </div>
                        )
                      )}
                    </div>
                  )}

                  {/* Avatar */}
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                      background: colors.iconBg,
                      border: `2px solid ${colors.iconBorder}`,
                      flexShrink: 0,
                    }}
                  >
                    {contact.icon}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: V.textHi, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {contact.name}
                    </div>
                    <div style={{ fontSize: '10px', color: V.textMid, marginTop: '2px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span>{contact.job}</span>
                      {contact.badges?.map((badge, i) => (
                        <span key={i} style={{ color: V.green, fontWeight: 600 }}>{badge}</span>
                      ))}
                      {contact.warning && <span style={{ color: V.warn, fontWeight: 600 }}>{contact.warning}</span>}
                    </div>
                  </div>

                  {/* Right: next action */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div
                      style={{
                        fontSize: '10px',
                        color: contact.urgent ? V.hot : V.textLo,
                        fontWeight: contact.urgent ? 700 : 400,
                      }}
                    >
                      {contact.nextTime}
                    </div>
                    {contact.nextChannel && <div style={{ fontSize: '14px', marginTop: '2px' }}>{contact.nextChannel}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ─── RIGHT: DETAIL PANEL ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Tab bar */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', borderBottom: `1px solid ${V.line}`, paddingBottom: '8px' }}>
            {[
              { id: 'sequence', label: 'Séquence & Messages' },
              { id: 'history', label: 'Historique', count: 12 },
              { id: 'config', label: 'Config' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setDetailTab(tab.id as DetailTab)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px 8px 0 0',
                  border: 'none',
                  cursor: 'pointer',
                  background: detailTab === tab.id ? V.surface2 : 'transparent',
                  color: detailTab === tab.id ? V.textHi : V.textMid,
                  fontSize: '12px',
                  fontFamily: 'inherit',
                  borderBottom: detailTab === tab.id ? `2px solid ${V.gold}` : '2px solid transparent',
                  fontWeight: detailTab === tab.id ? 700 : 400,
                  transition: 'all 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {tab.label}
                {tab.count && (
                  <span
                    style={{
                      fontSize: '9px',
                      padding: '1px 5px',
                      borderRadius: '8px',
                      background: detailTab === tab.id ? 'rgba(232,200,120,0.15)' : V.surface3,
                      color: detailTab === tab.id ? V.gold : V.textLo,
                      fontWeight: 700,
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
            {/* ═══ TAB: SEQUENCE & MESSAGES ═══ */}
            {detailTab === 'sequence' && (
              <div>
                {/* Prospect header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '16px',
                    padding: '12px 16px',
                    background: tempColors[selectedContact.temp].bg,
                    borderRadius: '12px',
                    border: `1px solid ${tempColors[selectedContact.temp].border}`,
                  }}
                >
                  <div style={{ fontSize: '24px' }}>{selectedContact.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: V.textHi }}>{selectedContact.name}</div>
                    <div style={{ fontSize: '11px', color: V.textMid, display: 'flex', gap: '10px', marginTop: '3px' }}>
                      <span>{selectedContact.job} · {selectedContact.stage}</span>
                      <span style={{ color: V.gold }}>📊 Retraite TNS, Prévoyance</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <span style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '4px', background: 'rgba(232,200,120,0.12)', color: V.gold, border: '1px solid rgba(232,200,120,0.2)', fontWeight: 600 }}>📞 Préféré</span>
                    <span style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '4px', background: 'rgba(76,175,80,0.12)', color: V.green, border: '1px solid rgba(76,175,80,0.2)', fontWeight: 600 }}>Pression OK</span>
                  </div>
                </div>

                {/* KPIs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
                  {[
                    { icon: selectedContact.icon, label: selectedContact.temp === 'hot' ? 'Brûlant' : selectedContact.temp === 'warm' ? 'Tiède' : selectedContact.temp === 'cold' ? 'Froid' : 'Enterré', color: tempColors[selectedContact.temp].border },
                    { value: '5', label: 'Touchpoints' },
                    { value: '2', label: 'Réponses', color: V.green },
                    { value: '3', label: 'Sans réponse', color: V.warn },
                  ].map((stat, i) => (
                    <div
                      key={i}
                      style={{
                        background: V.surface1,
                        border: `1px solid ${V.line}`,
                        borderRadius: '10px',
                        padding: '10px',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: stat.icon ? '22px' : '18px', fontWeight: 700, color: stat.color || V.textHi }}>
                        {stat.icon || stat.value}
                      </div>
                      <div style={{ fontSize: '9px', color: V.textMid, marginTop: '2px' }}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Recommendation IA */}
                <div style={{ background: 'rgba(232,200,120,0.05)', border: '1px solid rgba(232,200,120,0.18)', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '16px' }}>💡</span>
                  <div style={{ fontSize: '11px', color: V.textMid, flex: 1 }}>
                    Canal le plus efficace : <strong style={{ color: V.textHi }}>✉️ email</strong> (67% réponses). 3 relances sans réponse — envisager un changement de canal.
                  </div>
                  <button style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid rgba(232,200,120,0.3)', cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit', color: V.gold, background: 'transparent' }}>Appliquer</button>
                </div>

                {/* SEQUENCE TIMELINE */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: V.textHi, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>▶ Séquence active</span>
                      <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(76,175,80,0.12)', color: V.green }}>En cours · Étape 3/5</span>
                    </div>
                    <button style={{ padding: '5px 10px', borderRadius: '6px', border: `1px solid ${V.line}`, cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit', color: V.text, background: 'transparent' }}>Modifier séquence</button>
                  </div>

                  <div style={{ position: 'relative', paddingLeft: '20px' }}>
                    {/* Vertical line */}
                    <div
                      style={{
                        position: 'absolute',
                        left: '8px',
                        top: '12px',
                        bottom: '12px',
                        width: '2px',
                        background: 'linear-gradient(to bottom, #e8c878, #4ecdc4, #2a3470)',
                        borderRadius: '1px',
                      }}
                    />

                    {/* Steps */}
                    {[
                      { label: '✉️ Email de suivi post-RDV', date: '28 juin · Envoyé ✅', preview: '"Jean, comme convenu voici le récapitulatif de notre échange sur votre retraite TNS..."', status: 'done' },
                      { label: '💬 WhatsApp J+5', date: '3 juil · Répondu ✅', preview: '"Jean, je reviens vers vous — avez-vous pu consulter le document ?"', status: 'done' },
                      { label: '📞 Appel de relance', date: 'Aujourd\'hui', preview: '"Jean, c\'est [nom]. On s\'est échangé sur la retraite TNS. J\'ai finalisé la simulation..."', status: 'current', actions: true },
                      { label: '📄 Envoi document (Simulateur Retraite)', date: 'dans 3j', preview: 'Joint : Simulateur Retraite TNS (PDF)', status: 'upcoming' },
                      { label: '🔗 LinkedIn — message de valeur', date: 'dans 7j', preview: 'Partager article pertinent + mention personnalisée', status: 'upcoming' },
                    ].map((step, i) => (
                      <div
                        key={i}
                        style={{
                          position: 'relative',
                          padding: '10px 14px',
                          marginBottom: '8px',
                          borderRadius: '10px',
                          background: V.surface1,
                          border: `1px solid ${V.line}`,
                          transition: 'all 0.15s',
                        }}
                      >
                        {/* Circle indicator */}
                        <div
                          style={{
                            position: 'absolute',
                            left: '-16px',
                            top: '14px',
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            border: `2px solid ${step.status === 'done' ? V.green : step.status === 'current' ? V.gold : V.textLo}`,
                            background: step.status === 'done' ? V.green : step.status === 'current' ? V.gold : V.surface2,
                            boxShadow: step.status === 'current' ? '0 0 8px rgba(232,200,120,0.4)' : 'none',
                          }}
                        />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: '12px', fontWeight: 500, color: V.textHi, display: 'flex', alignItems: 'center', gap: '6px' }}>{step.label}</div>
                          <div style={{ fontSize: '10px', color: step.status === 'current' ? V.hot : V.textLo, fontWeight: step.status === 'current' ? 600 : 400 }}>{step.date}</div>
                        </div>
                        <div style={{ fontSize: '11px', color: V.textMid, marginTop: '4px', lineHeight: 1.4 }}>{step.preview}</div>
                        {step.actions && (
                          <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                            <button style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', background: V.gold, color: V.bgDeep, fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>📞 Exécuter maintenant</button>
                            <button style={{ padding: '5px 10px', borderRadius: '6px', border: `1px solid ${V.line}`, cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit', color: V.text, background: 'transparent' }}>Reporter +2j</button>
                            <button style={{ padding: '5px 10px', borderRadius: '6px', border: `1px solid ${V.line}`, cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit', color: V.text, background: 'transparent' }}>Changer canal</button>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Add step button */}
                    <button
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '10px',
                        border: `2px dashed ${V.line}`,
                        background: 'transparent',
                        color: V.textLo,
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        transition: 'all 0.15s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        marginTop: '4px',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = V.gold
                        e.currentTarget.style.color = V.gold
                        e.currentTarget.style.background = 'rgba(232,200,120,0.04)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = V.line
                        e.currentTarget.style.color = V.textLo
                        e.currentTarget.style.background = 'transparent'
                      }}
                    >
                      + Ajouter une étape à la séquence
                    </button>
                  </div>
                </div>

                {/* QUICK COMPOSE */}
                <div style={{ position: 'relative', background: 'rgba(232,200,120,0.04)', border: '1px solid rgba(232,200,120,0.18)', borderRadius: '14px', padding: '18px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: V.gold, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Composer un message</div>
                    <span style={{ fontSize: '9px', color: V.textLo }}>Variables auto-remplies : {'{prenom}'}, {'{metier}'}, {'{theme}'}</span>
                  </div>

                  {/* Channel selector */}
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                    {['📞 Appel', '✉️ Email', '💬 WhatsApp', '🔗 LinkedIn', '📱 SMS'].map((ch) => (
                      <button
                        key={ch}
                        onClick={() => setSelectedChannel(ch)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: `1px solid ${selectedChannel === ch ? V.gold : V.line}`,
                          background: selectedChannel === ch ? 'rgba(232,200,120,0.12)' : V.surface2,
                          color: selectedChannel === ch ? V.gold : V.textMid,
                          fontSize: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          fontFamily: 'inherit',
                        }}
                      >
                        {ch}
                      </button>
                    ))}
                  </div>

                  {/* Template dropdown */}
                  <div style={{ position: 'relative', marginBottom: '12px' }}>
                    <select
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: `1px solid ${V.line}`,
                        background: V.surface2,
                        color: V.text,
                        fontSize: '12px',
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                        appearance: 'none',
                        outline: 'none',
                      }}
                    >
                      <option value="">Choisir un template de la bibliothèque...</option>
                      <optgroup label="📊 Retraite TNS">
                        <option>Relance post-RDV retraite</option>
                        <option>Envoi simulateur + relance</option>
                        <option>Micro-relance après silence</option>
                      </optgroup>
                      <optgroup label="🏠 Immobilier">
                        <option>Relance SCPI + guide PDF</option>
                        <option>Suivi intérêt investissement</option>
                      </optgroup>
                      <optgroup label="💰 Défiscalisation">
                        <option>Rappel fin d'année fiscale</option>
                        <option>Partage infographie Girardin</option>
                      </optgroup>
                    </select>
                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: V.textLo, fontSize: '10px', pointerEvents: 'none' }}>▼</span>
                  </div>

                  {/* Textarea */}
                  <textarea
                    style={{
                      width: '100%',
                      minHeight: '90px',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: `1px solid ${V.line}`,
                      background: V.surface1,
                      color: V.textHi,
                      fontSize: '12px',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      lineHeight: 1.6,
                      outline: 'none',
                    }}
                    placeholder="Rédigez votre message ici ou sélectionnez un template..."
                    defaultValue="Jean, c'est [votre_nom]. On s'est échangé lors de notre rendez-vous sur la retraite TNS. Je vous appelle parce que j'ai finalisé la simulation. Est-ce que vous avez 2 minutes ou je vous rappelle à un meilleur moment ?"
                  />

                  {/* Library picker overlay */}
                  {libraryOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: 0,
                        right: 0,
                        marginBottom: '6px',
                        background: V.bgMid,
                        border: `1px solid ${V.line}`,
                        borderRadius: '12px',
                        padding: '12px',
                        maxHeight: '280px',
                        overflowY: 'auto',
                        boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
                        zIndex: 50,
                      }}
                    >
                      <div style={{ fontSize: '11px', color: V.textMid, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bibliothèque de documents</div>
                      {[
                        { icon: '📊', name: 'Simulateur Retraite TNS', meta: 'PDF · email, whatsapp', tag: 'Retraite', tagColor: V.green },
                        { icon: '📄', name: 'Guide SCPI 2026', meta: 'PDF · email, courrier', tag: 'Immobilier', tagColor: V.gold },
                        { icon: '🖼️', name: 'Infographie Loi Girardin', meta: 'Image · email, linkedin', tag: 'Défiscalisation', tagColor: V.indigo },
                        { icon: '📊', name: 'Comparatif Madelin/PER', meta: 'PDF · email', tag: 'Retraite', tagColor: V.green },
                      ].map((doc, i) => (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'background 0.1s',
                            marginBottom: '4px',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = V.surface2
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent'
                          }}
                        >
                          <div style={{ fontSize: '18px', flexShrink: 0 }}>{doc.icon}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '12px', fontWeight: 500, color: V.textHi }}>{doc.name}</div>
                            <div style={{ fontSize: '10px', color: V.textLo, marginTop: '2px' }}>{doc.meta}</div>
                          </div>
                          <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: `rgba(${doc.tagColor === V.green ? '76,175,80' : doc.tagColor === V.gold ? '232,200,120' : '129,140,248'},0.12)`, color: doc.tagColor }}>{doc.tag}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Footer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: V.gold, color: V.bgDeep, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>📞 Exécuter</button>
                      <button style={{ padding: '5px 10px', borderRadius: '6px', border: `1px solid ${V.line}`, cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit', color: V.text, background: 'transparent' }}>💾 Sauver template</button>
                      <button
                        onClick={() => setLibraryOpen(!libraryOpen)}
                        style={{ padding: '5px 10px', borderRadius: '6px', border: `1px solid ${V.line}`, cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit', color: V.text, background: 'transparent' }}
                      >
                        📄 Joindre document
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button style={{ padding: '5px 10px', borderRadius: '6px', border: `1px solid ${V.line}`, cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit', color: V.text, background: 'transparent' }}>📅 Planifier</button>
                      <span style={{ fontSize: '9px', color: V.textLo }}>ou ajouter à la séquence</span>
                    </div>
                  </div>
                </div>

                {/* Prochaines actions planifiées */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: V.textHi }}>📅 Prochaines actions planifiées</div>
                    <button style={{ padding: '5px 10px', borderRadius: '6px', border: `1px solid ${V.line}`, cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit', color: V.text, background: 'transparent' }}>+ Planifier</button>
                  </div>
                  <div style={{ background: V.surface1, border: `1px solid ${V.line}`, borderRadius: '12px', padding: '14px' }}>
                    {[
                      { date: 'Aujourd\'hui', action: '📞 Appel relance retraite TNS', urgent: true },
                      { date: '20 juil.', action: '📄 Envoi Simulateur Retraite (PDF)' },
                      { date: '24 juil.', action: '🔗 LinkedIn — partage article retraite' },
                      { date: '28 juil.', action: '💬 WhatsApp — micro-relance' },
                    ].map((item, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 0',
                          borderBottom: i < 3 ? `1px solid rgba(42,52,112,0.4)` : 'none',
                        }}
                      >
                        <div style={{ fontSize: '11px', color: item.urgent ? V.hot : V.textMid, minWidth: '85px', fontWeight: item.urgent ? 600 : 500 }}>{item.date}</div>
                        <div style={{ fontSize: '12px', color: V.textHi, flex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>{item.action}</div>
                        <div style={{ fontSize: '10px', color: V.textLo, cursor: 'pointer', padding: '3px 8px', borderRadius: '4px', border: '1px solid transparent', transition: 'all 0.1s' }}>Modifier</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ═══ TAB: HISTORY ═══ */}
            {detailTab === 'history' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: V.textHi }}>Historique des interactions</div>
                  <span style={{ fontSize: '10px', color: V.textLo }}>12 total</span>
                </div>

                {/* Channel stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '20px' }}>
                  {[
                    { icon: '📞', percent: '40%', ratio: '2/5 rép.', color: V.warn },
                    { icon: '✉️', percent: '67%', ratio: '2/3 rép.', color: V.green, best: true },
                    { icon: '💬', percent: '33%', ratio: '1/3 rép.', color: V.textMid },
                    { icon: '🔗', percent: '0%', ratio: '0/1', color: V.textLo },
                    { icon: '📱', percent: '—', ratio: 'jamais', color: V.textLo },
                  ].map((ch, i) => (
                    <div
                      key={i}
                      style={{
                        background: ch.best ? 'rgba(232,200,120,0.06)' : V.surface1,
                        border: ch.best ? '1px solid rgba(232,200,120,0.25)' : `1px solid ${V.line}`,
                        borderRadius: '8px',
                        padding: '10px',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: '16px' }}>{ch.icon}</div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: ch.color, marginTop: '4px' }}>{ch.percent}</div>
                      <div style={{ fontSize: '9px', color: V.textLo }}>{ch.ratio}</div>
                      {ch.best && <div style={{ fontSize: '8px', color: V.gold, fontWeight: 700, marginTop: '2px' }}>MEILLEUR</div>}
                    </div>
                  ))}
                </div>

                {/* Timeline */}
                <div style={{ background: V.surface1, border: `1px solid ${V.line}`, borderRadius: '12px', padding: '14px' }}>
                  {[
                    { icon: '📞', channel: 'telephone', date: '12 juil. 26', note: 'Pas dispo cette semaine, rappeler lundi', status: '⏳', statusType: 'pending' },
                    { icon: '✉️', channel: 'email', date: '08 juil. 26', note: 'Simulateur retraite envoyé — ouvert 2x', status: '👁️', statusType: 'seen' },
                    { icon: '💬', channel: 'whatsapp', date: '03 juil. 26', note: '"OK on se rappelle la semaine prochaine"', status: '✅', statusType: 'replied' },
                    { icon: '✉️', channel: 'email', date: '28 juin 26', note: '"Merci pour le document, je regarde ça"', status: '✅', statusType: 'replied' },
                    { icon: '📞', channel: 'telephone', date: '25 juin 26', note: 'Messagerie laissée', status: '⏳', statusType: 'pending' },
                    { icon: '📅', channel: 'rdv', date: '20 juin 26', note: 'RDV 1 — Bilan patrimonial, intérêt retraite TNS', status: '✅', statusType: 'replied' },
                  ].map((h, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        borderLeft: `3px solid ${h.statusType === 'replied' ? V.green : h.statusType === 'seen' ? V.gold : V.warn}`,
                        marginBottom: '4px',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(232,200,120,0.03)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                      }}
                    >
                      <span style={{ fontSize: '14px', flexShrink: 0 }}>{h.icon}</span>
                      <span style={{ fontSize: '10px', color: V.textMid, minWidth: '65px' }}>{h.channel}</span>
                      <span style={{ fontSize: '10px', color: V.textLo, minWidth: '75px' }}>{h.date}</span>
                      <span style={{ fontSize: '10px', color: V.textLo, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.note}</span>
                      <span style={{ fontSize: '12px', flexShrink: 0 }}>{h.status}</span>
                    </div>
                  ))}
                </div>

                {/* Quick log */}
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: V.textHi, marginBottom: '8px' }}>Enregistrer une interaction</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['📞 Appel fait', '✉️ Email envoyé', '💬 WhatsApp envoyé', '🔗 LinkedIn envoyé', '📅 RDV pris', '🚫 Refus'].map((action, i) => (
                      <button
                        key={i}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '6px',
                          border: `1px solid ${action.includes('Refus') ? 'rgba(255,100,112,0.3)' : V.line}`,
                          cursor: 'pointer',
                          fontSize: '11px',
                          fontFamily: 'inherit',
                          color: action.includes('Refus') ? V.red : V.text,
                          background: 'transparent',
                        }}
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ═══ TAB: CONFIG ═══ */}
            {detailTab === 'config' && (
              <div>
                <div style={{ background: V.surface1, border: '1px solid rgba(232,200,120,0.2)', borderRadius: '12px', padding: '18px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: V.gold }}>Configuration nurturing — {selectedContact.name}</div>
                    <button style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', background: V.gold, color: V.bgDeep, fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>💾 Sauvegarder</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <div style={{ fontSize: '10px', color: V.textMid, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Canal préféré</div>
                      <select style={{ padding: '7px 10px', borderRadius: '8px', border: `1px solid ${V.line}`, background: V.surface2, color: V.text, fontSize: '12px', fontFamily: 'inherit', width: '100%', outline: 'none' }}>
                        <option>📞 Téléphone</option>
                        <option>✉️ Email</option>
                        <option>💬 WhatsApp</option>
                        <option>🔗 LinkedIn</option>
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: V.textMid, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fréquence de relance</div>
                      <select style={{ padding: '7px 10px', borderRadius: '8px', border: `1px solid ${V.line}`, background: V.surface2, color: V.text, fontSize: '12px', fontFamily: 'inherit', width: '100%', outline: 'none' }}>
                        <option>Hebdomadaire (7j)</option>
                        <option>Bi-mensuel (14j)</option>
                        <option>Mensuel (30j)</option>
                        <option>Personnalisé...</option>
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: V.textMid, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Créneau préféré</div>
                      <select style={{ padding: '7px 10px', borderRadius: '8px', border: `1px solid ${V.line}`, background: V.surface2, color: V.text, fontSize: '12px', fontFamily: 'inherit', width: '100%', outline: 'none' }}>
                        <option>Matin (8h-12h)</option>
                        <option>Après-midi (14h-18h)</option>
                        <option>Soir (18h-20h)</option>
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: V.textMid, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pression max (relances/mois)</div>
                      <select style={{ padding: '7px 10px', borderRadius: '8px', border: `1px solid ${V.line}`, background: V.surface2, color: V.text, fontSize: '12px', fontFamily: 'inherit', width: '100%', outline: 'none' }}>
                        <option>2 par mois</option>
                        <option>4 par mois</option>
                        <option>6 par mois</option>
                        <option>Illimité</option>
                      </select>
                    </div>
                    <div style={{ gridColumn: '1/-1' }}>
                      <div style={{ fontSize: '10px', color: V.textMid, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Canaux exclus</div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                        {['📞', '✉️', '💬', '🔗', '📬', '📱'].map((ch, i) => (
                          <button
                            key={i}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              border: `1px solid ${i === 4 ? 'rgba(255,100,112,0.3)' : V.line}`,
                              cursor: 'pointer',
                              fontSize: '11px',
                              fontFamily: 'inherit',
                              color: i === 4 ? V.red : V.text,
                              background: 'transparent',
                              textDecoration: i === 4 ? 'line-through' : 'none',
                            }}
                          >
                            {ch}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div style={{ gridColumn: '1/-1' }}>
                      <div style={{ fontSize: '10px', color: V.textMid, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Thèmes / Besoins identifiés</div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                        <span style={{ padding: '5px 10px', borderRadius: '6px', background: 'rgba(52,211,153,0.12)', color: V.green, fontSize: '11px', fontWeight: 600, border: '1px solid rgba(52,211,153,0.2)' }}>📊 Retraite TNS</span>
                        <span style={{ padding: '5px 10px', borderRadius: '6px', background: 'rgba(167,139,250,0.12)', color: V.purple, fontSize: '11px', fontWeight: 600, border: '1px solid rgba(167,139,250,0.2)' }}>🛡️ Prévoyance</span>
                        <button style={{ padding: '5px 10px', borderRadius: '6px', border: `1px solid ${V.line}`, cursor: 'pointer', fontSize: '10px', fontFamily: 'inherit', color: V.text, background: 'transparent' }}>+ Ajouter thème</button>
                      </div>
                    </div>
                    <div style={{ gridColumn: '1/-1' }}>
                      <div style={{ fontSize: '10px', color: V.textMid, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Notes personnelles</div>
                      <textarea
                        style={{
                          width: '100%',
                          minHeight: '60px',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: `1px solid ${V.line}`,
                          background: V.surface2,
                          color: V.textHi,
                          fontSize: '12px',
                          fontFamily: 'inherit',
                          resize: 'vertical',
                          outline: 'none',
                          marginTop: '4px',
                        }}
                        defaultValue="Aime le golf, enfants en études sup, sensible défiscalisation. Préfère qu'on l'appelle le matin. Ne pas envoyer de courrier postal."
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
