'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { C } from '@/lib/theme'

// ─── TYPES ────────────────────────────────────────────────────────────────────
type ClientRow = {
  id: string
  full_name: string
  profession: string | null
  city: string | null
  phone: string | null
  email: string | null
  total_aum: number
  last_interaction_at: string | null
  days_without_contact: number | null
  alert_threshold_days: number
  pipeline_stage: string | null
  tags: string[]
}

type HealthAlert = {
  client_id: string
  full_name: string
  days_without_contact: number
  alert_threshold_days: number
  total_aum: number
  severity: 'warning' | 'critical'
}

type ClientsResp = { clients: ClientRow[]; count: number; totalAum: number }
type HealthResp = { alerts: HealthAlert[]; count: number; criticalCount: number }

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function alertColor(days: number | null, threshold: number): string {
  if (days === null) return C.textLo
  if (days >= threshold * 1.5) return C.warn
  if (days >= threshold) return C.gold
  if (days >= threshold * 0.5) return C.indigo
  return C.green
}

function formatAUM(v: number) {
  if (v >= 1000000) return `${(v / 1000000).toFixed(2)} M€`
  if (v === 0) return '—'
  return `${(v / 1000).toFixed(0)} k€`
}

function formatDays(days: number | null): string {
  if (days === null) return 'Jamais'
  if (days === 0) return "Aujourd'hui"
  if (days === 1) return 'Hier'
  return `il y a ${days}j`
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────
function Panel({ children, style, onClick }: { children: React.ReactNode; style?: React.CSSProperties; onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{
      background: `linear-gradient(180deg,${C.surface1},${C.bgMid})`,
      border: `1px solid ${C.line}`,
      borderRadius: 12, padding: 16,
      position: 'relative', overflow: 'hidden',
      ...style,
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,#ff647055,transparent)' }} />
      {children}
    </div>
  )
}

function PanelTitle({ title, accent = C.cyan }: { title: string; accent?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
      <span style={{ width: 6, height: 6, background: accent, transform: 'rotate(45deg)', display: 'inline-block', flexShrink: 0 }} />
      <span style={{ fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 500, color: C.textHi, textTransform: 'uppercase', letterSpacing: '0.16em' }}>{title}</span>
    </div>
  )
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function ClientsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sortParam = searchParams.get('sort') as 'aum' | 'days' | 'name' | null
  const [clientsResp, setClientsResp] = useState<ClientsResp | null>(null)
  const [healthResp, setHealthResp] = useState<HealthResp | null>(null)
  const [contactModal, setContactModal] = useState<{ clientId: string; name: string } | null>(null)
  const [contactChannel, setContactChannel] = useState<'appel' | 'sms' | 'email'>('appel')
  const [contactNotes, setContactNotes] = useState('')
  const [contactSaving, setContactSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'aum' | 'days' | 'name'>(sortParam || 'days')

  useEffect(() => {
    Promise.all([
      fetch('/api/clients/list').then(r => r.json()),
      fetch('/api/clients/health').then(r => r.json()),
    ])
      .then(([listJson, healthJson]) => {
        if (listJson.error) { setError(listJson.error); return }
        if (healthJson.error) { setError(healthJson.error); return }
        setClientsResp(listJson.data as ClientsResp)
        setHealthResp(healthJson.data as HealthResp)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 11, color: C.textLo }}>
          Chargement des clients...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        padding: '16px 20px', borderRadius: 10,
        background: `${C.warn}10`, border: `1px solid ${C.warn}44`,
        fontFamily: 'JetBrains Mono,monospace', fontSize: 11, color: C.warn,
      }}>
        Erreur : {error}
      </div>
    )
  }

  const clients = clientsResp?.clients ?? []
  const alerts = healthResp?.alerts ?? []
  const totalAum = clientsResp?.totalAum ?? 0
  const criticalCount = healthResp?.criticalCount ?? 0

  const sorted = [...clients]
    .filter(c => !search || c.full_name.toLowerCase().includes(search.toLowerCase()) || (c.profession ?? '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'aum') return b.total_aum - a.total_aum
      if (sort === 'days') return (b.days_without_contact ?? 999) - (a.days_without_contact ?? 999)
      return a.full_name.localeCompare(b.full_name)
    })

  return (
    <>
      <style>{'@import url(\'https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap\')'}</style>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 3, height: 24, background: C.ribbon, borderRadius: 2 }} />
          <h1 style={{ fontFamily: 'Oswald,sans-serif', fontSize: 22, fontWeight: 600, color: C.textHi, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Clients <span style={{ color: C.gold }}>Portefeuille</span>
          </h1>
        </div>
        <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: C.textLo, paddingLeft: 13 }}>
          Suivi portefeuille — alertes contacts, AUM, santé client
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        <Panel style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => router.push('/crm?stage=converti')}>
          <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo, textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.1em' }}>Clients actifs</div>
          <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 26, fontWeight: 700, color: C.textHi, lineHeight: 1 }}>{clientsResp?.count ?? 0} →</div>
        </Panel>
        <Panel style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => router.push('/revenue')}>
          <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo, textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.1em' }}>AUM total</div>
          <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 26, fontWeight: 700, color: C.gold, lineHeight: 1 }}>{totalAum.toLocaleString('fr-FR')} € →</div>
        </Panel>
        <Panel style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo, textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.1em' }}>Alertes santé</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 26, fontWeight: 700, color: healthResp?.count ? C.warn : C.green, lineHeight: 1 }}>{healthResp?.count ?? 0}</div>
            {criticalCount > 0 && (
              <span style={{
                fontSize: 9, padding: '2px 7px', borderRadius: 8,
                background: `${C.warn}22`, color: C.warn, fontWeight: 700,
              }}>{criticalCount} critique{criticalCount > 1 ? 's' : ''}</span>
            )}
          </div>
        </Panel>
      </div>

      {/* Section alertes Client Health */}
      {alerts.length > 0 && (
        <Panel style={{ marginBottom: 20 }}>
          <PanelTitle title="Alertes Client Health — Sans contact depuis trop longtemps" accent={C.warn} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {alerts.map((a) => (
              <div key={a.client_id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 8,
                background: a.severity === 'critical' ? `${C.warn}10` : `${C.gold}08`,
                border: `0.5px solid ${a.severity === 'critical' ? C.warn + '60' : C.gold + '40'}`,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.textHi }}>{a.full_name}</div>
                  <div style={{ fontSize: 10, color: C.textLo, marginTop: 2 }}>
                    Seuil : {a.alert_threshold_days}j
                  </div>
                </div>
                <div onClick={() => router.push('/today?tab=relances')} style={{ textAlign: 'right', flexShrink: 0, cursor: 'pointer' }}>
                  <div style={{
                    fontSize: 13, fontWeight: 700,
                    color: a.severity === 'critical' ? C.warn : C.gold,
                  }}>
                    {a.days_without_contact}j sans contact →
                  </div>
                  <div onClick={(e) => { e.stopPropagation(); router.push('/revenue') }} style={{ fontSize: 10, color: C.textLo, marginTop: 2, cursor: 'pointer' }}>
                    AUM : {formatAUM(a.total_aum)} →
                  </div>
                </div>
                <button
                  onClick={() => setContactModal({ clientId: a.client_id, name: a.full_name })}
                  style={{
                    fontSize: 10, padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
                    border: `1px solid ${a.severity === 'critical' ? C.warn + '44' : C.gold + '44'}`,
                    background: a.severity === 'critical' ? `${C.warn}15` : `${C.gold}15`,
                    color: a.severity === 'critical' ? C.warn : C.gold,
                    fontWeight: 600, flexShrink: 0,
                  }}
                >
                  Contacter
                </button>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Section tous les clients */}
      {clients.length === 0 ? (
        <Panel>
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>👥</div>
            <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 16, color: C.textHi, marginBottom: 8 }}>
              Aucun client encore
            </div>
            <div style={{ fontSize: 12, color: C.textLo, marginBottom: 16 }}>
              Convertis ton premier prospect depuis le Kanban CRM.
            </div>
            <a
              href="/crm"
              style={{
                display: 'inline-block', padding: '8px 20px', borderRadius: 8,
                background: `${C.gold}15`, border: `1px solid ${C.gold}44`,
                color: C.gold, fontWeight: 600, fontSize: 12, textDecoration: 'none',
              }}
            >
              Aller au Kanban CRM →
            </a>
          </div>
        </Panel>
      ) : (
        <Panel>
          <PanelTitle title="Tous les clients" accent={C.gold} />

          {/* Toolbar */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <input
              placeholder="Rechercher client..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                flex: 1, padding: '7px 12px', borderRadius: 7, fontSize: 11,
                background: C.surface2, border: `1px solid ${C.line}`,
                color: C.textHi, outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              {([['days', 'Dernier contact'], ['aum', 'AUM'], ['name', 'Nom']] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSort(key)}
                  style={{
                    fontSize: 10, padding: '5px 10px', borderRadius: 5, cursor: 'pointer',
                    border: sort === key ? `1px solid ${C.gold}` : `1px solid ${C.line}`,
                    background: sort === key ? `${C.gold}15` : C.surface1,
                    color: sort === key ? C.gold : C.textLo,
                    fontFamily: 'Oswald,sans-serif', letterSpacing: '0.06em',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.8fr 1fr 0.8fr 1fr 1fr 0.6fr',
            gap: 8, padding: '7px 12px',
            background: C.surface1, borderRadius: '6px 6px 0 0',
            borderBottom: `1px solid ${C.lineSoft}`,
          }}>
            {['Client', 'Profession', 'Ville', 'AUM', 'Dernier contact', 'Santé'].map(h => (
              <div key={h} style={{ fontSize: 10, color: C.textLo, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>{h}</div>
            ))}
          </div>

          {sorted.map((c, i) => {
            const color = alertColor(c.days_without_contact, c.alert_threshold_days)
            return (
              <div
                key={c.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.8fr 1fr 0.8fr 1fr 1fr 0.6fr',
                  gap: 8, padding: '10px 12px', alignItems: 'center',
                  borderBottom: `1px solid ${C.lineSoft}`,
                  background: i % 2 === 0 ? 'transparent' : C.surface1,
                }}
              >
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{c.full_name}</div>
                  {c.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' as const }}>
                      {c.tags.slice(0, 2).map(tag => (
                        <span key={tag} style={{
                          fontSize: 9, padding: '1px 5px', borderRadius: 3,
                          background: `${C.indigo}22`, color: C.indigo,
                        }}>{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 11, color: C.textMid }}>{c.profession ?? '—'}</div>
                <div style={{ fontSize: 11, color: C.textLo }}>{c.city ?? '—'}</div>
                <div onClick={() => router.push('/revenue')} style={{ fontSize: 12, fontWeight: 700, color: C.gold, cursor: 'pointer' }}>{formatAUM(c.total_aum)}{c.total_aum > 0 ? ' →' : ''}</div>
                <div style={{ fontSize: 11, color }}>
                  {formatDays(c.days_without_contact)}
                </div>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: color, flexShrink: 0,
                  boxShadow: `0 0 6px ${color}66`,
                }} />
              </div>
            )
          })}

          {sorted.length === 0 && search && (
            <div style={{ padding: '20px', textAlign: 'center', fontSize: 11, color: C.textLo }}>
              Aucun client ne correspond à "{search}"
            </div>
          )}
        </Panel>
      )}

      {/* Modal Contacter */}
      {contactModal && (
        <div onClick={() => setContactModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.bgMid, border: `1px solid ${C.indigo}30`, borderRadius: 14, padding: 24, width: '100%', maxWidth: 400, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: C.ribbon, borderRadius: '14px 14px 0 0' }} />
            <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 14, fontWeight: 600, color: C.indigo, marginBottom: 4, marginTop: 4 }}>📞 Contacter {contactModal.name}</div>
            <div style={{ fontSize: 9, color: C.textLo, marginBottom: 16 }}>Logger une interaction avec ce client</div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 8, color: C.textLo, display: 'block', marginBottom: 6 }}>Canal</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['appel', 'sms', 'email'] as const).map(ch => (
                  <button key={ch} onClick={() => setContactChannel(ch)} style={{
                    flex: 1, padding: '8px 0', borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: 'pointer',
                    background: contactChannel === ch ? `${C.indigo}22` : C.surface1,
                    border: `1px solid ${contactChannel === ch ? C.indigo : C.line}`,
                    color: contactChannel === ch ? C.indigo : C.textLo,
                  }}>{ch === 'appel' ? '📞 Appel' : ch === 'sms' ? '💬 SMS' : '✉️ Email'}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 8, color: C.textLo, display: 'block', marginBottom: 5 }}>Notes (optionnel)</label>
              <textarea
                value={contactNotes}
                onChange={e => setContactNotes(e.target.value)}
                placeholder="Résumé de l'échange..."
                rows={3}
                style={{ width: '100%', padding: '8px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textHi, fontSize: 11, resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setContactModal(null); setContactNotes('') }} style={{ flex: 1, padding: 10, borderRadius: 8, background: C.surface1, border: `1px solid ${C.line}`, color: C.textLo, fontFamily: 'Oswald,sans-serif', fontSize: 11, cursor: 'pointer' }}>ANNULER</button>
              <button
                disabled={contactSaving}
                onClick={async () => {
                  setContactSaving(true)
                  try {
                    await fetch('/api/interactions', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ prospect_id: contactModal.clientId, type: contactChannel, notes: contactNotes || null }),
                    })
                    setContactModal(null)
                    setContactNotes('')
                    router.refresh()
                  } catch {}
                  setContactSaving(false)
                }}
                style={{ flex: 2, padding: 10, borderRadius: 8, background: '#0d1a2e', border: `1px solid ${C.indigo}66`, color: C.indigo, fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 600, cursor: contactSaving ? 'not-allowed' : 'pointer', opacity: contactSaving ? 0.6 : 1 }}
              >{contactSaving ? 'ENREGISTREMENT...' : 'LOGGER L\'INTERACTION'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
