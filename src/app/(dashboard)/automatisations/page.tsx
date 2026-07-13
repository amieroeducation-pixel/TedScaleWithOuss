'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { C } from '@/lib/theme'

interface Automation {
  id: string
  icon: string
  iconBg: string
  name: string
  desc: string
  active: boolean
}

interface CronLog {
  id: string
  job_name: string
  status: 'success' | 'error' | 'skipped'
  details: Record<string, unknown>
  executed_at: string
}

const CRON_JOBS: Automation[] = [
  { id: 'weekly-report',  icon: '📊', iconBg: '#0d1f0f', name: 'Rapport hebdomadaire', desc: 'Email KPIs chaque lundi 8h via Brevo', active: true },
  { id: 'client-health',  icon: '🔔', iconBg: '#1f0d0d', name: 'Alertes Client Health', desc: 'Email + SMS quotidien si inactivité', active: true },
  { id: 'rdv-reminder',   icon: '💬', iconBg: '#0a1a0a', name: 'Rappel RDV J-1', desc: 'SMS / WhatsApp chaque soir 18h', active: true },
  { id: 'revenue-alert',  icon: '⚠',  iconBg: '#1a1400', name: 'Alerte CA sous seuil', desc: 'Email si CA mensuel < objectif', active: true },
]

function buildActionSummary(log: CronLog): string {
  const d = log.details
  switch (log.job_name) {
    case 'weekly-report':
      return d.emailSent
        ? `Email envoyé — CA ${typeof d.caMonth === 'number' ? d.caMonth.toLocaleString('fr-FR') : '?'} EUR, ${d.alertsCount ?? 0} alerte(s)`
        : d.error ? `Erreur: ${d.error}` : 'Email non envoyé'
    case 'client-health':
      if (log.status === 'skipped') return (d.reason as string) ?? 'Aucune alerte'
      return `${d.alertsCount ?? 0} alerte(s) — Email ${d.emailSent ? 'envoyé' : 'échec'}${typeof d.smsSentCount === 'number' && d.smsSentCount > 0 ? `, ${d.smsSentCount} SMS` : ''}`
    case 'rdv-reminder':
      if (log.status === 'skipped') return (d.reason as string) ?? 'Aucun RDV demain'
      return `${d.rdvCount ?? 0} RDV — ${d.sentCount ?? 0} message(s) envoyé(s)`
    case 'revenue-alert':
      if (log.status === 'skipped') return (d.reason as string) ?? 'CA OK ou trop tôt'
      return `CA ${typeof d.caMonth === 'number' ? d.caMonth.toLocaleString('fr-FR') : '?'} EUR / ${typeof d.target === 'number' ? d.target.toLocaleString('fr-FR') : '?'} EUR (${d.pct ?? 0}%)`
    default:
      return log.status
  }
}

