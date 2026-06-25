'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { C } from '@/lib/theme'
import { openWhatsApp, openLinkedIn } from '@/lib/sequences/client-actions'
import ProspectEditForm from '@/components/prospects/ProspectEditForm'
import { saveLastSection } from '@/lib/navigation-state'

// --- TYPES ---
type Stage = 'À contacter' | 'RDV1' | 'RDV2' | 'RDV3' | 'Converti' | 'Perdu'
type PressureLevel = 'low' | 'medium' | 'high' | 'max'

interface Prospect {
  id: string
  nom: string
  initials: string
  profession: string
  ville: string
  telephone: string
  email: string
  stage: Stage
  leadScore: number
  nextAction: string
  notes: string
  tags: string[]
  source: string
  lastContact: string
  pressure: PressureLevel
}

// --- DATA ---
const STAGES: Stage[] = ['À contacter', 'RDV1', 'RDV2', 'RDV3', 'Converti', 'Perdu']

const STAGE_COLORS: Record<Stage, string> = {
  'À contacter': C.indigo,
  'RDV1':        C.gold,
  'RDV2':        '#9a7acc',
  'RDV3':        C.warn,
  'Converti':    C.green,
  'Perdu':       C.textLo,
}

const PRESSURE_COLORS: Record<PressureLevel, string> = {
  low:    C.green,
  medium: C.gold,
  high:   C.warn,
  max:    C.cyan,
}

// HTML-sourced prospects merged with existing rich data
const INITIAL_PROSPECTS: Prospect[] = [
  // À contacter — from HTML
  {
    id: 'p1', nom: 'P. Rousseau', initials: 'PR', profession: 'Médecin gén.', ville: 'Paris 16e',
    telephone: '01 45 00 XX XX', email: 'p.rousseau@cabinet.fr', stage: 'À contacter',
    leadScore: 90, nextAction: 'Appel découverte', notes: 'Jamais contacté. Cabinet solo.',
    tags: ['TNS', 'Médecin'], source: 'Google Places', lastContact: '—', pressure: 'low',
  },
  {
    id: 'p2', nom: 'S. Moreau', initials: 'SM', profession: 'Sophrologue', ville: 'Neuilly-s-S.',
    telephone: '01 47 22 XX XX', email: 's.moreau@cabinet.fr', stage: 'À contacter',
    leadScore: 82, nextAction: 'Email intro', notes: 'Il y a 3j. Revenu estimé 90k+.',
    tags: ['TNS', 'Santé'], source: 'Google Places', lastContact: 'il y a 3j', pressure: 'low',
  },
  {
    id: 'p3', nom: 'B. Girard', initials: 'BG', profession: 'Ostéopathe', ville: 'Aulnay-s-Bois',
    telephone: '01 48 66 XX XX', email: 'b.girard@cabinet.fr', stage: 'À contacter',
    leadScore: 68, nextAction: 'Premier contact', notes: 'Il y a 1j. Nouveau cabinet.',
    tags: ['TNS', 'Kiné'], source: 'Google Places', lastContact: 'il y a 1j', pressure: 'low',
  },
  // RDV1
  {
    id: 'p4', nom: 'F. Dubois', initials: 'FD', profession: 'Kinésithérapeute', ville: 'Boulogne-B.',
    telephone: '01 46 05 XX XX', email: 'f.dubois@cabinet.fr', stage: 'RDV1',
    leadScore: 78, nextAction: 'RDV jeudi 15h', notes: 'RDV jeu. 15h confirmé.',
    tags: ['TNS', 'Kiné'], source: 'Google Places', lastContact: 'RDV jeu. 15h', pressure: 'medium',
  },
  {
    id: 'p5', nom: 'A. Petit', initials: 'AP', profession: "Chef d'entreprise", ville: 'Paris 8e',
    telephone: '01 53 34 XX XX', email: 'a.petit@holding.fr', stage: 'RDV1',
    leadScore: 88, nextAction: 'Étude patrimoniale', notes: 'Il y a 4j. CA 2M. Très motivé.',
    tags: ['Chef entreprise', 'VIP'], source: 'Import manuel', lastContact: 'il y a 4j', pressure: 'medium',
  },
  {
    id: 'p6', nom: 'M. Lefort', initials: 'ML', profession: 'Infirmière lib.', ville: 'Aulnay-s-Bois',
    telephone: '01 48 77 XX XX', email: 'm.lefort@soin.fr', stage: 'RDV1',
    leadScore: 62, nextAction: 'Relance WA', notes: '5j sans réponse. Urgence relance.',
    tags: ['TNS', 'Infirmière'], source: 'Google Places', lastContact: '5j sans rép.', pressure: 'high',
  },
  // RDV2
  {
    id: 'p7', nom: 'Dr. Martin', initials: 'DM', profession: 'Chirurgien', ville: 'Vincennes',
    telephone: '01 43 28 XX XX', email: 'dr.martin@chir.fr', stage: 'RDV2',
    leadScore: 94, nextAction: 'Proposition', notes: '5j sans réponse. Dossier prêt.',
    tags: ['TNS', 'Médecin', 'VIP'], source: 'Google Places', lastContact: '5j sans rép.', pressure: 'max',
  },
  {
    id: 'p8', nom: 'C. Blanc', initials: 'CB', profession: 'Infirmière lib.', ville: 'Montreuil',
    telephone: '01 48 59 XX XX', email: 'c.blanc@soin.fr', stage: 'RDV2',
    leadScore: 70, nextAction: 'Dossier à envoyer', notes: 'Il y a 2j. Dossier AV en cours.',
    tags: ['TNS', 'Infirmière'], source: 'Google Places', lastContact: 'il y a 2j', pressure: 'high',
  },
  // RDV3
  {
    id: 'p9', nom: 'L. Chen', initials: 'LC', profession: 'Pharmacienne', ville: 'Paris 6e',
    telephone: '01 43 26 XX XX', email: 'l.chen@pharma.fr', stage: 'RDV3',
    leadScore: 92, nextAction: 'Proposition finale', notes: 'RDV mer. 16h. Accord de principe.',
    tags: ['TNS', 'Pharma', 'VIP'], source: 'Import manuel', lastContact: 'RDV mer. 16h', pressure: 'high',
  },
  {
    id: 'p10', nom: 'J. Barré', initials: 'JB', profession: 'Radiologue', ville: 'Vincennes',
    telephone: '01 43 74 XX XX', email: 'j.barre@radio.fr', stage: 'RDV3',
    leadScore: 85, nextAction: 'Closing RDV 3', notes: 'Il y a 1j. Très motivé.',
    tags: ['TNS', 'Médecin'], source: 'Google Places', lastContact: 'il y a 1j', pressure: 'max',
  },
  // Convertis
  {
    id: 'p11', nom: 'M. Bernard', initials: 'MB', profession: 'Dentiste', ville: 'Paris 15e',
    telephone: '01 45 78 XX XX', email: 'm.bernard@dental.fr', stage: 'Converti',
    leadScore: 96, nextAction: 'Ass. vie + PER', notes: '4 200 €/an. Client satisfait.',
    tags: ['TNS', 'Dentiste', 'VIP'], source: 'Import manuel', lastContact: '4 200 €/an', pressure: 'low',
  },
  {
    id: 'p12', nom: 'T. Nguyen', initials: 'TN', profession: 'Infirmière lib.', ville: 'Saint-Denis',
    telephone: '01 48 22 XX XX', email: 't.nguyen@soin.fr', stage: 'Converti',
    leadScore: 78, nextAction: 'Prévoyance', notes: '2 800 €/an. Suivi portefeuille.',
    tags: ['TNS', 'Infirmière'], source: 'Import CSV', lastContact: '2 800 €/an', pressure: 'low',
  },
  // Perdu
  {
    id: 'p13', nom: 'J. Lambert', initials: 'JL', profession: 'Ostéopathe', ville: 'Versailles',
    telephone: '01 39 50 XX XX', email: 'j.lambert@osteo.fr', stage: 'Perdu',
    leadScore: 55, nextAction: 'Relance 3 mois', notes: 'A choisi un concurrent. Relance dans 3 mois.',
    tags: ['TNS', 'Kiné'], source: 'Google Places', lastContact: 'Concurrent', pressure: 'low',
  },
]

