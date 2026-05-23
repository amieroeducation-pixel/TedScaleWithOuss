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
      { id: 'playbooks', href: '/playbooks', label: '⚡ Playbooks' },
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

const ribbon = 'linear-gradient(90deg,#c84048 0%,#ff6470 25%,#f5e8c8 55%,#7a92e8 80%,#5c70b8 100%)'

const _UNUSED = 'data:image/png;base64,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'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [search, setSearch] = useState('')
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
      .catch(() => {/* silencieux */})
  }, [])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0e22; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #3a4690; border-radius: 2px; }
      `}</style>

      <div style={{
        display: 'flex',
        background: 'linear-gradient(180deg,#0a0e22 0%,#14193d 50%,#0a0e22 100%)',
        minHeight: '100vh',
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Radial overlays on main bg */}
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: [
            'radial-gradient(ellipse 1200px 600px at 50% -10%,rgba(200,64,72,0.45),transparent 55%)',
            'radial-gradient(ellipse 900px 500px at 85% 110%,rgba(92,112,184,0.35),transparent 60%)',
          ].join(','),
        }} />

        {/* Star field */}
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          {[
            { top: '8%', left: '22%', size: 2 }, { top: '15%', left: '55%', size: 1.5 },
            { top: '23%', left: '78%', size: 1 }, { top: '31%', left: '12%', size: 1.5 },
            { top: '42%', left: '67%', size: 2 }, { top: '51%', left: '38%', size: 1 },
            { top: '60%', left: '88%', size: 1.5 }, { top: '70%', left: '5%', size: 1 },
            { top: '77%', left: '48%', size: 2 }, { top: '85%', left: '72%', size: 1 },
            { top: '91%', left: '30%', size: 1.5 }, { top: '5%', left: '92%', size: 1 },
            { top: '37%', left: '92%', size: 1.5 }, { top: '65%', left: '58%', size: 1 },
          ].map((s, i) => (
            <div key={i} style={{
              position: 'absolute', top: s.top, left: s.left,
              width: s.size, height: s.size, borderRadius: '50%',
              background: 'radial-gradient(circle,rgba(255,255,255,0.9),rgba(122,146,232,0.4))',
              filter: 'blur(0.3px)',
            }} />
          ))}
        </div>

        {/* SIDEBAR */}
        <aside style={{
          width: 185,
          background: 'linear-gradient(180deg,rgba(8,18,74,0.96),rgba(4,8,31,0.99))',
          borderRight: '1px solid #3a4690',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          position: 'fixed',
          left: 0,
          top: 0,
          height: '100vh',
          zIndex: 10,
          overflowY: 'auto',
        }}>

          {/* Prismatic ribbon top */}
          <div style={{ height: 2, background: ribbon, flexShrink: 0 }} />

          {/* Logo area */}
          <div style={{
            padding: '10px 12px 8px',
            borderBottom: '1px solid #3a4690',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexShrink: 0,
          }}>
            <img
              src="/ucl-logo.png"
              width={34}
              height={34}
              alt="Champions League"
              style={{ flexShrink: 0, filter: 'drop-shadow(0 0 6px rgba(232,200,120,0.45))' }}
            />
            <div>
              <div style={{
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 600,
                fontSize: 13,
                color: '#e8c878',
                letterSpacing: '0.04em',
                lineHeight: 1.1,
                textShadow: '0 0 12px rgba(232,200,120,0.4)',
              }}>
                Champion&apos;s
              </div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 8,
                color: '#5a6ba8',
                marginTop: 2,
                letterSpacing: '0.06em',
              }}>
                CGP Dashboard
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav style={{ padding: '2px 0', flex: 1 }}>
            {NAV_SECTIONS.map((section) => (
              <div key={section.label}>
                <div style={{
                  fontSize: 7,
                  color: '#3a4885',
                  padding: '5px 10px 1px',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 600,
                }}>
                  {section.label}
                </div>
                {section.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/dashboard' && pathname.startsWith(item.href))
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '3px 10px',
                        fontSize: 11,
                        fontWeight: isActive ? 500 : 400,
                        color: isActive ? '#ffe89a' : 'rgba(255,216,102,0.65)',
                        textDecoration: 'none',
                        borderLeft: isActive ? '2px solid #ff6470' : '2px solid transparent',
                        background: isActive
                          ? 'linear-gradient(90deg,rgba(200,64,72,0.22),transparent 70%)'
                          : 'transparent',
                        transition: 'all 0.15s ease',
                        position: 'relative',
                      }}
                    >
                      <span style={{
                        width: 3,
                        height: 3,
                        borderRadius: '50%',
                        background: isActive ? '#ff6470' : 'rgba(255,216,102,0.4)',
                        flexShrink: 0,
                        display: 'inline-block',
                        boxShadow: isActive ? '0 0 6px rgba(255,100,112,0.7)' : 'none',
                      }} />
                      <span style={{ flex: 1 }}>{item.label}</span>
                      {/* Badge statique (tâches, prospects) */}
                      {item.badge && item.id !== 'achievements' && (
                        <span style={{
                          minWidth: 16,
                          height: 16,
                          background: ribbon,
                          color: '#0a0e22',
                          borderRadius: 8,
                          fontSize: 8,
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0 4px',
                          fontFamily: "'JetBrains Mono', monospace",
                          boxShadow: '0 2px 8px rgba(200,64,72,0.45)',
                        }}>
                          {item.badge}
                        </span>
                      )}
                      {/* Badge dynamique achievements */}
                      {item.id === 'achievements' && recentCount > 0 && (
                        <span style={{
                          minWidth: 16,
                          height: 16,
                          background: '#e8c878',
                          color: '#0a0e22',
                          borderRadius: 8,
                          fontSize: 8,
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0 4px',
                          fontFamily: "'JetBrains Mono', monospace",
                          boxShadow: '0 2px 8px rgba(232,200,120,0.5)',
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

          {/* User avatar at bottom */}
          <div style={{
            padding: '8px 12px',
            borderTop: '1px solid #3a4690',
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            flexShrink: 0,
          }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'linear-gradient(135deg,#c84048,#7a92e8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 600,
              fontSize: 11,
              color: '#fff',
              letterSpacing: '0.04em',
              flexShrink: 0,
              boxShadow: '0 0 10px rgba(200,64,72,0.4)',
            }}>
              TK
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 500,
                fontSize: 11,
                color: '#d8e1ff',
                letterSpacing: '0.03em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                Ted K.
              </div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 8,
                color: '#5a6ba8',
                marginTop: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                CGP Manager
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          position: 'relative',
          zIndex: 1,
          marginLeft: 185,
        }}>

          {/* Prismatic ribbon at very top */}
          <div style={{ height: 2, background: ribbon, flexShrink: 0 }} />

          {/* Top bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 20px',
            borderBottom: '1px solid #3a4690',
            background: 'rgba(17,22,58,0.95)',
            position: 'sticky',
            top: 0,
            zIndex: 50,
            backdropFilter: 'blur(8px)',
            flexShrink: 0,
          }}>
            {/* Branding */}
            <div style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 600,
              fontSize: 14,
              color: '#e8c878',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              textShadow: '0 0 12px rgba(232,200,120,0.35)',
              flexShrink: 0,
            }}>
              CGP <span style={{ color: '#ff6470' }}>·</span> Dashboard
            </div>

            <div style={{
              width: 1,
              height: 18,
              background: '#3a4690',
              flexShrink: 0,
            }} />

            {/* Search input */}
            <div style={{ flex: 1, position: 'relative', maxWidth: 560 }}>
              <span style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#5a6ba8',
                fontSize: 12,
                pointerEvents: 'none',
              }}>
                ⌕
              </span>
              <input
                type="text"
                placeholder="Rechercher prospect, client, tâche, séquence…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(26,33,80,0.7)',
                  border: '1px solid #3a4690',
                  borderRadius: 6,
                  padding: '5px 10px 5px 28px',
                  fontSize: 11,
                  color: '#d8e1ff',
                  fontFamily: "Inter, sans-serif",
                  outline: 'none',
                  caretColor: '#ff6470',
                }}
              />
            </div>

            <div style={{ flex: 1 }} />

            {/* Status pill */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 10px',
              background: 'rgba(26,33,80,0.8)',
              border: '1px solid #3a4690',
              borderRadius: 20,
              flexShrink: 0,
            }}>
              <div style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#ff6470',
                boxShadow: '0 0 6px rgba(255,100,112,0.8)',
              }} />
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9,
                color: '#8ea0d9',
                letterSpacing: '0.06em',
              }}>
                LIVE
              </span>
            </div>
          </div>

          {/* Page content */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
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
