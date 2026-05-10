---
phase: 02-sequences-multicanales
plan: 02C
type: execute
wave: 2
depends_on: [02A]
files_modified:
  - src/app/(dashboard)/crm/page.tsx
autonomous: true
requirements: [SEQ-01, SEQ-08, SEQ-09]
tags: [ui, drawer, crm, sequences]

must_haves:
  truths:
    - "Un bouton 'Démarrer séquence' apparaît dans la section Séquences du drawer ProspectDrawer"
    - "Le drawer liste les instances de séquences actives du prospect avec le statut de chaque étape"
    - "Des boutons Pause et Annuler sont visibles sur chaque instance active"
    - "Un sélecteur de template permet de choisir la séquence avant de la démarrer"
    - "Les statuts d'étapes sont colorés (gold=pending, green=sent, warn=failed)"
  artifacts:
    - path: "src/app/(dashboard)/crm/page.tsx"
      provides: "ProspectDrawer enrichi avec section Séquences complète"
      contains: "Démarrer séquence"
  key_links:
    - from: "Bouton Démarrer séquence"
      to: "POST /api/crm/sequences/start"
      via: "fetch() avec prospect.id + templateId sélectionné"
      pattern: "api/crm/sequences/start"
    - from: "Section statut étapes"
      to: "GET /api/crm/sequences/by-prospect/[prospectId]"
      via: "useEffect fetch au montage du drawer"
      pattern: "api/crm/sequences/by-prospect"
    - from: "Boutons Pause/Annuler"
      to: "PATCH /api/crm/sequences/[instanceId]"
      via: "fetch() avec action 'pause' ou 'cancel'"
      pattern: "api/crm/sequences"
---

## Phase Goal

**As a** CGP utilisant le dashboard, **I want to** voir et gérer les séquences de relance directement dans le drawer d'une carte prospect, **so that** je puisse démarrer une relance, suivre son avancement étape par étape et la mettre en pause ou l'annuler sans quitter le Kanban.

<objective>
Ajouter une section "Séquences" dans le composant `ProspectDrawer` existant de `src/app/(dashboard)/crm/page.tsx`. Cette section expose : (1) un sélecteur de template + bouton "Démarrer séquence" (SEQ-01), (2) la liste des instances actives avec statut coloré par étape (SEQ-08), (3) des boutons Pause et Annuler (SEQ-09). Tout le styling utilise `C.*` via `src/lib/theme.ts` — aucune classe Tailwind directe.

Purpose: L'utilisateur peut piloter l'intégralité du cycle de vie d'une séquence sans aucun autre écran. Ce plan est la tranche verticale UI qui rend le moteur 02B utilisable.
Output: `crm/page.tsx` modifié — section Séquences fonctionnelle dans le drawer.
</objective>

<execution_context>
@C:\Users\Ted\.claude\get-shit-done\workflows\execute-plan.md
@C:\Users\Ted\.claude\get-shit-done\templates\summary.md
</execution_context>

<context>
@C:\Users\Ted\Documents\GitHub\TedScaleWithOuss\.planning\phases\02-sequences-multicanales\02-RESEARCH.md
@C:\Users\Ted\Documents\GitHub\TedScaleWithOuss\.planning\phases\02-sequences-multicanales\02A-PLAN.md

<interfaces>
<!-- Extraits critiques de src/app/(dashboard)/crm/page.tsx -->

```typescript
// Fichier: src/app/(dashboard)/crm/page.tsx — 'use client'
// Imports existants: useState, useEffect, useCallback depuis 'react'
// Import existant: C depuis '@/lib/theme'
// Import existant: toast depuis 'sonner'

// Type Prospect existant (extraire les champs pertinents) :
type Prospect = {
  id: string
  nom: string
  telephone: string
  email: string
  profession: string
  ville: string
  stage: Stage
  // ... autres champs
}

// ProspectDrawer — signature existante :
function ProspectDrawer({ prospect, onClose, onStageChange }: {
  prospect: Prospect
  onClose: () => void
  onStageChange: (id: string, stage: Stage) => void
})

// Structure drawer existante — ajouter la section Séquences AVANT "Actions rapides" (ligne 350)
// Les sections existantes utilisent ce pattern de section :
<div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.line}` }}>
  <div style={{ fontSize: 9, color: C.textLo, marginBottom: 10, fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: 1 }}>Titre section</div>
  {/* contenu */}
