# Fix Prospection Production Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corriger le bug qui empêche TNS search, Workflow Chefs, et la carte de fonctionner en production — puis s'assurer que PAPPERS_API_KEY est bien injecté dans Cloud Run.

**Architecture:** Le bug est un mismatch entre le format de réponse `apiSuccess()` (`{ data, error }`) et le check frontend (`data.success`). La solution consiste à ajouter `success: boolean` dans `lib/api.ts`. Les trois pages concernées fonctionneront sans autre changement.

**Tech Stack:** Next.js 15 App Router, TypeScript, Cloud Run (GCP `integration-make-365608`)

---

## Fichiers concernés

| Fichier | Action | Raison |
|---------|--------|--------|
| `src/lib/api.ts` | **Modifier** | Ajouter `success: boolean` dans `ApiResponse`, `apiSuccess`, `apiError` |
| `src/app/(dashboard)/prospection/tns/page.tsx` | Aucun changement | Vérifie déjà `data.success` — fonctionnera après fix `api.ts` |
| `src/app/(dashboard)/prospection/chefs-entreprise/page.tsx` | Aucun changement | Idem |
| `src/app/(dashboard)/map/page.tsx` | Aucun changement | Idem |
| `.env.local` | **Vérifier** | S'assurer que `PAPPERS_API_KEY` est présent et non vide |

---

### Task 1 : Corriger `lib/api.ts` — ajouter le champ `success`

**Fichiers :**
- Modifier : `src/lib/api.ts`

**Contexte :** `apiSuccess()` renvoie `{ data, error: null }`. Les trois pages (TNS, Chefs, Map) vérifient `if (!data.success)` — ce champ est `undefined`, donc toujours falsy → throw systématique de `'Erreur recherche'`.

- [ ] **Step 1 : Lire le fichier actuel**

```typescript
// src/lib/api.ts — état actuel
export type ApiResponse<T> = {
  data: T | null
  error: string | null
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json<ApiResponse<T>>({ data, error: null }, { status })
}

export function apiError(message: string, status = 500) {
  console.error(`[API Error] ${message}`)
  return NextResponse.json<ApiResponse<null>>({ data: null, error: message }, { status })
}
```

- [ ] **Step 2 : Appliquer le fix**

Remplacer le contenu de `src/lib/api.ts` par :

```typescript
import { NextResponse } from 'next/server'

export type ApiResponse<T> = {
  success: boolean
  data: T | null
  error: string | null
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json<ApiResponse<T>>({ success: true, data, error: null }, { status })
}

export function apiError(message: string, status = 500) {
  console.error(`[API Error] ${message}`)
  return NextResponse.json<ApiResponse<null>>({ success: false, data: null, error: message }, { status })
}

export function apiUnauthorized() {
  return apiError('Non autorisé', 401)
}

export function apiNotFound(resource = 'Resource') {
  return apiError(`${resource} non trouvé`, 404)
}
```

- [ ] **Step 3 : Vérifier que TypeScript compile sans erreur**

```powershell
cd C:\Users\Ted\Documents\GitHub\TedScaleWithOuss
npm run build 2>&1 | Select-String -Pattern "error TS|Error:|warning" | head -20
```

Attendu : aucune erreur TypeScript liée à `ApiResponse`.

- [ ] **Step 4 : Tester en local — TNS search**

```powershell
npm run dev
```

Ouvrir `http://localhost:3000/prospection/tns`, choisir un métier + ville, cliquer Rechercher.
Attendu : résultats Data.gouv s'affichent (pas de bannière rouge "Erreur recherche").

- [ ] **Step 5 : Tester en local — Workflow Chefs**

Ouvrir `http://localhost:3000/prospection/chefs-entreprise`, cliquer "LANCER WORKFLOW HEBDOMADAIRE".
Attendu : leads apparaissent dans l'onglet Tableau après quelques secondes.

- [ ] **Step 6 : Commit**

```powershell
git add src/lib/api.ts
git commit -m "fix: add success field to apiSuccess/apiError — fixes TNS, Chefs, Map in production"
```

---

### Task 2 : Vérifier PAPPERS_API_KEY dans `.env.local`

**Fichiers :**
- Vérifier : `.env.local` (ne pas committer)
- Modifier si besoin : `.env.local`

**Contexte :** Le script `deploy-cloudrun.ps1` lit `.env.local` et n'inclut `PAPPERS_API_KEY` dans Cloud Run que si la valeur est présente et non vide. Si la clé était vide lors du dernier deploy (rev 00006), elle est absente de l'environnement Cloud Run actuel.

