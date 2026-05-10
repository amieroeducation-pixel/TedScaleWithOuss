# Phase 1: Data Wiring - Research

**Researched:** 2026-05-10
**Domain:** Next.js 15 App Router + Supabase SSR + TanStack Query v5 + Recharts
**Confidence:** HIGH

---

## Summary

La Phase 1 consiste à brancher les 4 pages mockées (`/revenue`, `/clients`, `/today`, `/analytics`) sur des données réelles Supabase. La base est solide : le schéma est complet (10 tables, 4 migrations appliquées), les vues SQL et la fonction `get_client_health_alerts()` existent déjà, et une route API `/api/revenue/stats` est partiellement implémentée. Il n'y a aucune bibliothèque nouvelle à installer — le stack complet est déjà en place.

Le travail est essentiellement un remplacement de constantes statiques par des appels API, avec gestion des états de chargement et d'erreur. TanStack Query v5 est installé mais aucun `QueryClientProvider` n'est encore configuré — c'est le premier gap à combler. Recharts est déjà importé dans `/revenue` avec les bonnes configurations de graphiques.

Le point le plus délicat est la page `/today` (Weekly Signal) : elle affiche actuellement un timer Pomodoro, des compteurs manuels et un agenda statique. Le vrai "Weekly Signal" — relances des 7 prochains jours — doit être tiré de `prospects.next_action_date` et de `interactions` (pour les RDV). La page `/today` actuelle mélange deux intentions distinctes : le cockpit de prospection du jour ET le signal hebdomadaire. La Phase 1 doit ajouter la section données réelles sans casser l'existant.

**Recommandation principale :** Créer des routes API dédiées pour chaque page, appeler ces routes depuis les pages client avec `fetch` + état React local (ou TanStack Query si QueryClientProvider est mis en place), et conserver le design/thème existant en ne remplaçant que les constantes de données.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-01 | CA mensuel réel vs objectif sur la page Revenue (depuis `v_monthly_revenue`) | Vue SQL existante — requête directe ou via `/api/revenue/stats` étendue |
| DATA-02 | Évolution CA sur 12 mois en graphique linéaire (Recharts) | Recharts LineChart déjà en place dans `/revenue` — remplacer `CA_MENSUEL` |
| DATA-03 | Commissions par produit financier (BarChart) | Requête `contracts` JOIN `financial_products` groupée par `product_type` |
| DATA-04 | Liste clients actifs avec date dernière interaction | Table `clients` JOIN `prospects` — colonnes `last_interaction_at`, `alert_threshold_days` |
| DATA-05 | Alertes Client Health (clients sans contact > seuil jours) | Fonction `get_client_health_alerts(user_id)` déjà implémentée en DB |
| DATA-06 | Weekly Signal : relances prioritaires 7 prochains jours | `prospects` WHERE `next_action_date` BETWEEN today AND today+7, ordonnés par `lead_score` |
| DATA-07 | RDV de la semaine (fallback via table `interactions`) | `interactions` WHERE `type IN ('rdv1','rdv2','rdv3')` AND `occurred_at` dans la semaine courante |
| DATA-08 | Taux de conversion par étape pipeline (depuis `v_pipeline_conversion`) | Vue SQL existante — requête directe |
| DATA-09 | Taux de closing global et par produit (PieChart) | Calcul depuis `contracts` : converti/(total prospects) groupé par product_type |
</phase_requirements>

---

## Project Constraints (from CLAUDE.md)

