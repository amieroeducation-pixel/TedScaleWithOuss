'use client'

import { useState, useEffect } from 'react'
import { C } from '@/lib/theme'
import { LinkButton, LinkChip } from '@/lib/cross-links'

type ThemeId = 'decouverte' | 'prospection' | 'objections' | 'closing'

interface Theme {
  id: ThemeId
  label: string
  icon: string
  color: string
  bg: string
  count: number
  total: number
  pct: number
  desc: string
}

interface Video {
  id: string
  title: string
  duration: string
}

const THEMES: Theme[] = [
  { id: 'decouverte', label: 'Découverte', icon: '🔍', color: C.green, bg: '#0d1a0d', count: 3, total: 10, pct: 30, desc: 'Identifier les besoins clients' },
  { id: 'prospection', label: 'Prospection', icon: '📞', color: C.indigo, bg: '#0d1a2e', count: 5, total: 10, pct: 50, desc: "Techniques d'approche et pitch" },
  { id: 'objections', label: 'Traitement objections', icon: '💬', color: C.gold, bg: '#1a1400', count: 7, total: 10, pct: 70, desc: 'Répondre aux objections courantes' },
  { id: 'closing', label: 'Techniques closing', icon: '🎯', color: '#b07aee', bg: '#140d1e', count: 0, total: 10, pct: 0, desc: 'Conclure et signer' },
]

const VIDEOS: Record<ThemeId, Video[]> = {
  decouverte: [
    { id: 'd1', title: "La méthode SPIN Selling adaptée aux TNS", duration: '12 min' },
    { id: 'd2', title: "Poser les bonnes questions dès le 1er appel", duration: '8 min' },
    { id: 'd3', title: "Identifier les motivations profondes du client", duration: '15 min' },
  ],
  prospection: [
    { id: 'p1', title: "Cold calling : script d'accroche TNS", duration: '10 min' },
    { id: 'p2', title: "LinkedIn outreach pour CGP : les règles d'or", duration: '14 min' },
    { id: 'p3', title: "Pitch 30 secondes par profession cible", duration: '9 min' },
  ],
  objections: [
    { id: 'o1', title: '"J\'ai déjà un conseiller" — 5 réponses efficaces', duration: '11 min' },
    { id: 'o2', title: '"Je n\'ai pas le temps" — rebondir et reformuler', duration: '7 min' },
    { id: 'o3', title: '"C\'est trop cher" — traiter l\'objection prix', duration: '13 min' },
  ],
  closing: [
    { id: 'c1', title: 'Le closing assumptif : technique et exemples', duration: '16 min' },
    { id: 'c2', title: "Créer l'urgence sans pression excessive", duration: '10 min' },
    { id: 'c3', title: "L'alternative choice et autres closes avancés", duration: '12 min' },
  ],
}

