# Finalisation Dashboard — Performeur Commercial

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre le dashboard 100% opérationnel pour un top performeur commercial CGP — source de vérité unique en DB, déduplication intelligente, scoring dynamique, zéro maquette.

**Architecture:** Source de vérité = PostgreSQL (Supabase). Chaque action commerciale (appel, RDV, contact) génère une `interaction`. Les KPIs sont agrégés à la volée depuis les tables existantes. Le scoring pondère profession × zone × pipeline × recency.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase (PostgreSQL + Auth SSR), Recharts, date-fns

---

## Prérequis : Migration SQL

Exécuter dans Supabase SQL Editor AVANT de commencer les tâches :

```sql
-- 018_dashboard_final.sql

-- Colonnes manquantes sur user_settings
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS scoring_grids jsonb DEFAULT '{}';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS daily_targets jsonb DEFAULT '{"contacts":10,"calls":20,"rdv1":5,"rdv2":3}';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS completed_videos text[] DEFAULT '{}';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS monthly_intensity jsonb DEFAULT '{}';

-- Flag "ne plus contacter" sur prospects
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS do_not_contact boolean NOT NULL DEFAULT false;

-- Lien calling_session_contacts → prospects
ALTER TABLE calling_session_contacts ADD COLUMN IF NOT EXISTS prospect_id uuid REFERENCES prospects(id);

-- Historique recherches
CREATE TABLE IF NOT EXISTS search_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  search_type text NOT NULL DEFAULT 'tns',
  metier text NOT NULL,
  ville text NOT NULL DEFAULT '',
  departement text NOT NULL DEFAULT '',
  results_count integer NOT NULL DEFAULT 0,
  searched_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id);
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own search_history" ON search_history FOR ALL USING (auth.uid() = user_id);

-- Cache insights IA
CREATE TABLE IF NOT EXISTS daily_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  content text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);
ALTER TABLE daily_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own daily_insights" ON daily_insights FOR ALL USING (auth.uid() = user_id);
```

---

## Task 1: Persistence daily_kpis — GET API + compteurs DB

**Files:**
- Modify: `src/app/api/today/kpis/route.ts`
- Modify: `src/app/(dashboard)/today/page.tsx` (lignes 714-733)

- [ ] **Step 1: Ajouter GET à l'API kpis**

```typescript
// src/app/api/today/kpis/route.ts — ajouter AVANT le POST existant
import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function GET(_request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const today = new Date().toISOString().split('T')[0]

  const [kpiRes, settingsRes] = await Promise.all([
    supabase
      .from('daily_kpis')
      .select('contacts, calls, rdv1, rdv2, blocks')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle(),
    supabase
      .from('user_settings')
      .select('daily_targets')
      .eq('id', user.id)
      .maybeSingle(),
  ])

  const kpi = kpiRes.data ?? { contacts: 0, calls: 0, rdv1: 0, rdv2: 0, blocks: 0 }
  const targets = settingsRes.data?.daily_targets ?? { contacts: 10, calls: 20, rdv1: 5, rdv2: 3 }

  return apiSuccess({ kpi, targets })
}
```

- [ ] **Step 2: Modifier /today pour charger depuis DB au mount**

Dans `src/app/(dashboard)/today/page.tsx`, remplacer le bloc `loadCounters` (lignes ~714-733) :

```typescript
// Remplacer loadCounters localStorage par fetch DB
useEffect(() => {
  fetch('/api/today/kpis')
    .then(r => r.json())
    .then(j => {
      if (j.data?.kpi) {
        setContacts(j.data.kpi.contacts)
        setCalls(j.data.kpi.calls)
        setRdv1(j.data.kpi.rdv1)
        setRdv2(j.data.kpi.rdv2)
        setBlocksCompleted(j.data.kpi.blocks)
      }
      if (j.data?.targets) {
        setTargets(j.data.targets)
        setTargetForm(j.data.targets)
      }
    })
    .catch(() => {
      // Fallback localStorage
      const c = loadCounters()
      setContacts(c.contacts); setCalls(c.calls); setRdv1(c.rdv1); setRdv2(c.rdv2)
    })
}, [])
```

- [ ] **Step 3: Debounce la sauvegarde en DB à chaque incrément**

Ajouter après les state declarations des compteurs :

```typescript
const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

useEffect(() => {
  // Debounce 2s — sauvegarde DB après chaque changement
  if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
  saveTimeoutRef.current = setTimeout(() => {
    fetch('/api/today/kpis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contacts, calls, rdv1, rdv2, blocks: blocksCompleted }),
    }).catch(() => {})
  }, 2000)
  // Garder localStorage comme cache local
  try { localStorage.setItem(COUNTERS_KEY, JSON.stringify({ contacts, calls, rdv1, rdv2 })) } catch {}
}, [contacts, calls, rdv1, rdv2, blocksCompleted])
```

