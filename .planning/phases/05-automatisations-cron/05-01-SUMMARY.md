---
phase: "05"
plan: "01"
subsystem: cron-automations
tags: [cron, brevo, whatsapp, supabase, service-role, rls]
dependency_graph:
  requires: []
  provides:
    - cron/weekly-report GET endpoint (AUTO-01)
    - cron/client-health GET endpoint (AUTO-02)
    - cron/rdv-reminder GET endpoint (AUTO-03)
    - cron/revenue-alert GET endpoint (AUTO-04)
    - cron_logs table + migration 007
  affects:
    - src/lib/supabase/cron-client.ts
    - src/lib/cron/auth.ts
    - src/lib/cron/logger.ts
    - src/lib/cron/report-builder.ts
    - supabase/migrations/007_cron_logs.sql
tech_stack:
  added:
    - createClient from @supabase/supabase-js (direct, sans SSR cookies)
    - date-fns (addDays, startOfWeek, endOfWeek, format) pour calculs dates cron
    - WhatsApp Business Cloud API (Meta Graph API v21.0) -- optionnel avec fallback SMS
  patterns:
    - verifyCronSecret pattern: header x-cron-secret ou 401 (dev ouvert si CRON_SECRET absent)
    - logCronRun pattern: INSERT cron_logs avec try/catch -- jamais de throw
    - createSupabaseCronClient pattern: createClient direct service_role sans cookies()
key_files:
  created:
    - supabase/migrations/007_cron_logs.sql
    - src/lib/supabase/cron-client.ts
    - src/lib/cron/auth.ts
    - src/lib/cron/logger.ts
    - src/lib/cron/report-builder.ts
    - src/app/api/cron/weekly-report/route.ts
    - src/app/api/cron/client-health/route.ts
    - src/app/api/cron/rdv-reminder/route.ts
    - src/app/api/cron/revenue-alert/route.ts
  modified: []
decisions:
  - createSupabaseCronClient sans cookies -- createClient direct pour compatibilite curl/Task Scheduler
  - verifyCronSecret retourne null si CRON_SECRET absent (dev mode ouvert, obligatoire en prod)
  - WhatsApp Business Cloud API avec fallback SMS Brevo si WHATSAPP_ACCESS_TOKEN absent
  - revenue-alert uniquement apres le 15 du mois pour eviter spam en debut de mois
  - logCronRun ne throw jamais -- les erreurs de logging ne bloquent pas la route
metrics:
  duration: 25min
  completed: "2026-05-11"
  tasks_completed: 2
  files_created: 9
---

# Phase 05 Plan 01: Infrastructure Cron Automations Summary

Infrastructure complete des 4 automatisations cron (rapport hebdo, alertes client health, rappels RDV J-1, alerte CA) via Route Handlers Next.js proteges par x-cron-secret, avec client Supabase service_role sans cookies et logging dans cron_logs.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Migration 007 + 4 helpers cron | 26afa5c | 007_cron_logs.sql, cron-client.ts, auth.ts, logger.ts, report-builder.ts |
| 2 | 4 Route Handlers cron AUTO-01 a AUTO-04 | 88e2cce | weekly-report/, client-health/, rdv-reminder/, revenue-alert/ route.ts |

## Files Created

| File | Role |
|------|------|
| `supabase/migrations/007_cron_logs.sql` | Table cron_logs avec RLS SELECT user, INSERT service_role, index job+date |
| `src/lib/supabase/cron-client.ts` | createSupabaseCronClient() -- createClient direct sans cookies() |
| `src/lib/cron/auth.ts` | verifyCronSecret(req) -- retourne NextResponse 401 ou null |
| `src/lib/cron/logger.ts` | logCronRun() -- INSERT cron_logs avec try/catch, ne throw jamais |
| `src/lib/cron/report-builder.ts` | buildWeeklyReportHtml() -- HTML dark/gold inline CSS |
| `src/app/api/cron/weekly-report/route.ts` | GET AUTO-01: CA semaine+mois, alertes, relances, RDV -> email |
| `src/app/api/cron/client-health/route.ts` | GET AUTO-02: health alerts -> email recap + SMS critiques |
| `src/app/api/cron/rdv-reminder/route.ts` | GET AUTO-03: RDV J+1 -> WhatsApp / SMS / email fallback |
| `src/app/api/cron/revenue-alert/route.ts` | GET AUTO-04: CA < target et jour >= 15 -> email alerte |

## Decisions Made

### 1. createSupabaseCronClient sans cookies
`createSupabaseServiceClient()` dans `server.ts` utilise `cookies()` de next/headers -- incompatible avec curl/Task Scheduler (pas de cookie store). Solution : `createSupabaseCronClient()` utilise `createClient` de `@supabase/supabase-js` directement avec `SUPABASE_SERVICE_ROLE_KEY`, `{ auth: { persistSession: false } }`.

### 2. Protection CRON_SECRET -- mode dev ouvert
Si `CRON_SECRET` n'est pas dans `.env.local`, toutes les routes sont accessibles sans header (utile pour tests localhost). En production, `CRON_SECRET` est obligatoire -- documenté en variables d'env.

### 3. WhatsApp avec fallback SMS Brevo
AUTO-03 tente d'abord WhatsApp Business Cloud API (Meta Graph API v21.0). Si `WHATSAPP_PHONE_NUMBER_ID` ou `WHATSAPP_ACCESS_TOKEN` sont absents, fallback automatique vers SMS Brevo. Si pas de phone, fallback email. Pas d'erreur fatale si aucun canal.