// --- DB ↔ UI STAGE MAPPING ---
const DB_TO_UI: Record<string, Stage> = {
  a_contacter: 'À contacter',
  rdv1: 'RDV1',
  rdv2: 'RDV2',
  rdv3: 'RDV3',
  converti: 'Converti',
  perdu: 'Perdu',
}
const UI_TO_DB: Record<Stage, string> = {
  'À contacter': 'a_contacter',
  'RDV1': 'rdv1',
  'RDV2': 'rdv2',
  'RDV3': 'rdv3',
  'Converti': 'converti',
  'Perdu': 'perdu',
}

// --- TYPES SÉQUENCES ---
type SeqChannel = 'whatsapp' | 'email' | 'sms' | 'call_reminder' | 'linkedin'
type SeqStepStatus = 'pending' | 'sent' | 'failed' | 'skipped'
type SeqStatus = 'active' | 'paused' | 'completed' | 'cancelled'

type SeqStep = {
  id: string
  step_order: number
  channel: SeqChannel
  scheduled_at: string
  executed_at: string | null
  status: SeqStepStatus
  error_message: string | null
}

type SeqInstance = {
  id: string
  status: SeqStatus
  started_at: string
  template_name: string | null
  steps: SeqStep[]
}

type SeqTemplate = {
  id: string
  name: string
}

function stepStatusColor(s: SeqStepStatus): string {
  if (s === 'sent') return C.green
  if (s === 'failed') return C.warn
  if (s === 'pending') return C.gold
  return C.textLo  // skipped
}

const CHANNEL_LABEL: Record<SeqChannel, string> = {
  whatsapp: 'WhatsApp',
  email: 'Email',
  sms: 'SMS',
  call_reminder: 'Appel',
  linkedin: 'LinkedIn',
}

// --- HELPERS ---
function scoreColor(s: number) {
  return s >= 80 ? C.green : s >= 60 ? C.gold : C.cyan
}

// --- PROSPECT CARD (draggable) ---
function ProspectCard({
  prospect, onClick,
}: {
  prospect: Prospect
  onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: sortDragging } = useSortable({ id: prospect.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: sortDragging ? 0.3 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={onClick}>
      <CardContent prospect={prospect} />
    </div>
  )
}

function CardContent({ prospect, isDragging }: { prospect: Prospect; isDragging?: boolean }) {
  const pressureColor = PRESSURE_COLORS[prospect.pressure]
  return (
    <div style={{
      background: C.surface2,
      border: `1px solid ${isDragging ? C.gold : C.line}`,
      borderLeft: `3px solid ${STAGE_COLORS[prospect.stage]}`,
      borderRadius: 8, padding: '10px 12px', cursor: 'grab',
      marginBottom: 8, userSelect: 'none',
      boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.5)' : 'none',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          {/* Avatar */}
          <div style={{
            width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
            background: STAGE_COLORS[prospect.stage] + '30',
            border: `1px solid ${STAGE_COLORS[prospect.stage]}60`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 8, fontWeight: 700, color: STAGE_COLORS[prospect.stage],
          }}>{prospect.initials}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{prospect.nom}</div>
        </div>
        <div style={{
          fontSize: 10, fontWeight: 700, color: scoreColor(prospect.leadScore),
          background: scoreColor(prospect.leadScore) + '22',
          borderRadius: 4, padding: '1px 5px',
        }}>{prospect.leadScore}</div>
      </div>
      <div style={{ fontSize: 10, color: C.textLo, marginBottom: 5 }}>
        {prospect.profession} — {prospect.ville}
      </div>
      <div style={{ fontSize: 10, color: C.gold, marginBottom: 5 }}>⚡ {prospect.nextAction}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {prospect.tags.slice(0, 2).map(t => (
            <span key={t} style={{
              fontSize: 8, padding: '1px 5px', borderRadius: 3,
              background: C.surface3, color: C.green, border: `1px solid ${C.green}33`,
            }}>{t}</span>
          ))}
        </div>
        {/* Pressure dot */}
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: pressureColor, flexShrink: 0 }} />
      </div>
    </div>
  )
}

