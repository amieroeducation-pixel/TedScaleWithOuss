'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
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
  signal_type?: string
  metadata?: Record<string, string>
}

type EnrichData = {
  telephone: string | null
  email: string | null
  website: string | null
  nomDirigeant: string | null
  linkedinUrl: string
  pagesJaunesUrl: string | null
  pappersUrl: string | null
  source: string
}

type CardTab = 'info' | 'history'

type Interaction = {
  id: string
  type: string
  notes: string | null
  duration_min: number | null
  is_honored: boolean
  occurred_at: string
}

type CallResult = 'decroché' | 'rdv' | 'pas_interesse' | 'messagerie' | 'rappeler'

type Props = {
  prospect: ProspectCardData
  onClose: () => void
  onAddToCRM?: (prospect: ProspectCardData) => void
  isContacted?: boolean
  onContacted?: (phone: string, contacted: boolean) => void
  onStartSequence?: (prospect: ProspectCardData) => void
}

export default function ProspectCard({ prospect, onClose, onAddToCRM, isContacted, onContacted, onStartSequence }: Props) {
  const [enrich, setEnrich] = useState<EnrichData | null>(null)
  const [enrichLoading, setEnrichLoading] = useState(true)
  const [contacted, setContacted] = useState(isContacted ?? false)

  const [cardTab, setCardTab] = useState<CardTab>('info')
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [showRappelModal, setShowRappelModal] = useState(false)
  const [rappelDate, setRappelDate] = useState('')
  const [rappelTime, setRappelTime] = useState('09:00')
  const [rappelNote, setRappelNote] = useState('')
  const [rappelSaving, setRappelSaving] = useState(false)
  const [showLogModal, setShowLogModal] = useState(false)
  const [logResult, setLogResult] = useState<CallResult>('decroché')
  const [logNote, setLogNote] = useState('')
  const [logDuration, setLogDuration] = useState(5)
  const [logSaving, setLogSaving] = useState(false)

  const [seqTemplates, setSeqTemplates] = useState<Array<{ id: string; name: string }>>([])
  const [seqStarting, setSeqStarting] = useState(false)
  const [showSeqModal, setShowSeqModal] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState('')

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

  useEffect(() => {
    if (!/^[0-9a-f-]{36}$/.test(String(prospect.id))) return
    fetch('/api/crm/sequences/templates')
      .then(r => r.json())
      .then(({ data }) => {
        if (data?.templates?.length > 0) {
          setSeqTemplates(data.templates)
          setSelectedTemplateId(data.templates[0].id)
        }
      })
      .catch(() => {})
  }, [prospect.id])

  async function loadHistory() {
    if (!prospect.id || !/^[0-9a-f-]{36}$/.test(String(prospect.id))) return
    setHistoryLoading(true)
    try {
      const res = await fetch(`/api/interactions?prospect_id=${prospect.id}`)
      const { data } = await res.json()
      if (data?.interactions) setInteractions(data.interactions)
    } catch { /* ignore */ }
    finally { setHistoryLoading(false) }
  }

  async function saveRappel() {
    if (!rappelDate) return
    if (!prospect.id || !/^[0-9a-f-]{36}$/.test(String(prospect.id))) return
    setRappelSaving(true)
    try {
      const planned_at = `${rappelDate}T${rappelTime}:00`
      await fetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospect_id: prospect.id,
          type: 'appel',
          notes: `📅 Rappel planifié à ${rappelTime}${rappelNote ? ' — ' + rappelNote : ''}`,
          planned_at,
          is_honored: false,
        }),
      })
      setShowRappelModal(false)
      setRappelDate('')
      setRappelNote('')
    } catch { /* ignore */ }
    finally { setRappelSaving(false) }
  }

  async function saveLog() {
    if (!prospect.id || !/^[0-9a-f-]{36}$/.test(String(prospect.id))) return
    setLogSaving(true)
    const resultLabels: Record<CallResult, string> = {
      decroché: '✅ Décroché', rdv: '📅 RDV posé', pas_interesse: '❌ Pas intéressé',
      messagerie: '📱 Messagerie', rappeler: '🔄 À rappeler',
    }
    try {
      await fetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospect_id: prospect.id,
          type: 'appel',
          notes: `${resultLabels[logResult]}${logNote ? ' — ' + logNote : ''}`,
          duration_min: logDuration,
          is_honored: logResult !== 'messagerie',
        }),
      })
      setShowLogModal(false)
      setLogNote('')
      if (cardTab === 'history') loadHistory()
    } catch { /* ignore */ }
    finally { setLogSaving(false) }
  }

  async function startSequence() {
    if (!selectedTemplateId || !/^[0-9a-f-]{36}$/.test(String(prospect.id))) return
    setSeqStarting(true)
    try {
      const res = await fetch('/api/crm/sequences/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospect_id: prospect.id, template_id: selectedTemplateId }),
      })
      const json = await res.json()
      if (json.error) { alert('Erreur : ' + json.error); return }
      setShowSeqModal(false)
      if (onStartSequence) { onStartSequence(prospect); onClose() }
    } catch { alert('Erreur réseau') }
    finally { setSeqStarting(false) }
  }

  const telephone = prospect.telephone ?? enrich?.telephone ?? null
  const email = prospect.email ?? enrich?.email ?? null
  const linkedinUrl = enrich?.linkedinUrl ?? `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(prospect.nom + ' ' + (prospect.entreprise ?? ''))}`
  const pagesJaunesUrl = enrich?.pagesJaunesUrl ?? null
  const pappersUrl = enrich?.pappersUrl ?? (prospect.siren ? `https://www.pappers.fr/entreprise/${prospect.siren}` : null)

  const initials = prospect.nom.split(' ').map((w: string) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '??'
  const scoreColor = prospect.scoreColor ?? C.gold

  const modal = (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
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
            {!enrichLoading && enrich?.nomDirigeant && enrich.nomDirigeant !== prospect.nom && (
              <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.cyan, marginTop: 3 }}>Dir. : {enrich.nomDirigeant}</div>
            )}
            {prospect.signal_type && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                ({
                  cession: 'bg-red-100 text-red-800',
                  holding: 'bg-blue-100 text-blue-800',
                  dividendes: 'bg-yellow-100 text-yellow-800',
                  dirigeant_55: 'bg-purple-100 text-purple-800',
                  creation: 'bg-green-100 text-green-800',
                } as Record<string, string>)[prospect.signal_type] ?? 'bg-gray-100 text-gray-700'
              }`} style={{ marginTop: 4 }}>
                {({
                  cession: '🔴 Cession',
                  holding: '🏗️ Holding',
                  dividendes: '💰 Dividendes',
                  dirigeant_55: '👔 Dirigeant 55+',
                  creation: '🟢 Création',
                } as Record<string, string>)[prospect.signal_type] ?? prospect.signal_type}
              </span>
            )}
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

        {/* Onglets */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, borderBottom: `1px solid ${C.lineSoft}`, paddingBottom: 8 }}>
          {(['info', 'history'] as CardTab[]).map(t => (
            <button
              key={t}
              onClick={() => { setCardTab(t); if (t === 'history') loadHistory() }}
              style={{
                padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: cardTab === t ? `${C.indigo}22` : 'transparent',
                color: cardTab === t ? C.indigo : C.textLo,
                fontFamily: 'JetBrains Mono,monospace', fontSize: 9, fontWeight: cardTab === t ? 700 : 400,
                borderBottom: `2px solid ${cardTab === t ? C.indigo : 'transparent'}`,
              }}
            >
              {t === 'info' ? '📋 Infos' : '📞 Historique'}
            </button>
          ))}
        </div>

        {cardTab === 'info' && (
          <>
            {/* Info grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {prospect.siren && <InfoRow label="SIREN" value={prospect.siren} />}
              {(prospect.ville || prospect.codePostal) && <InfoRow label="Ville" value={[prospect.codePostal, prospect.ville].filter(Boolean).join(' ')} />}
              {prospect.adresse && <InfoRow label="Adresse" value={prospect.adresse} span />}
              {prospect.signalLabel && <InfoRow label="Signal" value={prospect.signalLabel} accent={scoreColor} />}
              {prospect.source && <InfoRow label="Source" value={prospect.source} />}
            </div>

            {/* Message J+0 */}
            {prospect.metadata?.message_j0 && (
              <div className="mt-2 rounded-lg bg-blue-50 p-3 text-sm text-gray-700 italic" style={{ marginBottom: 16 }}>
                <p className="mb-1 text-xs font-medium text-blue-600">Message J+0 préparé :</p>
                {prospect.metadata.message_j0}
              </div>
            )}

            {/* Contact enrichi */}
            <div style={{ background: C.surface1, borderRadius: 10, padding: 12, marginBottom: 12, border: `1px solid ${C.lineSoft}` }}>
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

            {/* Boutons Rappel + Logger */}
            {/^[0-9a-f-]{36}$/.test(String(prospect.id)) && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                <button
                  onClick={() => setShowRappelModal(true)}
                  style={{ flex: 1, padding: '8px 0', borderRadius: 8, background: '#0d1a2e', border: `1px solid ${C.indigo}66`, color: C.indigo, fontFamily: 'Oswald,sans-serif', fontSize: 10, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.08em' }}
                >
                  📅 PLANIFIER RAPPEL
                </button>
                <button
                  onClick={() => setShowLogModal(true)}
                  style={{ flex: 1, padding: '8px 0', borderRadius: 8, background: '#0a1f0a', border: `1px solid ${C.green}66`, color: C.green, fontFamily: 'Oswald,sans-serif', fontSize: 10, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.08em' }}
                >
                  📞 LOGGER APPEL
                </button>
              </div>
            )}
          </>
        )}

        {cardTab === 'history' && (
          <div style={{ marginBottom: 16 }}>
            {historyLoading && (
              <div style={{ fontSize: 9, color: C.textLo, textAlign: 'center', padding: '16px 0' }}>Chargement…</div>
            )}
            {!historyLoading && interactions.length === 0 && (
              <div style={{ fontSize: 9, color: C.textVlo, textAlign: 'center', padding: '16px 0', fontStyle: 'italic' }}>Aucune interaction enregistrée</div>
            )}
            {interactions.map(it => {
              const typeColor: Record<string, string> = {
                appel: C.green, rdv1: C.indigo, rdv2: '#9a7acc', email: C.gold, whatsapp: '#25D366', linkedin: '#0A66C2'
              }
              const col = typeColor[it.type] ?? C.textMid
              return (
                <div key={it.id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: `1px solid ${C.lineSoft}` }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: col, flexShrink: 0, marginTop: 5 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: col, textTransform: 'uppercase' as const }}>{it.type}</span>
                      <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7, color: C.textVlo }}>
                        {new Date(it.occurred_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {it.notes && <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textMid, lineHeight: 1.5 }}>{it.notes}</div>}
                    {it.duration_min != null && <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7, color: C.textLo, marginTop: 2 }}>{it.duration_min} min</div>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
          {telephone && (
            <button
              onClick={() => {
                const next = !contacted
                setContacted(next)
                if (onContacted) onContacted(telephone, next)
              }}
              style={{ flex: 1, padding: '10px 0', borderRadius: 8, background: contacted ? '#0a1f0a' : `linear-gradient(90deg,${C.green}22,${C.surface3})`, border: `1px solid ${C.green}66`, color: C.green, fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.1em', minWidth: 140 }}
            >
              {contacted ? '✓ CONTACTÉ' : '📞 MARQUER CONTACTÉ'}
            </button>
          )}
          {onAddToCRM && (
            <button
              onClick={() => { onAddToCRM(prospect); onClose() }}
              style={{ flex: 1, padding: '10px 0', borderRadius: 8, background: `linear-gradient(90deg,${C.indigo}33,${C.surface3})`, border: `1px solid ${C.indigo}66`, color: C.indigo, fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.1em' }}
            >
              + AJOUTER AU CRM
            </button>
          )}
          {/^[0-9a-f-]{36}$/.test(String(prospect.id)) && (
            <button
              onClick={() => setShowSeqModal(true)}
              style={{ flex: 1, padding: '10px 0', borderRadius: 8, background: `linear-gradient(90deg,${C.gold}22,${C.surface3})`, border: `1px solid ${C.gold}66`, color: C.gold, fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.1em', minWidth: 140 }}
            >
              ▶ SÉQUENCE
            </button>
          )}
          {!(/^[0-9a-f-]{36}$/.test(String(prospect.id))) && onStartSequence && (
            <button
              onClick={() => { onStartSequence(prospect); onClose() }}
              style={{ flex: 1, padding: '10px 0', borderRadius: 8, background: `linear-gradient(90deg,${C.gold}22,${C.surface3})`, border: `1px solid ${C.gold}66`, color: C.gold, fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.1em', minWidth: 140 }}
            >
              ▶ SÉQUENCE
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

  const rappelModal = showRappelModal ? (
    <div onClick={() => setShowRappelModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.bgMid, border: `1px solid ${C.indigo}40`, borderRadius: 14, padding: 24, width: '100%', maxWidth: 360, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: C.ribbon, borderRadius: '14px 14px 0 0' }} />
        <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 14, fontWeight: 600, color: C.indigo, marginBottom: 18, marginTop: 4 }}>📅 Planifier un rappel</div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 5 }}>Date *</label>
          <input type="date" value={rappelDate} onChange={e => setRappelDate(e.target.value)} min={new Date().toISOString().split('T')[0]}
            style={{ width: '100%', padding: '8px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textHi, fontSize: 12, fontFamily: 'JetBrains Mono,monospace', boxSizing: 'border-box' as const }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 5 }}>Heure</label>
          <input type="time" value={rappelTime} onChange={e => setRappelTime(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textHi, fontSize: 12, fontFamily: 'JetBrains Mono,monospace', boxSizing: 'border-box' as const }} />
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 5 }}>Note (optionnel)</label>
          <input type="text" value={rappelNote} onChange={e => setRappelNote(e.target.value)} placeholder="Ex: rappeler après 14h"
            style={{ width: '100%', padding: '8px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textHi, fontSize: 11, fontFamily: 'JetBrains Mono,monospace', boxSizing: 'border-box' as const }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowRappelModal(false)} style={{ flex: 1, padding: 10, borderRadius: 8, background: C.surface1, border: `1px solid ${C.line}`, color: C.textLo, fontFamily: 'Oswald,sans-serif', fontSize: 11, cursor: 'pointer' }}>ANNULER</button>
          <button onClick={saveRappel} disabled={!rappelDate || rappelSaving} style={{ flex: 2, padding: 10, borderRadius: 8, background: '#0d1a2e', border: `1px solid ${C.indigo}66`, color: C.indigo, fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 600, cursor: !rappelDate ? 'not-allowed' : 'pointer', opacity: !rappelDate ? 0.6 : 1 }}>
            {rappelSaving ? 'SAUVEGARDE...' : '📅 ENREGISTRER'}
          </button>
        </div>
      </div>
    </div>
  ) : null

  const logModal = showLogModal ? (
    <div onClick={() => setShowLogModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.bgMid, border: `1px solid ${C.green}40`, borderRadius: 14, padding: 24, width: '100%', maxWidth: 360, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: C.ribbon, borderRadius: '14px 14px 0 0' }} />
        <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 14, fontWeight: 600, color: C.green, marginBottom: 18, marginTop: 4 }}>📞 Logger un appel</div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 8 }}>Résultat</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {([
              { v: 'decroché', label: '✅ Décroché — échange eu', color: C.green },
              { v: 'rdv', label: '📅 RDV posé', color: C.indigo },
              { v: 'rappeler', label: '🔄 À rappeler', color: C.gold },
              { v: 'messagerie', label: '📱 Messagerie', color: C.textMid },
              { v: 'pas_interesse', label: '❌ Pas intéressé', color: C.warn },
            ] as Array<{ v: CallResult; label: string; color: string }>).map(({ v, label, color }) => (
              <button key={v} onClick={() => setLogResult(v)} style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${logResult === v ? color : C.line}`, background: logResult === v ? `${color}18` : C.surface1, color: logResult === v ? color : C.textLo, fontFamily: 'JetBrains Mono,monospace', fontSize: 10, cursor: 'pointer', textAlign: 'left' as const }}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 5 }}>Durée (min)</label>
            <input type="number" value={logDuration} min={0} max={120} onChange={e => setLogDuration(Number(e.target.value))}
              style={{ width: '100%', padding: '8px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textHi, fontSize: 12, fontFamily: 'JetBrains Mono,monospace', boxSizing: 'border-box' as const }} />
          </div>
          <div>
            <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 5 }}>Note</label>
            <input type="text" value={logNote} onChange={e => setLogNote(e.target.value)} placeholder="Contexte…"
              style={{ width: '100%', padding: '8px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textHi, fontSize: 11, fontFamily: 'JetBrains Mono,monospace', boxSizing: 'border-box' as const }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowLogModal(false)} style={{ flex: 1, padding: 10, borderRadius: 8, background: C.surface1, border: `1px solid ${C.line}`, color: C.textLo, fontFamily: 'Oswald,sans-serif', fontSize: 11, cursor: 'pointer' }}>ANNULER</button>
          <button onClick={saveLog} disabled={logSaving} style={{ flex: 2, padding: 10, borderRadius: 8, background: '#0a1f0a', border: `1px solid ${C.green}66`, color: C.green, fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
            {logSaving ? 'SAUVEGARDE...' : '📞 ENREGISTRER'}
          </button>
        </div>
      </div>
    </div>
  ) : null

  const seqModal = showSeqModal ? (
    <div onClick={() => setShowSeqModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.bgMid, border: `1px solid ${C.gold}40`, borderRadius: 14, padding: 24, width: '100%', maxWidth: 380, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: C.ribbon, borderRadius: '14px 14px 0 0' }} />
        <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 14, fontWeight: 600, color: C.gold, marginBottom: 18, marginTop: 4 }}>▶ Démarrer une séquence</div>
        {seqTemplates.length === 0 ? (
          <div style={{ fontSize: 10, color: C.textLo, marginBottom: 18 }}>
            Aucune séquence disponible. Allez dans <strong>Paramètres → Séquences</strong> et cliquez &quot;Importer bibliothèque&quot;.
          </div>
        ) : (
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 8 }}>Choisir la séquence</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
              {seqTemplates.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplateId(t.id)}
                  style={{ padding: '10px 12px', borderRadius: 8, border: `1px solid ${selectedTemplateId === t.id ? C.gold : C.line}`, background: selectedTemplateId === t.id ? `${C.gold}18` : C.surface1, color: selectedTemplateId === t.id ? C.gold : C.textMid, fontFamily: 'JetBrains Mono,monospace', fontSize: 10, cursor: 'pointer', textAlign: 'left' as const }}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowSeqModal(false)} style={{ flex: 1, padding: 10, borderRadius: 8, background: C.surface1, border: `1px solid ${C.line}`, color: C.textLo, fontFamily: 'Oswald,sans-serif', fontSize: 11, cursor: 'pointer' }}>ANNULER</button>
          {seqTemplates.length > 0 && (
            <button onClick={startSequence} disabled={!selectedTemplateId || seqStarting} style={{ flex: 2, padding: 10, borderRadius: 8, background: '#1a1400', border: `1px solid ${C.gold}66`, color: C.gold, fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              {seqStarting ? 'DÉMARRAGE...' : '▶ LANCER'}
            </button>
          )}
        </div>
      </div>
    </div>
  ) : null

  return (
    <>
      {createPortal(modal, document.body)}
      {rappelModal && createPortal(rappelModal, document.body)}
      {logModal && createPortal(logModal, document.body)}
      {seqModal && createPortal(seqModal, document.body)}
    </>
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
