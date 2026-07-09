// src/components/playbooks/PlaybookCard.tsx
'use client'

import { C } from '@/lib/theme'
import { PlaybookConfig } from '@/lib/playbooks/config'

interface PlaybookCardProps {
  playbook: PlaybookConfig
  lastRun?: {
    status: string
    started_at: string
    prospects_found: number
    prospects_validated: number
  } | null
  onRun: (id: string) => void
  isRunning: boolean
}

const FAMILY_ACCENT: Record<string, string> = {
  A: C.gold,
  B: C.indigo,
  C: C.cyan,
}

export default function PlaybookCard({ playbook, lastRun, onRun, isRunning }: PlaybookCardProps) {
  const accent = FAMILY_ACCENT[playbook.family] ?? C.indigo
  const urgencyColor = playbook.urgencyDays <= 2 ? C.cyan : playbook.urgencyDays <= 7 ? C.warn : C.textLo

  return (
    <div style={{
      background: C.surface1,
      border: `1px solid ${C.line}`,
      borderLeft: `3px solid ${accent}`,
      borderRadius: 10,
      padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: 1 }}>
              Famille {playbook.family}
            </span>
            {playbook.urgencyDays > 0 && (
              <span style={{
                fontSize: 9, padding: '2px 7px', borderRadius: 10,
                background: `${urgencyColor}22`, color: urgencyColor,
                border: `0.5px solid ${urgencyColor}55`, fontWeight: 600,
              }}>
                Fenêtre {playbook.urgencyDays === 2 ? '48h' : `${playbook.urgencyDays}j`}
              </span>
            )}
            {playbook.isOnDemand && (
              <span style={{
                fontSize: 9, padding: '2px 7px', borderRadius: 10,
                background: `${C.textLo}22`, color: C.textLo,
                border: `0.5px solid ${C.textLo}55`, fontWeight: 600,
              }}>
                À la demande
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.textHi, margin: 0 }}>{playbook.name}</p>
          <p style={{ fontSize: 11, color: C.textMid, margin: '2px 0 0' }}>{playbook.description}</p>
          <p style={{ fontSize: 10, color: C.textLo, margin: '2px 0 0' }}>{playbook.scheduleDescription}</p>
        </div>

        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRun(playbook.id) }}
          disabled={isRunning}
          style={{
            marginLeft: 12,
            padding: '6px 14px',
            background: isRunning ? C.surface3 : `${accent}22`,
            border: `1px solid ${isRunning ? C.line : accent}`,
            color: isRunning ? C.textLo : accent,
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            cursor: isRunning ? 'not-allowed' : 'pointer',
            opacity: isRunning ? 0.7 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          {isRunning ? 'En cours...' : 'Lancer'}
        </button>
      </div>

      {lastRun && (
        <div style={{
          marginTop: 10,
          paddingTop: 10,
          borderTop: `1px solid ${C.lineSoft}`,
          display: 'flex',
          gap: 16,
          flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 10, color: C.textMid }}>
            Dernier run : <span style={{ color: C.text }}>{new Date(lastRun.started_at).toLocaleDateString('fr-FR')}</span>
          </span>
          <span style={{ fontSize: 10, color: C.textMid }}>
            Trouvés : <span style={{ color: C.textHi, fontWeight: 700 }}>{lastRun.prospects_found}</span>
          </span>
          <span style={{ fontSize: 10, color: C.textMid }}>
            Validés : <span style={{ color: C.textHi, fontWeight: 700 }}>{lastRun.prospects_validated}</span>
          </span>
          <span style={{
            fontSize: 10, fontWeight: 600,
            color: lastRun.status === 'completed' ? C.green : lastRun.status === 'running' ? C.indigo : C.cyan,
          }}>
            {lastRun.status}
          </span>
        </div>
      )}
    </div>
  )
}
