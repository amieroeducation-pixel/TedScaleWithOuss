// src/app/(dashboard)/playbooks/[id]/page.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getPlaybook } from '@/lib/playbooks/config'
import ProspectValidationRow from '@/components/playbooks/ProspectValidationRow'

export default function PlaybookDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [runs, setRuns] = useState<any[]>([])
  const [selectedRun, setSelectedRun] = useState<any>(null)
  const [prospects, setProspects] = useState<any[]>([])

  let playbook: any = null
  try {
    playbook = getPlaybook(id as any)
  } catch {
    // playbook inconnu
  }

  const loadRuns = useCallback(async () => {
    const res = await fetch(`/api/playbooks/${id}/runs`)
    const data = await res.json()
    setRuns(data.runs ?? [])
    if (data.runs?.[0]) {
      setSelectedRun(data.runs[0])
      setProspects(data.runs[0].playbook_prospects ?? [])
    }
  }, [id])

  useEffect(() => { loadRuns() }, [loadRuns])

  async function handleValidate(prospectId: string, variant: 'a' | 'b' | 'c') {
    const res = await fetch('/api/playbooks/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prospectIds: [prospectId], action: 'validate', variant, runId: selectedRun?.id }),
    })
    if (!res.ok) return
    setProspects(prev => prev.map(p => p.id === prospectId ? { ...p, status: 'validated' } : p))
  }

  async function handleReject(prospectId: string) {
    const res = await fetch('/api/playbooks/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prospectIds: [prospectId], action: 'reject', runId: selectedRun?.id }),
    })
    if (!res.ok) return
    setProspects(prev => prev.map(p => p.id === prospectId ? { ...p, status: 'rejected' } : p))
  }

  const pending = prospects.filter(p => p.status === 'pending')
  const validated = prospects.filter(p => p.status !== 'pending' && p.status !== 'rejected')

  if (!playbook) {
    return <div className="p-6 text-gray-500">Playbook introuvable.</div>
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{playbook.name}</h1>
        <p className="text-gray-500">{playbook.description}</p>
      </div>

      {pending.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">
            En attente de validation ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map(p => (
              <ProspectValidationRow
                key={p.id}
                prospect={p}
                onValidate={handleValidate}
                onReject={handleReject}
              />
            ))}
          </div>
        </section>
      )}

      {validated.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">
            Validés ({validated.length})
          </h2>
          <div className="space-y-2">
            {validated.map(p => (
              <div key={p.id} className="rounded-lg border bg-gray-50 p-3 text-sm text-gray-600">
                ✅ {p.company_name} — {p.dirigeant_name} — Score {p.score}/10
              </div>
            ))}
          </div>
        </section>
      )}

      {runs.length > 1 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-gray-700">Historique des runs</h2>
          <div className="space-y-1">
            {runs.slice(1).map(r => (
              <div key={r.id} className="text-sm text-gray-500">
                {new Date(r.started_at).toLocaleDateString('fr-FR')} — {r.prospects_found} trouvés — {r.status}
              </div>
            ))}
          </div>
        </section>
      )}

      {pending.length === 0 && validated.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center text-gray-400">
          <p className="text-sm">Aucun run récent pour ce playbook.</p>
          <p className="mt-1 text-xs">Lancez le playbook depuis la page liste pour générer des prospects.</p>
        </div>
      )}
    </div>
  )
}
