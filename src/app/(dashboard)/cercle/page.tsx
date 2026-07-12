'use client'

import { useState, useEffect } from 'react'
import { C } from '@/lib/theme'
import { LinkButton, LinkChip } from '@/lib/cross-links'

// ─── PRESSURE LEVEL COLORS ───────────────────────────────────────────────────
const PRESSURE: Record<string, { border: string; dot: string; bg: string; label: string }> = {
  low:    { border: '#4ade80', dot: '#4ade80', bg: '#4ade8018', label: 'À jour' },
  medium: { border: '#e8c878', dot: '#e8c878', bg: '#e8c87818', label: 'À suivre' },
  high:   { border: '#d8884a', dot: '#d8884a', bg: '#d8884a18', label: 'Urgent' },
  max:    { border: '#ff6470', dot: '#ff6470', bg: '#ff647018', label: 'Critique' },
}

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Partner {
  id: string
  img: string
  shortName: string
  fullName: string
  role: string
  location: string
  badge: number
  pressure: keyof typeof PRESSURE
  daysSince: number
  clients: number
  notes: string[]
  action: string
  mobile: string
  email: string
  linkedin: string
  cabinet: string
  city: string
  fonction: string
  top?: string
  bottom?: string
  left?: string
  right?: string
}

type SettingsForm = {
  fullName: string; fonction: string; cabinet: string; city: string;
  photoUrl: string; linkedin: string; mobile: string; email: string; status: string;
}

// ─── INITIAL DATA (fallback si DB vide) ───────────────────────────────────────
const INITIAL_PARTNERS: Partner[] = [
  {
    id: 'notaire-1',
    img: 'https://i.pravatar.cc/150?img=12',
    shortName: 'M. Lefèvre',
    fullName: 'Maître Jean-François Lefèvre',
    role: 'Notaire',
    location: 'Paris 8e',
    badge: 3,
    pressure: 'low',
    daysSince: 12,
    clients: 3,
    notes: [],
    action: '',
    mobile: '+33 6 12 34 56 78',
    email: 'jf.lefevre@lefevre-notaires.fr',
    linkedin: 'https://linkedin.com/in/jf-lefevre',
    cabinet: 'Lefèvre & Associés',
    city: 'Paris 8e',
    fonction: 'Notaire Associé',
    top: '30px', left: 'calc(50% - 45px)',
  },
  {
    id: 'ec-1',
    img: 'https://i.pravatar.cc/150?img=47',
    shortName: 'S. Dubois',
    fullName: 'Sophie Dubois',
    role: 'Expert-comptable',
    location: 'Neuilly',
    badge: 5,
    pressure: 'medium',
    daysSince: 18,
    clients: 5,
    notes: ['Cabinet dentistes (PER collectif 5 praticiens)', '2 nouvelles TPE à me présenter'],
    action: 'Appeler début semaine prochaine',
    mobile: '+33 6 23 45 67 89',
    email: 'sophie.dubois@dubois-expertise.fr',
    linkedin: 'https://linkedin.com/in/sophie-dubois',
    cabinet: 'Cabinet Dubois Expertise',
    city: 'Neuilly-sur-Seine',
    fonction: 'Expert-Comptable Associée',
    top: '100px', right: '50px',
  },
  {
    id: 'avocat-1',
    img: 'https://i.pravatar.cc/150?img=33',
    shortName: 'A. Bernard',
    fullName: 'Antoine Bernard',
    role: 'Avocat fiscaliste',
    location: 'Paris 9e',
    badge: 2,
    pressure: 'high',
    daysSince: 25,
    clients: 2,
    notes: ['Divorce complexe en cours', 'Contentieux fiscal à suivre'],
    action: 'Relancer cette semaine · WhatsApp + Email',
    mobile: '+33 6 34 56 78 90',
    email: 'a.bernard@bernard-avocat.fr',
    linkedin: 'https://linkedin.com/in/antoine-bernard-avocat',
    cabinet: 'Bernard Avocats Associés',
    city: 'Paris 9e',
    fonction: 'Avocat Fiscaliste',
    bottom: '100px', right: '50px',
  },
  {
    id: 'banquier-1',
    img: 'https://i.pravatar.cc/150?img=68',
    shortName: 'C. Martin',
    fullName: 'Charles Martin',
    role: 'Directeur BNP',
    location: 'Boulogne',
    badge: 7,
    pressure: 'max',
    daysSince: 32,
    clients: 7,
    notes: ['Grosse succession 2,5M€ en cours', '3 dossiers patrimoniaux bloqués', 'Apports prospects stoppés'],
    action: 'APPELER AUJOURD\'HUI · Proposer RDV déjeuner urgent',
    mobile: '+33 6 45 67 89 01',
    email: 'c.martin@bnp.fr',
    linkedin: 'https://linkedin.com/in/charles-martin-bnp',
    cabinet: 'BNP Paribas Boulogne',
    city: 'Boulogne-Billancourt',
    fonction: 'Directeur d\'Agence',
    bottom: '30px', left: 'calc(50% - 45px)',
  },
  {
    id: 'courtier-1',
    img: 'https://i.pravatar.cc/150?img=69',
    shortName: 'L. Durand',
    fullName: 'Laura Durand',
    role: 'Courtier immo',
    location: 'Paris 16e',
    badge: 4,
    pressure: 'medium',
    daysSince: 16,
    clients: 4,
    notes: [],
    action: '',
    mobile: '+33 6 56 78 90 12',
    email: 'l.durand@courtier-paris.fr',
    linkedin: 'https://linkedin.com/in/laura-durand',
    cabinet: 'Durand Immobilier',
    city: 'Paris 16e',
    fonction: 'Courtier Immobilier',
    bottom: '100px', left: '50px',
  },
  {
    id: 'architecte-1',
    img: 'https://i.pravatar.cc/150?img=14',
    shortName: 'P. Mercier',
    fullName: 'Philippe Mercier',
    role: 'Architecte',
    location: 'Paris 17e',
    badge: 3,
    pressure: 'low',
    daysSince: 9,
    clients: 3,
    notes: [],
    action: '',
    mobile: '+33 6 67 89 01 23',
    email: 'p.mercier@mercier-architecte.fr',
    linkedin: 'https://linkedin.com/in/philippe-mercier',
    cabinet: 'Mercier Architecture',
    city: 'Paris 17e',
    fonction: 'Architecte DPLG',
    top: '100px', left: '50px',
  },
]

