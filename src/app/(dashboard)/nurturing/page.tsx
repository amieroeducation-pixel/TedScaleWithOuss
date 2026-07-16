'use client'

import { useState } from 'react'
import { C } from '@/lib/theme'
import { saveLastSection } from '@/lib/navigation-state'
import { useEffect } from 'react'

// ─── TYPES ───────────────────────────────────────────────────────────────────

type TemperatureLevel = 'hot' | 'warm' | 'cold' | 'dead'
type PressureLevel = 'normal' | 'elevee' | 'a_stopper'
type Tab = 'overview' | 'contacts' | 'documents' | 'messages' | 'settings'

// ─── TEMPERATURE CONFIG ──────────────────────────────────────────────────────

const CARD_BG_TEXTURE = 'https://media.istockphoto.com/id/2061680164/fr/photo/fond-de-texture-de-basalte-de-pierre-de-roche-de-granit-de-roche-brun-fonc%C3%A9-noir-surface-des.jpg?s=612x612&w=0&k=20&c=jHAF29X3opSh64jeZDLF8YhW3qPR7ASgjpz1CV2qTvo='

const TEMP_IMAGE: Record<TemperatureLevel, string> = {
  hot: '/nurturing/flame.png',
  warm: '/nurturing/sun.png.png',
  cold: '/nurturing/ice.png.png',
  dead: '/nurturing/earth.png.png',
}

const TEMP_CONFIG: Record<TemperatureLevel, { color: string; label: string; icon: string; gradient: string }> = {
  hot: {
    color: '#ff4444',
    label: 'Brûlant',
    icon: '🔥',
    gradient: 'linear-gradient(135deg, #2d0808 0%, #4a1010 30%, #3d0808 60%, #1a0505 100%)',
  },
  warm: {
    color: '#d4a020',
    label: 'Tiède',
    icon: '☀️',
    gradient: 'linear-gradient(135deg, #2d2208 0%, #3d2e0a 30%, #2d2208 60%, #1a1505 100%)',
  },
  cold: {
    color: '#5b9bd5',
    label: 'Froid',
    icon: '❄️',
    gradient: 'linear-gradient(135deg, #081520 0%, #0c2040 30%, #0a1a30 60%, #050e1a 100%)',
  },
  dead: {
    color: '#8B4513',
    label: 'Enterré',
    icon: '🪨',
    gradient: 'linear-gradient(135deg, #1a1008 0%, #25180a 30%, #1a1008 60%, #0f0a05 100%)',
  },
}

const PRESSURE_CONFIG: Record<PressureLevel, { color: string; label: string; icon: string }> = {
  normal:    { color: C.green, label: 'Normale', icon: '✓' },
  elevee:    { color: C.warn, label: 'Élevée', icon: '⚡' },
  a_stopper: { color: '#ff6470', label: 'À stopper', icon: '🛑' },
}

// ─── MOCK DATA ───────────────────────────────────────────────────────────────

interface Contact {
  id: string
  full_name: string
  profession: string
  temperature: TemperatureLevel
  pressure: PressureLevel
  category: string | null
  sequence_active: string | null
  total_touchpoints: number
  responded_touchpoints: number
  nb_relances_sans_reponse: number
  next_action_date: string | null
  next_action_channel: string | null
  last_contact_at: string | null
}