- **Stack** : Next.js 15 App Router uniquement — pas de Pages Router
- **Auth** : `@supabase/ssr` v0.10 avec `getUser()` dans middleware — jamais `getSession()`
- **Zod** : Version 4 — `.issues` (pas `.errors`), `PropertyKey[]` pour les paths
- **Design** : Thème dark/gold inline CSS via `src/lib/theme.ts` — pas de migration vers tokens shadcn/ui
- **Scope local** : Valider en local avant tout déploiement
- **DATA-07** : Google Calendar est hors scope v1 — fallback via table `interactions`

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Données Revenue (CA, commissions) | API / Backend (Route Handler) | Database (vues SQL) | RLS Supabase, auth côté serveur obligatoire |
| Données Clients (liste + santé) | API / Backend (Route Handler) | Database (function SQL) | `get_client_health_alerts()` côté DB, auth requise |
| Weekly Signal (relances + RDV) | API / Backend (Route Handler) | Database (tables) | Filtre sur `next_action_date`, auth requise |
| Données Analytics (pipeline) | API / Backend (Route Handler) | Database (vues SQL) | Vue `v_pipeline_conversion` existante |
| Affichage graphiques (Recharts) | Browser / Client | — | Recharts est un lib client, données passées en props |
| État de chargement / erreur | Browser / Client | — | Gestion React locale dans les pages client |
| QueryClientProvider (TanStack Query) | Frontend Server (SSR) | — | Provider global dans le layout ou root layout |

---

## Standard Stack

### Core (déjà installé — aucune installation requise)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/ssr` | 0.10.3 | Client Supabase côté serveur | Décision locked — auth JWT côté serveur |
| `@supabase/supabase-js` | 2.105.4 | Client Supabase côté client | SDK officiel |
| `@tanstack/react-query` | 5.100.9 | Fetching/caching données côté client | Installé, non configuré |
| `recharts` | 3.8.1 | Graphiques (LineChart, BarChart, PieChart) | Déjà utilisé dans `/revenue` |
| `next` | 15.5.18 | Framework — Route Handlers pour les APIs | Stack locked |
| `date-fns` | 4.1.0 | Manipulation dates (semaine courante, J+7) | Déjà installé |

### Pattern de data fetching recommandé

Deux approches valides dans ce codebase, selon la page :

**Option A — fetch direct dans composant client (simple, pas de QueryClient requis)**
```typescript
// Dans la page 'use client'
const [data, setData] = useState(null)
const [loading, setLoading] = useState(true)
useEffect(() => {
  fetch('/api/revenue/stats')
    .then(r => r.json())
    .then(json => setData(json.data))
    .finally(() => setLoading(false))
}, [])
```

**Option B — TanStack Query (recommandé si QueryClientProvider ajouté)**
```typescript
// Nécessite QueryClientProvider dans layout
const { data, isLoading, error } = useQuery({
  queryKey: ['revenue-stats'],
  queryFn: () => fetch('/api/revenue/stats').then(r => r.json()).then(j => j.data),
})
```

**Recommandation :** Option A pour cette phase (MVP rapide, 0 setup supplémentaire). Ajouter le `QueryClientProvider` comme première tâche si Option B souhaitée — mais c'est optionnel pour DATA-01 à DATA-09.

---

## Architecture Patterns

### System Architecture Diagram

```
Browser (pages 'use client')
  │
  │  fetch('/api/...')
  ▼
Next.js Route Handlers (src/app/api/*/route.ts)
  │  createSupabaseServerClient()  — cookies SSR, getUser()
  ▼
Supabase PostgreSQL
  ├── Tables directes: contracts, clients, prospects, interactions
  ├── Vues: v_monthly_revenue, v_pipeline_conversion
  └── Fonctions: get_client_health_alerts(user_id)
```

**Flow pour chaque page :**
1. Page se monte → `useEffect` déclenche `fetch('/api/nom-page/data')`
2. Route Handler s'authentifie via `createSupabaseServerClient()` + `getUser()`
3. Route Handler interroge Supabase (tables/vues/fonctions)
4. Route Handler retourne JSON via `apiSuccess({ ... })`
5. Page remplace ses constantes statiques par les données reçues

### Recommended Project Structure

