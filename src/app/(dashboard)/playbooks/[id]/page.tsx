// src/app/(dashboard)/playbooks/[id]/page.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getPlaybook } from '@/lib/playbooks/config'
import ProspectValidationRow from '@/components/playbooks/ProspectValidationRow'
import { C } from '@/lib/theme'
import { LinkButton, LinkChip } from '@/lib/cross-links'

export default function PlaybookDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [runs, setRuns] = useState<any[]>([])
  const [selectedRun, setSelectedRun] = useState<any>(null)
  const [prospects, setProspects] = useState<any[]>([])

  let playbook: any = null
  try { playbook = getPlaybook(id as any) } catch { }

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
    return <div style={{ padding: 24, color: C.textMid }}>Playbook introuvable.</div>
  }

  return (
    <div style={{ padding: 24, background: C.bgDeep, minHeight: '100vh' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: C.textHi, margin: 0, fontFamily: 'Oswald, sans-serif', letterSpacing: 1 }}>
          {playbook.name.toUpperCase()}
        </h1>
        <p style={{ fontSize: 11, color: C.textMid, margin: '4px 0 0' }}>{playbook.description}</p>
      </div>

      {pending.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 3, height: 14, background: C.gold, borderRadius: 2 }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: 1.5 }}>
              En attente de validation ({pending.length})
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pending.map(p => (
              <ProspectValidationRow key={p.id} prospect={p} onValidate={handleValidate} onReject={handleReject} />
            ))}
          </div>
        </div>
      )}

      {validated.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 3, height: 14, background: C.green, borderRadius: 2 }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: C.green, textTransform: 'uppercase', letterSpacing: 1.5 }}>
              Validés ({validated.length})
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {validated.map(p => (
              <div key={p.id} style={{
                background: C.surface1,
                border: `1px solid ${C.lineSoft}`,
                borderLeft: `3px solid ${C.green}`,
                borderRadius: 8,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 12, color: C.text }}>
                  {p.company_name} — <span style={{ color: C.textMid }}>{p.dirigeant_name}</span>
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  background: `${C.green}22`, color: C.green,
                  border: `0.5px solid ${C.green}55`,
                  borderRadius: 8, padding: '2px 8px',
                }}>
                  ✓ validé
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {runs.length > 1 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 3, height: 14, background: C.textLo, borderRadius: 2 }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: C.textLo, textTransform: 'uppercase', letterSpacing: 1.5 }}>
              Historique
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {runs.slice(1).map(r => {
              const runValidated = (r.playbook_prospects ?? []).filter((p: any) => p.status === 'validated')
              return (
                <div key={r.id} style={{
                  background: C.surface1,
                  border: `1px solid ${C.lineSoft}`,
                  borderRadius: 6,
                  padding: '8px 12px',
                }}>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: C.textMid }}>{new Date(r.started_at).toLocaleDateString('fr-FR')}</span>
                    <span style={{ fontSize: 10, color: C.textLo }}>{r.prospects_found} trouvés</span>
                    <span style={{ fontSize: 10, color: C.textLo }}>{r.status}</span>
                    {runValidated.length > 0 && (
                      <span style={{ fontSize: 10, color: C.green, fontWeight: 600 }}>{runValidated.length} validés</span>
                    )}
                  </div>
                  {runValidated.length > 0 && (
                    <div style={{ marginTop: 6, paddingTop: 6, borderTop: `0.5px solid ${C.lineSoft}`, display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {runValidated.map((p: any) => (
                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 9 }}>
                          <span style={{ color: C.green }}>✓</span>
                          <span style={{ color: C.textMid }}>{p.company_name}</span>
                          {p.dirigeant_name && <span style={{ color: C.textLo }}>— {p.dirigeant_name}</span>}
                          {p.signal_type && <span style={{ color: C.gold, fontSize: 8 }}>{p.signal_type}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {pending.length === 0 && validated.length === 0 && (
        <div style={{
          border: `2px dashed ${C.line}`,
          borderRadius: 12,
          padding: 40,
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 12, color: C.textMid, margin: 0 }}>Aucun run récent pour ce playbook.</p>
          <p style={{ fontSize: 11, color: C.textLo, margin: '6px 0 0' }}>Lancez le playbook depuis la page liste pour générer des prospects.</p>
        </div>
      )}
      {/* Navigation transversale */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 32, paddingTop: 20, borderTop: `1px solid ${C.gold}20` }}>
        <LinkButton href="/playbooks" label="Playbooks" color="gold" />
        <LinkButton href="/crm" label="CRM" color="green" />
        <LinkChip href="/prospection/tns" label="TNS" color="cyan" />
        <LinkChip href="/scoring" label="Scoring" color="purple" />
      </div>
    </div>
  )
}
