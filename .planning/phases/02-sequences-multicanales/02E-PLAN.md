---
phase: 02-sequences-multicanales
plan: 02E
type: execute
wave: 3
depends_on: [02B]
files_modified:
  - src/app/api/crm/actions/email/route.ts
  - src/app/api/crm/actions/sms/route.ts
  - src/app/api/crm/sequences/process/route.ts
  - supabase/functions/process-sequences/index.ts
autonomous: false
requirements: [SEQ-04, SEQ-05, SEQ-06, SEQ-10]
tags: [api, brevo, email, sms, cron, edge-function, sequences]

must_haves:
  truths:
    - "POST /api/crm/actions/email envoie un email Brevo et trace l'action dans interactions"
    - "POST /api/crm/actions/sms envoie un SMS Brevo et trace l'action dans interactions"
    - "Le rappel appel (call_reminder) insère une interaction type='appel', is_honored=false dans la table interactions"
    - "Une route GET /api/crm/sequences/process exécute les étapes J+X dues (scheduled_at <= now()) comme fallback du cron"
    - "Chaque action serveur exécutée crée une entrée dans interactions (SEQ-10)"
  artifacts:
    - path: "src/app/api/crm/actions/email/route.ts"
      provides: "POST — envoyer email Brevo pour une étape de séquence (SEQ-04)"
      exports: ["POST"]
    - path: "src/app/api/crm/actions/sms/route.ts"
      provides: "POST — envoyer SMS Brevo pour une étape de séquence (SEQ-05)"
      exports: ["POST"]
    - path: "src/app/api/crm/sequences/process/route.ts"
      provides: "GET — cron fallback : exécute étapes dues scheduled_at <= now()"
      exports: ["GET"]
    - path: "supabase/functions/process-sequences/index.ts"
      provides: "Edge Function Deno cron quotidien — appelle /api/crm/sequences/process"
      contains: "Deno.cron"
  key_links:
    - from: "GET /api/crm/sequences/process"
      to: "executeStep() dans lib/sequences/executor.ts"
      via: "import direct + boucle sur steps dues"
      pattern: "executeStep"
    - from: "executeStep() — email/sms/call_reminder"
      to: "interactions table"
      via: "insertInteraction() depuis executor.ts"
      pattern: "insertInteraction"
    - from: "supabase/functions/process-sequences/index.ts"
      to: "GET /api/crm/sequences/process"
      via: "fetch() vers l'URL Next.js"
      pattern: "process-sequences"
---

## Phase Goal

**As a** CGP utilisant le dashboard, **I want to** que les séquences envoient automatiquement les emails, SMS et rappels appel aux bons moments (J+X), et que chaque action soit tracée dans mon historique, **so that** je n'ai pas à surveiller manuellement quelles relances doivent partir aujourd'hui.

<objective>
Ce plan implémente les 4 executors serveur manquants : route Email Brevo (SEQ-04), route SMS Brevo (SEQ-05), route process-sequences qui exécute les étapes dues en boucle (SEQ-06 call_reminder inclus), et le fichier Edge Function Supabase pour le cron quotidien. Chaque action exécutée trace une ligne dans `interactions` (SEQ-10).

Purpose: Sans ce plan, les séquences créent des instances et des steps planifiés, mais rien ne les exécute passé J+0. Ce plan ferme la boucle pour les étapes différées (J+2, J+5...) côté serveur.
Output: 3 routes API + 1 fichier Edge Function. La route /process est le fallback si Deno n'est pas disponible en local.
</objective>

<execution_context>
@C:\Users\Ted\.claude\get-shit-done\workflows\execute-plan.md
@C:\Users\Ted\.claude\get-shit-done\templates\summary.md
</execution_context>

<context>
@C:\Users\Ted\Documents\GitHub\TedScaleWithOuss\.planning\phases\02-sequences-multicanales\02-RESEARCH.md
@C:\Users\Ted\Documents\GitHub\TedScaleWithOuss\src\lib\api.ts

