'use client'

import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { C } from '@/lib/theme'
import { LinkButton, LinkChip } from '@/lib/cross-links'

type PipelineStage = {
  stage: string
  label: string
  total: number
  conversion_rate_pct: number
}

type ClosingProduct = {
  type: string
  label: string
  converted: number
  total: number
  rate_pct: number
  color: string
}

const FUNNEL_STAGES = ['a_contacter', 'rdv1', 'rdv2', 'rdv3', 'converti']

const STAGE_DISPLAY_LABELS: Record<string, string> = {
  a_contacter: 'À contacter',
  rdv1: 'RDV 1',
  rdv2: 'RDV 2',
  rdv3: 'RDV 3',
  converti: 'Closing signé',
}

const STAGE_COLORS_MAP: Record<string, string> = {
  a_contacter: C.textLo,
  rdv1: C.indigo,
  rdv2: '#7ab8e8',
  rdv3: C.gold,
  converti: C.green,
}

const STAGE_BG_MAP: Record<string, string> = {
  a_contacter: C.surface3,
  rdv1: C.surface2,
  rdv2: C.surface2,
  rdv3: '#1a1600',
  converti: '#0d1f0f',
}

function PieTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: { color: string } }[] }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: C.surface2, border: `1px solid ${C.line}`,
      borderRadius: 8, padding: '8px 12px', fontSize: 12,
    }}>
      <div style={{ color: payload[0].payload.color, fontWeight: 700 }}>{payload[0].name}</div>
      <div style={{ color: C.text }}>{payload[0].value}%</div>
    </div>
  )
}

function StatBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 800, color, fontFamily: 'Oswald, sans-serif' }}>{value}</div>
      <div style={{ fontSize: 9, color: C.textLo, marginTop: 2 }}>{label}</div>
    </div>
  )
}