function Panel({ children, accent = C.indigo, style }: { children: React.ReactNode; accent?: string; style?: React.CSSProperties }) {
  return (
    <div style={{ background: `linear-gradient(180deg,${C.surface1},${C.bgMid})`, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16, position: 'relative', overflow: 'hidden', ...style }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${accent}88,transparent)` }} />
      {children}
    </div>
  )
}

function PanelTitle({ title, accent = C.indigo }: { title: string; accent?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
      <span style={{ width: 6, height: 6, background: accent, transform: 'rotate(45deg)', display: 'inline-block', boxShadow: `0 0 7px ${accent}`, flexShrink: 0 }} />
      <span style={{ fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 500, color: C.textHi, textTransform: 'uppercase', letterSpacing: '0.16em' }}>{title}</span>
    </div>
  )
}

type ProductRow = { type: string; label: string; montant: number; pct: number; color: string }

export default function CommercePage() {
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>('decouverte')
  const [watchedVideos, setWatchedVideos] = useState<Set<string>>(new Set())
  const [products, setProducts] = useState<ProductRow[]>([])
  const [productTotal, setProductTotal] = useState(0)

  useEffect(() => {
    fetch('/api/revenue/products')
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setProducts(json.data.products)
          setProductTotal(json.data.total)
        }
      })
      .catch(() => {})
    fetch('/api/settings')
      .then(r => r.json())
      .then(json => {
        if (json.success && Array.isArray(json.data?.completed_videos)) {
          setWatchedVideos(new Set(json.data.completed_videos))
        }
      })
      .catch(() => {})
  }, [])

  const theme = THEMES.find(t => t.id === selectedTheme)!
  const videos = VIDEOS[selectedTheme]
  const dailyDone = watchedVideos.size > 0
  const dailyPct = dailyDone ? 100 : 0

  function toggleVideo(id: string) {
    setWatchedVideos(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed_videos: Array.from(next) }),
      }).catch(() => {})
      return next
    })
  }

  function selectTheme(id: ThemeId) {
    setSelectedTheme(id)
    setWatchedVideos(new Set())
  }

  return (
    <>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap')"}</style>

      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 3, height: 24, background: C.ribbon, borderRadius: 2 }} />
          <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 22, fontWeight: 600, color: C.textHi, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            📚 Commer<span style={{ color: C.green }}>ce</span> — E-Learning
          </div>
        </div>
        <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo, paddingLeft: 13 }}>
          Formation commerciale quotidienne · 1 thème par jour · 4 thèmes au total
        </div>
      </div>

      {/* Global metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Progression totale', val: '38%', sub: '15/40 modules', subColor: C.indigo },
          { label: 'Thème du jour', val: theme.label, sub: `${watchedVideos.size}/3 vues`, subColor: C.gold },
          { label: 'Série active', val: '12j', sub: 'Record: 18j', subColor: C.indigo },
          { label: 'Objectif quotidien', val: `${dailyPct}%`, sub: dailyDone ? '✅ Atteint' : '❌ Non atteint', subColor: dailyDone ? C.green : C.cyan },
        ].map(m => (
          <div key={m.label} style={{ background: `linear-gradient(180deg,${C.surface1},${C.bgMid})`, border: `1px solid ${C.line}`, borderRadius: 10, padding: '12px 14px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: C.indigo, opacity: 0.3 }} />
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{m.label}</div>
            <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: m.label === 'Thème du jour' ? 14 : 26, fontWeight: 600, color: C.textHi, lineHeight: 1, marginBottom: 4 }}>{m.val}</div>
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: m.subColor }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Daily video validation */}
      <div style={{ background: '#140d1e', border: `2px solid #b07aee`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 13, fontWeight: 700, color: '#b07aee', marginBottom: 4 }}>📹 Vidéo du jour</div>
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo }}>Valide 1 vidéo pour atteindre 100% de l&apos;objectif Commerce</div>
          </div>
          <div style={{ fontSize: 24 }}>{dailyDone ? '✅' : '⭕'}</div>
        </div>

        {/* Theme selector */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo, display: 'block', marginBottom: 6 }}>
            Choisis ton thème du jour :
          </label>
          <select
            value={selectedTheme}
            onChange={e => selectTheme(e.target.value as ThemeId)}
            style={{ width: '100%', padding: '8px 10px', background: C.surface2, border: `1px solid #b07aee40`, borderRadius: 6, color: C.textHi, fontFamily: 'JetBrains Mono,monospace', fontSize: 10, cursor: 'pointer', outline: 'none' }}
          >
            <option value="decouverte">🔍 Découverte</option>
            <option value="prospection">📞 Prospection</option>
            <option value="objections">💬 Traitement objections</option>
            <option value="closing">🎯 Techniques closing</option>
          </select>
        </div>

        {/* Video list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {videos.map(v => {
            const watched = watchedVideos.has(v.id)
            return (
              <div
                key={v.id}
                onClick={() => toggleVideo(v.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  background: watched ? `${C.green}12` : C.surface2,
                  border: `1px solid ${watched ? C.green : C.lineSoft}`,
                  borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                  border: `1.5px solid ${watched ? C.green : C.line}`,
                  background: watched ? C.green : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {watched && <span style={{ fontSize: 9, color: C.bgDeep, fontWeight: 700 }}>✓</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: watched ? C.green : C.textHi, textDecoration: watched ? 'line-through' : 'none' }}>{v.title}</div>
                </div>
                <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, flexShrink: 0 }}>{v.duration}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 4 themes grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 20 }}>
        {THEMES.map(t => (
          <div
            key={t.id}
            onClick={() => selectTheme(t.id)}
            style={{
              background: C.surface1, borderRadius: 8, padding: 14,
              border: `0.5px solid ${selectedTheme === t.id ? t.color : C.line}`,
              cursor: 'pointer', transition: 'border-color 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 600, color: t.color }}>{t.icon} {t.label}</div>
              <div style={{ background: t.bg, color: t.color, padding: '2px 8px', borderRadius: 8, fontFamily: 'JetBrains Mono,monospace', fontSize: 8, fontWeight: 600 }}>{t.count}/{t.total}</div>
            </div>
            <div style={{ background: C.surface3, height: 6, borderRadius: 3, marginBottom: 10, overflow: 'hidden' }}>
              <div style={{ background: t.color, height: '100%', width: `${t.pct}%`, transition: 'width 0.3s' }} />
            </div>
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, marginBottom: 8 }}>{t.desc}</div>
            <button
              style={{
                width: '100%', padding: '6px 0', background: t.bg, border: `0.5px solid ${t.color}`,
                color: t.color, borderRadius: 4, fontFamily: 'JetBrains Mono,monospace', fontSize: 9,
                cursor: 'pointer', fontWeight: 600,
              }}
            >
              📹 Voir les vidéos
            </button>
          </div>
        ))}
      </div>

      {/* CA par produit */}
      <Panel accent={C.gold} style={{ marginBottom: 16 }}>
        <PanelTitle title="CA par produit" accent={C.gold} />
        {products.length === 0 ? (
          <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo, textAlign: 'center', padding: '8px 0' }}>
            Aucun contrat enregistré — les commissions s&apos;afficheront ici.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {products.map(p => (
              <div key={p.type} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                <div style={{ fontSize: 10, color: C.text, flex: 1 }}>{p.label}</div>
                <div style={{ flex: 2, height: 6, background: C.surface3, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${p.pct}%`, height: '100%', background: p.color, borderRadius: 3 }} />
                </div>
                <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: p.color, width: 70, textAlign: 'right', flexShrink: 0 }}>
                  {p.montant.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                </div>
              </div>
            ))}
            <div style={{ borderTop: `1px solid ${C.lineSoft}`, paddingTop: 8, fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo, textAlign: 'right' }}>
              Total commissions percues : <span style={{ color: C.gold, fontWeight: 700 }}>
                {productTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        )}
      </Panel>

      {/* Daily objective info */}
      <Panel accent={C.indigo}>
        <PanelTitle title="Objectif quotidien" accent={C.indigo} />
        <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textMid, lineHeight: 1.7 }}>
          <strong style={{ color: C.textHi }}>1 vidéo par jour = 100%</strong> de l&apos;objectif Commerce<br />
          Choisis le thème de ton choix parmi les 4 disponibles.<br />
          Ton objectif global de la journée prend en compte ce pourcentage.
        </div>
      </Panel>

      {/* Navigation transversale — Commerce */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 32, paddingTop: 20, borderTop: `1px solid ${C.gold}20` }}>
        <LinkButton href="/global" label="Global" color="gold" />
        <LinkButton href="/simulator" label="Simulateur" color="cyan" />
        <LinkButton href="/revenue" label="Revenue" color="green" />
        <LinkChip href="/achievements" label="Achievements" color="indigo" />
        <LinkChip href="/scoring" label="Scoring" color="purple" />
      </div>
    </>
  )
}
