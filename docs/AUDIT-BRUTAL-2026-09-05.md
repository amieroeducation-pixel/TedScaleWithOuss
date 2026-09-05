# Audit Brutal Dashboard — 5 septembre 2026

**Contexte** : Ted a utilisé le Dashboard en situation réelle (prospection) et a constaté que **les compteurs ne bougent pas** quand il marque un prospect "contacté". Audit complet demandé pour identifier tout ce qui est fictif vs opérationnel.

---

## 🔴 BUGS CRITIQUES TROUVÉS

### Bug #1 : Compteurs Today déconnectés de la DB

**Symptôme** : Quand Ted marque un prospect "contacté" dans le CRM, le compteur "Prospects contactés" ne bouge pas.

**Cause racine** :
- La page `/today` affiche des compteurs stockés dans **localStorage** (ligne 23-31 `today/page.tsx`)
- L'API `/api/today/kpis` gère la table **`daily_kpis`** en DB
- Le CRM `/api/pipeline/move` met à jour `pipeline_stage` et log dans `pipeline_events`
- **AUCUNE connexion entre ces 3 systèmes !**

**Fichiers concernés** :
- `src/app/(dashboard)/today/page.tsx` (lignes 22-31)
- `src/app/api/today/kpis/route.ts`
- `src/app/api/pipeline/move/route.ts`

**Impact** : 🔴 Critique — Les compteurs affichés ne reflètent JAMAIS l'activité réelle

**Fix requis** :
1. Supprimer le localStorage des compteurs
2. Quand un prospect change de stage (`/api/pipeline/move`), incrémenter `daily_kpis.contacts` si `to_stage` !== 'a_contacter'
3. La page Today doit charger les compteurs depuis `/api/today/kpis` (DB) au lieu de localStorage

---

### Bug #2 : Rappels SMS ne tournent jamais

**Symptôme** : Ted ne voit aucun rappel SMS partir avant les RDV.

**Cause racine** :
- Le code du cron existe ✅ (`src/app/api/cron/rdv-reminder/route.ts`)
- Les migrations DB existent ✅ (`supabase/migrations/20260811_reminder_*`)
- MAIS **aucun Task Scheduler Windows configuré** ❌
- Le cron ne peut pas s'exécuter automatiquement !

**Fichiers concernés** :
- `src/app/api/cron/rdv-reminder/route.ts`
- Manque : script PowerShell `setup-task-scheduler.ps1`

**Impact** : 🔴 Critique — Les rappels SMS ne partent JAMAIS automatiquement

**Fix requis** :
1. Créer le script `setup-task-scheduler.ps1` qui configure les tâches Windows :
   - `rdv-reminder` : toutes les 30 min
   - `sequences-process` : toutes les 5 min
   - `nurturing-temperature` : toutes les heures
   - `client-health` : 1x par jour
2. Documenter la commande pour Ted : `.\setup-task-scheduler.ps1`

---

### Bug #3 : Compteurs RDV semaine pas synchronisés

**Symptôme** : Le compteur "RDV cette semaine" dans Today peut afficher des données obsolètes.

**Cause racine** :
- L'API `/api/today/signal` charge bien les RDV depuis `interactions` + `bookings` ✅
- MAIS la page Today ne recharge PAS automatiquement après création d'un RDV
- Il faut faire F5 pour voir le nouveau compteur

**Impact** : ⚠️ Moyen — Les données sont réelles mais pas en temps réel

**Fix requis** :
- Ajouter un `revalidate()` ou un refresh du cache React Query après création d'un RDV/booking

---

## ✅ CE QUI MARCHE VRAIMENT

| Fonctionnalité | Statut | Test effectué |
|----------------|--------|---------------|
| **CRM Drag-Drop** | ✅ Fonctionne | Le prospect change bien de colonne en DB (`pipeline_stage` mis à jour) |
| **Pipeline Events** | ✅ Fonctionne | Les moves sont loggés dans `pipeline_events` |
| **Création prospect** | ✅ Fonctionne | POST `/api/prospects` crée bien le prospect en DB |
| **Création booking** | ✅ Fonctionne | POST `/api/booking` crée bien le RDV en DB |
| **API RDV semaine** | ✅ Fonctionne | `/api/today/signal` retourne les bons RDV depuis `interactions` + `bookings` |
| **Templates SMS** | ✅ Fonctionne | Les templates sont stockés dans `reminder_templates` |
| **Séquences multicanales** | ✅ Fonctionne | Les séquences s'assignent et progressent correctement |
| **Nurturing contacts** | ✅ Fonctionne | CRUD contacts nurturing opérationnel |

---

## 🔄 CE QUI EST PARTIELLEMENT FONCTIONNEL

| Fonctionnalité | État | Problème |
|----------------|------|----------|
| **Compteurs Today** | ⚠️ Partiel | Données affichées depuis localStorage (fictif) au lieu de DB réelle |
| **Rappels SMS** | ⚠️ Partiel | Code prêt mais cron ne tourne pas (Task Scheduler manquant) |
| **Analytics Global** | ⚠️ Partiel | Certains KPIs calculés depuis DB réelle, d'autres depuis mock |

---

## 📋 PLAN DE FIX (Priorités)

### P0 — Critique (à fixer MAINTENANT)

1. **Fix compteurs Today**
   - Supprimer localStorage
   - Incrémenter `daily_kpis` depuis `/api/pipeline/move`
   - Charger compteurs depuis `/api/today/kpis`
   - **Durée estimée : 1h**

2. **Configurer Task Scheduler**
   - Créer `setup-task-scheduler.ps1`
   - Documenter la commande
   - Tester que les crons tournent
   - **Durée estimée : 45 min**

### P1 — Important (à fixer après P0)

3. **Synchroniser compteurs RDV**
   - Revalider cache après création RDV
   - **Durée estimée : 20 min**

4. **Audit Analytics Global**
   - Vérifier que tous les KPIs viennent de la DB
   - Supprimer les données mock restantes
   - **Durée estimée : 1h**

---

## 🎯 PROCHAINES ÉTAPES

**Option A** : Je fixe les 2 bugs P0 maintenant (compteurs + Task Scheduler) → **1h45**

**Option B** : Je crée les PRs/branches pour chaque fix et tu valides avant → **30 min de setup**

**Option C** : On lance `/ks-orchestrator` pour créer une story "Fiabilisation compteurs temps réel" → **workflow complet**

**Ted, quelle option tu préfères ?**

---

*Rapport généré le 5 septembre 2026 par Alfred*