export default function PipelinePage() {
  const [pipelineData, setPipelineData] = useState<{
    stages: PipelineStage[]
    totalProspects: number
    convertedCount: number
    lostCount: number
  } | null>(null)

  const [closingData, setClosingData] = useState<{
    globalClosingRate: number
    convertedTotal: number
    lostTotal: number
    totalProspects: number
    byProduct: ClosingProduct[]
  } | null>(null)

  const [loading, setLoading] = useState(true)
  const [calendarEvents, setCalendarEvents] = useState<{
    id: string; title: string; start: string | null; end: string | null; allDay: boolean; location: string | null
  }[]>([])
  const [calendarConnected, setCalendarConnected] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/analytics/pipeline').then(r => r.json()),
      fetch('/api/analytics/closing').then(r => r.json()),
      fetch('/api/calendar/events').then(r => r.json()),
    ]).then(([pRes, cRes, calRes]) => {
      if (pRes.success) setPipelineData(pRes.data)
      if (cRes.success) setClosingData(cRes.data)
      if (calRes.success) {
        setCalendarEvents(calRes.data.events ?? [])
        setCalendarConnected(calRes.data.connected ?? false)
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const stages = pipelineData?.stages ?? []
  const aContacterCount = stages.find(s => s.stage === 'a_contacter')?.total ?? 0
  const rdv1Count = stages.find(s => s.stage === 'rdv1')?.total ?? 0
  const funnelRef = Math.max(aContacterCount, 1)

  const tunnel = FUNNEL_STAGES.map(stage => {
    const row = stages.find(r => r.stage === stage)
    const count = row?.total ?? 0
    return {
      stage,
      label: STAGE_DISPLAY_LABELS[stage],
      count,
      pct: Math.round((count / funnelRef) * 100),
      color: STAGE_COLORS_MAP[stage],
      bg: STAGE_BG_MAP[stage],
    }
  })

  const tauxRdv1 = aContacterCount > 0 ? Math.round((rdv1Count / aContacterCount) * 100) : 0
  const closingRate = closingData?.globalClosingRate ?? 0
  const totalProspects = pipelineData?.totalProspects ?? 0
  const byProduct = closingData?.byProduct ?? []
  const hasData = totalProspects > 0

  if (loading) {
    return (
      <>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap')`}</style>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: C.textLo, fontSize: 13 }}>
          Chargement des données pipeline…
        </div>
      </>
    )
  }

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap')`}</style>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.textHi, fontFamily: 'Oswald, sans-serif', letterSpacing: 1, textTransform: 'uppercase' }}>
          🔄 Pipeline & Conversion
        </div>
        <div style={{ fontSize: 11, color: C.textLo, marginTop: 4 }}>
          Funnel de conversion, taux de closing et performance par étape
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'À contacter', value: String(aContacterCount), sub: 'Top funnel', subColor: C.gold, color: C.indigo },
          { label: 'Taux RDV 1', value: `${tauxRdv1}%`, sub: 'Appel→RDV1', subColor: C.green, color: C.gold },
          { label: 'Taux closing', value: `${closingRate}%`, sub: 'Décisions prises', subColor: C.cyan, color: C.cyan },
          { label: 'Total prospects', value: String(totalProspects), sub: 'Tous statuts', subColor: C.gold, color: C.green },
        ].map(k => (
          <div key={k.label} style={{
            background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 10, padding: '14px 16px',
          }}>
            <div style={{ fontSize: 10, color: C.textLo, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: k.color, fontFamily: 'Oswald, sans-serif' }}>{k.value}</div>
            <div style={{ marginTop: 4 }}>
              <span style={{
                fontSize: 10, fontWeight: 600, color: k.subColor,
                background: k.subColor + '22', borderRadius: 4, padding: '1px 6px',
              }}>{k.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Row 2: Tunnel + Pie closing */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 12, marginBottom: 20 }}>

        {/* Tunnel */}
        <div style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textHi, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>
            🎯 Tunnel de conversion
          </div>
          {!hasData ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: C.textLo, fontSize: 11 }}>
              Aucun prospect dans le pipeline.<br />
              <span style={{ fontSize: 10 }}>Ajoutez des prospects depuis le CRM pour voir le funnel.</span>
            </div>
          ) : (
            <>
              {tunnel.map((step, i) => (
                <div key={step.stage} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <div style={{ fontSize: 10, color: C.textMid, width: 120, flexShrink: 0 }}>{step.label}</div>
                    <div style={{ flex: 1, height: 24, background: C.surface3, borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                      <div style={{
                        width: `${Math.max(step.pct, step.count > 0 ? 8 : 0)}%`,
                        height: '100%',
                        background: step.color + '25',
                        borderRadius: 4,
                        display: 'flex', alignItems: 'center', paddingLeft: 8,
                      }}>
                        <span style={{ fontSize: 11, color: step.color, fontWeight: 600 }}>{step.count}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: step.color, width: 36, textAlign: 'right' }}>
                      {step.pct}%
                    </div>
                  </div>
                  {i < tunnel.length - 1 && (
                    <div style={{ marginLeft: 130, height: 1, background: C.lineSoft }} />
                  )}
                </div>
              ))}

              <div style={{
                marginTop: 16, padding: '12px 16px',
                background: C.surface2, borderRadius: 8, border: `1px solid ${C.line}`,
                display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12,
              }}>
                <StatBadge label="Appel→RDV1" value={`${tauxRdv1}%`} color={C.indigo} />
                <StatBadge label="Prospects actifs" value={String(totalProspects)} color={C.gold} />
                <StatBadge label="Taux closing" value={`${closingRate}%`} color={C.green} />
              </div>
            </>
          )}
        </div>

        {/* Closing par produit */}
        <div style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textHi, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>
            🥧 Closing par produit
          </div>
          {byProduct.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: C.textLo, fontSize: 11 }}>
              Aucun contrat signé.<br />
              <span style={{ fontSize: 10 }}>Les données apparaîtront après les premiers closings.</span>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={byProduct}
                    cx="50%" cy="50%"
                    innerRadius={52} outerRadius={82}
                    paddingAngle={3}
                    dataKey="rate_pct"
                    nameKey="label"
                  >
                    {byProduct.map(entry => (
                      <Cell key={entry.type} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {byProduct.map(p => (
                  <div key={p.type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
                      <span style={{ fontSize: 10, color: C.text }}>{p.label}</span>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: p.color }}>{p.rate_pct}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Row 3: placeholders pour données futures */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
        <div style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textHi, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
            📅 RDV cette semaine
          </div>
          {!calendarConnected ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: 10, color: C.textLo, marginBottom: 10, lineHeight: 1.6 }}>
                Google Calendar non connecté.
              </div>
              <a href="/api/auth/google-calendar" style={{
                display: 'inline-block', padding: '7px 14px', borderRadius: 6, textDecoration: 'none',
                fontSize: 10, fontWeight: 600, fontFamily: 'Oswald,sans-serif',
                background: `linear-gradient(90deg,${C.indigo},${C.cyan})`, color: C.bgDeep,
              }}>
                🔗 Connecter Calendar
              </a>
            </div>
          ) : calendarEvents.length === 0 ? (
            <div style={{ fontSize: 10, color: C.textLo, textAlign: 'center', padding: '16px 0' }}>
              Aucun RDV cette semaine.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {calendarEvents.map(ev => {
                const date = ev.start ? new Date(ev.start) : null
                const dayLabel = date ? date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }) : '—'
                const timeLabel = !ev.allDay && ev.start ? new Date(ev.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'Journée'
                return (
                  <div key={ev.id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                    padding: '7px 10px', background: C.surface2, borderRadius: 6,
                    border: `1px solid ${C.lineSoft}`,
                    borderLeft: `3px solid ${C.indigo}`,
                  }}>
                    <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 38 }}>
                      <div style={{ fontSize: 9, color: C.indigo, fontWeight: 700, fontFamily: 'JetBrains Mono,monospace' }}>{dayLabel}</div>
                      <div style={{ fontSize: 8, color: C.textLo, fontFamily: 'JetBrains Mono,monospace' }}>{timeLabel}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, color: C.textHi, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</div>
                      {ev.location && (
                        <div style={{ fontSize: 8, color: C.textLo, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📍 {ev.location}</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div style={{ background: C.surface1, border: `1px solid ${C.lineSoft}`, borderRadius: 10, padding: '14px 16px', opacity: 0.6 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textHi, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
            📊 Historique taux de closing
          </div>
          <div style={{ fontSize: 10, color: C.textLo, textAlign: 'center', padding: '20px 0', lineHeight: 1.6 }}>
            Historique mensuel non disponible.<br />Alimenté automatiquement après plusieurs mois d&apos;utilisation.
          </div>
        </div>
      </div>

      {/* Navigation transversale */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
        <LinkButton href="/crm" label="CRM Kanban complet" color="gold" />
        <LinkButton href="/analytics" label="Analyses conversion" color="green" />
        <LinkButton href="/revenue" label="Impact CA" color="indigo" />
        <LinkButton href="/today" label="Actions du jour" color="cyan" params={{ tab: 'relances' }} />
      </div>
    </>
  )
}
