'use client'

import { useState, useEffect } from 'react'
import { C } from '@/lib/theme'

interface Dept {
  code: string
  name: string
  city: string
  prospects: number
  contacted: number
  rdv: number
  avgScore: number
  density: 'high' | 'medium' | 'low'
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
  score: number
}

const DEPARTMENTS: Dept[] = [
  { code: '75', name: 'Paris intra',      city: 'Paris',                prospects: 142, contacted: 87, rdv: 32, avgScore: 4.2, density: 'high' },
  { code: '92', name: 'Hauts-de-Seine',   city: 'Boulogne-Billancourt', prospects: 89,  contacted: 52, rdv: 21, avgScore: 3.8, density: 'high' },
  { code: '94', name: 'Val-de-Marne',     city: 'Créteil',              prospects: 64,  contacted: 31, rdv: 12, avgScore: 3.4, density: 'medium' },
  { code: '93', name: 'Seine-Saint-Denis',city: 'Saint-Denis',          prospects: 52,  contacted: 18, rdv: 7,  avgScore: 2.6, density: 'low' },
  { code: '78', name: 'Yvelines',         city: 'Versailles',           prospects: 94,  contacted: 19, rdv: 7,  avgScore: 3.1, density: 'medium' },
  { code: '77', name: 'Seine-et-Marne',   city: 'Melun',                prospects: 78,  contacted: 14, rdv: 5,  avgScore: 2.9, density: 'low' },
  { code: '91', name: 'Essonne',          city: 'Évry',                 prospects: 62,  contacted: 9,  rdv: 3,  avgScore: 2.7, density: 'low' },
  { code: '95', name: "Val-d'Oise",       city: 'Cergy',                prospects: 30,  contacted: 4,  rdv: 1,  avgScore: 2.3, density: 'low' },
]

const METIERS = [
  { value: 'medecin_generaliste', label: 'Médecin généraliste' },
  { value: 'dentiste',            label: 'Chirurgien-dentiste' },
  { value: 'kinesitherapeute',    label: 'Kinésithérapeute' },
  { value: 'infirmier',           label: 'Infirmier libéral' },
  { value: 'pharmacien',          label: 'Pharmacien' },
  { value: 'avocat',              label: 'Avocat' },
  { value: 'expert_comptable',    label: 'Expert-comptable' },
  { value: 'notaire',             label: 'Notaire' },
  { value: 'architecte',          label: 'Architecte' },
  { value: 'psychologue',         label: 'Psychologue' },
]

const densityConfig = {
  high:   { border: '#ff6470', glow: '#ff647030', badge: '#ff647018', label: 'Dense',  pinColor: '#ff6470' },
  medium: { border: '#7a92e8', glow: '#7a92e828', badge: '#7a92e815', label: 'Moyen',  pinColor: '#7a92e8' },
  low:    { border: '#5a6ba8', glow: 'transparent', badge: '#5a6ba812', label: 'Faible', pinColor: '#8ea0d9' },
}

