'use client'

import { useState, useEffect } from 'react'
import { C } from '@/lib/theme'
import ProspectCard, { type ProspectCardData } from '@/components/prospects/ProspectCard'
import { LinkButton, LinkBadge, LinkChip, buildHref } from '@/lib/cross-links'

type MainTab = 'portefeuille' | 'acquisition'
type AcqTab = 'pipeline' | 'tableau' | 'prospection'

type SupabaseProspect = {
  id: string
  full_name: string
  company?: string | null
  city?: string | null
  phone?: string | null
  email?: string | null
  profession?: string | null
  pipeline_stage?: string | null
  notes?: string | null
  source?: string | null
}

type WorkflowLead = {
  id: string
  siren: string | null
  nom: string
  forme: string
  ville: string
  codePostal: string
  dateCreation: string | null
  signal: string
  signalLabel: string
  score: number
  scoreColor: string
  urgence: boolean
  phone: string | null
}

type WorkflowStats = {
  total: number
  dateExecution: string
  prochaine: string
  creations?: number
  cessions?: number
  holdings?: number
  dividendes?: number
  seniors?: number
}

const STATUS_COLORS: Record<string, string> = {
  a_contacter: '#7a92e8',
  rdv1: '#e8c878',
  rdv2: '#e8c878',
  rdv3: '#e8c878',
  converti: '#4ade80',
  perdu: '#ff6470',
}

const SECTEURS = [
  'BTP / Immobilier', 'Commerce / Distribution', 'Restauration / Hôtellerie',
  'Services aux entreprises', 'Industrie / Fabrication', 'Transport / Logistique',
  'Tech / Numérique', 'Santé / Bien-être', 'Finance / Assurance',
]

const ACTION_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  LI:    { bg: '#0a1929', color: '#7a92e8', border: '#7a92e840' },
  WA:    { bg: '#0a1f0a', color: '#4ade80', border: '#4ade8040' },
  email: { bg: '#11163a', color: '#7a92e8', border: '#7a92e840' },
  seq:   { bg: '#1a2150', color: '#d8e1ff', border: '#3a469040' },
}
const ACTION_LABELS: Record<string, string> = { LI: 'in', WA: 'WA', email: '✉', seq: '▶' }

