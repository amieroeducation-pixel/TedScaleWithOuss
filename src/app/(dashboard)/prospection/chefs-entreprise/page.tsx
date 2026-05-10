'use client'

import { useState } from 'react'
import { C } from '@/lib/theme'

type MainTab = 'portefeuille' | 'acquisition'
type AcqTab = 'pipeline' | 'tableau' | 'prospection'
type Status = 'Non contacté' | 'En cours' | 'Converti' | 'Perdu'

interface Chef {
  id: number
  initials: string
  nom: string
  role: string
  entreprise: string
  forme: string
  ca: string
  ville: string
  status: Status
  aum?: string
  rdv?: string
  actions: ('WA' | 'email' | 'LI' | 'seq')[]
  avatarBg: string
  avatarColor: string
}

const STATUS_COLORS: Record<Status, string> = {
  'Non contacté': '#7a92e8',
  'En cours': '#e8c878',
  'Converti': '#4ade80',
  'Perdu': '#ff6470',
}

const SECTEURS = [
  'BTP / Immobilier', 'Commerce / Distribution', 'Restauration / Hôtellerie',
  'Services aux entreprises', 'Industrie / Fabrication', 'Transport / Logistique',
  'Tech / Numérique', 'Santé / Bien-être', 'Finance / Assurance',
]

const PORTEFEUILLE: Chef[] = [
  { id: 1, initials: 'AP', nom: 'Antoine Perrin', role: 'PDG', entreprise: 'Perrin & Fils', forme: 'SASU', ca: '2,8M€', ville: 'Paris 8e', status: 'Converti', aum: '850k€', actions: ['LI', 'seq'], avatarBg: '#0a1f0a', avatarColor: '#4ade80' },
  { id: 2, initials: 'CM', nom: 'Claire Morin', role: 'Gérante', entreprise: 'Studio CM Design', forme: 'SARL', ca: '680k€', ville: 'Levallois', status: 'En cours', rdv: 'RDV 2 · 12 mai', actions: ['LI', 'email'], avatarBg: '#0a1f0a', avatarColor: '#4ade80' },
  { id: 3, initials: 'FT', nom: 'François Thibault', role: 'Directeur', entreprise: 'FT Consulting', forme: 'SAS', ca: '1,2M€', ville: 'Neuilly', status: 'Non contacté', rdv: 'Séquence active', actions: ['LI', 'seq'], avatarBg: '#1a1400', avatarColor: '#e8c878' },
  { id: 4, initials: 'MD', nom: 'Dr. Marie Dubois', role: 'Dentiste', entreprise: 'Cabinet Dubois', forme: 'SASU', ca: '520k€', ville: 'Paris 16e', status: 'Converti', aum: '320k€', actions: ['WA'], avatarBg: '#0a1f0a', avatarColor: '#4ade80' },
  { id: 5, initials: 'JR', nom: 'Jean Rousseau', role: 'Pharmacien', entreprise: 'Pharmacie Centrale', forme: 'SARL', ca: '2,1M€', ville: 'Versailles', status: 'Converti', aum: '1,2M€', actions: ['LI'], avatarBg: '#0a1f0a', avatarColor: '#4ade80' },
  { id: 6, initials: 'PL', nom: 'Pierre Laurent', role: 'Avocat', entreprise: 'Cabinet Laurent & Associés', forme: '', ca: '890k€', ville: 'Paris 9e', status: 'En cours', rdv: 'RDV 1 fixé', actions: ['email'], avatarBg: '#0a0e22', avatarColor: '#7a92e8' },
]

