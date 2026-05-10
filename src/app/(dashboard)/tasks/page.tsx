'use client'

import { useState } from 'react'
import { C } from '@/lib/theme'

type Filter = 'Toutes' | 'Urgentes' | 'Cette semaine' | 'Terminées'
type KanbanCol = 'todo' | 'inprogress' | 'waiting' | 'blocked' | 'done'
type Priority = 1 | 2 | 3 | 4
type Badge = 'premium' | 'prospect' | 'client' | 'done' | ''
type Urgency = 'urgent' | 'normal'

interface Task {
  id: string
  title: string
  sub: string
  priority: Priority
  time: string
  badge: Badge
  col: KanbanCol
  urgency: Urgency
  thisWeek: boolean
}

const COLS: { id: KanbanCol; label: string; color: string }[] = [
  { id: 'todo', label: 'À faire', color: C.cyan },
  { id: 'inprogress', label: 'En cours', color: C.indigo },
  { id: 'waiting', label: 'En attente', color: C.gold },
  { id: 'blocked', label: 'Bloquées', color: C.warn },
  { id: 'done', label: 'Terminées', color: C.green },
]

const INITIAL_TASKS: Task[] = [
  { id: 't1', title: 'Préparer dossier Dr. Rousseau', sub: 'RDV 3 mercredi — proposition PER + AV', priority: 4, time: '2h', badge: 'premium', col: 'todo', urgency: 'urgent', thisWeek: true },
  { id: 't2', title: 'Relancer Sophie Renaud', sub: '34j sans contact — client premium', priority: 4, time: '30min', badge: 'premium', col: 'todo', urgency: 'urgent', thisWeek: true },
  { id: 't3', title: 'Proposition upsell Antoine', sub: 'SCPI diversification patrimoine', priority: 3, time: '1h30', badge: 'premium', col: 'todo', urgency: 'normal', thisWeek: true },
  { id: 't4', title: 'Extraire TNS Paris 17e', sub: 'Nouvelle zone prospection', priority: 2, time: '45min', badge: '', col: 'todo', urgency: 'normal', thisWeek: false },
  { id: 't5', title: 'Mettre à jour CRM', sub: 'Synchroniser contacts semaine', priority: 1, time: '20min', badge: '', col: 'todo', urgency: 'normal', thisWeek: true },
  { id: 't6', title: 'Étude patrimoine M. Bernard', sub: 'Analyse complète + recommandations', priority: 3, time: '3h', badge: 'prospect', col: 'inprogress', urgency: 'normal', thisWeek: true },
  { id: 't7', title: 'Séquence email RDV 1', sub: '4 prospects à relancer post-RDV', priority: 2, time: '1h', badge: '', col: 'inprogress', urgency: 'normal', thisWeek: true },
  { id: 't8', title: 'Préparer rapport hebdo', sub: 'KPIs + actions semaine prochaine', priority: 2, time: '1h', badge: '', col: 'inprogress', urgency: 'normal', thisWeek: true },
  { id: 't9', title: 'Recherche SCPI Europe', sub: 'Comparatif 5 produits pour Antoine', priority: 1, time: '45min', badge: '', col: 'inprogress', urgency: 'normal', thisWeek: false },
  { id: 't10', title: 'Valider proposition Lucie', sub: 'Attente retour client', priority: 2, time: '30min', badge: 'client', col: 'waiting', urgency: 'normal', thisWeek: true },
  { id: 't11', title: 'Rendez-vous comptable', sub: 'Bilan trimestriel à planifier', priority: 1, time: '2h', badge: '', col: 'waiting', urgency: 'normal', thisWeek: false },
  { id: 't12', title: 'Formation PER Madelin', sub: 'Nouvelle réglementation 2026', priority: 1, time: '1h30', badge: '', col: 'waiting', urgency: 'normal', thisWeek: false },
  { id: 't13', title: 'Closing Dr. Martin', sub: 'En attente réponse depuis 5j', priority: 4, time: '1h', badge: 'prospect', col: 'blocked', urgency: 'urgent', thisWeek: true },
  { id: 't14', title: 'Simulation fiscale TNS', sub: 'Besoin infos comptables client', priority: 2, time: '2h', badge: '', col: 'blocked', urgency: 'normal', thisWeek: false },
  { id: 't15', title: 'Email intro 12 TNS', sub: 'Campagne prospection envoyée', priority: 2, time: '1h', badge: 'done', col: 'done', urgency: 'normal', thisWeek: true },
  { id: 't16', title: 'Mise à jour scoring', sub: 'Nouvelle grille validée', priority: 1, time: '30min', badge: 'done', col: 'done', urgency: 'normal', thisWeek: true },
  { id: 't17', title: 'RDV 1 F. Dubois', sub: 'Rendez-vous effectué jeudi', priority: 3, time: '1h', badge: 'done', col: 'done', urgency: 'normal', thisWeek: true },
  { id: 't18', title: 'Proposition PER radiologie', sub: 'Document envoyé', priority: 2, time: '2h', badge: 'done', col: 'done', urgency: 'normal', thisWeek: false },
]