- [ ] **Step 1 : Vérifier la présence de la clé dans `.env.local`**

```powershell
Select-String -Path .env.local -Pattern "PAPPERS_API_KEY"
```

Attendu : une ligne du type `PAPPERS_API_KEY=votre_clé_ici` (valeur non vide).

Si absent ou vide → ajouter/mettre à jour `PAPPERS_API_KEY=<clé valide>` dans `.env.local`.

- [ ] **Step 2 : Confirmer que Cloud Run ne l'a pas déjà**

```powershell
gcloud run services describe ted-scale-with-ouss `
  --region europe-west1 `
  --project integration-make-365608 `
  --format="value(spec.template.spec.containers[0].env)"
```

Chercher `PAPPERS_API_KEY` dans la sortie. Si absent → le déploiement de la Task 3 le corrigera.

---

### Task 3 : Redéployer sur Cloud Run

**Fichiers :**
- Exécuter : `deploy-cloudrun.ps1`

**Pré-requis :** Docker Desktop démarré. Si `gcloud auth login` n'a pas été fait dans cette session, le faire d'abord.

- [ ] **Step 1 : S'assurer que Docker Desktop est démarré**

```powershell
docker info 2>&1 | Select-String "Server Version"
```

Attendu : `Server Version: XX.X.X`. Si erreur → démarrer Docker Desktop manuellement.

- [ ] **Step 2 : Lancer le déploiement**

```powershell
.\deploy-cloudrun.ps1 -ProjectId integration-make-365608
```

Attendu : `=== DEPLOY TERMINE ===` en vert, suivi de l'URL Cloud Run.

En cas d'erreur `gcloud auth` :
```powershell
gcloud auth login
gcloud auth configure-docker
# Puis relancer le deploy
```

- [ ] **Step 3 : Vérifier la révision déployée**

```powershell
gcloud run services describe ted-scale-with-ouss `
  --region europe-west1 `
  --project integration-make-365608 `
  --format="value(status.latestReadyRevisionName)"
```

Attendu : une révision plus récente que `ted-scale-with-ouss-00006-x8t`.

---

### Task 4 : Valider en production

**URL prod :** `https://ted-scale-with-ouss-272642857923.europe-west1.run.app`

- [ ] **Step 1 : Se connecter sur la prod**

Ouvrir l'URL prod dans le navigateur → se connecter avec les credentials Supabase si demandé.

- [ ] **Step 2 : Tester TNS search**

Naviguer vers `/prospection/tns`. Sélectionner Médecin généraliste + Paris + 10 résultats → Rechercher.
Attendu : 10 résultats Data.gouv affichés avec nom, entreprise, ville, SIREN.
Pas de bannière d'erreur rouge.

- [ ] **Step 3 : Tester Workflow Chefs — Hebdomadaire**

Naviguer vers `/prospection/chefs-entreprise` → onglet Acquisition → cliquer "LANCER WORKFLOW HEBDOMADAIRE".
Attendu : chargement quelques secondes, puis leads avec signal "Création récente" et "Profil cession" dans l'onglet Tableau.

- [ ] **Step 4 : Tester Workflow Chefs — Mensuel**

Cliquer "LANCER WORKFLOW MENSUEL".
Attendu : leads avec signal "Holding patrimoniale", "Profil dividendes", "Dirigeant 55+".

- [ ] **Step 5 : Tester la carte TNS (`/map`)**

Si la page `/map` a une recherche TNS : tester qu'elle retourne aussi des résultats.

- [ ] **Step 6 : Vérifier les logs Cloud Run si anomalie**

```powershell
gcloud run services logs read ted-scale-with-ouss `
  --region europe-west1 `
  --project integration-make-365608 `
  --limit 30
```

Chercher des lignes `[API Error]` pour identifier tout problème résiduel.

---

## Notes de debug supplémentaires

Si la validation prod révèle 0 résultats (pas d'erreur, mais tableau vide) — causes possibles :
- L'API Data.gouv `recherche-entreprises.api.gouv.fr` répond avec `total_results: 0` pour certaines combinaisons métier/ville (NAF trop spécifique)
- Solution : tester avec `médecin_generaliste` + `Paris` qui est le cas le plus générique

Si erreur `Non autorisé (401)` — la session prod est expirée :
- Se déconnecter et se reconnecter sur la prod
- Vérifier que `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` sont bien dans l'image Docker (ils sont passés en `--build-arg`)
