---
phase: 01-data-wiring
plan: 01D
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/api/analytics/pipeline/route.ts
  - src/app/api/analytics/closing/route.ts
  - src/app/(dashboard)/analytics/page.tsx
autonomous: true
requirements: [DATA-08, DATA-09]
tags: [analytics, pipeline, closing, recharts, supabase, data-wiring]

must_haves:
  truths:
    - "L'utilisateur voit les taux de conversion par etape pipeline depuis v_pipeline_conversion"
    - "L'utilisateur voit le taux de closing global et par produit en PieChart"
    - "Aucune metrique fictive ne subsiste sur la page Analytics"
  artifacts:
    - path: "src/app/api/analytics/pipeline/route.ts"
      provides: "Conversion rates pipeline (DATA-08) depuis v_pipeline_conversion"
      exports: ["GET"]
    - path: "src/app/api/analytics/closing/route.ts"
      provides: "Taux de closing global et par produit (DATA-09)"
      exports: ["GET"]
    - path: "src/app/(dashboard)/analytics/page.tsx"
      provides: "Page Analytics branchee fetch + recharts PieChart + loading/error"
      contains: "fetch.*api/analytics"
  key_links:
    - from: "src/app/(dashboard)/analytics/page.tsx"
      to: "/api/analytics/pipeline"
      via: "fetch in useEffect"
      pattern: "fetch.*api/analytics/pipeline"
    - from: "src/app/(dashboard)/analytics/page.tsx"
      to: "/api/analytics/closing"
      via: "fetch in useEffect"
      pattern: "fetch.*api/analytics/closing"
    - from: "src/app/api/analytics/pipeline/route.ts"
      to: "v_pipeline_conversion"
      via: "supabase.from('v_pipeline_conversion')"
      pattern: "v_pipeline_conversion"
---

## Phase Goal

**As a** CGP independant, **I want to** voir mes taux de conversion par etape pipeline et mon taux de closing global et par produit sur la page Analytics, **so that** je sais ou se trouvent mes points de friction commerciaux et quels produits convertissent le mieux.

<objective>
Brancher la page `/analytics` sur Supabase pour DATA-08 (taux conversion pipeline via vue `v_pipeline_conversion`) et DATA-09 (taux de closing global et par produit, PieChart Recharts). Slice verticale : 2 routes API + page client refondue avec graphiques reels.

Purpose: Quatrieme et derniere page critique du dashboard valide la fin du wiring data Phase 1.
Output: 2 routes API + page Analytics 100% branchee avec PieChart.
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
@src/app/(dashboard)/analytics/page.tsx

<interfaces>
DB schema critique:
- v_pipeline_conversion(user_id, pipeline_stage, total int, conversion_rate_pct numeric)
  Vue retournant pour chaque stade pipeline : nb total prospects + taux de conversion vers le stade suivant (lag entre stages)
- prospects(id, user_id, pipeline_stage enum('a_contacter','rdv1','rdv2','rdv3','converti','perdu'))
- contracts(id, user_id, prospect_id, financial_product_id, commission_amount)
- financial_products(id, type, name)

Pour DATA-09 closing par produit (pas de vue dediee) :
- Total prospects convertis par product_type = COUNT(contracts) groupe par financial_products.type
- Total prospects (tous status hors 'perdu' eventuellement) = COUNT(prospects)
- Taux de closing par produit = converti / total_prospects (ou converti / converti+perdu selon definition)

Helpers: apiSuccess/apiError/apiUnauthorized; createSupabaseServerClient.
Recharts: PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend deja installes.

