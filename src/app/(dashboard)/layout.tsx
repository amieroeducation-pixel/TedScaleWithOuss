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

function StarballSVG() {
  const starPath = (cx: number, cy: number, R: number): string => {
    const r = R * 0.38
    let d = ''
    for (let k = 0; k < 5; k++) {
      const oa = ((k * 72 - 90) * Math.PI) / 180
      const ia = ((k * 72 - 54) * Math.PI) / 180
      d += (k === 0 ? 'M' : 'L') + (cx + R * Math.cos(oa)).toFixed(2) + ',' + (cy + R * Math.sin(oa)).toFixed(2)
      d += 'L' + (cx + r * Math.cos(ia)).toFixed(2) + ',' + (cy + r * Math.sin(ia)).toFixed(2)
    }
    return d + 'Z'
  }

  const stars: Array<{ cx: number; cy: number; R: number; color: string; opacity: number }> = [
    { cx: 18, cy: 5,  R: 2.9, color: '#ffffff', opacity: 0.95 },
    { cx: 27, cy: 9,  R: 2.2, color: '#e8c878', opacity: 0.85 },
    { cx: 31, cy: 18, R: 2.5, color: '#ffffff', opacity: 0.90 },
    { cx: 27, cy: 27, R: 2.2, color: '#e8c878', opacity: 0.85 },
    { cx: 18, cy: 31, R: 2.9, color: '#ffffff', opacity: 0.95 },
    { cx: 9,  cy: 27, R: 2.2, color: '#e8c878', opacity: 0.85 },
    { cx: 5,  cy: 18, R: 2.5, color: '#ffffff', opacity: 0.90 },
    { cx: 9,  cy: 9,  R: 2.2, color: '#e8c878', opacity: 0.85 },
    { cx: 18, cy: 18, R: 4.5, color: '#ffffff', opacity: 1.00 },
  ]

  return (
    <svg
      width={36}
      height={36}
      viewBox="0 0 36 36"
      fill="none"
      style={{ filter: 'drop-shadow(0 0 8px rgba(232,200,120,0.55))', flexShrink: 0 }}
    >
      <circle cx={18} cy={18} r={16.5} fill="#0a0e22" fillOpacity={0.85} stroke="#3a4690" strokeWidth={0.5} />
      {stars.map((s, i) => (
        <path key={i} d={starPath(s.cx, s.cy, s.R)} fill={s.color} fillOpacity={s.opacity} />
      ))}
    </svg>
  )
}

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
        }}>

          {/* Prismatic ribbon top */}
          <div style={{ height: 2, background: ribbon, flexShrink: 0 }} />

          {/* Logo area */}
          <div style={{
            padding: '14px 14px 12px',
            borderBottom: '1px solid #3a4690',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexShrink: 0,
          }}>
            <StarballSVG />
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
          <nav style={{ padding: '4px 0', flex: 1, overflow: 'hidden' }}>
            {NAV_SECTIONS.map((section) => (
              <div key={section.label}>
                <div style={{
                  fontSize: 8,
                  color: '#3a4885',
                  padding: '7px 12px 2px',
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
                        gap: 7,
                        padding: '4px 12px',
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
            padding: '12px 14px',
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
