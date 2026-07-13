'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { C } from '@/lib/theme'

type Status = 'Non contacté' | 'En cours' | 'Converti' | 'Perdu'

interface Particulier {
  id: number
  nom: string
  prenom: string
  email: string
  telephone: string
  ville: string
  age: string
  patrimoine: string
  status: Status
}

const STATUS_COLORS: Record<Status, string> = {
  'Non contacté': C.indigo,
  'En cours': C.gold,
  'Converti': C.green,
  'Perdu': C.cyan,
}

const MOCK_PARTICULIERS: Particulier[] = [
  { id: 1, nom: 'Martin', prenom: 'Jean', email: 'jean.martin@email.fr', telephone: '06 12 34 56 78', ville: 'Paris', age: '45', patrimoine: '250k-500k €', status: 'Non contacté' },
  { id: 2, nom: 'Bernard', prenom: 'Claire', email: 'claire.b@email.fr', telephone: '06 87 65 43 21', ville: 'Lyon', age: '52', patrimoine: '500k-1M €', status: 'En cours' },
  { id: 3, nom: 'Thomas', prenom: 'Michel', email: 'm.thomas@email.fr', telephone: '06 11 22 33 44', ville: 'Bordeaux', age: '38', patrimoine: '100k-250k €', status: 'Non contacté' },
  { id: 4, nom: 'Petit', prenom: 'Sophie', email: 'sophie.petit@email.fr', telephone: '06 55 66 77 88', ville: 'Paris', age: '61', patrimoine: '1M+ €', status: 'Converti' },
  { id: 5, nom: 'Leroy', prenom: 'Paul', email: 'p.leroy@email.fr', telephone: '06 99 88 77 66', ville: 'Nice', age: '48', patrimoine: '250k-500k €', status: 'En cours' },
]

const CSV_COLUMNS = ['nom', 'prenom', 'email', 'telephone', 'ville', 'age', 'patrimoine']