- [ ] **Step 4: Vérifier le build**

Run: `npm run build`
Expected: Build réussi sans erreurs

- [ ] **Step 5: Commit**

```bash
git add src/app/api/today/kpis/route.ts src/app/(dashboard)/today/page.tsx
git commit -m "feat(today): persist KPI counters to DB with debounce, add GET endpoint"
```

---

## Task 2: Calling Sessions → interactions

**Files:**
- Modify: `src/app/api/calling-sessions/[id]/contacts/[contactId]/route.ts`
- Modify: `src/components/calling/SessionContactCard.tsx`

- [ ] **Step 1: Modifier l'API contacts pour créer des interactions**

```typescript
// src/app/api/calling-sessions/[id]/contacts/[contactId]/route.ts
import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const { contactId } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let body: {
    statut_appel?: 'a_appeler' | 'contacte' | 'pas_repondu' | 'pas_interesse' | 'chaud'
    note?: string
    rappel_date?: string | null
    added_to_crm?: boolean
    called_at?: string
  }
  try { body = await request.json() } catch { return apiError('Corps invalide', 400) }

  const { data, error } = await supabase.from('calling_session_contacts')
    .update(body)
    .eq('id', contactId).eq('user_id', user.id)
    .select('*, prospect_id')
    .single()
  if (error) return apiError(error.message, 500)

  // Si l'appel a été passé ET le contact est lié à un prospect → créer interaction
  const callStatuses = ['contacte', 'pas_repondu', 'pas_interesse', 'chaud']
  if (body.statut_appel && callStatuses.includes(body.statut_appel) && data.prospect_id) {
    await supabase.from('interactions').insert({
      user_id: user.id,
      prospect_id: data.prospect_id,
      type: 'appel',
      notes: body.note || `Appel session — ${body.statut_appel}`,
      is_honored: body.statut_appel !== 'pas_repondu',
      occurred_at: new Date().toISOString(),
    })
    await supabase.from('prospects').update({
      last_contact_at: new Date().toISOString(),
    }).eq('id', data.prospect_id).eq('user_id', user.id)
  }

  // Si ajouté au CRM → créer le prospect et lier
  if (body.added_to_crm && !data.prospect_id) {
    const { data: newProspect } = await supabase.from('prospects').insert({
      user_id: user.id,
      full_name: data.nom,
      phone: data.telephone,
      profession: data.metier,
      city: data.ville,
      source: data.source === 'tns' ? 'tns' : 'chefs_entreprise',
      pipeline_stage: 'a_contacter',
    }).select('id').single()

    if (newProspect) {
      await supabase.from('calling_session_contacts')
        .update({ prospect_id: newProspect.id })
        .eq('id', contactId)
    }
  }

  return apiSuccess(data)
}
```

- [ ] **Step 2: Vérifier le build**

Run: `npm run build`
Expected: Build réussi

- [ ] **Step 3: Commit**

```bash
git add src/app/api/calling-sessions/[id]/contacts/[contactId]/route.ts
git commit -m "feat(calling): create interaction on call status change, link prospect on CRM add"
```

---

## Task 3: Page /donnees — API d'agrégation + wiring

**Files:**
- Create: `src/app/api/donnees/stats/route.ts`
- Modify: `src/app/(dashboard)/donnees/page.tsx`

- [ ] **Step 1: Créer l'API d'agrégation**