```
src/app/api/
├── revenue/
│   └── stats/route.ts          ← EXIST (à étendre)
├── clients/
│   └── list/route.ts           ← À CRÉER (DATA-04, DATA-05)
├── today/
│   └── signal/route.ts         ← À CRÉER (DATA-06, DATA-07)
└── analytics/
    └── pipeline/route.ts       ← À CRÉER (DATA-08, DATA-09)

src/app/(dashboard)/
├── revenue/page.tsx             ← Remplacer constantes (DATA-01, DATA-02, DATA-03)
├── clients/page.tsx             ← Remplacer constantes (DATA-04, DATA-05)
├── today/page.tsx               ← Ajouter section signal (DATA-06, DATA-07)
└── analytics/page.tsx           ← Remplacer constantes (DATA-08, DATA-09)
```

### Pattern 1: Route Handler avec auth + apiSuccess

```typescript
// Source: pattern existant dans /api/revenue/stats/route.ts [VERIFIED: codebase]
import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function GET(_request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { data, error } = await supabase
    .from('table_name')
    .select('...')
    .eq('user_id', user.id)

  if (error) return apiError(error.message)
  return apiSuccess(data)
}
```

### Pattern 2: Appel fonction SQL RPC

```typescript
// Pour get_client_health_alerts [VERIFIED: schema migration 003]
const { data, error } = await supabase
  .rpc('get_client_health_alerts', { p_user_id: user.id })

// Retourne: client_id, prospect_id, full_name, last_interaction_at,
//           days_without_contact, alert_threshold_days, total_aum
```

### Pattern 3: Requête vue SQL

```typescript
// Pour v_monthly_revenue [VERIFIED: schema migration 003]
const { data, error } = await supabase
  .from('v_monthly_revenue')
  .select('month, year, month_num, revenue, objective, pct_of_objective')
  .eq('user_id', user.id)
  .order('month', { ascending: true })

// Pour v_pipeline_conversion [VERIFIED: schema migration 003]
const { data, error } = await supabase
  .from('v_pipeline_conversion')
  .select('pipeline_stage, total, conversion_rate_pct')
  .eq('user_id', user.id)
```

### Pattern 4: Commissions par produit (DATA-03)

```typescript
// contracts JOIN financial_products, groupé par product_type
// Pas de groupBy natif dans le SDK — requête SQL via rpc ou .select avec agrégation
const { data } = await supabase
  .from('contracts')
  .select('commission_amount, commission_status, financial_products(type, name)')
  .eq('user_id', user.id)
  .eq('commission_status', 'percue')

// Grouper en JavaScript après réception
// OU créer une vue SQL dédiée v_commissions_by_product
```

Note : Le client Supabase JS ne supporte pas `GROUP BY` nativement. Pour DATA-03, deux options :
- Grouper côté JavaScript dans la route (simple, acceptable pour ~100 contrats)
- Créer une vue SQL `v_commissions_by_product` (plus propre, recommandé si les données grossissent)

[ASSUMED] : Volume de contrats suffisamment faible en v1 pour un groupement JS côté route.

### Pattern 5: Weekly Signal — relances J+7 (DATA-06)

```typescript
// prospects avec next_action_date dans les 7 prochains jours
const today = new Date().toISOString().split('T')[0]
const in7days = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

const { data } = await supabase
  .from('prospects')
  .select('id, full_name, profession, pipeline_stage, next_action_date, lead_score, phone')
  .eq('user_id', user.id)
  .gte('next_action_date', today)
  .lte('next_action_date', in7days)
  .order('next_action_date', { ascending: true })
  .order('lead_score', { ascending: false })
```

### Pattern 6: RDV de la semaine (DATA-07 fallback)

```typescript
// interactions de type rdv1/rdv2/rdv3 dans la semaine courante
// date-fns pour le début et la fin de semaine [VERIFIED: date-fns installé]
import { startOfWeek, endOfWeek } from 'date-fns'

const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString()
const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 }).toISOString()

const { data } = await supabase
  .from('interactions')
  .select('id, type, occurred_at, notes, prospect_id, prospects(full_name, profession)')
  .eq('user_id', user.id)
  .in('type', ['rdv1', 'rdv2', 'rdv3'])
  .gte('occurred_at', weekStart)
  .lte('occurred_at', weekEnd)
  .order('occurred_at', { ascending: true })
```

