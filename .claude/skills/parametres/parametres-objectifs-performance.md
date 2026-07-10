---
name: parametres-objectifs-performance
description: Persistance et propagation des objectifs quotidiens/hebdo/annuels vers Today, Dashboard, Global, Revenue — se déclenche quand on touche aux champs KPI, chrono, objectifs du module Paramètres
metadata:
  type: skill
  domain: settings
---

# Skill: Objectifs & Performance

## Périmètre

Tous les champs du module Paramètres qui définissent les objectifs commerciaux et leur propagation vers les autres sections du dashboard.

## Onglets concernés

- **General** : Objectifs quotidiens, Chronomètre production, Objectifs hebdomadaires, Planification annuelle, Délais séquences
- **KPI** : R1/R2 annuels + répartition mensuelle, Collecte (CA), Seuil inactivité, Interpro, Commerce, Sport

## Données et persistance

### Persisté en DB (via `/api/settings` PATCH)

| Champ | Clé DB (`user_settings`) | Valeur par défaut |
|-------|--------------------------|-------------------|
| CA mensuel cible | `ca_monthly_target` | 15000 |
| CA annuel cible | `ca_annual_target` | 180000 |
| Seuil inactivité client | `client_health_threshold_days` | 90 |
| Taux closing objectif | `closing_target_pct` | 40 |
| Appels / jour | `calls_per_day_target` | 20 |
| RDV / semaine | `rdv_per_week_target` | 5 |
| Blocs / jour | `blocks_per_day_target` | 6 |
| Objectifs quotidiens (contacts/calls/rdv1/rdv2) | `daily_targets` (jsonb) | `{"contacts":10,"calls":20,"rdv1":5,"rdv2":3}` |
| Intensité mensuelle | `monthly_intensity` (jsonb) | `{}` |

### NON PERSISTÉ (bug — doit être corrigé)

| Champ | Onglet | Section |
|-------|--------|---------|
| Durée d'un bloc (minutes) | General | Chronomètre production |
| Blocs / jour normal | General | Chronomètre production |
| Blocs / jour grosse prod | General | Chronomètre production |
| Appels / semaine | General | Objectifs hebdomadaires |
| Blocs / semaine | General | Objectifs hebdomadaires |
| Relances / semaine | General | Objectifs hebdomadaires |
| RDV R1 annuel | KPI | Rendez-vous |
| RDV R2 annuel | KPI | Rendez-vous |
| Répartition mensuelle R1/R2 | KPI | Rendez-vous |
| Délais séquences (email, SMS, WhatsApp, étapes max, arrêt auto) | General | Séquences |
| Interpro contacts/jour | KPI | Interpro |
| Commerce minutes/jour | KPI | Commerce |
| Sport séances/semaine | KPI | Sport |

## Sections du dashboard qui consomment ces données

| Section | Données utilisées | Route API |
|---------|-------------------|-----------|
| Today | `daily_targets` | `/api/today/kpis` GET |
| Dashboard (weekly) | `calls_per_day_target`, `blocks_per_day_target`, `rdv_per_week_target` | `/api/dashboard/weekly` GET |
| Global | `daily_targets` + KPIs du jour | `/api/global/stats` GET |
| Revenue | `ca_monthly_target`, `ca_annual_target` | `/api/revenue/stats` GET |
| Clients | `client_health_threshold_days` | `/api/clients/health` GET |
| Données | `calls_per_day_target`, `rdv_per_week_target`, `ca_monthly_target` | `/api/donnees/stats` GET |

## Règles métier

1. Les objectifs quotidiens alimentent directement les barres de progression de la page Today
2. Le seuil d'inactivité déclenche les alertes "client dormant" sur la page Clients
3. La planification annuelle (intensité mensuelle) doit moduler les objectifs du mois en cours
4. Un changement de `calls_per_day_target` impacte immédiatement le baromètre du Dashboard