```typescript
// src/app/api/donnees/stats/route.ts
import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'
import { startOfMonth, endOfMonth, eachDayOfInterval, format } from 'date-fns'

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const dateParam = request.nextUrl.searchParams.get('date') ?? new Date().toISOString().split('T')[0]
  const refDate = new Date(dateParam)
  const monthStart = format(startOfMonth(refDate), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(refDate), 'yyyy-MM-dd')
  const monthKey = format(refDate, 'yyyy-MM')

  const [kpisRes, interactionsRes, contractsRes, prospectsRes, objectivesRes, settingsRes] = await Promise.all([
    supabase.from('daily_kpis')
      .select('date, contacts, calls, rdv1, rdv2, blocks')
      .eq('user_id', user.id)
      .gte('date', monthStart).lte('date', monthEnd),
    supabase.from('interactions')
      .select('type, occurred_at')
      .eq('user_id', user.id)
      .gte('occurred_at', `${monthStart}T00:00:00`)
      .lte('occurred_at', `${monthEnd}T23:59:59`),
    supabase.from('contracts')
      .select('signed_at, commission_amount')
      .eq('user_id', user.id)
      .gte('signed_at', monthStart).lte('signed_at', monthEnd),
    supabase.from('prospects')
      .select('created_at')
      .eq('user_id', user.id)
      .gte('created_at', `${monthStart}T00:00:00`)
      .lte('created_at', `${monthEnd}T23:59:59`),
    supabase.from('revenue_objectives')
      .select('amount')
      .eq('user_id', user.id)
      .eq('year', refDate.getFullYear())
      .eq('month', refDate.getMonth() + 1)
      .is('product_type', null)
      .maybeSingle(),
    supabase.from('user_settings')
      .select('calls_per_day_target, rdv_per_week_target, ca_monthly_target, blocks_per_day_target')
      .eq('id', user.id)
      .maybeSingle(),
  ])

  const days = eachDayOfInterval({ start: startOfMonth(refDate), end: endOfMonth(refDate) })
  const interactions = interactionsRes.data ?? []
  const contracts = contractsRes.data ?? []
  const prospects = prospectsRes.data ?? []
  const kpis = kpisRes.data ?? []

  const daily = days.map(d => {
    const dk = format(d, 'yyyy-MM-dd')
    const kpi = kpis.find(k => k.date === dk)
    const dayInteractions = interactions.filter(i => i.occurred_at.startsWith(dk))
    const dayContracts = contracts.filter(c => c.signed_at === dk)
    const dayProspects = prospects.filter(p => p.created_at.startsWith(dk))

    const appelsFromInteractions = dayInteractions.filter(i => i.type === 'appel').length
    const rdv1FromInteractions = dayInteractions.filter(i => i.type === 'rdv1').length
    const rdv2FromInteractions = dayInteractions.filter(i => i.type === 'rdv2').length
    const rdv3FromInteractions = dayInteractions.filter(i => i.type === 'rdv3').length

    return {
      date: dk,
      appels: Math.max(kpi?.calls ?? 0, appelsFromInteractions),
      prospects: dayProspects.length,
      rdv_r1: Math.max(kpi?.rdv1 ?? 0, rdv1FromInteractions),
      rdv_r2: Math.max(kpi?.rdv2 ?? 0, rdv2FromInteractions),
      rdv_r3: rdv3FromInteractions,
      blocs: kpi?.blocks ?? 0,
      relances: dayInteractions.filter(i => ['email', 'whatsapp', 'sms'].includes(i.type)).length,
      contrats: dayContracts.length,
      ca: dayContracts.reduce((sum, c) => sum + Number(c.commission_amount ?? 0), 0),
    }
  })

  const settings = settingsRes.data
  const workDays = 22
  const objectives = {
    mois: monthKey,
    obj_appels: (settings?.calls_per_day_target ?? 20) * workDays,
    real_appels: daily.reduce((s, d) => s + d.appels, 0),
    obj_rdv: (settings?.rdv_per_week_target ?? 5) * 4,
    real_rdv: daily.reduce((s, d) => s + d.rdv_r1 + d.rdv_r2 + d.rdv_r3, 0),
    obj_ca: Number(objectivesRes.data?.amount ?? settings?.ca_monthly_target ?? 15000),
    real_ca: daily.reduce((s, d) => s + d.ca, 0),
    obj_prospects: 100,
    real_prospects: daily.reduce((s, d) => s + d.prospects, 0),
    obj_contrats: 5,
    real_contrats: daily.reduce((s, d) => s + d.contrats, 0),
  }

  return apiSuccess({ daily, objectives })
}
```

- [ ] **Step 2: Modifier la page /donnees pour consommer l'API**

Dans `src/app/(dashboard)/donnees/page.tsx` :
- Supprimer `const DEMO_DATA` et `const OBJECTIVES`
- Ajouter state + fetch :

```typescript
const [daily, setDaily] = useState<DailyEntry[]>([])
const [objectives, setObjectives] = useState<MonthlyObjective | null>(null)
const [loading, setLoading] = useState(true)
const [monthOffset, setMonthOffset] = useState(0)

useEffect(() => {
  setLoading(true)
  const d = new Date()
  d.setMonth(d.getMonth() + monthOffset)
  const dateParam = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  fetch(`/api/donnees/stats?date=${dateParam}`)
    .then(r => r.json())
    .then(j => {
      if (j.data) {
        setDaily(j.data.daily)
        setObjectives(j.data.objectives)
      }
    })
    .catch(() => {})
    .finally(() => setLoading(false))
}, [monthOffset])
```

