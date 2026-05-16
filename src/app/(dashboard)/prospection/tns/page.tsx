'use client'

import { useState, useEffect } from 'react'
import { C } from '@/lib/theme'
import ProspectCard, { type ProspectCardData } from '@/components/prospects/ProspectCard'
import CreateSessionModal from '@/components/calling/CreateSessionModal'

// --- TYPES ---
type ProspectStatus = 'Non contacté' | 'En cours' | 'Converti' | 'Perdu'
type MetierFilter = 'all' | 'medecin' | 'infirmier' | 'kine' | 'avocat'

interface Prospect {
  id: number
  initials: string
  nom: string
  metier: string
  ville: string
  telephone: string
  status: ProspectStatus
  score: number
  source: string
  actions: ('WA' | 'email' | 'SMS' | 'LI' | 'seq')[]
  metierFilter: MetierFilter
}

// --- DATA ---
const METIERS = [
  { value: 'medecin_generaliste', label: 'Médecin généraliste' },
  { value: 'cardiologue', label: 'Cardiologue' },
  { value: 'dermatologue', label: 'Dermatologue' },
  { value: 'ophtalmologue', label: 'Ophtalmologue' },
  { value: 'radiologue', label: 'Radiologue' },
  { value: 'pediatre', label: 'Pédiatre' },
  { value: 'dentiste', label: 'Dentiste' },
  { value: 'infirmier', label: 'Infirmier libéral' },
  { value: 'kinesitherapeute', label: 'Kinésithérapeute' },
  { value: 'kinesiologue', label: 'Kinésiologue' },
  { value: 'naturopathe', label: 'Naturopathe' },
  { value: 'acupuncteur', label: 'Acupuncteur' },
  { value: 'homeopathe', label: 'Homéopathe' },
  { value: 'pharmacien', label: 'Pharmacien' },
  { value: 'avocat', label: 'Avocat' },
  { value: 'notaire', label: 'Notaire' },
  { value: 'expert_comptable', label: 'Expert-comptable' },
  { value: 'commissaire_comptes', label: 'Commissaire aux comptes' },
  { value: 'architecte', label: 'Architecte' },
  { value: 'veterinaire', label: 'Vétérinaire' },
  { value: 'osteopathe', label: 'Ostéopathe' },
  { value: 'psychologue', label: 'Psychologue' },
  { value: 'psychotherapeute', label: 'Psychothérapeute' },
  { value: 'sage_femme', label: 'Sage-femme' },
  { value: 'orthophoniste', label: 'Orthophoniste' },
  { value: 'podologue', label: 'Podologue' },
  { value: 'chiropracteur', label: 'Chiropracteur' },
  { value: 'dieteticien', label: 'Diététicien' },
  { value: 'ergotherapeute', label: 'Ergothérapeute' },
  { value: 'orthoptiste', label: 'Orthoptiste' },
]

