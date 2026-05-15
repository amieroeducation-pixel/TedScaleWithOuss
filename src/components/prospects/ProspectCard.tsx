'use client'

import { useEffect, useState } from 'react'
import { C } from '@/lib/theme'

export type ProspectCardData = {
  id: string | number
  nom: string
  entreprise?: string
  siren?: string | null
  metier?: string
  ville?: string
  codePostal?: string
  adresse?: string
  telephone?: string | null
  email?: string | null
  signal?: string
  signalLabel?: string
  score?: number
  scoreColor?: string
  source?: string
  googleUrl?: string
  mapsUrl?: string
}

type EnrichData = {
  telephone: string | null
  email: string | null
  website: string | null
  linkedinUrl: string
  pagesJaunesUrl: string | null
  pappersUrl: string | null
  source: string
}

type Props = {
  prospect: ProspectCardData
  onClose: () => void
  onAddToCRM?: (prospect: ProspectCardData) => void
}

export default function ProspectCard({ prospect, onClose, onAddToCRM }: Props) {
  const [enrich, setEnrich] = useState<EnrichData | null>(null)
  const [enrichLoading, setEnrichLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const params = new URLSearchParams()
        if (prospect.siren)      params.set('siren',      prospect.siren)
        if (prospect.nom)        params.set('nom',         prospect.nom)
        if (prospect.entreprise) params.set('entreprise', prospect.entreprise)
        if (prospect.metier)     params.set('metier',     prospect.metier)
        if (prospect.ville)      params.set('ville',      prospect.ville)
        const res = await fetch(`/api/enrichissement?${params}`)
        const data = await res.json()
        if (data.success) setEnrich(data.data)
      } catch { /* ignore */ }
      finally { setEnrichLoading(false) }
    }
    load()
  }, [prospect.siren, prospect.nom, prospect.entreprise, prospect.metier, prospect.ville])

  const telephone = prospect.telephone ?? enrich?.telephone ?? null
  const email = prospect.email ?? enrich?.email ?? null
  const linkedinUrl = enrich?.linkedinUrl ?? `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(prospect.nom + ' ' + (prospect.entreprise ?? ''))}`
  const pagesJaunesUrl = enrich?.pagesJaunesUrl ?? null
  const pappersUrl = enrich?.pappersUrl ?? (prospect.siren ? `https://www.pappers.fr/entreprise/${prospect.siren}` : null)

  const initials = prospect.nom.split(' ').map((w: string) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '??'
  const scoreColor = prospect.scoreColor ?? C.gold

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: C.bgMid, border: `1px solid ${C.line}`, borderRadius: 16, padding: 24, width: '100%', maxWidth: 480, position: 'relative', boxShadow: `0 0 40px ${C.indigo}22` }}
      >
        {/* Ribbon top */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: C.ribbon, borderRadius: '16px 16px 0 0' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20, marginTop: 8 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: `linear-gradient(135deg,${C.surface3},${C.surface2})`, border: `2px solid ${scoreColor}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Oswald,sans-serif', fontSize: 18, fontWeight: 700, color: scoreColor, flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 16, fontWeight: 600, color: C.textHi, marginBottom: 2 }}>{prospect.nom}</div>
            {prospect.entreprise && <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: C.textMid }}>{prospect.entreprise}</div>}
            {prospect.metier && <div style={{ fontSize: 11, color: C.textLo, marginTop: 2 }}>{prospect.metier}</div>}
          </div>
          {prospect.score !== undefined && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 13, fontWeight: 700, color: scoreColor }}>
                {Math.round(prospect.score * (prospect.score <= 1 ? 100 : 1))}{prospect.score <= 1 ? '%' : '/10'}
              </div>
              <div style={{ fontSize: 8, color: C.textLo, marginTop: 1 }}>Score</div>
            </div>
          )}
        </div>

        {/* Info grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {prospect.siren && <InfoRow label="SIREN" value={prospect.siren} />}
          {(prospect.ville || prospect.codePostal) && <InfoRow label="Ville" value={[prospect.codePostal, prospect.ville].filter(Boolean).join(' ')} />}
          {prospect.adresse && <InfoRow label="Adresse" value={prospect.adresse} span />}
          {prospect.signalLabel && <InfoRow label="Signal" value={prospect.signalLabel} accent={scoreColor} />}
          {prospect.source && <InfoRow label="Source" value={prospect.source} />}
        </div>

        {/* Contact enrichi */}
        <div style={{ background: C.surface1, borderRadius: 10, padding: 12, marginBottom: 16, border: `1px solid ${C.lineSoft}` }}>
          <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 10, fontWeight: 500, color: C.textLo, textTransform: 'uppercase' as const, letterSpacing: '0.14em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>Contact</span>
            {enrichLoading && <span style={{ color: C.indigo, fontSize: 9 }}>· chargement…</span>}
            {!enrichLoading && enrich && (
              <span style={{
                fontSize: 7, padding: '1px 6px', borderRadius: 5, fontFamily: 'JetBrains Mono,monospace',
                background: enrich.source === 'pappers' ? C.gold + '20' : enrich.source === 'google_places' ? '#0a1f0a' : C.surface2,
                color: enrich.source === 'pappers' ? C.gold : enrich.source === 'google_places' ? C.green : C.textVlo,
                border: `1px solid ${enrich.source === 'pappers' ? C.gold + '40' : enrich.source === 'google_places' ? C.green + '40' : C.lineSoft}`,
              }}>
                {enrich.source === 'pappers' ? 'Pappers' : enrich.source === 'google_places' ? 'Google' : 'Généré'}
              </span>
            )}
          </div>
          <ContactRow icon="📞" label="Téléphone" value={telephone} fallbackUrl={pagesJaunesUrl} fallbackLabel="Pages Jaunes" />
          <ContactRow icon="✉" label="Email" value={email} />
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' as const }}>
            <ExternalBtn href={linkedinUrl} label="LinkedIn" color={C.indigo} />
            {pagesJaunesUrl && <ExternalBtn href={pagesJaunesUrl} label="Pages Jaunes" color={C.gold} />}
            {pappersUrl && <ExternalBtn href={pappersUrl} label="Pappers" color={C.textMid} />}
            {prospect.googleUrl && <ExternalBtn href={prospect.googleUrl} label="Google" color={C.textLo} />}
            {prospect.mapsUrl && <ExternalBtn href={prospect.mapsUrl} label="Maps" color={C.green} />}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          {onAddToCRM && (
            <button
              onClick={() => { onAddToCRM(prospect); onClose() }}
              style={{ flex: 1, padding: '10px 0', borderRadius: 8, background: `linear-gradient(90deg,${C.indigo}33,${C.surface3})`, border: `1px solid ${C.indigo}66`, color: C.indigo, fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.1em' }}
            >
              + AJOUTER AU CRM
            </button>
          )}
          <button
            onClick={onClose}
            style={{ padding: '10px 16px', borderRadius: 8, background: C.surface1, border: `1px solid ${C.line}`, color: C.textLo, fontFamily: 'Oswald,sans-serif', fontSize: 11, cursor: 'pointer' }}
          >
            FERMER
          </button>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value, accent, span }: { label: string; value: string; accent?: string; span?: boolean }) {
  return (
    <div style={{ gridColumn: span ? '1 / -1' : undefined }}>
      <div style={{ fontSize: 8, color: C.textVlo, textTransform: 'uppercase' as const, letterSpacing: '0.12em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: accent ?? C.textMid }}>{value}</div>
    </div>
  )
}

function ContactRow({ icon, label, value, fallbackUrl, fallbackLabel }: {
  icon: string; label: string; value: string | null; fallbackUrl?: string | null; fallbackLabel?: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
      <span style={{ fontSize: 12, width: 18 }}>{icon}</span>
      <span style={{ fontSize: 9, color: C.textLo, width: 64 }}>{label}</span>
      {value
        ? <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 11, color: C.textHi }}>{value}</span>
        : fallbackUrl
          ? <a href={fallbackUrl} target="_blank" rel="noreferrer" style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.indigo, textDecoration: 'none' }}>Rechercher sur {fallbackLabel} →</a>
          : <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: C.textVlo }}>—</span>
      }
    </div>
  )
}

function ExternalBtn({ href, label, color }: { href: string; label: string; color: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      style={{ padding: '4px 10px', borderRadius: 6, background: color + '15', border: `1px solid ${color}40`, color, fontFamily: 'JetBrains Mono,monospace', fontSize: 8, fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }}
    >
      {label} ↗
    </a>
  )
}