- Remplacer les références à `DEMO_DATA` par `daily`
- Remplacer les références à `OBJECTIVES` par `[objectives]` (tableau d'un seul mois)
- Ajouter navigation mois : boutons ← → qui modifient `monthOffset`

- [ ] **Step 3: Vérifier le build**

Run: `npm run build`
Expected: Build réussi

- [ ] **Step 4: Commit**

```bash
git add src/app/api/donnees/stats/route.ts src/app/(dashboard)/donnees/page.tsx
git commit -m "feat(donnees): real data aggregation from interactions+contracts+daily_kpis"
```

---

## Task 4: TNS — Déduplication serveur + scoring profession/zone

**Files:**
- Modify: `src/app/api/prospection/tns/route.ts`

- [ ] **Step 1: Ajouter filtrage serveur après dédoublonnage interne**

Dans `src/app/api/prospection/tns/route.ts`, après la boucle de dédoublonnage (ligne ~433), AVANT le `return` :

```typescript
  // ── Filtrage des prospects déjà en base ──
  const { data: existingProspects } = await supabase
    .from('prospects')
    .select('phone')
    .eq('user_id', user.id)
    .not('phone', 'is', null)

  const { data: existingContacts } = await supabase
    .from('calling_session_contacts')
    .select('telephone')
    .eq('user_id', user.id)

  const { data: excludedProspects } = await supabase
    .from('prospects')
    .select('phone')
    .eq('user_id', user.id)
    .or('pipeline_stage.eq.perdu,do_not_contact.eq.true')

  const existingPhones = new Set<string>()
  ;(existingProspects ?? []).forEach(p => { if (p.phone) existingPhones.add(p.phone.replace(/[\s.\-]/g, '')) })
  ;(existingContacts ?? []).forEach(c => { if (c.telephone) existingPhones.add(c.telephone.replace(/[\s.\-]/g, '')) })

  const excludedPhones = new Set<string>()
  ;(excludedProspects ?? []).forEach(p => { if (p.phone) excludedPhones.add(p.phone.replace(/[\s.\-]/g, '')) })

  const beforeFilter = merged.length
  const filtered2 = merged.filter(p => {
    const norm = p.telephone.replace(/[\s.\-]/g, '')
    return !excludedPhones.has(norm)
  })

  const withFlag = filtered2.map(p => {
    const norm = p.telephone.replace(/[\s.\-]/g, '')
    return { ...p, already_in_crm: existingPhones.has(norm) }
  })

  const excludedCount = beforeFilter - filtered2.length
  const alreadyInCrmCount = withFlag.filter(p => p.already_in_crm).length
```

- [ ] **Step 2: Remplacer le score random par scoring profession + zone**

Remplacer `score: Math.round((60 + Math.random() * 35)) / 100` (apparaît 2 fois) par :

```typescript
// En haut du fichier, après les imports
const PROFESSION_SCORES: Record<string, number> = {
  'Chirurgien': 95, 'Radiologue': 93, 'Cardiologue': 92, 'Anesthésiste': 91,
  'Dermatologue': 90, 'Ophtalmologue': 90, 'Chirurgien dentiste': 88,
  'Pharmacien': 85, 'Gynécologue': 85, 'Neurologue': 85, 'ORL': 84,
  'Notaire': 82, 'Expert comptable': 82, 'Médecin généraliste': 80,
  'Avocat': 75, 'Agent immobilier': 74, 'Architecte': 72,
  'Kinésithérapeute': 70, 'Vétérinaire': 68, 'Ostéopathe': 65,
  'Psychologue': 63, 'Infirmier libéral': 60, 'Diététicien': 58,
}

function calcZoneBonus(ville: string): number {
  const v = ville.toLowerCase().normalize('NFD').replace(/\p{Mn}/gu, '')
  if (/paris\s*[1-8]e?/.test(v) || v.includes('neuilly')) return 10
  if (/paris\s*(9|1[0-6])e?/.test(v) || v.includes('boulogne') || v.includes('levallois')) return 7
  if (v.includes('paris') || v.includes('vincennes') || v.includes('versailles') || v.includes('saint-germain')) return 5
  if (v.includes('92') || v.includes('hauts-de-seine') || v.includes('rueil') || v.includes('issy')) return 3
  return 0
}

function calcScore(metier: string, ville: string): number {
  const base = PROFESSION_SCORES[metier] ?? 65
  const bonus = calcZoneBonus(ville)
  return Math.min(base + bonus, 100) / 100
}
```

Puis remplacer chaque `score: Math.round(...)` par `score: calcScore(realMetier, villeDisplay)` (canal DataGouv) et `score: calcScore(metierLabel, villeExtracted)` (canal Google).

- [ ] **Step 3: Modifier le return**

```typescript
  // Log recherche
  await supabase.from('search_history').insert({
    user_id: user.id,
    search_type: 'tns',
    metier: config.label,
    ville,
    departement,
    results_count: withFlag.length,
  }).then(() => {}) // fire and forget

  const prospects = withFlag
    .filter(p => !p.already_in_crm) // par défaut on exclut les "déjà en CRM"
    .slice(0, Math.max(parseInt(String(limite)), 1))
    .map((p, i) => ({ ...p, id: i + 1 }))

  return apiSuccess({
    prospects,
    total: withFlag.filter(p => !p.already_in_crm).length,
    excluded_already_in_crm: alreadyInCrmCount,
    excluded_lost: excludedCount,
  })
```

- [ ] **Step 4: Vérifier le build**

Run: `npm run build`
Expected: Build réussi

- [ ] **Step 5: Commit**

```bash
git add src/app/api/prospection/tns/route.ts
git commit -m "feat(tns): server-side dedup, exclude lost prospects, profession+zone scoring"
```

---

## Task 5: Dashboard weekly — targets depuis user_settings

**Files:**
- Modify: `src/app/api/dashboard/weekly/route.ts`

- [ ] **Step 1: Lire les targets depuis user_settings**

Remplacer les lignes 77-79 hardcodées :

```typescript
  // Remplacer :
  // const weeklyCallTarget = 40
  // const weeklyBlockTarget = 15
  // const weeklyRelanceTarget = 12

  // Par :
  const { data: settings } = await supabase
    .from('user_settings')
    .select('calls_per_day_target, blocks_per_day_target, rdv_per_week_target')
    .eq('id', user.id)
    .maybeSingle()

  const weeklyCallTarget = (settings?.calls_per_day_target ?? 8) * 5
  const weeklyBlockTarget = (settings?.blocks_per_day_target ?? 3) * 5
  const weeklyRelanceTarget = settings?.rdv_per_week_target ?? 12
```

- [ ] **Step 2: Vérifier le build**

Run: `npm run build`
Expected: Build réussi

- [ ] **Step 3: Commit**

```bash
git add src/app/api/dashboard/weekly/route.ts
git commit -m "feat(dashboard): read weekly targets from user_settings instead of hardcoded"
```

---

## Task 6: Page /global — cockpit réel

**Files:**
- Create: `src/app/api/global/cockpit/route.ts`
- Modify: `src/app/(dashboard)/global/page.tsx`

- [ ] **Step 1: Créer l'API cockpit annuel**

```typescript
// src/app/api/global/cockpit/route.ts
import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiUnauthorized } from '@/lib/api'

export async function GET(_request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const year = new Date().getFullYear()
  const yearStart = `${year}-01-01`
  const yearEnd = `${year}-12-31`

  const [caRes, objRes, pipelineRes, topRes, productsRes] = await Promise.all([
    supabase.from('contracts')
      .select('commission_amount, signed_at')
      .eq('user_id', user.id)
      .gte('signed_at', yearStart).lte('signed_at', yearEnd),
    supabase.from('revenue_objectives')
      .select('amount, month')
      .eq('user_id', user.id)
      .eq('year', year)
      .is('product_type', null),
    supabase.from('prospects')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('pipeline_stage', ['rdv1', 'rdv2', 'rdv3']),
    supabase.from('prospects')
      .select('id, full_name, profession, city, lead_score, pipeline_stage')
      .eq('user_id', user.id)
      .in('pipeline_stage', ['rdv2', 'rdv3'])
      .order('lead_score', { ascending: false })
      .limit(5),
    supabase.from('contracts')
      .select('commission_amount, financial_products(type)')
      .eq('user_id', user.id)
      .gte('signed_at', yearStart).lte('signed_at', yearEnd),
  ])

  const contracts = caRes.data ?? []
  const caYTD = contracts.reduce((s, c) => s + Number(c.commission_amount ?? 0), 0)
  const objAnnuel = (objRes.data ?? []).reduce((s, o) => s + Number(o.amount ?? 0), 0)

  // CA par mois pour graphique
  const caByMonth = Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, '0')
    const monthContracts = contracts.filter(c => c.signed_at?.startsWith(`${year}-${m}`))
    return monthContracts.reduce((s, c) => s + Number(c.commission_amount ?? 0), 0)
  })

  // Répartition par produit
  const byProduct: Record<string, number> = {}
  ;(productsRes.data ?? []).forEach(c => {
    const type = (c.financial_products as { type?: string } | null)?.type ?? 'autre'
    byProduct[type] = (byProduct[type] ?? 0) + Number(c.commission_amount ?? 0)
  })

  // Prévision fin d'année (extrapolation linéaire)
  const monthsElapsed = new Date().getMonth() + 1
  const projectedCA = monthsElapsed > 0 ? Math.round((caYTD / monthsElapsed) * 12) : 0

  return apiSuccess({
    caYTD,
    objAnnuel,
    caByMonth,
    pipelineActive: pipelineRes.count ?? 0,
    topProspects: topRes.data ?? [],
    byProduct,
    projectedCA,
  })
}
```

- [ ] **Step 2: Modifier /global onglet Synthèse pour utiliser cockpit**

Dans `src/app/(dashboard)/global/page.tsx`, ajouter le fetch dans le useEffect existant :

```typescript
const [cockpit, setCockpit] = useState<any>(null)

// Dans le useEffect existant (ligne ~273), ajouter :
fetch('/api/global/cockpit')
  .then(r => r.json())
  .then(json => { if (json.success) setCockpit(json.data) })
  .catch(() => {})
```

Remplacer les `barDays` hardcodés (ligne ~305) par des données issues de `cockpit.caByMonth` si disponible.

- [ ] **Step 3: Supprimer les onglets morts (Planning/Suivi) ou les brancher**

Remplacer le contenu de `PlanningTabContent` et `SuiviTabContent` par un message :
```typescript
// Option A : supprimer les onglets non fonctionnels
// Option B : les brancher sur cockpit data

// On garde les onglets mais on affiche les vraies données :
// - Rétro Planning → CA par mois (caByMonth) vs objectif par mois
// - Suivi → aggregation depuis /api/donnees/stats
```

- [ ] **Step 4: Vérifier le build**

Run: `npm run build`
Expected: Build réussi

- [ ] **Step 5: Commit**

```bash
git add src/app/api/global/cockpit/route.ts src/app/(dashboard)/global/page.tsx
git commit -m "feat(global): real cockpit data — CA YTD, pipeline, top prospects, projection"
```

---

## Task 7: Scoring — persistence + influence tri

**Files:**
- Create: `src/app/api/scoring/route.ts`
- Modify: `src/app/(dashboard)/scoring/page.tsx`
- Modify: `src/app/api/today/signal/route.ts`

- [ ] **Step 1: API scoring (GET/PATCH)**

```typescript
// src/app/api/scoring/route.ts
import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function GET(_request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { data } = await supabase
    .from('user_settings')
    .select('scoring_grids')
    .eq('id', user.id)
    .maybeSingle()

  return apiSuccess({ grids: data?.scoring_grids ?? {} })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let body: { grids: Record<string, unknown> }
  try { body = await request.json() } catch { return apiError('Corps invalide', 400) }

  const { error } = await supabase
    .from('user_settings')
    .update({ scoring_grids: body.grids })
    .eq('id', user.id)

  if (error) return apiError(error.message, 500)
  return apiSuccess({ saved: true })
}
```

- [ ] **Step 2: Modifier /scoring pour charger/sauver depuis DB**

Dans `src/app/(dashboard)/scoring/page.tsx`, remplacer les `useState<ScoreRow[]>(PROFESSIONS)` par un fetch :

```typescript
useEffect(() => {
  fetch('/api/scoring')
    .then(r => r.json())
    .then(j => {
      if (j.data?.grids?.professions) setProfessions(j.data.grids.professions)
      if (j.data?.grids?.zones) setZones(j.data.grids.zones)
    })
    .catch(() => {})
}, [])

// Sauvegarder à chaque modification (debounced)
useEffect(() => {
  const t = setTimeout(() => {
    fetch('/api/scoring', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grids: { professions: rows, zones: zoneRows } }),
    }).catch(() => {})
  }, 1500)
  return () => clearTimeout(t)
}, [rows, zoneRows])
```

- [ ] **Step 3: Modifier /api/today/signal pour trier par priority_score**

Dans `src/app/api/today/signal/route.ts`, après la récupération des relances, appliquer un score dynamique :

```typescript
  // Charger scoring grids
  const { data: settingsData } = await supabase
    .from('user_settings')
    .select('scoring_grids')
    .eq('id', user.id)
    .maybeSingle()

  const grids = settingsData?.scoring_grids as { professions?: Array<{label: string; val: number}>; zones?: Array<{label: string; val: number}> } | null

  // Calculer priority_score pour chaque relance
  const scored = relances.map(r => {
    const profScore = grids?.professions?.find(p => r.profession?.includes(p.label))?.val ?? 3
    const zoneScore = grids?.zones?.find(z => r.profession?.includes(z.label))?.val ?? 2
    const recency = r.days_until === 0 ? 1.5 : r.days_until <= 2 ? 1.2 : 1.0
    const pipelineFactor = r.pipeline_stage === 'rdv2' ? 1.5 : r.pipeline_stage === 'rdv1' ? 1.2 : 1.0
    const priority_score = profScore * zoneScore * recency * pipelineFactor
    return { ...r, priority_score }
  })

  scored.sort((a, b) => b.priority_score - a.priority_score)
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/scoring/route.ts src/app/(dashboard)/scoring/page.tsx src/app/api/today/signal/route.ts
git commit -m "feat(scoring): persist grids in DB, use for priority sorting in /today signal"
```

---

## Task 8: Séquences toggle persisté

**Files:**
- Modify: `src/app/(dashboard)/sequences/page.tsx`

- [ ] **Step 1: Remplacer le toggle local par un PATCH API**

Le toggle "Activer/Désactiver" doit appeler `/api/crm/sequences/templates/[id]` PATCH avec `{ active: true/false }`.

Trouver le handler du toggle dans `sequences/page.tsx` et remplacer :

```typescript
async function toggleSequence(id: string, currentActive: boolean) {
  const res = await fetch(`/api/crm/sequences/templates/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ auto_trigger: !currentActive }),
  })
  if (res.ok) {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, auto_trigger: !currentActive } : t))
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(dashboard)/sequences/page.tsx
git commit -m "feat(sequences): persist toggle active/inactive to DB via PATCH"
```

---

## Task 9: Commerce — vidéos depuis table DB

**Files:**
- Modify: `src/app/(dashboard)/commerce/page.tsx`

- [ ] **Step 1: Remplacer THEMES/VIDEOS hardcodés par fetch API**

```typescript
// Au mount
useEffect(() => {
  fetch('/api/videos')
    .then(r => r.json())
    .then(j => {
      if (j.data) {
        // Transformer les vidéos DB en structure THEMES/VIDEOS
        // La table videos a : id, name, url, section, position
        setVideosFromDB(j.data)
      }
    })
    .catch(() => {})

  // Charger progression depuis user_settings
  fetch('/api/scoring') // on réutilise le même endpoint settings
    .then(r => r.json())
    .then(j => {
      if (j.data?.grids?.completed_videos) {
        setCompletedVideos(new Set(j.data.grids.completed_videos))
      }
    })
    .catch(() => {})
}, [])
```

Note : si la table `videos` est vide, garder les THEMES/VIDEOS hardcodés comme fallback. Quand l'utilisateur ajoute des vidéos via l'UI, POST `/api/videos`.

- [ ] **Step 2: Commit**

```bash
git add src/app/(dashboard)/commerce/page.tsx
git commit -m "feat(commerce): load videos from DB, fallback to defaults if empty"
```

---

## Task 10: Map — stats réelles par département

**Files:**
- Create: `src/app/api/map/stats/route.ts`
- Modify: `src/app/(dashboard)/map/page.tsx`

- [ ] **Step 1: API agrégation par département**

```typescript
// src/app/api/map/stats/route.ts
import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiUnauthorized } from '@/lib/api'

