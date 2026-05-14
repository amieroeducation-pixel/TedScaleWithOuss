'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Toaster } from 'sonner'
import Script from 'next/script'
import { AchievementsProvider } from '@/components/achievements/AchievementsProvider'

const NAV_SECTIONS = [
  {
    label: 'Principal',
    items: [
      { id: 'global', href: '/global', label: 'Global' },
      { id: 'today', href: '/today', label: "Aujourd'hui" },
      { id: 'weekly', href: '/dashboard', label: 'Vue hebdo' },
      { id: 'revenue', href: '/revenue', label: 'Revenue' },
      { id: 'achievements', href: '/achievements', label: '🏆 Champions' },
      { id: 'pipeline', href: '/pipeline', label: 'Pipeline' },
      { id: 'tasks', href: '/tasks', label: 'Tâches', badge: 5 },
    ],
  },
  {
    label: 'Clients',
    items: [
      { id: 'crm', href: '/crm', label: 'CRM Kanban' },
      { id: 'clients', href: '/clients', label: 'Premium' },
      { id: 'cercle', href: '/cercle', label: 'Cercle' },
    ],
  },
  {
    label: 'Acquisition',
    items: [
      { id: 'map', href: '/map', label: 'Carte TNS' },
      { id: 'tns', href: '/prospection/tns', label: 'Prospection TNS' },
      { id: 'chefs', href: '/prospection/chefs-entreprise', label: "Chefs d'entreprise", badge: 8 },
      { id: 'particuliers', href: '/prospection/particuliers', label: 'Particuliers' },
    ],
  },
  {
    label: 'Outils',
    items: [
      { id: 'sequences', href: '/sequences', label: 'Séquences' },
      { id: 'simulator', href: '/simulator', label: 'Simulateur' },
      { id: 'commerce', href: '/commerce', label: 'Commerce' },
      { id: 'auto', href: '/automatisations', label: 'Automatisations' },
    ],
  },
  {
    label: 'Pilotage',
    items: [
      { id: 'analytics', href: '/analytics', label: '📊 Analytics' },
      { id: 'assistant', href: '/assistant', label: '🤖 Assistant' },
      { id: 'settings', href: '/settings', label: '⚙️ Paramètres' },
      { id: 'scoring', href: '/scoring', label: 'Scoring patrimonial' },
    ],
  },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [recentCount, setRecentCount] = useState<number>(0)

  useEffect(() => {
    fetch('/api/achievements')
      .then(r => r.json())
      .then(({ data }) => {
        const achievements = data?.achievements ?? []
        const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
        const recent = achievements.filter((a: { achieved_at: string }) =>
          new Date(a.achieved_at).getTime() > cutoff
        )
        setRecentCount(recent.length)
      })
      .catch(() => {})
  }, [])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0a; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: #c9a84c; }
      `}</style>

      <div style={{
        display: 'flex',
        background: '#0a0a0a',
        minHeight: '100vh',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}>

        {/* SIDEBAR */}
        <aside style={{
          width: 185,
          background: '#0f0f0f',
          borderRight: '0.5px solid #1a1a1a',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
          zIndex: 10,
        }}>

          {/* Logo */}
          <div style={{
            padding: '16px 14px',
            borderBottom: '0.5px solid #1a1a1a',
          }}>
            <div style={{
              fontSize: 12,
              fontWeight: 500,
              color: '#c9a84c',
              letterSpacing: '0.05em',
              fontFamily: 'Oswald, sans-serif',
            }}>
              CGP Dashboard
            </div>
            <div style={{
              fontSize: 9,
              color: '#333',
              marginTop: 2,
              fontFamily: 'JetBrains Mono, monospace',
            }}>
              Gestion Patrimoniale
            </div>
          </div>

          {/* Navigation */}
          <nav style={{ padding: '8px 0', flex: 1, overflowY: 'auto' }}>
            {NAV_SECTIONS.map((section) => (
              <div key={section.label}>
                <div style={{
                  fontSize: 8,
                  color: '#2a2a2a',
                  padding: '8px 12px 3px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontFamily: 'JetBrains Mono, monospace',
                }}>
                  {section.label}
                </div>
                {section.items.map((item) => {
                  const isActive = pathname === item.href ||
                    (item.href !== '/dashboard' && pathname.startsWith(item.href))
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '5px 12px',
                        fontSize: 10,
                        color: isActive ? '#c9a84c' : '#444',
                        textDecoration: 'none',
                        borderLeft: isActive ? '2px solid #c9a84c' : '2px solid transparent',
                        background: isActive ? 'rgba(201,168,76,0.06)' : 'transparent',
                        position: 'relative',
                      }}
                    >
                      <span style={{
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        background: isActive ? '#c9a84c' : 'currentColor',
                        flexShrink: 0,
                        display: 'inline-block',
                      }} />
                      <span style={{ flex: 1 }}>{item.label}</span>
                      {item.badge && item.id !== 'achievements' && (
                        <span style={{
                          minWidth: 16,
                          height: 16,
                          background: '#4a8ac9',
                          color: '#fff',
                          borderRadius: 8,
                          fontSize: 8,
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0 4px',
                          boxShadow: '0 2px 6px rgba(74,138,201,0.5)',
                        }}>
                          {item.badge}
                        </span>
                      )}
                      {item.id === 'achievements' && recentCount > 0 && (
                        <span style={{
                          minWidth: 16,
                          height: 16,
                          background: '#c9a84c',
                          color: '#0a0a0a',
                          borderRadius: 8,
                          fontSize: 8,
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0 4px',
                        }}>
                          {recentCount}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            ))}
          </nav>
        </aside>

        {/* MAIN */}
        <main style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}>

          {/* Search bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 14px',
            borderBottom: '0.5px solid #1a1a1a',
            background: '#0d0d0d',
          }}>
            <input
              type="text"
              placeholder="🔍 Rechercher prospect, client, tâche, séquence..."
              style={{
                flex: 1,
                background: '#141414',
                border: '0.5px solid #2a2a2a',
                borderRadius: 6,
                padding: '7px 12px',
                color: '#e8e8e8',
                fontSize: 10,
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />
          </div>

          {/* Page content */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 14px',
          }}>
            {children}
          </div>
        </main>
      </div>

      <AchievementsProvider />
      <Toaster theme="dark" position="bottom-right" richColors />
      <Script src="/celebrations.js" strategy="lazyOnload" />
    </>
  )
}
