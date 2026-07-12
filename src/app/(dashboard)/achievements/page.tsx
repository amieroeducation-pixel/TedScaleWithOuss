'use client'

import { useEffect, useState } from 'react'
import { C } from '@/lib/theme'
import { LinkButton, LinkChip } from '@/lib/cross-links'
import type { Achievement } from '@/types/achievements'

const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  ca_monthly: {
    icon: '🏆',
    color: C.green,
    bg: 'rgba(74,222,128,0.1)',
  },
  clients_milestone: {
    icon: '👥',
    color: C.warn,
    bg: 'rgba(216,136,74,0.1)',
  },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function isRecent(iso: string): boolean {
  const diff = Date.now() - new Date(iso).getTime()
  return diff < 7 * 24 * 60 * 60 * 1000
}

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/achievements')
      .then(r => r.json())
      .then(({ data }) => {
        setAchievements(data?.achievements ?? [])
      })
      .catch(() => setAchievements([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 0' }}>
      {/* En-tête */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontFamily: "'Oswald', sans-serif",
          fontSize: 28,
          fontWeight: 600,
          color: C.gold,
          letterSpacing: '0.04em',
          textShadow: '0 0 20px rgba(232,200,120,0.3)',
          marginBottom: 6,
        }}>
          Mes Succès
        </h1>
        <p style={{ fontSize: 13, color: C.textMid }}>
          {achievements.length > 0
            ? `${achievements.length} objectif${achievements.length > 1 ? 's' : ''} atteint${achievements.length > 1 ? 's' : ''}`
            : 'Vos badges et célébrations apparaîtront ici'}
        </p>
      </div>

      {/* État chargement */}
      {loading && (
        <div style={{ color: C.textMid, fontSize: 13, padding: '40px 0', textAlign: 'center' }}>
          Chargement...
        </div>
      )}

      {/* État vide */}
      {!loading && achievements.length === 0 && (
        <div style={{
          background: C.surface1,
          border: `1px solid ${C.line}`,
          borderRadius: 12,
          padding: '48px 24px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
          <div style={{ fontSize: 15, color: C.textHi, fontWeight: 500, marginBottom: 8 }}>
            Aucun badge encore débloqué
          </div>
          <div style={{ fontSize: 12, color: C.textMid }}>
            Atteignez votre objectif CA mensuel ou ajoutez 10 clients pour débloquer votre premier badge.
          </div>
        </div>
      )}

      {/* Timeline */}
      {!loading && achievements.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {achievements.map((a) => {
            const cfg = TYPE_CONFIG[a.achievement_type] ?? TYPE_CONFIG.ca_monthly
            const recent = isRecent(a.achieved_at)
            return (
              <div
                key={a.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 16,
                  background: C.surface1,
                  border: `1px solid ${recent ? cfg.color : C.line}`,
                  borderRadius: 10,
                  padding: '16px 20px',
                  position: 'relative',
                  boxShadow: recent ? `0 0 12px ${cfg.color}22` : 'none',
                  transition: 'border-color 0.2s',
                }}
              >
                {/* Icône */}
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: cfg.bg,
                  border: `1px solid ${cfg.color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  flexShrink: 0,
                }}>
                  {cfg.icon}
                </div>

                {/* Contenu */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: C.textHi,
                      fontFamily: "'Oswald', sans-serif",
                      letterSpacing: '0.02em',
                    }}>
                      {a.label}
                    </span>
                    {recent && (
                      <span style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: cfg.color,
                        background: cfg.bg,
                        border: `1px solid ${cfg.color}`,
                        borderRadius: 4,
                        padding: '1px 6px',
                        letterSpacing: '0.08em',
                        fontFamily: "'JetBrains Mono', monospace",
                        textTransform: 'uppercase',
                      }}>
                        Nouveau
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: C.textMid }}>
                    {formatDate(a.achieved_at)}
                    {a.value != null && a.target != null && (
                      <span style={{ marginLeft: 12, color: C.textLo }}>
                        {a.achievement_type === 'ca_monthly'
                          ? `${a.value.toLocaleString('fr-FR')} € / ${a.target.toLocaleString('fr-FR')} €`
                          : `${a.value} / ${a.target} clients`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {/* Navigation transversale — Progression */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 32, paddingTop: 20, borderTop: `1px solid ${C.gold}20` }}>
        <LinkButton href="/dashboard" label="Dashboard" color="gold" />
        <LinkButton href="/global" label="Global" color="cyan" />
        <LinkButton href="/today" label="Aujourd'hui" color="green" />
        <LinkChip href="/commerce" label="Commerce" color="indigo" />
        <LinkChip href="/donnees" label="Données" color="purple" />
      </div>
    </div>
  )
}
