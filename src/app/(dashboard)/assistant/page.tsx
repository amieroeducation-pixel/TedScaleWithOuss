'use client'

import { useState, useRef, useEffect } from 'react'
import { C } from '@/lib/theme'

type Message = { role: 'assistant' | 'user'; text: string; time: string }

const WELCOME_TEXT = `Salut ! Je suis ton assistant dashboard. Je peux t'aider à :

• 📊 Analyser tes performances (KPI, tendances, objectifs)
• 📅 Optimiser ton planning (blocs, RDV, déplacements)
• 🎯 Modifier des paramètres (objectifs, notifications)
• 💡 Donner des conseils (prospection, closing, stratégie)
• 🔍 Rechercher des infos (prospects, leads, historique)

Exemples de questions :
"Comment améliorer mon taux de closing ?"
"Optimise mon planning de demain"
"Quels prospects relancer en priorité ?"
"Change l'objectif blocs à 5 par jour"`

const INITIAL_MESSAGES: Message[] = [
  { role: 'assistant', text: WELCOME_TEXT, time: '' },
]

const QUICK_ACTIONS = [
  { id: 'analyser-semaine', label: '📊 Analyser ma semaine', color: C.indigo, bg: '#0d1a2e', border: C.indigo + '40' },
  { id: 'optimiser-planning', label: '📅 Optimiser planning', color: C.green, bg: '#0d1f0f', border: C.green + '40' },
  { id: 'prospects-prioritaires', label: '🎯 Prospects prioritaires', color: C.gold, bg: '#1a1400', border: C.gold + '40' },
  { id: 'conseils-closing', label: '💡 Conseils closing', color: '#b07aee', bg: '#140d1e', border: '#b07aee40' },
]

const QUICK_RESPONSES: Record<string, string> = {
  'analyser-semaine': "📊 Analyse de ta semaine :\n\n• 47 appels passés (objectif : 40) ✅\n• 3 RDV R1 posés (objectif : 5) ⚠️\n• 1 contrat signé (+2 200 €)\n• Score productivité : 72/100 (+8 vs semaine dernière)\n\nPoint d'attention : tes blocs de prospection du jeudi ont été réduits. Planifie 2 blocs supplémentaires vendredi.",
  'optimiser-planning': "📅 Planning optimisé pour demain :\n\n08h00–09h30 → Bloc prospection appels (TNS chirurgiens Paris 1–8e)\n10h00–10h30 → RDV R2 Martin Dupont (signature PER)\n11h00–12h00 → Bloc séquences email (5 relances J+7)\n14h00–15h30 → Bloc interpro (2 contacts notaires)\n16h00–17h00 → Suivi CRM + scoring prospects\n\n💡 Conseil : intercale une micro-pause de 10 min entre chaque bloc.",
  'prospects-prioritaires': "🎯 Top 3 prospects à relancer en priorité :\n\n1. 🔥 Dr. Bertrand (chirurgien, Paris 8e) — 22 jours sans contact. Score 91/100. Potentiel PER : 180k€.\n\n2. ⚡ Cabinet Moreau (radiologue, Neuilly) — RDV R1 il y a 18 jours, pas de R2 planifié. Envoyer séquence post-RDV1.\n\n3. 💎 M. Lefèvre (pharmacien, Versailles) — Signal BODACC cession détecté il y a 3j. Urgence 48h !",
  'conseils-closing': "💡 Conseils pour améliorer ton taux de closing (actuellement 34%, objectif 40%) :\n\n1. **RDV R2 dans les 7 jours** — ton délai moyen est 14j. Réduire de moitié améliore le taux de 8–12pp.\n\n2. **Prépare une synthèse visuelle** avant chaque R2 — 1 page avec simulation personnalisée. Augmente la conversion de 15%.\n\n3. **Objection \"je dois réfléchir\"** → répondre : \"Tout à fait, sur quoi portent vos questions principales ?\" puis adresser directement.\n\n4. **Timing optimal** : appelle entre 11h–12h ou 17h–18h. Taux de réponse +40%.",
}

function getNow() {
  return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function Panel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: `linear-gradient(180deg,${C.surface1},${C.bgMid})`,
      border: `1px solid ${C.line}`, borderRadius: 10,
      position: 'relative', overflow: 'hidden', ...style,
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,#ff647066,transparent)' }} />
      {children}
    </div>
  )
}

