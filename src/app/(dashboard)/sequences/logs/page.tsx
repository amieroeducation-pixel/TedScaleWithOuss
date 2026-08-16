'use client'
import { useEffect, useState } from 'react'
import { C } from '@/lib/theme'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function SequenceLogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [channelFilter, setChannelFilter] = useState<string | null>(null)

  useEffect(() => {
    loadLogs()
  }, [page, channelFilter])

  async function loadLogs() {
    setLoading(true)
    const url = `/api/sequences/logs?page=${page}${channelFilter ? `&channel=${channelFilter}` : ''}`
    const res = await fetch(url)
    const data = await res.json()
    setLogs(data.logs || [])
    setTotal(data.total || 0)
    setLoading(false)
  }

  const totalPages = Math.ceil(total / 50)

  return (
    <>
      <style>{'@import url(\'https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap\')'}</style>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 3, height: 24, background: C.ribbon, borderRadius: 2 }} />
          <h1 style={{ fontFamily: 'Oswald,sans-serif', fontSize: 22, fontWeight: 600, color: C.textHi, letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
            Séquences — <span style={{ color: C.cyan }}>Logs temps réel</span>
          </h1>
        </div>
        <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: C.textLo, paddingLeft: 13 }}>
          Historique complet des envois multicanaux
        </div>
      </div>

      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <button
          onClick={() => setChannelFilter(null)}
          style={{
            fontFamily: 'JetBrains Mono,monospace',
            fontSize: 10,
            padding: '6px 12px',
            background: channelFilter === null ? C.gold : C.surface1,
            color: channelFilter === null ? C.bgDeep : C.textMid,
            border: `1px solid ${channelFilter === null ? C.gold : C.line}`,
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          Tous
        </button>
        {['email', 'sms', 'whatsapp', 'call_reminder'].map(ch => (
          <button
            key={ch}
            onClick={() => setChannelFilter(ch)}
            style={{
              fontFamily: 'JetBrains Mono,monospace',
              fontSize: 10,
              padding: '6px 12px',
              background: channelFilter === ch ? C.gold : C.surface1,
              color: channelFilter === ch ? C.bgDeep : C.textMid,
              border: `1px solid ${channelFilter === ch ? C.gold : C.line}`,
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            {ch}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{
          background: C.bgCard,
          border: `1px solid ${C.line}`,
          borderRadius: 12,
          padding: 32,
          textAlign: 'center',
          fontFamily: 'JetBrains Mono,monospace',
          fontSize: 11,
          color: C.textMid
        }}>
          Chargement...
        </div>
      ) : (
        <>
          <div style={{
            background: C.bgCard,
            border: `1px solid ${C.line}`,
            borderRadius: 12,
            overflow: 'hidden'
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse'
            }}>
              <thead>
                <tr style={{ background: C.surface1, borderBottom: `1px solid ${C.line}` }}>
                  <th style={{
                    padding: 12,
                    textAlign: 'left',
                    fontFamily: 'JetBrains Mono,monospace',
                    fontSize: 9,
                    color: C.textLo,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em'
                  }}>
                    Date/Heure
                  </th>
                  <th style={{
                    padding: 12,
                    textAlign: 'left',
                    fontFamily: 'JetBrains Mono,monospace',
                    fontSize: 9,
                    color: C.textLo,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em'
                  }}>
                    Canal
                  </th>
                  <th style={{
                    padding: 12,
                    textAlign: 'left',
                    fontFamily: 'JetBrains Mono,monospace',
                    fontSize: 9,
                    color: C.textLo,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em'
                  }}>
                    Prospect
                  </th>
                  <th style={{
                    padding: 12,
                    textAlign: 'left',
                    fontFamily: 'JetBrains Mono,monospace',
                    fontSize: 9,
                    color: C.textLo,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em'
                  }}>
                    Statut
                  </th>
                  <th style={{
                    padding: 12,
                    textAlign: 'left',
                    fontFamily: 'JetBrains Mono,monospace',
                    fontSize: 9,
                    color: C.textLo,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em'
                  }}>
                    Erreur
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{
                      padding: 32,
                      textAlign: 'center',
                      fontFamily: 'JetBrains Mono,monospace',
                      fontSize: 10,
                      color: C.textLo
                    }}>
                      Aucun log disponible
                    </td>
                  </tr>
                ) : (
                  logs.map(log => (
                    <tr
                      key={log.id}
                      style={{ borderBottom: `1px solid ${C.lineSoft}` }}
                    >
                      <td style={{
                        padding: 12,
                        fontFamily: 'JetBrains Mono,monospace',
                        fontSize: 10,
                        color: C.textMid
                      }}>
                        {format(new Date(log.sentAt), 'dd/MM HH:mm', { locale: fr })}
                      </td>
                      <td style={{ padding: 12 }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: C.surface1,
                          fontSize: 9,
                          fontFamily: 'JetBrains Mono,monospace',
                          color: C.gold
                        }}>
                          {log.channel}
                        </span>
                      </td>
                      <td style={{
                        padding: 12,
                        fontFamily: 'JetBrains Mono,monospace',
                        fontSize: 10,
                        color: C.textMid
                      }}>
                        {log.prospectName}
                      </td>
                      <td style={{ padding: 12 }}>
                        <span style={{
                          fontFamily: 'JetBrains Mono,monospace',
                          fontSize: 10
                        }}>
                          {log.status === 'success' && '✅'}
                          {log.status === 'failed' && '❌'}
                          {log.status === 'retrying' && '🔄'}
                          {log.retryCount > 0 && ` (retry ${log.retryCount})`}
                        </span>
                      </td>
                      <td style={{
                        padding: 12,
                        color: C.error,
                        fontSize: 10,
                        fontFamily: 'JetBrains Mono,monospace'
                      }}>
                        {log.error ? `${log.httpCode || ''} ${log.error.slice(0, 50)}` : ''}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={{
            marginTop: 16,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 16
          }}>
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              style={{
                fontFamily: 'JetBrains Mono,monospace',
                fontSize: 10,
                padding: '8px 16px',
                background: page === 1 ? C.surface1 : C.gold,
                color: page === 1 ? C.textLo : C.bgDeep,
                border: `1px solid ${page === 1 ? C.line : C.gold}`,
                borderRadius: 6,
                cursor: page === 1 ? 'not-allowed' : 'pointer',
                opacity: page === 1 ? 0.5 : 1
              }}
            >
              ← Précédent
            </button>
            <span style={{
              fontFamily: 'JetBrains Mono,monospace',
              fontSize: 10,
              color: C.textMid,
              padding: '8px 16px'
            }}>
              Page {page} / {totalPages || 1}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              style={{
                fontFamily: 'JetBrains Mono,monospace',
                fontSize: 10,
                padding: '8px 16px',
                background: page >= totalPages ? C.surface1 : C.gold,
                color: page >= totalPages ? C.textLo : C.bgDeep,
                border: `1px solid ${page >= totalPages ? C.line : C.gold}`,
                borderRadius: 6,
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                opacity: page >= totalPages ? 0.5 : 1
              }}
            >
              Suivant →
            </button>
          </div>
        </>
      )}
    </>
  )
}