// --- Calcul auto pression depuis séquences ---
function computeAutoPressure(instances: SeqInstance[]): PressureLevel {
  const active = instances.filter(i => i.status === 'active')
  if (active.length === 0) return 'low'
  const now = new Date()
  let hasOverdue = false
  let hasFailed = false
  for (const inst of active) {
    for (const step of inst.steps) {
      if (step.status === 'failed') hasFailed = true
      if (step.status === 'pending' && new Date(step.scheduled_at) < now) hasOverdue = true
    }
  }
  if (active.length >= 2 && (hasFailed || hasOverdue)) return 'max'
  if (hasFailed || hasOverdue) return 'high'
  if (active.length >= 2) return 'high'
  return 'medium'
}

const PRESSURE_META: Record<PressureLevel, { label: string; sub: string }> = {
  low:    { label: 'À jour',   sub: 'Aucune urgence' },
  medium: { label: 'À suivre', sub: 'Séquence active' },
  high:   { label: 'Urgent',   sub: 'Relance requise' },
  max:    { label: 'Critique', sub: 'Action immédiate' },
}

// --- DRAWER ---
function ProspectDrawer({ prospect, onClose, onStageChange, onPressureChange, onProspectUpdated }: {
  prospect: Prospect
  onClose: () => void
  onStageChange: (id: string, stage: Stage) => void
  onPressureChange: (id: string, pressure: PressureLevel) => void
  onProspectUpdated: (id: string, fields: { full_name: string; phone: string; email: string; profession: string; city: string; company: string }) => void
}) {
  const [localNotes, setLocalNotes] = useState(prospect.notes)
  const [localPressure, setLocalPressure] = useState<PressureLevel>(prospect.pressure)
  const [editing, setEditing] = useState(false)

  // --- États séquences ---
  const [seqInstances, setSeqInstances] = useState<SeqInstance[]>([])
  const [seqTemplates, setSeqTemplates] = useState<SeqTemplate[]>([])
  const [seqLoading, setSeqLoading] = useState(false)
  const [seqStarting, setSeqStarting] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')

  // --- États email manuel ---
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [emailSending, setEmailSending] = useState(false)

  async function handleSendEmail() {
    if (!prospect.email || !emailSubject.trim() || !emailBody.trim()) return
    setEmailSending(true)
    try {
      const res = await fetch('/api/crm/actions/email-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospect_id: prospect.id,
          to_email: prospect.email,
          to_name: prospect.nom,
          subject: emailSubject.trim(),
          body: emailBody.trim(),
        }),
      })
      const json = await res.json()
      if (json.error) { toast.error(json.error); return }
      toast.success('Email envoyé via Brevo !')
      setShowEmailModal(false)
      setEmailSubject('')
      setEmailBody('')
    } catch {
      toast.error("Erreur d'envoi")
    }
    setEmailSending(false)
  }

  // --- Chargement instances + templates ---
  useEffect(() => {
    fetch(`/api/crm/sequences/by-prospect/${prospect.id}`)
      .then(r => r.json())
      .then(j => {
        if (j.data?.instances) setSeqInstances(j.data.instances)
      })
      .catch(() => {})

    fetch('/api/crm/sequences/templates')
      .then(r => r.json())
      .then(j => {
        if (j.data?.templates) {
          setSeqTemplates(j.data.templates)
          if (j.data.templates.length > 0) setSelectedTemplateId(j.data.templates[0].id)
        }
      })
      .catch(() => {})
  }, [prospect.id])

  // --- Handler démarrer séquence ---
  async function handleStartSequence() {
    if (!selectedTemplateId) { toast.error('Sélectionner un template'); return }
    setSeqStarting(true)
    try {
      const res = await fetch('/api/crm/sequences/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospect_id: prospect.id, template_id: selectedTemplateId }),
      })
      const json = await res.json()
      if (json.error) { toast.error(json.error); return }
      if (json.data?.already_active) {
        toast.info('Une séquence est déjà active pour ce prospect')
      } else {
        toast.success('Séquence démarrée')
      }
      const r2 = await fetch(`/api/crm/sequences/by-prospect/${prospect.id}`)
      const j2 = await r2.json()
      if (j2.data?.instances) setSeqInstances(j2.data.instances)
    } catch {
      toast.error('Erreur lors du démarrage de la séquence')
    } finally {
      setSeqStarting(false)
    }
  }

  // --- Handler pause/annulation ---
  async function handleSeqAction(instanceId: string, action: 'pause' | 'resume' | 'cancel') {
    setSeqLoading(true)
    try {
      const res = await fetch(`/api/crm/sequences/${instanceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const json = await res.json()
      if (json.error) { toast.error(json.error); return }
      toast.success(action === 'cancel' ? 'Séquence annulée' : action === 'pause' ? 'Séquence mise en pause' : 'Séquence reprise')
      setSeqInstances(prev => prev.map(i =>
        i.id === instanceId
          ? { ...i, status: json.data.status as SeqStatus }
          : i
      ))
    } catch {
      toast.error('Erreur action séquence')
    } finally {
      setSeqLoading(false)
    }
  }

  const waMsg = encodeURIComponent(
    `Bonjour ${prospect.nom.split(' ').pop()}, je suis Ted, conseiller en gestion de patrimoine. Seriez-vous disponible pour un échange de 15 minutes cette semaine ?`
  )

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, width: 400, height: '100vh',
      background: C.bgMid, borderLeft: `1px solid ${C.line}`, zIndex: 1000,
      overflowY: 'auto', display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${C.line}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: STAGE_COLORS[prospect.stage] + '30',
              border: `2px solid ${STAGE_COLORS[prospect.stage]}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: STAGE_COLORS[prospect.stage],
            }}>{prospect.initials}</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.textHi }}>{prospect.nom}</div>
              <div style={{ fontSize: 11, color: C.textLo }}>{prospect.profession} — {prospect.ville}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={() => setEditing(!editing)} style={{
              background: editing ? `${C.gold}22` : 'none',
              border: editing ? `1px solid ${C.gold}` : `1px solid ${C.line}`,
              color: editing ? C.gold : C.textLo,
              fontSize: 10, cursor: 'pointer', padding: '3px 8px', borderRadius: 5, fontWeight: 600,
            }}>✏️ Modifier</button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.textLo, fontSize: 18, cursor: 'pointer', padding: 4 }}>✕</button>
          </div>
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{
            fontSize: 13, fontWeight: 800, color: scoreColor(prospect.leadScore),
            background: scoreColor(prospect.leadScore) + '22', borderRadius: 6, padding: '3px 10px',
          }}>Score {prospect.leadScore}</div>
          <div style={{ fontSize: 11, color: C.textLo }}>Source: {prospect.source}</div>
        </div>
      </div>

      {/* Edit Form */}
      {editing && (
        <ProspectEditForm
          prospectId={prospect.id}
          initial={{
            full_name: prospect.nom,
            phone: prospect.telephone,
            email: prospect.email,
            profession: prospect.profession,
            city: prospect.ville,
            company: '',
          }}
          onSaved={(updated) => {
            onProspectUpdated(prospect.id, updated)
            setEditing(false)
          }}
          onCancel={() => setEditing(false)}
        />
      )}

      {/* Contact */}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.line}` }}>
        <div style={{ fontSize: 9, color: C.textLo, marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Contact</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <a href={`tel:${prospect.telephone}`} style={{ fontSize: 12, color: C.gold, textDecoration: 'none', display: 'block' }}>📞 {prospect.telephone}</a>
          <a href={`mailto:${prospect.email}`} style={{ fontSize: 12, color: C.textMid, textDecoration: 'none', display: 'block' }}>✉️ {prospect.email}</a>
          <div style={{ fontSize: 11, color: C.textLo }}>Dernier contact : {prospect.lastContact}</div>
        </div>
      </div>

      {/* Stage */}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.line}` }}>
        <div style={{ fontSize: 9, color: C.textLo, marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Étape pipeline</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {STAGES.map(s => (
            <button key={s} onClick={() => onStageChange(prospect.id, s)} style={{
              fontSize: 10, padding: '4px 10px', borderRadius: 5, cursor: 'pointer',
              border: `1px solid ${prospect.stage === s ? STAGE_COLORS[s] : C.line}`,
              background: prospect.stage === s ? STAGE_COLORS[s] + '22' : C.surface2,
              color: prospect.stage === s ? STAGE_COLORS[s] : C.textLo,
              fontWeight: prospect.stage === s ? 700 : 400,
            }}>{s}</button>
          ))}
        </div>
      </div>

      {/* Next action */}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.line}` }}>
        <div style={{ fontSize: 9, color: C.textLo, marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Prochaine action</div>
        <div style={{ fontSize: 12, color: C.gold }}>⚡ {prospect.nextAction}</div>
      </div>

      {/* Tags */}
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.line}` }}>
        <div style={{ fontSize: 9, color: C.textLo, marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Tags</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {prospect.tags.map(t => (
            <span key={t} style={{
              fontSize: 9, padding: '2px 8px', borderRadius: 4,
              background: C.surface3, color: C.green, border: `1px solid ${C.green}33`,
            }}>{t}</span>
          ))}
        </div>
      </div>

      {/* Niveau de pression */}
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.line}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 9, color: C.textLo, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Niveau de pression</div>
          {seqInstances.length > 0 && (() => {
            const suggested = computeAutoPressure(seqInstances)
            return suggested !== localPressure ? (
              <button onClick={() => { setLocalPressure(suggested); onPressureChange(prospect.id, suggested) }}
                style={{ fontSize: 7, padding: '2px 8px', borderRadius: 4, border: `1px solid ${PRESSURE_COLORS[suggested]}`, background: `${PRESSURE_COLORS[suggested]}18`, color: PRESSURE_COLORS[suggested], cursor: 'pointer' }}>
                ⚡ Suggestion : {PRESSURE_META[suggested].label}
              </button>
            ) : null
          })()}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(Object.keys(PRESSURE_META) as PressureLevel[]).map(level => (
            <button key={level} onClick={() => { setLocalPressure(level); onPressureChange(prospect.id, level) }}
              style={{ flex: 1, padding: '6px 4px', borderRadius: 6, border: `1px solid ${localPressure === level ? PRESSURE_COLORS[level] : C.line}`, background: localPressure === level ? `${PRESSURE_COLORS[level]}22` : C.surface2, color: localPressure === level ? PRESSURE_COLORS[level] : C.textLo, cursor: 'pointer', fontSize: 8, fontWeight: localPressure === level ? 700 : 400 }}>
              <div>{PRESSURE_META[level].label}</div>
              <div style={{ fontSize: 7, opacity: 0.7 }}>{PRESSURE_META[level].sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.line}`, flex: 1 }}>
        <div style={{ fontSize: 9, color: C.textLo, marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Notes</div>
        <textarea
          value={localNotes}
          onChange={e => setLocalNotes(e.target.value)}
          style={{
            width: '100%', minHeight: 90, background: C.surface1,
            border: `1px solid ${C.line}`, borderRadius: 6,
            color: C.textMid, fontSize: 11, padding: '8px 10px',
            resize: 'vertical', outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Séquences */}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.line}` }}>
        <div style={{ fontSize: 9, color: C.textLo, marginBottom: 10, fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: 1 }}>Séquences de relance</div>

        {/* Démarrer une séquence — SEQ-01 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <select
            value={selectedTemplateId}
            onChange={e => setSelectedTemplateId(e.target.value)}
            style={{
              flex: 1, fontSize: 11, padding: '6px 8px', borderRadius: 6,
              background: C.surface2, border: `1px solid ${C.line}`,
              color: seqTemplates.length === 0 ? C.textLo : C.text, outline: 'none',
            }}
          >
            {seqTemplates.length === 0
              ? <option value="">Aucun template — créer dans Paramètres</option>
              : seqTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)
            }
          </select>
          {seqTemplates.length === 0 && (
            <div style={{ fontSize: 9, color: C.textLo, marginTop: 6 }}>
              → <a href="/settings" style={{ color: C.indigo, textDecoration: 'none' }}>Paramètres → Séquences</a> pour créer un template
            </div>
          )}
          <button
            onClick={handleStartSequence}
            disabled={seqStarting || seqTemplates.length === 0}
            style={{
              padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700,
              border: `1px solid ${C.gold}`,
              background: seqStarting ? C.surface2 : `${C.gold}22`,
              color: seqStarting ? C.textLo : C.gold,
              cursor: seqStarting || seqTemplates.length === 0 ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {seqStarting ? '...' : 'Démarrer'}
          </button>
        </div>

        {/* Liste instances actives — SEQ-08 */}
        {seqInstances.length === 0 ? (
          <div style={{ fontSize: 10, color: C.textLo, fontStyle: 'italic' }}>
            Aucune séquence active
          </div>
        ) : (
          seqInstances.map(inst => (
            <div key={inst.id} style={{
              marginBottom: 12, padding: '10px 12px', borderRadius: 8,
              background: C.surface2, border: `1px solid ${C.line}`,
            }}>
              {/* En-tête instance */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.text }}>
                  {inst.template_name ?? 'Séquence'}
                </span>
                <span style={{
                  fontSize: 9, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                  background: inst.status === 'active' ? `${C.green}22` : `${C.textLo}22`,
                  color: inst.status === 'active' ? C.green : C.textLo,
                }}>
                  {inst.status === 'active' ? 'ACTIVE' : inst.status === 'paused' ? 'PAUSÉE' : inst.status === 'cancelled' ? 'ANNULÉE' : 'TERMINÉE'}
                </span>
              </div>

              {/* Étapes — SEQ-08 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                {inst.steps.map(step => (
                  <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                      background: stepStatusColor(step.status),
                    }} />
                    <span style={{ fontSize: 10, color: C.textMid, flex: 1 }}>
                      {CHANNEL_LABEL[step.channel]} — J+{
                        Math.round((new Date(step.scheduled_at).getTime() - new Date(inst.started_at).getTime()) / 86400000)
                      }
                    </span>
                    <span style={{ fontSize: 9, color: stepStatusColor(step.status) }}>
                      {step.status === 'sent' ? 'Envoyé' : step.status === 'failed' ? 'Échoué' : step.status === 'skipped' ? 'Ignoré' : 'Planifié'}
                    </span>
                    {/* Bouton action manuelle pour étapes client-side (WhatsApp, LinkedIn) */}
                    {(step.channel === 'whatsapp' || step.channel === 'linkedin') && step.status === 'pending' && (
                      <button
                        onClick={() => {
                          if (step.channel === 'whatsapp') {
                            openWhatsApp(
                              prospect.telephone ?? '',
                              `Bonjour ${prospect.nom.split(' ')[0]}, suite à notre échange...`
                            )
                          } else {
                            openLinkedIn({
                              linkedinUrl: null,
                              prospectName: prospect.nom,
                              inmailTemplate: `Bonjour ${prospect.nom.split(' ')[0]}, je me permets de vous contacter...`,
                              onCopied: () => toast.success('Template InMail copié dans le presse-papier'),
                            })
                          }
                        }}
                        style={{
                          fontSize: 9, padding: '2px 8px', borderRadius: 4, cursor: 'pointer',
                          border: `1px solid ${step.channel === 'whatsapp' ? '#25D366' : '#0A66C2'}`,
                          background: step.channel === 'whatsapp' ? 'rgba(37,211,102,0.1)' : 'rgba(10,102,194,0.1)',
                          color: step.channel === 'whatsapp' ? '#25D366' : '#0A66C2',
                        }}
                      >
                        {step.channel === 'whatsapp' ? 'Ouvrir WA' : 'Ouvrir LinkedIn'}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Actions Pause/Annuler — SEQ-09 */}
              {(inst.status === 'active' || inst.status === 'paused') && (
                <div style={{ display: 'flex', gap: 6 }}>
                  {inst.status === 'active' ? (
                    <button
                      onClick={() => handleSeqAction(inst.id, 'pause')}
                      disabled={seqLoading}
                      style={{
                        fontSize: 9, padding: '3px 10px', borderRadius: 5, cursor: 'pointer',
                        border: `1px solid ${C.gold}`, background: `${C.gold}15`, color: C.gold,
                      }}
                    >Pause</button>
                  ) : (
                    <button
                      onClick={() => handleSeqAction(inst.id, 'resume')}
                      disabled={seqLoading}
                      style={{
                        fontSize: 9, padding: '3px 10px', borderRadius: 5, cursor: 'pointer',
                        border: `1px solid ${C.green}`, background: `${C.green}15`, color: C.green,
                      }}
                    >Reprendre</button>
                  )}
                  <button
                    onClick={() => handleSeqAction(inst.id, 'cancel')}
                    disabled={seqLoading}
                    style={{
                      fontSize: 9, padding: '3px 10px', borderRadius: 5, cursor: 'pointer',
                      border: `1px solid ${C.warn}`, background: `${C.warn}15`, color: C.warn,
                    }}
                  >Annuler</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Actions rapides */}
      <div style={{ padding: '16px 20px', borderTop: `1px solid ${C.line}` }}>
        <div style={{ fontSize: 9, color: C.textLo, marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Actions rapides</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button
            onClick={() => window.open(`https://wa.me/33${prospect.telephone.replace(/\s/g,'').replace(/^0/,'').replace(/[^0-9]/g,'')}?text=${waMsg}`, '_blank')}
            style={{ padding: '9px 0', borderRadius: 7, border: '1px solid #25D366', background: 'rgba(37,211,102,0.1)', color: '#25D366', fontWeight: 600, fontSize: 11, cursor: 'pointer' }}
          >💬 WhatsApp</button>
          <button
            onClick={() => window.open(`https://linkedin.com/search/results/people/?keywords=${encodeURIComponent(prospect.nom)}`, '_blank')}
            style={{ padding: '9px 0', borderRadius: 7, border: '1px solid #0A66C2', background: 'rgba(10,102,194,0.1)', color: '#0A66C2', fontWeight: 600, fontSize: 11, cursor: 'pointer' }}
          >🔗 LinkedIn</button>
          <button
            onClick={() => { if (!prospect.email) { toast.error('Email inconnu pour ce prospect'); return }; setShowEmailModal(true) }}
            style={{ padding: '9px 0', borderRadius: 7, border: `1px solid ${C.indigo}`, background: C.indigo + '1a', color: C.indigo, fontWeight: 600, fontSize: 11, cursor: 'pointer' }}
          >
            ✉️ Email Brevo
          </button>
          <button
            onClick={() => window.open(`tel:${prospect.telephone}`, '_self')}
            style={{ padding: '9px 0', borderRadius: 7, border: `1px solid ${C.green}`, background: C.green + '1a', color: C.green, fontWeight: 600, fontSize: 11, cursor: 'pointer' }}
          >📞 Appeler</button>
        </div>
      </div>

      {showEmailModal && (
        <div onClick={() => setShowEmailModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.bgMid, border: `1px solid ${C.indigo}40`, borderRadius: 14, padding: 24, width: '100%', maxWidth: 480, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: C.ribbon, borderRadius: '14px 14px 0 0' }} />
            <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 14, fontWeight: 600, color: C.indigo, marginBottom: 4, marginTop: 4 }}>✉️ Email Brevo</div>
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo, marginBottom: 18 }}>
              À : <span style={{ color: C.textMid }}>{prospect.nom}</span> — <span style={{ color: C.indigo }}>{prospect.email}</span>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 5 }}>Objet *</label>
              <input
                autoFocus value={emailSubject} onChange={e => setEmailSubject(e.target.value)}
                placeholder="Ex : Suite à notre échange..."
                style={{ width: '100%', padding: '8px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textHi, fontSize: 11, fontFamily: 'JetBrains Mono,monospace', boxSizing: 'border-box' as const }}
              />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 5 }}>Message *</label>
              <textarea
                value={emailBody} onChange={e => setEmailBody(e.target.value)}
                rows={6}
                placeholder={`Bonjour ${prospect.nom.split(' ')[0]},\n\n...`}
                style={{ width: '100%', padding: '8px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textHi, fontSize: 11, fontFamily: 'JetBrains Mono,monospace', boxSizing: 'border-box' as const, resize: 'vertical' as const }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowEmailModal(false)} style={{ flex: 1, padding: 10, borderRadius: 8, background: C.surface1, border: `1px solid ${C.line}`, color: C.textLo, fontFamily: 'Oswald,sans-serif', fontSize: 11, cursor: 'pointer' }}>ANNULER</button>
              <button
                onClick={handleSendEmail}
                disabled={emailSending || !emailSubject.trim() || !emailBody.trim()}
                style={{ flex: 2, padding: 10, borderRadius: 8, background: '#0d1a2e', border: `1px solid ${C.indigo}66`, color: C.indigo, fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 600, cursor: 'pointer', opacity: (!emailSubject.trim() || !emailBody.trim()) ? 0.6 : 1 }}
              >
                {emailSending ? 'ENVOI...' : '✉️ ENVOYER'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// --- KANBAN COLUMN ---
function KanbanColumn({ stage, prospects, onCardClick }: {
  stage: Stage
  prospects: Prospect[]
  onCardClick: (p: Prospect) => void
}) {
  const color = STAGE_COLORS[stage]
  return (
    <div style={{
      minWidth: 190, flex: 1,
      background: C.surface1, borderRadius: 10,
      border: `1px solid ${C.line}`,
      display: 'flex', flexDirection: 'column',
      maxHeight: 'calc(100vh - 240px)',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 12px', borderBottom: `1px solid ${C.line}`,
        borderTop: `3px solid ${color}`, borderRadius: '10px 10px 0 0',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color }}>{stage}</div>
          <div style={{
            fontSize: 10, fontWeight: 700, background: color + '22', color,
            borderRadius: '50%', width: 20, height: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{prospects.length}</div>
        </div>
      </div>

      {/* Cards */}
      <div style={{ padding: '10px 10px', overflowY: 'auto', flex: 1 }}>
        <SortableContext items={prospects.map(p => p.id)} strategy={verticalListSortingStrategy}>
          {prospects.map(p => (
            <ProspectCard key={p.id} prospect={p} onClick={() => onCardClick(p)} />
          ))}
        </SortableContext>
        {prospects.length === 0 && (
          <div style={{ fontSize: 10, color: C.textVlo, textAlign: 'center', padding: '20px 0' }}>
            Glissez ici
          </div>
        )}
      </div>
    </div>
  )
}

// --- PAGE ---
export default function CrmPage() {
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null)
  const [filter, setFilter] = useState<'Tous' | 'TNS' | 'Chefs' | '★★★★★'>('Tous')
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [showNewProspect, setShowNewProspect] = useState(false)
  const [npForm, setNpForm] = useState({ full_name: '', profession: '', phone: '', email: '', city: '', source: 'autre', notes: '' })
  const [npCreating, setNpCreating] = useState(false)
  const [npError, setNpError] = useState<string | null>(null)

  useEffect(() => { saveLastSection('/crm') }, [])

  // Fetch real prospects from DB
  const fetchProspects = useCallback(async () => {
    try {
      const res = await fetch('/api/prospects?limit=200')
      const json = await res.json()
      if (res.ok && json.data && json.data.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: Prospect[] = json.data.map((p: any) => ({
          id: p.id,
          nom: p.full_name,
          initials: p.full_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase(),
          profession: p.profession || '',
          ville: p.city || '',
          telephone: p.phone_normalized || '',
          email: p.email || '',
          stage: DB_TO_UI[p.pipeline_stage] || 'À contacter',
          leadScore: p.lead_score || 50,
          nextAction: p.notes || '',
          notes: p.notes || '',
          tags: Array.isArray(p.tags) ? p.tags : [],
          source: p.source || '',
          lastContact: p.last_contact_at ? new Date(p.last_contact_at).toLocaleDateString('fr-FR') : '—',
          pressure: 'low' as PressureLevel,
        }))
        setProspects(mapped)
      }
    } catch {
      setFetchError('Impossible de charger les prospects. Vérifiez votre connexion.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchProspects() }, [fetchProspects])

  // Persist stage move to DB
  async function persistMove(prospectId: string, toStage: Stage) {
    try {
      const res = await fetch('/api/pipeline/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospect_id: prospectId, to_stage: UI_TO_DB[toStage] }),
      })
      if (!res.ok) {
        const json = await res.json()
        toast.error(json.error || 'Erreur lors du déplacement')
      } else {
        toast.success(`Déplacé vers ${toStage}`)
      }
    } catch {
      toast.error('Connexion impossible')
    }
  }

  async function handleCreateProspect() {
    if (!npForm.full_name.trim()) return
    setNpCreating(true)
    setNpError(null)
    try {
      const res = await fetch('/api/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: npForm.full_name.trim(),
          profession: npForm.profession,
          phone: npForm.phone,
          email: npForm.email,
          city: npForm.city,
          source: npForm.source,
          notes: npForm.notes,
        }),
      })
      const d = await res.json()
      if (!d.success) throw new Error(d.error ?? 'Erreur création')
      await fetchProspects()
      setShowNewProspect(false)
      setNpForm({ full_name: '', profession: '', phone: '', email: '', city: '', source: 'autre', notes: '' })
    } catch (e) {
      setNpError(e instanceof Error ? e.message : 'Erreur inconnue')
    }
    setNpCreating(false)
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const activeProspect = activeId ? prospects.find(p => p.id === activeId) : null

  const filteredProspects = prospects.filter(p => {
    if (filter === 'TNS') return p.tags.includes('TNS')
    if (filter === 'Chefs') return p.tags.includes('Chef entreprise')
    if (filter === '★★★★★') return p.leadScore >= 85
    return true
  })

  function findStageForProspect(id: string): Stage {
    return prospects.find(p => p.id === id)?.stage || 'À contacter'
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over) return
    const activeProspectId = active.id as string
    const overId = over.id as string
    const overStage = STAGES.find(s => s === overId)
    const overProspect = prospects.find(p => p.id === overId)
    const targetStage: Stage = overStage || overProspect?.stage || findStageForProspect(activeProspectId)
    const currentStage = findStageForProspect(activeProspectId)
    if (targetStage === currentStage) return
    setProspects(prev => prev.map(p => p.id === activeProspectId ? { ...p, stage: targetStage } : p))
    persistMove(activeProspectId, targetStage)
  }

  function handleStageChange(id: string, stage: Stage) {
    const currentStage = findStageForProspect(id)
    setProspects(prev => prev.map(p => p.id === id ? { ...p, stage } : p))
    if (selectedProspect?.id === id) {
      setSelectedProspect(prev => prev ? { ...prev, stage } : null)
    }
    if (stage !== currentStage) persistMove(id, stage)
  }

  function handlePressureChange(id: string, pressure: PressureLevel) {
    setProspects(prev => prev.map(p => p.id === id ? { ...p, pressure } : p))
    if (selectedProspect?.id === id) {
      setSelectedProspect(prev => prev ? { ...prev, pressure } : null)
    }
    const isUUID = /^[0-9a-f-]{36}$/.test(id)
    if (isUUID) {
      fetch(`/api/prospects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pressure }),
      }).catch(() => {})
    }
  }

  const totalPipeline = filteredProspects.filter(p => !['Converti', 'Perdu'].includes(p.stage)).length
  const totalConverti = filteredProspects.filter(p => p.stage === 'Converti').length
  const totalPerdu    = filteredProspects.filter(p => p.stage === 'Perdu').length
  const scoreMoyen    = Math.round(filteredProspects.reduce((s, p) => s + p.leadScore, 0) / (filteredProspects.length || 1))

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap')`}</style>

      {/* Header */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.textHi, fontFamily: 'Oswald, sans-serif', letterSpacing: 1, textTransform: 'uppercase' }}>
          🗂️ CRM Kanban
        </div>
        <div style={{ fontSize: 11, color: C.textLo, marginTop: 4 }}>
          Pipeline commercial — glissez les fiches entre les étapes
        </div>
      </div>

      {/* Toolbar — from HTML */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 9, color: C.textVlo }}>
          {filteredProspects.length} prospects · Cliquer sur une carte pour le profil complet
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            onClick={() => setShowNewProspect(true)}
            style={{ padding: '4px 10px', background: C.surface2, border: `1px solid ${C.green}`, color: C.green, borderRadius: 6, fontSize: 8, fontWeight: 600, cursor: 'pointer' }}
          >➕ Nouveau prospect</button>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['Tous', '★★★★★', 'TNS', 'Chefs'] as const).map(f => (
              <span key={f} onClick={() => setFilter(f)} style={{
                fontSize: 8, padding: '2px 7px', borderRadius: 10, cursor: 'pointer',
                background: filter === f ? `${C.gold}20` : C.surface2,
                color: filter === f ? C.gold : C.textLo,
                border: `0.5px solid ${filter === f ? C.gold + '60' : C.line}`,
              }}>{f}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Pressure legend */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 12, flexWrap: 'wrap' }}>
        {([['low', 'Faible pression'], ['medium', 'Pression moyenne'], ['high', 'Pression haute'], ['max', 'Pression max']] as [PressureLevel, string][]).map(([level, label]) => (
          <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: PRESSURE_COLORS[level] }} />
            <span style={{ fontSize: 8, color: C.textLo }}>{label}</span>
          </div>
        ))}
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 14 }}>
        {[
          { label: 'En pipeline',  value: totalPipeline, color: C.indigo },
          { label: 'Convertis',    value: totalConverti,  color: C.green },
          { label: 'Perdus',       value: totalPerdu,     color: C.cyan },
          { label: 'Score moyen',  value: scoreMoyen,     color: C.gold },
        ].map(k => (
          <div key={k.label} style={{
            background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 10,
            padding: '12px 14px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color, fontFamily: 'Oswald, sans-serif' }}>{k.value}</div>
            <div style={{ fontSize: 9, color: C.textLo, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Loading / Error states */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: C.textLo, fontSize: 12 }}>
          Chargement du CRM…
        </div>
      )}
      {fetchError && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, marginBottom: 12,
          background: `${C.warn}15`, border: `1px solid ${C.warn}40`,
          color: C.warn, fontSize: 11,
        }}>
          ⚠️ {fetchError}
        </div>
      )}

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8, minHeight: 400 }}>
          {STAGES.map(stage => (
            <KanbanColumn
              key={stage}
              stage={stage}
              prospects={filteredProspects.filter(p => p.stage === stage)}
              onCardClick={p => setSelectedProspect(p)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeProspect && <CardContent prospect={activeProspect} isDragging />}
        </DragOverlay>
      </DndContext>

      {/* Drawer */}
      {selectedProspect && (
        <>
          <div
            onClick={() => setSelectedProspect(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999 }}
          />
          <ProspectDrawer
            prospect={selectedProspect}
            onClose={() => setSelectedProspect(null)}
            onStageChange={handleStageChange}
            onPressureChange={handlePressureChange}
            onProspectUpdated={(id, fields) => {
              setProspects(prev => prev.map(p => p.id === id ? {
                ...p,
                nom: fields.full_name,
                telephone: fields.phone,
                email: fields.email,
                profession: fields.profession,
                ville: fields.city,
                initials: fields.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
              } : p))
              setSelectedProspect(prev => prev && prev.id === id ? {
                ...prev,
                nom: fields.full_name,
                telephone: fields.phone,
                email: fields.email,
                profession: fields.profession,
                ville: fields.city,
                initials: fields.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
              } : prev)
              toast.success('Fiche mise à jour')
            }}
          />
        </>
      )}

      {/* Modal nouveau prospect */}
      {showNewProspect && (
        <div
          onClick={() => setShowNewProspect(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: C.bgMid, border: `1px solid ${C.line}`, borderRadius: 14, padding: 24, width: '100%', maxWidth: 460, position: 'relative' }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: C.ribbon, borderRadius: '14px 14px 0 0' }} />
            <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 14, fontWeight: 600, color: C.textHi, marginBottom: 18, marginTop: 6 }}>
              Nouveau prospect
            </div>

            {/* Nom complet */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 5 }}>Nom complet *</label>
              <input
                autoFocus
                value={npForm.full_name}
                onChange={e => setNpForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder="Dr. Prénom Nom"
                style={{ width: '100%', padding: '8px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textHi, fontSize: 11, fontFamily: 'JetBrains Mono,monospace', boxSizing: 'border-box' }}
              />
            </div>

            {/* Profession + Ville */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 5 }}>Profession</label>
                <input
                  value={npForm.profession}
                  onChange={e => setNpForm(f => ({ ...f, profession: e.target.value }))}
                  placeholder="Kinésithérapeute"
                  style={{ width: '100%', padding: '8px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textHi, fontSize: 11, fontFamily: 'JetBrains Mono,monospace', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 5 }}>Ville</label>
                <input
                  value={npForm.city}
                  onChange={e => setNpForm(f => ({ ...f, city: e.target.value }))}
                  placeholder="Paris 15e"
                  style={{ width: '100%', padding: '8px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textHi, fontSize: 11, fontFamily: 'JetBrains Mono,monospace', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Téléphone + Email */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 5 }}>Téléphone</label>
                <input
                  value={npForm.phone}
                  onChange={e => setNpForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="06 12 34 56 78"
                  style={{ width: '100%', padding: '8px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textHi, fontSize: 11, fontFamily: 'JetBrains Mono,monospace', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 5 }}>Email</label>
                <input
                  value={npForm.email}
                  onChange={e => setNpForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="contact@cabinet.fr"
                  style={{ width: '100%', padding: '8px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textHi, fontSize: 11, fontFamily: 'JetBrains Mono,monospace', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Source */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 5 }}>Source</label>
              <select
                value={npForm.source}
                onChange={e => setNpForm(f => ({ ...f, source: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textHi, fontSize: 10, fontFamily: 'JetBrains Mono,monospace' }}
              >
                <option value="autre">Autre</option>
                <option value="tns">TNS (prospection)</option>
                <option value="chefs_entreprise">Chef d&apos;entreprise</option>
                <option value="recommandation">Recommandation</option>
                <option value="linkedin">LinkedIn</option>
                <option value="particuliers">Particulier</option>
              </select>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 5 }}>Notes</label>
              <textarea
                value={npForm.notes}
                onChange={e => setNpForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Premier contact, contexte..."
                rows={2}
                style={{ width: '100%', padding: '8px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textHi, fontSize: 11, fontFamily: 'JetBrains Mono,monospace', boxSizing: 'border-box', resize: 'none' }}
              />
            </div>

            {npError && <div style={{ fontSize: 9, color: '#ff6470', marginBottom: 12, fontFamily: 'JetBrains Mono,monospace' }}>{npError}</div>}

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowNewProspect(false)} style={{ flex: 1, padding: 10, borderRadius: 8, background: C.surface1, border: `1px solid ${C.line}`, color: C.textLo, fontFamily: 'Oswald,sans-serif', fontSize: 11, cursor: 'pointer' }}>
                ANNULER
              </button>
              <button
                onClick={handleCreateProspect}
                disabled={npCreating || !npForm.full_name.trim()}
                style={{ flex: 2, padding: 10, borderRadius: 8, background: '#0a1f0a', border: `1px solid ${C.green}66`, color: C.green, fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 600, cursor: (npCreating || !npForm.full_name.trim()) ? 'not-allowed' : 'pointer', opacity: (npCreating || !npForm.full_name.trim()) ? 0.6 : 1 }}
              >
                {npCreating ? 'CRÉATION...' : '➕ AJOUTER AU CRM'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
