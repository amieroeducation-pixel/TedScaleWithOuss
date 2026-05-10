'use client'

import { useState } from 'react'
import { C } from '@/lib/theme'

interface Automation {
  id: number
  icon: string
  iconBg: string
  name: string
  desc: string
  active: boolean
}

const INITIAL_AUTOMATIONS: Automation[] = [
  { id: 1, icon: '✉', iconBg: '#0d1a2e', name: 'Séquence email post-RDV 1', desc: 'Brevo · 24h après RDV 1 honoré', active: true },
  { id: 2, icon: '💬', iconBg: '#0a1a0a', name: 'Rappel WhatsApp avant RDV', desc: 'WhatsApp Business · J-1 18h + J-0 8h', active: true },
  { id: 3, icon: '📅', iconBg: '#1a1400', name: 'Confirmation RDV Google Calendar', desc: 'Google Cal + Fantastical · Sync auto', active: true },
  { id: 4, icon: '📊', iconBg: '#0d1f0f', name: 'Rapport hebdo lundi 8h', desc: 'Email KPIs de la semaine auto', active: true },
  { id: 5, icon: '🔔', iconBg: '#1f0d0d', name: 'Alerte taux closing < 30%', desc: 'SMS + Email · Seuil configurable', active: true },
  { id: 6, icon: '💬', iconBg: '#180d2e', name: 'Relance SMS prospects froids', desc: 'Twilio · Si pas de réponse 7j', active: false },
]

const EXEC_LOG = [
  { id: 1, name: 'Rapport hebdo', ts: '12/05 08:00', status: 'success', action: '14 destinataires — Email envoyé' },
  { id: 2, name: 'Alerte client health', ts: '12/05 07:00', status: 'success', action: '2 alertes déclenchées — Email + SMS envoyés' },
  { id: 3, name: 'Rappel RDV J-1', ts: '11/05 14:30', status: 'success', action: 'WhatsApp envoyé à Sophie Renard' },
  { id: 4, name: 'Alerte client health', ts: '11/05 07:00', status: 'success', action: '1 alerte — Email envoyé' },
  { id: 5, name: 'Alerte closing < seuil', ts: '10/05 16:45', status: 'success', action: 'CA hebdo = 2 800€ < 3 000€ — Alerte envoyée' },
  { id: 6, name: 'Rappel RDV J-1', ts: '10/05 09:00', status: 'success', action: 'WhatsApp envoyé à Martin Dupont' },
  { id: 7, name: 'Import TNS hebdo', ts: '09/05 18:00', status: 'error', action: 'Erreur connexion Supabase — timeout' },
  { id: 8, name: 'Rapport hebdo', ts: '05/05 08:00', status: 'success', action: '14 destinataires — Email envoyé' },
  { id: 9, name: 'Rappel RDV J-1', ts: '04/05 11:00', status: 'success', action: 'WhatsApp envoyé à Claire Vidal' },
  { id: 10, name: 'Alerte client health', ts: '04/05 07:00', status: 'success', action: 'Aucune alerte — Tout est OK' },
]

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
  const [automations, setAutomations] = useState<Automation[]>(INITIAL_AUTOMATIONS)

  function toggleAuto(id: number) {
    setAutomations(prev => prev.map(a => a.id === id ? { ...a, active: !a.active } : a))
  }

  const activeCount = automations.filter(a => a.active).length

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
          { label: 'Automatisations', val: String(automations.length), sub: `${activeCount} actives`, subColor: C.indigo },
          { label: 'Emails envoyés', val: '148', sub: 'Via Brevo', subColor: C.gold },
          { label: 'SMS / WA', val: '37', sub: 'Rappels RDV', subColor: C.indigo },
        ].map(k => (
          <div key={k.label} style={{ background: `linear-gradient(180deg,${C.surface1},${C.bgMid})`, border: `1px solid ${C.line}`, borderRadius: 10, padding: '12px 14px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: C.cyan, opacity: 0.4 }} />
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{k.label}</div>
            <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 26, fontWeight: 700, color: C.textHi, lineHeight: 1, marginBottom: 4 }}>{k.val}</div>
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: k.subColor }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Automations list */}
      <Panel style={{ marginBottom: 16 }} accent={C.cyan}>
        <PanelTitle title="Automatisations" accent={C.cyan} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {automations.map(auto => (
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
                <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 11, fontWeight: 600, color: C.textHi }}>{auto.name}</div>
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
          ))}
        </div>
      </Panel>

      {/* Execution log */}
      <Panel accent={C.gold}>
        <PanelTitle title="Journal d'exécution — 10 derniers runs" accent={C.gold} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '140px 120px 80px 1fr', gap: 12, padding: '4px 10px', marginBottom: 4 }}>
            {['Automation', 'Timestamp', 'Statut', 'Action effectuée'].map(h => (
              <span key={h} style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textVlo, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{h}</span>
            ))}
          </div>
          {EXEC_LOG.map((log, i) => (
            <div key={log.id} style={{
              display: 'grid', gridTemplateColumns: '140px 120px 80px 1fr', gap: 12,
              padding: '8px 10px', borderRadius: 6,
              background: i % 2 === 0 ? C.surface2 : 'transparent',
              borderLeft: `2px solid ${log.status === 'success' ? C.green : C.cyan}`,
            }}>
              <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, fontWeight: 500, color: C.textHi, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.name}</div>
              <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: C.textLo }}>{log.ts}</div>
              <div>
                <span style={{
                  fontFamily: 'JetBrains Mono,monospace', fontSize: 9, fontWeight: 700,
                  color: log.status === 'success' ? C.green : C.cyan,
                  background: log.status === 'success' ? `${C.green}22` : `${C.cyan}22`,
                  padding: '2px 8px', borderRadius: 8, textTransform: 'uppercase',
                }}>
                  {log.status === 'success' ? '✓ OK' : '✗ ERR'}
                </span>
              </div>
              <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: C.textMid, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.action}</div>
            </div>
          ))}
        </div>
      </Panel>
    </>
  )
}