const MOCK_CONTACTS: Contact[] = [
  {
    id: '1',
    full_name: 'Jean Dupont',
    profession: 'Dentiste',
    temperature: 'hot',
    pressure: 'normal',
    category: '📅 RDV fait →',
    sequence_active: null,
    total_touchpoints: 5,
    responded_touchpoints: 2,
    nb_relances_sans_reponse: 3,
    next_action_date: new Date().toISOString().split('T')[0],
    next_action_channel: '📞',
    last_contact_at: '5j',
  },
  {
    id: '2',
    full_name: 'Marie Laurent',
    profession: 'Avocate',
    temperature: 'warm',
    pressure: 'normal',
    category: null,
    sequence_active: '▶ Séquence',
    total_touchpoints: 8,
    responded_touchpoints: 5,
    nb_relances_sans_reponse: 0,
    next_action_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    next_action_channel: '✉️',
    last_contact_at: null,
  },
  {
    id: '3',
    full_name: 'Thomas Bernard',
    profession: 'Kinésithérapeute',
    temperature: 'cold',
    pressure: 'elevee',
    category: null,
    sequence_active: null,
    total_touchpoints: 2,
    responded_touchpoints: 0,
    nb_relances_sans_reponse: 2,
    next_action_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    next_action_channel: '💬',
    last_contact_at: null,
  },
  {
    id: '4',
    full_name: 'Sophie Moreau',
    profession: 'Notaire',
    temperature: 'dead',
    pressure: 'a_stopper',
    category: null,
    sequence_active: null,
    total_touchpoints: 6,
    responded_touchpoints: 1,
    nb_relances_sans_reponse: 5,
    next_action_date: null,
    next_action_channel: null,
    last_contact_at: '45j',
  },
]

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function NurturingPage() {
  const [tab, setTab] = useState<Tab>('contacts')
  const [contacts] = useState<Contact[]>(MOCK_CONTACTS)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null)
  const [selectedChannel, setSelectedChannel] = useState<string>('📞 Appel')

  useEffect(() => { saveLastSection('/nurturing') }, [])

  // ─── RENDER ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '24px 32px', fontFamily: 'JetBrains Mono, monospace', color: C.text, minHeight: '100vh', maxWidth: 1400, margin: '0 auto' }}>

      {/* ═══ HEADER ═══ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 28, fontFamily: 'Oswald, sans-serif', color: C.textHi, fontWeight: 600, letterSpacing: 1 }}>
            NURTURING
          </h1>
          <p style={{ fontSize: 12, color: C.textMid, marginTop: 4 }}>
            Maturation & relances · 47 contacts actifs
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: 'pointer', background: `${C.gold}16`, color: C.gold, border: `1px solid ${C.gold}40` }}>
              CRM <strong>12</strong>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: 'pointer', background: 'rgba(167,139,250,0.1)', color: C.purple, border: '1px solid rgba(167,139,250,0.25)' }}>
              Cercle <strong>8</strong>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: 'pointer', background: `${C.green}16`, color: C.green, border: `1px solid ${C.green}40` }}>
              Séquences <strong>5</strong>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: 'pointer', background: `${C.cyan}16`, color: C.cyan, border: `1px solid ${C.cyan}40` }}>
              Today <strong>7</strong>
            </span>
          </div>
          <button style={{ padding: '6px 10px', borderRadius: 6, background: `${C.gold}12`, color: C.gold, border: `1px solid ${C.gold}40`, fontSize: 11, cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace' }}>
            🔄 Recalculer scores
          </button>
        </div>
      </div>

      {/* ═══ TAB BAR ═══ */}
      <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${C.line}`, paddingBottom: 12, marginBottom: 24 }}>
        {[
          { id: 'overview' as Tab, label: '📊 Vue globale', count: null },
          { id: 'contacts' as Tab, label: '👥 Contacts', count: 47 },
          { id: 'documents' as Tab, label: '📄 Bibliothèque', count: 12 },
          { id: 'messages' as Tab, label: '💬 Messages', count: 8 },
          { id: 'settings' as Tab, label: '⚙️ Configuration', count: null },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px 8px 0 0',
              border: 'none',
              cursor: 'pointer',
              background: tab === t.id ? C.surface2 : 'transparent',
              color: tab === t.id ? C.textHi : C.textMid,
              fontSize: 12,
              fontWeight: tab === t.id ? 700 : 400,
              fontFamily: 'JetBrains Mono, monospace',
              borderBottom: tab === t.id ? `2px solid ${C.gold}` : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s',
            }}
          >
            {t.label}
            {t.count !== null && (
              <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 8, background: tab === t.id ? `${C.gold}25` : C.surface3, color: tab === t.id ? C.gold : C.textLo, fontWeight: 700 }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ═══ OVERVIEW TAB ═══ */}
      {tab === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
            <KpiCard value={47} label="En nurturing" icon="👥" />
            <KpiCard value={7} label="À traiter" icon="⚡" highlight />
            <KpiCard value={9} label="Chauds" icon="🔥" />
            <KpiCard value={3} label="Sur-sollicités" icon="🛑" />
            <KpiCard value={11} label="Sans action" icon="😴" />
          </div>

          {/* Mini Calendar */}
          <div style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, color: C.textHi }}>Planning 7 jours</h3>
              <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: `${C.gold}12`, color: C.gold, border: `1px solid ${C.gold}32`, cursor: 'pointer' }}>
                Voir dans Today →
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { day: 'LUN', date: 16, dots: ['#ff4444', '#ff4444', '#d4a020'], count: 3, today: true },
                { day: 'MAR', date: 17, dots: ['#d4a020', '#5b9bd5'], count: 2, today: false },
                { day: 'MER', date: 18, dots: ['#ff4444'], count: 1, today: false },
                { day: 'JEU', date: 19, dots: ['#d4a020', '#d4a020', '#5b9bd5', '#5b9bd5'], count: 4, today: false },
                { day: 'VEN', date: 20, dots: ['#5b9bd5'], count: 1, today: false },
                { day: 'SAM', date: 21, dots: [], count: 0, today: false },
                { day: 'DIM', date: 22, dots: [], count: 0, today: false },
              ].map((d, i) => (
                <div key={i} style={{ flex: 1, textAlign: 'center', padding: '8px 4px', borderRadius: 8, background: C.surface2, border: d.today ? `1px solid ${C.gold}` : `1px solid ${C.line}` }}>
                  <div style={{ fontSize: 9, color: d.today ? C.gold : C.textLo, fontWeight: d.today ? 700 : 400 }}>{d.day}</div>
                  <div style={{ fontSize: 12, color: C.textHi, fontWeight: 600, margin: '4px 0' }}>{d.date}</div>
                  <div style={{ minHeight: 12 }}>
                    {d.dots.map((color, j) => (
                      <span key={j} style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: color, margin: '1px' }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 9, color: d.today ? C.gold : C.textLo, marginTop: 3 }}>
                    {d.count > 0 ? `${d.count} action${d.count > 1 ? 's' : ''}` : '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Conversion Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
            <MetricPill icon="📈" value="23%" label="Taux nurturing → RDV" color={C.green} />
            <MetricPill icon="⏱️" value="18j" label="Temps moyen → conversion" color={C.textHi} />
            <MetricPill icon="🔄" value="4" label="Réactivés ce mois" color={C.cyan} />
          </div>
        </div>
      )}

      {/* ═══ CONTACTS TAB ═══ */}
      {tab === 'contacts' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: C.gold, color: C.bgDeep, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace' }}>
                + Nouveau contact
              </button>
              <button style={{ padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: C.gold, background: C.surface2 }}>
                Ouvrir CRM Kanban
              </button>
              <button style={{ padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: C.cyan, background: C.surface2 }}>
                Prospecter TNS
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
            <input placeholder="Rechercher un contact..." style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${C.line}`, background: C.surface2, color: C.textHi, fontSize: 12, fontFamily: 'JetBrains Mono, monospace', width: 220 }} />
            <select style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${C.line}`, background: C.surface2, color: C.text, fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>
              <option>Température</option>
              <option>🔥 Brûlant</option>
              <option>☀️ Tiède</option>
              <option>❄️ Froid</option>
              <option>🪨 Enterré</option>
            </select>
            <select style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${C.line}`, background: C.surface2, color: C.text, fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>
              <option>Pression</option>
              <option>✓ Normale</option>
              <option>⚡ Élevée</option>
              <option>🛑 À stopper</option>
            </select>
          </div>

          <div style={{ fontSize: 11, color: C.textLo, marginBottom: 10 }}>47 résultats</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {contacts.map(c => (
              <ContactCard
                key={c.id}
                contact={c}
                onClick={() => setSelectedContact(c)}
                dropdownOpen={dropdownOpen === c.id}
                onToggleDropdown={(e) => {
                  e.stopPropagation()
                  setDropdownOpen(dropdownOpen === c.id ? null : c.id)
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ═══ DOCUMENTS TAB ═══ */}
      {tab === 'documents' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <button style={{ padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: C.text, background: C.surface3 }}>Tous</button>
              <button style={{ padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: C.text, background: C.surface2 }}>📊 Retraite TNS</button>
              <button style={{ padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: C.text, background: C.surface2 }}>🏠 Immobilier</button>
            </div>
            <button style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: C.gold, color: C.bgDeep, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace' }}>
              + Document
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <DocumentCard title="Simulateur Retraite TNS" type="PDF · email, whatsapp" tag="📊 Retraite TNS" tagColor={C.green} />
            <DocumentCard title="Guide SCPI 2026" type="PDF · email, courrier" tag="🏠 Immobilier" tagColor={C.gold} />
          </div>
        </div>
      )}

      {/* ═══ MESSAGES TAB ═══ */}
      {tab === 'messages' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <button style={{ padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: C.text, background: C.surface3 }}>Tous</button>
              <button style={{ padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: C.text, background: C.surface2 }}>✉️</button>
              <button style={{ padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: C.text, background: C.surface2 }}>💬</button>
              <button style={{ padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: C.text, background: C.surface2 }}>🔗</button>
            </div>
            <button style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: C.gold, color: C.bgDeep, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace' }}>
              + Message
            </button>
          </div>
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <h3 style={{ fontSize: 13, color: C.gold }}>SUGGESTIONS D'EXPERTS PPP/Vendue</h3>
            </div>
            <SuggestionCard
              icon="✉️"
              title="Relance contextualisée après rencontre"
              preview="{Prénom}, on a échangé {lieu} — votre situation m'a interpellé..."
              tip="💡 Les 2 premières lignes sont décisives. Ancrez dans un contexte réel partagé."
            />
            <SuggestionCard
              icon="💬"
              title="Micro-relance WhatsApp (J+5)"
              preview="Court, pas intrusif, offre une porte de sortie. Un vocal 30s vaut 10 messages écrits."
              tip="💡 Règle PPP2: Max 2 touchpoints/semaine, jamais 2 canaux le même jour."
            />
          </div>
        </div>
      )}

      {/* ═══ SETTINGS TAB ═══ */}
      {tab === 'settings' && (
        <div style={{ maxWidth: 720 }}>
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 15, color: C.textHi, marginBottom: 12 }}>Cadence recommandée PPP2</h3>
            <div style={{ background: C.surface1, border: `1px solid ${C.gold}32`, borderRadius: 12, padding: 16 }}>
              <h4 style={{ fontSize: 11, color: C.gold, marginBottom: 10, textTransform: 'uppercase' }}>Séquence optimale B2B</h4>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, background: C.surface2, color: C.textHi, display: 'flex', alignItems: 'center', gap: 4 }}>✉️ email</span>
                <span style={{ color: C.textLo, fontSize: 10 }}>→</span>
                <span style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, background: C.surface2, color: C.textHi }}>🔗 linkedin</span>
                <span style={{ color: C.textLo, fontSize: 10 }}>→</span>
                <span style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, background: C.surface2, color: C.textHi }}>📞 téléphone</span>
                <span style={{ color: C.textLo, fontSize: 10 }}>→</span>
                <span style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, background: C.surface2, color: C.textHi }}>💬 whatsapp</span>
                <span style={{ color: C.textLo, fontSize: 10 }}>→</span>
                <span style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, background: C.surface2, color: C.textHi }}>✉️ email rupture</span>
              </div>
              <div style={{ fontSize: 10, color: C.textLo, marginTop: 8 }}>
                6 touches max prospect froid · 8 touches tiède · 5 touches post-RDV
              </div>
            </div>
            <div style={{ background: 'rgba(255,100,112,0.05)', border: '1px solid rgba(255,100,112,0.15)', borderRadius: 10, padding: 12, marginTop: 12 }}>
              <div style={{ fontSize: 10, color: '#ff6470', fontWeight: 600, marginBottom: 4 }}>Règles anti-pression PPP2</div>
              <div style={{ fontSize: 10, color: C.textMid }}>• Max 2 touches/semaine, jamais 2 canaux le même jour</div>
              <div style={{ fontSize: 10, color: C.textMid }}>• STOP après 6 tentatives sans interaction (froid)</div>
              <div style={{ fontSize: 10, color: C.textMid }}>• Si 3 messages sans vue → STOP et changer de canal</div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL ═══ */}
      {selectedContact && (
        <div
          onClick={() => setSelectedContact(null)}
          style={{
            display: 'flex',
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            zIndex: 1000,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: C.bgMid,
              border: `1px solid ${C.line}`,
              borderRadius: 16,
              padding: 28,
              width: '100%',
              maxWidth: 900,
              maxHeight: '88vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 22, color: C.textHi }}>{selectedContact.full_name}</h2>
                <div style={{ fontSize: 11, color: C.textMid, marginTop: 4 }}>
                  {selectedContact.profession} · {TEMP_CONFIG[selectedContact.temperature].icon} {TEMP_CONFIG[selectedContact.temperature].label}
                </div>
              </div>
              <button onClick={() => setSelectedContact(null)} style={{ background: 'none', border: 'none', color: C.textLo, fontSize: 22, cursor: 'pointer' }}>✕</button>
            </div>

            {/* PPP2 Sequence Timeline */}
            <div style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <h4 style={{ fontSize: 11, color: C.cyan, marginBottom: 10, textTransform: 'uppercase' }}>⚡ Séquence en cours</h4>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '12px 0', position: 'relative' }}>
                {[
                  { icon: '📧', day: 'J+1', label: 'Email', status: 'done' },
                  { icon: '🔗', day: 'J+3', label: 'LinkedIn', status: 'done' },
                  { icon: '📞', day: 'J+7', label: 'Appel', status: 'current' },
                  { icon: '💬', day: 'J+10', label: 'WhatsApp', status: 'pending' },
                  { icon: '📧', day: 'J+14', label: 'Rupture', status: 'pending' },
                ].map((step, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 90, position: 'relative' }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: step.status === 'done' ? 'rgba(52,211,153,0.12)' : step.status === 'current' ? 'rgba(34,211,238,0.12)' : C.surface2,
                        border: step.status === 'done' ? `2px solid ${C.green}` : step.status === 'current' ? `2px solid ${C.cyan}` : `2px solid ${C.line}`,
                        fontSize: 14,
                        position: 'relative',
                        zIndex: 1,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        boxShadow: step.status === 'current' ? `0 0 12px ${C.cyan}50` : 'none',
                      }}
                    >
                      {step.icon}
                    </div>
                    <div style={{ fontSize: 9, color: C.textLo, marginTop: 4, fontWeight: 600 }}>{step.day}</div>
                    <div style={{ fontSize: 9, color: C.textMid, marginTop: 2 }}>{step.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Send message */}
            <div style={{ background: `${C.gold}06`, border: `1px solid ${C.gold}30`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <h4 style={{ fontSize: 11, color: C.gold, textTransform: 'uppercase', marginBottom: 12 }}>📨 Envoyer un message</h4>
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                {['📞 Appel', '✉️ Email', '💬 WhatsApp'].map(ch => (
                  <button
                    key={ch}
                    onClick={() => setSelectedChannel(ch)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: selectedChannel === ch ? `1px solid ${C.gold}` : `1px solid ${C.line}`,
                      background: selectedChannel === ch ? `${C.gold}20` : C.surface2,
                      color: selectedChannel === ch ? C.gold : C.textMid,
                      fontSize: 13,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {ch}
                  </button>
                ))}
              </div>
              <textarea
                style={{
                  width: '100%',
                  minHeight: 80,
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: `1px solid ${C.line}`,
                  background: C.surface2,
                  color: C.textHi,
                  fontSize: 12,
                  fontFamily: 'JetBrains Mono, monospace',
                  resize: 'vertical',
                  lineHeight: 1.5,
                }}
                placeholder="Votre message..."
                defaultValue="Bonjour Jean, c'est [votre_nom]. On s'est échangé lors de notre rendez-vous. Je vous appelle parce que j'ai finalisé la simulation retraite. Est-ce que vous avez 2 minutes ou je vous rappelle ?"
              />
              <div style={{ background: `${C.gold}10`, border: `1px solid ${C.gold}20`, borderRadius: 8, padding: '8px 10px', marginTop: 8 }}>
                <div style={{ fontSize: 10, color: C.gold, fontWeight: 600 }}>💡 Préconisation PPP — Téléphone</div>
                <div style={{ fontSize: 10, color: C.textMid, marginTop: 3 }}>
                  Identifiez-vous + contexte en 10s. UNE question ouverte. 2 min max si non qualifié. Meilleur créneau: mardi-jeudi 9h-11h30.
                </div>
              </div>
              <button style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: C.gold, color: C.bgDeep, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace', marginTop: 10 }}>
                📞 Appeler maintenant
              </button>
            </div>

            {/* Quick log */}
            <div style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 12, padding: 14 }}>
              <h4 style={{ fontSize: 11, color: C.textMid, marginBottom: 10, textTransform: 'uppercase' }}>✏️ Enregistrer une interaction</h4>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['📞 Appel fait', '✉️ Email envoyé', '💬 WhatsApp envoyé', '🔗 LinkedIn envoyé'].map(action => (
                  <button
                    key={action}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 8,
                      border: `1px dashed ${C.line}`,
                      background: 'transparent',
                      color: C.textMid,
                      fontSize: 11,
                      cursor: 'pointer',
                      fontFamily: 'JetBrains Mono, monospace',
                      transition: 'all 0.15s',
                    }}
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

function KpiCard({ value, label, icon, highlight }: { value: number; label: string; icon: string; highlight?: boolean }) {
  return (
    <div
      style={{
        background: highlight ? `${C.gold}10` : C.surface1,
        border: highlight ? `1px solid ${C.gold}64` : `1px solid ${C.line}`,
        borderRadius: 10,
        padding: '14px 16px',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'transform 0.1s',
      }}
    >
      <div style={{ fontSize: 20 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: highlight ? C.gold : C.indigo, marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 10, color: C.textMid, marginTop: 2 }}>{label}</div>
    </div>
  )
}

function MetricPill({ icon, value, label, color }: { icon: string; value: string; label: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 10 }}>
      <div style={{ fontSize: 22 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color }}>{value}</div>
        <div style={{ fontSize: 10, color: C.textMid }}>{label}</div>
      </div>
    </div>
  )
}

function ContactCard({ contact, onClick, dropdownOpen, onToggleDropdown }: {
  contact: Contact
  onClick: () => void
  dropdownOpen: boolean
  onToggleDropdown: (e: React.MouseEvent) => void
}) {
  const tempCfg = TEMP_CONFIG[contact.temperature]
  const pressureCfg = PRESSURE_CONFIG[contact.pressure]

  const formatNextAction = () => {
    if (!contact.next_action_date) return null
    const today = new Date().toISOString().split('T')[0]
    const actionDate = contact.next_action_date
    if (actionDate === today) return <span style={{ fontSize: 11, fontWeight: 700, color: '#ff4444' }}>🚨 Aujourd'hui</span>
    const daysUntil = Math.ceil((new Date(actionDate).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24))
    return <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>dans {daysUntil}j</span>
  }

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 16,
        padding: '16px 22px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        borderLeft: `5px solid ${tempCfg.color}`,
        background: tempCfg.gradient,
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px) scale(1.005)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)'
      }}
    >
      {/* Texture basalt */}
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        backgroundImage: `url('${CARD_BG_TEXTURE}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 0.08,
      }} />

      {/* PNG image */}
      <div style={{
        position: 'absolute',
        right: -10,
        bottom: -10,
        width: 140,
        height: 140,
        pointerEvents: 'none',
        backgroundSize: 'contain',
        backgroundPosition: 'bottom right',
        backgroundRepeat: 'no-repeat',
        opacity: 0.18,
        backgroundImage: `url('${TEMP_IMAGE[contact.temperature]}')`,
      }} />

      {/* Glow effects */}
      <div style={{
        position: 'absolute',
        top: -30,
        right: -30,
        width: 140,
        height: 140,
        borderRadius: '50%',
        pointerEvents: 'none',
        background: contact.temperature === 'hot'
          ? 'radial-gradient(circle, rgba(255,68,68,0.15) 0%, transparent 65%)'
          : contact.temperature === 'warm'
          ? 'radial-gradient(circle, rgba(212,160,32,0.12) 0%, transparent 65%)'
          : contact.temperature === 'cold'
          ? 'radial-gradient(circle, rgba(91,155,213,0.12) 0%, transparent 65%)'
          : 'radial-gradient(circle, rgba(139,69,19,0.1) 0%, transparent 65%)',
      }} />
      <div style={{
        position: 'absolute',
        bottom: -20,
        left: -20,
        width: 100,
        height: 100,
        borderRadius: '50%',
        pointerEvents: 'none',
        background: contact.temperature === 'hot'
          ? 'radial-gradient(circle, rgba(255,68,68,0.08) 0%, transparent 60%)'
          : contact.temperature === 'warm'
          ? 'radial-gradient(circle, rgba(212,160,32,0.06) 0%, transparent 60%)'
          : contact.temperature === 'cold'
          ? 'radial-gradient(circle, rgba(91,155,213,0.06) 0%, transparent 60%)'
          : 'radial-gradient(circle, rgba(139,69,19,0.05) 0%, transparent 60%)',
      }} />

      {/* Avatar */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        width: 40,
        height: 40,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 20,
        background: contact.temperature === 'hot'
          ? 'radial-gradient(circle, rgba(255,68,68,0.3), rgba(255,68,68,0.1))'
          : contact.temperature === 'warm'
          ? 'radial-gradient(circle, rgba(212,160,32,0.25), rgba(212,160,32,0.08))'
          : contact.temperature === 'cold'
          ? 'radial-gradient(circle, rgba(91,155,213,0.25), rgba(91,155,213,0.08))'
          : 'radial-gradient(circle, rgba(139,69,19,0.2), rgba(139,69,19,0.05))',
        border: contact.temperature === 'hot'
          ? '2px solid rgba(255,68,68,0.5)'
          : contact.temperature === 'warm'
          ? '2px solid rgba(212,160,32,0.45)'
          : contact.temperature === 'cold'
          ? '2px solid rgba(91,155,213,0.45)'
          : '2px solid rgba(139,69,19,0.4)',
      }}>
        {tempCfg.icon}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
            {contact.full_name}
          </span>
          {contact.category && (
            <span style={{ fontSize: 10, color: C.gold, background: `${C.gold}20`, padding: '2px 7px', borderRadius: 4 }}>
              {contact.category}
            </span>
          )}
          {contact.sequence_active && (
            <span style={{ fontSize: 10, color: C.green, background: `${C.green}16`, padding: '2px 7px', borderRadius: 4 }}>
              {contact.sequence_active}
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 5, display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontWeight: 500 }}>{contact.profession}</span>
          <span>📊 {contact.total_touchpoints}tp · {contact.responded_touchpoints} rép.</span>
          {contact.nb_relances_sans_reponse > 0 && (
            <span style={{ color: C.warn, fontWeight: 600 }}>⚠ {contact.nb_relances_sans_reponse} sans réponse</span>
          )}
        </div>
      </div>

      {/* Pressure badge */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        fontSize: 10,
        padding: '4px 8px',
        borderRadius: 5,
        background: `${pressureCfg.color}20`,
        color: pressureCfg.color,
        fontWeight: 600,
      }}>
        {pressureCfg.icon} {pressureCfg.label}
      </div>

      {/* Next action */}
      <div style={{ textAlign: 'right', minWidth: 80, position: 'relative', zIndex: 1 }}>
        {formatNextAction()}
        {contact.last_contact_at && !contact.next_action_date && (
          <div style={{ fontSize: 11, color: C.textLo }}>il y a {contact.last_contact_at}</div>
        )}
        {contact.next_action_channel && (
          <div style={{ fontSize: 14, marginTop: 2 }}>{contact.next_action_channel}</div>
        )}
      </div>

      {/* Dropdown toggle */}
      <div
        onClick={onToggleDropdown}
        style={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 60,
          height: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)',
          borderRadius: '10px 10px 0 0',
          color: C.textLo,
          fontSize: 9,
          cursor: 'pointer',
          zIndex: 5,
          opacity: 0,
          transition: 'opacity 0.2s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
        onMouseLeave={(e) => { if (!dropdownOpen) e.currentTarget.style.opacity = '0' }}
      >
        {dropdownOpen ? '▲ Fermer' : '▼ Menu'}
      </div>

      {/* Dropdown */}
      {dropdownOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: C.surface1,
            borderTop: `1px solid ${C.line}`,
            padding: '10px 14px',
            zIndex: 10,
            borderRadius: '0 0 16px 16px',
          }}
        >
          <div style={{ display: 'flex', gap: 5, marginBottom: 8, flexWrap: 'wrap' }}>
            {contact.temperature !== 'dead' ? (
              <>
                <button style={{ padding: '4px 8px', borderRadius: 5, background: C.surface2, border: `1px solid ${C.line}`, color: C.textMid, fontSize: 10, cursor: 'pointer', transition: 'all 0.15s' }}>📞 Appeler</button>
                <button style={{ padding: '4px 8px', borderRadius: 5, background: C.surface2, border: `1px solid ${C.line}`, color: C.textMid, fontSize: 10, cursor: 'pointer', transition: 'all 0.15s' }}>💬 WhatsApp</button>
                <button style={{ padding: '4px 8px', borderRadius: 5, background: C.surface2, border: `1px solid ${C.line}`, color: C.textMid, fontSize: 10, cursor: 'pointer', transition: 'all 0.15s' }}>📧 Email</button>
                <button style={{ padding: '4px 8px', borderRadius: 5, background: C.surface2, border: `1px solid ${C.line}`, color: C.textMid, fontSize: 10, cursor: 'pointer', transition: 'all 0.15s' }}>🔗 LinkedIn</button>
              </>
            ) : (
              <button style={{ padding: '4px 8px', borderRadius: 5, background: C.surface2, border: `1px solid ${C.line}`, color: C.textMid, fontSize: 10, cursor: 'pointer', transition: 'all 0.15s' }}>📧 Email rupture</button>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 9, color: C.textLo }}>
            {contact.sequence_active ? (
              <>
                <span>Séquence: étape 3/6</span>
                <span style={{ background: 'rgba(255,100,112,0.12)', color: '#ff6470', padding: '2px 6px', borderRadius: 4, cursor: 'pointer' }}>⏸ Pause</span>
              </>
            ) : contact.temperature !== 'dead' ? (
              <>
                <span>Dernier: 📧 il y a {contact.last_contact_at || '?'}</span>
                <span style={{ background: `${C.gold}20`, color: C.gold, padding: '2px 6px', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}>▶ Lancer séquence</span>
              </>
            ) : (
              <span style={{ color: '#ff6470' }}>5 relances sans réponse — STOP recommandé</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function DocumentCard({ title, type, tag, tagColor }: { title: string; type: string; tag: string; tagColor: string }) {
  return (
    <div style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: C.textHi }}>{title}</div>
      <div style={{ fontSize: 11, color: C.textMid, marginTop: 3 }}>{type}</div>
      <span style={{ display: 'inline-block', marginTop: 8, fontSize: 10, padding: '2px 7px', borderRadius: 4, background: `${tagColor}20`, color: tagColor }}>
        {tag}
      </span>
    </div>
  )
}

function SuggestionCard({ icon, title, preview, tip }: { icon: string; title: string; preview: string; tip: string }) {
  return (
    <div style={{ background: `${C.gold}06`, border: `1px solid ${C.gold}20`, borderRadius: 12, padding: 14, marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 14 }}>{icon}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.textHi }}>{title}</span>
          </div>
          <div style={{ fontSize: 11, color: C.textMid, lineHeight: 1.5, marginBottom: 6 }}>{preview}</div>
          <div style={{ fontSize: 10, color: C.gold, fontStyle: 'italic' }}>{tip}</div>
        </div>
        <button style={{ padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', background: `${C.gold}16`, color: C.gold, marginLeft: 8 }}>
          ✏️ Adapter
        </button>
      </div>
    </div>
  )
}
