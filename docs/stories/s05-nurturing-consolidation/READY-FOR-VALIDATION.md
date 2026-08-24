# s05-nurturing-consolidation — READY FOR VALIDATION

**Date**: 2026-08-17 04:30 UTC
**Branch**: `feature/s05-nurturing-consolidation`
**Commits**: 2 (migrations + monitoring UI)

## Résumé

Consolidation complète des séquences multicanales avec:
- Fix 3 bugs critiques (messages vides, cron cassé, doublons)
- Table logs détaillés `sequence_execution_logs`
- Retry logic avec backoff exponentiel
- Widget monitoring + page logs temps réel

## Checklist validation

### Bugs fixés

- [x] **Bug 1 (HIGH)**: Templates vides → Migration NOT NULL appliquée
- [x] **Bug 2 (CRITICAL)**: Cron cassé → URL + fréquence corrigées (5 min)
- [x] **Bug 3 (MEDIUM)**: Doublons → FOR UPDATE SKIP LOCKED implémenté

### Features implémentées

- [x] Table `sequence_execution_logs` créée avec RLS
- [x] Retry logic: 429 wait 60s, 5xx backoff 2s/4s/8s
- [x] INSERT logs après chaque tentative (success/failed/retrying)
- [x] Widget monitoring sur `/dashboard/sequences`:
  - Séquences actives
  - Taux succès 24h
  - Dernière exécution cron
- [x] Page `/dashboard/sequences/logs`:
  - Logs temps réel (50 par page)
  - Filtres par canal
  - Pagination

### Fichiers

**Migrations** (3):
- `supabase/migrations/20260816_sequence_execution_logs.sql`
- `supabase/migrations/20260816_sequence_template_steps_not_null.sql`
- `supabase/migrations/20260816_sequence_steps_lock_optimization.sql`

**Core** (4):
- `src/lib/sequences/brevo.ts`
- `src/lib/sequences/executor.ts`
- `supabase/functions/process-sequences/index.ts`
- `src/app/api/cron/sequences-process/route.ts`

**Monitoring** (4):
- `src/app/api/sequences/stats/route.ts`
- `src/app/api/sequences/logs/route.ts`
- `src/app/(dashboard)/sequences/page.tsx`
- `src/app/(dashboard)/sequences/logs/page.tsx`

## Tests manuels requis

### 1. Widget monitoring

1. Ouvrir `/dashboard/sequences`
2. Vérifier widget affiche:
   - Nombre séquences actives
   - Taux succès 24h (avec ⚠️ si < 95%)
   - Dernière exécution (temps relatif + nombre envois)
3. Cliquer "Voir logs détaillés" → doit ouvrir `/dashboard/sequences/logs`

### 2. Page logs

1. Ouvrir `/dashboard/sequences/logs`
2. Vérifier table affiche colonnes: Date/Heure, Canal, Prospect, Statut, Erreur
3. Tester filtres: Tous, email, sms, whatsapp, call_reminder
4. Tester pagination: Précédent / Suivant
5. Vérifier affichage retry count si > 0

### 3. API routes

```bash
# Stats
curl http://localhost:3000/api/sequences/stats

# Logs page 1
curl http://localhost:3000/api/sequences/logs?page=1

# Logs filtrés email
curl http://localhost:3000/api/sequences/logs?channel=email
```

### 4. Cron execution

1. Attendre 5 minutes après déploiement Edge Function
2. Vérifier logs Supabase: `supabase functions logs process-sequences`
3. Vérifier table `cron_logs` contient entry job_name='sequences-process'
4. Vérifier table `sequence_execution_logs` contient nouvelles entrées

## Déploiement

### 1. Migrations

```powershell
cd C:\Users\Ted\Documents\Obsidian Vault\TedScaleWithOuss
supabase db push --project-ref vqtzcxvmzznbepyvlcut
```

### 2. Edge Function

```powershell
supabase functions deploy process-sequences --project-ref vqtzcxvmzznbepyvlcut
```

### 3. Next.js

**Option A - Cloud Run**:
```powershell
.\deploy-cloudrun.ps1 -ProjectId integration-make-365608
```

**Option B - Vercel**:
```powershell
git push origin feature/s05-nurturing-consolidation
gh pr create --title "feat(sequences): nurturing consolidation" --body "Fixes s05"
```

## Rollback strategy

Si problème critique en production:

### Rollback migrations

```sql
-- Rollback 013
DROP FUNCTION IF EXISTS get_due_steps_locked(int);

-- Rollback 012
ALTER TABLE sequence_template_steps DROP CONSTRAINT IF EXISTS message_template_not_empty;
ALTER TABLE sequence_template_steps ALTER COLUMN message_template DROP NOT NULL;

-- Rollback 011
DROP TABLE IF EXISTS sequence_execution_logs;
```

### Rollback Edge Function

```powershell
git checkout HEAD~1 supabase/functions/process-sequences/index.ts
supabase functions deploy process-sequences --project-ref vqtzcxvmzznbepyvlcut
```

### Rollback Next.js

```powershell
git revert HEAD
git push origin feature/s05-nurturing-consolidation
```

## Critères de succès

- [ ] Widget monitoring visible sur `/dashboard/sequences`
- [ ] Stats affichées correctement (actives, taux succès, dernier cron)
- [ ] Page logs accessible et fonctionnelle
- [ ] Filtres et pagination fonctionnent
- [ ] Cron s'exécute toutes les 5 min
- [ ] Logs créés dans `sequence_execution_logs` après chaque envoi
- [ ] Taux succès >= 95% (< 5% échecs)
- [ ] Aucun message vide envoyé
- [ ] Aucun doublon détecté

## Notes

- Edge Function Deno.cron nécessite Supabase CLI v1.103+
- Retry logic bloque le worker pendant backoff (max 60s sur 429)
- Table `sequence_execution_logs` va grandir rapidement → prévoir cleanup après 30 jours
- Widget polling: pas de refresh auto → reload page pour update stats

## Prochaine story

Après validation s05: **s06-prospection-tns-fiabilisation**
