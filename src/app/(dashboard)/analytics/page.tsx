'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { C } from '@/lib/theme'
import { LinkChip } from '@/lib/cross-links'

// --- Types ---
type StageRow = { stage: string; label: string; total: number; conversion_rate_pct: number }
type PipelineResp = { stages: StageRow[]; totalProspects: number; convertedCount: number; lostCount: number }
type ProductRow = { type: string; label: string; converted: number; total: number; rate_pct: number; color: string }
type ClosingResp = { globalClosingRate: number; convertedTotal: number; lostTotal: number; totalProspects: number; byProduct: ProductRow[] }

// Couleurs par stage
const STAGE_COLORS: Record<string, string> = {
  a_contacter: C.indigo,
  rdv1: C.cyan,
  rdv2: C.gold,
  rdv3: '#9a4a8a',
  converti: C.green,
  perdu: C.warn,
}

// Tooltip personnalise pour le PieChart closing
function ClosingTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const p: ProductRow = payload[0].payload
  return (
    <div style={{
      background: C.surface2,
      border: `1px solid ${C.line}`,
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 12,
    }}>
      <div style={{ color: C.textMid, marginBottom: 4 }}>{p.label}</div>
      <div style={{ color: payload[0].fill, fontWeight: 700, fontSize: 15 }}>
        {p.converted} contrat{p.converted > 1 ? 's' : ''}
      </div>
      <div style={{ color: C.textLo, fontSize: 11, marginTop: 2 }}>
        {p.rate_pct}% du mix produit
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={null}>
      <AnalyticsPageContent />
    </Suspense>
  )
}

function AnalyticsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const focusProduct = searchParams.get('focus')
  const [pipeline, setPipeline] = useState<PipelineResp | null>(null)
  const [closing, setClosing] = useState<ClosingResp | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/analytics/pipeline'),
      fetch('/api/analytics/closing'),
    ])
      .then(async ([resPipeline, resClosing]) => {
        const jsonPipeline = await resPipeline.json()
        const jsonClosing = await resClosing.json()
        if (jsonPipeline.error) {
          setError(jsonPipeline.error)
          return
        }
        if (jsonClosing.error) {
          setError(jsonClosing.error)
          return
        }
        setPipeline(jsonPipeline.data)
        setClosing(jsonClosing.data)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const maxTotal = pipeline
    ? Math.max(...pipeline.stages.map(s => s.total), 1)
    : 1

  return (
    <>
      <style>{'@import url(\'https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap\')'}</style>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ width: 3, height: 22, background: C.ribbon, borderRadius: 2 }} />
          <h1 style={{
            fontFamily: 'Oswald,sans-serif',
            fontSize: 20, fontWeight: 600,
            color: C.textHi,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            Analytics
          </h1>
        </div>
        <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo, paddingLeft: 11 }}>
          Conversion pipeline &amp; taux de closing
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 8, paddingLeft: 11, flexWrap: 'wrap' }}>
          <LinkChip href="/revenue" label="Revenue" color="gold" />
          <LinkChip href="/pipeline" label="Pipeline" color="indigo" />
          <LinkChip href="/crm" label="CRM" color="gold" />
          <LinkChip href="/donnees" label="Historique" color="cyan" />
        </div>
      </div>

      {/* Etat de chargement */}
      {loading && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: 200, color: C.textLo, fontSize: 13,
          fontFamily: 'JetBrains Mono,monospace',
        }}>
          Chargement des donnees analytics...
        </div>
      )}

      {/* Etat d'erreur */}
      {error && (
        <div style={{
          background: '#1f0d0d',
          border: `1px solid ${C.warn}`,
          borderRadius: 8,
          padding: '12px 16px',
          color: C.warn,
          fontSize: 12,
          fontFamily: 'JetBrains Mono,monospace',
          marginBottom: 16,
        }}>
          Erreur : {error}
        </div>
      )}

      {/* Contenu principal (rendu si donnees disponibles) */}
      {!loading && !error && closing && pipeline && (
        <>
          {/* Section 1 : KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
            {/* Total prospects */}
            <div style={{
              background: C.surface1,
              border: `1px solid ${C.line}`,
              borderRadius: 10,
              padding: '14px 16px',
            }}>
              <div style={{ fontSize: 10, color: C.textLo, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'JetBrains Mono,monospace' }}>
                Total prospects
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: C.textHi, fontFamily: 'Oswald,sans-serif' }}>
                {closing.totalProspects}
              </div>
            </div>

            {/* Convertis */}
            <div style={{
              background: C.surface1,
              border: `1px solid ${C.line}`,
              borderRadius: 10,
              padding: '14px 16px',
            }}>
              <div style={{ fontSize: 10, color: C.textLo, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'JetBrains Mono,monospace' }}>
                Convertis
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: C.green, fontFamily: 'Oswald,sans-serif' }}>
                {closing.convertedTotal}
              </div>
            </div>

            {/* Perdus */}
            <div style={{
              background: C.surface1,
              border: `1px solid ${C.line}`,
              borderRadius: 10,
              padding: '14px 16px',
            }}>
              <div style={{ fontSize: 10, color: C.textLo, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'JetBrains Mono,monospace' }}>
                Perdus
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: C.warn, fontFamily: 'Oswald,sans-serif' }}>
                {closing.lostTotal}
              </div>
            </div>

            {/* Taux de closing global */}
            <div
              onClick={() => router.push('/pipeline')}
              style={{
                background: C.surface1,
                border: `1px solid ${C.line}`,
                borderRadius: 10,
                padding: '14px 16px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = C.surface2
                e.currentTarget.style.borderColor = C.gold
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = C.surface1
                e.currentTarget.style.borderColor = C.line
              }}
            >
              <div style={{ fontSize: 10, color: C.textLo, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'JetBrains Mono,monospace' }}>
                Taux de closing global →
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: C.gold, fontFamily: 'Oswald,sans-serif' }}>
                {closing.globalClosingRate}%
              </div>
              <div style={{ fontSize: 9, color: C.textLo, marginTop: 4, fontFamily: 'JetBrains Mono,monospace' }}>
                convertis / (convertis + perdus)
              </div>
            </div>
          </div>

          {/* Section 2 : Conversion par etape pipeline (DATA-08) */}
          <div style={{
            background: C.surface1,
            border: `1px solid ${C.line}`,
            borderRadius: 10,
            padding: '14px 16px',
            marginBottom: 20,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: C.textHi,
              marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1,
              fontFamily: 'Oswald,sans-serif',
            }}>
              Conversion par etape pipeline
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pipeline.stages.map(stage => {
                const stageColor = STAGE_COLORS[stage.stage] ?? C.indigo
                const widthPct = (stage.total / maxTotal) * 100
                return (
                  <div
                    key={stage.stage}
                    onClick={() => router.push(`/crm?stage=${stage.stage}`)}
                    style={{
                      cursor: 'pointer',
                      padding: '6px 8px',
                      borderRadius: 6,
                      transition: 'background 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = C.surface2
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: C.textHi, fontFamily: 'Inter,sans-serif' }}>
                        {stage.label} →
                      </span>
                      <span style={{ fontSize: 10, color: C.textLo, fontFamily: 'JetBrains Mono,monospace' }}>
                        {stage.total} prospect{stage.total !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        flex: 1,
                        height: 24,
                        background: C.surface3,
                        borderRadius: 4,
                        overflow: 'hidden',
                        position: 'relative',
                      }}>
                        <div style={{
                          width: `${widthPct}%`,
                          height: '100%',
                          background: stageColor + '40',
                          borderRadius: 4,
                          minWidth: widthPct > 0 ? 4 : 0,
                          transition: 'width 0.3s ease',
                        }} />
                      </div>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: stageColor,
                        fontFamily: 'JetBrains Mono,monospace',
                        width: 40,
                        textAlign: 'right',
                        flexShrink: 0,
                      }}>
                        {stage.conversion_rate_pct}%
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Section 3 : Closing par produit (DATA-09) - PieChart Recharts */}
          <div style={{
            background: C.surface1,
            border: `1px solid ${C.line}`,
            borderRadius: 10,
            padding: '14px 16px',
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: C.textHi,
              marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1,
              fontFamily: 'Oswald,sans-serif',
            }}>
              Closing par produit
            </div>
            <div style={{ fontSize: 9, color: C.textLo, marginBottom: 14, fontFamily: 'JetBrains Mono,monospace' }}>
              Mix des conversions par produit (v1)
            </div>

            {closing.byProduct.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 0',
                color: C.textLo,
                fontSize: 12,
                fontFamily: 'JetBrains Mono,monospace',
              }}>
                Aucune conversion enregistree.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={closing.byProduct}
                    dataKey="converted"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={50}
                    onClick={(data) => {
                      router.push('/revenue')
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {closing.byProduct.map((p) => (
                      <Cell key={p.type} fill={p.color} style={{ cursor: 'pointer' }} />
                    ))}
                  </Pie>
                  <Tooltip content={<ClosingTooltip />} />
                  <Legend
                    formatter={(value) => (
                      <span style={{ color: C.textMid, fontSize: 11 }}>{value} →</span>
                    )}
                    onClick={() => router.push('/revenue')}
                    wrapperStyle={{ cursor: 'pointer' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}
    </>
  )
}
