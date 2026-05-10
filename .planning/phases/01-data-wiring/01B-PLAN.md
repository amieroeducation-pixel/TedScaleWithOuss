---
phase: 01-data-wiring
plan: 01B
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/api/clients/list/route.ts
  - src/app/api/clients/health/route.ts
  - src/app/(dashboard)/clients/page.tsx
autonomous: true
requirements: [DATA-04, DATA-05]
tags: [clients, supabase, health-alerts, data-wiring]

must_haves:
  truths:
    - "L'utilisateur voit la liste de ses clients actifs avec date de dernière interaction"
    - "L'utilisateur voit les alertes Client Health colorées selon jours sans contact"
    - "Aucun client fictif/hardcodé n'est affiché — la liste vient de Supabase"
  artifacts:
    - path: "src/app/api/clients/list/route.ts"
      provides: "Liste complète des clients (DATA-04) — clients JOIN prospects"
      exports: ["GET"]
    - path: "src/app/api/clients/health/route.ts"
      provides: "Alertes Client Health via RPC get_client_health_alerts (DATA-05)"
      exports: ["GET"]
    - path: "src/app/(dashboard)/clients/page.tsx"
      provides: "Page Clients branchée fetch + loading/error + état vide"
      contains: "fetch.*api/clients"
  key_links:
    - from: "src/app/(dashboard)/clients/page.tsx"
      to: "/api/clients/list"
      via: "fetch in useEffect"
      pattern: "fetch.*api/clients/list"
    - from: "src/app/(dashboard)/clients/page.tsx"
      to: "/api/clients/health"
      via: "fetch in useEffect"
      pattern: "fetch.*api/clients/health"
    - from: "src/app/api/clients/health/route.ts"
      to: "get_client_health_alerts"
      via: "supabase.rpc"
      pattern: "rpc.*get_client_health_alerts"
---

## Phase Goal

**As a** CGP indépendant, **I want to** voir la liste réelle de mes clients avec leur dernière interaction et les alertes santé clients (sans contact > seuil), **so that** je sais immédiatement qui rappeler avant qu'un client ne devienne dormant.

<objective>
Brancher la page `/clients` sur Supabase pour DATA-04 (liste complète clients) et DATA-05 (alertes santé via RPC `get_client_health_alerts`). Slice verticale : 2 routes API + page client avec rendu réel + état vide élégant.

Purpose: Donne à l'utilisateur la vue 360° de son portefeuille client, c'est la deuxième page critique du dashboard.
Output: 2 routes API + page Clients 100 % branchée.
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
@src/lib/theme.ts
@src/app/(dashboard)/clients/page.tsx

<interfaces>
DB schema (migration 001 + 003) — colonnes critiques:
- `clients(id, user_id, prospect_id, total_aum numeric, last_interaction_at timestamp, alert_threshold_days int default 90, notes text, created_at)`
- `prospects(id, user_id, full_name, profession, city, phone, email, pipeline_stage, tags text[])`
- RPC `get_client_health_alerts(p_user_id uuid)` retourne :
  `{ client_id uuid, prospect_id uuid, full_name text, last_interaction_at timestamp, days_without_contact int, alert_threshold_days int, total_aum numeric }`

Helpers: `apiSuccess<T>(data)`, `apiError(msg)`, `apiUnauthorized()` from `@/lib/api`.
Server client: `createSupabaseServerClient()` from `@/lib/supabase/server`.