<interfaces>
<!-- Depuis src/lib/sequences/executor.ts (créé en 02B) -->
```typescript
export function interpolateTemplate(
  template: string,
  prospect: { full_name: string; phone: string | null; email: string | null; pipeline_stage: string }
): string

export async function insertInteraction(args: {
  supabase: SupabaseLike
  userId: string
  prospectId: string
  channel: SequenceChannel
  notes: string
  isHonored: boolean
}): Promise<{ error?: string }>

export async function executeStep(args: {
  supabase: SupabaseLike
  userId: string
  step: SequenceInstanceStep
  prospect: ProspectForSequence
  messageTemplate: string | null
}): Promise<{ status: 'sent' | 'failed' | 'skipped'; error?: string; messageSent?: string }>
```

<!-- Depuis src/lib/sequences/brevo.ts (créé en 02B) -->
```typescript
export async function sendBrevoEmail(args: {
  to: string; toName: string; subject: string; htmlContent: string
}): Promise<{ success: boolean; error?: string }>

export async function sendBrevoSms(args: {
  to: string; content: string; sender?: string
}): Promise<{ success: boolean; error?: string }>
```

<!-- Pattern Route Handler (pipeline/move/route.ts) -->
```typescript
const supabase = await createSupabaseServerClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return apiUnauthorized()
// Validation Zod v4 : parsed.error.issues.map(e => e.message).join(', ')
```

<!-- Variables d'environnement requises -->
// BREVO_API_KEY — clé API Brevo (email + SMS partagée)
// BREVO_SENDER_EMAIL — adresse expéditeur vérifiée dans Brevo
// Si absentes : sendBrevoEmail/sendBrevoSms retournent { success: false, error: 'BREVO_API_KEY manquante' }

<!-- Schéma sequence_instance_steps (après migration 02A) -->
// status: 'pending' | 'sent' | 'failed' | 'skipped'
// scheduled_at: timestamptz — comparé à now() pour les étapes dues
// channel: 'whatsapp' | 'email' | 'sms' | 'call_reminder' | 'linkedin'
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Routes POST email + SMS Brevo (SEQ-04, SEQ-05)</name>
  <read_first>
    - src/lib/sequences/brevo.ts (sendBrevoEmail, sendBrevoSms)
    - src/lib/sequences/executor.ts (insertInteraction)
    - src/lib/api.ts (apiSuccess, apiError, apiUnauthorized)
    - .planning/phases/02-sequences-multicanales/02-RESEARCH.md (Patterns 3, 4 + Pitfall 5)
  </read_first>
  <files>src/app/api/crm/actions/email/route.ts, src/app/api/crm/actions/sms/route.ts</files>
  <action>
**1. `src/app/api/crm/actions/email/route.ts`** — POST envoyer email Brevo (SEQ-04) :

```typescript
import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'
import { z } from 'zod'
import { sendBrevoEmail } from '@/lib/sequences/brevo'
import { insertInteraction } from '@/lib/sequences/executor'

const emailSchema = z.object({
  prospect_id: z.string().uuid(),
  instance_step_id: z.string().uuid(),
  to_email: z.string().email(),
  to_name: z.string(),
  subject: z.string().min(1),
  html_content: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let body: unknown
  try { body = await request.json() } catch { return apiError('Invalid JSON body', 400) }

  const parsed = emailSchema.safeParse(body)
  if (!parsed.success) {
    return apiError(parsed.error.issues.map((e) => e.message).join(', '), 400)
  }

  const { prospect_id, instance_step_id, to_email, to_name, subject, html_content } = parsed.data

  // Optimistic lock — marquer 'sent' AVANT l'envoi (Pitfall 5 RESEARCH)
  await supabase
    .from('sequence_instance_steps')
    .update({ status: 'sent', executed_at: new Date().toISOString(), message_sent: html_content })
    .eq('id', instance_step_id)

  const result = await sendBrevoEmail({ to: to_email, toName: to_name, subject, htmlContent: html_content })

  if (!result.success) {
    await supabase
      .from('sequence_instance_steps')
      .update({ status: 'failed', error_message: result.error })
      .eq('id', instance_step_id)
    return apiError(result.error ?? 'Envoi email échoué')
  }

  // SEQ-10 : tracer dans interactions
  const { error: intErr } = await insertInteraction({
    supabase,
    userId: user.id,
    prospectId: prospect_id,
    channel: 'email',
    notes: `[Séquence] Email envoyé : ${subject}`,
    isHonored: true,
  })
  if (intErr) console.error('insertInteraction email:', intErr)

  return apiSuccess({ sent: true })
}
```

