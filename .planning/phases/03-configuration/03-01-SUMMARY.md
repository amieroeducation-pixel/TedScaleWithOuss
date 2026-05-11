---
phase: 03-configuration
plan: "01"
subsystem: settings-api
tags: [api, settings, kpi, hooks, supabase]
dependency_graph:
  requires: []
  provides:
    - GET /api/settings avec UPSERT et defaults PGRST116
    - PATCH /api/settings Zod v4 validation
    - useUserSettings hook client fetch+save
    - TabKPI branché sur données réelles Supabase
  affects:
    - src/app/(dashboard)/settings/page.tsx
tech_stack:
  added: []
  patterns:
    - UPSERT user_settings par id (PK = auth.uid())
    - getDefaultSettings() exportée pour typage côté client
    - useEffect sync pattern pour initialisation état local depuis API
    - NumInput onChange optionnel pour champs contrôlés
key_files:
  created:
    - src/app/api/settings/route.ts
    - src/hooks/useUserSettings.ts
  modified:
    - src/app/(dashboard)/settings/page.tsx
decisions:
  - "UserSettings type défini inline dans le hook (pas d'import de route serveur) — évite dépendance circulaire client→serveur"
  - "z.record(z.string(), z.record(z.string(), z.string())) — syntaxe Zod v4 require 2 arguments pour record"
  - "useEffect pour synchroniser état local TabKPI depuis settings prop — pattern React correct vs mutation pendant rendu"
metrics:
  duration: "~25 minutes"
  completed: "2026-05-11"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 1
requirements_met: [CFG-06, CFG-07, CFG-09]
---

# Phase 3 Plan 01: Settings API + Hook useUserSettings Summary

**One-liner:** Route API `/api/settings` avec UPSERT Supabase et defaults PGRST116, hook `useUserSettings` avec fetch+save, onglet KPI branché sur données réelles (ca_monthly_target, ca_annual_target, client_health_threshold_days).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Route API /api/settings (GET + PATCH) | 36aa3d9 | src/app/api/settings/route.ts |
| 2 | Hook useUserSettings + brancher onglet KPI | 84906da | src/hooks/useUserSettings.ts, src/app/(dashboard)/settings/page.tsx |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] z.record() Zod v4 requiert 2 arguments**
- **Found during:** Task 1 — vérification tsc
- **Issue:** `z.record(z.record(z.string()))` échoue en TypeScript Zod v4 avec "Expected 2-3 arguments, but got 1"
- **Fix:** Remplacé par `z.record(z.string(), z.record(z.string(), z.string()))` — syntaxe correcte Zod v4
- **Files modified:** src/app/api/settings/route.ts
- **Commit:** inclus dans 36aa3d9

**2. [Rule 1 - Bug] Anti-pattern React dans TabKPI (mutation état pendant rendu)**
- **Found during:** Task 2 — revue du code généré
- **Issue:** Utilisation de `useState` comme référence mutable pour synchronisation — anti-pattern causant des re-renders infinis potentiels
- **Fix:** Remplacé par `useEffect` standard avec dépendance `[settings]`
- **Files modified:** src/app/(dashboard)/settings/page.tsx
- **Commit:** inclus dans 84906da

## Key Decisions

1. **Type UserSettings inline dans le hook** — La note du plan signalait le risque de dépendance circulaire (client hook → serveur route). Le type a été défini directement dans `useUserSettings.ts` sans import depuis la route API. Cela évite les erreurs de build Next.js liées aux imports 'use client' vers 'use server'.

2. **Zod v4 z.record() syntax** — Zod v4 a changé la signature de `z.record()` pour exiger explicitement le schéma de clé en 1er argument. Les routes existantes n'utilisaient pas `z.record()`, donc cette contrainte n'était pas documentée dans le projet.

3. **useEffect sync pattern** — Pour initialiser les champs contrôlés de TabKPI depuis les données API asynchrones, `useEffect([settings])` est utilisé. Cela garantit que les valeurs locales se mettent à jour exactement une fois quand l'API répond.

## Threat Model Compliance

| Threat ID | Status |
|-----------|--------|
| T-03A-01 Tampering PATCH body | Mitigé — Zod v4 valide tous champs avec `.positive()`, `.min()/.max()` |
| T-03A-02 Row autre user | Accepté — RLS Supabase `auth.uid() = id` |
| T-03A-03 Spoofing getUser() | Mitigé — `apiUnauthorized()` sur user null |
| T-03A-04 PGRST116 leak | Accepté — code d'erreur interne non exposé au client |

## Known Stubs

Aucun stub bloquant. Les placeholders Séquences et Triggers sont intentionnels (plans 03-02 et 03-03).

## Threat Flags

Aucun nouveau vecteur d'attaque non couvert par le threat model du plan.

## Self-Check: PASSED

- src/app/api/settings/route.ts : FOUND
- src/hooks/useUserSettings.ts : FOUND
- src/app/(dashboard)/settings/page.tsx : FOUND (modifié)
- Commit 36aa3d9 : FOUND
- Commit 84906da : FOUND
- tsc --noEmit : 0 erreur
