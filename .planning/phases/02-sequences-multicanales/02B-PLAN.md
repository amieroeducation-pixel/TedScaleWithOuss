---
phase: 02-sequences-multicanales
plan: 02B
type: execute
wave: 2
depends_on: [02A]
files_modified:
  - src/lib/sequences/types.ts
  - src/lib/sequences/trigger.ts
  - src/lib/sequences/executor.ts
  - src/lib/sequences/brevo.ts
  - src/app/api/crm/sequences/start/route.ts
  - src/app/api/crm/sequences/[instanceId]/route.ts
  - src/app/api/crm/sequences/by-prospect/[prospectId]/route.ts
autonomous: true
requirements: [SEQ-01, SEQ-08, SEQ-09, SEQ-10]
tags: [api, route-handler, sequences, engine, trigger, supabase]

must_haves:
  truths:
    - "POST /api/crm/sequences/start crée une sequence_instance + ses sequence_instance_steps en BDD"
    - "GET /api/crm/sequences/by-prospect/[prospectId] retourne les instances + steps d'un prospect"
    - "PATCH /api/crm/sequences/[instanceId] avec body { action: 'pause' | 'resume' | 'cancel' } met à jour le statut + timestamp correspondant"
    - "Une instance créée pour un prospect+template déjà actif n'en crée pas une seconde (guard de doublon)"
    - "Chaque step exécuté côté serveur insère une ligne dans interactions (SEQ-10)"
  artifacts:
    - path: "src/lib/sequences/types.ts"
      provides: "Types TypeScript partagés (SequenceChannel, StepStatus, SequenceInstanceWithSteps)"
      contains: "export type SequenceChannel"
    - path: "src/lib/sequences/trigger.ts"
      provides: "triggerSequenceForStage() — création instance + steps planifiés"
      exports: ["triggerSequenceForStage"]
    - path: "src/lib/sequences/executor.ts"
      provides: "executeStep() + interpolateTemplate() + insertInteraction()"
      exports: ["executeStep", "interpolateTemplate", "insertInteraction"]
    - path: "src/lib/sequences/brevo.ts"
      provides: "sendBrevoEmail() + sendBrevoSms()"
      exports: ["sendBrevoEmail", "sendBrevoSms"]
    - path: "src/app/api/crm/sequences/start/route.ts"
      provides: "POST start"
      exports: ["POST"]
    - path: "src/app/api/crm/sequences/[instanceId]/route.ts"
      provides: "GET status + PATCH pause/resume/cancel"
      exports: ["GET", "PATCH"]
    - path: "src/app/api/crm/sequences/by-prospect/[prospectId]/route.ts"
      provides: "GET liste instances par prospect"
      exports: ["GET"]
  key_links:
    - from: "POST /api/crm/sequences/start"
      to: "triggerSequenceForStage()"
      via: "import direct + appel"
      pattern: "import.*triggerSequenceForStage"
    - from: "executor.ts"
      to: "Brevo REST API + Supabase interactions"
      via: "fetch() + supabase.from('interactions').insert()"
      pattern: "from\\('interactions'\\)\\.insert"
---

## Phase Goal

**As a** CGP utilisant le dashboard, **I want to** disposer d'une couche logicielle (lib + API) qui sait créer une instance de séquence pour un prospect, exécuter ses étapes serveur (email/SMS), tracer chaque action dans `interactions` et permettre pause/reprise/annulation, **so that** l'UI et l'auto-trigger pipeline puissent s'y brancher sans dupliquer la logique métier.

<objective>
Construire la lib `src/lib/sequences/` (types + trigger + executor + brevo helpers) et 3 routes API REST conformes aux patterns Phase 1 (auth `getUser()`, validation Zod v4 `.issues`, helpers `apiSuccess/apiError/apiUnauthorized`). Cette tranche couvre les requirements SEQ-01 (route POST start utilisée par le bouton drawer en 02C), SEQ-08 (lecture statut via GET by-prospect), SEQ-09 (PATCH pause/resume/cancel) et SEQ-10 (insertion interactions à chaque exécution serveur).