function Panel({ children, style, accent = C.cyan }: { children: React.ReactNode; style?: React.CSSProperties; accent?: string }) {
  return (
    <div style={{
      background: `linear-gradient(180deg,${C.surface1},${C.bgMid})`,
      border: `1px solid ${C.line}`, borderRadius: 12,
      padding: 16, position: 'relative', overflow: 'hidden', ...style,
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${accent}88,transparent)` }} />
      {children}
    </div>
  )
}

function PanelTitle({ title, accent = C.cyan }: { title: string; accent?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
      <span style={{ width: 6, height: 6, background: accent, transform: 'rotate(45deg)', display: 'inline-block', boxShadow: `0 0 7px ${accent}`, flexShrink: 0 }} />
      <span style={{ fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 500, color: C.textHi, textTransform: 'uppercase', letterSpacing: '0.16em' }}>{title}</span>
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <div
      onClick={onChange}
      style={{
        width: 38, height: 20, borderRadius: 10, cursor: 'pointer',
        background: value ? C.gold : C.surface3,
        border: `1px solid ${value ? C.gold : C.line}`,
        position: 'relative', transition: 'all 0.2s', flexShrink: 0,
        boxShadow: value ? `0 0 8px ${C.gold}55` : 'none',
      }}
    >
      <div style={{
        position: 'absolute', top: 3, width: 12, height: 12, borderRadius: '50%',
        background: C.textHi, transition: 'left 0.2s', left: value ? 22 : 4,
      }} />
    </div>
  )
}

export default function AutomatisationsPage() {
  const router = useRouter()
  const [automations, setAutomations] = useState<Automation[]>(CRON_JOBS)
  const [logs, setLogs] = useState<CronLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/cron/logs').then(r => r.json()),
      fetch('/api/cron/toggles').then(r => r.json()),
    ]).then(([logsJson, togglesJson]) => {
      if (logsJson.data) setLogs(logsJson.data)
      if (togglesJson.data) {
        const saved = togglesJson.data as Record<string, boolean>
        setAutomations(prev => prev.map(a => ({
          ...a,
          active: saved[a.id] !== undefined ? saved[a.id] : a.active,
        })))
      }
    }).catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function toggleAuto(id: string) {
    setAutomations(prev => {
      const updated = prev.map(a => a.id === id ? { ...a, active: !a.active } : a)
      const target = updated.find(a => a.id === id)
      if (target) {
        fetch('/api/cron/toggles', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job_name: id, active: target.active }),
        }).catch(() => {})
      }
      return updated
    })
  }

  const activeCount = automations.filter(a => a.active).length

  const totalEmailsSent = logs.reduce((sum, log) => {
    const d = log.details
    return sum + (d.emailSent ? 1 : 0)
  }, 0)

  const totalSmsSent = logs.reduce((sum, log) => {
    const d = log.details
    const sms = typeof d.smsSentCount === 'number' ? d.smsSentCount : 0
    const sent = typeof d.sentCount === 'number' && log.job_name === 'rdv-reminder' ? d.sentCount : 0
    return sum + sms + sent
  }, 0)

  return (
    <>
      <style>{'@import url(\'https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap\')'}</style>

      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 3, height: 24, background: C.ribbon, borderRadius: 2 }} />
          <h1 style={{ fontFamily: 'Oswald,sans-serif', fontSize: 22, fontWeight: 600, color: C.textHi, letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
            Automa<span style={{ color: C.cyan }}>tisations</span>
          </h1>
        </div>
        <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: C.textLo, paddingLeft: 13 }}>
          Flux automatisés actifs — Centre de contrôle
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Automatisations', val: String(automations.length), sub: `${activeCount} actives`, subColor: C.indigo, link: '/settings?tab=triggers' },
          { label: 'Emails envoyés', val: String(totalEmailsSent), sub: 'Via Brevo', subColor: C.gold, link: null },
          { label: 'SMS / WA', val: String(totalSmsSent), sub: 'Rappels RDV', subColor: C.indigo, link: '/today' },
        ].map(k => (
          <div
            key={k.label}
            onClick={k.link ? () => router.push(k.link) : undefined}
            style={{
              background: `linear-gradient(180deg,${C.surface1},${C.bgMid})`,
              border: `1px solid ${C.line}`,
              borderRadius: 10,
              padding: '12px 14px',
              position: 'relative',
              overflow: 'hidden',
              cursor: k.link ? 'pointer' : 'default',
            }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: C.cyan, opacity: 0.4 }} />
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {k.label}
              {k.link && ' →'}
            </div>
            <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 26, fontWeight: 700, color: C.textHi, lineHeight: 1, marginBottom: 4 }}>{k.val}</div>
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: k.subColor }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Automations list */}
      <Panel style={{ marginBottom: 16 }} accent={C.cyan}>
        <PanelTitle title="Automatisations" accent={C.cyan} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {automations.map(auto => {
            // Mapper vers la page cible
            const targetPage = auto.id === 'weekly-report' ? '/global' : auto.id === 'client-health' ? '/clients' : auto.id === 'rdv-reminder' ? '/today' : auto.id === 'revenue-alert' ? '/revenue' : null
            return (
              <div key={auto.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                background: C.surface2,
                border: `1px solid ${auto.active ? C.line : C.lineSoft}`,
                borderRadius: 10, opacity: auto.active ? 1 : 0.7,
                transition: 'opacity 0.2s',
              }}>
                {/* Icon */}
                <div style={{
                  width: 34, height: 34, borderRadius: 8, background: auto.iconBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, flexShrink: 0,
                  border: `1px solid ${auto.active ? C.gold + '44' : C.lineSoft}`,
                }}>
                  {auto.icon}
                </div>
                {/* Name + desc */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    onClick={targetPage ? () => router.push(targetPage) : undefined}
                    style={{
                      fontFamily: 'JetBrains Mono,monospace',
                      fontSize: 11,
                      fontWeight: 600,
                      color: C.textHi,
                      cursor: targetPage ? 'pointer' : 'default',
                    }}
                  >
                    {auto.name}
                    {targetPage && ' →'}
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo, marginTop: 3 }}>{auto.desc}</div>
                </div>
              {/* Status badge */}
              <span style={{
                fontFamily: 'JetBrains Mono,monospace', fontSize: 9, fontWeight: 700,
                color: auto.active ? C.gold : C.textLo,
                background: auto.active ? `${C.gold}18` : `${C.textLo}18`,
                border: `1px solid ${auto.active ? C.gold + '55' : C.textLo + '30'}`,
                padding: '3px 10px', borderRadius: 10, textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0,
              }}>
                {auto.active ? 'Actif' : 'Pause'}
              </span>
                {/* Toggle — gold=active, grey=off */}
                <Toggle value={auto.active} onChange={() => toggleAuto(auto.id)} />
              </div>
            )
          })}
        </div>
      </Panel>

      {/* Execution log */}
      <Panel accent={C.gold}>
        <PanelTitle title="Journal d'exécution — 50 derniers runs" accent={C.gold} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '140px 120px 80px 1fr', gap: 12, padding: '4px 10px', marginBottom: 4 }}>
            {['Automation', 'Timestamp', 'Statut', 'Action effectuée'].map(h => (
              <span key={h} style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textVlo, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{h}</span>
            ))}
          </div>
          {loading ? (
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: C.textLo, padding: '12px 10px' }}>
              Chargement...
            </div>
          ) : logs.length === 0 ? (
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: C.textLo, padding: '12px 10px' }}>
              Aucune exécution enregistrée — lancer une première tâche via curl ou Task Scheduler
            </div>
          ) : logs.map((log, i) => {
            const jobLabels: Record<string, string> = {
              'weekly-report': 'Rapport hebdo',
              'client-health': 'Alerte client health',
              'rdv-reminder': 'Rappel RDV J-1',
              'revenue-alert': 'Alerte CA',
            }
            const targetPage = log.job_name === 'weekly-report' ? '/global' : log.job_name === 'client-health' ? '/clients' : log.job_name === 'rdv-reminder' ? '/today' : log.job_name === 'revenue-alert' ? '/revenue' : null
            const actionSummary = buildActionSummary(log)
            const ts = new Date(log.executed_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
            const isSuccess = log.status === 'success'
            const isSkipped = log.status === 'skipped'

            return (
              <div key={log.id} style={{
                display: 'grid', gridTemplateColumns: '140px 120px 80px 1fr', gap: 12,
                padding: '8px 10px', borderRadius: 6,
                background: i % 2 === 0 ? C.surface2 : 'transparent',
                borderLeft: `2px solid ${isSuccess ? C.green : isSkipped ? C.textLo : C.cyan}`,
              }}>
                <div
                  onClick={targetPage ? () => router.push(targetPage) : undefined}
                  style={{
                    fontFamily: 'JetBrains Mono,monospace',
                    fontSize: 10,
                    fontWeight: 500,
                    color: C.textHi,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    cursor: targetPage ? 'pointer' : 'default',
                  }}
                >
                  {jobLabels[log.job_name] ?? log.job_name}
                  {targetPage && ' →'}
                </div>
                <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: C.textLo }}>{ts}</div>
                <div>
                  <span style={{
                    fontFamily: 'JetBrains Mono,monospace', fontSize: 9, fontWeight: 700,
                    color: isSuccess ? C.green : isSkipped ? C.textLo : C.cyan,
                    background: isSuccess ? `${C.green}22` : isSkipped ? `${C.textLo}22` : `${C.cyan}22`,
                    padding: '2px 8px', borderRadius: 8, textTransform: 'uppercase',
                  }}>
                    {isSuccess ? '✓ OK' : isSkipped ? '— SKIP' : '✗ ERR'}
                  </span>
                </div>
                <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: C.textMid, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {actionSummary}
                </div>
              </div>
            )
          })}
        </div>
      </Panel>
    </>
  )
}
