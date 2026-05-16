// src/app/(dashboard)/playbooks/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { PLAYBOOKS } from '@/lib/playbooks/config'
import PlaybookCard from '@/components/playbooks/PlaybookCard'
import Link from 'next/link'

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
      await fetch(`/api/playbooks/${playbookId}/run`, { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } })
      setTimeout(() => {
        setRunningIds(prev => { const s = new Set(prev); s.delete(playbookId); return s })
      }, 3000)
    } catch {
      setRunningIds(prev => { const s = new Set(prev); s.delete(playbookId); return s })
    }
  }

  const familyA = PLAYBOOKS.filter(p => p.family === 'A')
  const familyB = PLAYBOOKS.filter(p => p.family === 'B')

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Playbooks</h1>
        <p className="mt-1 text-gray-500">Workflows automatisés de prospection patrimoniale</p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-blue-600">
          Famille A — Prospection Data Officielle
        </h2>
        <div className="space-y-3">
          {familyA.map(p => (
            <Link key={p.id} href={`/playbooks/${p.id}`} className="block">
              <PlaybookCard
                playbook={p}
                lastRun={lastRuns[p.id]}
                onRun={(id) => { handleRun(id) }}
                isRunning={runningIds.has(p.id)}
              />
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-purple-600">
          Famille B — Intelligence Client
        </h2>
        <div className="space-y-3">
          {familyB.map(p => (
            <Link key={p.id} href={`/playbooks/${p.id}`} className="block">
              <PlaybookCard
                playbook={p}
                lastRun={lastRuns[p.id]}
                onRun={(id) => { handleRun(id) }}
                isRunning={runningIds.has(p.id)}
              />
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