const BADGE_STYLES: Record<Badge, { bg: string; color: string; label: string }> = {
  premium: { bg: '#e8c87818', color: '#e8c878', label: 'Premium' },
  prospect: { bg: '#7a92e818', color: '#7a92e8', label: 'Prospect' },
  client: { bg: '#4ade8018', color: '#4ade80', label: 'Client' },
  done: { bg: '#4ade8018', color: '#4ade80', label: 'Terminé' },
  '': { bg: '', color: '', label: '' },
}

const FILTERS: Filter[] = ['Toutes', 'Urgentes', 'Cette semaine', 'Terminées']

function PriorityDots({ n }: { n: Priority }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold, flexShrink: 0 }} />
      ))}
    </span>
  )
}

function TaskCard({ task }: { task: Task }) {
  const [checked, setChecked] = useState(task.col === 'done')
  const bs = BADGE_STYLES[task.badge]
  const isUrgent = task.urgency === 'urgent'
  return (
    <div style={{
      background: C.surface2,
      border: `1px solid ${C.lineSoft}`,
      borderLeft: `3px solid ${isUrgent ? C.gold : C.line}`,
      borderRadius: 8,
      padding: '10px 12px',
      marginBottom: 6,
      opacity: checked ? 0.6 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 5 }}>
        <div
          onClick={() => setChecked(v => !v)}
          style={{
            width: 14, height: 14, borderRadius: 3, flexShrink: 0, marginTop: 1, cursor: 'pointer',
            border: `1.5px solid ${checked ? C.green : C.line}`,
            background: checked ? C.green : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {checked && <span style={{ fontSize: 8, color: C.bgDeep, fontWeight: 700 }}>✓</span>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'JetBrains Mono,monospace', fontSize: 10,
            color: checked ? C.textLo : C.textHi,
            textDecoration: checked ? 'line-through' : 'none',
            lineHeight: 1.3,
          }}>{task.title}</div>
          <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, marginTop: 3 }}>{task.sub}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <PriorityDots n={task.priority} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isUrgent && (
            <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7, color: C.gold, background: `${C.gold}18`, border: `1px solid ${C.gold}40`, padding: '1px 6px', borderRadius: 4 }}>
              URGENT
            </span>
          )}
          <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo }}>{task.time}</span>
          {task.badge && (
            <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7, color: bs.color, background: bs.bg, border: `1px solid ${bs.color}40`, padding: '1px 6px', borderRadius: 4 }}>
              {bs.label}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function applyFilter(tasks: Task[], filter: Filter): Task[] {
  switch (filter) {
    case 'Urgentes': return tasks.filter(t => t.urgency === 'urgent')
    case 'Cette semaine': return tasks.filter(t => t.thisWeek && t.col !== 'done')
    case 'Terminées': return tasks.filter(t => t.col === 'done')
    default: return tasks
  }
}

