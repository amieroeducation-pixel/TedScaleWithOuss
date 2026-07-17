'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { saveLastSection } from '@/lib/navigation-state'

// ─── TYPES ───────────────────────────────────────────────────────────────────
type TempCategory = 'hot' | 'warm' | 'cold' | 'dead'
type DetailTab = 'sequence' | 'history' | 'config'
type Channel = 'call' | 'email' | 'whatsapp' | 'linkedin' | 'sms'
type PressureBadge = 'normal' | 'vary' | 'stop'

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

interface Contact {
  id: string
  temp: TempCategory
  name: string
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
  frequency?: string
  pressure?: string
  themes?: string[]
  excludedChannels?: string[]
}

interface Interaction {
  id: string
  channel: string
  date: string // Now ISO string for pressure calculation
  note: string
  status: 'pending' | 'seen' | 'replied'
  icon: string
}

interface SequenceStep {
  id: string
  channel: string
  label: string
  date: string
  preview: string
  status: 'done' | 'current' | 'upcoming'
  icon: string
}

// ─── THEME PSG Cosmos ────────────────────────────────────────────────────────
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

// ─── COMPOSANT PRINCIPAL ─────────────────────────────────────────────────────
export default function NurturingPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContactIdx, setSelectedContactIdx] = useState(0)
  const [detailTab, setDetailTab] = useState<DetailTab>('sequence')
  const [openMenuIdx, setOpenMenuIdx] = useState<number | null>(null)
  const [selectedChannel, setSelectedChannel] = useState<Channel>('call')
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [sequenceSteps, setSequenceSteps] = useState<SequenceStep[]>([])
  const [messageText, setMessageText] = useState('')
  const [pressure, setPressure] = useState<{ score: number; badge: PressureBadge; label: string; color: string }>({ score: 0, badge: 'normal', label: '✓ Normale', color: '#4caf50' })

  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    saveLastSection('/nurturing')
    loadContacts()
  }, [])

  useEffect(() => {
    if (contacts.length > 0) {
      loadContactDetails(contacts[selectedContactIdx].id)
    }
  }, [selectedContactIdx, contacts])

  async function loadContacts() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: prospects } = await supabase
      .from('prospects')
      .select(`
        id,
        full_name,
        profession,
        nb_relances_sans_reponse,
        next_action_channel,
        next_action_date,
        last_contact_at,
        pressure_score,
        nurturing_category,
        notes
      `)
      .eq('user_id', user.id)
      .order('next_action_date', { ascending: true })

    if (!prospects) {
      setLoading(false)
      return
    }

    const contactList: Contact[] = prospects.map((p: any) => {
      const lastContactDays = p.last_contact_at
        ? Math.floor((Date.now() - new Date(p.last_contact_at).getTime()) / (1000 * 60 * 60 * 24))
        : null

      const temp = calculateTempCategory(
        lastContactDays,
        false, // TODO: vérifier si séquence active
        p.nb_relances_sans_reponse || 0,
        p.pressure_score
      )

      const nextTime = p.next_action_date ? formatRelativeDate(new Date(p.next_action_date)) : 'Non planifié'

      const badges: string[] = []
      if (p.nurturing_category === 'rdv_fait') badges.push('RDV fait')

      const warning = p.nb_relances_sans_reponse > 0 ? `⚠ ${p.nb_relances_sans_reponse} NR` : undefined

      return {
        id: p.id,
        temp,
        name: p.full_name,
        job: p.profession || 'Non renseigné',
        badges,
        warning,
        nextTime,
        nextChannel: channelToIcon(p.next_action_channel),
        urgent: nextTime === 'Aujourd\'hui',
        icon: tempIcons[temp],
        stage: p.nurturing_category || undefined,
        touchpoints: 0, // à calculer depuis interactions
        responses: 0,
        no_responses: p.nb_relances_sans_reponse || 0,
        notes: p.notes || '',
        pressure: p.pressure_score || 'normal',
        themes: [],
        excludedChannels: [],
      }
    })

    setContacts(contactList)
    setLoading(false)
  }

  async function loadContactDetails(contactId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Charger les interactions
    const { data: interactionData } = await supabase
      .from('interactions')
      .select('*')
      .eq('prospect_id', contactId)
      .order('occurred_at', { ascending: false })
      .limit(12)

    if (interactionData) {
      const interactionList: Interaction[] = interactionData.map((i: any) => ({
        id: i.id,
        channel: i.type,
        date: i.occurred_at,
        note: i.notes || 'Aucune note',
        status: i.responded_at ? 'replied' : i.seen_at ? 'seen' : 'pending',
        icon: interactionTypeToIcon(i.type),
      }))
      setInteractions(interactionList)
      setPressure(computePressure(interactionList))
    }

    // TODO: Charger les séquences actives
    // Pour l'instant, on garde les données mockées de l'interface
    loadMockSequence()
  }

  function loadMockSequence() {
    setSequenceSteps([
      {
        id: '1',
        channel: 'email',
        label: 'Relance post-RDV retraite TNS',
        date: '28 juin · Envoyé ✅',
        preview: '"Bonjour {prenom}, suite à notre échange sur votre situation de retraite TNS, je vous transmets comme convenu le récapitulatif de notre discussion..."',
        status: 'done',
        icon: '✉️',
      },
      {
        id: '2',
        channel: 'whatsapp',
        label: 'WhatsApp J+5 après envoi doc',
        date: '3 juil · Répondu ✅',
        preview: '"{prenom}, je reviens vers vous rapidement 👋 Avez-vous pu consulter le document que je vous ai transmis sur {theme} ?"',
        status: 'done',
        icon: '💬',
      },
      {
        id: '3',
        channel: 'call',
        label: 'Appel relance après silence',
        date: 'Aujourd\'hui',
        preview: '"Bonjour {prenom}, c\'est [votre nom]. On s\'est échangé il y a quelques semaines sur {theme}. J\'ai finalisé la simulation qu\'on avait évoquée ensemble. Vous avez 5 minutes ?"',
        status: 'current',
        icon: '📞',
      },
      {
        id: '4',
        channel: 'email',
        label: 'Email — envoi simulateur + relance douce',
        date: 'dans 3j',
        preview: '"Bonjour {prenom}, comme convenu, je vous transmets la simulation personnalisée concernant {theme}. Je peux me libérer jeudi matin ou vendredi après-midi..."',
        status: 'upcoming',
        icon: '✉️',
      },
      {
        id: '5',
        channel: 'linkedin',
        label: 'LinkedIn — message de valeur',
        date: 'dans 7j',
        preview: '"{prenom}, je suis tombé sur cet article qui pourrait vous intéresser dans le cadre de votre activité de {metier}..."',
        status: 'upcoming',
        icon: '🔗',
      },
      {
        id: '6',
        channel: 'email',
        label: 'Micro-relance après 3 NR',
        date: 'dans 14j',
        preview: '"Bonjour {prenom}, je vous ai relancé plusieurs fois ces dernières semaines sur {theme}. Souhaitez-vous qu\'on garde contact, ou préférez-vous que je vous recontacte dans quelques mois ?"',
        status: 'upcoming',
        icon: '✉️',
      },
    ])
  }

  function channelToIcon(channel: string | null): string {
    const map: Record<string, string> = {
      telephone: '📞',
      email: '✉️',
      whatsapp: '💬',
      linkedin: '🔗',
      sms: '📱',
      courrier: '📬',
    }
    return channel && map[channel] ? map[channel] : '📞'
  }

  function interactionTypeToIcon(type: string): string {
    const map: Record<string, string> = {
      appel: '📞',
      email: '✉️',
      whatsapp: '💬',
      linkedin: '🔗',
      rdv1: '📅',
      rdv2: '📅',
      rdv3: '📅',
    }
    return map[type] || '📝'
  }

  const selectedContact = contacts[selectedContactIdx]
  const colors = selectedContact ? tempColors[selectedContact.temp] : tempColors.cold

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1800px', margin: '0 auto' }}>
      {/* ═══ HEADER ═══ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '28px', color: V.textHi, fontWeight: 600, letterSpacing: '1px', fontFamily: 'Oswald, sans-serif' }}>
            NURTURING
          </h1>
          <p style={{ fontSize: '12px', color: V.textMid, marginTop: '4px' }}>
            Maturation & relances multicanales · {contacts.length} contacts actifs · 5 séquences
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, background: 'rgba(232,200,120,0.1)', color: V.gold, border: '1px solid rgba(232,200,120,0.25)', cursor: 'pointer' }}>
            Séquences <strong>5</strong>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, background: 'rgba(78,205,196,0.1)', color: V.cyan, border: '1px solid rgba(78,205,196,0.25)', cursor: 'pointer' }}>
            Today <strong>{contacts.filter(c => c.urgent).length}</strong>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, background: 'rgba(76,175,80,0.1)', color: V.green, border: '1px solid rgba(76,175,80,0.25)', cursor: 'pointer' }}>
            Conversion <strong>23%</strong>
          </span>
          <button style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid rgba(232,200,120,0.25)', cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit', color: V.text, background: 'transparent' }}>
            + Nouveau contact
          </button>
        </div>
      </div>

      {/* ═══ MAIN 2-COL LAYOUT ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '20px', minHeight: 'calc(100vh - 160px)' }}>

        {/* ─── LEFT: PROSPECT LIST ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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

          <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <button style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit', background: 'rgba(232,200,120,0.15)', color: V.gold, fontWeight: 600 }}>
              Tous ({contacts.length})
            </button>
            <button style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit', background: V.surface2, color: V.hot }}>
              Chauds ({contacts.filter(c => c.temp === 'hot').length})
            </button>
            <button style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit', background: V.surface2, color: V.warm }}>
              Tièdes ({contacts.filter(c => c.temp === 'warm').length})
            </button>
            <button style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit', background: V.surface2, color: V.cold }}>
              Froids ({contacts.filter(c => c.temp === 'cold').length})
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', paddingRight: '4px' }}>
            {loading && (
              <div style={{ padding: '20px', textAlign: 'center', color: V.textMid }}>Chargement...</div>
            )}
            {!loading && contacts.map((contact, idx) => {
              const colors = tempColors[contact.temp]
              return (
                <div
                  key={contact.id}
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
                    background: idx === selectedContactIdx ? V.surface2 : 'transparent',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = V.surface1}
                  onMouseLeave={(e) => {
                    if (idx !== selectedContactIdx) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  {/* Menu button */}
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
                      opacity: idx === selectedContactIdx || openMenuIdx === idx ? 1 : 0,
                      transition: 'opacity 0.15s',
                    }}
                  >
                    ⋮
                  </button>

                  {/* Dropdown menu */}
                  {openMenuIdx === idx && (
                    <div
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
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '11px', color: V.text, cursor: 'pointer' }}>📞 Appeler maintenant</div>
                      <div style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '11px', color: V.text, cursor: 'pointer' }}>💬 WhatsApp rapide</div>
                      <div style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '11px', color: V.text, cursor: 'pointer' }}>✉️ Envoyer un email</div>
                      <div style={{ height: '1px', background: V.line, margin: '4px 0' }} />
                      <div style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '11px', color: V.text, cursor: 'pointer' }}>▶ Lancer séquence</div>
                      <div style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '11px', color: V.text, cursor: 'pointer' }}>📄 Envoyer document</div>
                      <div style={{ height: '1px', background: V.line, margin: '4px 0' }} />
                      <div style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '11px', color: V.text, cursor: 'pointer' }}>📅 Planifier relance</div>
                      <div style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '11px', color: V.text, cursor: 'pointer' }}>🔗 Ouvrir CRM</div>
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
                      flexShrink: 0,
                      background: colors.iconBg,
                      border: `2px solid ${colors.iconBorder}`,
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
                      {contact.badges.map((b, i) => (
                        <span key={i} style={{ color: V.gold, fontWeight: 600 }}>▶ Seq.</span>
                      ))}
                      {contact.warning && (
                        <span style={{ color: V.warn, fontWeight: 600 }}>{contact.warning}</span>
                      )}
                    </div>
                  </div>

                  {/* Right */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '10px', color: contact.urgent ? V.hot : V.textLo, fontWeight: contact.urgent ? 700 : 400 }}>
                      {contact.nextTime}
                    </div>
                    <div style={{ fontSize: '14px', marginTop: '2px' }}>
                      {contact.nextChannel}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ─── RIGHT: DETAIL PANEL ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', borderBottom: `1px solid ${V.line}`, paddingBottom: '8px' }}>
            <button
              onClick={() => setDetailTab('sequence')}
              style={{
                padding: '8px 14px',
                borderRadius: '8px 8px 0 0',
                border: 'none',
                cursor: 'pointer',
                background: detailTab === 'sequence' ? V.surface2 : 'transparent',
                color: detailTab === 'sequence' ? V.textHi : V.textMid,
                fontSize: '12px',
                fontFamily: 'inherit',
                borderBottom: `2px solid ${detailTab === 'sequence' ? V.gold : 'transparent'}`,
                fontWeight: detailTab === 'sequence' ? 700 : 400,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              Séquence & Messages
            </button>
            <button
              onClick={() => setDetailTab('history')}
              style={{
                padding: '8px 14px',
                borderRadius: '8px 8px 0 0',
                border: 'none',
                cursor: 'pointer',
                background: detailTab === 'history' ? V.surface2 : 'transparent',
                color: detailTab === 'history' ? V.textHi : V.textMid,
                fontSize: '12px',
                fontFamily: 'inherit',
                borderBottom: `2px solid ${detailTab === 'history' ? V.gold : 'transparent'}`,
                fontWeight: detailTab === 'history' ? 700 : 400,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              Historique{' '}
              <span
                style={{
                  fontSize: '9px',
                  padding: '1px 5px',
                  borderRadius: '8px',
                  background: detailTab === 'history' ? 'rgba(232,200,120,0.15)' : V.surface3,
                  color: detailTab === 'history' ? V.gold : V.textLo,
                  fontWeight: 700,
                }}
              >
                {interactions.length}
              </span>
            </button>
            <button
              onClick={() => setDetailTab('config')}
              style={{
                padding: '8px 14px',
                borderRadius: '8px 8px 0 0',
                border: 'none',
                cursor: 'pointer',
                background: detailTab === 'config' ? V.surface2 : 'transparent',
                color: detailTab === 'config' ? V.textHi : V.textMid,
                fontSize: '12px',
                fontFamily: 'inherit',
                borderBottom: `2px solid ${detailTab === 'config' ? V.gold : 'transparent'}`,
                fontWeight: detailTab === 'config' ? 700 : 400,
              }}
            >
              Config
            </button>
          </div>

          {/* Panel content */}
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
            {!selectedContact && (
              <div style={{ padding: '40px', textAlign: 'center', color: V.textMid }}>
                Sélectionnez un contact pour voir les détails
              </div>
            )}

            {selectedContact && detailTab === 'sequence' && (
              <div>
                {/* Prospect header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '16px',
                    padding: '12px 16px',
                    background: colors.bg,
                    borderRadius: '12px',
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <div style={{ fontSize: '24px' }}>{selectedContact.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: V.textHi }}>{selectedContact.name}</div>
                    <div style={{ fontSize: '11px', color: V.textMid, display: 'flex', gap: '10px', marginTop: '3px' }}>
                      <span>{selectedContact.job} · {selectedContact.stage || 'Prospect'}</span>
                      <span style={{ color: V.gold }}>📊 Retraite TNS, Prévoyance</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <span style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '4px', background: 'rgba(232,200,120,0.12)', color: V.gold, border: '1px solid rgba(232,200,120,0.2)', fontWeight: 600 }}>
                      📞 Préféré
                    </span>
                    <span style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '4px', background: `${pressure.color}20`, color: pressure.color, border: `1px solid ${pressure.color}40`, fontWeight: 600 }}>
                      {pressure.label}
                    </span>
                  </div>
                </div>

                {/* KPIs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
                  <div style={{ background: V.surface1, border: `1px solid ${V.line}`, borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: V.hot }}>{selectedContact.icon}</div>
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

                {/* Recommendation IA */}
                <div
                  style={{
                    background: 'rgba(232,200,120,0.05)',
                    border: '1px solid rgba(232,200,120,0.18)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <span style={{ fontSize: '16px' }}>💡</span>
                  <div style={{ fontSize: '11px', color: V.textMid, flex: 1 }}>
                    Canal le plus efficace : <strong style={{ color: V.textHi }}>✉️ email</strong> (67% réponses). {selectedContact.no_responses} relances sans réponse — envisager un changement de canal.
                  </div>
                  <button
                    style={{
                      padding: '5px 10px',
                      borderRadius: '6px',
                      border: '1px solid rgba(232,200,120,0.3)',
                      background: 'transparent',
                      color: V.gold,
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    Appliquer
                  </button>
                </div>

                {/* SEQUENCE TIMELINE */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: V.textHi, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>▶ Séquence active</span>
                      <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(76,175,80,0.12)', color: V.green }}>
                        En cours · Étape 3/6
                      </span>
                    </div>
                    <button style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '6px', border: `1px solid ${V.line}`, background: 'transparent', color: V.text, cursor: 'pointer' }}>
                      Modifier séquence
                    </button>
                  </div>

                  <div style={{ position: 'relative', paddingLeft: '20px' }}>
                    <div
                      style={{
                        content: '',
                        position: 'absolute',
                        left: '8px',
                        top: '12px',
                        bottom: '12px',
                        width: '2px',
                        background: `linear-gradient(to bottom, ${V.gold}, ${V.cyan}, ${V.line})`,
                        borderRadius: '1px',
                      }}
                    />
                    {sequenceSteps.map((step) => (
                      <div
                        key={step.id}
                        style={{
                          position: 'relative',
                          padding: '10px 14px',
                          marginBottom: '8px',
                          borderRadius: '10px',
                          background: V.surface1,
                          border: `1px solid ${V.line}`,
                        }}
                      >
                        <div
                          style={{
                            content: '',
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
                          <div style={{ fontSize: '12px', fontWeight: 500, color: step.status === 'upcoming' ? V.textMid : V.textHi, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{step.icon}</span> {step.label}
                          </div>
                          <div style={{ fontSize: '10px', color: step.status === 'current' ? V.hot : V.textLo, fontWeight: step.status === 'current' ? 600 : 400 }}>
                            {step.date}
                          </div>
                        </div>
                        <div style={{ fontSize: '11px', color: step.status === 'upcoming' ? V.textLo : V.textMid, marginTop: '4px', lineHeight: '1.4' }}>
                          {step.preview}
                        </div>
                        {step.status === 'current' && (
                          <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                            <button style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '6px', border: 'none', background: V.gold, color: V.bgDeep, cursor: 'pointer', fontWeight: 600 }}>
                              📞 Exécuter maintenant
                            </button>
                            <button style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '6px', border: `1px solid ${V.line}`, background: 'transparent', color: V.text, cursor: 'pointer' }}>
                              Reporter +2j
                            </button>
                            <button style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '6px', border: `1px solid ${V.line}`, background: 'transparent', color: V.text, cursor: 'pointer' }}>
                              Changer canal
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
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
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        marginTop: '4px',
                      }}
                    >
                      + Ajouter une étape à la séquence
                    </button>
                  </div>
                </div>

                {/* QUICK COMPOSE (partie simplement affichée pour l'instant, l'envoi sera implémenté plus tard) */}
                <div
                  style={{
                    position: 'relative',
                    background: 'rgba(232,200,120,0.04)',
                    border: '1px solid rgba(232,200,120,0.18)',
                    borderRadius: '14px',
                    padding: '18px',
                    marginBottom: '20px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: V.gold, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Composer un message
                    </div>
                    <span style={{ fontSize: '9px', color: V.textLo }}>Variables auto-remplies : {'{prenom}, {metier}, {theme}'}</span>
                  </div>

                  {/* Channel selector */}
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                    {['call', 'email', 'whatsapp', 'linkedin', 'sms'].map((ch) => (
                      <button
                        key={ch}
                        onClick={() => setSelectedChannel(ch as Channel)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: `1px solid ${selectedChannel === ch ? V.gold : V.line}`,
                          background: selectedChannel === ch ? 'rgba(232,200,120,0.12)' : V.surface2,
                          color: selectedChannel === ch ? V.gold : V.textMid,
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        {ch === 'call' ? '📞 Appel' : ch === 'email' ? '✉️ Email' : ch === 'whatsapp' ? '💬 WhatsApp' : ch === 'linkedin' ? '🔗 LinkedIn' : '📱 SMS'}
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
                      <optgroup label="✉️ Email">
                        <option>Relance post-RDV retraite TNS</option>
                        <option>Email — envoi simulateur + relance douce</option>
                        <option>Micro-relance après 3 NR</option>
                      </optgroup>
                      <optgroup label="💬 WhatsApp">
                        <option>WhatsApp J+5 après envoi doc</option>
                      </optgroup>
                      <optgroup label="📞 Appel">
                        <option>Appel relance après silence</option>
                      </optgroup>
                      <optgroup label="🔗 LinkedIn">
                        <option>LinkedIn — message de valeur</option>
                      </optgroup>
                    </select>
                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: V.textLo, fontSize: '10px', pointerEvents: 'none' }}>▼</span>
                  </div>

                  {/* Textarea */}
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Rédigez votre message ici ou sélectionnez un template..."
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
                      lineHeight: '1.6',
                      outline: 'none',
                    }}
                  />

                  {/* Library picker (simplified overlay) */}
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
                      <div style={{ fontSize: '11px', color: V.textMid, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Bibliothèque de documents
                      </div>
                      {/* Document items */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', marginBottom: '4px' }}>
                        <div style={{ fontSize: '18px', flexShrink: 0 }}>📊</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '12px', fontWeight: 500, color: V.textHi }}>Simulateur Retraite TNS</div>
                          <div style={{ fontSize: '10px', color: V.textLo, marginTop: '2px' }}>PDF · email, whatsapp</div>
                        </div>
                        <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(76,175,80,0.12)', color: V.green }}>Retraite</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', marginBottom: '4px' }}>
                        <div style={{ fontSize: '18px', flexShrink: 0 }}>📄</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '12px', fontWeight: 500, color: V.textHi }}>Guide SCPI 2026</div>
                          <div style={{ fontSize: '10px', color: V.textLo, marginTop: '2px' }}>PDF · email, courrier</div>
                        </div>
                        <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(232,200,120,0.12)', color: V.gold }}>Immobilier</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer' }}>
                        <div style={{ fontSize: '18px', flexShrink: 0 }}>🖼️</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '12px', fontWeight: 500, color: V.textHi }}>Infographie Loi Girardin</div>
                          <div style={{ fontSize: '10px', color: V.textLo, marginTop: '2px' }}>Image · email, linkedin</div>
                        </div>
                        <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(129,140,248,0.12)', color: V.indigo }}>Défiscalisation</span>
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: V.gold, color: V.bgDeep, fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                        📞 Exécuter
                      </button>
                      <button style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '6px', border: `1px solid ${V.line}`, background: 'transparent', color: V.text, cursor: 'pointer' }}>
                        💾 Sauver template
                      </button>
                      <button
                        onClick={() => setLibraryOpen(!libraryOpen)}
                        style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '6px', border: `1px solid ${V.line}`, background: 'transparent', color: V.text, cursor: 'pointer' }}
                      >
                        📄 Joindre document
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '6px', border: `1px solid ${V.line}`, background: 'transparent', color: V.text, cursor: 'pointer' }}>
                        📅 Planifier
                      </button>
                      <span style={{ fontSize: '9px', color: V.textLo }}>ou ajouter à la séquence</span>
                    </div>
                  </div>
                </div>

                {/* Prochaines actions planifiées */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: V.textHi }}>📅 Prochaines actions planifiées</div>
                    <button style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '6px', border: `1px solid ${V.line}`, background: 'transparent', color: V.text, cursor: 'pointer' }}>
                      + Planifier
                    </button>
                  </div>
                  <div style={{ background: V.surface1, border: `1px solid ${V.line}`, borderRadius: '12px', padding: '14px' }}>
                    {[
                      { date: 'Aujourd\'hui', label: 'Appel relance retraite TNS', icon: '📞', urgent: true },
                      { date: '20 juil.', label: 'Envoi Simulateur Retraite (PDF)', icon: '📄' },
                      { date: '24 juil.', label: 'LinkedIn — partage article retraite', icon: '🔗' },
                      { date: '28 juil.', label: 'WhatsApp — micro-relance', icon: '💬' },
                    ].map((action, idx, arr) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 0',
                          borderBottom: idx < arr.length - 1 ? '1px solid rgba(42,52,112,0.4)' : 'none',
                        }}
                      >
                        <div style={{ fontSize: '11px', color: action.urgent ? V.hot : V.textMid, minWidth: '85px', fontWeight: action.urgent ? 600 : 500 }}>
                          {action.date}
                        </div>
                        <div style={{ fontSize: '12px', color: V.textHi, flex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{action.icon}</span> {action.label}
                        </div>
                        <div style={{ fontSize: '10px', color: V.textLo, cursor: 'pointer', padding: '3px 8px', borderRadius: '4px', border: '1px solid transparent' }}>
                          Modifier
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {selectedContact && detailTab === 'history' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: V.textHi }}>Historique des interactions</div>
                  <span style={{ fontSize: '10px', color: V.textLo }}>{interactions.length} total</span>
                </div>

                {/* Channel stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '20px' }}>
                  <div style={{ background: V.surface1, border: `1px solid ${V.line}`, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '16px' }}>📞</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: V.warn, marginTop: '4px' }}>40%</div>
                    <div style={{ fontSize: '9px', color: V.textLo }}>2/5 rép.</div>
                  </div>
                  <div style={{ background: 'rgba(232,200,120,0.06)', border: '1px solid rgba(232,200,120,0.25)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '16px' }}>✉️</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: V.green, marginTop: '4px' }}>67%</div>
                    <div style={{ fontSize: '9px', color: V.textLo }}>2/3 rép.</div>
                    <div style={{ fontSize: '8px', color: V.gold, fontWeight: 700, marginTop: '2px' }}>MEILLEUR</div>
                  </div>
                  <div style={{ background: V.surface1, border: `1px solid ${V.line}`, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '16px' }}>💬</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: V.textMid, marginTop: '4px' }}>33%</div>
                    <div style={{ fontSize: '9px', color: V.textLo }}>1/3 rép.</div>
                  </div>
                  <div style={{ background: V.surface1, border: `1px solid ${V.line}`, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '16px' }}>🔗</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: V.textLo, marginTop: '4px' }}>0%</div>
                    <div style={{ fontSize: '9px', color: V.textLo }}>0/1</div>
                  </div>
                  <div style={{ background: V.surface1, border: `1px solid ${V.line}`, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '16px' }}>📱</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: V.textLo, marginTop: '4px' }}>—</div>
                    <div style={{ fontSize: '9px', color: V.textLo }}>jamais</div>
                  </div>
                </div>

                {/* Timeline */}
                <div style={{ background: V.surface1, border: `1px solid ${V.line}`, borderRadius: '12px', padding: '14px' }}>
                  {interactions.length === 0 && (
                    <div style={{ padding: '20px', textAlign: 'center', color: V.textMid }}>Aucune interaction enregistrée</div>
                  )}
                  {interactions.map((interaction) => (
                    <div
                      key={interaction.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 10px',
                        borderRadius: '8px',
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
                    <button style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '6px', border: `1px solid ${V.line}`, background: 'transparent', color: V.text, cursor: 'pointer' }}>
                      📞 Appel fait
                    </button>
                    <button style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '6px', border: `1px solid ${V.line}`, background: 'transparent', color: V.text, cursor: 'pointer' }}>
                      ✉️ Email envoyé
                    </button>
                    <button style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '6px', border: `1px solid ${V.line}`, background: 'transparent', color: V.text, cursor: 'pointer' }}>
                      💬 WhatsApp envoyé
                    </button>
                    <button style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '6px', border: `1px solid ${V.line}`, background: 'transparent', color: V.text, cursor: 'pointer' }}>
                      🔗 LinkedIn envoyé
                    </button>
                    <button style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '6px', border: `1px solid ${V.line}`, background: 'transparent', color: V.text, cursor: 'pointer' }}>
                      📅 RDV pris
                    </button>
                    <button style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '6px', border: '1px solid rgba(255,100,112,0.3)', background: 'transparent', color: V.red, cursor: 'pointer' }}>
                      🚫 Refus
                    </button>
                  </div>
                </div>
              </div>
            )}

            {selectedContact && detailTab === 'config' && (
              <div>
                <div style={{ background: V.surface1, border: '1px solid rgba(232,200,120,0.2)', borderRadius: '12px', padding: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: V.gold }}>Configuration nurturing — {selectedContact.name}</div>
                    <button style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '6px', border: 'none', background: V.gold, color: V.bgDeep, cursor: 'pointer', fontWeight: 600 }}>
                      💾 Sauvegarder
                    </button>
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
                        <option selected>Bi-mensuel (14j)</option>
                        <option>Mensuel (30j)</option>
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: V.textMid, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Créneau préféré</div>
                      <select style={{ padding: '7px 10px', borderRadius: '8px', border: `1px solid ${V.line}`, background: V.surface2, color: V.text, fontSize: '12px', fontFamily: 'inherit', width: '100%', outline: 'none' }}>
                        <option selected>Matin (8h-12h)</option>
                        <option>Après-midi (14h-18h)</option>
                        <option>Soir (18h-20h)</option>
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: V.textMid, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pression max</div>
                      <select style={{ padding: '7px 10px', borderRadius: '8px', border: `1px solid ${V.line}`, background: V.surface2, color: V.text, fontSize: '12px', fontFamily: 'inherit', width: '100%', outline: 'none' }}>
                        <option>2 par mois</option>
                        <option selected>4 par mois</option>
                        <option>6 par mois</option>
                      </select>
                    </div>
                    <div style={{ gridColumn: '1/-1' }}>
                      <div style={{ fontSize: '10px', color: V.textMid, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Canaux exclus</div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                        <button style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '6px', border: `1px solid ${V.line}`, background: 'transparent', color: V.text, cursor: 'pointer' }}>📞</button>
                        <button style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '6px', border: `1px solid ${V.line}`, background: 'transparent', color: V.text, cursor: 'pointer' }}>✉️</button>
                        <button style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '6px', border: `1px solid ${V.line}`, background: 'transparent', color: V.text, cursor: 'pointer' }}>💬</button>
                        <button style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '6px', border: `1px solid ${V.line}`, background: 'transparent', color: V.text, cursor: 'pointer' }}>🔗</button>
                        <button style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '6px', border: '1px solid rgba(255,100,112,0.3)', background: 'transparent', color: V.red, cursor: 'pointer', textDecoration: 'line-through' }}>📬</button>
                        <button style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '6px', border: `1px solid ${V.line}`, background: 'transparent', color: V.text, cursor: 'pointer' }}>📱</button>
                      </div>
                    </div>
                    <div style={{ gridColumn: '1/-1' }}>
                      <div style={{ fontSize: '10px', color: V.textMid, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Thèmes identifiés</div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                        <span style={{ padding: '5px 10px', borderRadius: '6px', background: 'rgba(76,175,80,0.12)', color: V.green, fontSize: '11px', fontWeight: 600, border: '1px solid rgba(76,175,80,0.2)' }}>
                          📊 Retraite TNS
                        </span>
                        <span style={{ padding: '5px 10px', borderRadius: '6px', background: 'rgba(167,139,250,0.12)', color: V.purple, fontSize: '11px', fontWeight: 600, border: '1px solid rgba(167,139,250,0.2)' }}>
                          🛡️ Prévoyance
                        </span>
                        <button style={{ padding: '5px 10px', fontSize: '10px', borderRadius: '6px', border: `1px solid ${V.line}`, background: 'transparent', color: V.text, cursor: 'pointer' }}>+ Ajouter</button>
                      </div>
                    </div>
                    <div style={{ gridColumn: '1/-1' }}>
                      <div style={{ fontSize: '10px', color: V.textMid, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Notes personnelles</div>
                      <textarea
                        defaultValue={selectedContact.notes}
                        style={{
                          width: '100%',
                          minHeight: '60px',
                          padding: '12px 14px',
                          borderRadius: '10px',
                          border: `1px solid ${V.line}`,
                          background: V.surface1,
                          color: V.textHi,
                          fontSize: '12px',
                          fontFamily: 'inherit',
                          resize: 'vertical',
                          lineHeight: '1.6',
                          outline: 'none',
                          marginTop: '4px',
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
