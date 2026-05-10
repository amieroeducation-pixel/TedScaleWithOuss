---
phase: 02-sequences-multicanales
plan: 02B
subsystem: sequences-engine
tags: [api, route-handler, sequences, engine, trigger, supabase, brevo]
dependency_graph:
  requires: [005_sequences.sql, src/lib/api.ts, src/lib/supabase/server.ts]
  provides: [src/lib/sequences/, POST /api/crm/sequences/start, GET /api/crm/sequences/by-prospect/[prospectId], GET+PATCH /api/crm/sequences/[instanceId]]
  affects: [02C-ui-sequences, 02D-auto-trigger, 02E-brevo-executors]
tech_stack:
  added: [src/lib/sequences/ (4 fichiers lib)]
  patterns: [getUser() auth, Zod v4 .issues, apiSuccess/apiError/apiUnauthorized, triggerSequenceForStage guard doublon]
key_files:
  created:
    - src/lib/sequences/types.ts
    - src/lib/sequences/brevo.ts
    - src/lib/sequences/executor.ts
    - src/lib/sequences/trigger.ts
    - src/app/api/crm/sequences/start/route.ts
    - src/app/api/crm/sequences/by-prospect/[prospectId]/route.ts
    - src/app/api/crm/sequences/[instanceId]/route.ts
  modified: []
decisions:
  - "executeStep() ignore whatsapp/linkedin (canal client-only) — retourne status=skipped sans erreur"
  - "Guard doublon dans triggerSequenceForStage() via .eq('status','active') — empêche instances multiples actives sur prospect+template"
  - "Optimistic update dans executor.ts — status='sent' inscrit AVANT l'envoi Brevo pour éviter les doubles envois"
  - "CHANNEL_TO_INTERACTION map interne à executor.ts — couplage minimal avec le schéma interactions"
metrics:
  duration: "~10 minutes"
  completed_date: "2026-05-10"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 7
---

# Phase 02 Plan 02B: Sequences Engine (Lib + API) Summary

## One-liner

Lib `src/lib/sequences/` (4 fichiers) + 3 routes API REST pour créer/lire/contrôler des instances de séquences multicanales, avec guard doublon, interpolation template, et traçabilité dans `interactions`.

## What Was Built

### Task 1 — Lib sequences (4 fichiers)

**`src/lib/sequences/types.ts`** — Types TypeScript partagés :
- `SequenceChannel`, `SequenceStatus`, `StepStatus` (enums TypeScript miroir des enums SQL 02A)
- `SequenceTemplate`, `SequenceTemplateStep`, `SequenceInstance`, `SequenceInstanceStep`
- `SequenceInstanceWithSteps` (type agrégé pour le GET by-prospect)
- `ProspectForSequence` (projection minimale du prospect pour l'exécution)
- `SupabaseLike = SupabaseClient` (alias pour injection dans les helpers)

**`src/lib/sequences/brevo.ts`** — Helpers d'envoi Brevo :
- `sendBrevoEmail()` — email transactionnel via Brevo REST v3, lit `BREVO_API_KEY` + `BREVO_SENDER_EMAIL`
- `sendBrevoSms()` — SMS transactionnel via Brevo REST v3, format E.164

**`src/lib/sequences/executor.ts`** — Exécution serveur des steps :
- `interpolateTemplate()` — substitue `{{nom}}`, `{{prenom}}`, `{{telephone}}`, `{{email}}`, `{{stade}}`
- `insertInteraction()` — insère dans `interactions` (SEQ-10)
- `executeStep()` — dispatche email/SMS/call_reminder, gère les échecs, update `sequence_instance_steps.status`

**`src/lib/sequences/trigger.ts`** — Création d'instance :
- `triggerSequenceForStage()` — résolution template (manuel OU auto par stade), guard doublon, création instance + steps planifiés avec `scheduled_at = now + delay_days`

### Task 2 — 3 routes API REST

**`POST /api/crm/sequences/start`** (SEQ-01) :
- Valide `prospect_id` + `template_id` (UUID Zod)
- Délègue à `triggerSequenceForStage()`
- Retourne `{ instance_id, already_active }` — `already_active: true` si doublon détecté

**`GET /api/crm/sequences/by-prospect/[prospectId]`** (SEQ-08) :
- Retourne toutes les instances d'un prospect avec leurs steps et `template_name`
- Steps triés par `step_order` côté applicatif
- Filtrée `user_id` + RLS Supabase (défense profonde)

**`GET /api/crm/sequences/[instanceId]`** + **`PATCH /api/crm/sequences/[instanceId]`** (SEQ-09) :
- GET : retourne instance + ses steps (avec `error_message`)
- PATCH body `{ action: 'pause' | 'resume' | 'cancel' }` :
  - `pause` → `status='paused'` + `paused_at=now`
  - `resume` → `status='active'` + `paused_at=null`
  - `cancel` → `status='cancelled'` + `cancelled_at=now`

## Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Lib sequences (types + brevo + executor + trigger) | 83e5889 | src/lib/sequences/types.ts, brevo.ts, executor.ts, trigger.ts |
| 2 | 3 routes API sequences | d68d5e4 | src/app/api/crm/sequences/start/route.ts, by-prospect/[prospectId]/route.ts, [instanceId]/route.ts |

## Deviations from Plan

None — plan exécuté exactement tel qu'écrit. Les 7 fichiers correspondent mot pour mot aux spécifications du plan.

## Known Stubs

Aucun stub. Les routes sont pleinement fonctionnelles dès que la migration 005 est appliquée en base. Le module brevo.ts requiert `BREVO_API_KEY` et `BREVO_SENDER_EMAIL` en env (retourne une erreur claire si absent).

## Threat Flags

Aucun nouveau vecteur d'attaque introduit hors du threat model 02B. Tous les T-02B-01 à T-02B-05 sont mitigés :
- `userId` extrait uniquement de `getUser()` (T-02B-01)
- Validation UUID Zod sur tous les params (T-02B-02)
- `.eq('user_id', user.id)` sur toutes les queries (T-02B-03)
- `BREVO_API_KEY` lue côté serveur uniquement (T-02B-04)
- Guard doublon `status='active'` dans trigger.ts (T-02B-05)

## Self-Check: PASSED

- [x] src/lib/sequences/types.ts existe
- [x] src/lib/sequences/brevo.ts existe
- [x] src/lib/sequences/executor.ts existe
- [x] src/lib/sequences/trigger.ts existe
- [x] src/app/api/crm/sequences/start/route.ts existe
- [x] src/app/api/crm/sequences/by-prospect/[prospectId]/route.ts existe
- [x] src/app/api/crm/sequences/[instanceId]/route.ts existe
- [x] Commit 83e5889 vérifié
- [x] Commit d68d5e4 vérifié
- [x] `npx tsc --noEmit` passe sans erreur (vérifié 2 fois)