Purpose: Tout le reste de la phase (UI 02C, auto-trigger 02D, Brevo executors 02E) consomme ces types et routes. Une couche métier propre évite la duplication entre auto-trigger et démarrage manuel.
Output: 4 fichiers lib + 3 routes API testables via curl/fetch, retournant des JSON conformes au format `{data, error}` existant.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/02-sequences-multicanales/02-RESEARCH.md
@.planning/phases/01-data-wiring/01A-SUMMARY.md
@.planning/phases/01-data-wiring/01B-SUMMARY.md
@.planning/phases/02-sequences-multicanales/02A-PLAN.md
@src/lib/api.ts
@src/lib/supabase/server.ts
@src/app/api/pipeline/move/route.ts

<interfaces>
<!-- Helpers existants à utiliser tels quels -->

Depuis src/lib/api.ts :
```typescript
export function apiSuccess<T>(data: T, status?: number): NextResponse;
export function apiError(message: string, status?: number): NextResponse;  // default 500
export function apiUnauthorized(): NextResponse;  // 401 "Non autorisé"
export function apiNotFound(resource?: string): NextResponse;
```

Depuis src/lib/supabase/server.ts :
```typescript
export async function createSupabaseServerClient(): Promise<SupabaseClient>;
```

Pattern Route Handler (depuis pipeline/move/route.ts) :
```typescript
const supabase = await createSupabaseServerClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return apiUnauthorized()
let body: unknown
try { body = await request.json() } catch { return apiError('Invalid JSON body', 400) }
const parsed = schema.safeParse(body)
if (!parsed.success) return apiError(parsed.error.issues.map((e) => e.message).join(', '), 400)
```

Schéma DB (de 02A-PLAN.md, après migration 005) :
- `sequence_templates(id, user_id, name, pipeline_stage, auto_trigger)`
- `sequence_template_steps(id, template_id, step_order, channel, delay_days, message_template)`
- `sequence_instances(id, user_id, prospect_id, template_id, status, started_at, paused_at, completed_at, cancelled_at)`
- `sequence_instance_steps(id, instance_id, template_step_id, step_order, channel, scheduled_at, executed_at, status, error_message, message_sent)`
- `interactions(id, user_id, prospect_id, type interaction_type, ...)` — type accepte désormais 'sms'
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Créer la lib sequences (types + trigger + executor + brevo helpers)</name>
  <read_first>
    - .planning/phases/02-sequences-multicanales/02-RESEARCH.md (Patterns 2-5, 8 + Pitfalls 3, 4, 6)
    - src/lib/api.ts (helpers — ne pas importer ici, utilisés dans les routes)
    - src/lib/supabase/server.ts (createSupabaseServerClient signature)
  </read_first>
  <files>src/lib/sequences/types.ts, src/lib/sequences/brevo.ts, src/lib/sequences/executor.ts, src/lib/sequences/trigger.ts</files>
  <action>
Créer 4 fichiers dans `src/lib/sequences/` :

**1. `src/lib/sequences/types.ts`** — types partagés :
```typescript
import type { SupabaseClient } from '@supabase/supabase-js'

export type SequenceChannel = 'whatsapp' | 'email' | 'sms' | 'call_reminder' | 'linkedin'
export type SequenceStatus = 'active' | 'paused' | 'completed' | 'cancelled'
export type StepStatus = 'pending' | 'sent' | 'failed' | 'skipped'

export type SequenceTemplate = {
  id: string
  user_id: string
  name: string
  pipeline_stage: string | null
  auto_trigger: boolean
}

export type SequenceTemplateStep = {
  id: string
  template_id: string
  step_order: number
  channel: SequenceChannel
  delay_days: number
  message_template: string | null
}

export type SequenceInstanceStep = {
  id: string
  instance_id: string
  template_step_id: string | null
  step_order: number
  channel: SequenceChannel
  scheduled_at: string
  executed_at: string | null
  status: StepStatus
  error_message: string | null
  message_sent: string | null
}

export type SequenceInstance = {
  id: string
  user_id: string
  prospect_id: string
  template_id: string | null
  status: SequenceStatus
  started_at: string
  paused_at: string | null
  completed_at: string | null
  cancelled_at: string | null
}

export type SequenceInstanceWithSteps = SequenceInstance & {
  template_name: string | null
  steps: SequenceInstanceStep[]
}

export type ProspectForSequence = {
  id: string
  full_name: string
  phone: string | null
  phone_normalized: string | null
  email: string | null
  pipeline_stage: string
  linkedin_url: string | null
}

// Helper type pour un client Supabase typé minimalement
export type SupabaseLike = SupabaseClient
```

