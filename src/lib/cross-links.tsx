'use client'

import { useRouter } from 'next/navigation'
import { C } from '@/lib/theme'

type LinkColor = 'gold' | 'green' | 'cyan' | 'indigo' | 'purple'

const COLOR_MAP: Record<LinkColor, { bg: string; border: string; text: string }> = {
  gold:   { bg: '#1a1400', border: `${C.gold}40`, text: C.gold },
  green:  { bg: '#0d1a0d', border: `${C.green}40`, text: C.green },
  cyan:   { bg: '#1a0d0d', border: `${C.cyan}40`, text: C.cyan },
  indigo: { bg: '#0d0d1a', border: `${C.indigo}40`, text: C.indigo },
  purple: { bg: '#140d1a', border: `${C.purple}40`, text: C.purple },
}

export function buildHref(path: string, params?: Record<string, string>): string {
  if (!params || Object.keys(params).length === 0) return path
  const qs = new URLSearchParams(params).toString()
  return `${path}?${qs}`
}

export function LinkButton({ href, label, color = 'gold', params }: {
  href: string
  label: string
  color?: LinkColor
  params?: Record<string, string>
}) {
  const router = useRouter()
  const c = COLOR_MAP[color]
  return (
    <button
      onClick={() => router.push(buildHref(href, params))}
      style={{
        width: '100%', marginTop: 8, padding: 6,
        background: c.bg, border: `0.5px solid ${c.border}`,
        color: c.text, borderRadius: 4, fontSize: 8,
        cursor: 'pointer', fontWeight: 600,
        fontFamily: 'JetBrains Mono,monospace',
      }}
    >
      → {label}
    </button>
  )
}

export function LinkBadge({ href, label, value, color = 'gold', params }: {
  href: string
  label: string
  value: string | number
  color?: LinkColor
  params?: Record<string, string>
}) {
  const router = useRouter()
  const c = COLOR_MAP[color]
  return (
    <button
      onClick={() => router.push(buildHref(href, params))}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '3px 10px', background: c.bg,
        border: `0.5px solid ${c.border}`, borderRadius: 8,
        color: c.text, fontSize: 9, fontWeight: 600,
        cursor: 'pointer', fontFamily: 'JetBrains Mono,monospace',
      }}
    >
      <span>{label}</span>
      <span style={{ fontWeight: 800 }}>{value}</span>
    </button>
  )
}

export function LinkChip({ href, label, color = 'gold', params }: {
  href: string
  label: string
  color?: LinkColor
  params?: Record<string, string>
}) {
  const router = useRouter()
  const c = COLOR_MAP[color]
  return (
    <span
      onClick={() => router.push(buildHref(href, params))}
      style={{
        display: 'inline-block', padding: '2px 8px',
        background: c.bg, border: `0.5px solid ${c.border}`,
        borderRadius: 4, color: c.text, fontSize: 8,
        cursor: 'pointer', fontWeight: 500,
        fontFamily: 'JetBrains Mono,monospace',
      }}
    >
      {label}
    </span>
  )
}

export function LinkInline({ href, label, color = 'indigo', params }: {
  href: string
  label: string
  color?: LinkColor
  params?: Record<string, string>
}) {
  const router = useRouter()
  const c = COLOR_MAP[color]
  return (
    <span
      onClick={() => router.push(buildHref(href, params))}
      style={{
        color: c.text, cursor: 'pointer', fontSize: 9,
        textDecoration: 'none', fontWeight: 500,
        borderBottom: `0.5px dashed ${c.border}`,
      }}
    >
      {label}
    </span>
  )
}