function Panel({ children, accent = C.indigo }: { children: React.ReactNode; accent?: string }) {
  return (
    <div style={{ background: `linear-gradient(180deg,${C.surface1},${C.bgMid})`, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${accent}88,transparent)` }} />
      {children}
    </div>
  )
}

function PanelTitle({ title, accent = C.indigo }: { title: string; accent?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
      <span style={{ width: 6, height: 6, background: accent, transform: 'rotate(45deg)', display: 'inline-block', boxShadow: `0 0 7px ${accent}`, flexShrink: 0 }} />
      <span style={{ fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 500, color: C.textHi, textTransform: 'uppercase', letterSpacing: '0.16em' }}>{title}</span>
    </div>
  )
}

export default function MapPage() {
  const [activeZone, setActiveZone] = useState<string | null>(null)
  const [selectedMetier, setSelectedMetier] = useState('medecin_generaliste')
  const [mapResults, setMapResults] = useState<SearchResult[]>([])
  const [mapLoading, setMapLoading] = useState<string | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)
  const [searchedDept, setSearchedDept] = useState<Dept | null>(null)
  const [deptStats, setDeptStats] = useState<Record<string, { prospects: number; contacted: number; rdv: number }>>({})

  useEffect(() => {
    fetch('/api/prospects?limit=200')
      .then(r => r.json())
      .then(json => {
        if (!json.success || !Array.isArray(json.data)) return
        const stats: Record<string, { prospects: number; contacted: number; rdv: number }> = {}
        DEPARTMENTS.forEach(d => { stats[d.code] = { prospects: 0, contacted: 0, rdv: 0 } })
        json.data.forEach((p: { department?: string; pipeline_stage?: string }) => {
          const dept = p.department || ''
          const code = dept.slice(0, 2)
          if (!stats[code]) stats[code] = { prospects: 0, contacted: 0, rdv: 0 }
          stats[code].prospects++
          if (p.pipeline_stage && p.pipeline_stage !== 'a_contacter') stats[code].contacted++
          if (p.pipeline_stage && ['rdv_planifie', 'proposition', 'converti'].includes(p.pipeline_stage)) stats[code].rdv++
        })
        setDeptStats(stats)
      })
      .catch(() => {})
  }, [])

  const departments = DEPARTMENTS.map(d => ({
    ...d,
    prospects: deptStats[d.code]?.prospects ?? d.prospects,
    contacted: deptStats[d.code]?.contacted ?? d.contacted,
    rdv: deptStats[d.code]?.rdv ?? d.rdv,
  }))

  const totals = {
    prospects: departments.reduce((s, d) => s + d.prospects, 0),
    contacted: departments.reduce((s, d) => s + d.contacted, 0),
    rdv: departments.reduce((s, d) => s + d.rdv, 0),
    converted: departments.reduce((s, d) => s + d.rdv, 0),
  }
  const avgScore = (departments.reduce((s, d) => s + d.avgScore, 0) / departments.length).toFixed(1)

  async function lancerProspection(dept: Dept) {
    setMapLoading(dept.code)
    setMapError(null)
    setMapResults([])
    setSearchedDept(dept)
    setActiveZone(dept.code)
    try {
      const res = await fetch('/api/prospection/tns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metier: selectedMetier, departement: dept.code, limite: 20 }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error ?? 'Erreur')
      setMapResults(data.data.prospects ?? [])
    } catch (err) {
      setMapError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setMapLoading(null)
    }
  }

  return (
    <>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap')"}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div>
          <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 22, fontWeight: 600, color: C.textHi, letterSpacing: '0.06em' }}>CARTE TNS · ÎLE-DE-FRANCE</div>
          <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo, marginTop: 2 }}>Sélectionne un métier · Clique LANCER sur un département · Téléphones via Pappers</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select
            value={selectedMetier}
            onChange={e => setSelectedMetier(e.target.value)}
            style={{ padding: '7px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 7, color: C.text, fontSize: 9, fontFamily: 'JetBrains Mono,monospace', outline: 'none', cursor: 'pointer' }}
          >
            {METIERS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
      </div>

      {/* Zone Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
        {[
          { label: 'Paris intra',    val: '142', sub: '★ 4.2 moy.', accent: C.cyan },
          { label: 'Hauts-de-Seine', val: '89',  sub: '★ 3.8 moy.', accent: C.indigo },
          { label: 'Val-de-Marne',   val: '64',  sub: '★ 3.4 moy.', accent: C.gold },
          { label: 'Autres zones',   val: '52',  sub: '★ 2.6 moy.', accent: C.textMid },
        ].map(k => (
          <div key={k.label} style={{ background: `linear-gradient(180deg,${C.surface2},${C.surface1})`, border: `1px solid ${C.line}`, borderRadius: 10, padding: '12px 14px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: k.accent, opacity: 0.6 }} />
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{k.label}</div>
            <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 28, fontWeight: 600, color: C.textHi, lineHeight: 1, marginBottom: 3 }}>{k.val}</div>
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: k.accent }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Map + Departments */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 12 }}>
        <Panel accent={C.cyan}>
          <PanelTitle title="Carte IDF" accent={C.cyan} />
          <div style={{ background: C.surface3, borderRadius: 10, padding: 16, minHeight: 200, position: 'relative', border: `1px solid ${C.line}`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `repeating-linear-gradient(0deg,${C.line}18 0,${C.line}18 1px,transparent 1px,transparent 28px),repeating-linear-gradient(90deg,${C.line}18 0,${C.line}18 1px,transparent 1px,transparent 28px)` }} />
            {searchedDept ? (
              <div style={{ position: 'relative', textAlign: 'center' }}>
                <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 32, fontWeight: 700, color: densityConfig[searchedDept.density].border, lineHeight: 1 }}>{searchedDept.code}</div>
                <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textMid }}>{searchedDept.name}</div>
                {mapLoading === searchedDept.code ? (
                  <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.gold, marginTop: 8 }}>⏳ Recherche Pappers...</div>
                ) : (
                  <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.green, marginTop: 8 }}>{mapResults.length} résultats trouvés</div>
                )}
              </div>
            ) : (
              <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, textAlign: 'center', position: 'relative' }}>
                Sélectionne un métier<br />puis clique LANCER sur un département
              </div>
            )}
          </div>
          <div style={{ marginTop: 10, fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, textAlign: 'center' }}>
            {METIERS.find(m => m.value === selectedMetier)?.label ?? ''} · Powered by Pappers
          </div>
        </Panel>

        <Panel accent={C.indigo}>
          <PanelTitle title="Départements IDF" accent={C.indigo} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
            {DEPARTMENTS.map(dept => {
              const ds = densityConfig[dept.density]
              const contactedPct = Math.round((dept.contacted / dept.prospects) * 100)
              const isActive = activeZone === dept.code
              const isLoading = mapLoading === dept.code
              return (
                <div
                  key={dept.code}
                  onClick={() => setActiveZone(isActive ? null : dept.code)}
                  style={{
                    background: isActive ? `linear-gradient(180deg,${C.surface3},${C.surface2})` : `linear-gradient(180deg,${C.surface2},${C.surface1})`,
                    border: `1px solid ${isActive ? ds.border : ds.border + '50'}`,
                    borderRadius: 10, padding: 12, position: 'relative', overflow: 'hidden',
                    boxShadow: isActive ? `0 0 16px ${ds.glow}` : `0 0 6px ${ds.glow}`,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ position: 'absolute', top: 6, right: 6, fontFamily: 'JetBrains Mono,monospace', fontSize: 7, color: ds.border, background: ds.badge, padding: '2px 5px', borderRadius: 4 }}>{ds.label}</div>
                  <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 26, fontWeight: 700, color: ds.border, lineHeight: 1, marginBottom: 1 }}>{dept.code}</div>
                  <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 9, color: C.textMid, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{dept.name}</div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7.5, color: C.textLo }}>Prospects</span>
                      <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7.5, color: C.textHi, fontWeight: 600 }}>{dept.prospects}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7.5, color: C.textLo }}>Contactés</span>
                      <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7.5, color: C.gold }}>{contactedPct}%</span>
                    </div>
                  </div>

                  <div style={{ height: 2, background: C.surface3, borderRadius: 2, overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{ height: '100%', width: `${contactedPct}%`, background: ds.border, borderRadius: 2 }} />
                  </div>

                  <button
                    onClick={e => { e.stopPropagation(); lancerProspection(dept) }}
                    disabled={isLoading}
                    style={{ width: '100%', fontFamily: 'Oswald,sans-serif', fontSize: 8, color: ds.border, background: ds.badge, border: `1px solid ${ds.border}40`, borderRadius: 5, padding: '5px 0', cursor: isLoading ? 'not-allowed' : 'pointer', letterSpacing: '0.1em', opacity: isLoading ? 0.6 : 1 }}
                  >
                    {isLoading ? '⏳ RECHERCHE...' : 'LANCER PROSPECTION →'}
                  </button>
                </div>
              )
            })}
          </div>
        </Panel>
      </div>

      {/* Error */}
      {mapError && (
        <div style={{ background: '#1a0d0d', border: `1px solid #ff647060`, borderRadius: 8, padding: '10px 14px', fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: '#ff6470' }}>
          ⚠️ {mapError}
        </div>
      )}

      {/* Results */}
      {mapResults.length > 0 && searchedDept && (
        <div style={{ border: `1px solid #4ade8030`, borderRadius: 14, background: '#0d1117', padding: 16, marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <PanelTitle title={`${METIERS.find(m => m.value === selectedMetier)?.label} · ${searchedDept.name} (${mapResults.length} trouvés)`} accent={C.green} />
            <a
              href={`https://www.google.fr/maps/search/${encodeURIComponent((METIERS.find(m => m.value === selectedMetier)?.label ?? '') + ' ' + searchedDept.city)}`}
              target="_blank" rel="noopener noreferrer"
              style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, padding: '4px 10px', borderRadius: 5, border: `1px solid ${C.indigo}40`, background: C.surface2, color: C.indigo, textDecoration: 'none' }}
            >
              🗺️ Voir sur Google Maps
            </a>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 400, overflowY: 'auto' }}>
            {mapResults.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: C.surface2, borderRadius: 7, border: `1px solid ${C.lineSoft}` }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: C.surface3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Oswald,sans-serif', fontSize: 10, color: C.green, fontWeight: 600, flexShrink: 0 }}>{r.initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 11, color: C.textHi, fontWeight: 500 }}>{r.nom}</div>
                  <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo }}>
                    {r.adresse ? r.adresse + ' · ' : ''}{r.ville}{r.codePostal ? ` (${r.codePostal})` : ''}
                  </div>
                </div>
                {r.telephone ? (
                  <a href={`tel:${r.telephone}`} style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, padding: '4px 10px', borderRadius: 5, border: `1px solid #4ade8040`, background: '#0a140a', color: C.green, textDecoration: 'none', fontWeight: 700, flexShrink: 0 }}>
                    📞 {r.telephone}
                  </a>
                ) : (
                  <a href={r.googleUrl} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, padding: '4px 8px', borderRadius: 5, border: `1px solid ${C.indigo}40`, background: C.surface3, color: C.indigo, textDecoration: 'none', flexShrink: 0 }}>
                    🔍 Chercher
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Funnel */}
      <Panel accent={C.gold}>
        <PanelTitle title="Entonnoir de Conversion · IDF Totaux" accent={C.gold} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
          {[
            { label: 'TNS Identifiés', val: totals.prospects, accent: C.indigo },
            { label: 'Contactés',      val: totals.contacted, accent: C.gold },
            { label: 'RDV Obtenus',    val: totals.rdv,       accent: C.cyan },
            { label: 'Convertis',      val: totals.converted, accent: C.green },
          ].map(k => (
            <div key={k.label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 28, fontWeight: 600, color: k.accent, lineHeight: 1 }}>{k.val}</div>
              <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, marginTop: 4, textTransform: 'uppercase' }}>{k.label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 0, height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
          <div style={{ flex: totals.prospects, background: C.indigo }} />
          <div style={{ flex: totals.contacted, background: C.gold }} />
          <div style={{ flex: totals.rdv, background: C.cyan }} />
          <div style={{ flex: totals.converted, background: C.green }} />
        </div>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            { label: 'Identifiés', val: totals.prospects, color: C.indigo },
            { label: 'Contactés',  val: totals.contacted, color: C.gold },
            { label: 'RDV',        val: totals.rdv,       color: C.cyan },
            { label: 'Convertis',  val: totals.converted, color: C.green },
          ].map(f => (
            <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: f.color }} />
              <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textMid }}>{f.label} <span style={{ color: C.textHi, fontWeight: 600 }}>{f.val}</span></span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginLeft: 8 }}>
            <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo }}>Score moy. IDF:</span>
            <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.gold, fontWeight: 600 }}>★ {avgScore}</span>
          </div>
        </div>
      </Panel>
    </>
  )
}
