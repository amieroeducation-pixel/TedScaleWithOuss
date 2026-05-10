---
phase: 01-data-wiring
plan: 01C
subsystem: today-weekly-signal
tags: [today, weekly-signal, supabase, data-wiring, DATA-06, DATA-07]
dependency_graph:
  requires: []
  provides: [weekly-signal-api, today-page-signal-section]
  affects: [src/app/(dashboard)/today/page.tsx, src/app/api/today/signal/route.ts]
tech_stack:
  added: []
  patterns: [fetch+useState (Option A), date-fns startOfWeek/endOfWeek/addDays/format, inline-css theme]
key_files:
  created:
    - src/app/api/today/signal/route.ts
  modified:
    - src/app/(dashboard)/today/page.tsx
decisions:
  - "Fetch direct + useState (Option A du RESEARCH) — pas de QueryClientProvider requis en Phase 1"
  - "Section Weekly Signal placee EN HAUT de la page (avant la tab bar) pour priorite visuelle"
  - "Deux sections en grid 2 colonnes: Relances 7j (gauche) + RDV semaine (droite)"
  - "Loading/error discrets inline dans chaque section (ne cachent pas le timer/compteurs)"
metrics:
  duration: "~15 minutes"
  completed: "2026-05-10T20:01:19Z"
  tasks_completed: 2
  files_changed: 2
---

# Phase 1 Plan 01C: Weekly Signal / Today Summary

**One-liner:** Route `/api/today/signal` retournant relances J+7 et RDV semaine depuis Supabase, affichees dans une nouvelle section Weekly Signal sur `/today` sans regression sur les composants existants.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Creer /api/today/signal (DATA-06 + DATA-07) | b12e29dd | src/app/api/today/signal/route.ts (cree) |
| 2 | Ajouter section Weekly Signal a /today | 19e349f9 | src/app/(dashboard)/today/page.tsx (modifie) |

## What Was Built

### Route API `/api/today/signal`

- **Fichier:** `src/app/api/today/signal/route.ts`
- **Auth:** `getUser()` + `apiUnauthorized()` (mitigation T-01C-01)
- **DATA-06 (relances J+7):** `prospects` filtre `next_action_date BETWEEN aujourd'hui AND J+7`, ordonne `next_action_date ASC, lead_score DESC`, champ calcule `days_until`
- **DATA-07 (RDV semaine):** `interactions` filtre `type IN ('rdv1','rdv2','rdv3')` ET `occurred_at` dans la semaine lundi-dimanche via `date-fns startOfWeek/endOfWeek`
- **Retour:** `{ relances: RelanceRow[], rdvSemaine: RdvRow[], todayCount: number, weekRdvCount: number }`
- **Securite:** `.eq('user_id', user.id)` sur les deux requetes (mitigation T-01C-02/03)

### Section Weekly Signal dans `/today`

Ajoute **avant la tab bar** (priorite visuelle maximale) en grid 2 colonnes :

**Colonne gauche — "Relances prioritaires" (DATA-06)**
- Compteur dynamique : `N aujourd'hui · N cette semaine`
- Liste des 10 premieres relances avec : nom, profession, pipeline_stage, badge `AUJOURD'HUI` (warn) ou `J+N` (gold), lead_score colore (vert >= 70, gold 40-69, gris < 40)
- Etat vide : "Aucune relance planifiee dans les 7 prochains jours."

**Colonne droite — "RDV de la semaine" (DATA-07)**
- Compteur dynamique : `N RDV cette semaine`
- Liste avec day_label (ex: "Lun 11/05 09:30"), badge type colore (rdv1=indigo, rdv2=green, rdv3=gold), nom du prospect
- Etat vide : "Aucun RDV planifie cette semaine. Cree des interactions de type rdv1/rdv2/rdv3."

## Blocs Existants Preserves (Pitfall 4)

- Timer Pomodoro (chronometre 45min, 6 blocs) — **intact**
- Compteurs manuels (contacts, appels, RDV R1/R2) — **intact**
- Script d'appel (TNS/Chef/Particulier) — **intact**
- Kanban relances manuelles (arappeler/appelee/replanifier/terminee) — **intact**
- Lecteur audio (AudioPlayer) — **intact**

## Etat des Donnees

- **Si DB vide:** Etats vides elegants affiches dans les deux sections
- **Si DB avec donnees:** Donnees reelles depuis `prospects.next_action_date` et `interactions`
- **Donnees fictives:** Aucune donnee fictive dans la section Weekly Signal (les constantes statiques du timer/compteurs sont de l'etat local React, pas des donnees DB)

## Deviations from Plan

None — plan execute exactement comme ecrit.

## Known Stubs

Aucun stub bloquant dans la section Weekly Signal. Les compteurs manuels (`contacts=6`, `calls=14`, etc.) dans l'onglet Prospection sont du state local React intentionnel (cockpit du jour, non lie a la DB en Phase 1).

## Threat Flags

Aucun nouveau vecteur d'attaque introduit au-dela du threat model du plan.

## TypeScript

`npx tsc --noEmit` : PASS (0 erreur)

## Self-Check: PASSED

- [x] `src/app/api/today/signal/route.ts` existe
- [x] `src/app/(dashboard)/today/page.tsx` modifie
- [x] Commit b12e29dd existe (Tache 1)
- [x] Commit 19e349f9 existe (Tache 2)
- [x] TypeScript compile sans erreur
- [x] `next_action_date` mentionne >= 2 fois dans la route
- [x] `rdv1` mentionne dans la route
- [x] `startOfWeek` utilise
- [x] `apiUnauthorized` present
- [x] `weekStartsOn: 1` present (x2)
- [x] `days_until` present dans route et page
- [x] `fetch.*api/today/signal` present dans la page
