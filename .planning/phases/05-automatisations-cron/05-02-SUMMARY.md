# 05-02 SUMMARY — Page /automatisations + Task Scheduler

## Fichiers créés / modifiés

| Fichier | Action | Description |
|---------|--------|-------------|
| `src/app/api/cron/logs/route.ts` | Créé | GET `/api/cron/logs` — 50 derniers logs de l'utilisateur courant (getUser() + RLS) |
| `src/app/(dashboard)/automatisations/page.tsx` | Modifié | Page branchée sur vraies données cron_logs — EXEC_LOG statique supprimé |
| `scripts/setup-task-scheduler.ps1` | Créé | 4 tâches Windows Task Scheduler en une commande |

## Ce qui a changé dans la page /automatisations

- `INITIAL_AUTOMATIONS` (6 entrées fictives) → `CRON_JOBS` (4 vrais job IDs : weekly-report, client-health, rdv-reminder, revenue-alert)
- `EXEC_LOG` statique → `useEffect` fetch `/api/cron/logs`, state `logs`
- KPIs "Emails envoyés" et "SMS / WA" calculés depuis `logs.details` (dynamiques)
- Journal : états loading / vide / données réelles avec `buildActionSummary()` par job type
- Badge statut : `✓ OK`, `— SKIP`, `✗ ERR`

## Lancer le Task Scheduler (mode Admin requis)

```powershell
# Depuis un terminal PowerShell en mode Administrateur
$env:CRON_SECRET = "votre_secret_depuis_env_local"
.\scripts\setup-task-scheduler.ps1
```

## Vérifier les tâches créées

```powershell
Get-ScheduledTask -TaskName "TedCGP-*" | Select-Object TaskName, State
```

Résultat attendu : 4 tâches `Ready`
```
TedCGP-WeeklyReport   Ready
TedCGP-ClientHealth   Ready
TedCGP-RdvReminder    Ready
TedCGP-RevenueAlert   Ready
```

## Planning des tâches

| Tâche | Déclencheur | Route |
|-------|-------------|-------|
| TedCGP-WeeklyReport | Lundi 08:00 | `/api/cron/weekly-report` |
| TedCGP-ClientHealth | Quotidien 07:00 | `/api/cron/client-health` |
| TedCGP-RdvReminder | Quotidien 18:00 | `/api/cron/rdv-reminder` |
| TedCGP-RevenueAlert | Quotidien 09:00 | `/api/cron/revenue-alert` |

## Tester le journal d'exécution

```bash
# 1. Lancer un cron manuellement (app démarrée sur :3000)
curl -s -H "x-cron-secret: votre_secret" http://localhost:3000/api/cron/client-health

# 2. Vérifier via l'API
curl -s http://localhost:3000/api/cron/logs  # nécessite session active

# 3. Naviguer sur /automatisations → journal affiche le log réel
```

## Phase 5 — COMPLETE

Toutes les automatisations sont fonctionnelles :
- ✅ AUTO-01 : Rapport hebdo email (Brevo) — lundi 8h
- ✅ AUTO-02 : Alertes Client Health (email + SMS) — quotidien 7h
- ✅ AUTO-03 : Rappel RDV J-1 (WhatsApp/SMS/email) — quotidien 18h
- ✅ AUTO-04 : Alerte CA < seuil — quotidien 9h
- ✅ Journal d'exécution branché sur `cron_logs` (données réelles)
- ✅ Script Task Scheduler Windows prêt à l'emploi