const MOCK_PIPELINE = {
  creations: [
    { id: 'c1', nom: 'Cabinet Dr. Moreau', siret: '123 456 789', info: 'CA: 450k€ • 18j', score: 8, scoreColor: C.green, scoreBg: '#0a1f0a' },
    { id: 'c2', nom: 'SARL Conseil Plus', siret: '234 567 890', info: 'Capital: 25k€', score: 6, scoreColor: C.gold, scoreBg: '#1a1400' },
  ],
  cessions: [
    { id: 'ce1', nom: 'Distrib. Médicale', siret: '345 678 901', info: 'Cession: 2,8M€', score: 10, scoreColor: C.cyan, scoreBg: '#1a0d0d', urgence: true },
  ],
  holdings: [
    { id: 'h1', nom: 'Hold. Rousseau', siret: '567 890 123', info: 'Filles: SAS+SCI', score: 9, scoreColor: C.purple, scoreBg: '#140d1e', urgence: true },
  ],
  dividendes: [
    { id: 'd1', nom: 'Cabinet Bernard', siret: '678 901 234', info: 'Div: 280k€', score: 8, scoreColor: C.gold, scoreBg: '#1a1400' },
  ],
  seniors: [
    { id: 's1', nom: 'Industrie Précis.', siret: '890 123 456', info: '62 ans • 3,2M€', score: 9, scoreColor: C.indigo, scoreBg: '#0d1a2e' },
  ],
}

const ACTION_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  LI:    { bg: '#0a1929', color: '#7a92e8', border: '#7a92e840' },
  WA:    { bg: '#0a1f0a', color: '#4ade80', border: '#4ade8040' },
  email: { bg: '#11163a', color: '#7a92e8', border: '#7a92e840' },
  seq:   { bg: '#1a2150', color: '#d8e1ff', border: '#3a469040' },
}
const ACTION_LABELS: Record<string, string> = { LI: 'in', WA: 'WA', email: '✉', seq: '▶' }

