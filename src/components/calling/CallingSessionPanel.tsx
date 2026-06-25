'use client'

import { useState, useEffect, useCallback } from 'react'
import { C } from '@/lib/theme'
import SessionContactList, { type SessionContact } from './SessionContactList'
import SessionContactCard from './SessionContactCard'
import BilanModal from './BilanModal'
import { useCelebrations } from '@/hooks/useCelebrations'

type Session = {
  id: string
  titre: string
  metier: string
  ville: string
  source: string
  statut: 'active' | 'pausee' | 'terminee'
  contacts: SessionContact[]
}

type Script = { contenu: string; is_default: boolean }
type Objection = { id: string; question: string; reponse: string; ordre: number }

/**
 * Shuffle déterministe basé sur la date du jour.
 * Utilise un simple hash de la date comme seed pour un PRNG minimaliste.
 */
function dailyShuffle<T>(arr: T[]): T[] {
  if (arr.length <= 1) return arr
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  // Simple seed from date string
  let seed = 0
  for (let i = 0; i < today.length; i++) {
    seed = ((seed << 5) - seed + today.charCodeAt(i)) | 0
  }
  // Seeded pseudo-random (mulberry32)
  const rand = () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export default function CallingSessionPanel() {
  const { celebrate } = useCelebrations()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeContact, setActiveContact] = useState<SessionContact | null>(null)
  const [script, setScript] = useState('')
  const [objections, setObjections] = useState<Objection[]>([])
  const [showBilan, setShowBilan] = useState(false)
  const [calledSinceLastBilan, setCalledSinceLastBilan] = useState<string[]>([])
  const [streakCount, setStreakCount] = useState(0)

  useEffect(() => {
    fetch('/api/calling-sessions')
      .then(r => r.json())
      .then(async d => {
        const active = (d.data ?? []).find((s: Session) => s.statut === 'active')
        if (!active) { setLoading(false); return }
        const detail = await fetch(`/api/calling-sessions/${active.id}`).then(r => r.json())
        if (detail.success) {
          const s: Session = detail.data
          setSession(s)
          // Shuffle les contacts a_appeler avec un seed basé sur la date du jour
          // pour varier les contacts présentés chaque jour
          const aAppeler = s.contacts.filter(c => c.statut_appel === 'a_appeler')
          const shuffled = dailyShuffle(aAppeler)
          const first = shuffled[0] ?? s.contacts[0] ?? null
          setActiveContact(first)
          const [scriptRes, objRes] = await Promise.all([
            fetch(`/api/call-scripts?metier=${s.metier}`).then(r => r.json()),
            fetch(`/api/call-objections?metier=${s.metier}`).then(r => r.json()),
          ])
          const def: Script | undefined = (scriptRes.data ?? []).find((sc: Script) => sc.is_default) ?? scriptRes.data?.[0]
          setScript(def?.contenu ?? '')
          setObjections(objRes.data ?? [])
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleUpdate = useCallback(async (contactId: string, patch: Partial<SessionContact>) => {
    if (!session) return
    const res = await fetch(`/api/calling-sessions/${session.id}/contacts/${contactId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const data = await res.json()
    if (!data.success) return

    setSession(prev => {
      if (!prev) return prev
      return { ...prev, contacts: prev.contacts.map(c => c.id === contactId ? { ...c, ...data.data } : c) }
    })
    setActiveContact(prev => prev?.id === contactId ? { ...prev, ...data.data } : prev)

    if (patch.called_at) {
      setCalledSinceLastBilan(prev => {
        const next = [...prev, contactId]
        if (next.length >= 10) setShowBilan(true)
        return next
      })
      const isChaud = patch.statut_appel === 'chaud'
      const isPositive = patch.statut_appel !== 'pas_repondu' && patch.statut_appel !== 'pas_interesse'
      // Mini burst uniquement si pas chaud (chaud a sa propre célébration plus grande)
      if (!isChaud) celebrate('appel_passe')
      // Suivi de série
      setStreakCount(prev => {
        const next = isPositive ? prev + 1 : 0
        if (isPositive && next > 0 && next % 5 === 0) {
          setTimeout(() => celebrate('streak', undefined, { count: next }), 600)
        }
        return next
      })
    }
    if (patch.statut_appel === 'chaud') {
      celebrate('rdv_pris', 'CONTACT CHAUD !')
    }
  }, [session, celebrate])

  async function handleTerminer() {
    if (!session) return
    await fetch(`/api/calling-sessions/${session.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut: 'terminee' }),
    })
    celebrate('session_terminee', 'SESSION TERMINÉE !')
    setSession(null)
  }

  const contacts = session?.contacts ?? []
  const activeIdx = contacts.findIndex(c => c.id === activeContact?.id)

  if (loading) {
    return (
      <div style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 8, padding: 24, textAlign: 'center' }}>
        <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo }}>Chargement session...</div>
      </div>
    )
  }

  if (!session) {
    return (
      <div style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 8, padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>📞</div>
        <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 13, color: C.textMid, marginBottom: 6 }}>Aucune session active</div>
        <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo }}>
          Lancez une recherche TNS ou Chefs pour créer une session d'appels
        </div>
        <a href="/prospection/tns" style={{ display: 'inline-block', marginTop: 12, fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.indigo, textDecoration: 'none', padding: '5px 12px', background: `${C.indigo}15`, borderRadius: 5, border: `1px solid ${C.indigo}30` }}>
          → Prospection TNS
        </a>
      </div>
    )
  }

  const appeles = contacts.filter(c => c.called_at).length

  return (
    <>
      <div style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 8, overflow: 'hidden' }}>
        {/* Header session */}
        <div style={{ background: C.surface2, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${C.line}` }}>
          <div>
            <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 600, color: C.textHi }}>{session.titre}</div>
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, marginTop: 2 }}>
              {appeles}/{contacts.length} appelés
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ width: 80, height: 6, background: C.surface3, borderRadius: 10, overflow: 'hidden', alignSelf: 'center' }}>
              <div style={{ width: `${(appeles / Math.max(contacts.length, 1)) * 100}%`, height: '100%', background: C.green, borderRadius: 10 }} />
            </div>
            <button
              onClick={handleTerminer}
              style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, padding: '4px 10px', borderRadius: 5, background: '#1a0d0d', border: `1px solid #ff647040`, color: '#ff6470', cursor: 'pointer' }}
            >
              Terminer
            </button>
          </div>
        </div>

        {/* CRM split */}
        <div style={{ display: 'grid', gridTemplateColumns: '40% 60%', minHeight: 480 }}>
          {/* Liste gauche */}
          <div style={{ borderRight: `1px solid ${C.line}`, padding: 12, overflowY: 'auto', maxHeight: 480 }}>
            <SessionContactList
              contacts={contacts}
              activeId={activeContact?.id ?? null}
              onSelect={setActiveContact}
            />
          </div>

          {/* Fiche droite */}
          <div style={{ padding: 12, overflowY: 'auto', maxHeight: 480 }}>
            {activeContact ? (
              <SessionContactCard
                contact={activeContact}
                script={script}
                objections={objections}
                onUpdate={handleUpdate}
                onPrev={() => activeIdx > 0 && setActiveContact(contacts[activeIdx - 1])}
                onNext={() => activeIdx < contacts.length - 1 && setActiveContact(contacts[activeIdx + 1])}
                hasPrev={activeIdx > 0}
                hasNext={activeIdx < contacts.length - 1}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: C.textLo, fontFamily: 'JetBrains Mono,monospace', fontSize: 9 }}>
                Sélectionnez un contact
              </div>
            )}
          </div>
        </div>
      </div>

      {showBilan && (
        <BilanModal
          sessionId={session.id}
          contactIds={calledSinceLastBilan}
          objections={objections}
          onClose={() => {
            setShowBilan(false)
            setCalledSinceLastBilan([])
          }}
        />
      )}
    </>
  )
}