### 4. Revenue-alert apres le 15 du mois
La condition `new Date().getDate() >= 15` evite d'envoyer des alertes CA en debut de mois quand il est normal d'etre sous l'objectif. L'alerte ne se declenche que si les deux conditions sont vraies: CA < target ET jour >= 15.

### 5. logCronRun avec try/catch absorbe
Chaque `logCronRun()` est wrappee dans un try/catch qui imprime en `console.error` sans re-throw. Une erreur d'ecriture dans `cron_logs` (table absente avant migration, reseau, etc.) ne fait pas echouer la route cron principale.

## Variables d'Environnement Requises

| Variable | Obligatoire | Usage |
|----------|------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Oui | createSupabaseCronClient |
| `SUPABASE_SERVICE_ROLE_KEY` | Oui | createSupabaseCronClient (bypass RLS) |
| `BREVO_API_KEY` | Oui (pour envois) | sendBrevoEmail / sendBrevoSms |
| `BREVO_SENDER_EMAIL` | Oui (pour emails) | sendBrevoEmail (expediteur) |
| `CRON_SECRET` | Recommande (prod) | verifyCronSecret -- dev ouvert si absent |
| `WHATSAPP_PHONE_NUMBER_ID` | Optionnel | rdv-reminder WhatsApp (fallback SMS si absent) |
| `WHATSAPP_ACCESS_TOKEN` | Optionnel | rdv-reminder WhatsApp (fallback SMS si absent) |

## Commandes de Test

```powershell
# Definir le secret (si configure dans .env.local)
$env:CRON_SECRET = "votre_secret_de_test"

# AUTO-01 -- rapport hebdo (lundi 8h via Task Scheduler)
curl -s -H "x-cron-secret: $env:CRON_SECRET" http://localhost:3000/api/cron/weekly-report

# AUTO-02 -- alertes client health (quotidien 7h)
curl -s -H "x-cron-secret: $env:CRON_SECRET" http://localhost:3000/api/cron/client-health

# AUTO-03 -- rappel RDV J-1 (quotidien 18h)
curl -s -H "x-cron-secret: $env:CRON_SECRET" http://localhost:3000/api/cron/rdv-reminder

# AUTO-04 -- alerte CA (quotidien 9h)
curl -s -H "x-cron-secret: $env:CRON_SECRET" http://localhost:3000/api/cron/revenue-alert

# Test protection 401 (doit retourner Cron unauthorized)
curl -s http://localhost:3000/api/cron/weekly-report
```

Reponse attendue: `{ "data": { "status": "ok", "processed": 1, "errors": [] }, "error": null }`

## Appliquer la Migration

```sql
-- Option 1: SQL Editor Supabase Dashboard
-- Coller le contenu de supabase/migrations/007_cron_logs.sql

-- Option 2: CLI Supabase
-- npx supabase db push
```

## Windows Task Scheduler (configuration permanente)

```powershell
# Rapport hebdo: lundi 8h
$action = New-ScheduledTaskAction -Execute "curl.exe" -Argument '-s -H "x-cron-secret: VOTRE_SECRET" http://localhost:3000/api/cron/weekly-report'
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 8am
Register-ScheduledTask -TaskName "TedCGP-WeeklyReport" -Action $action -Trigger $trigger

# Alertes client health: quotidien 7h
$action2 = New-ScheduledTaskAction -Execute "curl.exe" -Argument '-s -H "x-cron-secret: VOTRE_SECRET" http://localhost:3000/api/cron/client-health'
$trigger2 = New-ScheduledTaskTrigger -Daily -At 7am
Register-ScheduledTask -TaskName "TedCGP-ClientHealth" -Action $action2 -Trigger $trigger2

# Rappel RDV J-1: quotidien 18h
$action3 = New-ScheduledTaskAction -Execute "curl.exe" -Argument '-s -H "x-cron-secret: VOTRE_SECRET" http://localhost:3000/api/cron/rdv-reminder'
$trigger3 = New-ScheduledTaskTrigger -Daily -At 6pm
Register-ScheduledTask -TaskName "TedCGP-RdvReminder" -Action $action3 -Trigger $trigger3

# Alerte CA: quotidien 9h
$action4 = New-ScheduledTaskAction -Execute "curl.exe" -Argument '-s -H "x-cron-secret: VOTRE_SECRET" http://localhost:3000/api/cron/revenue-alert'
$trigger4 = New-ScheduledTaskTrigger -Daily -At 9am
Register-ScheduledTask -TaskName "TedCGP-RevenueAlert" -Action $action4 -Trigger $trigger4
```

## Deviations from Plan

None - plan execute exactement comme ecrit.

## Known Stubs

None - toutes les routes utilisent des donnees reelles (Supabase + Brevo).

## Threat Surface Scan

Aucune nouvelle surface de securite au-dela du threat model defini dans le PLAN.md.
- T-05A-01: verifyCronSecret implementee sur les 4 routes (mitigate OK)
- T-05A-02: SUPABASE_SERVICE_ROLE_KEY jamais dans les details cron_logs (mitigate OK)
- T-05A-03: logCronRun ne logue que counts/status/error_message -- jamais les cles API (mitigate OK)
- T-05A-04: revenue-alert avec condition jour >= 15 (mitigate OK); client-health skip si 0 alertes (mitigate OK)

## Self-Check: PASSED