**2. `src/lib/sequences/brevo.ts`** — helpers Brevo (Pattern 3 + 4 RESEARCH) :
```typescript
type BrevoResult = { success: boolean; error?: string }

export async function sendBrevoEmail(args: {
  to: string
  toName: string
  subject: string
  htmlContent: string
}): Promise<BrevoResult> {
  const apiKey = process.env.BREVO_API_KEY
  const sender = process.env.BREVO_SENDER_EMAIL
  if (!apiKey) return { success: false, error: 'BREVO_API_KEY manquante' }
  if (!sender) return { success: false, error: 'BREVO_SENDER_EMAIL manquante' }

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'Ted - CGP', email: sender },
        to: [{ email: args.to, name: args.toName }],
        subject: args.subject,
        htmlContent: args.htmlContent,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }))
      return { success: false, error: err.message || `HTTP ${res.status}` }
    }
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Erreur réseau Brevo' }
  }
}

export async function sendBrevoSms(args: {
  to: string  // E.164 ex: +33612345678
  content: string
  sender?: string
}): Promise<BrevoResult> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) return { success: false, error: 'BREVO_API_KEY manquante' }

  try {
    const res = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: args.sender || 'TedCGP',
        recipient: args.to,
        content: args.content,
        type: 'transactional',
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }))
      return { success: false, error: err.message || `HTTP ${res.status}` }
    }
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Erreur réseau Brevo SMS' }
  }
}
```