const NEW_PARTNER_EMPTY = {
  fullName: '', role: '', cabinet: '', city: '',
  mobile: '', email: '', linkedin: '', img: '', status: 'low',
}

function deriveShortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]
  const last = parts[parts.length - 1]
  const first = parts[0]
  if (first === 'Maître' || first === 'Me' || first === 'Dr') return `${first} ${last}`
  return `${first[0]}. ${last}`
}

function makeSettingsForm(p: Partner): SettingsForm {
  return {
    fullName: p.fullName, fonction: p.fonction, cabinet: p.cabinet, city: p.city,
    photoUrl: p.img, linkedin: p.linkedin, mobile: p.mobile, email: p.email,
    status: p.pressure,
  }
}

function mapDbPartner(row: Record<string, unknown>): Partner {
  return {
    id: String(row.id),
    img: String(row.img ?? ''),
    shortName: String(row.short_name ?? ''),
    fullName: String(row.full_name ?? ''),
    role: String(row.role ?? ''),
    location: String(row.location ?? ''),
    badge: Number(row.badge ?? 0),
    pressure: (String(row.pressure ?? 'low')) as keyof typeof PRESSURE,
    daysSince: Number(row.days_since ?? 0),
    clients: Number(row.clients ?? 0),
    notes: Array.isArray(row.notes) ? (row.notes as string[]) : [],
    action: String(row.action ?? ''),
    mobile: String(row.mobile ?? ''),
    email: String(row.email ?? ''),
    linkedin: String(row.linkedin ?? ''),
    cabinet: String(row.cabinet ?? ''),
    city: String(row.city ?? ''),
    fonction: String(row.fonction ?? ''),
    top: row.orbital_top ? String(row.orbital_top) : undefined,
    bottom: row.orbital_bottom ? String(row.orbital_bottom) : undefined,
    left: row.orbital_left ? String(row.orbital_left) : undefined,
    right: row.orbital_right ? String(row.orbital_right) : undefined,
  }
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────
function Panel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: `linear-gradient(180deg,${C.surface1},${C.bgMid})`,
      border: `1px solid ${C.line}`,
      borderRadius: 12, padding: 16,
      position: 'relative', overflow: 'hidden',
      ...style,
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,#ff647055,transparent)' }} />
      {children}
    </div>
  )
}

