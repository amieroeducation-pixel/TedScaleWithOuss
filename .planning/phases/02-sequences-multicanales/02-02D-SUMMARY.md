---
phase: 02-sequences-multicanales
plan: 02D
subsystem: api, sequences, crm-ui
tags: [api, pipeline, whatsapp, linkedin, auto-trigger, sequences, client-actions]

# Dependency graph
requires:
  - phase: 02-sequences-multicanales/02B
    provides: triggerSequenceForStage() dans lib/sequences/trigger.ts
  - phase: 02-sequences-multicanales/02C
    provides: ProspectDrawer avec section Séquences + fetch /api/crm/sequences/templates
provides:
  - Hook SEQ-02 non-bloquant dans POST /api/pipeline/move (void triggerSequenceForStage)
  - Route GET /api/crm/sequences/templates — liste templates pour sélecteur drawer
  - Helpers navigateur openWhatsApp() + openLinkedIn() dans lib/sequences/client-actions.ts
  - Boutons "Ouvrir WA" / "Ouvrir LinkedIn" dans ProspectDrawer pour étapes client-side pending
affects: [crm-ui, sequences-engine, pipeline]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "void triggerSequenceForStage() — fire-and-forget non-bloquant après pipeline_events.insert"
    - "Directive 'use client' en tête de client-actions.ts pour bloquer import côté serveur"
    - "Normalisation numéro France : .replace(/^0/, '33') pour wa.me"
    - "navigator.clipboard.writeText silencieux avec try/catch vide — compatible localhost et HTTPS"

key-files:
  created:
    - src/app/api/crm/sequences/templates/route.ts
    - src/lib/sequences/client-actions.ts
  modified:
    - src/app/api/pipeline/move/route.ts
    - src/app/(dashboard)/crm/page.tsx

key-decisions:
  - "void triggerSequenceForStage sans await — non-bloquant, erreurs séquence n'affectent pas le déplacement Kanban"
  - "linkedinUrl passé null dans drawer — prospect.linkedin_url absent du type local, redirection vers recherche LinkedIn par nom"
  - "client-actions.ts avec 'use client' — protection contre import accidentel dans Route Handler (T-02D-04)"

patterns-established:
  - "Hook fire-and-forget : void asyncFunction() après opération DB principale"
  - "Client-side channel helpers : directive 'use client' + window.open + navigator.clipboard"

requirements-completed: [SEQ-02, SEQ-03, SEQ-07]

# Metrics
duration: 20min
completed: 2026-05-10
---

# Phase 2 Plan D: Hook SEQ-02 + Route Templates + Helpers Client-Side Summary

**Auto-trigger séquence non-bloquant au déplacement Kanban (SEQ-02), route GET templates alimentant le sélecteur drawer, et helpers navigateur openWhatsApp/openLinkedIn avec boutons d'action dans le drawer (SEQ-03, SEQ-07)**

## Performance

- **Duration:** 20 min
- **Started:** 2026-05-10T20:25:00Z
- **Completed:** 2026-05-10T20:45:00Z
- **Tasks:** 2
- **Files modified/created:** 4

## Accomplishments

- Import `triggerSequenceForStage` ajouté dans `pipeline/move/route.ts` + appel `void` non-bloquant après `pipeline_events.insert` (SEQ-02)
- Route `GET /api/crm/sequences/templates` créée — retourne `{ templates: [...] }` avec `id, name, pipeline_stage, auto_trigger` (SEQ-01 sélecteur)
- `src/lib/sequences/client-actions.ts` créé avec directive `'use client'`, exporte `openWhatsApp()` et `openLinkedIn()` (SEQ-03, SEQ-07)
- Boutons "Ouvrir WA" / "Ouvrir LinkedIn" ajoutés dans ProspectDrawer pour les étapes `pending` des canaux client-side
- TypeScript compile sans erreur (0 error TS)

## Task Commits

1. **Task 1: Hook SEQ-02 + route GET templates** — `7567b02` (feat)
2. **Task 2: Helpers client-side + boutons drawer** — `257cf57` (feat)

## Files Created/Modified

- `src/app/api/pipeline/move/route.ts` — Hook SEQ-02 : import + `void triggerSequenceForStage(...)` après pipeline_events.insert
- `src/app/api/crm/sequences/templates/route.ts` — GET liste templates filtrée par user_id
- `src/lib/sequences/client-actions.ts` — openWhatsApp + openLinkedIn avec 'use client'
- `src/app/(dashboard)/crm/page.tsx` — import client-actions + boutons "Ouvrir WA"/"Ouvrir LinkedIn" dans section étapes

## Decisions Made

- `void triggerSequenceForStage(...)` sans `await` — la réponse de `/api/pipeline/move` n'est pas bloquée par le trigger de séquence. Les erreurs de séquence sont attrapées et loguées dans `triggerSequenceForStage` lui-même (02B)
- `linkedinUrl: null` dans l'appel `openLinkedIn` du drawer — le type `Prospect` local dans `crm/page.tsx` n'a pas de champ `linkedin_url`, la recherche par nom LinkedIn est le fallback attendu
- Directive `'use client'` placée en première ligne de `client-actions.ts` — conformément à T-02D-04, empêche l'import dans Route Handlers

## Deviations from Plan

Aucune — plan exécuté exactement tel qu'écrit.

## Known Stubs

Aucun stub bloquant. Les boutons "Ouvrir WA"/"Ouvrir LinkedIn" utilisent des messages templates hardcodés ("suite à notre échange...", "je me permets de vous contacter...") — fonctionnels pour v1, personnalisables dans une itération future via `message_template` du step.

## Threat Flags

Aucune nouvelle surface sécurité hors threat model. Les menaces T-02D-01 à T-02D-04 ont toutes été mitigées :
- T-02D-01 : userId depuis `getUser()`, jamais du body
- T-02D-02 : guard doublon via `alreadyActive` dans trigger.ts (02B)
- T-02D-03 : accepté — numéro téléphone dans wa.me est délibéré
- T-02D-04 : directive `'use client'` appliquée

## Self-Check

- `src/app/api/pipeline/move/route.ts` — contient `triggerSequenceForStage` et `void` : FOUND
- `src/app/api/crm/sequences/templates/route.ts` — existe : FOUND
- `src/lib/sequences/client-actions.ts` — exports openWhatsApp + openLinkedIn : FOUND (2 exports)
- Commits `7567b02` et `257cf57` : FOUND
- TypeScript 0 erreur : PASSED

## Self-Check: PASSED

---
*Phase: 02-sequences-multicanales*
*Completed: 2026-05-10*
