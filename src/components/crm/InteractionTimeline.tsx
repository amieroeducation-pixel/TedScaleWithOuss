'use client'

import { useState, useEffect } from 'react'
import { C } from '@/lib/theme'

interface InteractionTimelineProps {
  prospectId: string
  onAddClick: () => void
}

interface Interaction {
  id: string
  type: string
  notes?: string
  duration_min?: number
  is_honored: boolean
  occurred_at: string
  created_at: string
}

const INTERACTION_ICONS: Record<string, string> = {
  appel: '📞',
  rdv1: '📅',
  rdv2: '📅',
  rdv3: '📅',
  email: '✉️',
  sms: '💬',
  whatsapp: '💬',
  linkedin: '💼',
  interpro: '🤝',
  autre: '📝',
}

const INTERACTION_LABELS: Record<string, string> = {
  appel: 'Appel',
  rdv1: 'RDV Découverte',
  rdv2: 'RDV Conseil',
  rdv3: 'RDV Signature',
  email: 'Email',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  linkedin: 'LinkedIn',
  interpro: 'Interpro',
  autre: 'Note',
}

export default function InteractionTimeline({
  prospectId,
  onAddClick,
}: InteractionTimelineProps) {
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchInteractions() {
      setIsLoading(true)
      setError(null)

      try {
        const res = await fetch(`/api/interactions?prospect_id=${prospectId}`)

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Erreur de chargement')
        }

        const data = await res.json()
        setInteractions(data.data?.interactions ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue')
      } finally {
        setIsLoading(false)
      }
    }

    fetchInteractions()
  }, [prospectId])

  function formatDateTime(isoString: string): string {
    const date = new Date(isoString)
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
    return date.toLocaleDateString('fr-FR', options)
  }

  return (
    <div
      style={{
        padding: '16px 20px',
        borderTop: `1px solid ${C.line}`,
        maxHeight: 300,
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontSize: 9,
            fontFamily: 'JetBrains Mono',
            color: C.textLo,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          Historique interactions
        </span>
        <span
          style={{
            fontSize: 8,
            color: C.gold,
            marginLeft: 4,
          }}
        >
          ({interactions.length})
        </span>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: 50,
                background: C.surface2,
                borderRadius: 6,
                animation: 'pulse 1.5s infinite',
              }}
            />
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div
          style={{
            textAlign: 'center',
            padding: 20,
          }}
        >
          <div style={{ fontSize: 10, color: C.warn, marginBottom: 8 }}>
            ⚠️ {error}
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              fontSize: 9,
              color: C.cyan,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && interactions.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: 20,
          }}
        >
          <div style={{ fontSize: 24, marginBottom: 8 }}>📭</div>
          <div style={{ fontSize: 10, color: C.textLo }}>
            Aucune interaction enregistrée
          </div>
        </div>
      )}

      {/* Timeline items */}
      {!isLoading && !error && interactions.length > 0 && (
        <div style={{ position: 'relative' }}>
          {interactions.map((interaction, index) => (
            <div
              key={interaction.id}
              style={{
                display: 'flex',
                gap: 10,
                marginBottom: index < interactions.length - 1 ? 10 : 0,
                position: 'relative',
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: 24,
                  height: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: C.surface2,
                  borderRadius: '50%',
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: 12 }}>
                  {INTERACTION_ICONS[interaction.type] || '📝'}
                </span>
              </div>

              {/* Timeline line */}
              {index < interactions.length - 1 && (
                <div
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: 24,
                    width: 1,
                    height: 'calc(100% + 10px)',
                    background: C.lineSoft,
                  }}
                />
              )}

              {/* Content */}
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: C.textHi,
                    marginBottom: 2,
                  }}
                >
                  {INTERACTION_LABELS[interaction.type] || 'Interaction'}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    fontFamily: 'JetBrains Mono',
                    color: C.textLo,
                    marginBottom: 4,
                  }}
                >
                  {formatDateTime(interaction.occurred_at)}
                </div>
                {interaction.notes && (
                  <div
                    style={{
                      fontSize: 9,
                      color: C.textMid,
                      fontStyle: 'italic',
                      marginBottom: 2,
                    }}
                  >
                    {interaction.notes}
                  </div>
                )}
                {interaction.duration_min && (
                  <div
                    style={{
                      fontSize: 8,
                      color: C.gold,
                    }}
                  >
                    Durée: {interaction.duration_min}min
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action button */}
      <button
        type="button"
        onClick={onAddClick}
        style={{
          marginTop: 12,
          fontSize: 9,
          fontFamily: 'Oswald',
          fontWeight: 600,
          color: C.cyan,
          background: C.surface2,
          border: `1px solid ${C.cyan}`,
          padding: '6px 12px',
          borderRadius: 6,
          cursor: 'pointer',
          width: '100%',
        }}
      >
        ➕ Ajouter une interaction
      </button>
    </div>
  )
}