function Panel({ children, accent = C.indigo, style = {} }: { children: React.ReactNode; accent?: string; style?: React.CSSProperties }) {
  return (
    <div style={{ background: `linear-gradient(180deg,${C.surface1},${C.bgMid})`, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16, position: 'relative', overflow: 'hidden', ...style }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${accent}88,transparent)` }} />
      {children}
    </div>
  )
}

function PanelTitle({ title, accent = C.indigo }: { title: string; accent?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
      <span style={{ width: 6, height: 6, background: accent, transform: 'rotate(45deg)', display: 'inline-block', boxShadow: `0 0 7px ${accent}`, flexShrink: 0 }} />
      <span style={{ fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 500, color: C.textHi, textTransform: 'uppercase', letterSpacing: '0.16em' }}>{title}</span>
    </div>
  )
}

function StatusBadge({ status, extra }: { status: Status; extra?: string }) {
  const color = STATUS_COLORS[status]
  const label = extra ?? status
  return (
    <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, fontWeight: 600, borderRadius: 6, padding: '3px 8px', background: color + '20', color, border: `1px solid ${color}44`, whiteSpace: 'nowrap' as const }}>
      {label}
    </span>
  )
}

function ActionBtn({ type }: { type: string }) {
  const s = ACTION_STYLE[type] ?? ACTION_STYLE.email
  return (
    <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, fontWeight: 700, padding: '3px 7px', borderRadius: 5, background: s.bg, color: s.color, border: `1px solid ${s.border}`, cursor: 'pointer' }}>
      {ACTION_LABELS[type] ?? type}
    </span>
  )
}

function PipelineCard({ nom, siret, info, score, scoreColor, scoreBg, urgence, borderColor }: {
  nom: string; siret: string; info: string; score: number; scoreColor: string; scoreBg: string; urgence?: boolean; borderColor: string
}) {
  return (
    <div style={{ background: C.surface1, borderRadius: 7, padding: 9, marginBottom: 6, borderLeft: `3px solid ${borderColor}`, cursor: 'pointer', position: 'relative' }}>
      {urgence && (
        <div style={{ position: 'absolute', top: 5, right: 5, background: C.cyan, color: '#fff', padding: '1px 5px', borderRadius: 6, fontSize: 7, fontWeight: 700 }}>⚡ 48H</div>
      )}
      <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 10, fontWeight: 600, color: C.textHi, marginBottom: 2 }}>{nom}</div>
      <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7.5, color: C.textLo, marginBottom: 3 }}>{siret}</div>
      <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7.5, color: C.textMid, marginBottom: 5 }}>{info}</div>
      <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: 8, fontSize: 7, fontWeight: 700, background: scoreBg, color: scoreColor, border: `1px solid ${scoreColor}30` }}>
        Score: {score}/10{score === 10 ? ' 🔥' : ''}
      </span>
    </div>
  )
}

export default function ChefsEntreprisePage() {
  const [mainTab, setMainTab] = useState<MainTab>('portefeuille')
  const [acqTab, setAcqTab] = useState<AcqTab>('pipeline')
  const [showForm, setShowForm] = useState(false)
  const [chefs, setChefs] = useState<Chef[]>(PORTEFEUILLE)
  const [form, setForm] = useState({ nom: '', entreprise: '', secteur: SECTEURS[0], ville: '', ca: '', effectif: '', telephone: '' })
  const [search, setSearch] = useState('')

  const stats = {
    contacts: chefs.length,
    enCours: chefs.filter(c => c.status === 'En cours').length,
    convertis: chefs.filter(c => c.status === 'Converti').length,
    aum: '4,2M€',
  }

  function handleAdd() {
    if (!form.nom || !form.entreprise) return
    const newChef: Chef = {
      id: Date.now(),
      initials: form.nom.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase(),
      nom: form.nom, role: '', entreprise: form.entreprise, forme: '', ca: form.ca, ville: form.ville,
      status: 'Non contacté', actions: ['LI', 'email'], avatarBg: C.surface3, avatarColor: C.indigo,
    }
    setChefs(prev => [newChef, ...prev])
    setForm({ nom: '', entreprise: '', secteur: SECTEURS[0], ville: '', ca: '', effectif: '', telephone: '' })
    setShowForm(false)
  }

  const filtered = chefs.filter(c =>
    !search ||
    c.nom.toLowerCase().includes(search.toLowerCase()) ||
    c.entreprise.toLowerCase().includes(search.toLowerCase()) ||
    c.ville.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap')"}</style>

      {/* Main tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${C.line}`, paddingBottom: 0, marginBottom: 14 }}>
        {([
          { key: 'portefeuille' as const, label: 'Portefeuille Actuel', icon: '📋' },
          { key: 'acquisition' as const, label: 'Acquisition Data.gouv', icon: '🚀' },
        ]).map(t => {
          const active = mainTab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setMainTab(t.key)}
              style={{
                flex: 1, padding: '10px 14px', borderRadius: '8px 8px 0 0', border: 'none',
                background: active ? '#1a1400' : C.surface1,
                color: active ? C.gold : C.textLo,
                fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: active ? 600 : 500,
                cursor: 'pointer', borderBottom: active ? `2px solid ${C.gold}` : `2px solid transparent`,
                letterSpacing: '0.06em',
              }}
            >
              {t.icon} {t.label}
            </button>
          )
        })}
      </div>

      {/* PORTEFEUILLE TAB */}
      {mainTab === 'portefeuille' && (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            {[
              { label: 'Contacts', val: stats.contacts, sub: 'Base clients', accent: C.indigo },
              { label: 'En cours', val: stats.enCours, sub: 'Prospection', accent: C.gold },
              { label: 'Convertis', val: stats.convertis, sub: 'Clients actifs', accent: C.green },
              { label: 'AUM Total', val: stats.aum, sub: '+18% YTD', accent: C.cyan },
            ].map(k => (
              <div key={k.label} style={{ background: `linear-gradient(180deg,${C.surface2},${C.surface1})`, border: `1px solid ${C.line}`, borderRadius: 10, padding: '12px 14px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: k.accent, opacity: 0.55 }} />
                <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7.5, color: C.textLo, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{k.label}</div>
                <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 26, fontWeight: 600, color: C.textHi, lineHeight: 1, marginBottom: 2 }}>{k.val}</div>
                <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: k.accent }}>{k.sub}</div>
              </div>
            ))}
          </div>

          <Panel accent={C.gold}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
              <PanelTitle title="Chefs d'entreprise — Portefeuille actuel" accent={C.gold} />
              <div style={{ flex: 1 }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher..."
                style={{ padding: '6px 10px', background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 6, color: C.text, fontSize: 9, fontFamily: 'JetBrains Mono,monospace', outline: 'none', width: 160 }}
              />
              <button
                onClick={() => setShowForm(v => !v)}
                style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${C.gold}60`, background: showForm ? '#1a1400' : 'transparent', color: C.gold, fontFamily: 'Oswald,sans-serif', fontSize: 10, cursor: 'pointer', letterSpacing: '0.08em' }}
              >
                {showForm ? '✕ Annuler' : '+ Ajouter'}
              </button>
            </div>

            {/* Add form */}
            {showForm && (
              <div style={{ background: C.surface2, borderRadius: 10, padding: 14, marginBottom: 14, border: `1px solid ${C.gold}40`, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                {[
                  { key: 'nom', label: 'Nom complet', placeholder: 'M. Jean Dupont' },
                  { key: 'entreprise', label: 'Entreprise', placeholder: 'Dupont SARL' },
                  { key: 'ville', label: 'Ville', placeholder: 'Paris' },
                  { key: 'ca', label: 'CA estimé', placeholder: '500k€' },
                  { key: 'effectif', label: 'Effectif', placeholder: '10 salariés' },
                  { key: 'telephone', label: 'Téléphone', placeholder: '06 XX XX XX XX' },
                ].map(f => (
                  <div key={f.key}>
                    <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, marginBottom: 4 }}>{f.label}</div>
                    <input
                      placeholder={f.placeholder}
                      value={(form as Record<string, string>)[f.key]}
                      onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      style={{ width: '100%', padding: '7px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.text, fontSize: 9, outline: 'none', boxSizing: 'border-box' as const }}
                    />
                  </div>
                ))}
                <div>
                  <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, marginBottom: 4 }}>Secteur</div>
                  <select
                    value={form.secteur}
                    onChange={e => setForm(prev => ({ ...prev, secteur: e.target.value }))}
                    style={{ width: '100%', padding: '7px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.text, fontSize: 9, outline: 'none' }}
                  >
                    {SECTEURS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gridColumn: 'span 2' }}>
                  <button
                    onClick={handleAdd}
                    style={{ width: '100%', padding: '9px 0', borderRadius: 7, border: 'none', background: `linear-gradient(135deg,${C.gold},#b89840)`, color: C.bgDeep, fontFamily: 'Oswald,sans-serif', fontWeight: 700, fontSize: 12, cursor: 'pointer', letterSpacing: '0.08em' }}
                  >
                    ✅ AJOUTER AU PIPELINE
                  </button>
                </div>
              </div>
            )}

            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, marginBottom: 10 }}>
              Clients &amp; prospects en cours
            </div>

            {/* Chef rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {filtered.map(chef => (
                <div key={chef.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: C.surface2, borderRadius: 8, border: `1px solid ${C.lineSoft}` }}>
                  {/* Avatar */}
                  <div style={{
                    width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                    background: chef.avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 700, color: chef.avatarColor,
                    border: `1px solid ${chef.avatarColor}40`,
                  }}>
                    {chef.initials}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 13, color: C.textHi, fontWeight: 500, marginBottom: 2 }}>{chef.nom}</div>
                    <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo }}>
                      {chef.role}{chef.role ? ' · ' : ''}{chef.entreprise}{chef.forme ? ` (${chef.forme})` : ''} · CA {chef.ca} · {chef.ville}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                    {chef.actions.map((a, i) => <ActionBtn key={i} type={a} />)}
                  </div>

                  {/* Status */}
                  {chef.status === 'Converti' && chef.aum ? (
                    <StatusBadge status={chef.status} extra={`Client · ${chef.aum}`} />
                  ) : chef.rdv ? (
                    <StatusBadge status={chef.status} extra={chef.rdv} />
                  ) : (
                    <StatusBadge status={chef.status} />
                  )}
                </div>
              ))}
            </div>
          </Panel>
        </>
      )}

      {/* ACQUISITION TAB */}
      {mainTab === 'acquisition' && (
        <>
          {/* Sub-tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, borderBottom: `1px solid ${C.lineSoft}`, paddingBottom: 6 }}>
            {([
              { key: 'pipeline' as const, label: '📊 Pipeline' },
              { key: 'tableau' as const, label: '📋 Tableau' },
              { key: 'prospection' as const, label: '🚀 Workflow' },
            ]).map(t => {
              const active = acqTab === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => setAcqTab(t.key)}
                  style={{
                    flex: 1, padding: '7px 10px', borderRadius: 6, border: active ? `1px solid ${C.gold}60` : `1px solid ${C.line}`,
                    background: active ? '#1a1400' : C.surface2,
                    color: active ? C.gold : C.textLo,
                    fontFamily: 'Oswald,sans-serif', fontSize: 10, fontWeight: active ? 600 : 400, cursor: 'pointer',
                  }}
                >
                  {t.label}
                </button>
              )
            })}
          </div>

          {/* PIPELINE Kanban */}
          {acqTab === 'pipeline' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
              {/* Créations */}
              <div style={{ background: C.surface1, borderRadius: 8, padding: 10, border: `1px solid ${C.line}` }}>
                <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 9, fontWeight: 600, color: C.textLo, textTransform: 'uppercase', marginBottom: 8, display: 'flex', justifyContent: 'space-between', letterSpacing: '0.1em' }}>
                  <span>🏢 Créations</span>
                  <span style={{ background: C.surface2, padding: '2px 6px', borderRadius: 8, fontSize: 8 }}>12</span>
                </div>
                {MOCK_PIPELINE.creations.map(c => (
                  <PipelineCard key={c.id} {...c} borderColor={C.green} />
                ))}
              </div>

              {/* Cessions */}
              <div style={{ background: C.surface1, borderRadius: 8, padding: 10, border: `1px solid ${C.line}` }}>
                <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 9, fontWeight: 600, color: C.textLo, textTransform: 'uppercase', marginBottom: 8, display: 'flex', justifyContent: 'space-between', letterSpacing: '0.1em' }}>
                  <span>💰 Cessions</span>
                  <span style={{ background: C.surface2, padding: '2px 6px', borderRadius: 8, fontSize: 8 }}>8</span>
                </div>
                {MOCK_PIPELINE.cessions.map(c => (
                  <PipelineCard key={c.id} {...c} borderColor={C.cyan} />
                ))}
              </div>

              {/* Holdings */}
              <div style={{ background: C.surface1, borderRadius: 8, padding: 10, border: `1px solid ${C.line}` }}>
                <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 9, fontWeight: 600, color: C.textLo, textTransform: 'uppercase', marginBottom: 8, display: 'flex', justifyContent: 'space-between', letterSpacing: '0.1em' }}>
                  <span>🏛️ Holdings</span>
                  <span style={{ background: C.surface2, padding: '2px 6px', borderRadius: 8, fontSize: 8 }}>5</span>
                </div>
                {MOCK_PIPELINE.holdings.map(c => (
                  <PipelineCard key={c.id} {...c} borderColor={C.purple} />
                ))}
              </div>

              {/* Dividendes */}
              <div style={{ background: C.surface1, borderRadius: 8, padding: 10, border: `1px solid ${C.line}` }}>
                <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 9, fontWeight: 600, color: C.textLo, textTransform: 'uppercase', marginBottom: 8, display: 'flex', justifyContent: 'space-between', letterSpacing: '0.1em' }}>
                  <span>💎 Dividendes</span>
                  <span style={{ background: C.surface2, padding: '2px 6px', borderRadius: 8, fontSize: 8 }}>31</span>
                </div>
                {MOCK_PIPELINE.dividendes.map(c => (
                  <PipelineCard key={c.id} {...c} borderColor={C.gold} />
                ))}
              </div>

              {/* Dirigeants 55+ */}
              <div style={{ background: C.surface1, borderRadius: 8, padding: 10, border: `1px solid ${C.line}` }}>
                <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 9, fontWeight: 600, color: C.textLo, textTransform: 'uppercase', marginBottom: 8, display: 'flex', justifyContent: 'space-between', letterSpacing: '0.1em' }}>
                  <span>👴 55+</span>
                  <span style={{ background: C.surface2, padding: '2px 6px', borderRadius: 8, fontSize: 8 }}>12</span>
                </div>
                {MOCK_PIPELINE.seniors.map(c => (
                  <PipelineCard key={c.id} {...c} borderColor={C.indigo} />
                ))}
              </div>
            </div>
          )}

          {/* TABLEAU */}
          {acqTab === 'tableau' && (
            <Panel accent={C.indigo}>
              <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: C.textLo, padding: '20px', textAlign: 'center' }}>
                Tableau des 150 leads · À implémenter
              </div>
            </Panel>
          )}

          {/* WORKFLOW */}
          {acqTab === 'prospection' && (
            <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Title */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 18, color: C.gold, fontWeight: 600, marginBottom: 4, letterSpacing: '0.06em' }}>PROSPECTION AUTOMATISÉE</div>
                <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo }}>Workflows Data.gouv + Pappers · Limite 150 leads/semaine</div>
              </div>

              {/* Hebdomadaire */}
              <Panel accent={C.gold} style={{ border: `1px solid ${C.gold}40` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 13, fontWeight: 700, color: C.gold, letterSpacing: '0.06em' }}>📅 WORKFLOW HEBDOMADAIRE</div>
                  <span style={{ background: '#1a1400', color: C.gold, padding: '2px 8px', borderRadius: 8, fontSize: 8, fontFamily: 'JetBrains Mono,monospace', fontWeight: 600 }}>CHAQUE LUNDI 8H</span>
                </div>

                <div style={{ background: C.surface2, borderRadius: 7, padding: 10, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {[
                    { label: 'Dernière exécution :', val: 'Lundi 21 avril 2026 - 8h30', color: C.green },
                    { label: 'Prochaine exécution :', val: 'Lundi 28 avril 2026 - 8h00', color: C.gold },
                    { label: 'Signaux détectés :', val: '31 leads (23 créations + 8 cessions)', color: C.textHi },
                  ].map(r => (
                    <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo }}>{r.label}</span>
                      <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: r.color, fontWeight: 600 }}>{r.val}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <div style={{ background: '#0a1f0a', border: `1px solid #4ade8030`, borderRadius: 7, padding: 10 }}>
                    <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, marginBottom: 3 }}>🏢 Signal 1</div>
                    <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 600, color: C.green, marginBottom: 2 }}>Créations récentes</div>
                    <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7.5, color: C.textLo }}>SASU/SAS/SARL &lt; 30j · Capital &gt; 10k€</div>
                  </div>
                  <div style={{ background: '#1a0d0d', border: `1px solid #ff647030`, borderRadius: 7, padding: 10, position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 6, right: 6, background: C.cyan, color: '#fff', padding: '2px 6px', borderRadius: 6, fontSize: 7, fontWeight: 700 }}>⚡ 48H</div>
                    <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, marginBottom: 3 }}>💰 Signal 2</div>
                    <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 600, color: C.cyan, marginBottom: 2 }}>Cessions BODACC</div>
                    <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7.5, color: C.textLo }}>Urgence maximale · Fenêtre J-90</div>
                  </div>
                </div>

                <button style={{ width: '100%', padding: 12, background: `linear-gradient(135deg,#1a1400,#2a2200)`, border: `1px solid ${C.gold}`, color: C.gold, borderRadius: 7, fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.1em' }}>
                  🚀 LANCER WORKFLOW HEBDOMADAIRE
                </button>
              </Panel>

              {/* Mensuel */}
              <Panel accent={C.purple} style={{ border: `1px solid ${C.purple}40` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 13, fontWeight: 700, color: C.purple, letterSpacing: '0.06em' }}>📆 WORKFLOW MENSUEL</div>
                  <span style={{ background: '#140d1e', color: C.purple, padding: '2px 8px', borderRadius: 8, fontSize: 8, fontFamily: 'JetBrains Mono,monospace', fontWeight: 600 }}>1ER LUNDI DU MOIS 8H</span>
                </div>

                <div style={{ background: C.surface2, borderRadius: 7, padding: 10, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {[
                    { label: 'Dernière exécution :', val: 'Lundi 7 avril 2026 - 8h30', color: C.green },
                    { label: 'Prochaine exécution :', val: 'Lundi 5 mai 2026 - 8h00', color: C.purple },
                    { label: 'Signaux détectés :', val: '48 leads (5 holdings + 31 dividendes + 12 dirigeants 55+)', color: C.textHi },
                  ].map(r => (
                    <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo }}>{r.label}</span>
                      <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: r.color, fontWeight: 600 }}>{r.val}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                  <div style={{ background: '#140d1e', border: `1px solid ${C.purple}30`, borderRadius: 7, padding: 8, position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 4, right: 4, background: C.purple, color: '#fff', padding: '1px 5px', borderRadius: 5, fontSize: 7, fontWeight: 700 }}>⚡ 48H</div>
                    <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7.5, color: C.textLo, marginBottom: 2 }}>🏛️ Signal 3</div>
                    <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 600, color: C.purple, marginBottom: 2 }}>Holdings</div>
                    <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7, color: C.textLo }}>NAF 6420Z &lt; 60j</div>
                  </div>
                  <div style={{ background: '#1a1400', border: `1px solid ${C.gold}30`, borderRadius: 7, padding: 8 }}>
                    <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7.5, color: C.textLo, marginBottom: 2 }}>💎 Signal 4</div>
                    <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 600, color: C.gold, marginBottom: 2 }}>Dividendes</div>
                    <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7, color: C.textLo }}>Distribution &gt; 150k€</div>
                  </div>
                  <div style={{ background: '#0d1a2e', border: `1px solid ${C.indigo}30`, borderRadius: 7, padding: 8 }}>
                    <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7.5, color: C.textLo, marginBottom: 2 }}>👴 Signal 5</div>
                    <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 600, color: C.indigo, marginBottom: 2 }}>55+ ans</div>
                    <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7, color: C.textLo }}>PME 500k-10M€</div>
                  </div>
                </div>

                <button style={{ width: '100%', padding: 12, background: `linear-gradient(135deg,#140d1e,#1e0d2e)`, border: `1px solid ${C.purple}`, color: C.purple, borderRadius: 7, fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.1em' }}>
                  🚀 LANCER WORKFLOW MENSUEL
                </button>
              </Panel>

              {/* Alertes urgence */}
              <div style={{ background: '#1a0d0d', border: `1px solid ${C.cyan}`, borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ fontSize: 20 }}>⚡</div>
                  <div>
                    <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 700, color: C.cyan, letterSpacing: '0.06em' }}>ALERTES URGENCE 48H</div>
                    <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo }}>Les leads suivants nécessitent un traitement immédiat</div>
                  </div>
                </div>
                <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8.5, color: C.textMid, lineHeight: 1.7 }}>
                  <strong style={{ color: C.cyan }}>Signal 2 (Cessions BODACC)</strong> : Fenêtre d&apos;opportunité J-90. Les concurrents (banques privées, notaires) vont contacter le dirigeant. Traiter dans les 48h.
                  <br />
                  <strong style={{ color: C.purple }}>Signal 3 (Holdings)</strong> : Événement patrimonial majeur en cours (cession, transmission). Le dirigeant est déjà dans une démarche structurée. Contacter rapidement.
                </div>
              </div>

              {/* Rythme recommandé */}
              <div style={{ background: '#0a1929', border: `1px solid #0a66c240`, borderRadius: 10, padding: 14 }}>
                <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 11, color: '#4a90d9', fontWeight: 600, marginBottom: 8, letterSpacing: '0.06em' }}>💡 RYTHME RECOMMANDÉ</div>
                <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8.5, color: C.textMid, lineHeight: 1.8 }}>
                  <strong style={{ color: C.textHi }}>Hebdomadaire (chaque lundi 8h)</strong> : Signaux 1 &amp; 2 (créations + cessions BODACC). Données mises à jour chaque semaine.<br />
                  <strong style={{ color: C.textHi }}>Mensuel (1er lundi du mois 8h)</strong> : Signaux 3, 4 &amp; 5 (holdings + dividendes + dirigeants 55+). Données moins volatiles.<br />
                  <strong style={{ color: '#4a90d9' }}>⚙️ Configuration :</strong> Clé API Pappers à ajouter dans Paramètres
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}
