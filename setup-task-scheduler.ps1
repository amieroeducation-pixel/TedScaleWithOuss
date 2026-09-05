# setup-task-scheduler.ps1
# Configure le Task Scheduler Windows pour exécuter les cron jobs du Dashboard

param(
    [string]$BaseUrl = "http://localhost:3000"
)

Write-Host "=== Configuration Task Scheduler pour Ted Scale With Ouss ===" -ForegroundColor Cyan
Write-Host "Base URL : $BaseUrl" -ForegroundColor Yellow
Write-Host ""

# Vérifier que le script tourne en admin
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "ERREUR : Ce script doit être exécuté en tant qu'administrateur." -ForegroundColor Red
    Write-Host "Clic droit sur PowerShell -> 'Exécuter en tant qu'administrateur'" -ForegroundColor Yellow
    exit 1
}

# Lire le secret cron depuis .env.local
$envPath = Join-Path $PSScriptRoot ".env.local"
if (-not (Test-Path $envPath)) {
    Write-Host "ERREUR : Fichier .env.local introuvable à la racine du projet" -ForegroundColor Red
    exit 1
}

$cronSecret = Get-Content $envPath | Where-Object { $_ -match "^CRON_SECRET=" } | ForEach-Object { $_.Split('=')[1] }
if (-not $cronSecret) {
    Write-Host "ERREUR : CRON_SECRET non trouvé dans .env.local" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Secret cron trouvé" -ForegroundColor Green

# Fonction pour créer une tâche planifiée
function Create-CronTask {
    param(
        [string]$TaskName,
        [string]$Endpoint,
        [string]$Schedule,
        [string]$Description
    )

    Write-Host "Création tâche : $TaskName" -ForegroundColor Cyan

    # Supprimer la tâche si elle existe déjà
    $existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($existingTask) {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-Host "  ✓ Tâche existante supprimée" -ForegroundColor Yellow
    }

    # URL complète avec header
    $url = "$BaseUrl$Endpoint"
    $headers = "x-cron-secret: $cronSecret"

    # Commande curl pour Windows
    $curlCommand = "curl.exe -X GET `"$url`" -H `"$headers`" -s"

    # Action : exécuter curl
    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -WindowStyle Hidden -Command `"$curlCommand`""

    # Trigger : selon le schedule
    switch ($Schedule) {
        "5min" {
            $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration ([TimeSpan]::MaxValue)
        }
        "30min" {
            $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 30) -RepetitionDuration ([TimeSpan]::MaxValue)
        }
        "1hour" {
            $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Hours 1) -RepetitionDuration ([TimeSpan]::MaxValue)
        }
        "daily" {
            $trigger = New-ScheduledTaskTrigger -Daily -At "08:00"
        }
        default {
            Write-Host "  ERREUR : Schedule inconnu ($Schedule)" -ForegroundColor Red
            return
        }
    }

    # Settings
    $settings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -StartWhenAvailable `
        -RunOnlyIfNetworkAvailable

    # Enregistrer la tâche
    Register-ScheduledTask `
        -TaskName $TaskName `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -Description $Description `
        -User $env:USERNAME `
        -Force | Out-Null

    Write-Host "  ✓ Tâche créée : $Schedule" -ForegroundColor Green
}

# Créer toutes les tâches cron
Write-Host ""
Write-Host "=== Création des tâches ===" -ForegroundColor Cyan

Create-CronTask `
    -TaskName "TedScale_RdvReminder" `
    -Endpoint "/api/cron/rdv-reminder" `
    -Schedule "30min" `
    -Description "Rappels SMS 24h et 1h avant les RDV"

Create-CronTask `
    -TaskName "TedScale_SequencesProcess" `
    -Endpoint "/api/cron/sequences-process" `
    -Schedule "5min" `
    -Description "Traitement des séquences multicanales en attente"

Create-CronTask `
    -TaskName "TedScale_NurturingTemperature" `
    -Endpoint "/api/cron/nurturing-temperature" `
    -Schedule "1hour" `
    -Description "Mise à jour des scores température prospects"

Create-CronTask `
    -TaskName "TedScale_ClientHealth" `
    -Endpoint "/api/cron/client-health" `
    -Schedule "daily" `
    -Description "Détection alertes clients inactifs"

Create-CronTask `
    -TaskName "TedScale_WeeklyReport" `
    -Endpoint "/api/cron/weekly-report" `
    -Schedule "daily" `
    -Description "Rapport hebdomadaire (envoyé le lundi)"

Write-Host ""
Write-Host "=== Configuration terminée ===" -ForegroundColor Green
Write-Host ""
Write-Host "5 tâches créées :" -ForegroundColor Cyan
Write-Host "  • RdvReminder         : toutes les 30 min"
Write-Host "  • SequencesProcess    : toutes les 5 min"
Write-Host "  • NurturingTemperature: toutes les heures"
Write-Host "  • ClientHealth        : 1x par jour (08:00)"
Write-Host "  • WeeklyReport        : 1x par jour (08:00, envoi lundi uniquement)"
Write-Host ""
Write-Host "Pour vérifier les tâches :" -ForegroundColor Yellow
Write-Host "  Get-ScheduledTask | Where-Object { `$_.TaskName -like 'TedScale_*' }" -ForegroundColor Gray
Write-Host ""
Write-Host "Pour désactiver une tâche :" -ForegroundColor Yellow
Write-Host "  Disable-ScheduledTask -TaskName 'TedScale_RdvReminder'" -ForegroundColor Gray
Write-Host ""
Write-Host "Pour supprimer toutes les tâches :" -ForegroundColor Yellow
Write-Host "  Get-ScheduledTask | Where-Object { `$_.TaskName -like 'TedScale_*' } | Unregister-ScheduledTask -Confirm:`$false" -ForegroundColor Gray
Write-Host ""