**2. `src/app/api/crm/actions/sms/route.ts`** — POST envoyer SMS Brevo (SEQ-05) :

```typescript
import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'
import { z } from 'zod'
import { sendBrevoSms } from '@/lib/sequences/brevo'
import { insertInteraction } from '@/lib/sequences/executor'

const smsSchema = z.object({
  prospect_id: z.string().uuid(),
  instance_step_id: z.string().uuid(),
  // phone doit être en format E.164 — phone_normalized depuis prospects
  to_phone: z.string().min(8),
  content: z.string().min(1).max(160),
})

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let body: unknown
  try { body = await request.json() } catch { return apiError('Invalid JSON body', 400) }

  const parsed = smsSchema.safeParse(body)
  if (!parsed.success) {
    return apiError(parsed.error.issues.map((e) => e.message).join(', '), 400)
  }

  const { prospect_id, instance_step_id, to_phone, content } = parsed.data

  // Optimistic lock (Pitfall 5 RESEARCH)
  await supabase
    .from('sequence_instance_steps')
    .update({ status: 'sent', executed_at: new Date().toISOString(), message_sent: content })
    .eq('id', instance_step_id)

  const result = await sendBrevoSms({ to: to_phone, content })

  if (!result.success) {
    await supabase
      .from('sequence_instance_steps')
      .update({ status: 'failed', error_message: result.error })
      .eq('id', instance_step_id)
    return apiError(result.error ?? 'Envoi SMS échoué')
  }

  // SEQ-10 : tracer dans interactions
  const { error: intErr } = await insertInteraction({
    supabase,
    userId: user.id,
    prospectId: prospect_id,
    channel: 'sms',
    notes: `[Séquence] SMS envoyé : ${content.slice(0, 80)}`,
    isHonored: true,
  })
  if (intErr) console.error('insertInteraction sms:', intErr)

  return apiSuccess({ sent: true })
}
```
  </action>
  <verify>
    <automated>npx tsc --noEmit --project C:\Users\Ted\Documents\GitHub\TedScaleWithOuss\tsconfig.json 2>&1 | Select-String "error TS" | Measure-Object | Select-Object -ExpandProperty Count</automated>
  </verify>
  <done>
Les 2 routes POST existent. TypeScript compile sans erreur. Les deux routes utilisent l'optimistic lock (status='sent' avant appel Brevo) et tracent dans interactions. Chaque route retourne 401 sans auth.
  </done>
</task>

<task type="auto">
  <name>Task 2: Route process-sequences (cron fallback) + Edge Function Supabase (SEQ-06, SEQ-10)</name>
  <read_first>
    - src/lib/sequences/executor.ts (executeStep)
    - src/lib/sequences/trigger.ts (types)
    - src/lib/api.ts
    - .planning/phases/02-sequences-multicanales/02-RESEARCH.md (Pitfall 4 — scheduled_at granularité jour, Pitfall 2 — pas de client-side dans cron)
  </read_first>
  <files>src/app/api/crm/sequences/process/route.ts, supabase/functions/process-sequences/index.ts</files>
  <action>
**1. `src/app/api/crm/sequences/process/route.ts`** — GET cron fallback :

Ce handler exécute les étapes serveur dues (scheduled_at::date <= current_date, status='pending').
Les étapes 'whatsapp' et 'linkedin' sont marquées 'skipped' (canaux client-only — Pitfall 2 RESEARCH).

