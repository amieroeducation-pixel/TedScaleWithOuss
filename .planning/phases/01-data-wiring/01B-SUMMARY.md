---
phase: 01-data-wiring
plan: 01B
subsystem: clients
tags: [clients, supabase, health-alerts, rpc, data-wiring]
dependency_graph:
  requires: []
  provides: [DATA-04, DATA-05]
  affects: [src/app/(dashboard)/clients/page.tsx]
tech_stack:
  added: []
  patterns: [route-handler-auth, rpc-call, promise-all-fetch, alertcolor-helper]
key_files:
  created:
    - src/app/api/clients/list/route.ts
    - src/app/api/clients/health/route.ts
  modified:
    - src/app/(dashboard)/clients/page.tsx
decisions:
  - "fetch direct (Promise.all) plutôt que TanStack Query — MVP sans QueryClientProvider"
  - "days_without_contact calculé côté route (liste) + severity calculée côté route (health)"
  - "p_user_id issu exclusivement de getUser() — jamais de la requête HTTP"
metrics:
  duration: "~20min"
  completed: "2026-05-10"
  tasks_completed: 3
  files_count: 3
---

# Phase 1 Plan 01B: Page Clients Summary

**One-liner:** Branchement page /clients sur 2 routes API Supabase — liste clients JOIN prospects (DATA-04) + alertes santé via RPC get_client_health_alerts (DATA-05), avec helper alertColor et état vide élégant.

## What Was Built

### Routes API créées

| Route | Méthode | Données | Commit |
|-------|---------|---------|--------|
| `/api/clients/list` | GET | `{ clients: ClientListRow[], count, totalAum }` | `48cd2b5` |
| `/api/clients/health` | GET | `{ alerts: HealthAlert[], count, criticalCount }` | `00f99a4` |

### Types exportés

**`ClientListRow`** (depuis `/api/clients/list/route.ts`) :
```typescript
{ id, prospect_id, total_aum, last_interaction_at, alert_threshold_days, notes,
  created_at, full_name, profession, city, phone, email, pipeline_stage, tags,
  days_without_contact }
```

**`HealthAlert`** (depuis `/api/clients/health/route.ts`) :
```typescript
{ client_id, prospect_id, full_name, last_interaction_at,
  days_without_contact, alert_threshold_days, total_aum, severity: 'warning'|'critical' }
```

### Helper alertColor (page)

```typescript
function alertColor(days: number | null, threshold: number): string {
  if (days === null) return C.textLo         // jamais contacté
  if (days >= threshold * 1.5) return C.warn  // critique
  if (days >= threshold) return C.gold        // alerte
  if (days >= threshold * 0.5) return C.indigo // attention
  return C.green                              // OK
}
```

### Page /clients refondée

- `'use client'` avec `useState` + `useEffect`
- `Promise.all([fetch('/api/clients/list'), fetch('/api/clients/health')])` 
- KPI header : clients actifs / AUM total / alertes santé (badge critique si > 0)
- Section "Alertes Client Health" colorée (warning=gold, critical=warn) avec bouton "Contacter" placeholder
- Tableau "Tous les clients" avec pastille alertColor, tri AUM/jours/nom, recherche
- État vide avec lien vers /crm si aucun client en DB
- États loading/error inline

## Data Flow

```
page.tsx (useEffect)
  ├── fetch('/api/clients/list')
  │     └── clients JOIN prospects → ClientListRow[] + days_without_contact
  └── fetch('/api/clients/health')
        └── rpc('get_client_health_alerts', { p_user_id }) → HealthAlert[] + severity
```

## Security (Threat Model)

| Threat | Mitigation appliquée |
|--------|---------------------|
| T-01B-01 Spoofing | `getUser()` + `apiUnauthorized()` sur les 2 routes |
| T-01B-02 Info Disclosure | `.eq('user_id', user.id)` sur clients, RLS Supabase en défense profonde |
| T-01B-03 Elevation of Privilege | `p_user_id` toujours issu de `getUser()`, jamais de la requête |
| T-01B-04 Tampering | Lecture seule (GET uniquement) |

## Commits

| Hash | Message |
|------|---------|
| `48cd2b5` | feat(01-01B): créer /api/clients/list (DATA-04) |
| `00f99a4` | feat(01-01B): créer /api/clients/health (DATA-05) |
| `605f1bc` | feat(01-01B): brancher page /clients sur données réelles Supabase |

## Deviations from Plan

Aucune — plan exécuté exactement comme écrit.

## Known Stubs

- Bouton "Contacter" dans la section alertes : `onClick={() => {/* placeholder Phase 1 */}}` — action réelle à implémenter en Phase 2 (SEQ-05 relances multicanales).

## Self-Check: PASSED

- [x] `src/app/api/clients/list/route.ts` existe
- [x] `src/app/api/clients/health/route.ts` existe
- [x] `src/app/(dashboard)/clients/page.tsx` modifié
- [x] `npx tsc --noEmit` passe sans erreur
- [x] Commits `48cd2b5`, `00f99a4`, `605f1bc` présents dans git log
- [x] Aucune donnée mockée dans la page (PREMIUM_CLIENTS, ALL_CLIENTS_FULL, PROSPECTS supprimés)
- [x] `fetch.*api/clients/list` présent dans la page
- [x] `fetch.*api/clients/health` présent dans la page
- [x] `rpc.*get_client_health_alerts` présent dans la route health
- [x] `apiUnauthorized` présent dans les 2 routes
