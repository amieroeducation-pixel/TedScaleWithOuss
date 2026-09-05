# Configuration Cron Jobs — Task Scheduler Windows

## Vue d'ensemble

Le Dashboard utilise des **cron jobs** pour automatiser certaines tâches :
- 📱 Rappels SMS 24h et 1h avant les RDV
- 🔄 Traitement des séquences multicanales
- 🌡️ Mise à jour des scores température nurturing
- ⚠️ Détection clients inactifs
- 📊 Rapport hebdomadaire (lundi)

Sur Windows, ces tâches sont gérées via le **Task Scheduler**.

---

## Installation (une seule fois)

### Étape 1 : Ouvrir PowerShell en administrateur

**IMPORTANT** : Le script doit être exécuté en tant qu'administrateur !

1. Appuie sur **Windows** (touche logo)
2. Tape **"PowerShell"**
3. **Clic droit** sur "Windows PowerShell"
4. Clique sur **"Exécuter en tant qu'administrateur"**
5. Une fenêtre PowerShell bleue s'ouvre avec le titre "Administrateur"

### Étape 2 : Naviguer vers le projet

```powershell
cd "C:\Users\Ted\Documents\Obsidian Vault\TedScaleWithOuss"
```

### Étape 3 : Exécuter le script de setup

```powershell
.\setup-task-scheduler.ps1
```

**Si le serveur dev tourne sur un autre port** (ex: 3002) :

```powershell
.\setup-task-scheduler.ps1 -BaseUrl "http://localhost:3002"
```

### Étape 4 : Vérifier que les tâches sont créées

```powershell
Get-ScheduledTask | Where-Object { $_.TaskName -like 'TedScale_*' }
```

Tu devrais voir **5 tâches** :
- `TedScale_RdvReminder` (toutes les 30 min)
- `TedScale_SequencesProcess` (toutes les 5 min)
- `TedScale_NurturingTemperature` (toutes les heures)
- `TedScale_ClientHealth` (1x par jour à 08:00)
- `TedScale_WeeklyReport` (1x par jour à 08:00, envoi lundi uniquement)

---

## Utilisation

### Démarrer le serveur dev

Les tâches Task Scheduler appellent `http://localhost:3000/api/cron/...`.

**Le serveur dev DOIT tourner** pour que les crons fonctionnent :

```powershell
npm run dev
```

💡 **Astuce** : Lance le serveur dev au démarrage de Windows si tu veux les crons 24/7.

---

## Gestion des tâches

### Voir l'état d'une tâche

```powershell
Get-ScheduledTask -TaskName "TedScale_RdvReminder"
```

### Désactiver une tâche temporairement

```powershell
Disable-ScheduledTask -TaskName "TedScale_RdvReminder"
```

### Réactiver une tâche

```powershell
Enable-ScheduledTask -TaskName "TedScale_RdvReminder"
```

### Supprimer une tâche

```powershell
Unregister-ScheduledTask -TaskName "TedScale_RdvReminder" -Confirm:$false
```

### Supprimer TOUTES les tâches

```powershell
Get-ScheduledTask | Where-Object { $_.TaskName -like 'TedScale_*' } | Unregister-ScheduledTask -Confirm:$false
```

---

## Vérifier les logs

Les cron jobs loggent dans la table `cron_logs` de Supabase.

Pour voir les logs :

```sql
SELECT * FROM cron_logs
ORDER BY executed_at DESC
LIMIT 50;
```

Ou via l'API :

```bash
curl http://localhost:3000/api/cron/logs
```

---

## Déploiement Production

⚠️ **En production (Cloud Run)**, les crons ne passent PAS par Task Scheduler !

2 options :

### Option A : Cloud Scheduler (GCP)

Créer des jobs Cloud Scheduler qui appellent les endpoints cron :

```bash
gcloud scheduler jobs create http rdv-reminder \
  --schedule="*/30 * * * *" \
  --uri="https://ted-scale-with-ouss-*.run.app/api/cron/rdv-reminder" \
  --http-method=GET \
  --headers="x-cron-secret=VOTRE_SECRET"
```

### Option B : Supabase Edge Functions (pg_cron)

Utiliser les Edge Functions Supabase avec `pg_cron` :

```typescript
// supabase/functions/process-sequences/index.ts
Deno.cron("Process sequences", "*/5 * * * *", async () => {
  await fetch(`${Deno.env.get('APP_URL')}/api/cron/sequences-process`, {
    headers: { 'x-cron-secret': Deno.env.get('CRON_SECRET') }
  })
})
```

---

## Troubleshooting

### Les rappels SMS ne partent pas

1. Vérifier que le serveur dev tourne (`npm run dev`)
2. Vérifier que la tâche est activée :
   ```powershell
   Get-ScheduledTask -TaskName "TedScale_RdvReminder" | Select State
   ```
3. Vérifier les logs cron :
   ```bash
   curl http://localhost:3000/api/cron/logs
   ```

### Erreur "Access Denied"

Le script doit être exécuté en **administrateur** !

### Les tâches ne s'exécutent pas

1. Ouvrir **Task Scheduler** (GUI Windows)
   - Appuie sur **Windows + R**
   - Tape `taskschd.msc`
   - Cherche les tâches `TedScale_*`
2. Clic droit sur une tâche → **Run**
3. Voir l'historique dans l'onglet **History**

---

*Dernière mise à jour : 5 septembre 2026*
