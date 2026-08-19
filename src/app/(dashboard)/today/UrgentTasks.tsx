'use client'

import { useState, useEffect } from 'react'
import { C } from '@/lib/theme'
import { Task } from './types'
import { LinkButton } from '@/lib/cross-links'

export default function UrgentTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Fetch urgent tasks due today
    fetch('/api/tasks?urgency=urgent&deadline=today')
      .then(r => r.json())
      .then(j => {
        if (j.success && j.data) {
          setTasks(j.data)
        } else if (j.error) {
          setError(j.error)
        }
      })
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ padding: 16, background: C.surface1, borderRadius: 6, border: `0.5px solid ${C.line}` }}>
        <div style={{ fontSize: 8, color: C.textLo }}>Chargement des tâches urgentes...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: 16, background: C.surface1, borderRadius: 6, border: `0.5px solid ${C.line}` }}>
        <div style={{ fontSize: 8, color: C.warn }}>Erreur: {error}</div>
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div style={{ padding: 16, background: C.surface1, borderRadius: 6, border: `0.5px solid ${C.line}` }}>
        <div style={{ fontSize: 8, color: C.textLo, marginBottom: 8, fontWeight: 500 }}>🚨 Actions prioritaires</div>
        <div style={{ fontSize: 9, color: C.textMid }}>Aucune tâche urgente pour aujourd'hui</div>
      </div>
    )
  }

  return (
    <div style={{ padding: 16, background: C.surface1, borderRadius: 6, border: `0.5px solid ${C.line}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 8, color: C.textLo, fontWeight: 500 }}>🚨 Actions prioritaires</div>
        <LinkButton href="/tasks" style={{ fontSize: 8, padding: '4px 8px' }}>
          Voir toutes
        </LinkButton>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tasks.map(task => (
          <div
            key={task.id}
            style={{
              padding: 10,
              background: C.bgDeep,
              border: `0.5px solid ${C.warn}40`,
              borderRadius: 4,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                fontSize: 7,
                padding: '2px 6px',
                borderRadius: 3,
                background: '#1a0d0d',
                color: C.warn,
                border: `0.5px solid ${C.warn}40`,
                fontWeight: 500,
              }}>
                URGENT
              </div>
              <div style={{ fontSize: 9, color: C.textHi, fontWeight: 500, flex: 1 }}>
                {task.title}
              </div>
            </div>
            {task.description && (
              <div style={{ fontSize: 8, color: C.textMid, lineHeight: 1.3 }}>
                {task.description}
              </div>
            )}
            <div style={{ fontSize: 7, color: C.textLo, marginTop: 2 }}>
              Deadline: Aujourd'hui • Priorité {task.priority}/4
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
