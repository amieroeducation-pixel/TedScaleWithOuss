# 01D SUMMARY — Page Analytics branchée Supabase (DATA-08, DATA-09)

## Fichiers créés / modifiés

| Fichier | Action | Description |
|---------|--------|-------------|
| `src/app/api/analytics/pipeline/route.ts` | Créé | GET DATA-08 — conversion par stade depuis `v_pipeline_conversion` |
| `src/app/api/analytics/closing/route.ts` | Créé | GET DATA-09 — taux de closing global + mix produit depuis `contracts` |
| `src/app/(dashboard)/analytics/page.tsx` | Modifié | Page refondue : KPI cards + barres pipeline + PieChart Recharts |

## Routes API

### GET /api/analytics/pipeline (DATA-08)
- Source : vue `v_pipeline_conversion` filtrée par `user_id`
- Retourne : `{ stages[], totalProspects, convertedCount, lostCount }`
- Tous les stades garantis (même si total = 0), triés dans l'ordre canonique du pipeline

### GET /api/analytics/closing (DATA-09)
- Source : `prospects` (count converti/perdu) + `contracts JOIN financial_products`
- Retourne : `{ globalClosingRate, convertedTotal, lostTotal, totalProspects, byProduct[] }`
- `globalClosingRate` = converti / (converti + perdu) × 100

## Décision documentée — rate_pct v1

**Définition v1 :** `rate_pct` par produit = part de ce produit dans les conversions totales (proxy du mix produit), **pas** un taux de closing strict par cohorte de prospects.

**Raison :** Le lien prospect ↔ produit n'existe pas directement dans le schéma (le produit est sur le contrat, pas sur le prospect). Une définition stricte nécessiterait une vue SQL dédiée.

**Impact utilisateur :** Le PieChart montre le mix des conversions par produit — informatif et utile sans être trompeur. Le sous-titre "Mix des conversions par produit (v1)" est affiché.

## Phase 1 — COMPLETE

Toutes les pages du dashboard affichent des données réelles :
- ✅ DATA-01/02/03 — Page Revenue : CA mensuel/annuel + graphique 12 mois + commissions par produit
- ✅ DATA-04/05 — Page Clients : liste clients + alertes inactivité colorées
- ✅ DATA-06/07 — Page Weekly Signal (/today) : relances 7j + RDV semaine
- ✅ DATA-08/09 — Page Analytics : conversion pipeline + PieChart closing par produit
