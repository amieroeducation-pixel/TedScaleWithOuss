---
name: parametres-cgp
description: Skill consolidé documentant la structure complète du module Paramètres — schéma DB, types TS, business rules, conventions LocalStorage, sections consommatrices
metadata:
  type: skill
  domain: settings
---

# Skill: Paramètres CGP — Référence consolidée

## Vue d'ensemble

Le module Paramètres (`/settings`) centralise TOUTE la configuration utilisateur du dashboard CGP. Il persiste via un PATCH unique sur `/api/settings` qui upsert dans `user_settings`.

## Architecture technique

| Couche | Fichier | Rôle |
|--------|---------|------|
| Page UI | `src/app/(dashboard)/settings/page.tsx` | 10 onglets, ~1900 lignes |
| Hook | `src/hooks/useUserSettings.ts` | GET au mount, PATCH via `save()` |
| API | `src/app/api/settings/route.ts` | Zod validation, upsert Supabase |
| DB | `user_settings` (Supabase) | 1 row par user, colonnes + jsonb |
| Migration | `supabase/migrations/20260710_settings_extended.sql` | ADD COLUMN IF NOT EXISTS |

## Schéma DB complet (`user_settings`)

### Colonnes scalaires

| Colonne | Type | Default | Onglet |
|---------|------|---------|--------|
| id | uuid PK (= auth.uid) | — | — |
| ca_monthly_target | integer | 15000 | KPI |
| ca_annual_target | integer | 180000 | KPI |
| client_health_threshold_days | integer | 90 | KPI |
| closing_target_pct | numeric | 40.0 | General |
| calls_per_day_target | integer | 20 | General |
| rdv_per_week_target | integer | 5 | General |
| blocks_per_day_target | integer | 6 | General |
| coach_instructions | text | '' | General |
| objectives_count | integer | 3 | General |
| bloc_duration_minutes | integer | 25 | General |
| blocs_per_day_normal | integer | 6 | General |
| blocs_per_day_max | integer | 10 | General |
| sequence_delay_email | integer | 3 | General |
| sequence_delay_sms | integer | 2 | General |
| sequence_delay_whatsapp | integer | 1 | General |
| sequence_steps_max | integer | 5 | General |
| sequence_stop_days | integer | 30 | General |
| rdv_r1_annual | integer | 200 | KPI |
| rdv_r2_annual | integer | 100 | KPI |
| interpro_daily_target | integer | 5 | KPI |
| commerce_minutes_daily | integer | 120 | KPI |
| sport_weekly_target | integer | 3 | KPI |
| collecte_annual | numeric | 500000 | KPI |
| notification_email | text | '' | Notifications |
| notification_phone | text | '' | Notifications |
| notification_telegram_bot | text | '' | Notifications |
| notification_telegram_chat | text | '' | Notifications |
| notification_rdv_hours | integer | 24 | Notifications |
| mobile_font_size | text | 'medium' | Mobile |
| mobile_compact | boolean | false | Mobile |
| mobile_bottom_menu | boolean | true | Mobile |
| updated_at | timestamptz | now() | — |

### Colonnes JSONB

| Colonne | Structure | Onglet |
|---------|-----------|--------|
| message_templates | `{ [channel]: { [stage]: text } }` | Notifications |
| daily_targets | `{ contacts, calls, rdv1, rdv2 }` | General |
| monthly_intensity | `{ jan: 1.0, feb: 0.9, ... }` | General |
| scoring_grids | `{ professions: [{label,val}], zones: [{label,val}] }` | — |
| completed_videos | `string[]` | — |
| rdv_monthly_distribution | `{ [month]: { r1, r2 } }` | KPI |
| notification_channels | `{ push, email, sms, telegram }` (booleans) | Notifications |
| notification_events | `{ [event_key]: boolean }` | Notifications |
| visible_sections | `{ [section_id]: boolean }` | Sections |
| mobile_sections | `{ [section_id]: boolean }` | Mobile |

## Type TypeScript (`UserSettings`)

Défini dans `src/hooks/useUserSettings.ts`. Tous les champs sauf les 7 originaux sont `optional (?)`.

## Onglets du module

| # | ID | Label | Persisté |
|---|-----|-------|----------|
| 1 | general | Général | OUI — handleSave() global |
| 2 | kpi | KPI | OUI — boutons par section |
| 3 | notifications | Notif | OUI — handleSaveNotif + templates |
| 4 | integrations | API | Partiel (Google Calendar OAuth) |
| 5 | sections | Sections | OUI — visible_sections jsonb |
| 6 | mobile | Mobile | OUI — mobile_* colonnes + jsonb |
| 7 | sequences | Séquences | OUI — CRUD via /api/crm/sequences/* |
| 8 | variantes | Variantes | OUI — via message_templates.variantes |
| 9 | triggers | Triggers | OUI — toggle auto_trigger sur templates |
| 10 | scripts | Scripts | OUI — CRUD /api/call-scripts + objections |

## Business Rules

1. **Upsert unique** : Un seul `user_settings` par user (PK = auth.uid)
2. **Merge JSONB** : `message_templates` est mergé côté serveur (existant + nouveau)
3. **Validation Zod** : Tous les champs sont `.optional()` dans PatchSettingsSchema
4. **Defaults** : Si row absente (PGRST116), retourne `getDefaultSettings()`
5. **Intensité mensuelle** : Coefficients 0.7–1.3 appliqués aux objectifs annuels pour calcul mensuel
6. **Calculs dynamiques** : R1/mois = rdv_r1_annual / 12, interpro/semaine = interpro_daily * 5, etc.
7. **Un seul trigger auto par stade pipeline** (contrainte métier, pas DB)
8. **Scripts** : Un seul `is_default` par métier (PUT toggle)

## Sections qui consomment les settings

| Section dashboard | Champs lus |
|-------------------|------------|
| Today (KPIs) | daily_targets, calls_per_day_target, rdv_per_week_target |
| Champions (Coach) | coach_instructions |
| Chronomètre | bloc_duration_minutes, blocs_per_day_normal, blocs_per_day_max |
| Revenue | ca_monthly_target, ca_annual_target |
| Clients (santé) | client_health_threshold_days |
| Pipeline | closing_target_pct |
| Séquences executor | sequence_delay_*, sequence_steps_max, sequence_stop_days |
| CRM Kanban | message_templates (WhatsApp picker), call_scripts |
| Sidebar/Layout | visible_sections (filtre menu) |

## Conventions

- **Pas de LocalStorage** pour les settings : tout passe par `/api/settings`
- **NumInput** : composant contrôlé qui appelle `onChange(number)` immédiatement
- **Dirty flag** : TabGeneral affiche un bouton sticky "Enregistrer" quand dirty=true
- **Toast** : `toast.success()` après chaque save réussi
- **Pas de debounce** : save est déclenché par un bouton explicite, pas au blur

## Migration requise

```sql
-- Exécuter dans Supabase SQL Editor :
-- supabase/migrations/20260710_settings_extended.sql
```

## Dépendances externes

- `sonner` : toast notifications
- `@supabase/ssr` : auth SSR
- `zod` : validation API
