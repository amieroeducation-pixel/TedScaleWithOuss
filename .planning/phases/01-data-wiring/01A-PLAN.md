---
phase: 01-data-wiring
plan: 01A
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/api/revenue/stats/route.ts
  - src/app/api/revenue/products/route.ts
  - src/app/(dashboard)/revenue/page.tsx
autonomous: true
requirements: [DATA-01, DATA-02, DATA-03]
tags: [revenue, supabase, recharts, data-wiring]

must_haves:
  truths:
    - "L'utilisateur voit son CA mensuel réel (non zéro si data) sur /revenue"
    - "L'utilisateur voit le graphique LineChart 12 mois alimenté par v_monthly_revenue"
    - "L'utilisateur voit les commissions par produit (BarChart) provenant de la DB"
    - "Aucune constante CA_MENSUEL / COMMISSIONS / CA_6MOIS hardcodée n'est utilisée pour le rendu"
  artifacts:
    - path: "src/app/api/revenue/stats/route.ts"
      provides: "Stats KPI (CA mois courant, YTD, objectif, contracts, clients) + monthlyData 12 mois depuis v_monthly_revenue"
      contains: "commission_status.*percue"
    - path: "src/app/api/revenue/products/route.ts"
      provides: "Commissions agrégées par product_type pour BarChart"
      exports: ["GET"]
    - path: "src/app/(dashboard)/revenue/page.tsx"
      provides: "Page Revenue branchée fetch + useState + loading/error states"
      contains: "fetch.*api/revenue"
  key_links:
    - from: "src/app/(dashboard)/revenue/page.tsx"
      to: "/api/revenue/stats"
      via: "fetch in useEffect"
      pattern: "fetch.*api/revenue/stats"
    - from: "src/app/(dashboard)/revenue/page.tsx"
      to: "/api/revenue/products"
      via: "fetch in useEffect"
      pattern: "fetch.*api/revenue/products"
    - from: "src/app/api/revenue/stats/route.ts"
      to: "v_monthly_revenue"
      via: "supabase.from('v_monthly_revenue')"
      pattern: "v_monthly_revenue"
---

## Phase Goal

**As a** CGP indépendant, **I want to** voir mon CA mensuel réel, l'évolution sur 12 mois et la répartition de mes commissions par produit financier sur la page Revenue, **so that** je pilote mon activité avec des chiffres exacts plutôt qu'avec des données fictives.

<objective>
Brancher la page `/revenue` sur Supabase pour DATA-01, DATA-02, DATA-03 — slice verticale complète : DB (vue + table) → API routes → page client avec loading/error states. Corriger le bug enum `commission_status = 'payee'` → `'percue'`.

Purpose: Première page réellement utilisable, donne confiance que la stack data-wiring fonctionne bout-en-bout.
Output: 2 routes API + page Revenue 100 % branchée, sans constantes hardcodées de rendu.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/01-data-wiring/01-RESEARCH.md

@src/app/api/revenue/stats/route.ts
@src/app/api/prospects/route.ts
@src/lib/supabase/server.ts
@src/lib/api.ts
@src/app/(dashboard)/revenue/page.tsx

<interfaces>
From src/lib/api.ts:
```typescript
export type ApiResponse<T> = { data: T | null; error: string | null }
export function apiSuccess<T>(data: T, status?: number): NextResponse
export function apiError(message: string, status?: number): NextResponse
export function apiUnauthorized(): NextResponse
```

From src/lib/supabase/server.ts:
```typescript
export async function createSupabaseServerClient(): Promise<SupabaseClient>
```

DB schema (migration 001 + 003) — colonnes critiques:
- `contracts(id, user_id, commission_amount numeric, commission_date date, commission_status enum('attendue','percue','annulee'), financial_product_id)`
- `financial_products(id, type text, name text)` — `type` valeurs ex : 'assurance_vie','per','compte_titres','capi','tontine','autre'
- `v_monthly_revenue(user_id, month date, year int, month_num int, revenue numeric, objective numeric, pct_of_objective numeric)` — déjà filtrée par user dans la vue mais TOUJOURS ajouter `.eq('user_id', user.id)`
- `revenue_objectives(user_id, year, month, product_type, amount)`

Frontend constantes utilisées par la page actuelle (à remplacer):
- `CA_MENSUEL: { mois: string, ca: number }[]` — 12 lignes
- `COMMISSIONS: { produit, montant, pct, width, color }[]` — provenant de products
- `CA_6MOIS: { mois, ca, width, highlight? }[]` — dérivé de CA_MENSUEL (6 derniers)
- `COMMISSIONS_TRIMESTRE` — RESTE STATIQUE pour cette phase (hors scope DATA-01/02/03, sera traité plus tard si besoin)
- KPI Cards (CA Avril, CA Annualisé, Commission moy., Contrats actifs) — proviendront de `/api/revenue/stats`