Couleurs alerte (à dériver dans la page):
- vert (`C.green`)  : days_without_contact < alert_threshold * 0.5
- gold (`C.gold`)   : days_without_contact entre threshold*0.5 et threshold
- warn (`C.warn`)   : days_without_contact >= threshold (alerte active)
- rouge plus saturé : days_without_contact >= threshold * 1.5 (alerte critique)
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Créer /api/clients/list (DATA-04) — liste complète clients JOIN prospects</name>
  <files>src/app/api/clients/list/route.ts</files>
  <read_first>
    - src/app/api/revenue/stats/route.ts (pattern Route Handler)
    - src/app/api/prospects/route.ts (pattern .select avec relation)
    - src/lib/api.ts
    - .planning/phases/01-data-wiring/01-RESEARCH.md (Code Examples "Liste clients complète", Pitfall 6)
  </read_first>
  <action>
    Créer `src/app/api/clients/list/route.ts` (nouveau).

    Code exact :
    ```typescript
    import { NextRequest } from 'next/server'
    import { createSupabaseServerClient } from '@/lib/supabase/server'
    import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

    export type ClientListRow = {
      id: string
      prospect_id: string | null
      total_aum: number
      last_interaction_at: string | null
      alert_threshold_days: number
      notes: string | null
      created_at: string
      full_name: string
      profession: string | null
      city: string | null
      phone: string | null
      email: string | null
      pipeline_stage: string | null
      tags: string[]
      days_without_contact: number | null
    }

    export async function GET(_request: NextRequest) {
      const supabase = await createSupabaseServerClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return apiUnauthorized()

      const { data, error } = await supabase
        .from('clients')
        .select(`
          id, prospect_id, total_aum, last_interaction_at, alert_threshold_days, notes, created_at,
          prospects(full_name, profession, city, phone, email, pipeline_stage, tags)
        `)
        .eq('user_id', user.id)
        .order('last_interaction_at', { ascending: true, nullsFirst: true })

      if (error) return apiError(error.message)

      const now = Date.now()
      const rows: ClientListRow[] = (data ?? []).map((c: any) => {
        const p = Array.isArray(c.prospects) ? c.prospects[0] : c.prospects
        const last = c.last_interaction_at ? new Date(c.last_interaction_at).getTime() : null
        return {
          id: c.id,
          prospect_id: c.prospect_id,
          total_aum: Number(c.total_aum) || 0,
          last_interaction_at: c.last_interaction_at,
          alert_threshold_days: c.alert_threshold_days ?? 90,
          notes: c.notes,
          created_at: c.created_at,
          full_name: p?.full_name ?? 'Client sans nom',
          profession: p?.profession ?? null,
          city: p?.city ?? null,
          phone: p?.phone ?? null,
          email: p?.email ?? null,
          pipeline_stage: p?.pipeline_stage ?? null,
          tags: p?.tags ?? [],
          days_without_contact: last ? Math.floor((now - last) / 86400000) : null,
        }
      })

      const totalAum = rows.reduce((s, r) => s + r.total_aum, 0)

      return apiSuccess({ clients: rows, count: rows.length, totalAum })
    }
    ```
  </action>
  <verify>
    <automated>cd C:/Users/Ted/Documents/GitHub/TedScaleWithOuss; if (-not (Test-Path src/app/api/clients/list/route.ts)) { Write-Error "MISSING file" } ; npx tsc --noEmit -p tsconfig.json 2>&1 | Select-String "clients/list"</automated>
  </verify>
  <acceptance_criteria>
    - File `src/app/api/clients/list/route.ts` exists
    - `grep -c "from('clients')" src/app/api/clients/list/route.ts` returns >= 1
    - `grep -c "prospects(" src/app/api/clients/list/route.ts` returns >= 1
    - `grep -c "apiUnauthorized" src/app/api/clients/list/route.ts` returns >= 1
    - `grep -c "days_without_contact" src/app/api/clients/list/route.ts` returns >= 1
    - TypeScript compile sans erreur sur ce fichier
  </acceptance_criteria>
  <done>GET `/api/clients/list` retourne `{ clients: ClientListRow[], count, totalAum }` triés par dernière interaction (ordre asc, nulls first), avec `days_without_contact` calculé.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Créer /api/clients/health (DATA-05) — RPC get_client_health_alerts</name>
  <files>src/app/api/clients/health/route.ts</files>
  <read_first>
    - src/app/api/clients/list/route.ts (pattern frais juste créé)
    - .planning/phases/01-data-wiring/01-RESEARCH.md (Pattern 2 RPC, Pitfall 6)
  </read_first>
  <action>
    Créer `src/app/api/clients/health/route.ts`.

    Code exact :
    ```typescript
    import { NextRequest } from 'next/server'
    import { createSupabaseServerClient } from '@/lib/supabase/server'
    import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

    export type HealthAlert = {
      client_id: string
      prospect_id: string
      full_name: string
      last_interaction_at: string | null
      days_without_contact: number
      alert_threshold_days: number
      total_aum: number
      severity: 'warning' | 'critical'
    }

    export async function GET(_request: NextRequest) {
      const supabase = await createSupabaseServerClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return apiUnauthorized()

      const { data, error } = await supabase
        .rpc('get_client_health_alerts', { p_user_id: user.id })

      if (error) return apiError(error.message)

      const alerts: HealthAlert[] = (data ?? []).map((a: any) => ({
        client_id: a.client_id,
        prospect_id: a.prospect_id,
        full_name: a.full_name,
        last_interaction_at: a.last_interaction_at,
        days_without_contact: Number(a.days_without_contact) || 0,
        alert_threshold_days: Number(a.alert_threshold_days) || 90,
        total_aum: Number(a.total_aum) || 0,
        severity: (Number(a.days_without_contact) >= Number(a.alert_threshold_days) * 1.5)
          ? 'critical'
          : 'warning',
      }))

      // Tri : critical d'abord, puis par jours décroissants
      alerts.sort((x, y) => {
        if (x.severity !== y.severity) return x.severity === 'critical' ? -1 : 1
        return y.days_without_contact - x.days_without_contact
      })

      return apiSuccess({
        alerts,
        count: alerts.length,
        criticalCount: alerts.filter(a => a.severity === 'critical').length,
      })
    }
    ```
  </action>
  <verify>
    <automated>cd C:/Users/Ted/Documents/GitHub/TedScaleWithOuss; if (-not (Test-Path src/app/api/clients/health/route.ts)) { Write-Error "MISSING file" } ; npx tsc --noEmit -p tsconfig.json 2>&1 | Select-String "clients/health"</automated>
  </verify>
  <acceptance_criteria>
    - File `src/app/api/clients/health/route.ts` exists
    - `grep -c "rpc('get_client_health_alerts'" src/app/api/clients/health/route.ts` returns >= 1
    - `grep -c "p_user_id: user.id" src/app/api/clients/health/route.ts` returns >= 1
    - `grep -c "severity" src/app/api/clients/health/route.ts` returns >= 1
    - `grep -c "apiUnauthorized" src/app/api/clients/health/route.ts` returns >= 1
    - TypeScript compile sans erreur
  </acceptance_criteria>
  <done>GET `/api/clients/health` retourne `{ alerts: HealthAlert[], count, criticalCount }` triés critical first via RPC, severity calculée côté route.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Brancher /clients page sur les 2 routes — supprimer toute donnée mockée</name>
  <files>src/app/(dashboard)/clients/page.tsx</files>
  <read_first>
    - src/app/(dashboard)/clients/page.tsx (page actuelle ENTIÈRE — comprendre le mock à remplacer)
    - src/lib/theme.ts (palette C)
    - src/app/(dashboard)/revenue/page.tsx (référence pour pattern fetch + loading/error)
  </read_first>
  <action>
    Refondre `src/app/(dashboard)/clients/page.tsx` :

    1. Page `'use client'` avec `useState` + `useEffect`.
    2. Définir types côté client :
       ```typescript
       type ClientRow = {
         id: string
         full_name: string
         profession: string | null
         city: string | null
         phone: string | null
         email: string | null
         total_aum: number
         last_interaction_at: string | null
         days_without_contact: number | null
         alert_threshold_days: number
         pipeline_stage: string | null
         tags: string[]
       }
       type HealthAlert = {
         client_id: string
         full_name: string
         days_without_contact: number
         alert_threshold_days: number
         total_aum: number
         severity: 'warning' | 'critical'
       }
       type ClientsResp = { clients: ClientRow[]; count: number; totalAum: number }
       type HealthResp = { alerts: HealthAlert[]; count: number; criticalCount: number }
       ```
    3. Fetch les 2 routes via `Promise.all` dans useEffect, gérer `loading`, `error`.
    4. **SUPPRIMER toute donnée mockée** : grep la page actuelle pour identifier les arrays/objets statiques (CLIENTS_MOCK, ALERTES_MOCK, ou similaire) et les retirer. Conserver le design (header, layout grid, palette C).
    5. Layout recommandé (en respectant la structure existante autant que possible) :
       - **Header KPI** (3 cards) : "Clients actifs" (= clientsResp.count), "AUM total" (= clientsResp.totalAum.toLocaleString('fr-FR')+' €'), "Alertes santé" (= healthResp.count, badge rouge si criticalCount > 0).
       - **Section "🚨 Alertes Client Health"** (DATA-05) : liste des `healthResp.alerts`, chaque ligne avec :
         - nom (`C.textHi`)
         - jours sans contact (couleur selon severity : critical = `C.warn` rouge saturé, warning = `C.gold`)
         - seuil (`C.textLo`)
         - AUM
         - bouton "Contacter" (placeholder onClick — pas d'action en Phase 1)
       - **Section "📋 Tous les clients"** (DATA-04) : tableau ou liste des `clientsResp.clients`, colonnes : Nom, Profession, Ville, AUM, Dernière interaction (formaté `formatDistanceToNow` de date-fns OU calcul JS du nombre de jours), Pastille de couleur basée sur `days_without_contact` vs `alert_threshold_days`.
       - **État vide** : si `clientsResp.count === 0` afficher message "Aucun client encore. Convertis ton premier prospect depuis le Kanban CRM." avec lien vers `/crm`.
    6. États loading/error en haut du return (pattern identique à plan 01A).
    7. Helper local pour la pastille couleur :
       ```typescript
       function alertColor(days: number | null, threshold: number): string {
         if (days === null) return C.textLo
         if (days >= threshold * 1.5) return C.warn
         if (days >= threshold) return C.gold
         if (days >= threshold * 0.5) return C.indigo
         return C.green
       }
       ```
    8. Ne PAS introduire de nouveau lib (date-fns est dispo si besoin pour formatage relatif).
  </action>
  <verify>
    <automated>cd C:/Users/Ted/Documents/GitHub/TedScaleWithOuss; npx tsc --noEmit -p tsconfig.json 2>&1 | Select-String "clients/page" ; if (-not (Get-Content src/app/(dashboard)/clients/page.tsx | Select-String -Pattern "fetch.*api/clients/list")) { Write-Error "MISSING fetch list" } ; if (-not (Get-Content src/app/(dashboard)/clients/page.tsx | Select-String -Pattern "fetch.*api/clients/health")) { Write-Error "MISSING fetch health" } ; if (-not (Get-Content src/app/(dashboard)/clients/page.tsx | Select-String -Pattern "useState")) { Write-Error "MISSING useState" }</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "fetch.*api/clients/list" src/app/(dashboard)/clients/page.tsx` returns >= 1
    - `grep -c "fetch.*api/clients/health" src/app/(dashboard)/clients/page.tsx` returns >= 1
    - `grep -c "useState" src/app/(dashboard)/clients/page.tsx` returns >= 1
    - `grep -c "useEffect" src/app/(dashboard)/clients/page.tsx` returns >= 1
    - `grep -c "alertColor\|alert_threshold_days\|days_without_contact" src/app/(dashboard)/clients/page.tsx` returns >= 1
    - Aucune array hardcodée de noms français fictifs (vérification visuelle après build)
    - TypeScript compile sans erreur
  </acceptance_criteria>
  <done>La page /clients affiche dynamiquement les vrais clients + alertes santé colorées + état vide propre si DB vide. Aucun mock ne subsiste.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser → Route Handlers | Cookies SSR validés via getUser() |
| Route Handler → RPC SQL | RPC reçoit p_user_id explicite — vérifier qu'il vient bien de getUser() |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01B-01 | Spoofing | /api/clients/* | mitigate | `getUser()` + `apiUnauthorized()` |
| T-01B-02 | Information Disclosure | clients.total_aum (donnée patrimoniale sensible) | mitigate | `.eq('user_id', user.id)` sur clients, RLS Supabase comme défense en profondeur |
| T-01B-03 | Elevation of Privilege | RPC get_client_health_alerts(p_user_id) | mitigate | Toujours passer `user.id` issu de getUser(), jamais une valeur depuis la requête |
| T-01B-04 | Tampering | Plan en lecture seule | accept | Pas de POST/PUT/DELETE |
</threat_model>

<verification>
- `npx tsc --noEmit` passe
- `npm run dev`, ouvrir /clients : la page se charge, soit liste réelle soit état vide propre
- Network : 2 appels (`/api/clients/list`, `/api/clients/health`) retournent 200
</verification>

<success_criteria>
- DATA-04 : Liste clients réels visible OU état vide explicite (pas de mock)
- DATA-05 : Section alertes affiche les clients dépassant leur seuil avec couleur warn/critical
</success_criteria>

<output>
Après complétion, créer `.planning/phases/01-data-wiring/01B-SUMMARY.md` listant routes créées, types exportés, pattern alertColor, état des données.
</output>