Stage labels (a partir de l'enum pipeline_stage):
- a_contacter -> "A contacter"
- rdv1 -> "RDV 1"
- rdv2 -> "RDV 2"
- rdv3 -> "RDV 3"
- converti -> "Converti"
- perdu -> "Perdu"
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Creer /api/analytics/pipeline (DATA-08) depuis v_pipeline_conversion</name>
  <files>src/app/api/analytics/pipeline/route.ts</files>
  <read_first>
    - src/app/api/revenue/stats/route.ts (pattern Route Handler avec vue)
    - .planning/phases/01-data-wiring/01-RESEARCH.md (Pattern 3 vue SQL)
  </read_first>
  <action>
    Creer `src/app/api/analytics/pipeline/route.ts`.

    Implementation :
    - Imports : NextRequest, createSupabaseServerClient, apiSuccess/apiError/apiUnauthorized.
    - Auth : getUser() puis apiUnauthorized() si null.
    - Type exporte : PipelineStageRow = { stage: string; label: string; total: number; conversion_rate_pct: number; }
    - Constante STAGE_LABELS map enum -> label francais (cf interfaces).
    - Constante STAGE_ORDER = ['a_contacter','rdv1','rdv2','rdv3','converti','perdu'] pour ordonner.

    Requete :
    supabase.from('v_pipeline_conversion').select('pipeline_stage, total, conversion_rate_pct').eq('user_id', user.id)

    Si error : apiError(error.message).

    Mapping :
    rows = (data ?? []).map(r => ({
      stage: r.pipeline_stage,
      label: STAGE_LABELS[r.pipeline_stage] ?? r.pipeline_stage,
      total: Number(r.total) || 0,
      conversion_rate_pct: Number(r.conversion_rate_pct) || 0,
    }))

    Tri :
    rows.sort((a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage))

    Si la vue ne renvoie pas un stade, l'inclure avec total: 0 et conversion_rate_pct: 0 :
    const present = new Set(rows.map(r => r.stage))
    for (const stage of STAGE_ORDER) {
      if (!present.has(stage)) {
        rows.push({ stage, label: STAGE_LABELS[stage] ?? stage, total: 0, conversion_rate_pct: 0 })
      }
    }
    rows.sort(...) // re-sort apres ajout

    Calculs supplementaires :
    - totalProspects = rows.reduce((s, r) => s + r.total, 0)
    - convertedCount = rows.find(r => r.stage === 'converti')?.total ?? 0
    - lostCount = rows.find(r => r.stage === 'perdu')?.total ?? 0

    Retour : apiSuccess({ stages: rows, totalProspects, convertedCount, lostCount }).
  </action>
  <verify>
    <automated>
      if (-not (Test-Path "C:/Users/Ted/Documents/GitHub/TedScaleWithOuss/src/app/api/analytics/pipeline/route.ts")) { Write-Error "MISSING file: src/app/api/analytics/pipeline/route.ts"; exit 1 }
      cd C:/Users/Ted/Documents/GitHub/TedScaleWithOuss; npx tsc --noEmit -p tsconfig.json 2>&1 | Select-String "analytics/pipeline"
    </automated>
  </verify>
  <acceptance_criteria>
    - File `src/app/api/analytics/pipeline/route.ts` exists
    - `grep -c "v_pipeline_conversion" src/app/api/analytics/pipeline/route.ts` returns >= 1
    - `grep -c "STAGE_LABELS\|STAGE_ORDER" src/app/api/analytics/pipeline/route.ts` returns >= 1
    - `grep -c "apiUnauthorized" src/app/api/analytics/pipeline/route.ts` returns >= 1
    - `grep -c "conversion_rate_pct" src/app/api/analytics/pipeline/route.ts` returns >= 2
    - TypeScript compile sans erreur
  </acceptance_criteria>
  <done>GET `/api/analytics/pipeline` retourne `{ stages, totalProspects, convertedCount, lostCount }` avec tous les stades du pipeline (meme si total = 0).</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Creer /api/analytics/closing (DATA-09) taux closing global et par produit</name>
  <files>src/app/api/analytics/closing/route.ts</files>
  <read_first>
    - src/app/api/analytics/pipeline/route.ts (pattern frais juste cree)
    - .planning/phases/01-data-wiring/01-RESEARCH.md
  </read_first>
  <action>
    Creer `src/app/api/analytics/closing/route.ts`.

    Implementation :
    - Imports : NextRequest, createSupabaseServerClient, apiSuccess/apiError/apiUnauthorized.
    - Auth : getUser() puis apiUnauthorized().
    - Constantes PRODUCT_LABELS et PRODUCT_COLORS identiques a celles de /api/revenue/products (dupliquer ici pour decouplage modules).
    - Type exporte : ClosingByProductRow = { type: string; label: string; converted: number; total: number; rate_pct: number; color: string; }

    NOTE DATA-09 v1 approximation (decision explicite) :
    rate_pct par produit = part de chaque type de produit dans les conversions totales (proxy du mix produit).
    Ce n'est PAS un taux de closing strict (converti/total_prospects par type) car il n'existe pas de lien
    direct prospect <-> produit dans le schema actuel (le produit est sur le contrat, pas sur le prospect).
    Un taux strict necessitera une jointure prospects <-> financial_products via contracts, qui necessite
    une vue SQL dediee. Reporte en v2.
    Ajouter ce commentaire verbatim dans le code source de la route.

    Logique :
    1. Compter total prospects (hors 'perdu' optionnel : decision = inclure tous):
       const { count: totalProspects } = await supabase.from('prospects').select('*', { count: 'exact', head: true }).eq('user_id', user.id)

    2. Compter prospects 'converti' :
       const { count: convertedTotal } = await supabase.from('prospects').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('pipeline_stage', 'converti')

    3. Compter 'perdu' :
       const { count: lostTotal } = await supabase.from('prospects').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('pipeline_stage', 'perdu')

    4. Closing global = converted / (converted + lost) (denominateur = "decisions prises") :
       const decisions = (convertedTotal ?? 0) + (lostTotal ?? 0)
       const globalClosingRate = decisions > 0 ? Math.round(((convertedTotal ?? 0) / decisions) * 100) : 0

    5. Closing par produit : pour chaque type de financial_product, count contracts (converti = il y a un contrat).
       const { data: contracts, error } = await supabase.from('contracts').select('financial_products(type)').eq('user_id', user.id)
       if (error) return apiError(error.message)

       Aggreger en JS par type pour obtenir converted par produit :
       const byType: Record<string, number> = {}
       for (const c of (contracts ?? [])) {
         const fp = c.financial_products as any
         const type = (Array.isArray(fp) ? fp[0]?.type : fp?.type) ?? 'autre'
         byType[type] = (byType[type] || 0) + 1
       }

    6. Pour le denominateur par produit, on n'a pas de lien direct prospect <-> produit (le produit est sur le contrat). Definition pragmatique pour v1 :
       rate_pct par produit = converted_for_type / convertedTotal * 100 (poids relatif du produit dans les conversions).
       NOTE EXPLICITE dans le commentaire du code : "v1 : rate_pct = part de chaque produit dans les conversions totales (proxy de mix produit). Une definition plus stricte (par cohorte de prospects) necessitera une vue SQL dediee plus tard."

       const totalConverted = Object.values(byType).reduce((a, b) => a + b, 0) || 1
       const byProduct: ClosingByProductRow[] = Object.entries(byType).map(([type, converted]) => ({
         type,
         label: PRODUCT_LABELS[type] ?? type,
         converted,
         total: totalConverted,
         rate_pct: Math.round((converted / totalConverted) * 100),
         color: PRODUCT_COLORS[type] ?? '#6b7280',
       })).sort((a, b) => b.converted - a.converted)

    7. Retour :
       apiSuccess({
         globalClosingRate,
         convertedTotal: convertedTotal ?? 0,
         lostTotal: lostTotal ?? 0,
         totalProspects: totalProspects ?? 0,
         byProduct,
       })
  </action>
  <verify>
    <automated>
      if (-not (Test-Path "C:/Users/Ted/Documents/GitHub/TedScaleWithOuss/src/app/api/analytics/closing/route.ts")) { Write-Error "MISSING file: src/app/api/analytics/closing/route.ts"; exit 1 }
      cd C:/Users/Ted/Documents/GitHub/TedScaleWithOuss; npx tsc --noEmit -p tsconfig.json 2>&1 | Select-String "analytics/closing"
    </automated>
  </verify>
  <acceptance_criteria>
    - File `src/app/api/analytics/closing/route.ts` exists
    - `grep -c "globalClosingRate" src/app/api/analytics/closing/route.ts` returns >= 1
    - `grep -c "byProduct" src/app/api/analytics/closing/route.ts` returns >= 1
    - `grep -c "'converti'" src/app/api/analytics/closing/route.ts` returns >= 1
    - `grep -c "'perdu'" src/app/api/analytics/closing/route.ts` returns >= 1
    - `grep -c "PRODUCT_LABELS" src/app/api/analytics/closing/route.ts` returns >= 1
    - `grep -c "apiUnauthorized" src/app/api/analytics/closing/route.ts` returns >= 1
    - TypeScript compile sans erreur
  </acceptance_criteria>
  <done>GET `/api/analytics/closing` retourne `{ globalClosingRate, convertedTotal, lostTotal, totalProspects, byProduct[] }`. Note "v1 : rate_pct = part dans conversions" presente en commentaire.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Brancher /analytics page sur les 2 routes + ajouter PieChart Recharts</name>
  <files>src/app/(dashboard)/analytics/page.tsx</files>
  <read_first>
    - src/app/(dashboard)/analytics/page.tsx (page actuelle ENTIERE)
    - src/app/(dashboard)/revenue/page.tsx (pattern Recharts + LineTooltip + theme C)
    - src/lib/theme.ts
  </read_first>
  <action>
    Refondre `src/app/(dashboard)/analytics/page.tsx` :

    1. Page reste `'use client'`.
    2. Imports : useState, useEffect from react ; PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend from recharts ; C from @/lib/theme.
    3. Definir types client :
       type StageRow = { stage: string; label: string; total: number; conversion_rate_pct: number }
       type PipelineResp = { stages: StageRow[]; totalProspects: number; convertedCount: number; lostCount: number }
       type ProductRow = { type: string; label: string; converted: number; total: number; rate_pct: number; color: string }
       type ClosingResp = { globalClosingRate: number; convertedTotal: number; lostTotal: number; totalProspects: number; byProduct: ProductRow[] }

    4. States : pipeline (PipelineResp | null), closing (ClosingResp | null), loading, error.

    5. useEffect : Promise.all([fetch('/api/analytics/pipeline'), fetch('/api/analytics/closing')]) puis parse json puis setPipeline/setClosing. Loading = false dans finally. Si une des reponses a error, setError.

    6. SUPPRIMER toute donnee mockee de la page actuelle (constantes type CONVERSION_MOCK, CLOSING_MOCK, KPIS_MOCK ou autres) sauf si purement decoratif (texte d'aide).

    7. Layout :
       - Header : "Analytics" (style Oswald uppercase, sous-titre "Conversion pipeline & taux de closing").
       - Loading/error states identiques au pattern 01A.

       - Section 1 KPI Cards (4) :
         - "Total prospects" = closing.totalProspects
         - "Convertis" = closing.convertedTotal (couleur C.green)
         - "Perdus" = closing.lostTotal (couleur C.warn)
         - "Taux de closing global" = `${closing.globalClosingRate}%` (couleur C.gold) avec sous-texte "convertis / (convertis + perdus)"

       - Section 2 "Conversion par etape pipeline" (DATA-08) :
         Card C.surface1 / border C.line.
         Pour chaque pipeline.stages : barre horizontale HTML (style identique aux barres de /revenue) :
         - label (12px C.textHi)
         - total a droite (10px C.textLo)
         - barre 24px haut, fond C.surface3, fill = couleur stage avec width = (total / Math.max(...stages.map(s=>s.total), 1)) * 100 %
         - badge "{conversion_rate_pct}%" a droite de la barre
         Couleurs par stage : a_contacter -> C.indigo, rdv1 -> C.cyan, rdv2 -> C.gold, rdv3 -> '#9a4a8a', converti -> C.green, perdu -> C.warn (definir dans une const STAGE_COLORS locale).

       - Section 3 "Closing par produit" (DATA-09) PieChart :
         Card C.surface1.
         Header "Closing par produit" + sous-texte "Mix des conversions par produit (v1)".
         <ResponsiveContainer width="100%" height={280}>
           <PieChart>
             <Pie data={closing.byProduct} dataKey="converted" nameKey="label" cx="50%" cy="50%" outerRadius={100} innerRadius={50}>
               {closing.byProduct.map((p, i) => <Cell key={p.type} fill={p.color} />)}
             </Pie>
             <Tooltip content={<ClosingTooltip />} />
             <Legend />
           </PieChart>
         </ResponsiveContainer>
         Definir un ClosingTooltip local (analogue a LineTooltip de revenue/page.tsx) qui affiche label + converted + rate_pct sur fond C.surface2.
         Etat vide : si byProduct.length === 0 -> message "Aucune conversion enregistree."

    8. Ne PAS introduire de nouvelle dependance.

    9. Conserver le theme dark/gold partout reutiliser C.* sans inventer de couleurs.
  </action>
  <verify>
    <automated>
      if (-not (Test-Path "C:/Users/Ted/Documents/GitHub/TedScaleWithOuss/src/app/(dashboard)/analytics/page.tsx")) { Write-Error "MISSING file: src/app/(dashboard)/analytics/page.tsx"; exit 1 }
      cd C:/Users/Ted/Documents/GitHub/TedScaleWithOuss; npx tsc --noEmit -p tsconfig.json 2>&1 | Select-String "analytics/page"
    </automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "fetch.*api/analytics/pipeline" src/app/(dashboard)/analytics/page.tsx` returns >= 1
    - `grep -c "fetch.*api/analytics/closing" src/app/(dashboard)/analytics/page.tsx` returns >= 1
    - `grep -c "PieChart" src/app/(dashboard)/analytics/page.tsx` returns >= 1
    - `grep -c "useState\|useEffect" src/app/(dashboard)/analytics/page.tsx` returns >= 2
    - `grep -c "globalClosingRate" src/app/(dashboard)/analytics/page.tsx` returns >= 1
    - `grep -c "conversion_rate_pct" src/app/(dashboard)/analytics/page.tsx` returns >= 1
    - TypeScript compile sans erreur
    - Verification manuelle apres `npm run dev` : si DB vide -> 0% partout + PieChart absent ou message "Aucune conversion"
  </acceptance_criteria>
  <done>La page /analytics affiche dynamiquement KPI conversion + barres par stage + PieChart closing par produit, alimentees par les 2 routes. Loading/error/etat vide geres.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser -> Route Handlers | Cookies SSR via getUser() |
| Route Handler -> v_pipeline_conversion | Filtre user_id explicite (vue sans RLS garantie) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01D-01 | Spoofing | /api/analytics/* | mitigate | getUser() + apiUnauthorized() |
| T-01D-02 | Information Disclosure | v_pipeline_conversion (vue, RLS non garantie) | mitigate | .eq('user_id', user.id) explicite meme sur la vue |
| T-01D-03 | Information Disclosure | contracts (revenu sensible) | mitigate | .eq('user_id', user.id) sur chaque requete contracts |
| T-01D-04 | Tampering | Plan en lecture seule | accept | Pas de POST/PUT/DELETE |
</threat_model>

<verification>
- `npx tsc --noEmit` passe
- `npm run dev` puis ouverture /analytics : page se charge, sections rendues
- Network : 2 appels analytics retournent 200
- Si DB vide : KPI affichent 0, sections affichent etats vides
</verification>

<success_criteria>
- DATA-08 : Section conversion pipeline affiche les stages avec total + taux conversion depuis v_pipeline_conversion
- DATA-09 : PieChart closing par produit visible avec types reels de financial_products
- Aucune metrique fictive type "67% closing" hardcodee
</success_criteria>

<output>
Apres completion, creer `.planning/phases/01-data-wiring/01D-SUMMARY.md` listant : 2 routes creees, page Analytics refondue, decision documentee sur la definition v1 du rate_pct par produit.
</output>