export async function GET(_request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { data: prospects } = await supabase
    .from('prospects')
    .select('department, pipeline_stage, last_contact_at, lead_score')
    .eq('user_id', user.id)

  const byDept: Record<string, { prospects: number; contacted: number; rdv: number; scores: number[] }> = {}

  ;(prospects ?? []).forEach(p => {
    const dept = p.department || '??'
    if (!byDept[dept]) byDept[dept] = { prospects: 0, contacted: 0, rdv: 0, scores: [] }
    byDept[dept].prospects++
    if (p.last_contact_at) byDept[dept].contacted++
    if (['rdv1', 'rdv2', 'rdv3', 'converti'].includes(p.pipeline_stage)) byDept[dept].rdv++
    if (p.lead_score) byDept[dept].scores.push(p.lead_score)
  })

  const stats = Object.entries(byDept).map(([code, d]) => ({
    code,
    prospects: d.prospects,
    contacted: d.contacted,
    rdv: d.rdv,
    avgScore: d.scores.length > 0 ? Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length * 10) / 10 : 0,
    density: d.prospects > 50 ? 'high' : d.prospects > 20 ? 'medium' : 'low',
  }))

  return apiSuccess({ departments: stats })
}
```

- [ ] **Step 2: Modifier /map pour charger les stats réelles**

Dans `src/app/(dashboard)/map/page.tsx` :
- Garder `DEPARTMENTS` comme fallback (noms/villes)
- Au mount, fetch `/api/map/stats` et merger avec les métadonnées statiques
- Rendre les départements cliquables → `router.push('/prospection/tns?dept=75')`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/map/stats/route.ts src/app/(dashboard)/map/page.tsx
git commit -m "feat(map): real prospect stats by department, clickable zones"
```

