'use client'

import { useState, useEffect } from 'react'
import { C } from '@/lib/theme'

type Script = { id: string; titre: string; is_default: boolean }

type Contact = {
  siren?: string | null
  nom: string
  entreprise?: string
  metier?: string
  ville?: string
  telephone: string
  email?: string | null
  adresse?: string
  source?: string
}

type Props = {
  contacts: Contact[]
  metier: string
  metierLabel: string
  ville: string
  source: 'tns' | 'chefs'
  onClose: () => void
  onCreated: (sessionId: string) => void
}

export default function CreateSessionModal({ contacts, metier, metierLabel, ville, source, onClose, onCreated }: Props) {
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const [titre, setTitre] = useState(`${metierLabel} ${ville} — ${today}`)
  const [scripts, setScripts] = useState<Script[]>([])
  const [scriptId, setScriptId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/call-scripts?metier=${metier}`)
      .then(r => r.json())
      .then(d => {
        const list: Script[] = d.data ?? []
        setScripts(list)
        const def = list.find(s => s.is_default) ?? list[0]
        if (def) setScriptId(def.id)
      })
      .catch(() => {})
  }, [metier])

  async function handleCreate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/calling-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titre, metier, ville, source, contacts }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error ?? 'Erreur création')
      onCreated(data.data.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
      setLoading(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: C.bgMid, border: `1px solid ${C.line}`, borderRadius: 14, padding: 24, width: '100%', maxWidth: 420, position: 'relative' }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: C.ribbon, borderRadius: '14px 14px 0 0' }} />

        <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 14, fontWeight: 600, color: C.textHi, marginBottom: 4, marginTop: 6 }}>
          Créer une session d'appels
        </div>
        <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, marginBottom: 20 }}>
          {contacts.length} contacts sélectionnés · {metierLabel} · {ville}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 5 }}>Titre de la session</label>
          <input
            value={titre}
            onChange={e => setTitre(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textHi, fontSize: 11, fontFamily: 'JetBrains Mono,monospace', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 5 }}>Script à utiliser</label>
          {scripts.length === 0 ? (
            <div style={{ fontSize: 9, color: C.gold, fontFamily: 'JetBrains Mono,monospace' }}>
              Aucun script pour ce métier — à créer dans les Paramètres
            </div>
          ) : (
            <select
              value={scriptId}
              onChange={e => setScriptId(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textHi, fontSize: 10, fontFamily: 'JetBrains Mono,monospace', boxSizing: 'border-box' }}
            >
              {scripts.map(s => (
                <option key={s.id} value={s.id}>{s.titre}{s.is_default ? ' (actif)' : ''}</option>
              ))}
            </select>
          )}
        </div>

        {error && (
          <div style={{ fontSize: 9, color: '#ff6470', marginBottom: 12, fontFamily: 'JetBrains Mono,monospace' }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 8, background: C.surface1, border: `1px solid ${C.line}`, color: C.textLo, fontFamily: 'Oswald,sans-serif', fontSize: 11, cursor: 'pointer' }}>
            ANNULER
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !titre}
            style={{ flex: 2, padding: 10, borderRadius: 8, background: '#0a1f0a', border: `1px solid ${C.green}66`, color: C.green, fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'CRÉATION...' : '🚀 LANCER LA SESSION'}
          </button>
        </div>
      </div>
    </div>
  )
}
