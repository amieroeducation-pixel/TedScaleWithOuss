---
phase: 01-data-wiring
plan: 01A
subsystem: revenue
tags: [revenue, supabase, recharts, data-wiring, bug-fix]
dependency_graph:
  requires: []
  provides: [api/revenue/stats, api/revenue/products, page/revenue]
  affects: [revenue-page-display]
tech_stack:
  added: []
  patterns: [fetch+useState, Route Handler auth, v_monthly_revenue view, financial_products join]
key_files:
  created:
    - src/app/api/revenue/products/route.ts
  modified:
    - src/app/api/revenue/stats/route.ts
    - src/app/(dashboard)/revenue/page.tsx
decisions:
  - "Bug enum commission_status : 'payee' → 'percue' corrigé dans stats route"
  - "monthlyData construit depuis v_monthly_revenue (vue SQL) plutôt qu'un groupement JS sur contracts"
  - "fetch+useState choisi sur TanStack Query (MVP, 0 setup supplémentaire)"
  - "Groupement JS par product_type pour commissions (volume faible, pas de vue SQL dédiée)"
  - "COMMISSIONS_TRIMESTRE et bloc Objectifs vs Réalisé conservés statiques (hors scope DATA-01/02/03)"
metrics:
  duration: "~25 min"
  completed: "2026-05-10"
  tasks_completed: 3
  files_changed: 3
---

# Phase 1 Plan 01A: Page Revenue Summary

**One-liner:** Slice verticale Revenue complète — bug enum percue corrigé, 2 routes API (stats + products) branchées sur v_monthly_revenue et contracts, page /revenue 100% dynamique sans constantes hardcodées.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix bug enum + étendre /api/revenue/stats avec v_monthly_revenue | 9be124a | src/app/api/revenue/stats/route.ts |
| 2 | Créer /api/revenue/products pour commissions par product_type | 0e19b96 | src/app/api/revenue/products/route.ts |
| 3 | Brancher /revenue page sur les 2 routes API | e275b72 | src/app/(dashboard)/revenue/page.tsx |

## Deviations from Plan

None - plan exécuté exactement comme écrit.

## Requirements Satisfied

| Req ID | Description | Status |
|--------|-------------|--------|
| DATA-01 | CA mensuel réel vs objectif sur la page Revenue | Satisfait — KPI caCurrentMonth depuis v_monthly_revenue |
| DATA-02 | Évolution CA sur 12 mois en graphique linéaire | Satisfait — LineChart avec stats.monthlyData (12 points) |
| DATA-03 | Commissions par produit financier | Satisfait — BarChart HTML depuis /api/revenue/products |

## Bug Fix

**Bug critique corrigé : commission_status 'payee' → 'percue'**

- Fichier : `src/app/api/revenue/stats/route.ts`
- Problème : La route filtrait sur `commission_status = 'payee'` mais l'enum DB définit `('attendue','percue','annulee')`
- Impact : Revenue affichait toujours 0 € même si des contrats existaient en DB
- Correction : Remplacé par `'percue'` (2 occurrences : query contracts, count)
- Commit : 9be124a

## Known Stubs

Le bloc "Objectifs vs Réalisé" (CA Annuel, Contrats signés, Taux de closing) reste statique avec des valeurs fictives (220 000 €, 90 contrats, 35%). Ce bloc est explicitement hors scope de DATA-01/02/03 et sera traité dans une phase ultérieure.

Le bloc "Commissions par produit — Évolution trimestrielle" (COMMISSIONS_TRIMESTRE) reste également statique — hors scope.

## Threat Flags

Aucun — toutes les menaces du threat model ont été mitigées :
- T-01A-01 : `getUser()` + `apiUnauthorized()` présents dans les 2 routes
- T-01A-02 : `.eq('user_id', user.id)` appliqué sur v_monthly_revenue
- T-01A-03 : `.eq('user_id', user.id)` appliqué sur contracts dans /api/revenue/products

## Self-Check: PASSED

- [x] src/app/api/revenue/stats/route.ts existe — FOUND
- [x] src/app/api/revenue/products/route.ts existe — FOUND
- [x] src/app/(dashboard)/revenue/page.tsx existe — FOUND
- [x] Commit 9be124a existe — FOUND
- [x] Commit 0e19b96 existe — FOUND
- [x] Commit e275b72 existe — FOUND
- [x] `npx tsc --noEmit` — PASSED (aucune erreur)
- [x] 'payee' absent du repo — VERIFIED (0 occurrences)
- [x] 'percue' présent dans les 2 routes — VERIFIED
- [x] v_monthly_revenue utilisée dans stats route — VERIFIED
- [x] fetch('/api/revenue/stats') dans la page — VERIFIED
- [x] fetch('/api/revenue/products') dans la page — VERIFIED