---

## Task 11: Particuliers — import CSV réel

**Files:**
- Modify: `src/app/(dashboard)/prospection/particuliers/page.tsx`

- [ ] **Step 1: Brancher sur la table prospects**

- Supprimer `MOCK_PARTICULIERS`
- Au mount, fetch `/api/prospects?source=particuliers&limit=100`
- L'import CSV parse → preview → POST batch vers `/api/prospects` avec `source: 'particuliers'`

```typescript
async function importCSV(rows: string[][]) {
  const mapped = rows.map(row => ({
    full_name: `${row[mapping.prenom] ?? ''} ${row[mapping.nom] ?? ''}`.trim(),
    email: row[mapping.email] ?? '',
    phone: row[mapping.telephone] ?? '',
    city: row[mapping.ville] ?? '',
    source: 'particuliers' as const,
    pipeline_stage: 'a_contacter' as const,
    notes: `Age: ${row[mapping.age] ?? ''}, Patrimoine: ${row[mapping.patrimoine] ?? ''}`,
  }))

  let imported = 0
  for (const prospect of mapped) {
    if (!prospect.full_name) continue
    const res = await fetch('/api/prospects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prospect),
    })
    if (res.ok) imported++
  }
  return imported
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(dashboard)/prospection/particuliers/page.tsx
git commit -m "feat(particuliers): real CSV import to prospects table, fetch from DB"
```