function Panel({ children, accent = C.indigo, style = {} }: { children: React.ReactNode; accent?: string; style?: React.CSSProperties }) {
  return (
    <div style={{ background: `linear-gradient(180deg,${C.surface1},${C.bgMid})`, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16, position: 'relative', overflow: 'hidden', ...style }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${accent}88,transparent)` }} />
      {children}
    </div>
  )
}

function PanelTitle({ title, accent = C.indigo }: { title: string; accent?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
      <span style={{ width: 6, height: 6, background: accent, transform: 'rotate(45deg)', display: 'inline-block', boxShadow: `0 0 7px ${accent}`, flexShrink: 0 }} />
      <span style={{ fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 500, color: C.textHi, textTransform: 'uppercase', letterSpacing: '0.16em' }}>{title}</span>
    </div>
  )
}

function ActionBtn({ type }: { type: string }) {
  const s = ACTION_STYLE[type] ?? ACTION_STYLE.email
  return (
    <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, fontWeight: 700, padding: '3px 7px', borderRadius: 5, background: s.bg, color: s.color, border: `1px solid ${s.border}`, cursor: 'pointer' }}>
      {ACTION_LABELS[type] ?? type}
    </span>
  )
}

function PipelineCard({ nom, siret, info, score, scoreColor, scoreBg, urgence, borderColor }: {
  nom: string; siret: string; info: string; score: number; scoreColor: string; scoreBg: string; urgence?: boolean; borderColor: string
}) {
  return (
    <div style={{ background: C.surface1, borderRadius: 7, padding: 9, marginBottom: 6, borderLeft: `3px solid ${borderColor}`, cursor: 'pointer', position: 'relative' }}>
      {urgence && (
        <div style={{ position: 'absolute', top: 5, right: 5, background: C.cyan, color: '#fff', padding: '1px 5px', borderRadius: 6, fontSize: 7, fontWeight: 700 }}>⚡ 48H</div>
      )}
      <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 10, fontWeight: 600, color: C.textHi, marginBottom: 2 }}>{nom}</div>
      <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7.5, color: C.textLo, marginBottom: 3 }}>{siret}</div>
      <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7.5, color: C.textMid, marginBottom: 5 }}>{info}</div>
      <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: 8, fontSize: 7, fontWeight: 700, background: scoreBg, color: scoreColor, border: `1px solid ${scoreColor}30` }}>
        Score: {score}/10{score === 10 ? ' 🔥' : ''}
      </span>
    </div>
  )
}

export default function ChefsEntreprisePage() {
  const [mainTab, setMainTab] = useState<MainTab>('portefeuille')
  const [acqTab, setAcqTab] = useState<AcqTab>('pipeline')
  const [showForm, setShowForm] = useState(false)
  const [chefs, setChefs] = useState<SupabaseProspect[]>([])
  const [chefsLoading, setChefsLoading] = useState(true)
  const [selectedProspect, setSelectedProspect] = useState<ProspectCardData | null>(null)
  const [form, setForm] = useState({ nom: '', entreprise: '', secteur: SECTEURS[0], ville: '', ca: '', effectif: '', telephone: '' })
  const [search, setSearch] = useState('')
  const [workflowLoading, setWorkflowLoading] = useState<'hebdomadaire' | 'mensuel' | null>(null)
  const [workflowError, setWorkflowError] = useState<string | null>(null)
  const [workflowLeads, setWorkflowLeads] = useState<WorkflowLead[]>([])
  const [workflowStats, setWorkflowStats] = useState<WorkflowStats | null>(null)
  const [lastWorkflowType, setLastWorkflowType] = useState<'hebdomadaire' | 'mensuel' | null>(null)
  const [addingLead, setAddingLead] = useState<string | null>(null)
  const [existingPhones, setExistingPhones] = useState<Set<string>>(new Set())

  function normPhone(p: string | null | undefined) { return (p ?? '').replace(/[\s.\-]/g, '') }

  useEffect(() => {
    async function loadChefs() {
      try {
        const [chefsRes, allRes] = await Promise.all([
          fetch('/api/prospects?source=chefs_entreprise&limit=50'),
          fetch('/api/prospects?limit=200'),
        ])
        const chefsData = await chefsRes.json()
        const allData = await allRes.json()
        if (chefsData.success) setChefs(chefsData.data ?? [])
        if (allData.success && Array.isArray(allData.data)) {
          const phones = new Set<string>()
          allData.data.forEach((p: { phone?: string | null }) => {
            if (p.phone) phones.add(normPhone(p.phone))
          })
          setExistingPhones(phones)
        }
      } catch { /* silently */ }
      finally { setChefsLoading(false) }
    }
    loadChefs()
  }, [])

  const stats = {
    contacts: chefs.length,
    enCours: chefs.filter(c => c.pipeline_stage && !['a_contacter', 'converti', 'perdu'].includes(c.pipeline_stage)).length,
    convertis: chefs.filter(c => c.pipeline_stage === 'converti').length,
    aum: '—',
  }

  async function handleAdd() {
    if (!form.nom || !form.entreprise) return
    try {
      const res = await fetch('/api/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.nom,
          company: form.entreprise,
          city: form.ville,
          phone: form.telephone,
          source: 'chefs_entreprise',
          notes: form.ca ? `CA: ${form.ca}` : '',
        }),
      })
      const data = await res.json()
      if (data.success && data.data) setChefs(prev => [data.data, ...prev])
    } catch { /* silently */ }
    setForm({ nom: '', entreprise: '', secteur: SECTEURS[0], ville: '', ca: '', effectif: '', telephone: '' })
    setShowForm(false)
  }

  async function runWorkflow(type: 'hebdomadaire' | 'mensuel') {
    setWorkflowLoading(type)
    setWorkflowError(null)
    try {
      const res = await fetch('/api/prospection/chefs/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error ?? 'Erreur workflow')
      setWorkflowLeads(data.data.leads ?? [])
      setWorkflowStats(data.data.stats ?? null)
      setLastWorkflowType(type)
      setAcqTab('tableau')
    } catch (err) {
      setWorkflowError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setWorkflowLoading(null)
    }
  }

  async function addLeadToCRM(lead: WorkflowLead) {
    setAddingLead(lead.id)
    try {
      const res = await fetch('/api/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: lead.nom,
          company: lead.nom,
          city: lead.ville,
          phone: lead.phone ?? '',
          source: 'chefs_entreprise',
          tags: [lead.signal],
          notes: `Forme: ${lead.forme} · Création: ${lead.dateCreation ?? 'N/A'} · Signal: ${lead.signalLabel}`,
        }),
      })
      const json = await res.json()
      if (res.status === 409) {
        setWorkflowLeads(prev => prev.map(l => l.id === lead.id ? { ...l, signal: 'duplicate', signalLabel: 'Déjà en base' } : l))
      } else if (json.success) {
        if (lead.phone) setExistingPhones(prev => new Set([...prev, normPhone(lead.phone)]))
        setWorkflowLeads(prev => prev.filter(l => l.id !== lead.id))
        const chefsRes = await fetch('/api/prospects?source=chefs_entreprise&limit=50')
        const chefsData = await chefsRes.json()
        if (chefsData.success) setChefs(chefsData.data ?? [])
      }
    } catch { /* silently */ }
    finally { setAddingLead(null) }
  }

  const filtered = chefs.filter(c =>
    !search ||
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.company ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (c.city ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap')"}</style>

      {/* Main tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${C.line}`, paddingBottom: 0, marginBottom: 14 }}>
        {([
          { key: 'portefeuille' as const, label: 'Portefeuille Actuel', icon: '📋' },
          { key: 'acquisition' as const, label: 'Acquisition Data.gouv', icon: '🚀' },
        ]).map(t => {
          const active = mainTab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setMainTab(t.key)}
              style={{
                flex: 1, padding: '10px 14px', borderRadius: '8px 8px 0 0', border: 'none',
                background: active ? '#1a1400' : C.surface1,
                color: active ? C.gold : C.textLo,
                fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: active ? 600 : 500,
                cursor: 'pointer', borderBottom: active ? `2px solid ${C.gold}` : `2px solid transparent`,
                letterSpacing: '0.06em',
              }}
            >
              {t.icon} {t.label}
            </button>
          )
        })}
      </div>

      {/* Liens transversaux après tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, justifyContent: 'center' }}>
        <LinkChip href={buildHref('/crm', { source: 'chefs_entreprise' })} label="CRM Chefs" color="gold" />
        <LinkChip href={buildHref('/today', { tab: 'prospection' })} label="Today" color="cyan" />
        <LinkChip href="/scoring" label="Scoring" color="indigo" />
      </div>

      {/* PORTEFEUILLE TAB */}
      {mainTab === 'portefeuille' && (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            {[
              { label: 'Contacts', val: stats.contacts, sub: 'Base clients', accent: C.indigo },
              { label: 'En cours', val: stats.enCours, sub: 'Prospection', accent: C.gold },
              { label: 'Convertis', val: stats.convertis, sub: 'Clients actifs', accent: C.green },
              { label: 'AUM Total', val: stats.aum, sub: 'Non disponible', accent: C.cyan },
            ].map(k => (
              <div key={k.label} style={{ background: `linear-gradient(180deg,${C.surface2},${C.surface1})`, border: `1px solid ${C.line}`, borderRadius: 10, padding: '12px 14px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: k.accent, opacity: 0.55 }} />
                <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7.5, color: C.textLo, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{k.label}</div>
                <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 26, fontWeight: 600, color: C.textHi, lineHeight: 1, marginBottom: 2 }}>{k.val}</div>
                <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: k.accent }}>{k.sub}</div>
              </div>
            ))}
          </div>

          <Panel accent={C.gold}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
              <PanelTitle title="Chefs d'entreprise — Portefeuille actuel" accent={C.gold} />
              <div style={{ flex: 1 }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher..."
                style={{ padding: '6px 10px', background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 6, color: C.text, fontSize: 9, fontFamily: 'JetBrains Mono,monospace', outline: 'none', width: 160 }}
              />
              <button
                onClick={() => setShowForm(v => !v)}
                style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${C.gold}60`, background: showForm ? '#1a1400' : 'transparent', color: C.gold, fontFamily: 'Oswald,sans-serif', fontSize: 10, cursor: 'pointer', letterSpacing: '0.08em' }}
              >
                {showForm ? '✕ Annuler' : '+ Ajouter'}
              </button>
            </div>

            {/* Add form */}
            {showForm && (
              <div style={{ background: C.surface2, borderRadius: 10, padding: 14, marginBottom: 14, border: `1px solid ${C.gold}40`, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                {[
                  { key: 'nom', label: 'Nom complet', placeholder: 'M. Jean Dupont' },
                  { key: 'entreprise', label: 'Entreprise', placeholder: 'Dupont SARL' },
                  { key: 'ville', label: 'Ville', placeholder: 'Paris' },
                  { key: 'ca', label: 'CA estimé', placeholder: '500k€' },
                  { key: 'effectif', label: 'Effectif', placeholder: '10 salariés' },
                  { key: 'telephone', label: 'Téléphone', placeholder: '06 XX XX XX XX' },
                ].map(f => (
                  <div key={f.key}>
                    <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, marginBottom: 4 }}>{f.label}</div>
                    <input
                      placeholder={f.placeholder}
                      value={(form as Record<string, string>)[f.key]}
                      onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      style={{ width: '100%', padding: '7px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.text, fontSize: 9, outline: 'none', boxSizing: 'border-box' as const }}
                    />
                  </div>
                ))}
                <div>
                  <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, marginBottom: 4 }}>Secteur</div>
                  <select
                    value={form.secteur}
                    onChange={e => setForm(prev => ({ ...prev, secteur: e.target.value }))}
                    style={{ width: '100%', padding: '7px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.text, fontSize: 9, outline: 'none' }}
                  >
                    {SECTEURS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gridColumn: 'span 2' }}>
                  <button
                    onClick={handleAdd}
                    style={{ width: '100%', padding: '9px 0', borderRadius: 7, border: 'none', background: `linear-gradient(135deg,${C.gold},#b89840)`, color: C.bgDeep, fontFamily: 'Oswald,sans-serif', fontWeight: 700, fontSize: 12, cursor: 'pointer', letterSpacing: '0.08em' }}
                  >
                    ✅ AJOUTER AU PIPELINE
                  </button>
                </div>
              </div>
            )}

            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, marginBottom: 10 }}>
              Clients &amp; prospects en cours
            </div>

            {/* Chefs rows */}
            {chefsLoading ? (
              <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo, padding: '24px', textAlign: 'center' }}>Chargement…</div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>👔</div>
                <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 14, color: C.textMid, marginBottom: 6 }}>Portefeuille vide</div>
                <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 11, color: C.textLo }}>Ajoutez des leads depuis l&apos;onglet Acquisition ou via &quot;+ Ajouter&quot;</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {filtered.map(chef => {
                  const initials = chef.full_name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '??'
                  const stageColor = STATUS_COLORS[chef.pipeline_stage ?? ''] ?? C.indigo
                  return (
                    <div key={chef.id} onClick={() => setSelectedProspect({ id: chef.id, nom: chef.full_name, entreprise: chef.company ?? undefined, ville: chef.city ?? undefined, telephone: chef.phone ?? null, email: chef.email ?? null, source: chef.source ?? undefined })} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: C.surface2, borderRadius: 8, border: `1px solid ${C.lineSoft}`, cursor: 'pointer' }}>
                      <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: stageColor + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 700, color: stageColor, border: `1px solid ${stageColor}40` }}>
                        {initials}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 13, color: C.textHi, fontWeight: 500, marginBottom: 2 }}>{chef.full_name}</div>
                        <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo }}>
                          {[chef.company, chef.city].filter(Boolean).join(' · ')}
                          {chef.phone && <> · <a href={`tel:${chef.phone}`} onClick={e => e.stopPropagation()} style={{ color: C.gold, textDecoration: 'none' }}>{chef.phone}</a></>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 3 }}>
                        <ActionBtn type="LI" />
                        <ActionBtn type="email" />
                      </div>
                      {chef.pipeline_stage && (
                        <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, fontWeight: 600, borderRadius: 6, padding: '3px 8px', background: stageColor + '20', color: stageColor, border: `1px solid ${stageColor}44`, whiteSpace: 'nowrap' as const }}>
                          {chef.pipeline_stage}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </Panel>
        </>
      )}

      {/* ACQUISITION TAB */}
      {mainTab === 'acquisition' && (
        <>
          {/* Sub-tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, borderBottom: `1px solid ${C.lineSoft}`, paddingBottom: 6 }}>
            {([
              { key: 'pipeline' as const, label: '📊 Pipeline' },
              { key: 'tableau' as const, label: '📋 Tableau' },
              { key: 'prospection' as const, label: '🚀 Workflow' },
            ]).map(t => {
              const active = acqTab === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => setAcqTab(t.key)}
                  style={{
                    flex: 1, padding: '7px 10px', borderRadius: 6, border: active ? `1px solid ${C.gold}60` : `1px solid ${C.line}`,
                    background: active ? '#1a1400' : C.surface2,
                    color: active ? C.gold : C.textLo,
                    fontFamily: 'Oswald,sans-serif', fontSize: 10, fontWeight: active ? 600 : 400, cursor: 'pointer',
                  }}
                >
                  {t.label}
                </button>
              )
            })}
          </div>

          {/* PIPELINE Kanban — alimenté par workflowLeads */}
          {acqTab === 'pipeline' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
              {[
                { key: 'creation', label: '🏢 Créations', color: C.green, count: workflowLeads.filter(l => l.signal === 'creation').length },
                { key: 'cession', label: '💰 Cessions', color: C.cyan, count: workflowLeads.filter(l => l.signal === 'cession').length },
                { key: 'holding', label: '🏛️ Holdings', color: C.purple, count: workflowLeads.filter(l => l.signal === 'holding').length },
                { key: 'dividendes', label: '💎 Dividendes', color: C.gold, count: workflowLeads.filter(l => l.signal === 'dividendes').length },
                { key: 'senior', label: '👴 55+', color: C.indigo, count: workflowLeads.filter(l => l.signal === 'senior').length },
              ].map(col => (
                <div key={col.key} style={{ background: C.surface1, borderRadius: 8, padding: 10, border: `1px solid ${C.line}` }}>
                  <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 9, fontWeight: 600, color: C.textLo, textTransform: 'uppercase', marginBottom: 8, display: 'flex', justifyContent: 'space-between', letterSpacing: '0.1em' }}>
                    <span>{col.label}</span>
                    <span style={{ background: C.surface2, padding: '2px 6px', borderRadius: 8, fontSize: 8 }}>{col.count}</span>
                  </div>
                  {workflowLeads.filter(l => l.signal === col.key).length === 0 ? (
                    <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textVlo, padding: '12px 0', textAlign: 'center' }}>Lance un workflow</div>
                  ) : (
                    workflowLeads.filter(l => l.signal === col.key).map(lead => (
                      <PipelineCard
                        key={lead.id}
                        nom={lead.nom}
                        siret={lead.siren ?? '—'}
                        info={`${lead.forme} · ${lead.ville}`}
                        score={lead.score}
                        scoreColor={lead.scoreColor}
                        scoreBg={lead.scoreColor + '15'}
                        urgence={lead.urgence}
                        borderColor={col.color}
                      />
                    ))
                  )}
                </div>
              ))}
            </div>
          )}

          {/* TABLEAU */}
          {acqTab === 'tableau' && (
            <Panel accent={C.indigo}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <PanelTitle title={workflowLeads.length > 0 ? `Leads workflow (${workflowLeads.length})` : 'Tableau leads'} accent={C.indigo} />
                {workflowStats && (
                  <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo }}>
                    {lastWorkflowType === 'hebdomadaire' ? 'Workflow hebdo' : 'Workflow mensuel'} · {new Date(workflowStats.dateExecution).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              {workflowLeads.length === 0 ? (
                <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo, padding: '20px', textAlign: 'center' }}>
                  Lance un workflow pour voir les leads ici
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 500, overflowY: 'auto' }}>
                  {workflowLeads.map(lead => (
                    <div key={lead.id} onClick={() => setSelectedProspect({ id: lead.id, nom: lead.nom, siren: lead.siren, ville: lead.ville, codePostal: lead.codePostal, signal: lead.signal, signalLabel: lead.signalLabel, score: lead.score, scoreColor: lead.scoreColor, source: 'Data.gouv' })} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: C.surface2, borderRadius: 7, borderLeft: `3px solid ${lead.scoreColor}`, cursor: 'pointer' }}>
                      {lead.urgence && (
                        <span style={{ background: C.cyan, color: '#fff', padding: '1px 5px', borderRadius: 5, fontSize: 7, fontWeight: 700, flexShrink: 0 }}>⚡</span>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 11, color: C.textHi, fontWeight: 600, marginBottom: 1 }}>{lead.nom}</div>
                        <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo }}>
                          {lead.forme} · {lead.ville}{lead.codePostal ? ` (${lead.codePostal})` : ''}{lead.dateCreation ? ` · Créé ${new Date(lead.dateCreation).toLocaleDateString('fr-FR')}` : ''}
                        </div>
                      </div>
                      <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, padding: '2px 7px', borderRadius: 6, background: lead.scoreColor + '20', color: lead.scoreColor, border: `1px solid ${lead.scoreColor}40`, whiteSpace: 'nowrap' as const }}>
                        {lead.signalLabel}
                      </span>
                      <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, padding: '2px 6px', borderRadius: 6, background: lead.scoreColor + '15', color: lead.scoreColor, fontWeight: 700 }}>
                        {lead.score}/10
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); addLeadToCRM(lead) }}
                        disabled={addingLead === lead.id}
                        style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, padding: '4px 8px', borderRadius: 5, border: `1px solid #4ade8040`, background: '#0a140a', color: C.green, cursor: addingLead === lead.id ? 'not-allowed' : 'pointer', flexShrink: 0 }}
                      >
                        {addingLead === lead.id ? '...' : '+ CRM'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          )}

          {/* WORKFLOW */}
          {acqTab === 'prospection' && (
            <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Error banner */}
              {workflowError && (
                <div style={{ background: '#1a0d0d', border: `1px solid #ff647060`, borderRadius: 8, padding: '10px 14px', fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: '#ff6470', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>⚠️</span>
                  <span>{workflowError}</span>
                </div>
              )}
              {/* Title */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 18, color: C.gold, fontWeight: 600, marginBottom: 4, letterSpacing: '0.06em' }}>PROSPECTION AUTOMATISÉE</div>
                <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo }}>Workflows Data.gouv + Pappers · Limite 150 leads/semaine</div>
              </div>

              {/* Hebdomadaire */}
              <Panel accent={C.gold} style={{ border: `1px solid ${C.gold}40` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 13, fontWeight: 700, color: C.gold, letterSpacing: '0.06em' }}>📅 WORKFLOW HEBDOMADAIRE</div>
                  <span style={{ background: '#1a1400', color: C.gold, padding: '2px 8px', borderRadius: 8, fontSize: 8, fontFamily: 'JetBrains Mono,monospace', fontWeight: 600 }}>CHAQUE LUNDI 8H</span>
                </div>

                <div style={{ background: C.surface2, borderRadius: 7, padding: 10, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {[
                    {
                      label: 'Dernière exécution :',
                      val: lastWorkflowType === 'hebdomadaire' && workflowStats
                        ? new Date(workflowStats.dateExecution).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
                        : '—',
                      color: C.green,
                    },
                    {
                      label: 'Prochaine exécution :',
                      val: lastWorkflowType === 'hebdomadaire' && workflowStats
                        ? new Date(workflowStats.prochaine).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
                        : 'Lundi prochain 8h00',
                      color: C.gold,
                    },
                    {
                      label: 'Signaux détectés :',
                      val: lastWorkflowType === 'hebdomadaire' && workflowStats
                        ? `${workflowStats.total} leads (${workflowStats.creations ?? 0} créations + ${workflowStats.cessions ?? 0} cessions)`
                        : '—',
                      color: C.textHi,
                    },
                  ].map(r => (
                    <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo }}>{r.label}</span>
                      <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: r.color, fontWeight: 600 }}>{r.val}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <div style={{ background: '#0a1f0a', border: `1px solid #4ade8030`, borderRadius: 7, padding: 10 }}>
                    <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, marginBottom: 3 }}>🏢 Signal 1</div>
                    <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 600, color: C.green, marginBottom: 2 }}>Créations récentes</div>
                    <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7.5, color: C.textLo }}>SASU/SAS/SARL &lt; 30j · Capital &gt; 10k€</div>
                  </div>
                  <div style={{ background: '#1a0d0d', border: `1px solid #ff647030`, borderRadius: 7, padding: 10, position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 6, right: 6, background: C.cyan, color: '#fff', padding: '2px 6px', borderRadius: 6, fontSize: 7, fontWeight: 700 }}>⚡ 48H</div>
                    <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, marginBottom: 3 }}>💰 Signal 2</div>
                    <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 600, color: C.cyan, marginBottom: 2 }}>Cessions BODACC</div>
                    <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7.5, color: C.textLo }}>Urgence maximale · Fenêtre J-90</div>
                  </div>
                </div>

                <button
                  onClick={() => runWorkflow('hebdomadaire')}
                  disabled={workflowLoading !== null}
                  style={{ width: '100%', padding: 12, background: `linear-gradient(135deg,#1a1400,#2a2200)`, border: `1px solid ${C.gold}`, color: C.gold, borderRadius: 7, fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 700, cursor: workflowLoading !== null ? 'not-allowed' : 'pointer', letterSpacing: '0.1em', opacity: workflowLoading !== null ? 0.6 : 1 }}
                >
                  {workflowLoading === 'hebdomadaire' ? '⏳ ANALYSE EN COURS...' : '🚀 LANCER WORKFLOW HEBDOMADAIRE'}
                </button>
              </Panel>

              {/* Mensuel */}
              <Panel accent={C.purple} style={{ border: `1px solid ${C.purple}40` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 13, fontWeight: 700, color: C.purple, letterSpacing: '0.06em' }}>📆 WORKFLOW MENSUEL</div>
                  <span style={{ background: '#140d1e', color: C.purple, padding: '2px 8px', borderRadius: 8, fontSize: 8, fontFamily: 'JetBrains Mono,monospace', fontWeight: 600 }}>1ER LUNDI DU MOIS 8H</span>
                </div>

                <div style={{ background: C.surface2, borderRadius: 7, padding: 10, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {[
                    {
                      label: 'Dernière exécution :',
                      val: lastWorkflowType === 'mensuel' && workflowStats
                        ? new Date(workflowStats.dateExecution).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
                        : '—',
                      color: C.green,
                    },
                    {
                      label: 'Prochaine exécution :',
                      val: lastWorkflowType === 'mensuel' && workflowStats
                        ? new Date(workflowStats.prochaine).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
                        : '1er lundi du mois 8h00',
                      color: C.purple,
                    },
                    {
                      label: 'Signaux détectés :',
                      val: lastWorkflowType === 'mensuel' && workflowStats
                        ? `${workflowStats.total} leads (${workflowStats.holdings ?? 0} holdings + ${workflowStats.dividendes ?? 0} dividendes + ${workflowStats.seniors ?? 0} dirigeants 55+)`
                        : '—',
                      color: C.textHi,
                    },
                  ].map(r => (
                    <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo }}>{r.label}</span>
                      <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: r.color, fontWeight: 600 }}>{r.val}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                  <div style={{ background: '#140d1e', border: `1px solid ${C.purple}30`, borderRadius: 7, padding: 8, position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 4, right: 4, background: C.purple, color: '#fff', padding: '1px 5px', borderRadius: 5, fontSize: 7, fontWeight: 700 }}>⚡ 48H</div>
                    <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7.5, color: C.textLo, marginBottom: 2 }}>🏛️ Signal 3</div>
                    <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 600, color: C.purple, marginBottom: 2 }}>Holdings</div>
                    <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7, color: C.textLo }}>NAF 6420Z &lt; 60j</div>
                  </div>
                  <div style={{ background: '#1a1400', border: `1px solid ${C.gold}30`, borderRadius: 7, padding: 8 }}>
                    <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7.5, color: C.textLo, marginBottom: 2 }}>💎 Signal 4</div>
                    <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 600, color: C.gold, marginBottom: 2 }}>Dividendes</div>
                    <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7, color: C.textLo }}>Distribution &gt; 150k€</div>
                  </div>
                  <div style={{ background: '#0d1a2e', border: `1px solid ${C.indigo}30`, borderRadius: 7, padding: 8 }}>
                    <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7.5, color: C.textLo, marginBottom: 2 }}>👴 Signal 5</div>
                    <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 600, color: C.indigo, marginBottom: 2 }}>55+ ans</div>
                    <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7, color: C.textLo }}>PME 500k-10M€</div>
                  </div>
                </div>

                <button
                  onClick={() => runWorkflow('mensuel')}
                  disabled={workflowLoading !== null}
                  style={{ width: '100%', padding: 12, background: `linear-gradient(135deg,#140d1e,#1e0d2e)`, border: `1px solid ${C.purple}`, color: C.purple, borderRadius: 7, fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 700, cursor: workflowLoading !== null ? 'not-allowed' : 'pointer', letterSpacing: '0.1em', opacity: workflowLoading !== null ? 0.6 : 1 }}
                >
                  {workflowLoading === 'mensuel' ? '⏳ ANALYSE EN COURS...' : '🚀 LANCER WORKFLOW MENSUEL'}
                </button>
              </Panel>

              {/* Alertes urgence */}
              <div style={{ background: '#1a0d0d', border: `1px solid ${C.cyan}`, borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ fontSize: 20 }}>⚡</div>
                  <div>
                    <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 700, color: C.cyan, letterSpacing: '0.06em' }}>ALERTES URGENCE 48H</div>
                    <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo }}>Les leads suivants nécessitent un traitement immédiat</div>
                  </div>
                </div>
                <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8.5, color: C.textMid, lineHeight: 1.7 }}>
                  <strong style={{ color: C.cyan }}>Signal 2 (Cessions BODACC)</strong> : Fenêtre d&apos;opportunité J-90. Les concurrents (banques privées, notaires) vont contacter le dirigeant. Traiter dans les 48h.
                  <br />
                  <strong style={{ color: C.purple }}>Signal 3 (Holdings)</strong> : Événement patrimonial majeur en cours (cession, transmission). Le dirigeant est déjà dans une démarche structurée. Contacter rapidement.
                </div>
              </div>

              {/* Rythme recommandé */}
              <div style={{ background: '#0a1929', border: `1px solid #0a66c240`, borderRadius: 10, padding: 14 }}>
                <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 11, color: '#4a90d9', fontWeight: 600, marginBottom: 8, letterSpacing: '0.06em' }}>💡 RYTHME RECOMMANDÉ</div>
                <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8.5, color: C.textMid, lineHeight: 1.8 }}>
                  <strong style={{ color: C.textHi }}>Hebdomadaire (chaque lundi 8h)</strong> : Signaux 1 &amp; 2 (créations + cessions BODACC). Données mises à jour chaque semaine.<br />
                  <strong style={{ color: C.textHi }}>Mensuel (1er lundi du mois 8h)</strong> : Signaux 3, 4 &amp; 5 (holdings + dividendes + dirigeants 55+). Données moins volatiles.<br />
                  <strong style={{ color: '#4a90d9' }}>⚙️ Configuration :</strong> Clé API Pappers à ajouter dans Paramètres
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {selectedProspect && (
        <ProspectCard
          prospect={selectedProspect}
          onClose={() => setSelectedProspect(null)}
          onAddToCRM={async (p) => {
            await fetch('/api/prospects', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                full_name: p.nom,
                company: p.entreprise ?? '',
                city: p.ville ?? '',
                phone: p.telephone ?? '',
                email: p.email ?? '',
                source: 'chefs_entreprise',
                notes: p.signalLabel ? `Signal: ${p.signalLabel}` : '',
              }),
            })
            const res = await fetch('/api/prospects?source=chefs_entreprise&limit=50')
            const data = await res.json()
            if (data.success) setChefs(data.data ?? [])
          }}
        />
      )}
    </>
  )
}
