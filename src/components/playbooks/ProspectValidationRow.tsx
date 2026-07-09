// src/components/playbooks/ProspectValidationRow.tsx
'use client'

import { useState } from 'react'
import { C } from '@/lib/theme'

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
  cession:    { emoji: '🔴', color: C.cyan },
  holding:    { emoji: '🏗️', color: C.indigo },
  dividendes: { emoji: '💰', color: C.gold },
  dirigeant_55: { emoji: '👔', color: C.purple },
  creation:   { emoji: '🟢', color: C.green },
  linkedin:   { emoji: '💼', color: C.cyan },
}

export default function ProspectValidationRow({ prospect, onValidate, onReject }: Props) {
  const badge = SIGNAL_BADGE[prospect.signal_type] ?? { emoji: '📋', color: C.textMid }
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
      <div style={{
        background: C.surface1, border: `1px solid ${C.lineSoft}`,
        borderRadius: 8, padding: '10px 14px',
        fontSize: 11, color: C.textLo,
      }}>
        {prospect.company_name} — {prospect.status}
      </div>
    )
  }

  const scoreColor = prospect.score >= 8 ? C.cyan : prospect.score >= 6 ? C.gold : C.textMid

  return (
    <div style={{
      background: C.surface1,
      border: `1px solid ${C.line}`,
      borderLeft: `3px solid ${badge.color}`,
      borderRadius: 10,
      padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontSize: 9, padding: '3px 8px', borderRadius: 10, fontWeight: 600,
            background: `${badge.color}22`, color: badge.color,
            border: `0.5px solid ${badge.color}55`,
          }}>
            {badge.emoji} {prospect.signal_type}
          </span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.textHi, margin: 0 }}>{prospect.company_name}</p>
            <p style={{ fontSize: 11, color: C.textMid, margin: '2px 0 0' }}>{prospect.dirigeant_name}</p>
          </div>
        </div>
        <div style={{
          fontSize: 13, fontWeight: 700,
          background: `${scoreColor}22`, color: scoreColor,
          border: `1px solid ${scoreColor}55`,
          borderRadius: 8, padding: '4px 10px',
          minWidth: 44, textAlign: 'center',
        }}>
          {prospect.score}/10
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: C.textLo, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 6px' }}>
          Message J+0 — choisir le variant :
        </p>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          {(['a', 'b', 'c'] as const).map(v => (
            <button
              key={v}
              onClick={() => setSelectedVariant(v)}
              style={{
                padding: '4px 12px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                background: selectedVariant === v ? C.gold : C.surface2,
                color: selectedVariant === v ? C.bgDeep : C.textMid,
                border: `1px solid ${selectedVariant === v ? C.gold : C.line}`,
              }}
            >
              Variant {v.toUpperCase()}
            </button>
          ))}
        </div>
        <div style={{
          background: C.surface2,
          border: `1px solid ${C.lineSoft}`,
          borderRadius: 8,
          padding: '10px 12px',
          fontSize: 11,
          color: C.text,
          lineHeight: 1.5,
          fontStyle: 'italic',
        }}>
          {messages[selectedVariant]}
        </div>
      </div>

      <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
        <button
          onClick={() => onValidate(prospect.id, selectedVariant)}
          style={{
            flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
            background: `${C.green}22`, color: C.green,
            border: `1px solid ${C.green}66`,
          }}
        >
          ✅ Valider + Envoyer
        </button>
        <button
          onClick={() => onReject(prospect.id)}
          style={{
            padding: '8px 16px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
            background: C.surface2, color: C.textLo,
            border: `1px solid ${C.line}`,
          }}
        >
          ❌ Ignorer
        </button>
      </div>
    </div>
  )
}