```typescript
import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'
import { executeStep } from '@/lib/sequences/executor'
import type { SequenceInstanceStep, ProspectForSequence, SequenceChannel } from '@/lib/sequences/types'

export async function GET(_req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  // Récupérer les étapes dues non exécutées de ce user
  // scheduled_at <= now() ET status='pending' ET instance status='active'
  const { data: dueSteps, error: fetchErr } = await supabase
    .from('sequence_instance_steps')
    .select(`
      id, instance_id, template_step_id, step_order, channel,
      scheduled_at, executed_at, status, error_message, message_sent,
      sequence_instances!inner (
        id, user_id, prospect_id, status,
        sequence_template_steps!sequence_instance_steps_template_step_id_fkey (
          message_template
        )
      )
    `)
    .lte('scheduled_at', new Date().toISOString())
    .eq('status', 'pending')
    .eq('sequence_instances.user_id', user.id)
    .eq('sequence_instances.status', 'active')
    .limit(50)  // sécurité : max 50 par run

  if (fetchErr) return apiError(fetchErr.message)
  if (!dueSteps || dueSteps.length === 0) {
    return apiSuccess({ processed: 0, results: [] })
  }

  const results: Array<{ step_id: string; status: string; error?: string }> = []

  for (const rawStep of dueSteps) {
    const instance = rawStep.sequence_instances as any
    const templateStep = (instance?.sequence_template_steps) as any

    // Canaux client-only : marquer skipped sans erreur (Pitfall 2 RESEARCH)
    const channel = rawStep.channel as SequenceChannel
    if (channel === 'whatsapp' || channel === 'linkedin') {
      await supabase
        .from('sequence_instance_steps')
        .update({ status: 'skipped', executed_at: new Date().toISOString(),
          error_message: 'Canal client-only — action manuelle requise dans le drawer' })
        .eq('id', rawStep.id)
      results.push({ step_id: rawStep.id, status: 'skipped' })
      continue
    }

    // Charger le prospect
    const { data: prospect } = await supabase
      .from('prospects')
      .select('id, full_name, phone, phone_normalized, email, pipeline_stage, linkedin_url')
      .eq('id', instance.prospect_id)
      .single()

    if (!prospect) {
      await supabase.from('sequence_instance_steps').update({
        status: 'failed', error_message: 'Prospect introuvable',
      }).eq('id', rawStep.id)
      results.push({ step_id: rawStep.id, status: 'failed', error: 'Prospect introuvable' })
      continue
    }

    const step: SequenceInstanceStep = {
      id: rawStep.id,
      instance_id: rawStep.instance_id,
      template_step_id: rawStep.template_step_id,
      step_order: rawStep.step_order,
      channel,
      scheduled_at: rawStep.scheduled_at,
      executed_at: rawStep.executed_at,
      status: rawStep.status as any,
      error_message: rawStep.error_message,
      message_sent: rawStep.message_sent,
    }

    const prospectTyped: ProspectForSequence = {
      id: prospect.id,
      full_name: prospect.full_name,
      phone: prospect.phone,
      phone_normalized: prospect.phone_normalized,
      email: prospect.email,
      pipeline_stage: prospect.pipeline_stage,
      linkedin_url: prospect.linkedin_url,
    }

    const res = await executeStep({
      supabase,
      userId: user.id,
      step,
      prospect: prospectTyped,
      messageTemplate: templateStep?.message_template ?? null,
    })

    results.push({ step_id: rawStep.id, status: res.status, error: res.error })
  }

  return apiSuccess({
    processed: results.length,
    sent: results.filter(r => r.status === 'sent').length,
    failed: results.filter(r => r.status === 'failed').length,
    skipped: results.filter(r => r.status === 'skipped').length,
    results,
  })
}
```

**2. `supabase/functions/process-sequences/index.ts`** — Edge Function cron Deno :

Note : Ce fichier utilise la syntaxe Deno (pas Node.js). Ne pas modifier la config TypeScript projet pour ce fichier.