</div>
```

Palette couleurs disponibles (src/lib/theme.ts) :
```typescript
C.gold     // '#e8c878' — étape pending
C.green    // '#4ade80' — étape sent
C.warn     // '#d8884a' — étape failed
C.textLo   // '#5a6ba8' — labels discrets
C.textMid  // '#8ea0d9' — texte secondaire
C.text     // '#d8e1ff' — texte normal
C.textHi   // '#ffffff' — texte important
C.surface2 // '#1a2150' — fond bouton
C.surface3 // '#252e68' — fond hover
C.line     // '#3a4690' — bordures
C.bgMid    // '#14193d' — fond drawer
```

Routes API disponibles après 02B :
- POST /api/crm/sequences/start — body: { prospect_id, template_id }
- GET  /api/crm/sequences/by-prospect/[prospectId]
- PATCH /api/crm/sequences/[instanceId] — body: { action: 'pause'|'resume'|'cancel' }
- GET  /api/crm/sequences/[instanceId] — statut d'une instance
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Ajouter les types et hooks de séquences dans crm/page.tsx</name>
  <read_first>
    - src/app/(dashboard)/crm/page.tsx (lire entièrement — fichier principal à modifier)
    - src/lib/theme.ts (palette C.*)
  </read_first>
  <files>src/app/(dashboard)/crm/page.tsx</files>
  <action>
Dans `src/app/(dashboard)/crm/page.tsx`, ajouter APRÈS les imports existants et AVANT la définition du composant `ProspectDrawer` (ligne ~246) :

**1. Types locaux pour les séquences** (ne pas importer depuis lib — ce fichier est 'use client' et les types peuvent être dupliqués localement pour éviter les dépendances complexes) :

```typescript
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
```

**2. Helper de couleur de statut d'étape** (APRÈS les types) :
```typescript
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
```
  </action>
  <verify>
    <automated>powershell.exe -Command "Select-String -Path 'C:\Users\Ted\Documents\GitHub\TedScaleWithOuss\src\app\(dashboard)\crm\page.tsx' -Pattern 'SeqInstance|stepStatusColor|CHANNEL_LABEL' | Measure-Object | Select-Object -ExpandProperty Count"</automated>
  </verify>
  <done>Les types SeqInstance, SeqStep, SeqTemplate et les helpers stepStatusColor, CHANNEL_LABEL sont définis dans crm/page.tsx avant ProspectDrawer.</done>
</task>

<task type="auto">
  <name>Task 2: Ajouter la section Séquences complète dans ProspectDrawer</name>
  <read_first>
    - src/app/(dashboard)/crm/page.tsx (état après Task 1)
  </read_first>
  <files>src/app/(dashboard)/crm/page.tsx</files>
  <action>
Dans la fonction `ProspectDrawer`, ajouter :

**A. Nouveaux états locaux** (après les `useState` existants, par ex. après `const [localNotes, setLocalNotes] = useState(prospect.notes)`) :

```typescript
const [seqInstances, setSeqInstances] = useState<SeqInstance[]>([])
const [seqTemplates, setSeqTemplates] = useState<SeqTemplate[]>([])
const [seqLoading, setSeqLoading] = useState(false)
const [seqStarting, setSeqStarting] = useState(false)
const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
```

**B. useEffect pour charger instances + templates** (APRÈS les useState, dans le body de ProspectDrawer) :

```typescript
useEffect(() => {
  // Charger instances actives du prospect
  fetch(`/api/crm/sequences/by-prospect/${prospect.id}`)
    .then(r => r.json())
    .then(j => {
      if (j.data?.instances) setSeqInstances(j.data.instances)
    })
    .catch(() => {})

  // Charger templates disponibles (pour le sélecteur)
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
```

Note: La route `/api/crm/sequences/templates` sera créée dans le plan 02D. En attendant, si elle retourne 404, le sélecteur reste vide — comportement gracieux.

**C. Handler démarrer séquence** :
```typescript
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
    // Rafraîchir la liste
    const r2 = await fetch(`/api/crm/sequences/by-prospect/${prospect.id}`)
    const j2 = await r2.json()
    if (j2.data?.instances) setSeqInstances(j2.data.instances)
  } catch {
    toast.error('Erreur lors du démarrage de la séquence')
  } finally {
    setSeqStarting(false)
  }
}
```

**D. Handler pause/annulation** :
```typescript
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
```

**E. Section JSX Séquences** — insérer AVANT la section "Actions rapides" (chercher le commentaire `{/* Actions rapides */}`) :

```tsx
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
        ? <option value="">Aucun template disponible</option>
        : seqTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)
      }
    </select>
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
```
  </action>
  <verify>
    <automated>npx tsc --noEmit --project C:\Users\Ted\Documents\GitHub\TedScaleWithOuss\tsconfig.json 2>&1 | Select-String "error TS" | Measure-Object | Select-Object -ExpandProperty Count</automated>
  </verify>
  <done>
La section Séquences est visible dans le drawer avec : sélecteur de template + bouton Démarrer + liste instances + statuts étapes colorés + boutons Pause/Annuler. TypeScript compile sans erreur.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser → /api/crm/sequences/* | Requêtes fetch() avec cookies de session Supabase — auth vérifiée côté serveur |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02C-01 | Spoofing | Bouton Démarrer séquence | mitigate | L'API /api/crm/sequences/start vérifie getUser() — prospect_id validé UUID + RLS côté serveur |
| T-02C-02 | Tampering | Boutons Pause/Annuler | mitigate | PATCH /api/crm/sequences/[id] vérifie user ownership — un user ne peut pas annuler la séquence d'un autre |
| T-02C-03 | Information Disclosure | Liste des templates | accept | La route /templates ne retourne que les templates du user authentifié (RLS) |
| T-02C-04 | Tampering | selectedTemplateId manipulé | accept | La validation UUID et l'ownership check se font côté serveur dans /api/crm/sequences/start |
</threat_model>

<verification>
1. Ouvrir http://localhost:3000/crm (app en cours d'exécution)
2. Cliquer sur une carte prospect pour ouvrir le drawer
3. Vérifier que la section "Séquences de relance" apparaît AVANT "Actions rapides"
4. Vérifier que le sélecteur de template et le bouton "Démarrer" sont présents
5. Vérifier que la section "Aucune séquence active" s'affiche quand aucune instance n'existe
6. Démarrer une séquence avec le template démo — vérifier toast "Séquence démarrée"
7. Rafraîchir le drawer — vérifier que l'instance apparaît avec ses 3 étapes et statuts
</verification>

<success_criteria>
- Section "Séquences de relance" présente dans le drawer avant "Actions rapides"
- Bouton "Démarrer" appelle POST /api/crm/sequences/start avec prospect.id + selectedTemplateId
- Instances listées avec statuts d'étapes colorés (gold/green/warn)
- Boutons Pause/Reprendre/Annuler appellent PATCH avec action correspondante
- TypeScript compile sans erreur (npx tsc --noEmit)
</success_criteria>

<output>
After completion, create `.planning/phases/02-sequences-multicanales/02C-SUMMARY.md`
</output>