export default function TasksPage() {
  const [filter, setFilter] = useState<Filter>('Toutes')

  const filtered = applyFilter(INITIAL_TASKS, filter)

  const tasksByCol = (col: KanbanCol) => filtered.filter(t => t.col === col)

  const colsToShow = filter === 'Terminées'
    ? COLS.filter(c => c.id === 'done')
    : filter === 'Toutes'
    ? COLS
    : COLS.filter(c => tasksByCol(c.id).length > 0)

  return (
    <>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap')"}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 3, height: 24, background: C.ribbon, borderRadius: 2 }} />
            <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 22, fontWeight: 600, color: C.textHi, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              TÂ<span style={{ color: C.gold }}>CHES</span>
            </div>
          </div>
          <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo, marginTop: 2, paddingLeft: 13 }}>
            Tableau kanban · 18 tâches actives
          </div>
        </div>
        <button style={{ fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 500, color: C.bgDeep, background: `linear-gradient(90deg,${C.green},${C.indigo})`, border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', letterSpacing: '0.1em' }}>
          ➕ NOUVELLE TÂCHE
        </button>
      </div>

      {/* Metric row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 12 }}>
        {[
          { label: 'Tâches actives', val: '18', sub: '12 cette semaine', subColor: C.gold },
          { label: 'Haute priorité', val: '4', sub: '4 critiques', subColor: C.cyan },
          { label: 'Complétées', val: '42', sub: 'Ce mois', subColor: C.indigo },
          { label: 'Temps estimé', val: '24h', sub: 'Total semaine', subColor: C.gold },
        ].map(m => (
          <div key={m.label} style={{ background: `linear-gradient(180deg,${C.surface1},${C.bgMid})`, border: `1px solid ${C.line}`, borderRadius: 10, padding: '12px 14px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: C.gold, opacity: 0.3 }} />
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{m.label}</div>
            <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 26, fontWeight: 600, color: C.textHi, lineHeight: 1, marginBottom: 4 }}>{m.val}</div>
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: m.subColor }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {FILTERS.map(f => {
          const active = filter === f
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                fontFamily: 'JetBrains Mono,monospace', fontSize: 9, fontWeight: active ? 700 : 400,
                padding: '6px 14px', borderRadius: 20, cursor: 'pointer', border: 'none',
                background: active ? C.gold : C.surface2,
                color: active ? C.bgDeep : C.textLo,
                boxShadow: active ? `0 0 8px ${C.gold}44` : 'none',
                letterSpacing: '0.04em',
              }}
            >
              {f}
            </button>
          )
        })}
      </div>

      {/* Priority legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 12, padding: '10px 14px', background: C.surface1, border: `1px solid ${C.lineSoft}`, borderRadius: 8 }}>
        {[
          { label: 'Faible (1)', dots: 1 },
          { label: 'Moyenne (2)', dots: 2 },
          { label: 'Haute (3)', dots: 3 },
          { label: 'Critique (4)', dots: 4 },
        ].map(p => (
          <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'inline-flex', gap: 2 }}>
              {Array.from({ length: p.dots }).map((_, i) => (
                <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
              ))}
            </span>
            <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textMid }}>{p.label}</span>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 3, height: 14, background: C.gold, borderRadius: 1 }} />
          <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.gold }}>Urgent</span>
          <div style={{ width: 3, height: 14, background: C.line, borderRadius: 1, marginLeft: 8 }} />
          <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo }}>Normal</span>
        </div>
      </div>

      {/* Kanban board */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: colsToShow.length === 1 ? '1fr' : colsToShow.length === 5 ? 'repeat(5,1fr)' : `repeat(${colsToShow.length},1fr)`,
        gap: 10,
      }}>
        {colsToShow.map(col => {
          const colTasks = tasksByCol(col.id)
          return (
            <div key={col.id}>
              {/* Column header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 12px', marginBottom: 8,
                background: `${col.color}12`, border: `1px solid ${col.color}40`, borderRadius: 8,
              }}>
                <span style={{ fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 500, color: col.color, letterSpacing: '0.08em' }}>{col.label}</span>
                <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: col.color, background: `${col.color}20`, border: `1px solid ${col.color}50`, padding: '1px 7px', borderRadius: 10 }}>{colTasks.length}</span>
              </div>
              {/* Cards */}
              <div>
                {colTasks.map(task => (
                  <TaskCard key={task.id} task={task} />
                ))}
                {colTasks.length === 0 && (
                  <div style={{ padding: '16px 0', textAlign: 'center', fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textVlo, fontStyle: 'italic' }}>
                    Aucune tâche
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