```typescript
// supabase/functions/process-sequences/index.ts
// Supabase Edge Function — Deno runtime
// Cron quotidien : exécute les étapes J+X dues

const NEXT_APP_URL = Deno.env.get('NEXT_APP_URL') ?? 'http://localhost:3000'
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? ''

// Deno.cron : disponible avec supabase functions serve (v1.103+)
// Si Deno.cron n'est pas disponible, cette Edge Function peut être invoquée manuellement
// via `supabase functions invoke process-sequences`
try {
  Deno.cron('process-sequences-daily', '0 7 * * *', async () => {
    console.log('[process-sequences] Démarrage cron quotidien 7h UTC')
    try {
      const res = await fetch(`${NEXT_APP_URL}/api/crm/sequences/process`, {
        method: 'GET',
        headers: {
          'x-cron-secret': CRON_SECRET,
          'Cookie': ``,  // Le cookie session ne sera pas disponible ici
          // NOTE: Cette route nécessitera un mécanisme d'auth alternative pour le cron
          // Pour Phase 2 MVP : appel GET manuel depuis le navigateur (utilisateur authentifié)
          // Pour Phase 5 : remplacer par un appel service_role Supabase direct
        },
      })
      const json = await res.json()
      console.log('[process-sequences] Résultat:', json)
    } catch (e) {
      console.error('[process-sequences] Erreur:', e)
    }
  })
} catch (e) {
  // Deno.cron non disponible (ancienne version Deno) — fallback : appel manuel
  console.warn('[process-sequences] Deno.cron non disponible — utiliser appel manuel /api/crm/sequences/process depuis le navigateur')
}

// Handler HTTP pour invocation manuelle : supabase functions invoke process-sequences
Deno.serve(async (req) => {
  const secret = req.headers.get('x-cron-secret')
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }
  return new Response(JSON.stringify({ status: 'trigger received — check cron logs' }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```
  </action>
  <verify>
    <automated>powershell.exe -Command "Select-String -Path 'C:\Users\Ted\Documents\GitHub\TedScaleWithOuss\src\app\api\crm\sequences\process\route.ts' -Pattern 'export async function GET|executeStep|sequence_instance_steps' | Measure-Object | Select-Object -ExpandProperty Count"</automated>
  </verify>
  <done>
`process/route.ts` existe et contient GET + executeStep + boucle sur les étapes dues. `supabase/functions/process-sequences/index.ts` existe avec le cron Deno et le fallback gracieux. Les étapes whatsapp/linkedin sont marquées skipped avec message explicite.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Vérifier l'envoi email + SMS Brevo et l'exécution des étapes dues</name>
  <what-built>
    - POST /api/crm/actions/email — envoie email Brevo + trace interactions
    - POST /api/crm/actions/sms — envoie SMS Brevo + trace interactions
    - GET /api/crm/sequences/process — exécute les étapes due (scheduled_at <= now())
    - supabase/functions/process-sequences/index.ts — Edge Function cron quotidien
  </what-built>
  <how-to-verify>
    **Prérequis : Ajouter dans `.env.local`** (si pas encore fait) :
    ```
    BREVO_API_KEY=votre-cle-api-brevo
    BREVO_SENDER_EMAIL=votre-email-expediteur-verifie@domaine.com
    ```

    **Test 1 — Route email (SEQ-04) :**
    Dans le navigateur (connecté), ouvrir la console développeur et exécuter :
    ```javascript
    fetch('/api/crm/actions/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prospect_id: 'VOTRE-PROSPECT-UUID',
        instance_step_id: 'VOTRE-STEP-UUID',
        to_email: 'test@mondomaine.com',
        to_name: 'Test Prospect',
        subject: 'Test séquence Phase 2',
        html_content: '<p>Test email depuis la séquence</p>'
      })
    }).then(r => r.json()).then(console.log)
    ```
    Attendu : `{ data: { sent: true }, error: null }`
    Vérifier : email reçu dans la boîte test + ligne dans table `interactions` (type='email')

    **Test 2 — Route process (cron fallback SEQ-06, SEQ-10) :**
    1. Démarrer une séquence avec le template démo depuis le drawer d'un prospect
    2. Dans Supabase Studio > SQL Editor, vérifier qu'il y a des steps avec `scheduled_at <= now()` et `status='pending'`
    3. Dans la console navigateur :
       ```javascript
       fetch('/api/crm/sequences/process').then(r => r.json()).then(console.log)
       ```
    4. Attendu : `{ data: { processed: N, sent: X, skipped: Y }, error: null }`
    5. Vérifier dans Supabase Studio que les steps traités ont `status='sent'` (email/sms) ou `status='skipped'` (whatsapp/linkedin)
    6. Vérifier que les interactions correspondantes existent dans la table `interactions`

    **Si BREVO_API_KEY absent :**
    L'email/SMS retourne `{ error: 'BREVO_API_KEY manquante' }` — comportement attendu et gracieux.
    Les tests process fonctionnent quand même pour les call_reminder (pas besoin de Brevo).
  </how-to-verify>
  <resume-signal>Tape "approved" si les routes répondent correctement (même sans Brevo réel), ou décris l'erreur.</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| GET /api/crm/sequences/process | Déclenché par l'utilisateur (navigateur) ou par Edge Function — authentification requise |