### Anti-Patterns à éviter

- **Appel Supabase direct depuis les pages client :** Les pages sont `'use client'` — appeler Supabase directement bypasse l'auth middleware et expose l'anon key. Toujours passer par des Route Handlers.
- **`getSession()` au lieu de `getUser()` :** `getSession()` ne valide pas le JWT côté serveur (décision locked Phase 0).
- **Remplacer tout le JSX des pages :** Les pages mockées ont un design soigné. Remplacer uniquement les constantes de données, pas le rendu.
- **Créer un `QueryClientProvider` sans le déplacer hors de `'use client'` layout :** Le layout dashboard actuel est déjà `'use client'`. Un QueryClientProvider peut s'y ajouter mais il faudra wrapping approprié.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Client health alerts | Requête SQL custom | `get_client_health_alerts(user_id)` (déjà en DB) | Fonction optimisée avec index |
| Monthly revenue | Calcul JS aggregation | Vue `v_monthly_revenue` (déjà en DB) | Calcul pct_of_objective inclus |
| Pipeline conversion | Calcul JS conversion rates | Vue `v_pipeline_conversion` (déjà en DB) | Includes lag(), stage ordering |
| Date manipulation (semaine) | `new Date().getDay()` hacks | `date-fns` (installé) | Edge cases locale, DST |
| Toast notifications | Custom toasts | `sonner` (installé + Toaster dans layout) | Déjà configuré dans le layout |
| Auth validation | Custom JWT check | `supabase.auth.getUser()` | Pattern locked Phase 0 |

**Key insight :** Le schéma DB Phase 0 a anticipé exactement les besoins de Phase 1. Toutes les données complexes (alerts, revenue, pipeline) sont déjà exposées via vues et fonctions. Le travail de Phase 1 est du wiring, pas de la logique métier.

---

## Runtime State Inventory

Step 2.5: SKIPPED — Phase 1 est une phase de wiring (ajout de data fetching), pas de renommage ni de migration. Aucun état runtime à inventorier.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js dev server | A vérifier au run | — | — |
| Supabase (local/cloud) | Toutes les routes API | Cloud (vqtzcxvmzznbepyvlcut) | 4 migrations | — |
| `.env.local` avec variables Supabase | Auth + DB | A vérifier (existant Phase 0) | — | Bloquant si absent |

**Note :** Le projet tourne en local sur Windows. Les variables `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` doivent être présentes dans `.env.local` — confirmées utilisées en Phase 0 (page `/crm` avec Kanban temps réel).

---

## Common Pitfalls

### Pitfall 1: commission_status enum — 'percue' vs 'payee'

**Ce qui part mal :** La route existante `/api/revenue/stats` filtre sur `commission_status = 'payee'` mais l'enum SQL définit `'percue'` (migration 001).
**Pourquoi :** Incohérence entre la route implémentée et le schéma réel.
**Comment éviter :** Utiliser `'percue'` partout. La vue `v_monthly_revenue` utilise correctement `'percue'`.
**Signe d'alerte :** Revenue affiche 0 alors que des contrats existent.

[VERIFIED: migration 001 — `commission_status as enum ('attendue', 'percue', 'annulee')`]

### Pitfall 2: v_monthly_revenue ne filtre pas par user_id automatiquement

**Ce qui part mal :** La vue n'a pas de politique RLS — elle retourne toutes les lignes pour tous les users.
**Pourquoi :** Les vues SQL Supabase héritent des RLS des tables sous-jacentes seulement si configurées. [ASSUMED]
**Comment éviter :** Toujours ajouter `.eq('user_id', user.id)` même sur les vues.
**Signe d'alerte :** Les données d'un user apparaissent chez un autre.

### Pitfall 3: TanStack Query v5 — syntaxe différente de v4

