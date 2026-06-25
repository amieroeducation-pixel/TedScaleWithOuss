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
  // Médecine générale
  { value: 'medecin_generaliste', label: 'Médecin généraliste' },
  // Spécialistes
  { value: 'cardiologue', label: 'Cardiologue' },
  { value: 'dermatologue', label: 'Dermatologue' },
  { value: 'ophtalmologue', label: 'Ophtalmologue' },
  { value: 'radiologue', label: 'Radiologue' },
  { value: 'pediatre', label: 'Pédiatre' },
  { value: 'orl', label: 'ORL' },
  { value: 'gynecologue', label: 'Gynécologue' },
  { value: 'urologue', label: 'Urologue' },
  { value: 'pneumologue', label: 'Pneumologue' },
  { value: 'gastro_enterologue', label: 'Gastro-entérologue' },
  { value: 'neurologue', label: 'Neurologue' },
  { value: 'rhumatologue', label: 'Rhumatologue' },
  { value: 'endocrinologue', label: 'Endocrinologue' },
  { value: 'oncologue', label: 'Oncologue' },
  { value: 'nephrologue', label: 'Néphrologue' },
  { value: 'hematologue', label: 'Hématologue' },
  { value: 'allergologue', label: 'Allergologue' },
  // Chirurgie
  { value: 'chirurgien', label: 'Chirurgien' },
  { value: 'anesthesiste', label: 'Anesthésiste' },
  // Dentaire
  { value: 'dentiste', label: 'Chirurgien dentiste' },
  { value: 'orthodontiste', label: 'Orthodontiste' },
  // Paramédical
  { value: 'infirmier', label: 'Infirmier libéral' },
  { value: 'sage_femme', label: 'Sage-femme' },
  { value: 'kinesitherapeute', label: 'Kinésithérapeute' },
  { value: 'orthophoniste', label: 'Orthophoniste' },
  { value: 'podologue', label: 'Podologue' },
  { value: 'ergotherapeute', label: 'Ergothérapeute' },
  { value: 'orthoptiste', label: 'Orthoptiste' },
  // Pratiques alternatives
  { value: 'kinesiologue', label: 'Kinésiologue' },
  { value: 'naturopathe', label: 'Naturopathe' },
  { value: 'acupuncteur', label: 'Acupuncteur' },
  { value: 'homeopathe', label: 'Homéopathe' },
  { value: 'osteopathe', label: 'Ostéopathe' },
  { value: 'chiropracteur', label: 'Chiropracteur' },
  { value: 'dieteticien', label: 'Diététicien' },
  // Psychologie
  { value: 'psychologue', label: 'Psychologue' },
  { value: 'psychotherapeute', label: 'Psychothérapeute' },
  // Pharmacie
  { value: 'pharmacien', label: 'Pharmacien' },
  // Juridique
  { value: 'avocat', label: 'Avocat' },
  { value: 'notaire', label: 'Notaire' },
  { value: 'huissier', label: 'Huissier de justice' },
  // Comptabilité
  { value: 'expert_comptable', label: 'Expert-comptable' },
  { value: 'commissaire_comptes', label: 'Commissaire aux comptes' },
  // Autres
  { value: 'architecte', label: 'Architecte' },
  { value: 'geometre_expert', label: 'Géomètre-expert' },
  { value: 'veterinaire', label: 'Vétérinaire' },
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
  const [metiersSelected, setMetiersSelected] = useState<string[]>([])
  const [ville, setVille] = useState('')
  const [includeTel, setIncludeTel] = useState(true)
  const [includeEmail, setIncludeEmail] = useState(false)
  const [mobileOnly, setMobileOnly] = useState(false)
  const [limite, setLimite] = useState('10')
  const [showResults, setShowResults] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [addingAll, setAddingAll] = useState(false)
  const [activeFilter, setActiveFilter] = useState<MetierFilter>('all')
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [prospectsLoading, setProspectsLoading] = useState(true)
  const [selectedProspect, setSelectedProspect] = useState<ProspectCardData | null>(null)

  const [contactedPhones, setContactedPhones] = useState<Set<string>>(new Set())
  const [showCreateSession, setShowCreateSession] = useState(false)
  // Panier multi-métiers : contacts accumulés entre plusieurs recherches
  const [panier, setPanier] = useState<SearchResult[]>([])

  function normPhone(p: string | null | undefined) { return (p ?? '').replace(/[\s.\-]/g, '') }

  function isPanier(r: SearchResult) {
    return panier.some(p => normPhone(p.telephone) === normPhone(r.telephone))
  }

  function toggleSelect(r: SearchResult) {
    setPanier(prev => {
      if (isPanier(r)) return prev.filter(p => normPhone(p.telephone) !== normPhone(r.telephone))
      return [...prev, r]
    })
  }

  function toggleAll() {
    const allInPanier = searchResults.every(r => isPanier(r))
    if (allInPanier) {
      const phones = new Set(searchResults.map(r => normPhone(r.telephone)))
      setPanier(prev => prev.filter(p => !phones.has(normPhone(p.telephone))))
    } else {
      const newOnes = searchResults.filter(r => !isPanier(r))
      setPanier(prev => [...prev, ...newOnes])
    }
  }

  useEffect(() => {
    try {
      const stored = localStorage.getItem('tns_contacted_phones')
      if (stored) setContactedPhones(new Set(JSON.parse(stored) as string[]))
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    fetch('/api/prospects?source=tns&limit=50')
      .then(r => r.json())
      .then(j => {
        if (Array.isArray(j.data)) {
          setProspects(j.data.map((p: {
            id: string; full_name: string; profession?: string; city?: string;
            phone?: string; pipeline_stage?: string; lead_score?: number; source?: string;
          }, i: number): Prospect => ({
            id: i + 1,
            initials: p.full_name.split(' ').map((w: string) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '??',
            nom: p.full_name,
            metier: p.profession ?? '',
            ville: p.city ?? '',
            telephone: p.phone ?? '—',
            status: (p.pipeline_stage === 'converti' ? 'Converti' : p.pipeline_stage === 'perdu' ? 'Perdu' : p.pipeline_stage === 'rdv1' ? 'En cours' : 'Non contacté') as ProspectStatus,
            score: p.lead_score ?? 0.5,
            source: p.source ?? 'tns',
            actions: ['WA', 'seq'] as ('WA' | 'email' | 'SMS' | 'LI' | 'seq')[],
            metierFilter: 'all' as MetierFilter,
          })))
        }
      })
      .catch(() => {})
      .finally(() => setProspectsLoading(false))
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
    if (metiersSelected.length === 0 || !ville) return
    setSearchLoading(true)
    setSearchError(null)
    setShowResults(false)
    try {
      const allResults = await Promise.all(
        metiersSelected.map(m =>
          fetch('/api/prospection/tns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ metier: m, ville, limite: parseInt(limite) || 10, mobileOnly }),
          })
          .then(r => r.json())
          .then(d => (d.success ? (d.data.prospects as SearchResult[]) : []))
          .catch(() => [] as SearchResult[])
        )
      )
      // Fusion + dédoublonnage par téléphone
      const seen = new Set<string>()
      const merged: SearchResult[] = []
      for (const r of allResults.flat()) {
        const key = normPhone(r.telephone)
        if (!key || seen.has(key)) continue
        seen.add(key)
        merged.push(r)
      }
      setSearchResults(merged.map((r, i) => ({ ...r, id: i + 1 })))
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
    a.download = `tns_${metiersSelected.join('_')}_${ville}_${new Date().toISOString().split('T')[0]}.csv`
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
              tags: metiersSelected,
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
            <div>
                <div style={{ fontSize: 9, color: C.textLo, marginBottom: 8, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 1 }}>
                  Métier(s) — {metiersSelected.length === 0 ? 'Sélectionner' : `${metiersSelected.length} choisi${metiersSelected.length > 1 ? 's' : ''}`}
                </div>
                <div style={{ maxHeight: 140, overflowY: 'auto' as const, display: 'flex', flexDirection: 'column' as const, gap: 4, paddingRight: 4 }}>
                  {METIERS.map(m => {
                    const checked = metiersSelected.includes(m.value)
                    return (
                      <label key={m.value} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 8px', borderRadius: 5, background: checked ? `${C.indigo}18` : 'transparent', border: `1px solid ${checked ? C.indigo : 'transparent'}` }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => setMetiersSelected(prev => checked ? prev.filter(v => v !== m.value) : [...prev, m.value])}
                          style={{ accentColor: C.indigo, width: 12, height: 12 }}
                        />
                        <span style={{ fontSize: 10, color: checked ? C.textHi : C.textMid }}>{m.label}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textMid, cursor: 'pointer' }}>
            <input type="checkbox" checked={includeTel} onChange={e => setIncludeTel(e.target.checked)} style={{ accentColor: C.green }} />
            Inclure téléphone
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textMid, cursor: 'pointer' }}>
            <input type="checkbox" checked={includeEmail} onChange={e => setIncludeEmail(e.target.checked)} style={{ accentColor: C.green }} />
            Inclure email (si disponible)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textMid, cursor: 'pointer' }}>
            <input type="checkbox" checked={mobileOnly} onChange={e => setMobileOnly(e.target.checked)} style={{ accentColor: C.gold }} />
            Portables uniquement (06/07)
          </label>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 5 }}>Nombre de résultats (max 200)</label>
          <input
            type="number"
            value={limite}
            onChange={e => setLimite(e.target.value)}
            min={1}
            max={200}
            style={{ width: '100%', padding: '8px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.text, fontSize: 9, fontFamily: 'JetBrains Mono,monospace', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <button
          onClick={handleSearch}
          disabled={searchLoading || metiersSelected.length === 0 || !ville}
          style={{ width: '100%', padding: '10px 0', borderRadius: 6, border: `1px solid #4ade8060`, background: '#0a140a', color: C.green, cursor: searchLoading || metiersSelected.length === 0 || !ville ? 'not-allowed' : 'pointer', fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', opacity: metiersSelected.length === 0 || !ville ? 0.5 : 1 }}
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

      {/* Bandeau panier persistant */}
      {panier.length > 0 && (
        <div style={{ background: '#0a1f0a', border: `1px solid ${C.green}50`, borderRadius: 8, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.green }}>
            🗂️ <strong>{panier.length}</strong> contact{panier.length > 1 ? 's' : ''} dans le panier
            {[...new Set(panier.map(p => p.metier))].length > 1 && (
              <span style={{ color: C.textLo, marginLeft: 8 }}>· {[...new Set(panier.map(p => p.metier))].length} métiers</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setShowCreateSession(true)}
              style={{ fontFamily: 'Oswald,sans-serif', fontSize: 10, fontWeight: 600, padding: '6px 14px', borderRadius: 6, border: `1px solid ${C.green}60`, background: C.green + '20', color: C.green, cursor: 'pointer', letterSpacing: '0.05em' }}
            >
              🚀 CRÉER LA SESSION
            </button>
            <button
              onClick={() => setPanier([])}
              style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, padding: '6px 10px', borderRadius: 6, border: `1px solid #ff647030`, background: 'transparent', color: '#ff6470', cursor: 'pointer' }}
            >
              Vider
            </button>
          </div>
        </div>
      )}

      {/* Search results */}
      {showResults && (
        <Panel accent={C.indigo}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <PanelTitle title={`Résultats (${searchResults.length})`} accent={C.indigo} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, cursor: 'pointer' }}>
                <input type="checkbox" checked={searchResults.length > 0 && searchResults.every(r => isPanier(r))} onChange={toggleAll} style={{ accentColor: C.indigo }} />
                Tout sélectionner ({searchResults.length})
              </label>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={exportCSV} style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, padding: '5px 10px', borderRadius: 5, border: `1px solid ${C.indigo}40`, background: C.surface2, color: C.indigo, cursor: 'pointer' }}>
                📥 Export CSV
              </button>
              <button
                onClick={addAllToProspection}
                disabled={addingAll}
                style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, padding: '5px 10px', borderRadius: 5, border: `1px solid #4ade8040`, background: '#0a140a', color: C.green, cursor: addingAll ? 'not-allowed' : 'pointer', opacity: addingAll ? 0.6 : 1 }}
              >
                {addingAll ? '⏳ Ajout...' : '➕ Tout ajouter CRM'}
              </button>
            </div>
          </div>
          <div style={{ maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
            {searchResults.map(r => (
              <div key={r.id} onClick={() => setSelectedProspect({ id: r.id, nom: r.nom, entreprise: r.entreprise, siren: r.siren, metier: r.metier, ville: r.ville, codePostal: r.codePostal, adresse: r.adresse, telephone: r.telephone, email: r.email, score: r.score, source: r.source, googleUrl: r.googleUrl, mapsUrl: r.mapsUrl })} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: isPanier(r) ? `${C.indigo}15` : C.surface2, borderRadius: 7, border: `1px solid ${isPanier(r) ? C.indigo + '60' : C.lineSoft}`, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isPanier(r)}
                  onChange={() => toggleSelect(r)}
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
        {prospectsLoading && <div style={{ fontSize: 10, color: C.textLo, padding: 16, textAlign: 'center' }}>Chargement...</div>}
        {!prospectsLoading && filtered.length === 0 && (
          <div style={{ fontSize: 10, color: C.textLo, padding: 16, textAlign: 'center', fontStyle: 'italic' }}>
            Aucun prospect TNS. Lancez une recherche et ajoutez des contacts.
          </div>
        )}
        {!prospectsLoading && filtered.length > 0 && (
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
        )}
      </Panel>

      {showCreateSession && (
        <CreateSessionModal
          contacts={panier.map(r => ({
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
          metier={panier[0]?.metier ? (METIERS.find(m => m.label === panier[0].metier)?.value ?? 'medecin_generaliste') : (metiersSelected[0] || 'medecin_generaliste')}
          metierLabel={[...new Set(panier.map(p => p.metier))].join(', ') || (METIERS.find(m => m.value === metiersSelected[0])?.label ?? metiersSelected[0] ?? '')}
          ville={ville}
          source="tns"
          onClose={() => setShowCreateSession(false)}
          onCreated={() => {
            setShowCreateSession(false)
            setPanier([])
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
          onStartSequence={async (p) => {
            // 1. Add to CRM if needed
            const res = await fetch('/api/prospects', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                full_name: p.nom,
                company: p.entreprise ?? '',
                profession: p.metier ?? '',
                city: p.ville ?? '',
                phone: p.telephone ?? '',
                source: 'tns',
              }),
            })
            const json = await res.json()
            const prospectId = json.data?.id ?? (Array.isArray(json.data) ? null : json.data?.prospect?.id)
            if (!prospectId) {
              alert('Impossible d\'ajouter le prospect au CRM.')
              return
            }
            // 2. Get first available template
            const tplRes = await fetch('/api/crm/sequences/templates')
            const tplJson = await tplRes.json()
            const templates: Array<{ id: string; name: string }> = tplJson.data?.templates ?? []
            if (templates.length === 0) {
              alert('Aucun template de séquence disponible. Créez-en un dans Paramètres → Séquences.')
              return
            }
            // 3. Start sequence
            await fetch('/api/crm/sequences/start', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prospect_id: prospectId, template_id: templates[0].id }),
            })
            alert(`Séquence "${templates[0].name}" démarrée pour ${p.nom}`)
          }}
        />
      )}
    </>
  )
}
