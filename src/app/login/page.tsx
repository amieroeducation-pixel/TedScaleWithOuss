'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const C = {
  bgDeep: '#0a0e22',
  bgMid: '#14193d',
  surface1: '#11163a',
  surface2: '#1a2150',
  line: '#3a4690',
  textHi: '#ffffff',
  text: '#d8e1ff',
  textLo: '#5a6ba8',
  cyan: '#ff6470',
  indigo: '#7a92e8',
  gold: '#e8c878',
  green: '#4ade80',
  ribbon: 'linear-gradient(90deg,#c84048 0%,#ff6470 25%,#f5e8c8 55%,#7a92e8 80%,#5c70b8 100%)',
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null)
  const router = useRouter()

  useEffect(() => {
    setSupabase(createSupabaseBrowserClient())
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) return

    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message === 'Invalid login credentials'
        ? 'Email ou mot de passe incorrect'
        : error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <>
      <style>{'@import url(\'https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap\')'}</style>
      <div style={{
        minHeight: '100vh', background: `linear-gradient(180deg,${C.bgDeep},${C.bgMid})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Inter,sans-serif',
      }}>
        <div style={{ width: '100%', maxWidth: 400, padding: '0 20px' }}>
          {/* Logo / Title */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ width: 4, height: 32, background: C.ribbon, borderRadius: 2, margin: '0 auto 16px' }} />
            <h1 style={{
              fontFamily: 'Oswald,sans-serif', fontSize: 28, fontWeight: 700,
              color: C.textHi, letterSpacing: '0.12em', textTransform: 'uppercase',
              marginBottom: 6,
            }}>
              Ted Scale With Ouss
            </h1>
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: C.textLo, letterSpacing: '0.08em' }}>
              TABLEAU DE BORD CGP
            </div>
          </div>

          {/* Login card */}
          <div style={{
            background: `linear-gradient(180deg,${C.surface1},${C.bgMid})`,
            border: `1px solid ${C.line}`, borderRadius: 12, padding: 28,
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,#ff647066,transparent)' }} />

            <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 14, fontWeight: 600, color: C.textHi, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20 }}>
              Connexion
            </div>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  style={{
                    width: '100%', padding: '10px 14px',
                    background: C.surface2, border: `1px solid ${C.line}`,
                    borderRadius: 8, color: C.text, fontSize: 13,
                    fontFamily: 'Inter,sans-serif', outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                  Mot de passe
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  style={{
                    width: '100%', padding: '10px 14px',
                    background: C.surface2, border: `1px solid ${C.line}`,
                    borderRadius: 8, color: C.text, fontSize: 13,
                    fontFamily: 'Inter,sans-serif', outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {error && (
                <div style={{
                  padding: '8px 12px', background: '#1f0d0d',
                  border: '1px solid #ff647044', borderRadius: 6,
                  fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: C.cyan,
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !supabase}
                style={{
                  padding: '12px', background: loading ? C.surface2 : C.indigo,
                  border: 'none', borderRadius: 8, color: C.textHi,
                  fontSize: 12, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: 'Oswald,sans-serif', letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  boxShadow: loading ? 'none' : `0 0 16px ${C.indigo}44`,
                  transition: 'all 0.2s',
                  marginTop: 4,
                }}
              >
                {loading ? 'Connexion...' : 'Se connecter →'}
              </button>
            </form>
          </div>

          <div style={{ textAlign: 'center', marginTop: 20, fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo }}>
            Accès restreint · Ted Scale With Ouss
          </div>
        </div>
      </div>
    </>
  )
}