| Route Handlers → api.brevo.com | BREVO_API_KEY en process.env — jamais exposée au client |
| Edge Function → Next.js API | x-cron-secret header — protège contre les déclenchements non autorisés |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02E-01 | Tampering | Doublon exécution d'étapes | mitigate | Optimistic lock : status='sent' avant appel Brevo — vérifier `status='pending'` dans la requête SELECT (Pitfall 5 RESEARCH) |
| T-02E-02 | Information Disclosure | BREVO_API_KEY | mitigate | Variable `process.env.BREVO_API_KEY` uniquement en Route Handler — jamais préfixée NEXT_PUBLIC_ |
| T-02E-03 | Denial of Service | Cron s'emballe — appels Brevo excessifs | mitigate | Limite `.limit(50)` dans la requête + optimistic lock empêche re-traitement |
| T-02E-04 | Spoofing | Edge Function invoque /api/crm/sequences/process | accept | Phase 2 MVP : l'auth via cookie n'est pas disponible depuis la Edge Function — le process est déclenché manuellement par l'utilisateur authentifié. Phase 5 adressera l'auth service_role |
| T-02E-05 | Tampering | instance_step_id non vérifié par ownership dans /actions/email | mitigate | La requête UPDATE inclut `.eq('id', instance_step_id)` — RLS Supabase filtre par user |
</threat_model>

<verification>
1. TypeScript compile sans erreur (hors supabase/functions — Deno non ciblé par tsconfig)
2. GET /api/crm/sequences/process retourne `{ processed: N }` sans 500
3. Les étapes call_reminder créent une ligne dans `interactions` avec `type='appel', is_honored=false`
4. Les étapes email/sms exécutées ont `status='sent'` dans sequence_instance_steps + ligne dans interactions
5. Les étapes whatsapp/linkedin ont `status='skipped'` avec message explicite dans error_message
</verification>

<success_criteria>
- POST /api/crm/actions/email retourne 200 avec `{ sent: true }` (ou erreur BREVO_API_KEY si absent — gracieux)
- POST /api/crm/actions/sms retourne 200 avec `{ sent: true }` (ou erreur Brevo)
- GET /api/crm/sequences/process exécute les étapes dues et trace chaque action dans interactions (SEQ-10)
- Les call_reminder insèrent une interaction type='appel', is_honored=false (SEQ-06)
- supabase/functions/process-sequences/index.ts existe et contient Deno.cron + fallback gracieux
- TypeScript compile sans erreur sur les fichiers Next.js
</success_criteria>

<output>
After completion, create `.planning/phases/02-sequences-multicanales/02E-SUMMARY.md`
</output>