function PanelTitle({ title, accent = C.cyan }: { title: string; accent?: string }) {
  return (
    <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10, color: accent }}>
      {title}
    </div>
  )
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping])

  function sendMessage(text: string) {
    if (!text.trim()) return
    const now = getNow()
    const userMsg: Message = { role: 'user', text: text.trim(), time: now }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    setTimeout(() => {
      const predefined = QUICK_RESPONSES[text] || `Je traite votre demande : "${text.trim()}". Analyse de votre pipeline en cours… Je reviendrai avec une réponse personnalisée.`
      const aiMsg: Message = { role: 'assistant', text: predefined, time: getNow() }
      setMessages(prev => [...prev, aiMsg])
      setIsTyping(false)
    }, 800)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <>
      <style>{'@import url(\'https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap\')'}</style>

      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ width: 3, height: 22, background: C.ribbon, borderRadius: 2 }} />
          <h1 style={{ fontFamily: 'Oswald,sans-serif', fontSize: 20, fontWeight: 600, color: C.textHi, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            🤖 Assistant Dashboard
          </h1>
        </div>
        <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo, paddingLeft: 11 }}>
          Discute avec ton dashboard pour des actions, réglages, analyses et conseils
        </div>
      </div>

      {/* Chat zone */}
      <Panel style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', height: 500, padding: 0 }}>
        {/* Chat header */}
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.lineSoft}`, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: `linear-gradient(135deg,${C.indigo},${C.surface3})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
          }}>
            🤖
          </div>
          <div>
            <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 13, fontWeight: 600, color: C.textHi }}>Assistant Dashboard</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, boxShadow: `0 0 6px ${C.green}88` }} />
              <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo }}>En ligne · Modèle CGP-Pro</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', gap: 10, alignItems: 'flex-start' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: msg.role === 'user'
                  ? `linear-gradient(135deg,${C.cyan},${C.magenta})`
                  : `linear-gradient(135deg,${C.indigo},${C.surface3})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: msg.role === 'user' ? 11 : 14,
                fontFamily: 'Oswald,sans-serif', fontWeight: 700, color: C.textHi,
              }}>
                {msg.role === 'user' ? 'T' : '🤖'}
              </div>
              <div style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', gap: 3, alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {msg.role === 'assistant' && (
                  <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, marginBottom: 2 }}>
                    Assistant Dashboard{msg.time && ` · ${msg.time}`}
                  </div>
                )}
                <div style={{
                  padding: '10px 13px',
                  borderRadius: msg.role === 'user' ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
                  background: msg.role === 'user'
                    ? `linear-gradient(135deg,${C.magenta}cc,${C.cyan}99)`
                    : C.surface2,
                  border: `1px solid ${msg.role === 'user' ? C.magenta + '88' : C.lineSoft}`,
                  fontFamily: 'Inter,sans-serif', fontSize: 10, color: C.text,
                  lineHeight: 1.6, whiteSpace: 'pre-wrap',
                }}>
                  {msg.text}
                </div>
                {msg.time && (
                  <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textVlo }}>{msg.time}</div>
                )}
              </div>
            </div>
          ))}
          {isTyping && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: `linear-gradient(135deg,${C.indigo},${C.surface3})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>🤖</div>
              <div style={{ padding: '10px 13px', borderRadius: '4px 12px 12px 12px', background: C.surface2, border: `1px solid ${C.lineSoft}`, display: 'flex', gap: 4, alignItems: 'center' }}>
                {[0, 1, 2].map(d => (
                  <div key={d} style={{ width: 6, height: 6, borderRadius: '50%', background: C.indigo, animation: `pulse 1.2s ${d * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{ padding: '10px 16px 14px', borderTop: `1px solid ${C.lineSoft}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pose une question, demande une action, ou discute..."
              style={{
                flex: 1, padding: '10px 14px',
                background: C.surface2, border: `1px solid ${C.line}`,
                borderRadius: 8, color: C.text, fontSize: 10,
                fontFamily: 'Inter,sans-serif', outline: 'none',
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              style={{
                padding: '10px 20px', background: C.indigo, border: 'none',
                borderRadius: 8, color: C.textHi, fontSize: 10, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'Oswald,sans-serif', letterSpacing: '0.05em',
                boxShadow: `0 0 12px ${C.indigo}44`,
              }}
            >
              Envoyer →
            </button>
          </div>
        </div>
      </Panel>

      {/* Quick actions */}
      <Panel style={{ padding: 14 }}>
        <PanelTitle title="⚡ Actions rapides" accent={C.gold} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
          {QUICK_ACTIONS.map(a => (
            <button
              key={a.id}
              onClick={() => sendMessage(a.id)}
              style={{
                padding: 8, background: a.bg, border: `1px solid ${a.border}`,
                color: a.color, borderRadius: 6, fontSize: 9, fontWeight: 600,
                cursor: 'pointer', textAlign: 'left',
                fontFamily: 'Oswald,sans-serif', letterSpacing: '0.05em',
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      </Panel>
    </>
  )
}