const BASE_PROSPECTS: Prospect[] = [
  { id: 1, initials: 'ER', nom: 'Dr. Élise Rondeau', metier: 'Médecin généraliste', ville: 'Paris 16e', telephone: '06 12 34 56 78', status: 'Non contacté', score: 0.91, source: 'Google Places', actions: ['WA', 'seq'], metierFilter: 'medecin' },
  { id: 2, initials: 'PL', nom: 'Pierre Lacombe', metier: 'Cardiologue', ville: 'Neuilly', telephone: '06 98 76 54 32', status: 'En cours', score: 0.78, source: 'Google Places', actions: ['WA', 'seq'], metierFilter: 'medecin' },
  { id: 3, initials: 'JD', nom: 'Julie Dumas', metier: 'Kinésithérapeute', ville: 'Boulogne', telephone: '06 23 45 67 89', status: 'Non contacté', score: 0.82, source: 'Google Places', actions: ['email', 'seq'], metierFilter: 'kine' },
  { id: 4, initials: 'SM', nom: 'Dr. Sophie Moreau', metier: 'Médecin généraliste', ville: 'Neuilly-sur-Seine', telephone: '01 47 22 XX XX', status: 'Non contacté', score: 0.94, source: 'Google Places', actions: ['WA', 'LI'], metierFilter: 'medecin' },
  { id: 5, initials: 'ML', nom: 'Dr. Marc Lefebvre', metier: 'Chirurgien-dentiste', ville: 'Paris 16e', telephone: '01 45 24 XX XX', status: 'En cours', score: 0.61, source: 'Google Places', actions: ['email', 'seq'], metierFilter: 'medecin' },
  { id: 6, initials: 'IR', nom: 'Me Isabelle Roux', metier: 'Avocat', ville: 'Boulogne-Billancourt', telephone: '01 46 05 XX XX', status: 'Non contacté', score: 0.88, source: 'Google Places', actions: ['LI', 'email'], metierFilter: 'avocat' },
  { id: 7, initials: 'CB', nom: 'Mme Claire Bertin', metier: 'Expert-comptable', ville: 'Saint-Maur', telephone: '01 43 97 XX XX', status: 'Non contacté', score: 0.79, source: 'Google Places', actions: ['email', 'LI'], metierFilter: 'avocat' },
  { id: 8, initials: 'BM', nom: 'M. Bernard Morin', metier: 'Notaire', ville: 'Évry', telephone: '01 60 77 XX XX', status: 'En cours', score: 0.68, source: 'Google Places', actions: ['WA', 'seq'], metierFilter: 'avocat' },
  { id: 9, initials: 'TG', nom: 'Dr. Thomas Girard', metier: 'Kinésithérapeute', ville: 'Paris 15e', telephone: '01 45 78 XX XX', status: 'Perdu', score: 0.43, source: 'Google Places', actions: ['email'], metierFilter: 'kine' },
  { id: 10, initials: 'NP', nom: 'Dr. Nathalie Petit', metier: 'Médecin généraliste', ville: 'Montreuil', telephone: '01 48 59 XX XX', status: 'Non contacté', score: 0.91, source: 'Google Places', actions: ['WA', 'SMS'], metierFilter: 'medecin' },
  { id: 11, initials: 'FM', nom: 'Frédéric Marin', metier: 'Infirmier libéral', ville: 'Vincennes', telephone: '06 44 11 22 33', status: 'Non contacté', score: 0.72, source: 'Annuaire', actions: ['WA', 'seq'], metierFilter: 'infirmier' },
  { id: 12, initials: 'AL', nom: 'Aurélie Lambert', metier: 'Infirmière libérale', ville: 'Paris 13e', telephone: '06 55 22 33 44', status: 'En cours', score: 0.84, source: 'Annuaire', actions: ['email', 'WA'], metierFilter: 'infirmier' },
  { id: 13, initials: 'RC', nom: 'Renaud Chabrier', metier: 'Kinésithérapeute', ville: 'Boulogne', telephone: '06 33 44 55 66', status: 'Non contacté', score: 0.66, source: 'Annuaire', actions: ['WA', 'SMS'], metierFilter: 'kine' },
]

const STATUS_COLORS: Record<ProspectStatus, string> = {
  'Non contacté': '#7a92e8',
  'En cours': '#e8c878',
  'Converti': '#4ade80',
  'Perdu': '#ff6470',
}

const ACTION_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  WA:    { bg: '#0d1a0d', color: '#4ade80', border: '#4ade8040' },
  email: { bg: '#11163a', color: '#7a92e8', border: '#7a92e840' },
  SMS:   { bg: '#14193d', color: '#e8c878', border: '#e8c87840' },
  LI:    { bg: '#0a1929', color: '#7a92e8', border: '#7a92e840' },
  seq:   { bg: '#1a2150', color: '#d8e1ff', border: '#3a469040' },
}

const ACTION_LABELS: Record<string, string> = {
  WA: 'WA', email: '@', SMS: 'SMS', LI: 'in', seq: '▶',
}

const FILTER_LABELS: Record<MetierFilter, string> = {
  all: 'Tous (23)', medecin: 'Médecins (8)', infirmier: 'Infirmiers (5)', kine: 'Kinés (6)', avocat: 'Avocats (4)',
}

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

function StatusBadge({ status }: { status: ProspectStatus }) {
  const color = STATUS_COLORS[status]
  const labels: Record<ProspectStatus, string> = {
    'Non contacté': 'Non contacté',
    'En cours': 'En cours',
    'Converti': 'Converti',
    'Perdu': 'Perdu',
  }
  return (
    <span style={{ fontSize: 9, fontWeight: 600, borderRadius: 6, padding: '3px 8px', background: color + '20', color, border: `1px solid ${color}44`, whiteSpace: 'nowrap' as const }}>
      {labels[status]}
    </span>
  )
}

