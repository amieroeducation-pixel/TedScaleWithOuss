---
phase: 03-configuration
plan: "02"
subsystem: sequences-crud
tags: [api, sequences, crud, settings, supabase, zod]
dependency_graph:
  requires:
    - GET /api/crm/sequences/templates (Plan 02-02A)
    - useUserSettings hook (Plan 03-01)
    - sequence_templates + sequence_template_steps schema (Migration 005)
  provides:
    - POST /api/crm/sequences/templates
    - PATCH /api/crm/sequences/templates/[id] avec conflict check auto_trigger 409
    - DELETE /api/crm/sequences/templates/[id]
    - GET /api/crm/sequences/templates/[id]/steps
    - POST /api/crm/sequences/templates/[id]/steps
    - PATCH /api/crm/sequences/templates/[id]/steps/[stepId]
    - DELETE /api/crm/sequences/templates/[id]/steps/[stepId]
    - TabSequences — onglet settings CRUD complet templates + steps
  affects:
    - src/app/(dashboard)/settings/page.tsx
tech_stack:
  added: []
  patterns:
    - await params (Promise) — Next.js 15 dynamic routes
    - verifyTemplateOwnership() helper pour protection IDOR steps via join
    - Conflict check SELECT count avant PATCH auto_trigger=true (409 bloquant)
    - Zod v4 .issues[0].message — jamais .errors
    - Steps chargés à la demande (lazy expand) — GET templates léger au mount
    - step_order non exposé comme champ éditable — élimine violations UNIQUE
key_files:
  created:
    - src/app/api/crm/sequences/templates/[id]/route.ts
    - src/app/api/crm/sequences/templates/[id]/steps/route.ts
    - src/app/api/crm/sequences/templates/[id]/steps/[stepId]/route.ts
  modified:
    - src/app/api/crm/sequences/templates/route.ts
    - src/app/(dashboard)/settings/page.tsx
decisions:
  - "step_order non exposé dans PATCH step — élimine risque de violation UNIQUE (template_id, step_order) lors d'éditions concurrentes ou mal ordonnées"
  - "Steps chargés à la demande (lazy expand) — GET templates reste léger, steps récupérés uniquement quand l'utilisateur expand un template"
  - "verifyStepOwnership via join sequence_template_steps!inner(user_id) — évite double requête SELECT séparée pour vérifier ownership step"
  - "Conflict check auto_trigger : récupère pipeline_stage courant si absent du PATCH body — évite faux 409 si seul auto_trigger=true est patché sans stage"
  - "Types TemplateWithSteps + SequenceStep définis localement dans settings/page.tsx — cohérence avec pattern 03-01 (pas d'import depuis routes serveur)"
metrics:
  duration: "~30 minutes"
  completed: "2026-05-11"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 2
requirements_met: [CFG-01, CFG-02, CFG-03, CFG-05, CFG-08, CFG-09]
---

# Phase 3 Plan 02: Sequences CRUD API + TabSequences Summary

**One-liner:** 4 routes API CRUD sequence_templates/steps avec conflict check 409 auto_trigger, onglet TabSequences dans settings avec chargement lazy des steps, toggle auto_trigger inline et affichage erreur 409 non-bloquant.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Routes CRUD templates + steps (4 fichiers API) | 44493c2 | route.ts (étendu), [id]/route.ts, [id]/steps/route.ts, [id]/steps/[stepId]/route.ts |
| 2 | Onglet TabSequences dans settings/page.tsx | 9301abe | src/app/(dashboard)/settings/page.tsx |

## Deviations from Plan

### Auto-fixed Issues

Aucune déviation — plan exécuté exactement comme spécifié.

## Key Decisions

1. **step_order non exposé dans PatchStepSchema** — Conformément au plan (Q3 RESEARCH : "L'UI ne propose PAS de réordonnancement drag-and-drop"), le champ `step_order` est délibérément exclu du schéma PATCH step. Cela élimine le risque de violation UNIQUE `(template_id, step_order)` lors d'éditions. Documenté via commentaire inline.

2. **verifyStepOwnership via join Supabase** — Utilisation de `sequence_template_steps!inner(user_id)` pour vérifier en une seule requête que le step appartient à un template de l'utilisateur connecté. Évite deux requêtes SELECT séparées (step → template → user).

3. **Conflict check auto_trigger complet** — Si PATCH body contient `auto_trigger=true` sans `pipeline_stage`, la route récupère d'abord le stage actuel du template puis vérifie le conflit. Cela couvre le cas où l'utilisateur toggle uniquement le booléen sans re-spécifier le stage.

4. **Chargement lazy des steps** — Les steps ne sont chargés que lors de l'expand d'un template dans l'UI. Le GET templates reste léger (4 colonnes), conforme à la note du plan : "les templates sont chargés sans les steps au départ".

## Threat Model Compliance

| Threat ID | Status |
|-----------|--------|
| T-03B-01 IDOR template PATCH/DELETE | Mitigé — `.eq('user_id', user.id)` sur toutes les queries templates |
| T-03B-02 IDOR step | Mitigé — `verifyStepOwnership()` via join template → user_id |
| T-03B-03 auto_trigger collision | Mitigé — SELECT count avant PATCH, 409 si conflit |
| T-03B-04 Injection message_template | Accepté — stocké as-is, pas de SQL dynamique |
| T-03B-05 step_order UNIQUE violation | Mitigé — step_order non exposé en PATCH + gestion code 23505 en POST |
| T-03B-06 params.id non-UUID | Accepté — Supabase retourne 0 rows, pas de crash |

## Known Stubs

Aucun stub bloquant. L'onglet Triggers (plan 03-03) reste un placeholder intentionnel.

## Threat Flags

Aucun nouveau vecteur d'attaque non couvert par le threat model du plan.

## Self-Check: PASSED

- src/app/api/crm/sequences/templates/route.ts : FOUND (modifié avec POST)
- src/app/api/crm/sequences/templates/[id]/route.ts : FOUND
- src/app/api/crm/sequences/templates/[id]/steps/route.ts : FOUND
- src/app/api/crm/sequences/templates/[id]/steps/[stepId]/route.ts : FOUND
- src/app/(dashboard)/settings/page.tsx : FOUND (TabSequences ajouté)
- Commit 44493c2 : FOUND
- Commit 9301abe : FOUND
- tsc --noEmit : 0 erreur
