# setup-task-scheduler.ps1
# Configure les 4 taches planifiees Windows pour Ted Scale With Ouss
#
# Usage:
#   1. Definir CRON_SECRET dans .env.local : CRON_SECRET=votre_secret_ici
#   2. Copier votre secret ci-dessous dans $CronSecret
#   3. Executer en mode Admin: .\scripts\setup-task-scheduler.ps1
#
# Prerequis: App Next.js demarree sur http://localhost:3000

param(
  [string]$CronSecret = $env:CRON_SECRET,
  [string]$AppUrl = "http://localhost:3000"
)

if (-not $CronSecret) {
  Write-Error "CRON_SECRET non defini. Definissez-le dans .env.local ou passez -CronSecret 'votre_secret'"
  exit 1
}

$curlPath = "curl.exe"
Write-Host "Configuration des taches Task Scheduler pour Ted Scale With Ouss..." -ForegroundColor Cyan

# ============================================================
# AUTO-01 : Rapport hebdomadaire -- chaque lundi a 8h
# ============================================================
$action1 = New-ScheduledTaskAction `
  -Execute $curlPath `
  -Argument "-s -X GET -H `"x-cron-secret: $CronSecret`" $AppUrl/api/cron/weekly-report"

$trigger1 = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At "08:00"

$settings1 = New-ScheduledTaskSettingsSet `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 5) `
  -StartWhenAvailable

Register-ScheduledTask `
  -TaskName "TedCGP-WeeklyReport" `
  -Action $action1 `
  -Trigger $trigger1 `
  -Settings $settings1 `
  -Description "Ted Scale -- Rapport hebdomadaire email (AUTO-01)" `
  -Force

Write-Host "[OK] TedCGP-WeeklyReport -- Lundi 08h00" -ForegroundColor Green

# ============================================================
# AUTO-02 : Alertes Client Health -- chaque jour a 7h
# ============================================================
$action2 = New-ScheduledTaskAction `
  -Execute $curlPath `
  -Argument "-s -X GET -H `"x-cron-secret: $CronSecret`" $AppUrl/api/cron/client-health"

$trigger2 = New-ScheduledTaskTrigger -Daily -At "07:00"

$settings2 = New-ScheduledTaskSettingsSet `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 5) `
  -StartWhenAvailable

Register-ScheduledTask `
  -TaskName "TedCGP-ClientHealth" `
  -Action $action2 `
  -Trigger $trigger2 `
  -Settings $settings2 `
  -Description "Ted Scale -- Alertes client inactif (AUTO-02)" `
  -Force

Write-Host "[OK] TedCGP-ClientHealth -- Tous les jours 07h00" -ForegroundColor Green

# ============================================================
# AUTO-03 : Rappel RDV J-1 -- chaque jour a 18h
# ============================================================
$action3 = New-ScheduledTaskAction `
  -Execute $curlPath `
  -Argument "-s -X GET -H `"x-cron-secret: $CronSecret`" $AppUrl/api/cron/rdv-reminder"

$trigger3 = New-ScheduledTaskTrigger -Daily -At "18:00"

$settings3 = New-ScheduledTaskSettingsSet `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 5) `
  -StartWhenAvailable

Register-ScheduledTask `
  -TaskName "TedCGP-RdvReminder" `
  -Action $action3 `
  -Trigger $trigger3 `
  -Settings $settings3 `
  -Description "Ted Scale -- Rappel RDV SMS/WhatsApp J-1 (AUTO-03)" `
  -Force

Write-Host "[OK] TedCGP-RdvReminder -- Tous les jours 18h00" -ForegroundColor Green

# ============================================================
# AUTO-04 : Alerte CA < seuil -- chaque jour a 9h
# ============================================================
$action4 = New-ScheduledTaskAction `
  -Execute $curlPath `
  -Argument "-s -X GET -H `"x-cron-secret: $CronSecret`" $AppUrl/api/cron/revenue-alert"

$trigger4 = New-ScheduledTaskTrigger -Daily -At "09:00"

$settings4 = New-ScheduledTaskSettingsSet `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 5) `
  -StartWhenAvailable

Register-ScheduledTask `
  -TaskName "TedCGP-RevenueAlert" `
  -Action $action4 `
  -Trigger $trigger4 `
  -Settings $settings4 `
  -Description "Ted Scale -- Alerte CA mensuel sous objectif (AUTO-04)" `
  -Force

Write-Host "[OK] TedCGP-RevenueAlert -- Tous les jours 09h00" -ForegroundColor Green

# ============================================================
# Recapitulatif
# ============================================================
Write-Host ""
Write-Host "4 taches configurees avec succes :" -ForegroundColor Cyan
Write-Host "  TedCGP-WeeklyReport   -- Lundi 08:00"
Write-Host "  TedCGP-ClientHealth   -- Quotidien 07:00"
Write-Host "  TedCGP-RdvReminder    -- Quotidien 18:00"
Write-Host "  TedCGP-RevenueAlert   -- Quotidien 09:00"
Write-Host ""
Write-Host "IMPORTANT: L'app Next.js doit etre demarree (npm run dev) pour que les taches fonctionnent." -ForegroundColor Yellow
Write-Host "Verifiez les executions dans : /automatisations (journal d'execution)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Pour supprimer toutes les taches :" -ForegroundColor Gray
Write-Host "  'TedCGP-WeeklyReport','TedCGP-ClientHealth','TedCGP-RdvReminder','TedCGP-RevenueAlert' | ForEach-Object { Unregister-ScheduledTask -TaskName `$_ -Confirm:`$false }" -ForegroundColor Gray