function ScoreDot({ score }: { score: number }) {
  const color = score >= 0.8 ? C.green : score >= 0.65 ? C.gold : C.cyan
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 5px ${color}80` }} />
      <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color }}>{Math.round(score * 100)}%</span>
    </div>
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

type SearchResult = {
  id: number
  siren: string | null
  initials: string
  nom: string
  entreprise: string
  metier: string
  ville: string
  codePostal: string
  adresse: string
  telephone: string | null
  email: string | null
  googleUrl: string
  pagesJaunesUrl?: string
  mapsUrl: string
  lat: number | null
  lng: number | null
  status: ProspectStatus
  score: number
  source: string
}

export default function TnsPage() {
  const [metier, setMetier] = useState('')
  const [ville, setVille] = useState('')
  const [includeTel, setIncludeTel] = useState(true)
  const [includeEmail, setIncludeEmail] = useState(false)
  const [limite, setLimite] = useState('10')
  const [showResults, setShowResults] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [addingAll, setAddingAll] = useState(false)
  const [activeFilter, setActiveFilter] = useState<MetierFilter>('all')
  const [prospects, setProspects] = useState<Prospect[]>(BASE_PROSPECTS)
  const [selectedProspect, setSelectedProspect] = useState<ProspectCardData | null>(null)
  const [hasUserProspects, setHasUserProspects] = useState(false)
  const [contactedPhones, setContactedPhones] = useState<Set<string>>(new Set())
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [showCreateSession, setShowCreateSession] = useState(false)

  function toggleSelect(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selectedIds.size === searchResults.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(searchResults.map(r => r.id)))
  }

  const selectedContacts = searchResults.filter(r => selectedIds.has(r.id))

  useEffect(() => {
    try {
      const stored = localStorage.getItem('tns_contacted_phones')
      if (stored) setContactedPhones(new Set(JSON.parse(stored) as string[]))
    } catch { /* ignore */ }
  }, [])

  function handleContacted(phone: string, contacted: boolean) {
    const norm = phone.replace(/[\s.\-]/g, '')
    setContactedPhones(prev => {
      const next = new Set(prev)
      if (contacted) next.add(norm)
      else next.delete(norm)
      try { localStorage.setItem('tns_contacted_phones', JSON.stringify([...next])) } catch { /* ignore */ }
      return next
    })
  }

  function isPhoneContacted(phone: string | null | undefined): boolean {
    if (!phone) return false
    return contactedPhones.has(phone.replace(/[\s.\-]/g, ''))
  }

  const stats = {
    total: prospects.length,
    nonContactes: prospects.filter(p => p.status === 'Non contacté').length,
    enCours: prospects.filter(p => p.status === 'En cours').length,
    convertis: prospects.filter(p => p.status === 'Converti').length,
  }

  async function handleSearch() {
    if (!metier || !ville) return
    setSearchLoading(true)
    setSearchError(null)
    setShowResults(false)
    try {
      const res = await fetch('/api/prospection/tns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metier, ville, limite: parseInt(limite) || 10 }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error ?? 'Erreur recherche')
      setSearchResults(data.data.prospects ?? [])
      setShowResults(true)
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSearchLoading(false)
    }
  }

  function exportCSV() {
    if (searchResults.length === 0) return
    const rows = [
      ['Nom', 'Entreprise', 'Métier', 'Ville', 'Téléphone', 'SIREN', 'Score'],
      ...searchResults.map(r => [r.nom, r.entreprise, r.metier, r.ville, r.telephone ?? '', r.siren ?? '', String(Math.round(r.score * 100)) + '%']),
    ]
    const csv = rows.map(row => row.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tns_${metier}_${ville}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function addAllToProspection() {
    if (searchResults.length === 0) return
    setAddingAll(true)
    try {
      await Promise.all(
        searchResults.map(r =>
          fetch('/api/prospects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              full_name: r.nom,
              company: r.entreprise,
              profession: r.metier,
              city: r.ville,
              phone: r.telephone ?? '',
              source: 'tns',
              tags: [metier],
              notes: r.adresse ? `Adresse: ${r.adresse}` : '',
            }),
          })
        )
      )
      // Update local list
      const asProspects: Prospect[] = searchResults.map((r, i) => ({
        id: Date.now() + i,
        initials: r.initials,
        nom: r.nom,
        metier: r.metier,
        ville: r.ville,
        telephone: r.telephone ?? '—',
        status: 'Non contacté' as ProspectStatus,
        score: r.score,
        source: r.source,
        actions: ['email', 'seq'] as ('WA' | 'email' | 'SMS' | 'LI' | 'seq')[],
        metierFilter: 'all' as MetierFilter,
      }))
      setProspects(prev => [...asProspects, ...prev])
      setHasUserProspects(true)
      setShowResults(false)
      setSearchResults([])
    } catch {
      setSearchError('Erreur lors de l\'ajout au CRM')
    } finally {
      setAddingAll(false)
    }
  }

  const filtered = prospects.filter(p => activeFilter === 'all' || p.metierFilter === activeFilter)

  return (
    <>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap')"}</style>

      {/* Header */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 18, fontWeight: 600, color: C.textHi, letterSpacing: '0.06em', marginBottom: 2 }}>PROSPECTION TNS</div>
        <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo }}>Recherche et gestion de prospects Travailleurs Non Salariés</div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
        {[
          { label: 'TNS extraits', val: stats.total, sub: 'Base totale', accent: C.indigo },
          { label: 'Non contactés', val: stats.nonContactes, sub: 'À traiter', accent: C.green },
          { label: 'En cours', val: stats.enCours, sub: 'Prospection', accent: C.gold },
          { label: 'Convertis', val: stats.convertis, sub: 'Clients', accent: C.cyan },
        ].map(k => (
          <div key={k.label} style={{ background: `linear-gradient(180deg,${C.surface2},${C.surface1})`, border: `1px solid ${C.line}`, borderRadius: 10, padding: '12px 14px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: k.accent, opacity: 0.55 }} />
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7.5, color: C.textLo, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{k.label}</div>
            <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 26, fontWeight: 600, color: C.textHi, lineHeight: 1, marginBottom: 2 }}>{k.val}</div>
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: k.accent }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Search panel */}
      <Panel accent={C.green} style={{ background: `linear-gradient(180deg,#0a140a,${C.surface1})`, border: `1px solid #4ade8030` }}>
        <PanelTitle title="Recherche de numéros TNS" accent={C.green} />
        <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, marginBottom: 14 }}>
          Trouve des numéros de téléphone par métier et localisation
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 5 }}>Métier *</label>
            <select
              value={metier}
              onChange={e => setMetier(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.text, fontSize: 9, fontFamily: 'JetBrains Mono,monospace', outline: 'none' }}
            >
              <option value="">-- Sélectionne un métier --</option>
              {METIERS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 5 }}>Ville *</label>
            <input
              type="text"
              value={ville}
              onChange={e => setVille(e.target.value)}
              placeholder="Ex: Paris, Lyon, Marseille..."
              style={{ width: '100%', padding: '8px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.text, fontSize: 9, fontFamily: 'JetBrains Mono,monospace', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textMid, cursor: 'pointer' }}>
            <input type="checkbox" checked={includeTel} onChange={e => setIncludeTel(e.target.checked)} style={{ accentColor: C.green }} />
            Inclure téléphone
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textMid, cursor: 'pointer' }}>
            <input type="checkbox" checked={includeEmail} onChange={e => setIncludeEmail(e.target.checked)} style={{ accentColor: C.green }} />
            Inclure email (si disponible)
          </label>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 5 }}>Nombre de résultats (max 50)</label>
          <input
            type="number"
            value={limite}
            onChange={e => setLimite(e.target.value)}
            min={1}
            max={50}
            style={{ width: '100%', padding: '8px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.text, fontSize: 9, fontFamily: 'JetBrains Mono,monospace', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <button
          onClick={handleSearch}
          disabled={searchLoading || !metier || !ville}
          style={{ width: '100%', padding: '10px 0', borderRadius: 6, border: `1px solid #4ade8060`, background: '#0a140a', color: C.green, cursor: searchLoading || !metier || !ville ? 'not-allowed' : 'pointer', fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', opacity: !metier || !ville ? 0.5 : 1 }}
        >
          {searchLoading ? '⏳ RECHERCHE EN COURS...' : 'LANCER LA RECHERCHE'}
        </button>
      </Panel>

      {/* Error banner */}
      {searchError && (
        <div style={{ background: '#1a0d0d', border: `1px solid #ff647060`, borderRadius: 8, padding: '10px 14px', fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: '#ff6470', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>⚠️</span>
          <span>{searchError}</span>
        </div>
      )}

      {/* Search results */}
      {showResults && (
        <Panel accent={C.indigo}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <PanelTitle title={`Résultats (${searchResults.length})`} accent={C.indigo} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, cursor: 'pointer' }}>
                <input type="checkbox" checked={selectedIds.size === searchResults.length && searchResults.length > 0} onChange={toggleAll} style={{ accentColor: C.indigo }} />
                Tout sélectionner
              </label>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {selectedIds.size > 0 && (
                <button
                  onClick={() => setShowCreateSession(true)}
                  style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, padding: '5px 10px', borderRadius: 5, border: `1px solid ${C.green}40`, background: '#0a140a', color: C.green, cursor: 'pointer', fontWeight: 600 }}
                >
                  🚀 Session d&apos;appels ({selectedIds.size})
                </button>
              )}
              <button onClick={exportCSV} style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, padding: '5px 10px', borderRadius: 5, border: `1px solid ${C.indigo}40`, background: C.surface2, color: C.indigo, cursor: 'pointer' }}>
                📥 Export CSV
              </button>
              <button
                onClick={addAllToProspection}
                disabled={addingAll}
                style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, padding: '5px 10px', borderRadius: 5, border: `1px solid #4ade8040`, background: '#0a140a', color: C.green, cursor: addingAll ? 'not-allowed' : 'pointer', opacity: addingAll ? 0.6 : 1 }}
              >
                {addingAll ? '⏳ Ajout...' : '➕ Tout ajouter'}
              </button>
            </div>
          </div>
          <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
            {searchResults.map(r => (
              <div key={r.id} onClick={() => setSelectedProspect({ id: r.id, nom: r.nom, entreprise: r.entreprise, siren: r.siren, metier: r.metier, ville: r.ville, codePostal: r.codePostal, adresse: r.adresse, telephone: r.telephone, email: r.email, score: r.score, source: r.source, googleUrl: r.googleUrl, mapsUrl: r.mapsUrl })} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: selectedIds.has(r.id) ? `${C.indigo}15` : C.surface2, borderRadius: 7, border: `1px solid ${selectedIds.has(r.id) ? C.indigo + '60' : C.lineSoft}`, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(r.id)}
                  onChange={() => toggleSelect(r.id)}
                  onClick={e => e.stopPropagation()}
                  style={{ accentColor: C.indigo, flexShrink: 0 }}
                />
                <div style={{ width: 30, height: 30, borderRadius: 8, background: C.surface3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Oswald,sans-serif', fontSize: 10, color: C.indigo, fontWeight: 600, flexShrink: 0 }}>{r.initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 11, color: C.textHi, fontWeight: 500 }}>{r.nom}</div>
                  <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo }}>{r.metier} · {r.ville}{r.codePostal ? ` (${r.codePostal})` : ''}</div>
                  {r.adresse && <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7.5, color: C.textLo }}>{r.adresse}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end', flexShrink: 0 }}>
                  {r.telephone ? (
                    <a href={`tel:${r.telephone}`} onClick={(e) => e.stopPropagation()} style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, padding: '3px 8px', borderRadius: 5, border: `1px solid #4ade8040`, background: '#0a140a', color: C.green, textDecoration: 'none', fontWeight: 600 }}>
                      📞 {r.telephone}
                    </a>
                  ) : (
                    <div style={{ display: 'flex', gap: 3 }}>
                      {r.pagesJaunesUrl && (
                        <a href={r.pagesJaunesUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7, padding: '3px 7px', borderRadius: 5, border: `1px solid #f5a62340`, background: '#1a1000', color: '#f5a623', textDecoration: 'none' }}>
                          PJ
                        </a>
                      )}
                      <a href={r.googleUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7, padding: '3px 7px', borderRadius: 5, border: `1px solid ${C.indigo}40`, background: C.surface3, color: C.indigo, textDecoration: 'none' }}>
                        🔍
                      </a>
                    </div>
                  )}
                  {r.email && <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7, color: C.textLo }}>{r.email}</span>}
                </div>
                <ScoreDot score={r.score} />
                {isPhoneContacted(r.telephone)
                  ? <span style={{ fontSize: 8, padding: '2px 7px', borderRadius: 5, background: '#0a1f0a', color: C.green, border: `1px solid ${C.green}40`, fontFamily: 'JetBrains Mono,monospace', fontWeight: 600, whiteSpace: 'nowrap' as const }}>✓ Contacté</span>
                  : <StatusBadge status={r.status} />
                }
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Current base */}
      <Panel accent={C.gold}>
        <PanelTitle title="Base TNS actuelle" accent={C.gold} />
        <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, marginBottom: 12 }}>
          Prospects TNS déjà dans ta base
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const, marginBottom: 14 }}>
          {(Object.keys(FILTER_LABELS) as MetierFilter[]).map(f => {
            const active = activeFilter === f
            return (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                style={{
                  fontFamily: 'JetBrains Mono,monospace', fontSize: 8, padding: '4px 10px', borderRadius: 10, cursor: 'pointer',
                  background: active ? '#1a1400' : C.surface2,
                  color: active ? C.gold : C.textLo,
                  border: active ? `1px solid ${C.gold}50` : `1px solid ${C.lineSoft}`,
                  fontWeight: active ? 600 : 400,
                }}
              >
                {FILTER_LABELS[f]}
              </button>
            )
          })}
        </div>

        {/* Prospect list */}
        {hasUserProspects ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filtered.map(p => (
              <div key={p.id} onClick={() => setSelectedProspect({ id: p.id, nom: p.nom, metier: p.metier, ville: p.ville, telephone: p.telephone, score: p.score, source: p.source })} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', background: C.surface2, borderRadius: 8, border: `1px solid ${C.lineSoft}`, cursor: 'pointer' }}>
                {/* Avatar */}
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: p.status === 'Converti' ? '#0a1f0a' : p.status === 'En cours' ? '#1a1400' : C.surface3,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 700,
                  color: p.status === 'Converti' ? C.green : p.status === 'En cours' ? C.gold : C.indigo,
                  border: `1px solid ${p.status === 'Converti' ? C.green + '40' : p.status === 'En cours' ? C.gold + '40' : C.line}`,
                }}>
                  {p.initials}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 12, color: C.textHi, fontWeight: 500, marginBottom: 1 }}>{p.nom}</div>
                  <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo }}>
                    {p.metier} · {p.ville} · <a href={`tel:${p.telephone}`} style={{ color: C.gold, textDecoration: 'none' }}>{p.telephone}</a>
                  </div>
                </div>

                {/* Score */}
                <ScoreDot score={p.score} />

                {/* Actions */}
                <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                  {p.actions.map((a, i) => <ActionBtn key={i} type={a} />)}
                </div>

                {/* Status */}
                <StatusBadge status={p.status} />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
            <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 14, color: C.textMid, marginBottom: 6 }}>Aucun prospect ajouté</div>
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 11, color: C.textLo }}>Lancez une recherche et cliquez &quot;Tout ajouter&quot; pour remplir votre liste</div>
          </div>
        )}
      </Panel>

      {showCreateSession && (
        <CreateSessionModal
          contacts={selectedContacts.map(r => ({
            siren: r.siren,
            nom: r.nom,
            entreprise: r.entreprise,
            metier: r.metier,
            ville: r.ville,
            telephone: r.telephone ?? '',
            email: r.email,
            adresse: r.adresse,
            source: r.source,
          }))}
          metier={metier}
          metierLabel={METIERS.find(m => m.value === metier)?.label ?? metier}
          ville={ville}
          source="tns"
          onClose={() => setShowCreateSession(false)}
          onCreated={() => {
            setShowCreateSession(false)
            setSelectedIds(new Set())
            window.location.href = '/today'
          }}
        />
      )}

      {selectedProspect && (
        <ProspectCard
          prospect={selectedProspect}
          onClose={() => setSelectedProspect(null)}
          isContacted={isPhoneContacted(selectedProspect.telephone)}
          onContacted={handleContacted}
          onAddToCRM={async (p) => {
            await fetch('/api/prospects', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                full_name: p.nom,
                company: p.entreprise ?? '',
                profession: p.metier ?? '',
                city: p.ville ?? '',
                phone: p.telephone ?? '',
                email: p.email ?? '',
                source: 'tns',
                notes: p.adresse ? `Adresse: ${p.adresse}` : '',
              }),
            })
          }}
        />
      )}
    </>
  )
}
