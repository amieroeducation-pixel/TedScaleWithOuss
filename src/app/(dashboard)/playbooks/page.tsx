// src/app/(dashboard)/playbooks/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { PLAYBOOKS } from '@/lib/playbooks/config'
import PlaybookCard from '@/components/playbooks/PlaybookCard'
import Link from 'next/link'
import { C } from '@/lib/theme'
import { LinkButton, LinkChip } from '@/lib/cross-links'

const FAMILIES = [
  { key: 'A', label: 'Famille A — Prospection Data Officielle', accent: C.gold },
  { key: 'B', label: 'Famille B — Intelligence Client', accent: C.indigo },
  { key: 'C', label: 'Famille C — LinkedIn Gojiberry', accent: C.cyan },
]

export default function PlaybooksPage() {
  const [lastRuns, setLastRuns] = useState<Record<string, any>>({})
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    Promise.all(
      PLAYBOOKS.map(async (p) => {
        const res = await fetch(`/api/playbooks/${p.id}/runs`)
        const data = await res.json()
        return { id: p.id, run: data.runs?.[0] ?? null }
      })
    ).then((results) => {
      const map: Record<string, any> = {}
      results.forEach(({ id, run }) => { map[id] = run })
      setLastRuns(map)
    })
  }, [])

  async function handleRun(playbookId: string) {
    setRunningIds(prev => new Set(prev).add(playbookId))
    try {
      const res = await fetch(`/api/playbooks/${playbookId}/run`, { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } })
      if (!res.ok) throw new Error('Run failed')
      setTimeout(async () => {
        const runsRes = await fetch(`/api/playbooks/${playbookId}/runs`)
        const data = await runsRes.json()
        setLastRuns(prev => ({ ...prev, [playbookId]: data.runs?.[0] ?? null }))
        setRunningIds(prev => { const s = new Set(prev); s.delete(playbookId); return s })
      }, 4000)
    } catch {
      setRunningIds(prev => { const s = new Set(prev); s.delete(playbookId); return s })
    }
  }

  return (
    <div style={{ padding: 24, background: C.bgDeep, minHeight: '100vh' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: C.textHi, margin: 0, fontFamily: 'Oswald, sans-serif', letterSpacing: 1 }}>
          PLAYBOOKS
        </h1>
        <p style={{ fontSize: 12, color: C.textMid, margin: '4px 0 0' }}>
          Workflows automatisés de prospection patrimoniale
        </p>
      </div>

      {FAMILIES.map(({ key, label, accent }) => {
        const playbooks = PLAYBOOKS.filter(p => p.family === key)
        return (
          <div key={key} style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 3, height: 14, background: accent, borderRadius: 2 }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                {label}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {playbooks.map(p => (
                <Link key={p.id} href={`/playbooks/${p.id}`} style={{ textDecoration: 'none' }}>
                  <PlaybookCard
                    playbook={p}
                    lastRun={lastRuns[p.id]}
                    onRun={(id) => { handleRun(id) }}
                    isRunning={runningIds.has(p.id)}
                  />
                </Link>
              ))}
            </div>
          </div>
        )
      })}

      {/* Navigation transversale — Playbooks */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 32, paddingTop: 20, borderTop: `1px solid ${C.gold}20` }}>
        <LinkButton href="/prospection/tns" label="TNS" color="gold" />
        <LinkButton href="/prospection/chefs-entreprise" label="Chefs" color="cyan" />
        <LinkButton href="/crm" label="CRM" color="green" />
        <LinkChip href="/scoring" label="Scoring" color="purple" />
        <LinkChip href="/map" label="Carte" color="indigo" />
      </div>
    </div>
  )
}
