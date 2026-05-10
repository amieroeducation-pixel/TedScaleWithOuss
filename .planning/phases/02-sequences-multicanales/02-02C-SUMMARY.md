---
phase: 02-sequences-multicanales
plan: 02C
subsystem: ui
tags: [react, crm, drawer, sequences, kanban, inline-css, theme]

# Dependency graph
requires:
  - phase: 02-sequences-multicanales/02A
    provides: schema DB sequences (sequence_instances, sequence_steps, sequence_templates)
  - phase: 02-sequences-multicanales/02B
    provides: routes API REST sequences (start, by-prospect, PATCH action, templates)
provides:
  - ProspectDrawer enrichi avec section Séquences complète (SEQ-01, SEQ-08, SEQ-09)
  - Sélecteur template + bouton Démarrer séquence
  - Liste instances actives avec statuts étapes colorés (gold/green/warn)
  - Boutons Pause/Reprendre/Annuler sur instances actives
affects: [02D, crm-ui, sequences-engine]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fetch sequenciel dans useEffect pour charger instances + templates au montage drawer"
    - "Optimistic UI update pour statut instance après action Pause/Resume/Cancel"
    - "Comportement gracieux : sélecteur vide si /api/crm/sequences/templates retourne 404 (route 02D)"
    - "Types locaux dupliqués dans page.tsx (use client) pour éviter dépendances complexes"

key-files:
  created: []
  modified:
    - src/app/(dashboard)/crm/page.tsx

key-decisions:
  - "Types SeqInstance/SeqStep/SeqTemplate dupliqués localement dans page.tsx plutôt qu'importés depuis lib — fichier use client, évite imports complexes"
  - "Route /api/crm/sequences/templates absente jusqu'au plan 02D — sélecteur reste vide sans erreur (comportement gracieux)"
  - "Optimistic update partiel après handleSeqAction : seul le statut de l'instance est mis à jour, pas les étapes (refresh complet non nécessaire)"

patterns-established:
  - "Section drawer pattern : div avec padding 16px 20px + borderBottom C.line + titre 9px uppercase C.textLo"
  - "Statuts d'étapes colorés : C.gold=pending, C.green=sent, C.warn=failed, C.textLo=skipped"
  - "Boutons action séquence : border+background avec opacité hex 15/22 sur couleur sémantique"

requirements-completed: [SEQ-01, SEQ-08, SEQ-09]

# Metrics
duration: 15min
completed: 2026-05-10
---

# Phase 2 Plan C: Section Séquences dans ProspectDrawer Summary

**Section Séquences complète dans le drawer CRM : sélecteur template, bouton Démarrer, liste instances avec statuts d'étapes colorés (gold/green/warn) et boutons Pause/Reprendre/Annuler**

## Performance

- **Duration:** 15 min
- **Started:** 2026-05-10T20:10:00Z
- **Completed:** 2026-05-10T20:25:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Types locaux SeqInstance, SeqStep, SeqTemplate et helpers stepStatusColor/CHANNEL_LABEL ajoutés dans crm/page.tsx
- Section "Séquences de relance" insérée dans ProspectDrawer AVANT "Actions rapides" — conformément au plan
- Sélecteur de template + bouton "Démarrer" appelle POST /api/crm/sequences/start (SEQ-01)
- Liste instances actives avec statuts d'étapes colorés via stepStatusColor (SEQ-08)
- Boutons Pause/Reprendre/Annuler appellent PATCH /api/crm/sequences/[id] (SEQ-09)
- TypeScript compile sans erreur (0 error TS)

## Task Commits

1. **Task 1: Ajouter types et helpers séquences** - `e4e22cb` (feat)
2. **Task 2: Section Séquences dans ProspectDrawer** - `efed13d` (feat)

**Plan metadata:** (à venir — commit docs)

## Files Created/Modified

- `src/app/(dashboard)/crm/page.tsx` - ProspectDrawer enrichi avec section Séquences complète : types locaux + helpers + états + useEffect + handlers + JSX

## Decisions Made

- Types dupliqués localement dans page.tsx (use client) plutôt qu'importés depuis src/lib/sequences/types.ts — évite les dépendances de module complexes dans un composant client
- Route /api/crm/sequences/templates sera créée dans le plan 02D — en attendant, le sélecteur affiche "Aucun template disponible" sans erreur (comportement gracieux géré via .catch(() => {}))
- Optimistic update partiel après action Pause/Resume/Cancel : seul le statut de l'instance est mis à jour côté client via json.data.status, pas les étapes individuelles

## Deviations from Plan

Aucune — plan exécuté exactement tel qu'écrit.

## Issues Encountered

Aucun problème rencontré. TypeScript compile proprement dès la première itération.

## User Setup Required

Aucune configuration externe requise. La section Séquences est fonctionnelle et se dégrade gracieusement si les routes API 02D (/api/crm/sequences/templates) ne sont pas encore créées.

## Next Phase Readiness

- Plan 02C complet : ProspectDrawer expose le cycle de vie complet des séquences
- Plan 02D peut maintenant créer la route GET /api/crm/sequences/templates pour alimenter le sélecteur
- Aucun bloqueur identifié

---
*Phase: 02-sequences-multicanales*
*Completed: 2026-05-10*
