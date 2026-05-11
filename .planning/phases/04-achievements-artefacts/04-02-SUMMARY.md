---
phase: 04-achievements-artefacts
plan: "02"
subsystem: achievements
tags: [achievements, timeline, sidebar, badge-dynamique, client-component]
dependency_graph:
  requires:
    - achievements-table
    - api-achievements-get
    - AchievementsProvider
  provides:
    - page-achievements-timeline
    - sidebar-achievements-link
    - badge-dynamique-recents
  affects:
    - dashboard-layout
    - navigation-sidebar
tech_stack:
  added: []
  patterns:
    - client-component-fetch-useEffect
    - badge-dynamique-sidebar
    - inline-css-psg-cosmos
key_files:
  created:
    - src/app/(dashboard)/achievements/page.tsx
  modified:
    - src/app/(dashboard)/layout.tsx
decisions:
  - "Item 'champions' (id modifié de 'champions' à 'achievements') redirigé vers /achievements — évite création d'un item dupliqué"
  - "Badge achievements gold (#e8c878) distinct du badge ruban rouge (tâches/prospects) — différenciation visuelle intentionnelle"
  - "useEffect au montage du layout pour fetch achievements — légère charge unique, acceptable usage solo CGP"
metrics:
  duration: "10min"
  completed_date: "2026-05-11"
  tasks_completed: 2
  files_created: 1
  files_modified: 1
---

# Phase 4 Plan 02: Page /achievements + Sidebar Summary

Page timeline /achievements fonctionnelle avec fetch GET /api/achievements, cards stylées thème PSG Cosmos C.*, et badge dynamique gold dans la sidebar indiquant les achievements des 7 derniers jours.

## What Was Built

### Tâche 1 — Page /achievements timeline (commit: 2420a88)

**src/app/(dashboard)/achievements/page.tsx** — Client Component :
- Fetch `GET /api/achievements` au montage via `useEffect`
- Timeline de cards : icône type (`🏆` CA mensuel, `👥` clients milestone), label Oswald, date fr-FR (`toLocaleDateString('fr-FR', { day, month, year })`)
- Badge "Nouveau" (couleur type) si achievement < 7 jours (`isRecent()`)
- État vide encourageant avec emoji 🎯 et texte guide si aucun badge débloqué
- État chargement centré pendant le fetch
- Thème inline CSS C.* : gold, surface1, line, textHi, textMid, textLo, green, warn

### Tâche 2 — Sidebar lien + badge dynamique (commit: 52260d7)

**src/app/(dashboard)/layout.tsx** — Modifications minimales :
- Import `useEffect` ajouté (`import { useState, useEffect } from 'react'`)
- Item nav `id: 'champions'` → `id: 'achievements'`, `href: '/champions'` → `href: '/achievements'` (label "🏆 Champions" conservé)
- State `recentCount: number` + `useEffect` fetch `/api/achievements` au montage pour filtrer achievements < 7 jours
- Badge gold (#e8c878) dynamique visible dans la sidebar si `recentCount > 0`
- Badge statique ruban conservé pour les autres items (condition `item.id !== 'achievements'`)
- `AchievementsProvider`, `Toaster`, `Script celebrations.js` inchangés

## Navigation Achievements

Le lien "🏆 Champions" dans la section "Principal" de la sidebar pointe désormais vers `/achievements`. La page s'affiche dans le layout dashboard standard sans layout enfant supplémentaire.

## État du Badge Sidebar

- `recentCount > 0` → badge gold visible avec le count (ex: `1`, `2`)
- `recentCount === 0` → aucun badge visible (pas d'encombrement si aucun badge récent)
- Le fetch se fait silencieusement (catch vide) — aucun crash si la table achievements n'est pas encore créée

## Couverture Requirements

| Req | Description | Status |
|-----|-------------|--------|
| ACH-01 | Badge + notification visuelle objectif KPI atteint | ✓ (04-01) |
| ACH-02 | Message célébration avec animation confetti | ✓ (04-01) |
| ACH-03 | Infrastructure table + routes API achievements | ✓ (04-01) |
| ACH-04 | Historique des objectifs atteints (timeline des succès) | ✓ (04-02) |
| ACH-05 | Anti-doublon UNIQUE constraint par achievement_key | ✓ (04-01) |

Phase 04-achievements-artefacts : ACH-01 ✓ ACH-02 ✓ ACH-03 ✓ ACH-04 ✓ ACH-05 ✓

## Deviations from Plan

### Auto-fix — id item nav renommé

**Rule 2 — Cohérence référentielle**
- **Trouvé pendant :** Tâche 2
- **Problème :** Le plan indiquait de changer `href` mais conservait `id: 'champions'` — or la condition `item.id === 'achievements'` du badge dynamique ne matcherait jamais si l'id reste 'champions'
- **Fix :** `id` modifié de `'champions'` à `'achievements'` pour que la condition de badge dynamique fonctionne correctement
- **Fichier :** `src/app/(dashboard)/layout.tsx`
- **Commit :** 52260d7

## Known Stubs

Aucun stub — la page fetch les vraies données depuis `/api/achievements` (route créée en 04-01). L'état vide est intentionnel et non un stub : il s'affiche si la BDD est vide.

## Threat Surface Scan

Aucune nouvelle surface non couverte par le threat model du plan :
- T-04-07 : fetch `/api/achievements` depuis layout — route protégée par `getUser()` Supabase (mitigé en 04-01)
- T-04-08 : `recentCount` — donnée d'affichage cosmétique, aucun impact sécurité (accepté)
- T-04-09 : une seule requête légère au montage du layout — acceptable usage solo (accepté)

## Self-Check: PASSED

- [x] `src/app/(dashboard)/achievements/page.tsx` existe sur disque
- [x] `src/app/(dashboard)/layout.tsx` modifié avec `recentCount`, `useEffect`, `href: '/achievements'`
- [x] Commit 2420a88 présent (page achievements)
- [x] Commit 52260d7 présent (layout sidebar)
- [x] `AchievementsProvider` toujours présent dans layout
- [x] `Script celebrations.js` toujours présent dans layout
