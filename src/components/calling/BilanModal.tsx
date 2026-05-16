'use client'

import { useState } from 'react'
import { C } from '@/lib/theme'

type Objection = { id: string; question: string }

type Props = {
  sessionId: string
  contactIds: string[]
  objections: Objection[]
  onClose: () => void
}

export default function BilanModal({ sessionId, contactIds, objections, onClose }: Props) {
  const [scriptRating, setScriptRating] = useState(0)
  const [objRatings, setObjRatings] = useState<Record<string, { rencontree: boolean; rating: number }>>({})
  const [commentaire, setCommentaire] = useState('')
  const [saving, setSaving] = useState(false)

  function setObjRencontree(id: string, val: boolean) {
    setObjRatings(prev => ({ ...prev, [id]: { rencontree: val, rating: prev[id]?.rating ?? 0 } }))
  }

  function setObjRating(id: string, val: number) {
    setObjRatings(prev => ({ ...prev, [id]: { rencontree: prev[id]?.rencontree ?? true, rating: val } }))
  }

  async function handleSubmit() {
    setSaving(true)
    const contacts = contactIds.map(id => ({
      id,
      script_rating: scriptRating,
      objections_rencontrees: Object.entries(objRatings)
        .filter(([, v]) => v.rencontree)
        .map(([objId, v]) => ({ id: objId, rating: v.rating })),
    }))

    await fetch(`/api/calling-sessions/${sessionId}/bilan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contacts, commentaire }),
    })
    setSaving(false)
    onClose()
  }

  const StarRating = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
    <div style={{ display: 'flex', gap: 3 }}>
      {[1,2,3,4,5].map(n => (
        <button
          key={n}
          onClick={() => onChange(n)}
          style={{ fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', color: n <= value ? C.gold : C.surface3, padding: '0 2px' }}
        >★</button>
      ))}
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: C.bgMid, border: `1px solid ${C.gold}40`, borderRadius: 14, padding: 24, width: '100%', maxWidth: 480, maxHeight: '80vh', overflowY: 'auto', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: C.ribbon, borderRadius: '14px 14px 0 0' }} />

        <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 15, fontWeight: 600, color: C.gold, marginBottom: 4, marginTop: 6 }}>
          Bilan de session — 10 appels
        </div>
        <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, marginBottom: 20 }}>
          Prenez 2 minutes pour noter ce qui a bien marché
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 11, color: C.textHi, marginBottom: 8 }}>Note globale du script</div>
          <StarRating value={scriptRating} onChange={setScriptRating} />
        </div>

        {objections.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 11, color: C.textHi, marginBottom: 10 }}>Objections rencontrées</div>
            {objections.map(o => (
              <div key={o.id} style={{ background: C.surface1, borderRadius: 7, padding: '8px 10px', marginBottom: 6 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 6 }}>
                  <input
                    type="checkbox"
                    checked={objRatings[o.id]?.rencontree ?? false}
                    onChange={e => setObjRencontree(o.id, e.target.checked)}
                    style={{ accentColor: C.gold }}
                  />
                  <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textMid }}>{o.question}</span>
                </label>
                {objRatings[o.id]?.rencontree && (
                  <div style={{ paddingLeft: 22 }}>
                    <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7, color: C.textLo, marginBottom: 4 }}>La réponse a bien fonctionné ?</div>
                    <StarRating value={objRatings[o.id]?.rating ?? 0} onChange={v => setObjRating(o.id, v)} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 11, color: C.textHi, marginBottom: 8 }}>Commentaire libre</div>
          <textarea
            value={commentaire}
            onChange={e => setCommentaire(e.target.value)}
            placeholder="Ce qui a bien marché, ce qui a bloqué..."
            rows={3}
            style={{ width: '100%', padding: '8px 10px', background: C.surface1, border: `1px solid ${C.lineSoft}`, borderRadius: 6, color: C.textMid, fontSize: 9, fontFamily: 'JetBrains Mono,monospace', resize: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving || scriptRating === 0}
          style={{ width: '100%', padding: 12, borderRadius: 8, background: '#1a1400', border: `1px solid ${C.gold}60`, color: C.gold, fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 600, cursor: saving || scriptRating === 0 ? 'not-allowed' : 'pointer', opacity: scriptRating === 0 ? 0.6 : 1 }}
        >
          {saving ? 'ENREGISTREMENT...' : 'VALIDER LE BILAN'}
        </button>
      </div>
    </div>
  )
}