export default function ParticuliersPage() {
  const router = useRouter()
  const [particuliers, setParticuliers] = useState<Particulier[]>([])
  const [preview, setPreview] = useState<string[][] | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [fileName, setFileName] = useState('')
  const [isDragActive, setIsDragActive] = useState(false)
  const [search, setSearch] = useState('')
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    fetch('/api/prospects?source=particuliers&limit=200')
      .then(r => r.json())
      .then(json => {
        if (json.success && Array.isArray(json.data)) {
          setParticuliers(json.data.map((p: { id: string; full_name: string; email?: string; phone?: string; city?: string; pipeline_stage?: string }, i: number) => {
            const parts = (p.full_name || '').split(' ')
            const stageMap: Record<string, Status> = { a_contacter: 'Non contacté', contacte: 'En cours', rdv_planifie: 'En cours', proposition: 'En cours', converti: 'Converti', perdu: 'Perdu' }
            return {
              id: i + 1,
              nom: parts.slice(1).join(' ') || parts[0] || '',
              prenom: parts[0] || '',
              email: p.email || '',
              telephone: p.phone || '',
              ville: p.city || '',
              age: '',
              patrimoine: '',
              status: (stageMap[p.pipeline_stage || ''] || 'Non contacté') as Status,
            }
          }))
        }
      })
      .catch(() => {})
  }, [])

  const handleFile = useCallback((file: File) => {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split('\n').filter(Boolean).slice(0, 6)
      const rows = lines.map(l => l.split(/[,;|\t]/))
      setPreview(rows)
      if (rows[0]) {
        const autoMap: Record<string, string> = {}
        rows[0].forEach((col, idx) => {
          const c = col.toLowerCase().trim()
          if (c.includes('nom') && !c.includes('pre')) autoMap['nom'] = String(idx)
          if (c.includes('prenom') || c.includes('prénom')) autoMap['prenom'] = String(idx)
          if (c.includes('email') || c.includes('mail')) autoMap['email'] = String(idx)
          if (c.includes('tel') || c.includes('phone')) autoMap['telephone'] = String(idx)
          if (c.includes('ville') || c.includes('city')) autoMap['ville'] = String(idx)
          if (c.includes('age') || c.includes('âge')) autoMap['age'] = String(idx)
          if (c.includes('patrimoine') || c.includes('wealth')) autoMap['patrimoine'] = String(idx)
        })
        setMapping(autoMap)
      }
    }
    reader.readAsText(file)
  }, [])

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragActive(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  async function confirmImport() {
    const rows = (preview?.slice(1) || []).map(row => ({
      nom: row[Number(mapping.nom)] || '',
      prenom: row[Number(mapping.prenom)] || '',
      email: row[Number(mapping.email)] || '',
      telephone: row[Number(mapping.telephone)] || '',
      ville: row[Number(mapping.ville)] || '',
      age: row[Number(mapping.age)] || '',
      patrimoine: row[Number(mapping.patrimoine)] || '',
    })).filter(r => r.nom || r.email)

    if (!rows.length) return
    setImporting(true)

    const prospects = rows.map(row => ({
      full_name: `${row.prenom} ${row.nom}`.trim(),
      email: row.email || undefined,
      phone: row.telephone || undefined,
      city: row.ville || undefined,
      source: 'particuliers' as const,
      notes: row.patrimoine ? `Patrimoine: ${row.patrimoine}` : undefined,
    }))

    const res = await fetch('/api/prospects/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prospects }),
    }).catch(() => null)

    if (res && res.ok) {
      const json = await res.json()
      const inserted: Particulier[] = rows
        .slice(0, json.data?.inserted ?? rows.length)
        .map((row, i) => ({
          id: Date.now() + i,
          nom: row.nom, prenom: row.prenom, email: row.email,
          telephone: row.telephone, ville: row.ville, age: row.age,
          patrimoine: row.patrimoine, status: 'Non contacté' as Status,
        }))
      if (inserted.length) setParticuliers(prev => [...inserted, ...prev])
    }

    setPreview(null)
    setFileName('')
    setMapping({})
    setImporting(false)
  }

  function changeStatus(id: number, status: Status) {
    setParticuliers(prev => prev.map(p => p.id === id ? { ...p, status } : p))
  }

  const filtered = particuliers.filter(p =>
    !search ||
    `${p.nom} ${p.prenom}`.toLowerCase().includes(search.toLowerCase()) ||
    p.ville.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase())
  )

  const convertis = particuliers.filter(p => p.status === 'Converti').length
  const enCours = particuliers.filter(p => p.status === 'En cours').length
  const tauxConv = Math.round(convertis / Math.max(1, particuliers.length) * 100)

  const inputStyle: React.CSSProperties = {
    background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 6,
    color: C.textHi, fontFamily: 'JetBrains Mono,monospace', fontSize: 10,
    padding: '7px 10px', width: '100%', outline: 'none',
  }

  return (
    <>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap')"}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <div style={{ width: 3, height: 24, background: C.ribbon, borderRadius: 2 }} />
        <h1 style={{ fontFamily: 'Oswald,sans-serif', fontSize: 22, fontWeight: 600, color: C.textHi, letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
          Prospection — <span style={{ color: C.indigo }}>Particuliers</span>
        </h1>
      </div>
      <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo, marginBottom: 16, paddingLeft: 13 }}>
        Import CSV/Excel · particuliers patrimoniaux
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Importés', val: String(particuliers.length), sub: 'Base à fournir →', subColor: C.gold, link: '/crm?source=particuliers' },
          { label: 'Base attendue', val: particuliers.length > 0 ? String(particuliers.length) : '—', sub: 'CSV / Excel', subColor: C.gold, link: null },
          { label: 'En cours', val: String(enCours), sub: 'Actifs →', subColor: C.indigo, link: '/pipeline' },
          { label: 'Convertis', val: `${convertis} (${tauxConv}%)`, sub: 'Clients →', subColor: C.green, link: '/clients' },
        ].map(k => (
          <div key={k.label} onClick={() => k.link && router.push(k.link)} style={{
            background: `linear-gradient(180deg,${C.surface1},${C.bgMid})`,
            border: `1px solid ${C.line}`, borderRadius: 10, padding: '12px 14px',
            position: 'relative', overflow: 'hidden', cursor: k.link ? 'pointer' : 'default',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: C.indigo, opacity: 0.4 }} />
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{k.label}</div>
            <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 24, fontWeight: 700, color: C.textHi, lineHeight: 1, marginBottom: 4 }}>{k.val}</div>
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: k.subColor }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Import panel */}
      <div style={{
        background: `linear-gradient(180deg,${C.surface1},${C.bgMid})`,
        border: `1px solid ${C.line}`, borderRadius: 12, padding: 16,
        position: 'relative', overflow: 'hidden', marginBottom: 16,
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${C.indigo}88,transparent)` }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
          <span style={{ width: 6, height: 6, background: C.indigo, transform: 'rotate(45deg)', display: 'inline-block', boxShadow: `0 0 7px ${C.indigo}`, flexShrink: 0 }} />
          <span style={{ fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 500, color: C.textHi, textTransform: 'uppercase', letterSpacing: '0.16em' }}>Import base particuliers</span>
        </div>

        {/* Status row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', background: C.surface2, border: `1px solid ${C.lineSoft}`,
          borderLeft: `3px solid ${C.gold}`,
          borderRadius: 8, marginBottom: 12,
        }}>
          <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textMid }}>
            Importe ta base CSV / Excel — les fiches prospects se créent automatiquement
          </div>
          <span style={{
            fontFamily: 'JetBrains Mono,monospace', fontSize: 8, fontWeight: 700,
            color: C.cyan, background: `${C.cyan}18`, border: `1px solid ${C.cyan}40`,
            padding: '2px 8px', borderRadius: 4, flexShrink: 0, marginLeft: 12,
          }}>En attente</span>
        </div>

        {/* Dropzone */}
        <label
          onDragOver={e => { e.preventDefault(); setIsDragActive(true) }}
          onDragLeave={() => setIsDragActive(false)}
          onDrop={onDrop}
          style={{
            display: 'block',
            background: isDragActive ? `${C.indigo}12` : C.surface2,
            border: `2px dashed ${isDragActive ? C.indigo : C.line}`,
            borderRadius: 10, padding: '28px 20px',
            textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          <input type="file" accept=".csv,.xls,.xlsx" onChange={onInputChange} style={{ display: 'none' }} />
          <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
          {isDragActive ? (
            <div style={{ fontFamily: 'JetBrains Mono,monospace', color: C.indigo, fontSize: 12, fontWeight: 600 }}>
              Déposez votre fichier ici...
            </div>
          ) : (
            <>
              <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: C.textLo, marginBottom: 4 }}>
                Glisse ton fichier CSV ou Excel ici
              </div>
              <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textVlo }}>
                Colonnes : Nom · Prénom · Téléphone · Email · Ville · Profession
              </div>
              <div style={{
                display: 'inline-block', marginTop: 12,
                fontFamily: 'JetBrains Mono,monospace', fontSize: 9, fontWeight: 600,
                color: C.gold, background: `${C.gold}18`, border: `1px solid ${C.gold}40`,
                padding: '5px 14px', borderRadius: 10,
              }}>Choisir un fichier</div>
            </>
          )}
          {fileName && (
            <div style={{ marginTop: 10, fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: C.gold }}>
              📎 {fileName}
            </div>
          )}
        </label>

        {/* Preview + mapping */}
        {preview && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 11, color: C.gold, fontWeight: 600, marginBottom: 10 }}>
              Aperçu — {preview.length - 1} lignes détectées
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo, marginBottom: 8 }}>Correspondance des colonnes :</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {CSV_COLUMNS.map(col => (
                  <div key={col} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textMid, minWidth: 70 }}>{col}</span>
                    <select
                      value={mapping[col] || ''}
                      onChange={e => setMapping(prev => ({ ...prev, [col]: e.target.value }))}
                      style={{ ...inputStyle, width: 'auto', padding: '4px 8px' }}
                    >
                      <option value="">— ignorer —</option>
                      {preview[0]?.map((h, i) => (
                        <option key={i} value={String(i)} style={{ background: C.surface2, color: C.textHi }}>{h || `Col ${i + 1}`}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ overflowX: 'auto', borderRadius: 6, border: `1px solid ${C.line}` }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: C.surface2 }}>
                    {preview[0]?.map((h, i) => (
                      <th key={i} style={{ padding: '7px 10px', fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, fontWeight: 600, textAlign: 'left', borderBottom: `1px solid ${C.line}`, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h || `Col ${i + 1}`}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(1, 4).map((row, ri) => (
                    <tr key={ri} style={{ borderBottom: `1px solid ${C.lineSoft}` }}>
                      {row.map((cell, ci) => (
                        <td key={ci} style={{ padding: '6px 10px', fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textMid }}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button
                onClick={confirmImport}
                style={{
                  fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 500,
                  letterSpacing: '0.08em', padding: '9px 20px', borderRadius: 8, border: 'none',
                  background: `linear-gradient(90deg,${C.gold},${C.warn})`,
                  color: C.bgDeep, cursor: 'pointer',
                }}
              >
                CONFIRMER L&apos;IMPORT
              </button>
              <button
                onClick={() => { setPreview(null); setFileName('') }}
                style={{
                  fontFamily: 'JetBrains Mono,monospace', fontSize: 10,
                  padding: '9px 16px', borderRadius: 8,
                  border: `1px solid ${C.line}`, background: 'transparent',
                  color: C.textLo, cursor: 'pointer',
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Prospect table */}
      <div style={{
        background: `linear-gradient(180deg,${C.surface1},${C.bgMid})`,
        border: `1px solid ${C.line}`, borderRadius: 12, padding: 16,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${C.gold}88,transparent)` }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <input
            placeholder="Rechercher nom, ville, email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
          />
          <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo, whiteSpace: 'nowrap' }}>
            {filtered.length} / {particuliers.length} prospects
          </span>
        </div>

        {/* Table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1.5fr 1fr 1.8fr 1fr 0.6fr 1.2fr 1fr',
          gap: 8, padding: '8px 12px', background: C.surface2,
          borderRadius: '6px 6px 0 0', borderBottom: `1px solid ${C.line}`,
        }}>
          {['Nom', 'Prénom', 'Email', 'Ville', 'Âge', 'Patrimoine', 'Statut'].map(h => (
            <div key={h} style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{h}</div>
          ))}
        </div>

        {filtered.map((p, i) => (
          <div key={p.id} style={{
            display: 'grid', gridTemplateColumns: '1.5fr 1fr 1.8fr 1fr 0.6fr 1.2fr 1fr',
            gap: 8, padding: '10px 12px', alignItems: 'center',
            borderBottom: `1px solid ${C.lineSoft}`,
            background: i % 2 === 0 ? 'transparent' : `${C.surface2}66`,
          }}>
            <div onClick={() => router.push('/crm?source=particuliers')} style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: C.textHi, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>{p.nom}</div>
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: C.textMid }}>{p.prenom}</div>
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo, wordBreak: 'break-all' }}>{p.email}</div>
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textMid }}>{p.ville}</div>
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo }}>{p.age} ans</div>
            <div onClick={() => router.push('/scoring')} style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.green, cursor: 'pointer', textDecoration: 'underline' }}>{p.patrimoine}</div>
            <select
              value={p.status}
              onChange={e => changeStatus(p.id, e.target.value as Status)}
              style={{
                fontFamily: 'JetBrains Mono,monospace', fontSize: 9, padding: '4px 6px', borderRadius: 6,
                background: `${STATUS_COLORS[p.status]}22`,
                color: STATUS_COLORS[p.status],
                border: `1px solid ${STATUS_COLORS[p.status]}44`,
                cursor: 'pointer', outline: 'none',
              }}
            >
              {(['Non contacté', 'En cours', 'Converti', 'Perdu'] as Status[]).map(s => (
                <option key={s} value={s} style={{ background: C.surface2, color: C.textHi }}>{s}</option>
              ))}
            </select>
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ padding: 30, textAlign: 'center', fontFamily: 'JetBrains Mono,monospace', fontSize: 11, color: C.textVlo }}>
            Aucun particulier trouvé
          </div>
        )}
      </div>
    </>
  )
}
