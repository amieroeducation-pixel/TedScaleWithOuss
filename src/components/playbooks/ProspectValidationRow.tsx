// src/components/playbooks/ProspectValidationRow.tsx
'use client'

import { useState } from 'react'

interface Props {
  prospect: {
    id: string
    company_name: string
    dirigeant_name: string
    score: number
    signal_type: string
    message_j0_a: string
    message_j0_b: string
    message_j0_c: string
    selected_variant: string
    status: string
    signal_data?: any
  }
  onValidate: (id: string, variant: 'a' | 'b' | 'c') => void
  onReject: (id: string) => void
}

const SIGNAL_BADGE: Record<string, { emoji: string; color: string }> = {
  cession: { emoji: '🔴', color: 'bg-red-100 text-red-800' },
  holding: { emoji: '🏗️', color: 'bg-blue-100 text-blue-800' },
  dividendes: { emoji: '💰', color: 'bg-yellow-100 text-yellow-800' },
  dirigeant_55: { emoji: '👔', color: 'bg-purple-100 text-purple-800' },
  creation: { emoji: '🟢', color: 'bg-green-100 text-green-800' },
}

export default function ProspectValidationRow({ prospect, onValidate, onReject }: Props) {
  const badge = SIGNAL_BADGE[prospect.signal_type] ?? { emoji: '📋', color: 'bg-gray-100 text-gray-700' }
  const [selectedVariant, setSelectedVariant] = useState<'a' | 'b' | 'c'>(
    (['a', 'b', 'c'].includes(prospect.selected_variant) ? prospect.selected_variant : 'a') as 'a' | 'b' | 'c'
  )
  const messages: Record<string, string> = {
    a: prospect.message_j0_a,
    b: prospect.message_j0_b,
    c: prospect.message_j0_c,
  }

  if (prospect.status !== 'pending') {
    return (
      <div className="rounded-lg border bg-gray-50 p-3 text-sm text-gray-400">
        {prospect.company_name} — {prospect.status}
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.color}`}>
            {badge.emoji} {prospect.signal_type}
          </span>
          <div>
            <p className="font-semibold text-gray-900">{prospect.company_name}</p>
            <p className="text-sm text-gray-500">{prospect.dirigeant_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-gray-100 px-2 py-1 text-sm font-bold text-gray-700">
            {prospect.score}/10
          </span>
        </div>
      </div>

      <div className="mt-3">
        <p className="mb-1 text-xs font-medium text-gray-500">Message J+0 — choisir le script :</p>
        <div className="flex gap-2 mb-2">
          {(['a', 'b', 'c'] as const).map(v => (
            <button
              key={v}
              onClick={() => setSelectedVariant(v)}
              className={`rounded px-3 py-1 text-xs font-medium ${
                selectedVariant === v ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Variant {v.toUpperCase()}
            </button>
          ))}
        </div>
        <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700 italic">
          {messages[selectedVariant]}
        </p>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => onValidate(prospect.id, selectedVariant)}
          className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          ✅ Valider + Séquence
        </button>
        <button
          onClick={() => onReject(prospect.id)}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-500 hover:bg-gray-50"
        >
          ❌ Ignorer
        </button>
      </div>
    </div>
  )
}
