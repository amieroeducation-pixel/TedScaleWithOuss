---
phase: 04-achievements-artefacts
plan: "01"
subsystem: achievements
tags: [achievements, gamification, supabase-migration, api-routes, client-component]
dependency_graph:
  requires: []
  provides:
    - achievements-table
    - api-achievements-check
    - api-achievements-get
    - AchievementsProvider
  affects:
    - dashboard-layout
tech_stack:
  added: []
  patterns:
    - upsert-ignoreDuplicates-anti-doublon
    - useRef-guard-single-execution
    - lazyOnload-script-strategy
key_files:
  created:
    - supabase/migrations/006_achievements.sql
    - src/types/achievements.ts
    - src/app/api/achievements/check/route.ts
    - src/app/api/achievements/route.ts
    - src/components/achievements/AchievementsProvider.tsx
  modified:
    - src/app/(dashboard)/layout.tsx
decisions:
  - "useRef guard pour éviter double appel au check — state React se perd au remount mais ref persiste"
  - "upsert ignoreDuplicates:true au lieu d'INSERT ON CONFLICT — API supabase-js v2 native"
  - "setTimeout 800ms avant dispatchEvent celebrate:all — laisse le temps à celebrations.js de s'initialiser"
  - "Clé achievement CA : ca_monthly_YYYY_MM — se redéclenche chaque nouveau mois calendaire"
metrics:
  duration: "15min"
  completed_date: "2026-05-11"
  tasks_completed: 3
  files_created: 5
  files_modified: 1
---

# Phase 4 Plan 01: Infrastructure Achievements Summary

Infrastructure complète des achievements : table Supabase avec contrainte UNIQUE, 2 routes API (détection + liste), AchievementsProvider invisible dans le layout qui déclenche toast Sonner + animation celebrate:all exactement une fois par achievement.

## What Was Built

### Tâche 1 — Migration 006 + types partagés (commit: 5d864bb)

**supabase/migrations/006_achievements.sql** — Table avec :
- Contrainte `unique (user_id, achievement_key)` — source de vérité anti-redéclenchement (ACH-05)
- RLS activée : SELECT et INSERT filtrés par `auth.uid() = user_id`
- Index sur `user_id` et `achieved_at desc` pour les queries fréquentes

**src/types/achievements.ts** — Types partagés :
- Interface `Achievement` avec tous les champs de la table
- `CLIENT_MILESTONES = [10, 25, 50]` — seuils hardcodés v1
- `MONTH_LABELS_FR` — labels en français pour les labels d'achievement

### Tâche 2 — Routes API (commit: 6c628da)

**POST /api/achievements/check** — Détection et persistance :
- Récupère CA du mois depuis `v_monthly_revenue`
- Objectif depuis `revenue_objectives` (fallback `user_settings.ca_monthly_target`)
- Count clients depuis `clients`
- `upsert(..., { onConflict: 'user_id,achievement_key', ignoreDuplicates: true })` — retourne `null` si doublon, l'achievement déjà existant n'est PAS dans `newAchievements`
- Retourne `{ data: { newAchievements: Achievement[] } }` — tableau vide si tout déjà en BDD

**GET /api/achievements** — Timeline :
- Retourne tous les achievements triés par `achieved_at DESC`
- Gestion gracieuse si table absente (migration pas encore appliquée)

### Tâche 3 — AchievementsProvider + layout (commit: a5ad339)

**src/components/achievements/AchievementsProvider.tsx** :
- `useRef(false)` guard — une seule vérification par session, même si le composant se remonte
- Toast Sonner par badge : description contextuelle CA vs clients
- Pattern dispatch : `setTimeout(() => window.dispatchEvent(new CustomEvent('celebrate:all', { detail: { text: 'OBJECTIF !' } })), 800)`
- Catch silencieux — dashboard jamais bloqué si table absente

**src/app/(dashboard)/layout.tsx** — Ajouts minimaux :
- `import Script from 'next/script'`
- `import { AchievementsProvider } from '@/components/achievements/AchievementsProvider'`
- `<AchievementsProvider />` avant `<Toaster />`
- `<Script src="/celebrations.js" strategy="lazyOnload" />` après `<Toaster />`

## Clés d'Achievement Utilisées

| Type | Clé | Condition |
|------|-----|-----------|
| CA mensuel | `ca_monthly_YYYY_MM` (ex: `ca_monthly_2026_05`) | `caCurrentMonth >= caTarget && caTarget > 0` |
| Seuil clients | `clients_10` | `clientCount >= 10` |
| Seuil clients | `clients_25` | `clientCount >= 25` |
| Seuil clients | `clients_50` | `clientCount >= 50` |

## Comportement Anti-Doublon

L'upsert `ignoreDuplicates: true` fonctionne comme suit :
- **Premier chargement** (achievement non existant) : upsert insère → `data` non null → ajouté à `newAchievements`
- **Rechargements suivants** (achievement déjà en BDD) : upsert ignore → `data === null` → PAS dans `newAchievements`
- **Résultat** : toast + celebrate:all uniquement au premier déclenchement, jamais après

## Migration à Appliquer

La migration `006_achievements.sql` doit être appliquée via :
```bash
npx supabase db push
```
ou depuis la Supabase CLI. Tant que la migration n'est pas appliquée, le GET /api/achievements retourne `[]` gracieusement (gestion d'erreur incluse).

## Deviations from Plan

None — plan exécuté exactement comme spécifié.

## Threat Surface Scan

Aucune nouvelle surface non couverte par le threat model du plan :
- T-04-01 : `getUser()` présent sur POST /check (mitigé)
- T-04-02 : RLS `auth.uid() = user_id` dans migration (mitigé)
- T-04-04 : RLS couvre GET achievements (mitigé)
- T-04-06 : `user_id` toujours issu du JWT serveur, jamais du body client (mitigé)

## Self-Check: PASSED

Tous les fichiers créés vérifiés sur disque. Tous les commits (5d864bb, 6c628da, a5ad339) présents dans git log.
