'use client'

import { useState } from 'react'
import { C } from '@/lib/theme'
import { toast } from 'sonner'

export default function ScriptsResetPage() {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleReset() {
    if (!confirm('Supprimer TOUS les anciens scripts et installer les 16 nouveaux messages courts ?')) return

    setLoading(true)
    try {
      const res = await fetch('/api/call-scripts/seed?reset=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })

      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Erreur')

      toast.success(`${json.data.deleted} anciens supprimés, ${json.data.created} nouveaux créés`)
      setDone(true)
    } catch (err: any) {
      toast.error(err.message || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 700, margin: '0 auto' }}>
      <div style={{
        background: C.bgMid,
        border: `1px solid ${C.line}`,
        borderRadius: 14,
        padding: 32,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: C.ribbon
        }} />

        <div style={{
          fontFamily: 'Oswald,sans-serif',
          fontSize: 24,
          fontWeight: 600,
          color: C.textHi,
          marginBottom: 8,
          marginTop: 8,
        }}>
          RÉINITIALISER LES MESSAGES
        </div>

        <div style={{
          fontFamily: 'JetBrains Mono,monospace',
          fontSize: 11,
          color: C.textLo,
          marginBottom: 24,
          lineHeight: 1.6,
        }}>
          Cette action va :
          <br />• Supprimer TOUS les anciens scripts
          <br />• Installer les 16 nouveaux messages WhatsApp courts
          <br />• Format : "Bonjour Monsieur/Madame [Nom]"
        </div>

        {done ? (
          <div style={{
            padding: 20,
            borderRadius: 8,
            background: `${C.green}15`,
            border: `1px solid ${C.green}40`,
            color: C.green,
            fontFamily: 'Oswald,sans-serif',
            fontSize: 14,
            textAlign: 'center',
          }}>
            ✓ MESSAGES RÉINITIALISÉS
            <div style={{
              fontSize: 11,
              marginTop: 8,
              fontFamily: 'JetBrains Mono,monospace'
            }}>
              Va sur /crm → fiche prospect → 💬 Script WhatsApp
            </div>
          </div>
        ) : (
          <button
            onClick={handleReset}
            disabled={loading}
            style={{
              width: '100%',
              padding: 16,
              borderRadius: 8,
              background: loading ? C.surface1 : `${C.gold}15`,
              border: `1px solid ${loading ? C.line : C.gold + '40'}`,
              color: loading ? C.textLo : C.gold,
              fontFamily: 'Oswald,sans-serif',
              fontSize: 16,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'RÉINITIALISATION EN COURS...' : '🔄 RÉINITIALISER MAINTENANT'}
          </button>
        )}
      </div>
    </div>
  )
}