**3. `src/lib/sequences/executor.ts`** — exécution d'une étape côté serveur + helpers (Pattern 5 RESEARCH) :
```typescript
import type { SupabaseLike, ProspectForSequence, SequenceInstanceStep, SequenceChannel } from './types'
import { sendBrevoEmail, sendBrevoSms } from './brevo'

export function interpolateTemplate(
  template: string,
  prospect: { full_name: string; phone: string | null; email: string | null; pipeline_stage: string }
): string {
  const parts = prospect.full_name.split(' ')
  const prenom = parts.length > 1 ? parts[0] : prospect.full_name
  return template
    .replace(/\{\{nom\}\}/g, prospect.full_name)
    .replace(/\{\{prenom\}\}/g, prenom)
    .replace(/\{\{telephone\}\}/g, prospect.phone ?? '')
    .replace(/\{\{email\}\}/g, prospect.email ?? '')
    .replace(/\{\{stade\}\}/g, prospect.pipeline_stage)
}

const CHANNEL_TO_INTERACTION: Record<SequenceChannel, string> = {
  whatsapp: 'whatsapp',
  email: 'email',
  sms: 'sms',
  call_reminder: 'appel',
  linkedin: 'linkedin',
}

export async function insertInteraction(args: {
  supabase: SupabaseLike
  userId: string
  prospectId: string
  channel: SequenceChannel
  notes: string
  isHonored: boolean
}): Promise<{ error?: string }> {
  const { error } = await args.supabase.from('interactions').insert({
    user_id: args.userId,
    prospect_id: args.prospectId,
    type: CHANNEL_TO_INTERACTION[args.channel],
    notes: args.notes,
    is_honored: args.isHonored,
    occurred_at: new Date().toISOString(),
  })
  if (error) return { error: error.message }
  return {}
}

/**
 * Exécute une étape côté serveur (email, sms, call_reminder).
 * NE PAS appeler pour whatsapp / linkedin — ces canaux sont client-only (Pitfall 2 RESEARCH).
 * Met à jour status='sent' AVANT le call API (optimistic — Pitfall 5).
 */
export async function executeStep(args: {
  supabase: SupabaseLike
  userId: string
  step: SequenceInstanceStep
  prospect: ProspectForSequence
  messageTemplate: string | null
}): Promise<{ status: 'sent' | 'failed' | 'skipped'; error?: string; messageSent?: string }> {
  const { supabase, userId, step, prospect, messageTemplate } = args

  if (step.channel === 'whatsapp' || step.channel === 'linkedin') {
    return { status: 'skipped', error: 'Canal client-only — exécution serveur ignorée' }
  }

  const interpolated = messageTemplate
    ? interpolateTemplate(messageTemplate, prospect)
    : ''

  // Optimistic lock — marquer 'sent' AVANT l'envoi (Pitfall 5)
  await supabase
    .from('sequence_instance_steps')
    .update({ status: 'sent', executed_at: new Date().toISOString(), message_sent: interpolated })
    .eq('id', step.id)

  if (step.channel === 'email') {
    if (!prospect.email) {
      await supabase.from('sequence_instance_steps').update({
        status: 'failed', error_message: 'Email du prospect absent',
      }).eq('id', step.id)
      return { status: 'failed', error: 'Email du prospect absent' }
    }
    const subject = `Suivi — ${prospect.full_name}`
    const htmlContent = interpolated.replace(/\n/g, '<br>')
    const res = await sendBrevoEmail({
      to: prospect.email, toName: prospect.full_name, subject, htmlContent,
    })
    if (!res.success) {
      await supabase.from('sequence_instance_steps').update({
        status: 'failed', error_message: res.error,
      }).eq('id', step.id)
      return { status: 'failed', error: res.error }
    }
    await insertInteraction({
      supabase, userId, prospectId: prospect.id, channel: 'email',
      notes: `[Séquence] Email envoyé : ${subject}`, isHonored: true,
    })
    return { status: 'sent', messageSent: interpolated }
  }

  if (step.channel === 'sms') {
    const phone = prospect.phone_normalized || prospect.phone
    if (!phone) {
      await supabase.from('sequence_instance_steps').update({
        status: 'failed', error_message: 'Téléphone du prospect absent',
      }).eq('id', step.id)
      return { status: 'failed', error: 'Téléphone du prospect absent' }
    }
    const res = await sendBrevoSms({ to: phone, content: interpolated.slice(0, 160) })
    if (!res.success) {
      await supabase.from('sequence_instance_steps').update({
        status: 'failed', error_message: res.error,
      }).eq('id', step.id)
      return { status: 'failed', error: res.error }
    }
    await insertInteraction({
      supabase, userId, prospectId: prospect.id, channel: 'sms',
      notes: `[Séquence] SMS envoyé : ${interpolated.slice(0, 80)}...`, isHonored: true,
    })
    return { status: 'sent', messageSent: interpolated }
  }

  if (step.channel === 'call_reminder') {
    // Insère une interaction type='appel', is_honored=false (rappel à honorer)
    const result = await insertInteraction({
      supabase, userId, prospectId: prospect.id, channel: 'call_reminder',
      notes: `[Séquence] ${interpolated || `Rappel à honorer pour ${prospect.full_name}`}`,
      isHonored: false,
    })
    if (result.error) {
      await supabase.from('sequence_instance_steps').update({
        status: 'failed', error_message: result.error,
      }).eq('id', step.id)
      return { status: 'failed', error: result.error }
    }
    return { status: 'sent', messageSent: interpolated }
  }

  return { status: 'failed', error: `Canal inconnu : ${step.channel}` }
}
```