**Ce qui part mal :** Utiliser l'ancienne syntaxe `useQuery(['key'], fn)` (v4) au lieu de `useQuery({ queryKey: ['key'], queryFn: fn })` (v5).
**Pourquoi :** TanStack Query v5 a une breaking change sur la signature.
**Comment éviter :** Toujours passer un objet à `useQuery`. Vérifier que `QueryClientProvider` wrapping est en place.
**Signe d'alerte :** Erreur TypeScript sur la signature de `useQuery`.

[VERIFIED: version 5.100.9 dans package.json]

### Pitfall 4: Page /today — double intention

**Ce qui part mal :** Remplacer l'agenda statique de `/today` par des données réelles casse le timer Pomodoro et les compteurs manuels (state React local).
**Pourquoi :** La page mélange données "aujourd'hui" (cockpit) et "signal hebdomadaire" (données DB).
**Comment éviter :** Ajouter une NOUVELLE section "Relances à venir" dans `/today` pour DATA-06/DATA-07, sans toucher aux composants existants (timer, compteurs, script d'appel).
**Signe d'alerte :** Timer Pomodoro casse ou les compteurs perdent leur état.

### Pitfall 5: interactions.prospect_id vs clients.prospect_id

**Ce qui part mal :** La table `interactions` référence `prospect_id` (pas `client_id`). Pour lier interactions → client → nom, il faut passer par `prospects`.
**Pourquoi :** Le schema distingue prospects (avant conversion) et clients (après conversion), mais toutes les interactions restent liées au prospect d'origine.
**Comment éviter :** `interactions JOIN prospects` (pas `JOIN clients`).

### Pitfall 6: get_client_health_alerts retourne UNIQUEMENT les clients en alerte

**Ce qui part mal :** Utiliser `get_client_health_alerts()` pour la liste complète des clients (DATA-04).
**Pourquoi :** La fonction filtre sur `days_without_contact >= alert_threshold_days` — elle n'inclut pas les clients "sains".
**Comment éviter :** DATA-04 (liste complète) = requête directe sur `clients JOIN prospects`. DATA-05 (alertes) = `get_client_health_alerts()`.

---

## Code Examples

### Requête v_monthly_revenue complète

```typescript
// Source: migration 003_functions.sql [VERIFIED: codebase]
const { data: monthlyRevenue, error } = await supabase
  .from('v_monthly_revenue')
  .select('month, year, month_num, revenue, objective, pct_of_objective')
  .eq('user_id', user.id)
  .eq('year', new Date().getFullYear())
  .order('month_num', { ascending: true })
// Retourne: [{month: '2026-01-01', year: 2026, month_num: 1, revenue: 12000, objective: 15000, pct_of_objective: 80.0}]
```

### Appel fonction client health alerts

```typescript
// Source: migration 003_functions.sql [VERIFIED: codebase]
const { data: alerts, error } = await supabase
  .rpc('get_client_health_alerts', { p_user_id: user.id })
// Retourne: [{client_id, prospect_id, full_name, last_interaction_at, days_without_contact, alert_threshold_days, total_aum}]
```

### Liste clients complète (DATA-04)

```typescript
// Source: schema migration 001 [VERIFIED: codebase]
const { data: clients, error } = await supabase
  .from('clients')
  .select(`
    id, total_aum, last_interaction_at, alert_threshold_days, notes, created_at,
    prospects(full_name, profession, city, phone, email, pipeline_stage, tags)
  `)
  .eq('user_id', user.id)
  .order('last_interaction_at', { ascending: true, nullsFirst: true })
```

### Commissions par produit (DATA-03) — groupement JS

```typescript
// Source: pattern dérivé du schéma [VERIFIED: codebase]
const { data: contracts } = await supabase
  .from('contracts')
  .select('commission_amount, financial_products(type, name)')
  .eq('user_id', user.id)
  .eq('commission_status', 'percue')

const byProduct = contracts?.reduce((acc, c) => {
  const type = c.financial_products?.type ?? 'autre'
  acc[type] = (acc[type] || 0) + Number(c.commission_amount)
  return acc
}, {} as Record<string, number>) ?? {}
```

### État de chargement pattern (page client)

```typescript
// Pattern standard Next.js 15 App Router avec 'use client' [ASSUMED — bonne pratique]
const [data, setData] = useState<RevenueStats | null>(null)
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)

useEffect(() => {
  fetch('/api/revenue/stats')
    .then(r => r.json())
    .then((json: ApiResponse<RevenueStats>) => {
      if (json.error) setError(json.error)
      else setData(json.data)
    })
    .catch(e => setError(e.message))
    .finally(() => setLoading(false))
}, [])

if (loading) return <LoadingSkeleton />
if (error) return <ErrorBanner message={error} />
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `useQuery(['key'], fn)` | `useQuery({ queryKey, queryFn })` | TanStack Query v5 | Breaking change — syntaxe objet obligatoire |
| `supabase.from().rpc()` | `supabase.rpc('fn', params)` | SDK v2 | Pattern stable |
| `getSession()` auth | `getUser()` auth | @supabase/ssr v0.5+ | `getSession()` ne valide plus le JWT SSR |
| Data fetching dans Server Components | Reste optionnel — pages sont 'use client' | Next.js 13+ | Les pages dashboard sont toutes 'use client', donc fetch dans useEffect ou TanStack Query |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Volume de contrats suffisamment faible pour groupement JS côté route (DATA-03) | Architecture Patterns | Requête lente si >1000 contrats — créer vue SQL à la place |
| A2 | Les vues `v_monthly_revenue` et `v_pipeline_conversion` ne filtrent pas par RLS automatiquement | Common Pitfalls | Si RLS héritée : filtre `.eq('user_id')` redondant mais inoffensif |
| A3 | `.env.local` avec variables Supabase est présent (validé en Phase 0 via /crm) | Environment Availability | Bloquant si absent — `/crm` ne fonctionnerait pas non plus |
| A4 | TanStack Query reste optionnel pour Phase 1 (fetch + useState suffisant) | Standard Stack | Si complexité croît, refactor nécessaire vers QueryClient |

---

## Open Questions (RESOLVED)

1. **QueryClientProvider : ajouter ou pas pour Phase 1 ?** — RESOLVED
   - Ce qu'on sait : TanStack Query v5 est installé mais aucun Provider n'est configuré
   - **Décision** : Ne pas l'ajouter en Phase 1 (MVP). Utiliser fetch + useState. Ajouter en Phase 2 si les séquences nécessitent du polling.

2. **commission_status 'payee' vs 'percue' dans la route existante** — RESOLVED
   - Ce qu'on sait : La route `/api/revenue/stats` utilise `'payee'` mais l'enum DB définit `'percue'`
   - **Décision** : Corriger en `'percue'` dès la première tâche Revenue (task 1 de 01A-PLAN.md).

3. **Données de test : la DB Supabase a-t-elle des données réelles ?** — RESOLVED
   - Ce qu'on sait : L'utilisateur `amiero.education@gmail.com` est confirmé, 4 migrations appliquées
   - **Décision** : Prévoir un état vide élégant (`EmptyState`) dans chaque page — si DB vide, affiche invitation à créer les premières données.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright (installé en devDependencies) |
| Config file | Non trouvé — à créer en Wave 0 si tests e2e voulus |
| Quick run command | `npx playwright test --headed` (après config) |
| Full suite command | `npx playwright test` |

Note : Aucun test unitaire (Jest/Vitest) n'est configuré. Le projet utilise uniquement Playwright pour e2e. Pour Phase 1 (wiring de données), des tests e2e smoke suffisent.

### Phase Requirements — Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-01 | Page Revenue affiche CA mensuel non-zéro | smoke e2e | `npx playwright test tests/revenue.spec.ts` | Non — Wave 0 |
| DATA-02 | Graphique 12 mois visible avec données | smoke e2e | `npx playwright test tests/revenue.spec.ts` | Non — Wave 0 |
| DATA-03 | BarChart commissions par produit visible | smoke e2e | `npx playwright test tests/revenue.spec.ts` | Non — Wave 0 |
| DATA-04 | Page Clients liste au moins 1 client | smoke e2e | `npx playwright test tests/clients.spec.ts` | Non — Wave 0 |
| DATA-05 | Alertes santé colorées affichées | smoke e2e | `npx playwright test tests/clients.spec.ts` | Non — Wave 0 |
| DATA-06 | Section Weekly Signal visible avec relances | smoke e2e | `npx playwright test tests/today.spec.ts` | Non — Wave 0 |
| DATA-07 | RDV de la semaine affichés | smoke e2e | `npx playwright test tests/today.spec.ts` | Non — Wave 0 |
| DATA-08 | Taux conversion pipeline affiché | smoke e2e | `npx playwright test tests/analytics.spec.ts` | Non — Wave 0 |
| DATA-09 | PieChart closing par produit visible | smoke e2e | `npx playwright test tests/analytics.spec.ts` | Non — Wave 0 |

### Sampling Rate
- **Par tâche :** Vérification visuelle manuelle (dev server `npm run dev`)
- **Par wave merge :** `npx playwright test` si config créée en Wave 0
- **Phase gate :** Vérification manuelle des 4 pages + aucune donnée fictive visible

### Wave 0 Gaps
- [ ] `playwright.config.ts` — configuration de base (baseURL: localhost:3000, authentification)
- [ ] `tests/revenue.spec.ts` — smoke tests DATA-01, DATA-02, DATA-03
- [ ] `tests/clients.spec.ts` — smoke tests DATA-04, DATA-05
- [ ] `tests/today.spec.ts` — smoke tests DATA-06, DATA-07
- [ ] `tests/analytics.spec.ts` — smoke tests DATA-08, DATA-09

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Oui | `supabase.auth.getUser()` dans chaque Route Handler |
| V3 Session Management | Oui | `@supabase/ssr` gère les cookies SSR |
| V4 Access Control | Oui | `.eq('user_id', user.id)` sur toutes les requêtes |
| V5 Input Validation | Non (GET only, pas de user input) | — |
| V6 Cryptographie | Non (pas de crypto custom) | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR — accès aux données d'un autre user | Spoofing | `.eq('user_id', user.id)` sur toutes requêtes Supabase |
| Appel API non authentifié | Elevation of privilege | `if (!user) return apiUnauthorized()` en tête de chaque handler |
| Exposition d'une vue sans filtre user | Info Disclosure | Toujours filtrer les vues SQL par `user_id` même si RLS présent |

---

## Sources

### Primary (HIGH confidence)
- Codebase `supabase/migrations/001_init_schema.sql` — schéma complet vérifié
- Codebase `supabase/migrations/003_functions.sql` — vues et fonctions vérifiées
- Codebase `src/app/api/revenue/stats/route.ts` — pattern Route Handler vérifié
- Codebase `src/lib/supabase/server.ts` — `createSupabaseServerClient` vérifié
- Codebase `src/lib/api.ts` — helpers `apiSuccess/apiError/apiUnauthorized` vérifiés
- Codebase `src/lib/theme.ts` — palette de couleurs C vérifiée
- Codebase `package.json` — versions exactes de toutes les dépendances vérifiées
- Codebase pages mockées — structure HTML/JSX existante analysée

### Secondary (MEDIUM confidence)
- TanStack Query v5 breaking changes (syntaxe objet) — connu via training, cohérent avec version 5.100.9
- Supabase RLS sur les vues — comportement partiellement assumed (A2)

### Tertiary (LOW confidence)
- Aucun

---

## Metadata

**Confidence breakdown :**
- Standard Stack : HIGH — toutes les versions vérifiées dans package.json
- Architecture : HIGH — patterns vérifiés dans le codebase existant
- Schéma DB / vues / fonctions : HIGH — migrations lues directement
- Pitfalls : HIGH pour enum bug (vérifié), MEDIUM pour RLS vues (assumed)

**Research date :** 2026-05-10
**Valid until :** 2026-06-10 (stack stable, schéma verrouillé)
