// src/components/playbooks/PlaybookCard.tsx
'use client'

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

const FAMILY_COLORS: Record<string, string> = {
  A: 'border-blue-500',
  B: 'border-purple-500',
  C: 'border-green-500',
}

export default function PlaybookCard({ playbook, lastRun, onRun, isRunning }: PlaybookCardProps) {
  const borderColor = FAMILY_COLORS[playbook.family] ?? 'border-gray-500'
  const urgencyColor =
    playbook.urgencyDays <= 2
      ? 'bg-red-100 text-red-800'
      : playbook.urgencyDays <= 7
      ? 'bg-orange-100 text-orange-800'
      : 'bg-gray-100 text-gray-600'

  return (
    <div className={`rounded-xl border-l-4 ${borderColor} bg-white p-5 shadow-sm`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-400">Famille {playbook.family}</span>
            {playbook.urgencyDays > 0 && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${urgencyColor}`}>
                Fenêtre {playbook.urgencyDays === 2 ? '48h' : `${playbook.urgencyDays}j`}
              </span>
            )}
            {playbook.isOnDemand && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                À la demande
              </span>
            )}
          </div>
          <h3 className="mt-1 text-lg font-semibold text-gray-900">{playbook.name}</h3>
          <p className="mt-0.5 text-sm text-gray-500">{playbook.description}</p>
          <p className="mt-1 text-xs text-gray-400">{playbook.scheduleDescription}</p>
        </div>

        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRun(playbook.id) }}
          disabled={isRunning}
          className="ml-4 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isRunning ? 'En cours...' : 'Lancer'}
        </button>
      </div>

      {lastRun && (
        <div className="mt-4 flex gap-4 border-t pt-3 text-sm text-gray-600">
          <span>Dernier run : {new Date(lastRun.started_at).toLocaleDateString('fr-FR')}</span>
          <span>Trouvés : <strong>{lastRun.prospects_found}</strong></span>
          <span>Validés : <strong>{lastRun.prospects_validated}</strong></span>
          <span
            className={`font-medium ${
              lastRun.status === 'completed' ? 'text-green-600' : lastRun.status === 'running' ? 'text-blue-600' : 'text-red-600'
            }`}
          >
            {lastRun.status}
          </span>
        </div>
      )}
    </div>
  )
}