**4. `src/lib/sequences/trigger.ts`** — création d'instance + steps planifiés (Pattern 2 + Pitfall 3 RESEARCH) :
```typescript
import type { SupabaseLike } from './types'

type TriggerArgs = {
  supabase: SupabaseLike
  userId: string
  prospectId: string
  /** Si fourni : démarrage manuel d'un template précis (SEQ-01). */
  templateId?: string
  /** Si fourni : auto-trigger sur changement de stade (SEQ-02). Cherche un template avec auto_trigger=true et pipeline_stage match. */
  toStage?: string
}

type TriggerResult = {
  instanceId?: string
  error?: string
  /** true si un doublon actif existait — pas d'instance créée */
  alreadyActive?: boolean
}

export async function triggerSequenceForStage(args: TriggerArgs): Promise<TriggerResult> {
  const { supabase, userId, prospectId, templateId, toStage } = args

  // 1. Résoudre le template
  let resolvedTemplateId = templateId
  if (!resolvedTemplateId) {
    if (!toStage) return { error: 'templateId ou toStage requis' }
    const { data: tpl } = await supabase
      .from('sequence_templates')
      .select('id')
      .eq('user_id', userId)
      .eq('pipeline_stage', toStage)
      .eq('auto_trigger', true)
      .limit(1)
      .maybeSingle()
    if (!tpl) return { alreadyActive: false }  // Pas de template auto pour ce stade — non-erreur
    resolvedTemplateId = tpl.id as string
  }

  // 2. Guard doublon (Pitfall 3) — pas d'instance active déjà sur ce prospect+template
  const { data: existing } = await supabase
    .from('sequence_instances')
    .select('id')
    .eq('user_id', userId)
    .eq('prospect_id', prospectId)
    .eq('template_id', resolvedTemplateId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()
  if (existing) return { instanceId: existing.id as string, alreadyActive: true }

  // 3. Charger les steps du template
  const { data: templateSteps, error: stepsErr } = await supabase
    .from('sequence_template_steps')
    .select('id, step_order, channel, delay_days, message_template')
    .eq('template_id', resolvedTemplateId)
    .order('step_order', { ascending: true })
  if (stepsErr) return { error: stepsErr.message }
  if (!templateSteps || templateSteps.length === 0) return { error: 'Template sans étapes' }

  // 4. Créer l'instance
  const startedAt = new Date()
  const { data: instance, error: instErr } = await supabase
    .from('sequence_instances')
    .insert({
      user_id: userId,
      prospect_id: prospectId,
      template_id: resolvedTemplateId,
      status: 'active',
      started_at: startedAt.toISOString(),
    })
    .select('id')
    .single()
  if (instErr || !instance) return { error: instErr?.message || 'Création instance échouée' }

  // 5. Créer les sequence_instance_steps avec scheduled_at = started + delay_days
  const stepsRows = templateSteps.map((s) => {
    const scheduled = new Date(startedAt.getTime() + s.delay_days * 24 * 60 * 60 * 1000)
    return {
      instance_id: instance.id as string,
      template_step_id: s.id,
      step_order: s.step_order,
      channel: s.channel,
      scheduled_at: scheduled.toISOString(),
      status: 'pending',
    }
  })

  const { error: stepsInsErr } = await supabase.from('sequence_instance_steps').insert(stepsRows)
  if (stepsInsErr) return { error: stepsInsErr.message }

  return { instanceId: instance.id as string }
}
```
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - 4 fichiers existent : types.ts, brevo.ts, executor.ts, trigger.ts
    - `npx tsc --noEmit` passe sans erreur
    - `grep -l "export.*triggerSequenceForStage" src/lib/sequences/trigger.ts` retourne le fichier
    - `grep -l "export.*sendBrevoEmail" src/lib/sequences/brevo.ts` retourne le fichier
    - `grep -l "export.*executeStep" src/lib/sequences/executor.ts` retourne le fichier
    - `grep -l "export.*interpolateTemplate" src/lib/sequences/executor.ts` retourne le fichier
    - `grep "auto_trigger" src/lib/sequences/trigger.ts` (vérifie présence guard auto_trigger)
    - `grep "alreadyActive" src/lib/sequences/trigger.ts` (vérifie guard doublon)
  </acceptance_criteria>
  <done>Lib sequences complète, compilable, prête à être consommée par les routes.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Créer les 3 routes API sequences (start + by-prospect + instanceId)</name>
  <read_first>
    - src/lib/sequences/trigger.ts (créé en Task 1)
    - src/app/api/pipeline/move/route.ts (pattern Route Handler)
    - src/lib/api.ts (helpers)
  </read_first>
  <files>src/app/api/crm/sequences/start/route.ts, src/app/api/crm/sequences/by-prospect/[prospectId]/route.ts, src/app/api/crm/sequences/[instanceId]/route.ts</files>
  <action>
Créer 3 routes API :