function PanelTitle({ title, accent = C.cyan }: { title: string; accent?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
      <span style={{ width: 6, height: 6, background: accent, transform: 'rotate(45deg)', display: 'inline-block', flexShrink: 0 }} />
      <span style={{ fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 500, color: C.textHi, textTransform: 'uppercase', letterSpacing: '0.16em' }}>{title}</span>
    </div>
  )
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function CerclePage() {
  const [tab, setTab] = useState<'visual' | 'list' | 'settings'>('visual')
  const [filterPressure, setFilterPressure] = useState<string | null>(null)
  const [partners, setPartners] = useState<Partner[]>(INITIAL_PARTNERS)
  const [dbConnected, setDbConnected] = useState(false)
  const [settingsForms, setSettingsForms] = useState<Record<string, SettingsForm>>(
    Object.fromEntries(INITIAL_PARTNERS.map(p => [p.id, makeSettingsForm(p)]))
  )
  const [savingId, setSavingId] = useState<string | null>(null)
  const [showNewPartner, setShowNewPartner] = useState(false)
  const [newForm, setNewForm] = useState(NEW_PARTNER_EMPTY)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetch('/api/partners')
      .then(r => r.json())
      .then(json => {
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const loaded: Partner[] = json.data.map(mapDbPartner)
          setPartners(loaded)
          setSettingsForms(Object.fromEntries(loaded.map(p => [p.id, makeSettingsForm(p)])))
          setDbConnected(true)
        }
      })
      .catch(() => {})
  }, [])

  async function handleSave(partnerId: string) {
    const form = settingsForms[partnerId]
    const partner = partners.find(p => p.id === partnerId)
    if (!form || !partner || savingId) return
    setSavingId(partnerId)

    const payload = {
      full_name: form.fullName,
      short_name: deriveShortName(form.fullName),
      fonction: form.fonction,
      cabinet: form.cabinet,
      city: form.city,
      location: form.city,
      img: form.photoUrl,
      linkedin: form.linkedin,
      mobile: form.mobile,
      email: form.email,
      pressure: form.status,
    }

    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(partnerId)

      let json: Record<string, unknown>
      if (isUUID) {
        const res = await fetch(`/api/partners/${partnerId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        json = await res.json()
      } else {
        const res = await fetch('/api/partners', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            role: partner.role,
            badge: partner.badge,
            days_since: partner.daysSince,
            clients: partner.clients,
            notes: partner.notes,
            action: partner.action,
            orbital_top: partner.top ?? null,
            orbital_bottom: partner.bottom ?? null,
            orbital_left: partner.left ?? null,
            orbital_right: partner.right ?? null,
            sort_order: partners.indexOf(partner),
          }),
        })
        json = await res.json()
      }

      if (json.success) {
        const saved = mapDbPartner(json.data as Record<string, unknown>)
        setPartners(prev => prev.map(p => p.id === partnerId ? saved : p))
        if (!isUUID) {
          setSettingsForms(prev => {
            const next = { ...prev }
            delete next[partnerId]
            next[saved.id] = makeSettingsForm(saved)
            return next
          })
        }
        setDbConnected(true)
      }
    } finally {
      setSavingId(null)
    }
  }

  async function handleCreate() {
    if (!newForm.fullName.trim() || creating) return
    setCreating(true)
    try {
      const res = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: newForm.fullName.trim(),
          short_name: deriveShortName(newForm.fullName.trim()),
          role: newForm.role,
          location: newForm.city,
          cabinet: newForm.cabinet,
          city: newForm.city,
          fonction: newForm.role,
          mobile: newForm.mobile,
          email: newForm.email,
          linkedin: newForm.linkedin,
          img: newForm.img || `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70) + 1}`,
          pressure: newForm.status,
          sort_order: partners.length,
        }),
      })
      const json = await res.json()
      if (json.success) {
        const created = mapDbPartner(json.data as Record<string, unknown>)
        setPartners(prev => [...prev, created])
        setSettingsForms(prev => ({ ...prev, [created.id]: makeSettingsForm(created) }))
        setDbConnected(true)
        setShowNewPartner(false)
        setNewForm(NEW_PARTNER_EMPTY)
      }
    } finally {
      setCreating(false)
    }
  }

  const visiblePartners = filterPressure
    ? partners.filter(p => p.pressure === filterPressure)
    : partners

  const tabStyle = (active: boolean, accent = C.gold): React.CSSProperties => ({
    flex: 1, padding: '9px 0', border: 'none', cursor: 'pointer', fontSize: 11,
    fontWeight: 600, fontFamily: 'Oswald,sans-serif', letterSpacing: '0.08em',
    textTransform: 'uppercase', borderRadius: '7px 7px 0 0',
    background: active ? C.surface2 : C.surface1,
    color: active ? accent : C.textLo,
    borderBottom: active ? `2px solid ${accent}` : `2px solid transparent`,
    transition: 'all 0.15s',
  })

  function sinceStyle(p: Partner): React.CSSProperties {
    const col = PRESSURE[p.pressure].border
    return { fontSize: 11, color: col, fontWeight: 600 }
  }

  function updateField(id: string, field: string, value: string) {
    setSettingsForms(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '6px 8px',
    background: C.surface1, border: `0.5px solid ${C.line}`,
    borderRadius: 5, color: C.textHi, fontSize: 10,
    boxSizing: 'border-box',
  }

  return (
    <>
      <style>{'@import url(\'https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap\')'}</style>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 3, height: 24, background: C.ribbon, borderRadius: 2 }} />
          <h1 style={{ fontFamily: 'Oswald,sans-serif', fontSize: 22, fontWeight: 600, color: C.textHi, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Cercle <span style={{ color: C.indigo }}>Interprofessionnel</span>
          </h1>
          {dbConnected && (
            <span style={{ fontSize: 9, color: C.green, background: `${C.green}15`, border: `1px solid ${C.green}40`, borderRadius: 4, padding: '2px 7px', fontFamily: 'JetBrains Mono,monospace' }}>
              DB ✓
            </span>
          )}
        </div>
        <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: C.textLo, paddingLeft: 13 }}>
          {partners.length} partenaires clés · Vision d'ensemble · Relances & actions
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: `1px solid ${C.lineSoft}` }}>
        <button style={tabStyle(tab === 'visual', C.gold)} onClick={() => setTab('visual')}>Mon Cercle</button>
        <button style={tabStyle(tab === 'list', C.indigo)} onClick={() => setTab('list')}>Partenaires actifs</button>
        <button style={tabStyle(tab === 'settings', C.textMid)} onClick={() => setTab('settings')}>⚙️ Paramétrer</button>
      </div>

      {/* ══════════════ TAB 1: VISUAL ══════════════ */}
      {tab === 'visual' && (
        <>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 16, fontWeight: 600, color: C.textHi, marginBottom: 4 }}>
              Mon Cercle Interprofessionnel
            </div>
            <div style={{ fontSize: 11, color: C.textLo }}>{partners.length} partenaires clés · Vision d'ensemble</div>
          </div>

          {/* Orbital display */}
          <Panel style={{ marginBottom: 20 }}>
            <div style={{ position: 'relative', width: '100%', height: 520, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

              {/* Centre */}
              <div style={{
                position: 'absolute',
                width: 140, height: 140, borderRadius: '50%',
                background: `linear-gradient(135deg,${C.surface2},${C.surface1})`,
                border: `3px solid ${C.gold}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 0 50px ${C.gold}40`,
                zIndex: 10,
              }}>
                <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 10, color: C.gold, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2 }}>Cercle</div>
                <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 36, color: C.gold, fontWeight: 700, marginTop: 4 }}>{partners.length}</div>
                <div style={{ fontSize: 9, color: `${C.gold}80`, marginTop: 2 }}>partenaires</div>
              </div>

              {/* Orbital connecting lines (decorative) */}
              <div style={{
                position: 'absolute',
                width: 400, height: 400, borderRadius: '50%',
                border: `1px dashed ${C.line}44`,
                pointerEvents: 'none',
              }} />

              {/* Partner avatars — absolutely positioned */}
              {partners.map((p) => {
                const pr = PRESSURE[p.pressure]
                const pos: React.CSSProperties = {}
                if (p.top !== undefined) pos.top = p.top
                if (p.bottom !== undefined) pos.bottom = p.bottom
                if (p.left !== undefined) pos.left = p.left
                if (p.right !== undefined) pos.right = p.right

                return (
                  <div
                    key={p.id}
                    onClick={() => setTab('list')}
                    style={{
                      position: 'absolute',
                      width: 90, height: 90,
                      cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      ...pos,
                    }}
                  >
                    <div style={{
                      width: 70, height: 70, borderRadius: '50%',
                      border: `3px solid ${pr.border}`,
                      overflow: 'hidden',
                      boxShadow: `0 0 16px ${pr.border}50`,
                      position: 'relative',
                    }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.img} alt={p.shortName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

                      {/* Badge */}
                      <div style={{
                        position: 'absolute', top: -4, right: -4,
                        width: 20, height: 20, borderRadius: '50%',
                        background: pr.border, color: '#0a0e22',
                        fontSize: 9, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `2px solid ${C.bgDeep}`,
                      }}>
                        {p.badge}
                      </div>
                    </div>
                    <div style={{
                      marginTop: 5, fontSize: 9, fontWeight: 600,
                      color: C.textHi, textAlign: 'center', whiteSpace: 'nowrap',
                    }}>
                      {p.shortName}
                    </div>
                    <div style={{ fontSize: 8, color: pr.border, textAlign: 'center' }}>{p.role}</div>
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div style={{
              display: 'flex', gap: 16, marginTop: 20, fontSize: 10,
              justifyContent: 'center', padding: '12px 16px',
              background: C.surface1, borderRadius: 8, flexWrap: 'wrap' as const,
            }}>
              {Object.entries(PRESSURE).map(([key, val]) => {
                const count = partners.filter(p => p.pressure === key).length
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: val.dot }} />
                    <span style={{ color: C.textMid }}>{val.label} ({count})</span>
                  </div>
                )
              })}
            </div>
          </Panel>
        </>
      )}

      {/* ══════════════ TAB 2: LIST ══════════════ */}
      {tab === 'list' && (
        <>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 16, fontWeight: 600, color: C.textHi }}>Partenaires actifs</div>
              <div style={{ fontSize: 10, color: C.textLo, marginTop: 2 }}>Gestion des relances · Projets en cours</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' as const }}>
              <button
                onClick={() => setShowNewPartner(true)}
                style={{
                  padding: '5px 12px', background: `${C.green}15`,
                  border: `1px solid ${C.green}`, color: C.green,
                  borderRadius: 7, fontSize: 10, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                }}>
                ➕ Nouveau partenaire
              </button>
              {/* Filter pills */}
              <div style={{ display: 'flex', gap: 4 }}>
                {[
                  { key: null, label: `Tous (${partners.length})` },
                  { key: 'low', label: `🟢 ${partners.filter(p => p.pressure === 'low').length}` },
                  { key: 'medium', label: `🟡 ${partners.filter(p => p.pressure === 'medium').length}` },
                  { key: 'high', label: `🟠 ${partners.filter(p => p.pressure === 'high').length}` },
                  { key: 'max', label: `🔴 ${partners.filter(p => p.pressure === 'max').length}` },
                ].map(f => (
                  <button
                    key={String(f.key)}
                    onClick={() => setFilterPressure(f.key)}
                    style={{
                      fontSize: 10, padding: '4px 10px', borderRadius: 5, cursor: 'pointer',
                      border: filterPressure === f.key ? `1px solid ${C.gold}` : `1px solid ${C.line}`,
                      background: filterPressure === f.key ? `${C.gold}15` : C.surface1,
                      color: filterPressure === f.key ? C.gold : C.textLo,
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Partner rows */}
          <Panel style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {visiblePartners.map((p) => {
                const pr = PRESSURE[p.pressure]
                return (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px', borderRadius: 9, cursor: 'pointer',
                      background: pr.bg,
                      border: `0.5px solid ${pr.border}40`,
                      borderLeft: `3px solid ${pr.border}`,
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ flexShrink: 0 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.img} alt={p.fullName} style={{
                        width: 44, height: 44, borderRadius: '50%',
                        border: `2px solid ${pr.border}`, objectFit: 'cover',
                      }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.textHi }}>{p.fullName}</div>
                      <div style={{ fontSize: 10, color: C.textLo, marginTop: 2 }}>{p.role} · {p.location}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={sinceStyle(p)}>
                        Il y a {p.daysSince}j
                        {p.pressure === 'max' && ' 🔴'}
                        {p.pressure === 'high' && ' ⚠️'}
                      </div>
                      <div style={{ fontSize: 10, color: C.textLo, marginTop: 2 }}>{p.clients} clients</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Panel>

          {/* Priority actions */}
          <Panel>
            <PanelTitle title="Actions prioritaires" accent={C.cyan} />

            {partners.filter(p => p.pressure === 'max').map(p => (
              <div key={p.id} style={{
                background: '#1a0d0d', border: `0.5px solid ${C.cyan}`,
                borderRadius: 8, padding: 12, marginBottom: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.img} alt={p.fullName} style={{ width: 38, height: 38, borderRadius: '50%', border: `2px solid ${C.cyan}`, objectFit: 'cover', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.cyan }}>🔴 {p.fullName} ({p.role})</div>
                    <div style={{ fontSize: 10, color: C.textLo }}>{p.daysSince}j sans contact · {p.clients} clients actifs</div>
                  </div>
                </div>
                <div style={{ fontSize: 10, color: C.textMid, marginBottom: 6, lineHeight: 1.6 }}>
                  {p.notes.map((n, i) => <div key={i}>• {n}</div>)}
                </div>
                <div style={{ fontSize: 10, color: C.cyan, fontWeight: 700 }}>➜ {p.action}</div>
              </div>
            ))}

            {partners.filter(p => p.pressure === 'high').map(p => (
              <div key={p.id} style={{
                background: '#1a1000', border: `0.5px solid ${C.warn}`,
                borderRadius: 8, padding: 12, marginBottom: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.img} alt={p.fullName} style={{ width: 38, height: 38, borderRadius: '50%', border: `2px solid ${C.warn}`, objectFit: 'cover', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.warn }}>⚠️ {p.fullName} ({p.role})</div>
                    <div style={{ fontSize: 10, color: C.textLo }}>{p.daysSince}j sans contact · {p.clients} clients actifs</div>
                  </div>
                </div>
                <div style={{ fontSize: 10, color: C.textMid, marginBottom: 6, lineHeight: 1.6 }}>
                  {p.notes.map((n, i) => <div key={i}>• {n}</div>)}
                </div>
                <div style={{ fontSize: 10, color: C.warn, fontWeight: 700 }}>➜ {p.action}</div>
              </div>
            ))}

            {partners.filter(p => p.pressure === 'medium').map(p => (
              <div key={p.id} style={{
                background: `${C.gold}08`, border: `0.5px solid ${C.gold}60`,
                borderRadius: 8, padding: 12, marginBottom: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.img} alt={p.fullName} style={{ width: 38, height: 38, borderRadius: '50%', border: `2px solid ${C.gold}`, objectFit: 'cover', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.gold }}>⚠️ {p.fullName} ({p.role})</div>
                    <div style={{ fontSize: 10, color: C.textLo }}>{p.daysSince}j sans contact · {p.clients} clients actifs</div>
                  </div>
                </div>
                {p.notes.length > 0 && (
                  <div style={{ fontSize: 10, color: C.textMid, marginBottom: 6, lineHeight: 1.6 }}>
                    {p.notes.map((n, i) => <div key={i}>• {n}</div>)}
                  </div>
                )}
                {p.action && (
                  <div style={{ fontSize: 10, color: C.gold, fontWeight: 700 }}>➜ {p.action}</div>
                )}
              </div>
            ))}
          </Panel>
        </>
      )}

      {/* ══════════════ TAB 3: SETTINGS ══════════════ */}
      {tab === 'settings' && (
        <>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 16, fontWeight: 600, color: C.textHi, marginBottom: 6 }}>
              ⚙️ Paramètres Cercle Interprofessionnel
            </div>
            <div style={{ fontSize: 10, color: C.textLo }}>Personnalisez vos contacts : photos, LinkedIn, coordonnées... Cliquez Sauvegarder pour enregistrer en base de données.</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {partners.map((p) => {
              const form = settingsForms[p.id]
              if (!form) return null
              const pr = PRESSURE[p.pressure]
              const isSaving = savingId === p.id
              return (
                <Panel key={p.id}>
                  <div style={{ display: 'flex', gap: 16 }}>
                    {/* Photo preview */}
                    <div style={{
                      width: 100, height: 100, borderRadius: '50%',
                      background: C.surface2, border: `3px solid ${pr.border}`,
                      overflow: 'hidden', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={form.photoUrl}
                        alt={p.fullName}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    </div>

                    <div style={{ flex: 1 }}>
                      {/* Row 1 */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                        {[
                          { label: '👤 Nom complet', field: 'fullName' },
                          { label: '💼 Fonction', field: 'fonction' },
                          { label: '🏢 Cabinet/Société', field: 'cabinet' },
                          { label: '📍 Ville', field: 'city' },
                        ].map(({ label, field }) => (
                          <div key={field}>
                            <label style={{ fontSize: 9, color: C.textLo, display: 'block', marginBottom: 4 }}>{label}</label>
                            <input
                              type="text"
                              value={(form as Record<string, string>)[field]}
                              onChange={e => updateField(p.id, field, e.target.value)}
                              style={inputStyle}
                            />
                          </div>
                        ))}
                      </div>

                      {/* Row 2: Photo + LinkedIn */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                        <div>
                          <label style={{ fontSize: 9, color: C.textLo, display: 'block', marginBottom: 4 }}>📷 URL Photo</label>
                          <input
                            type="url"
                            value={form.photoUrl}
                            onChange={e => updateField(p.id, 'photoUrl', e.target.value)}
                            style={{ ...inputStyle, color: C.gold }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 9, color: C.textLo, display: 'block', marginBottom: 4 }}>🔗 Profil LinkedIn</label>
                          <input
                            type="url"
                            value={form.linkedin}
                            onChange={e => updateField(p.id, 'linkedin', e.target.value)}
                            style={{ ...inputStyle, color: '#0a66c2' }}
                          />
                        </div>
                      </div>

                      {/* Row 3: Mobile + Email + Status */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                        <div>
                          <label style={{ fontSize: 9, color: C.textLo, display: 'block', marginBottom: 4 }}>📞 Mobile</label>
                          <input
                            type="tel"
                            value={form.mobile}
                            onChange={e => updateField(p.id, 'mobile', e.target.value)}
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 9, color: C.textLo, display: 'block', marginBottom: 4 }}>📧 Email</label>
                          <input
                            type="email"
                            value={form.email}
                            onChange={e => updateField(p.id, 'email', e.target.value)}
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 9, color: C.textLo, display: 'block', marginBottom: 4 }}>🚦 Statut</label>
                          <select
                            value={form.status}
                            onChange={e => updateField(p.id, 'status', e.target.value)}
                            style={{
                              ...inputStyle,
                              color: PRESSURE[form.status as keyof typeof PRESSURE]?.border || C.textHi,
                            }}
                          >
                            <option value="low">🟢 À jour</option>
                            <option value="medium">🟡 À suivre</option>
                            <option value="high">🟠 Urgent</option>
                            <option value="max">🔴 Critique</option>
                          </select>
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => {
                            if (!form.linkedin?.trim()) {
                              alert('Veuillez d\'abord renseigner l\'URL LinkedIn du partenaire.')
                              return
                            }
                            window.open(form.linkedin, '_blank')
                            const imgUrl = prompt('Copiez l\'adresse de la photo de profil LinkedIn et collez-la ici :')
                            if (imgUrl && imgUrl.startsWith('http')) {
                              updateField(p.id, 'photoUrl', imgUrl)
                            }
                          }}
                          style={{
                          padding: '6px 12px', background: '#0a66c2',
                          border: 'none', color: '#fff', borderRadius: 5,
                          fontSize: 10, cursor: 'pointer', fontWeight: 600,
                        }}>
                          📸 Depuis LinkedIn
                        </button>
                        <button
                          onClick={() => handleSave(p.id)}
                          disabled={isSaving}
                          style={{
                            padding: '6px 12px',
                            background: isSaving ? `${C.textLo}15` : `${C.green}15`,
                            border: `0.5px solid ${isSaving ? C.textLo : C.green}`,
                            color: isSaving ? C.textLo : C.green,
                            borderRadius: 5, fontSize: 10,
                            cursor: isSaving ? 'wait' : 'pointer', fontWeight: 600,
                          }}
                        >
                          {isSaving ? '⏳ Saving…' : '💾 Sauvegarder'}
                        </button>
                      </div>
                    </div>
                  </div>
                </Panel>
              )
            })}

            {/* Add partner button */}
            <button
              onClick={() => setShowNewPartner(true)}
              style={{
                width: '100%', padding: 16,
                background: C.surface1, border: `1px dashed ${C.gold}40`,
                color: C.gold, borderRadius: 10, fontSize: 12, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontWeight: 600, fontFamily: 'Oswald,sans-serif', letterSpacing: '0.08em',
              }}>
              <span style={{ fontSize: 18 }}>+</span>
              Ajouter un nouveau partenaire
            </button>
          </div>

          {/* LinkedIn tip */}
          <div style={{
            background: '#0a192920', borderRadius: 10, padding: 14,
            border: '1px solid #0a66c240', marginTop: 20,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0a66c2', marginBottom: 6 }}>💡 Astuce LinkedIn</div>
            <div style={{ fontSize: 11, color: C.textMid, lineHeight: 1.6 }}>
              <strong>Méthode manuelle :</strong> Profil LinkedIn → Clic droit sur photo → "Copier l'adresse de l'image" → Coller dans "📷 URL Photo"<br />
              <strong>Méthode auto (bientôt) :</strong> Bouton "📸 Depuis LinkedIn" pour extraction automatique depuis l'URL du profil.
            </div>
          </div>
        </>
      )}

      {/* ══════════════ MODAL NOUVEAU PARTENAIRE ══════════════ */}
      {showNewPartner && (
        <div style={{
          position: 'fixed', inset: 0, background: '#000a', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }} onClick={() => setShowNewPartner(false)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: C.bgMid, border: `1px solid ${C.line}`,
              borderRadius: 14, padding: 24, width: '100%', maxWidth: 480,
              maxHeight: '90vh', overflowY: 'auto',
              boxShadow: `0 0 60px ${C.gold}20`,
            }}
          >
            <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 18, fontWeight: 600, color: C.gold, marginBottom: 20, letterSpacing: '0.08em' }}>
              ➕ NOUVEAU PARTENAIRE
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              {/* Nom complet */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 9, color: C.textLo, display: 'block', marginBottom: 4 }}>👤 Nom complet *</label>
                <input
                  type="text"
                  value={newForm.fullName}
                  onChange={e => setNewForm(f => ({ ...f, fullName: e.target.value }))}
                  placeholder="ex: Sophie Dubois"
                  style={{ ...inputStyle, fontSize: 12 }}
                  autoFocus
                />
              </div>

              {/* Rôle */}
              <div>
                <label style={{ fontSize: 9, color: C.textLo, display: 'block', marginBottom: 4 }}>💼 Rôle / Métier</label>
                <input
                  type="text"
                  value={newForm.role}
                  onChange={e => setNewForm(f => ({ ...f, role: e.target.value }))}
                  placeholder="ex: Notaire"
                  style={inputStyle}
                />
              </div>

              {/* Cabinet */}
              <div>
                <label style={{ fontSize: 9, color: C.textLo, display: 'block', marginBottom: 4 }}>🏢 Cabinet / Société</label>
                <input
                  type="text"
                  value={newForm.cabinet}
                  onChange={e => setNewForm(f => ({ ...f, cabinet: e.target.value }))}
                  placeholder="ex: Cabinet Dubois"
                  style={inputStyle}
                />
              </div>

              {/* Ville */}
              <div>
                <label style={{ fontSize: 9, color: C.textLo, display: 'block', marginBottom: 4 }}>📍 Ville</label>
                <input
                  type="text"
                  value={newForm.city}
                  onChange={e => setNewForm(f => ({ ...f, city: e.target.value }))}
                  placeholder="ex: Paris 8e"
                  style={inputStyle}
                />
              </div>

              {/* Statut */}
              <div>
                <label style={{ fontSize: 9, color: C.textLo, display: 'block', marginBottom: 4 }}>🚦 Statut</label>
                <select
                  value={newForm.status}
                  onChange={e => setNewForm(f => ({ ...f, status: e.target.value }))}
                  style={{ ...inputStyle, color: PRESSURE[newForm.status]?.border || C.textHi }}
                >
                  <option value="low">🟢 À jour</option>
                  <option value="medium">🟡 À suivre</option>
                  <option value="high">🟠 Urgent</option>
                  <option value="max">🔴 Critique</option>
                </select>
              </div>

              {/* Mobile */}
              <div>
                <label style={{ fontSize: 9, color: C.textLo, display: 'block', marginBottom: 4 }}>📞 Mobile</label>
                <input
                  type="tel"
                  value={newForm.mobile}
                  onChange={e => setNewForm(f => ({ ...f, mobile: e.target.value }))}
                  placeholder="+33 6 ..."
                  style={inputStyle}
                />
              </div>

              {/* Email */}
              <div>
                <label style={{ fontSize: 9, color: C.textLo, display: 'block', marginBottom: 4 }}>📧 Email</label>
                <input
                  type="email"
                  value={newForm.email}
                  onChange={e => setNewForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="prenom.nom@..."
                  style={inputStyle}
                />
              </div>

              {/* LinkedIn */}
              <div>
                <label style={{ fontSize: 9, color: C.textLo, display: 'block', marginBottom: 4 }}>🔗 LinkedIn</label>
                <input
                  type="url"
                  value={newForm.linkedin}
                  onChange={e => setNewForm(f => ({ ...f, linkedin: e.target.value }))}
                  placeholder="https://linkedin.com/in/..."
                  style={{ ...inputStyle, color: '#0a66c2' }}
                />
              </div>

              {/* Photo URL */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 9, color: C.textLo, display: 'block', marginBottom: 4 }}>📷 URL Photo (laisser vide pour avatar auto)</label>
                <input
                  type="url"
                  value={newForm.img}
                  onChange={e => setNewForm(f => ({ ...f, img: e.target.value }))}
                  placeholder="https://..."
                  style={{ ...inputStyle, color: C.gold }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button
                onClick={() => { setShowNewPartner(false); setNewForm(NEW_PARTNER_EMPTY) }}
                style={{
                  padding: '8px 16px', background: 'transparent',
                  border: `1px solid ${C.line}`, color: C.textLo,
                  borderRadius: 7, fontSize: 11, cursor: 'pointer',
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={!newForm.fullName.trim() || creating}
                style={{
                  padding: '8px 20px',
                  background: !newForm.fullName.trim() || creating ? `${C.green}20` : `${C.green}25`,
                  border: `1px solid ${C.green}`,
                  color: !newForm.fullName.trim() || creating ? `${C.green}80` : C.green,
                  borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                }}
              >
                {creating ? '⏳ Création…' : '✅ Créer le partenaire'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation transversale — Réseau */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 32, paddingTop: 20, borderTop: `1px solid ${C.gold}20` }}>
        <LinkButton href="/clients" label="Clients" color="gold" />
        <LinkButton href="/crm" label="CRM" color="green" />
        <LinkButton href="/revenue" label="Revenue" color="cyan" />
        <LinkChip href="/global" label="Global" color="indigo" />
        <LinkChip href="/today" label="Aujourd'hui" color="purple" />
      </div>
    </>
  )
}