---

## Task 12: IA légère — insights quotidiens

**Files:**
- Create: `src/app/api/today/insights/route.ts`
- Modify: `src/app/(dashboard)/today/page.tsx`

- [ ] **Step 1: API insights (appelle Claude Haiku)**

```typescript
// src/app/api/today/insights/route.ts
import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function GET(_request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const today = new Date().toISOString().split('T')[0]

  // Vérifier cache
  const { data: cached } = await supabase
    .from('daily_insights')
    .select('content')
    .eq('user_id', user.id)
    .eq('date', today)
    .maybeSingle()

  if (cached) return apiSuccess({ insight: cached.content })

  // Collecter contexte pour l'IA
  const [kpisRes, pipelineRes, interactionsRes] = await Promise.all([
    supabase.from('daily_kpis')
      .select('date, calls, rdv1, rdv2')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(7),
    supabase.from('prospects')
      .select('pipeline_stage, profession')
      .eq('user_id', user.id)
      .in('pipeline_stage', ['rdv1', 'rdv2', 'rdv3']),
    supabase.from('interactions')
      .select('type, occurred_at')
      .eq('user_id', user.id)
      .gte('occurred_at', new Date(Date.now() - 14 * 86400000).toISOString()),
  ])

  const context = {
    last7daysKPIs: kpisRes.data ?? [],
    activePipeline: pipelineRes.data ?? [],
    recentInteractions: (interactionsRes.data ?? []).length,
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return apiSuccess({ insight: 'Configuration IA en attente (ANTHROPIC_API_KEY manquante)' })

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `Tu es un coach commercial pour un CGP (Conseiller en Gestion de Patrimoine). Voici ses stats des 7 derniers jours : ${JSON.stringify(context.last7daysKPIs)}. Il a ${context.activePipeline.length} prospects actifs en pipeline. ${context.recentInteractions} interactions ces 14 derniers jours. Donne UNE suggestion actionnable en 2 phrases max pour améliorer sa performance aujourd'hui. Sois direct et concret.`,
        }],
      }),
    })

    if (res.ok) {
      const data = await res.json()
      const insight = data.content?.[0]?.text ?? 'Pas de suggestion disponible'
      await supabase.from('daily_insights').upsert({
        user_id: user.id, date: today, content: insight,
      }, { onConflict: 'user_id,date' })
      return apiSuccess({ insight })
    }
  } catch { /* fallback */ }

  return apiSuccess({ insight: 'Analyse en cours...' })
}
```

- [ ] **Step 2: Afficher dans /today**

Ajouter un petit encadré en haut de la page `/today` :

```typescript
const [insight, setInsight] = useState<string | null>(null)

useEffect(() => {
  fetch('/api/today/insights')
    .then(r => r.json())
    .then(j => { if (j.data?.insight) setInsight(j.data.insight) })
    .catch(() => {})
}, [])
```

Afficher au-dessus du weekly signal si `insight` est non null.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/today/insights/route.ts src/app/(dashboard)/today/page.tsx
git commit -m "feat(insights): daily AI suggestion via Claude Haiku, cached in DB"
```

---

## Task 13: Build final + déploiement

- [ ] **Step 1: Vérifier le build complet**

Run: `npm run build`
Expected: Build réussi, pas d'erreurs TypeScript

- [ ] **Step 2: Commit final si nécessaire**

- [ ] **Step 3: Déployer**

```powershell
.\deploy-cloudrun.ps1 -ProjectId integration-make-365608
```

- [ ] **Step 4: Vérifier en production**

URL: https://ted-scale-with-ouss-272642857923.europe-west1.run.app

Tester :
- `/today` → compteurs chargés depuis DB
- `/donnees` → graphiques avec données réelles
- `/global` → cockpit avec CA YTD
- Recherche TNS → pas de doublons, scores cohérents
- `/scoring` → grilles sauvegardées entre refreshs