**1. `src/app/api/crm/sequences/start/route.ts`** — POST démarrer manuellement (SEQ-01) :
```typescript
import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'
import { z } from 'zod'
import { triggerSequenceForStage } from '@/lib/sequences/trigger'

const startSchema = z.object({
  prospect_id: z.string().uuid(),
  template_id: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let body: unknown
  try { body = await request.json() } catch { return apiError('Invalid JSON body', 400) }

  const parsed = startSchema.safeParse(body)
  if (!parsed.success) {
    return apiError(parsed.error.issues.map((e) => e.message).join(', '), 400)
  }

  const result = await triggerSequenceForStage({
    supabase,
    userId: user.id,
    prospectId: parsed.data.prospect_id,
    templateId: parsed.data.template_id,
  })

  if (result.error) return apiError(result.error)
  return apiSuccess({
    instance_id: result.instanceId,
    already_active: result.alreadyActive ?? false,
  })
}
```

**2. `src/app/api/crm/sequences/by-prospect/[prospectId]/route.ts`** — GET liste instances + steps (SEQ-08) :
```typescript
import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'
import { z } from 'zod'

const paramsSchema = z.object({ prospectId: z.string().uuid() })

export async function GET(_req: NextRequest, ctx: { params: Promise<{ prospectId: string }> }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const params = await ctx.params
  const parsed = paramsSchema.safeParse(params)
  if (!parsed.success) return apiError('prospectId invalide', 400)

  const { data: instances, error } = await supabase
    .from('sequence_instances')
    .select(`
      id, user_id, prospect_id, template_id, status,
      started_at, paused_at, completed_at, cancelled_at,
      sequence_templates ( name ),
      sequence_instance_steps (
        id, instance_id, template_step_id, step_order, channel,
        scheduled_at, executed_at, status, error_message, message_sent
      )
    `)
    .eq('user_id', user.id)
    .eq('prospect_id', parsed.data.prospectId)
    .order('started_at', { ascending: false })

  if (error) return apiError(error.message)

  const normalized = (instances ?? []).map((inst: any) => ({
    id: inst.id,
    user_id: inst.user_id,
    prospect_id: inst.prospect_id,
    template_id: inst.template_id,
    status: inst.status,
    started_at: inst.started_at,
    paused_at: inst.paused_at,
    completed_at: inst.completed_at,
    cancelled_at: inst.cancelled_at,
    template_name: inst.sequence_templates?.name ?? null,
    steps: (inst.sequence_instance_steps ?? []).sort(
      (a: any, b: any) => a.step_order - b.step_order
    ),
  }))

  return apiSuccess({ instances: normalized })
}
```