Mapping product_type → label/color (réutiliser `C` de theme.ts):
- assurance_vie → "Assurance vie", C.gold
- per → "PER / Retraite", C.indigo
- compte_titres → "Compte-titres", C.green
- capi → "Contrat Capi.", '#9a4a8a'
- tontine → "Tontine", C.warn
- autre → "Autre", C.textLo
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Fix commission enum bug + étendre /api/revenue/stats avec monthlyData via v_monthly_revenue</name>
  <files>src/app/api/revenue/stats/route.ts</files>
  <read_first>
    - src/app/api/revenue/stats/route.ts (route existante à modifier)
    - src/lib/api.ts (helpers apiSuccess/apiError/apiUnauthorized)
    - src/lib/supabase/server.ts (createSupabaseServerClient)
    - .planning/phases/01-data-wiring/01-RESEARCH.md (Pattern 1, Pattern 3, Pitfall 1)
  </read_first>
  <action>
    Modifier `src/app/api/revenue/stats/route.ts` :
    1. Remplacer les DEUX occurrences de `'payee'` par `'percue'` (ligne ~19, et toute autre occurrence). C'est le bug critique enum identifié dans RESEARCH Pitfall 1 — l'enum DB est `('attendue','percue','annulee')`, jamais `'payee'`.
    2. Remplacer le calcul JS `byMonth` (boucle sur contracts) par une requête à la vue SQL `v_monthly_revenue` :
       ```typescript
       const { data: monthly, error: monthlyError } = await supabase
         .from('v_monthly_revenue')
         .select('month_num, revenue, objective, pct_of_objective')
         .eq('user_id', user.id)
         .eq('year', currentYear)
         .order('month_num', { ascending: true })
       if (monthlyError) return apiError(monthlyError.message)
       ```
    3. Construire `monthlyData` (12 entrées TOUJOURS, même si la vue ne renvoie que les mois avec données) :
       ```typescript
       const MONTH_LABELS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
       const byMonth: Record<number, number> = {}
       const objByMonth: Record<number, number> = {}
       for (let m = 1; m <= 12; m++) { byMonth[m] = 0; objByMonth[m] = 0 }
       for (const row of (monthly ?? [])) {
         byMonth[row.month_num] = Number(row.revenue) || 0
         objByMonth[row.month_num] = Number(row.objective) || 0
       }
       const monthlyData = Array.from({ length: 12 }, (_, i) => ({
         month: MONTH_LABELS[i],
         monthNum: i + 1,
         ca: byMonth[i + 1],
         objectif: objByMonth[i + 1],
         current: (i + 1) === currentMonth,
       }))
       ```
    4. Calculer `caCurrentMonth = byMonth[currentMonth]` et `caYTD = sum(byMonth)`.
    5. Conserver la logique `objectiveMonth` existante (depuis revenue_objectives) MAIS si non trouvée fallback sur `objByMonth[currentMonth]`.
    6. Conserver `contractCount` et `clientCount` (count exact head:true).
    7. Calculer `commissionAvg = contractCount > 0 ? Math.round(caYTD / contractCount) : 0`.
    8. Retourner via `apiSuccess({ caCurrentMonth, caYTD, objectiveMonth, contractCount, clientCount, commissionAvg, monthlyData })`.
    9. Garder l'auth `getUser()` + `apiUnauthorized()` en tête.
  </action>
  <verify>
    <automated>cd C:/Users/Ted/Documents/GitHub/TedScaleWithOuss; npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "src/app/api/revenue/stats" ; if (Get-Content src/app/api/revenue/stats/route.ts | Select-String -Pattern "'payee'") { Write-Error "BUG: 'payee' still present" } ; if (-not (Get-Content src/app/api/revenue/stats/route.ts | Select-String -Pattern "'percue'")) { Write-Error "MISSING: 'percue' not found" } ; if (-not (Get-Content src/app/api/revenue/stats/route.ts | Select-String -Pattern "v_monthly_revenue")) { Write-Error "MISSING: v_monthly_revenue not used" }</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "'payee'" src/app/api/revenue/stats/route.ts` returns 0
    - `grep -c "'percue'" src/app/api/revenue/stats/route.ts` returns >= 1
    - `grep -c "v_monthly_revenue" src/app/api/revenue/stats/route.ts` returns >= 1
    - `grep -c "monthlyData" src/app/api/revenue/stats/route.ts` returns >= 1
    - `grep -c "objectif" src/app/api/revenue/stats/route.ts` returns >= 1
    - `grep -c "commissionAvg" src/app/api/revenue/stats/route.ts` returns >= 1
    - TypeScript compile (`npx tsc --noEmit`) sans erreur sur ce fichier
  </acceptance_criteria>
  <done>Route `/api/revenue/stats` retourne `{ caCurrentMonth, caYTD, objectiveMonth, contractCount, clientCount, commissionAvg, monthlyData[12] }` depuis `v_monthly_revenue` filtrée par user, sans aucune référence à `'payee'`.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Créer /api/revenue/products pour commissions agrégées par product_type (DATA-03)</name>
  <files>src/app/api/revenue/products/route.ts</files>
  <read_first>
    - src/app/api/revenue/stats/route.ts (pattern Route Handler — auth + apiSuccess/apiError)
    - src/lib/api.ts
    - src/lib/supabase/server.ts
    - .planning/phases/01-data-wiring/01-RESEARCH.md (Pattern 4, Code Examples "Commissions par produit")
  </read_first>
  <action>
    Créer `src/app/api/revenue/products/route.ts` (nouveau fichier) — Route Handler GET qui retourne commissions agrégées par `product_type`.

    Structure exacte :
    ```typescript
    import { NextRequest } from 'next/server'
    import { createSupabaseServerClient } from '@/lib/supabase/server'
    import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

    type ProductRow = {
      type: string
      label: string
      montant: number
      pct: number
      color: string
    }

    const PRODUCT_LABELS: Record<string, string> = {
      assurance_vie: 'Assurance vie',
      per: 'PER / Retraite',
      compte_titres: 'Compte-titres',
      capi: 'Contrat Capi.',
      tontine: 'Tontine',
      autre: 'Autre',
    }

    const PRODUCT_COLORS: Record<string, string> = {
      assurance_vie: '#c9a84c',
      per: '#7a6cf0',
      compte_titres: '#4ade80',
      capi: '#9a4a8a',
      tontine: '#f59e0b',
      autre: '#6b7280',
    }

    export async function GET(_request: NextRequest) {
      const supabase = await createSupabaseServerClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return apiUnauthorized()

      const { data: contracts, error } = await supabase
        .from('contracts')
        .select('commission_amount, financial_products(type, name)')
        .eq('user_id', user.id)
        .eq('commission_status', 'percue')

      if (error) return apiError(error.message)

      const byType: Record<string, number> = {}
      for (const c of (contracts ?? [])) {
        const fp = c.financial_products as { type?: string } | { type?: string }[] | null
        const type = (Array.isArray(fp) ? fp[0]?.type : fp?.type) ?? 'autre'
        byType[type] = (byType[type] || 0) + Number(c.commission_amount || 0)
      }

      const total = Object.values(byType).reduce((a, b) => a + b, 0) || 1
      const rows: ProductRow[] = Object.entries(byType)
        .map(([type, montant]) => ({
          type,
          label: PRODUCT_LABELS[type] ?? type,
          montant,
          pct: Math.round((montant / total) * 100),
          color: PRODUCT_COLORS[type] ?? '#6b7280',
        }))
        .sort((a, b) => b.montant - a.montant)

      return apiSuccess({ products: rows, total })
    }
    ```

    NOTE : `financial_products` peut être renvoyé comme objet OU array selon la relation Supabase — gérer les deux cas comme dans le snippet.
  </action>
  <verify>
    <automated>cd C:/Users/Ted/Documents/GitHub/TedScaleWithOuss; if (-not (Test-Path src/app/api/revenue/products/route.ts)) { Write-Error "MISSING file" } ; npx tsc --noEmit -p tsconfig.json 2>&1 | Select-String "src/app/api/revenue/products"</automated>
  </verify>
  <acceptance_criteria>
    - File `src/app/api/revenue/products/route.ts` exists
    - `grep -c "export async function GET" src/app/api/revenue/products/route.ts` returns 1
    - `grep -c "apiUnauthorized" src/app/api/revenue/products/route.ts` returns >= 1
    - `grep -c "'percue'" src/app/api/revenue/products/route.ts` returns >= 1
    - `grep -c "financial_products" src/app/api/revenue/products/route.ts` returns >= 1
    - `grep -c "PRODUCT_LABELS" src/app/api/revenue/products/route.ts` returns >= 1
    - TypeScript compile sans erreur sur ce fichier
  </acceptance_criteria>
  <done>GET `/api/revenue/products` retourne `{ products: [{type,label,montant,pct,color}], total }` triés par montant desc, filtrés sur `commission_status = 'percue'` et `user_id`.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Brancher /revenue page sur les 2 routes API (loading/error/data) — supprimer constantes hardcodées</name>
  <files>src/app/(dashboard)/revenue/page.tsx</files>
  <read_first>
    - src/app/(dashboard)/revenue/page.tsx (page actuelle complète)
    - src/lib/theme.ts (palette C — réutiliser sans modification)
    - src/lib/api.ts (type ApiResponse<T>)
  </read_first>
  <action>
    Modifier `src/app/(dashboard)/revenue/page.tsx` :

    1. Ajouter `useState` + `useEffect` en tête du composant (déjà `'use client'`).
    2. Définir les types côté client :
       ```typescript
       type StatsResponse = {
         caCurrentMonth: number
         caYTD: number
         objectiveMonth: number
         contractCount: number
         clientCount: number
         commissionAvg: number
         monthlyData: Array<{ month: string; monthNum: number; ca: number; objectif: number; current: boolean }>
       }
       type ProductsResponse = {
         products: Array<{ type: string; label: string; montant: number; pct: number; color: string }>
         total: number
       }
       ```
    3. Ajouter deux `useEffect` (ou un seul `Promise.all`) qui fetchent `/api/revenue/stats` et `/api/revenue/products`. Stocker dans `stats: StatsResponse | null`, `products: ProductsResponse | null`, et `loading`, `error`.
    4. **SUPPRIMER** les constantes : `CA_MENSUEL`, `COMMISSIONS`, `CA_6MOIS`. Conserver `COMMISSIONS_TRIMESTRE` (hors scope) et le bloc "Objectifs vs Réalisé" final (hors scope, pas dans DATA-01/02/03).
    5. Ajouter un état chargement minimal en haut du return :
       ```typescript
       if (loading) {
         return <div style={{ padding: 40, color: C.textLo, fontSize: 12 }}>Chargement…</div>
       }
       if (error) {
         return <div style={{ padding: 40, color: C.warn, fontSize: 12 }}>Erreur : {error}</div>
       }
       ```
    6. Remplacer le rendu :
       - **KPI Cards (4)** : utiliser `stats.caCurrentMonth`, `stats.caYTD` (CA Annualisé = caYTD ici), `stats.commissionAvg`, `stats.contractCount`. Format `Number(...).toLocaleString('fr-FR') + ' €'`. Le label "CA Avril" devient le mois courant dynamique : utiliser `MONTH_LABELS_LONG[new Date().getMonth()]`. Les variations (`+12%`, `+8%`) — laisser une variation calculée vs mois précédent : `pctVsLastMonth = lastMonthCa > 0 ? Math.round(((stats.caCurrentMonth - lastMonthCa)/lastMonthCa)*100) : 0`. Si pas de données antérieures, afficher `—` plutôt qu'une valeur fictive.
       - **Commissions par produit (HTML bars)** : mapper `products.products` au lieu de `COMMISSIONS`. `width` calculé à partir de `pct` (`width: c.pct` ou `Math.min(100, c.pct * 1.5)` pour visuel).
       - **CA 6 mois (HTML bars)** : dériver des 6 derniers mois de `stats.monthlyData` :
         ```typescript
         const last6 = stats.monthlyData.slice(-6)
         const max6 = Math.max(...last6.map(m => m.ca), 1)
         // width = Math.round((m.ca / max6) * 100), highlight = m.current
         ```
       - **LineChart 12 mois** : `data={stats.monthlyData}` avec `dataKey="ca"` et `XAxis dataKey="month"`. Conserver les styles existants (couleurs, dot logic). Mettre à jour le titre `Mai 2024 → Avr 2025` → calcul dynamique des bornes.
       - **Bandeau résumé sous LineChart** : "Meilleur mois" / "Croissance 12m" / "Moyenne / mois" — calculer depuis `stats.monthlyData` :
         - meilleur = monthlyData.reduce((max,m) => m.ca > max.ca ? m : max)
         - croissance = first vs last non-zero
         - moyenne = Math.round(caYTD / monthsWithData)
    7. Garder le bloc COMMISSIONS_TRIMESTRE et le bloc "Objectifs vs Réalisé" tels quels (hors scope, traités dans une phase ultérieure).
    8. Imports : ajouter `useState`, `useEffect` depuis `react`. Conserver tous les imports recharts/theme.
  </action>
  <verify>
    <automated>cd C:/Users/Ted/Documents/GitHub/TedScaleWithOuss; npx tsc --noEmit -p tsconfig.json 2>&1 | Select-String "revenue/page" ; if (Get-Content src/app/(dashboard)/revenue/page.tsx | Select-String -Pattern "^const CA_MENSUEL\s*=") { Write-Error "BUG: CA_MENSUEL constant still present" } ; if (Get-Content src/app/(dashboard)/revenue/page.tsx | Select-String -Pattern "^const COMMISSIONS\s*=") { Write-Error "BUG: COMMISSIONS constant still present" } ; if (Get-Content src/app/(dashboard)/revenue/page.tsx | Select-String -Pattern "^const CA_6MOIS\s*=") { Write-Error "BUG: CA_6MOIS constant still present" } ; if (-not (Get-Content src/app/(dashboard)/revenue/page.tsx | Select-String -Pattern "fetch.*api/revenue/stats")) { Write-Error "MISSING fetch stats" } ; if (-not (Get-Content src/app/(dashboard)/revenue/page.tsx | Select-String -Pattern "fetch.*api/revenue/products")) { Write-Error "MISSING fetch products" }</automated>
  </verify>
  <acceptance_criteria>
    - `grep -cE "^const CA_MENSUEL\s*=" src/app/(dashboard)/revenue/page.tsx` returns 0
    - `grep -cE "^const COMMISSIONS\s*=" src/app/(dashboard)/revenue/page.tsx` returns 0
    - `grep -cE "^const CA_6MOIS\s*=" src/app/(dashboard)/revenue/page.tsx` returns 0
    - `grep -c "fetch.*api/revenue/stats" src/app/(dashboard)/revenue/page.tsx` returns >= 1
    - `grep -c "fetch.*api/revenue/products" src/app/(dashboard)/revenue/page.tsx` returns >= 1
    - `grep -c "useState" src/app/(dashboard)/revenue/page.tsx` returns >= 1
    - `grep -c "useEffect" src/app/(dashboard)/revenue/page.tsx` returns >= 1
    - TypeScript compile sans erreur
    - Lancement manuel `npm run dev` puis visite /revenue : aucune valeur fictive type "18 400 €" affichée si DB vide (afficher 0 € à la place)
  </acceptance_criteria>
  <done>La page /revenue affiche dynamiquement KPI, BarChart commissions, CA 6 mois et LineChart 12 mois depuis les routes API. Loading et error states gérés. Aucune des trois constantes CA_MENSUEL/COMMISSIONS/CA_6MOIS ne subsiste.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser → Route Handler | Cookies SSR de session — getUser() valide le JWT |
| Route Handler → Supabase | Requêtes filtrées par user_id (RLS + filter explicit) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01A-01 | Spoofing | /api/revenue/stats, /api/revenue/products | mitigate | `getUser()` en tête, `apiUnauthorized()` si null |
| T-01A-02 | Information Disclosure | v_monthly_revenue (pas de RLS garanti sur vues) | mitigate | Filtrer explicitement `.eq('user_id', user.id)` même sur la vue |
| T-01A-03 | Information Disclosure | contracts (commission_amount = donnée sensible) | mitigate | `.eq('user_id', user.id)` sur chaque requête contracts |
| T-01A-04 | Tampering | Aucun endpoint write dans ce plan | accept | Plan en lecture seule, pas de POST/PUT/DELETE |
</threat_model>

<verification>
- `npx tsc --noEmit` passe sans erreur sur les 3 fichiers
- `npm run dev` puis ouverture /revenue : page se charge, valeurs en €, graphiques visibles
- Network tab : appels `/api/revenue/stats` et `/api/revenue/products` retournent 200 + JSON `{data, error: null}`
- Aucune chaîne `'payee'` dans le repo (`grep -r "'payee'" src/`)
</verification>

<success_criteria>
- DATA-01 : KPI "CA mois courant" affiche valeur réelle (ou 0 € si DB vide)
- DATA-02 : LineChart 12 mois rendu avec 12 points data alimentés par v_monthly_revenue
- DATA-03 : Section "Commissions par produit" affiche les types réellement présents en DB (pas de produits fictifs)
- Bug enum `'payee'` corrigé et vérifié absent
</success_criteria>

<output>
Après complétion, créer `.planning/phases/01-data-wiring/01A-SUMMARY.md` listant : routes créées/modifiées, bug enum corrigé, constantes supprimées, état des données réelles vs vides.
</output>