**3. `src/app/api/crm/sequences/[instanceId]/route.ts`** — GET status + PATCH action (SEQ-09) :
```typescript
import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized, apiNotFound } from '@/lib/api'
import { z } from 'zod'

const paramsSchema = z.object({ instanceId: z.string().uuid() })
const patchSchema = z.object({ action: z.enum(['pause', 'resume', 'cancel']) })

export async function GET(_req: NextRequest, ctx: { params: Promise<{ instanceId: string }> }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const params = await ctx.params
  const parsed = paramsSchema.safeParse(params)
  if (!parsed.success) return apiError('instanceId invalide', 400)

  const { data: instance, error } = await supabase
    .from('sequence_instances')
    .select(`
      id, status, started_at, paused_at, cancelled_at, completed_at,
      sequence_instance_steps ( id, step_order, channel, scheduled_at, executed_at, status, error_message )
    `)
    .eq('id', parsed.data.instanceId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return apiError(error.message)
  if (!instance) return apiNotFound('Instance')
  return apiSuccess(instance)
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ instanceId: string }> }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const params = await ctx.params
  const paramsParsed = paramsSchema.safeParse(params)
  if (!paramsParsed.success) return apiError('instanceId invalide', 400)

  let body: unknown
  try { body = await request.json() } catch { return apiError('Invalid JSON body', 400) }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues.map((e) => e.message).join(', '), 400)

  const nowIso = new Date().toISOString()
  let update: Record<string, unknown> = {}
  if (parsed.data.action === 'pause') update = { status: 'paused', paused_at: nowIso }
  if (parsed.data.action === 'resume') update = { status: 'active', paused_at: null }
  if (parsed.data.action === 'cancel') update = { status: 'cancelled', cancelled_at: nowIso }

  const { data: updated, error } = await supabase
    .from('sequence_instances')
    .update(update)
    .eq('id', paramsParsed.data.instanceId)
    .eq('user_id', user.id)
    .select('id, status')
    .maybeSingle()

  if (error) return apiError(error.message)
  if (!updated) return apiNotFound('Instance')
  return apiSuccess({ instance_id: updated.id, status: updated.status })
}
```
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - 3 fichiers routes existent aux chemins exacts ci-dessus
    - `npx tsc --noEmit` passe sans erreur
    - `grep -c "export async function POST" src/app/api/crm/sequences/start/route.ts` == 1
    - `grep -c "export async function GET" src/app/api/crm/sequences/by-prospect/\[prospectId\]/route.ts` == 1
    - `grep -c "export async function GET" src/app/api/crm/sequences/\[instanceId\]/route.ts` == 1
    - `grep -c "export async function PATCH" src/app/api/crm/sequences/\[instanceId\]/route.ts` == 1
    - Chaque route appelle `getUser()` puis `apiUnauthorized()` si pas de user
    - Chaque route utilise `parsed.error.issues` (pas `.errors` — Zod v4)
    - Test manuel curl : `curl -X POST http://localhost:3000/api/crm/sequences/start -H "Content-Type: application/json" -d "{}"` retourne 401 (non authentifié — comportement attendu)
  </acceptance_criteria>
  <done>3 routes opérationnelles, prêtes pour intégration UI (02C) et auto-trigger (02D).</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Client navigateur → API Route Handlers | Body JSON non vérifié — validation Zod obligatoire |
| Route Handlers → Brevo REST API | API key serveur uniquement, jamais exposée au client |
| Route Handlers → Supabase | RLS user_id-scoped (défini en 02A) + filtrage explicite |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02B-01 | Spoofing | POST start, PATCH instance | mitigate | `userId` extrait de `getUser()` — jamais du body. Route refuse si `!user`. |
| T-02B-02 | Tampering | Inputs prospect_id/template_id/instanceId | mitigate | `z.string().uuid()` Zod — refuse formats invalides |
| T-02B-03 | Information Disclosure | GET by-prospect / GET instance | mitigate | `.eq('user_id', user.id)` + RLS Supabase défense profonde |
| T-02B-04 | Information Disclosure | BREVO_API_KEY | mitigate | Variable `process.env.BREVO_API_KEY` lue serveur uniquement, jamais préfixée `NEXT_PUBLIC_` |
| T-02B-05 | Tampering | Doublon de séquence | mitigate | Guard `existing.status='active'` dans triggerSequenceForStage (Pitfall 3 RESEARCH) |
| T-02B-06 | Denial of Service | Rate limits Brevo | accept | Volume single user CGP très faible — pas de risque |
</threat_model>

<verification>
- `npx tsc --noEmit` passe
- Les 3 routes répondent 401 sans auth (test curl)
- Le test manuel suivant (avec session valide via cookies) crée une instance :
  ```
  POST /api/crm/sequences/start { prospect_id: <uuid>, template_id: <id-template-démo> }
  -> { data: { instance_id: <uuid>, already_active: false }, error: null }
  ```
- Un second appel avec mêmes params retourne `already_active: true`
- PATCH `{ action: 'pause' }` met `status='paused'` + `paused_at` non null
</verification>

<success_criteria>
- 4 fichiers lib + 3 fichiers routes créés
- TypeScript compile sans erreur
- POST start crée instance + steps planifiés (1 ligne sequence_instances + N lignes sequence_instance_steps)
- GET by-prospect retourne instances + steps triés par step_order
- PATCH gère pause/resume/cancel avec timestamps cohérents
- Guard doublon empêche les instances multiples actives sur prospect+template
</success_criteria>

<output>
After completion, create `.planning/phases/02-sequences-multicanales/02-02B-SUMMARY.md`
</output>
