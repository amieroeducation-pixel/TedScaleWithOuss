# Phase 3: Configuration — Research

**Researched:** 2026-05-10
**Domain:** Next.js 15 App Router · Supabase PostgreSQL · React Hook Form + Zod v4 · Inline CSS theme
**Confidence:** HIGH (toutes les réponses vérifiées directement dans le codebase)

---

## Summary

La page Paramètres (`/settings`) **existe déjà** avec un squelette complet : 6 onglets, composants `SectionPanel`, `SetRow`, `Toggle`, `NumInput`, `SetBtn` — mais tout est en state local React non persisté. Phase 3 consiste donc à **brancher** ce squelette sur Supabase plutôt qu'à le reconstruire.

La table `user_settings` est déjà présente en base (migration 001), avec RLS (migration 002), et contient exactement les colonnes dont les CFG-06/07 ont besoin : `ca_monthly_target`, `ca_annual_target`, `client_health_threshold_days`, `message_templates` (JSONB). Aucune nouvelle migration SQL n'est requise pour les seuils KPI.

Les séquences (CFG-01 à CFG-05 et CFG-08) s'appuient sur `sequence_templates` + `sequence_template_steps` dont le schéma est complet (migration 005). La route `GET /api/crm/sequences/templates` existe. Il manque : `POST` (créer template), `PATCH /[id]` (renommer/toggle auto_trigger), `DELETE /[id]`, ainsi que les routes CRUD sur les steps.

**Recommandation principale :** Conserver l'architecture tabs existante, ajouter 2 nouveaux onglets (`Séquences` et `Triggers`), refactoriser les onglets existants `Général` et `KPI` pour brancher le state sur `user_settings` via un hook `useUserSettings`, et construire les routes API manquantes.

---

## Project Constraints (from CLAUDE.md)

| Directive | Contrainte concrète |
|-----------|---------------------|
| Stack Next.js 15 App Router uniquement | Pas de Pages Router, pas de `getServerSideProps` |
| Auth `@supabase/ssr` v0.10 avec `getUser()` | Toujours `getUser()` dans les routes API — jamais `getSession()` |
| Zod v4 — `.issues` (pas `.errors`) | Validation des formulaires avec `.issues` pour les paths |
| Design dark/gold inline CSS — `C.*` depuis `src/lib/theme.ts` | Jamais de classes Tailwind directes, jamais de tokens shadcn |
| Scope local — validé avant déploiement | Pas de migration Vercel nécessaire pour cette phase |

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Lecture/écriture settings KPI | API / Backend | — | RLS Supabase + getUser() requis côté serveur |
| CRUD sequence_templates + steps | API / Backend | — | Même sécurité que SEQ-01/02 en Phase 2 |
| Affichage + formulaires settings | Frontend Client | — | `'use client'` — état local avant soumission |
| Chargement initial des settings | API / Backend | Frontend (hook) | SSR possible mais fetch client + hook suffit pour MVP |
| Triggers auto_trigger toggle | API / Backend | — | Écriture BDD — jamais côté client pur |
| Templates de messages | API / Backend (JSONB) | Frontend (éditeur) | Stocké dans user_settings.message_templates (JSONB) |

---

## Standard Stack

### Core (déjà dans le projet)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 15.x | Routes API + page settings | Stack décidé Phase 0 |
| Supabase JS | `@supabase/ssr` v0.10 | Client serveur authentifié | Stack décidé Phase 0 |
| `src/lib/api.ts` | — | `apiSuccess/apiError/apiUnauthorized` | Pattern établi Phases 0-2 |
| `src/lib/theme.ts` | — | Constantes `C.*` dark/gold | Constraint CLAUDE.md |
| Sonner | — | Toasts feedback sauvegarde | Déjà dans le layout dashboard |

### Supporting (à ajouter si besoin)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React Hook Form | v7 | Gestion état formulaire complexe | Si les forms deviennent multi-step ou avec validation |
| Zod v4 | v4.x | Validation schéma body API | Sur TOUTES les routes PATCH/POST — `.issues` pas `.errors` |

> Note : la page settings existante N'utilise PAS React Hook Form — les inputs sont des inputs natifs avec `useState`. Pour cette phase MVP, le pattern existant (state local + fetch manuel) est suffisant et cohérent avec le reste du fichier. RHF peut être introduit si un onglet a > 10 champs interdépendants.

### Alternatives Considérées

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| JSONB pour `message_templates` | Tables séparées par canal | JSONB déjà en place — migration supplémentaire inutile pour MVP |
| State local + fetch | TanStack Query | TanStack Query serait plus propre mais cohérence avec la page existante prime |
| Onglets inline CSS | shadcn/ui Tabs | Interdit par constraint design dark/gold |

---

## Schéma Base de Données — État Réel Vérifié

### `user_settings` — EXISTE, pas de migration requise

```sql
-- Migration 001 — VÉRIFIÉ
create table user_settings (
  id uuid primary key references auth.users(id) on delete cascade,
  -- Intégrations
  google_refresh_token text,
  google_calendar_id text,
  brevo_api_key text,
  brevo_list_id text,
  whatsapp_phone_number_id text,
  whatsapp_access_token text,
  -- Objectifs CGP (CFG-06)
  closing_target_pct numeric(5,2) default 40.0,
  calls_per_day_target integer default 20,
  rdv_per_week_target integer default 5,
  blocks_per_day_target integer default 6,
  ca_monthly_target numeric(12,2) default 15000,   -- CFG-06 CA mensuel cible
  ca_annual_target numeric(12,2) default 180000,    -- CFG-06 CA annuel cible
  -- Seuil d'inactivité (CFG-07)
  client_health_threshold_days integer default 90,  -- CFG-07
  -- Templates de messages (CFG-04)
  message_templates jsonb default '{}',             -- CFG-04 : { whatsapp: {a_contacter: "..."}, email: {...} }
  updated_at timestamptz default now() not null
);
-- RLS : auth.uid() = id (clé PK = UUID utilisateur)
```

**Colonnes manquantes pour CFG-05/08 :** `auto_trigger` est sur `sequence_templates`, pas sur `user_settings`. Les triggers globaux (CFG-05 : quels stades déclenchent une séquence auto) sont déjà modélisés dans `sequence_templates.auto_trigger` (boolean) + `sequence_templates.pipeline_stage`. CFG-08 (activer/désactiver trigger) = PATCH `auto_trigger` sur le template concerné.

**Migration nécessaire :** Aucune pour CFG-06/07/09. Une migration `006_user_settings_triggers.sql` sera nécessaire uniquement si on veut ajouter des colonnes pour les préférences globales de triggers (ex : `auto_sequence_enabled boolean default true`). À décider en plan.

### `sequence_templates` — Colonnes éditables (CFG-01/02/03/05/08)

```sql
-- VÉRIFIÉ migration 005
create table sequence_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,              -- CFG-01 : nom éditable
  pipeline_stage pipeline_stage,   -- CFG-05 : quel stade déclenche
  auto_trigger boolean default false, -- CFG-08 : activer/désactiver trigger auto
  created_at / updated_at
);
```

### `sequence_template_steps` — Colonnes éditables (CFG-02/03/04)

```sql
-- VÉRIFIÉ migration 005
create table sequence_template_steps (
  id uuid primary key,
  template_id uuid not null,       -- FK vers template
  step_order integer not null,     -- CFG-02 : ordre et délai
  channel sequence_channel not null, -- CFG-03 : whatsapp|email|sms|call_reminder|linkedin
  delay_days integer default 0,    -- CFG-02 : délai en jours
  message_template text,           -- CFG-04 : template message
  unique (template_id, step_order)
);
```

---

## Routes API — État Réel

### Existantes (Phase 2)

| Route | Méthode | Status | Couvre |
|-------|---------|--------|--------|
| `/api/crm/sequences/templates` | GET | Existe | Liste templates |
| `/api/crm/sequences/start` | POST | Existe | Démarrer instance |
| `/api/crm/sequences/[instanceId]` | GET/PATCH | Existe | Contrôle instance |
| `/api/crm/sequences/by-prospect/[id]` | GET | Existe | Instances d'un prospect |

### Manquantes — À créer en Phase 3

| Route | Méthode | Couvre |
|-------|---------|--------|
| `/api/crm/sequences/templates` | POST | Créer template (CFG-01) |
| `/api/crm/sequences/templates/[id]` | PATCH | Modifier nom/stage/auto_trigger (CFG-01/05/08) |
| `/api/crm/sequences/templates/[id]` | DELETE | Supprimer template (CFG-01) |
| `/api/crm/sequences/templates/[id]/steps` | GET | Lister steps d'un template |
| `/api/crm/sequences/templates/[id]/steps` | POST | Ajouter step (CFG-02/03) |
| `/api/crm/sequences/templates/[id]/steps/[stepId]` | PATCH | Modifier step (CFG-02/03/04) |
| `/api/crm/sequences/templates/[id]/steps/[stepId]` | DELETE | Supprimer step (CFG-01) |
| `/api/settings` | GET | Lire user_settings |
| `/api/settings` | PATCH | Écrire user_settings (CFG-06/07/09) |

---

## Architecture Patterns

### Pattern 1 : Hook `useUserSettings` (fetch + persist)

```typescript
// Source : [VERIFIED: codebase — pattern établi dans src/app/api/revenue/stats/route.ts]
// Pattern pour le hook côté client

// src/hooks/useUserSettings.ts
'use client'
import { useEffect, useState } from 'react'

export type UserSettings = {
  ca_monthly_target: number
  ca_annual_target: number
  client_health_threshold_days: number
  message_templates: Record<string, Record<string, string>>
  // ... autres champs
}

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(({ data }) => { setSettings(data); setLoading(false) })
  }, [])

  async function save(partial: Partial<UserSettings>) {
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partial),
    })
    const { data, error } = await res.json()
    if (error) throw new Error(error)
    setSettings(prev => prev ? { ...prev, ...data } : data)
    return data
  }

  return { settings, loading, save }
}
```

### Pattern 2 : Route API `user_settings` (UPSERT avec clé PK = user UUID)

```typescript
// Source : [VERIFIED: migration 001 — id = auth.users(id)]
// src/app/api/settings/route.ts

import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function GET(_req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('id', user.id)   // PK = user UUID (pas user_id)
    .single()

  // Pas d'erreur si row absente — retourner les defaults
  if (error && error.code !== 'PGRST116') return apiError(error.message)
  return apiSuccess(data ?? getDefaults())
}

export async function PATCH(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const body = await req.json()
  // Valider avec Zod v4 — .issues pas .errors
  // ...

  const { data, error } = await supabase
    .from('user_settings')
    .upsert({ id: user.id, ...body, updated_at: new Date().toISOString() })
    .eq('id', user.id)
    .select()
    .single()

  if (error) return apiError(error.message)
  return apiSuccess(data)
}
```

### Pattern 3 : Page Settings — Ajout d'onglets (conserver l'existant)

```typescript
// Source : [VERIFIED: src/app/(dashboard)/settings/page.tsx]
// La page existante a déjà l'architecture tabs + les composants utilitaires
// Ajouter 2 nouveaux onglets dans le tableau TABS :

type Tab = 'general' | 'kpi' | 'notifications' | 'integrations' | 'sections' | 'mobile'
  | 'sequences'  // NOUVEAU CFG-01 à CFG-05
  | 'triggers'   // NOUVEAU CFG-08

// Les composants SectionPanel, SetRow, SetLabel, NumInput, Toggle, SetBtn
// sont déjà définis dans la page — les réutiliser directement.
```

### Pattern 4 : CRUD Template + Steps (route PATCH template)

```typescript
// Source : [VERIFIED: pattern Phase 2 — src/app/api/crm/sequences/[instanceId]/route.ts]
// PATCH /api/crm/sequences/templates/[id]
// Schéma Zod v4 :

import { z } from 'zod'

const PatchTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  pipeline_stage: z.enum(['a_contacter','rdv1','rdv2','rdv3','converti','perdu']).nullable().optional(),
  auto_trigger: z.boolean().optional(),
})

// Dans le handler :
const parsed = PatchTemplateSchema.safeParse(body)
if (!parsed.success) {
  return apiError(parsed.error.issues[0].message, 400) // .issues, pas .errors
}
```

### Structure de fichiers recommandée

```
src/
├── app/
│   ├── (dashboard)/settings/page.tsx    — EXISTE (brancher sur useUserSettings)
│   └── api/
│       ├── settings/route.ts            — NOUVEAU (GET + PATCH user_settings)
│       └── crm/sequences/
│           └── templates/
│               ├── route.ts             — ÉTENDRE (ajouter POST)
│               └── [id]/
│                   ├── route.ts         — NOUVEAU (PATCH + DELETE template)
│                   └── steps/
│                       ├── route.ts     — NOUVEAU (GET + POST steps)
│                       └── [stepId]/
│                           └── route.ts — NOUVEAU (PATCH + DELETE step)
├── hooks/
│   └── useUserSettings.ts               — NOUVEAU
└── lib/
    └── sequences/
        └── types.ts                     — ÉTENDRE (ajouter UserSettings type)
```

### Anti-Patterns à Éviter

- **Utiliser `getSession()` dans une route API** : toujours `getUser()` — `getSession()` ne valide pas le JWT côté serveur
- **Tailwind classes directes** : jamais `className="bg-gray-800"` — toujours `style={{ background: C.surface1 }}`
- **`.errors` sur une erreur Zod** : c'est `.issues` en Zod v4 — `.errors` n'existe pas
- **DELETE cascade oubliée sur steps** : les steps ont `on delete cascade` depuis le template — supprimer le template suffit, pas besoin de supprimer les steps manuellement
- **Écraser `message_templates` JSONB entier** : toujours merger le JSONB existant avant UPSERT pour ne pas perdre d'autres canaux non modifiés

---

## Stockage des KPI Thresholds — Décision Architecture

### CFG-06 : CA mensuel cible et CA annuel cible

**Décision :** Stocker dans `user_settings.ca_monthly_target` (numeric) et `user_settings.ca_annual_target` (numeric).

La table `revenue_objectives` existe aussi (avec `year`, `month`, `amount`) mais elle modélise des objectifs historiques par mois/année. Pour un seuil d'alerte global configurable, `user_settings` est la bonne table — plus simple, pas de gestion de lignes multiples.

**Structure PATCH :** `{ ca_monthly_target: 15000, ca_annual_target: 180000 }`

### CFG-07 : Seuil d'inactivité client

**Décision :** `user_settings.client_health_threshold_days` (integer, défaut 90).

Note : `clients.alert_threshold_days` (migration 001) est un seuil PER CLIENT. `user_settings.client_health_threshold_days` est le seuil GLOBAL par défaut. Les deux coexistent — la Phase 3 configure le seuil global, un futur raffinement peut configurer par client.

### CFG-04 : Templates de messages

**Structure JSONB recommandée :**

```json
{
  "whatsapp": {
    "a_contacter": "Bonjour {{prenom}}, ...",
    "rdv1": "Bonjour {{nom}}, suite à notre RDV...",
    "default": "Bonjour {{prenom}}, ..."
  },
  "email": {
    "a_contacter": "Objet: ...\n\nBonjour {{nom}},...",
    "default": "..."
  },
  "sms": {
    "default": "..."
  }
}
```

Merger côté serveur avant UPSERT :

```typescript
// Récupérer les templates existants
const { data: existing } = await supabase
  .from('user_settings')
  .select('message_templates')
  .eq('id', user.id)
  .single()

const merged = { ...(existing?.message_templates ?? {}), ...body.message_templates }
// Puis UPSERT avec merged
```

---

## Don't Hand-Roll

| Problème | Ne pas construire | Utiliser | Pourquoi |
|----------|-------------------|----------|----------|
| UPSERT user_settings | Logique insert/update manuelle | `supabase.from().upsert()` | Supabase gère la contrainte ON CONFLICT sur la PK |
| Merge JSONB message_templates | Concat de strings | Spread JS côté serveur avant UPSERT | Simple, pas de race condition en usage solo |
| Auth check dans routes | Middleware custom | `getUser()` + check null | Pattern établi Phases 0-2 |
| Validation API body | Checks manuels `typeof` | Zod v4 avec `.safeParse()` | Cohérence avec les autres routes |

---

## Common Pitfalls

### Pitfall 1 : `user_settings` — row inexistante au premier accès

**Ce qui se passe :** L'utilisateur n'a jamais sauvegardé de settings → `SELECT` retourne `PGRST116` (not found). Le code crash en essayant d'accéder à `data.ca_monthly_target`.

**Pourquoi :** `user_settings.id = auth.users(id)` — la row n'est créée que lors du premier UPSERT. Il n'y a pas de trigger qui l'initialise.

**Comment éviter :** Dans le GET, checker `error.code === 'PGRST116'` et retourner un objet defaults :
```typescript
if (error && error.code !== 'PGRST116') return apiError(error.message)
return apiSuccess(data ?? getDefaultSettings())
```

**Signes d'alerte :** `TypeError: Cannot read properties of null` au chargement de la page settings.

### Pitfall 2 : Optimistic update casse les séquences actives

**Ce qui se passe :** Modifier `sequence_template_steps.delay_days` sur un template dont des instances `active` existent → les `sequence_instance_steps.scheduled_at` déjà calculés ne changent PAS. Le template est modifié mais les instances actives continuent sur l'ancien planning.

**Pourquoi :** Les steps d'instance sont créés avec `scheduled_at = now + delay_days` lors du `triggerSequenceForStage()`. Modifier le template ne rétroagit pas.

**Comment éviter :** Lors du PATCH d'un step, vérifier s'il existe des instances `active` et afficher un avertissement : "X séquences actives ne seront pas affectées par cette modification."

**Signes d'alerte :** Steps exécutés à des délais inattendus après modification du template.

### Pitfall 3 : `auto_trigger` collision sur même `pipeline_stage`

**Ce qui se passe :** Deux templates ont `auto_trigger = true` et le même `pipeline_stage`. `triggerSequenceForStage()` (Phase 2) prend le premier résultat → comportement indéterministe.

**Pourquoi :** Pas de contrainte UNIQUE `(user_id, pipeline_stage) WHERE auto_trigger = true` dans le schéma.

**Comment éviter :** Avant de sauvegarder `auto_trigger = true` sur un template, vérifier qu'il n'existe pas déjà un template auto pour ce stage. Si oui, proposer de désactiver l'autre (ou bloquer avec une erreur claire).

**Signes d'alerte :** Séquences qui se déclenchent de manière aléatoire au changement de stade.

### Pitfall 4 : Zod v4 `.errors` vs `.issues`

**Ce qui se passe :** `parsed.error.errors` est `undefined` → `TypeError` silencieux côté serveur → réponse 500 opaque.

**Pourquoi :** Breaking change Zod v4 — la propriété s'appelle désormais `.issues`.

**Comment éviter :** Toujours `parsed.error.issues[0].message`.

### Pitfall 5 : Couleurs Tailwind au lieu de `C.*`

**Ce qui se passe :** Le thème dark/gold ne s'applique pas, UI incohérente.

**Comment éviter :** Toujours `style={{ background: C.surface1, color: C.gold }}` — jamais `className="bg-gray-900 text-yellow-400"`.

---

## Code Examples

### GET user_settings avec defaults

```typescript
// Source : [VERIFIED: migration 001 structure + pattern api/revenue/stats/route.ts]
function getDefaultSettings() {
  return {
    ca_monthly_target: 15000,
    ca_annual_target: 180000,
    client_health_threshold_days: 90,
    message_templates: {},
    closing_target_pct: 40.0,
    calls_per_day_target: 20,
    rdv_per_week_target: 5,
  }
}
```

### UPSERT user_settings (pattern correct)

```typescript
// Source : [VERIFIED: Supabase JS docs — upsert avec PK conflict]
const { data, error } = await supabase
  .from('user_settings')
  .upsert({
    id: user.id,           // PK — détermine ON CONFLICT
    ca_monthly_target: body.ca_monthly_target,
    updated_at: new Date().toISOString(),
  })
  .eq('id', user.id)
  .select()
  .single()
```

### Onglet Séquences — structure UI

```typescript
// Source : [VERIFIED: settings/page.tsx — composants existants à réutiliser]
function TabSequences() {
  // 1. Fetch templates via GET /api/crm/sequences/templates
  // 2. Pour chaque template : nom éditable, pipeline_stage select, toggle auto_trigger
  // 3. Steps inline éditable : channel select, delay_days input, message_template textarea
  // 4. Boutons + / - pour ajouter/supprimer steps

  return (
    <SectionPanel title="SÉQUENCES PAR STADE">
      {/* Liste des templates avec leurs steps */}
    </SectionPanel>
  )
}
```

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | La migration `006_user_settings_triggers.sql` n'est PAS nécessaire pour CFG-06/07/09 car les colonnes existent déjà dans migration 001 | Schéma BDD | Si des colonnes manquent (ex : `auto_sequence_enabled`), une migration supplémentaire sera requise |
| A2 | Le pattern "state local + fetch manuel" est préférable à React Hook Form pour rester cohérent avec le fichier settings existant | Architecture | Si la complexité des forms augmente, RHF aurait été meilleur choix dès le départ |
| A3 | `message_templates` JSONB suffit pour CFG-04 — pas besoin de table dédiée | BDD | Si les templates deviennent très nombreux/complexes, JSONB devient difficile à requêter |

**Risque A1 — vérification recommandée avant plan :** Confirmer que `user_settings` existe bien en base (migration appliquée) via `supabase db status` ou la console Supabase.

---

## Open Questions (RESOLVED)

1. **Faut-il une migration pour `auto_sequence_enabled` global ?**
   - RESOLVED: Pas de migration supplémentaire — `auto_trigger` + `pipeline_stage` par template suffisent pour CFG-08. L'activation/désactivation individuelle se fait via PATCH `auto_trigger` sur le template concerné.

2. **Comment gérer le tab `Séquences` dans la page settings sans casser les onglets existants ?**
   - RESOLVED: Étendre le union type `Tab` directement dans settings/page.tsx (ajouter `'sequences' | 'triggers'`). Aucun autre composant ne dépend de ce type — vérification grep confirmée.

3. **Les `sequence_template_steps` ont une contrainte UNIQUE `(template_id, step_order)` — comment gérer le réordonnancement ?**
   - RESOLVED: L'UI ne propose PAS de réordonnancement drag-and-drop. L'utilisateur peut ajouter (POST step avec step_order = max + 1) et supprimer (DELETE) des steps. Le PATCH step n'expose pas de champ `step_order` modifiable — uniquement `channel`, `delay_days`, `message_template`. Cela élimine le risque de collision UNIQUE (23505).

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase CLI | Appliquer migrations | A confirmer | — | Dashboard Supabase (inaccessible machine Ted) |
| Node.js | Routes API Next.js | Supposé présent (Phase 2 complète) | — | — |
| Zod v4 | Validation routes API | Déjà dans le projet (Phase 2) | v4.x | — |

Note : La migration 001 qui crée `user_settings` a été appliquée en Phase 0. Aucune nouvelle migration n'est requise pour les colonnes KPI de base.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | TypeScript compiler (`tsc --noEmit`) — pattern établi Phases 2 |
| Config file | tsconfig.json |
| Quick run command | `npx tsc --noEmit` |
| Full suite command | `npx tsc --noEmit` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CFG-01 | CRUD templates via API | manual smoke | `npx tsc --noEmit` | TypeScript compile — Wave 0 |
| CFG-02 | Délais steps configurables | manual smoke | — | — |
| CFG-03 | Canaux par step | manual smoke | — | — |
| CFG-04 | Templates messages JSONB | manual smoke | — | — |
| CFG-05 | pipeline_stage + auto_trigger | manual smoke | — | — |
| CFG-06 | KPI thresholds persistés | manual smoke | — | — |
| CFG-07 | Seuil inactivité persisté | manual smoke | — | — |
| CFG-08 | Toggle auto_trigger | manual smoke | — | — |
| CFG-09 | Rechargement sans perte | manual smoke | — | — |

### Wave 0 Gaps

- [ ] Aucun framework de test automatisé — le projet suit le pattern `tsc --noEmit` comme gate de qualité (établi Phase 2)
- [ ] Smoke tests manuels : ouvrir `/settings`, modifier un champ, sauvegarder, recharger, vérifier persistance

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `getUser()` dans toutes les routes API |
| V3 Session Management | non | géré par Supabase Auth SSR |
| V4 Access Control | yes | RLS `auth.uid() = id` sur user_settings + RLS EXISTS sur sequence_template_steps |
| V5 Input Validation | yes | Zod v4 sur tous les PATCH/POST |
| V6 Cryptography | non applicable | Pas de chiffrement applicatif — tokens Brevo/WA en texte clair en DB (acceptable en usage solo local) |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR sur templates/steps d'un autre user | Tampering | `.eq('user_id', user.id)` sur toutes les queries + RLS |
| Injection via `message_template` text | Tampering | Texte stocké as-is — interpolé côté serveur avec `{{var}}` replace, pas de SQL dynamique |
| Écraser `user_settings` d'un autre user | Tampering | PK = `auth.uid()` + RLS `using (auth.uid() = id)` — impossible avec client Supabase standard |
| Step order collision sur réordonnancement | Spoofing | Logique server-side pour éviter violations UNIQUE constraint |

---

## Sources

### Primary (HIGH confidence — vérifiés dans le codebase)

- `supabase/migrations/001_init_schema.sql` — schéma complet `user_settings` (colonnes, types, defaults)
- `supabase/migrations/002_rls_policies.sql` — RLS `user_settings` avec `auth.uid() = id`
- `supabase/migrations/005_sequences.sql` — `sequence_templates` + `sequence_template_steps` colonnes éditables
- `src/app/(dashboard)/settings/page.tsx` — architecture tabs, composants utilitaires, état local actuel
- `src/app/api/crm/sequences/templates/route.ts` — route GET existante
- `src/app/api/revenue/stats/route.ts` — pattern route API (getUser + apiSuccess + apiError)
- `src/lib/api.ts` — helpers `apiSuccess/apiError/apiUnauthorized`
- `src/lib/theme.ts` — palette `C.*` complète
- `.planning/phases/02-sequences-multicanales/02-02A-SUMMARY.md` — décisions schéma Phase 2
- `.planning/phases/02-sequences-multicanales/02-02B-SUMMARY.md` — patterns lib sequences

### Secondary (MEDIUM confidence)

- Pattern UPSERT Supabase avec PK conflict — conformité avec la doc Supabase JS v2 [ASSUMED: comportement standard documenté]

---

## Metadata

**Confidence breakdown :**
- Schéma BDD : HIGH — vérifiés directement dans les migrations SQL
- Routes API existantes : HIGH — vérifiés dans le codebase
- Architecture settings page : HIGH — fichier lu en entier (805 lignes)
- Patterns à créer : MEDIUM — basés sur les patterns Phase 2 qui fonctionnent
- JSONB message_templates structure : MEDIUM — structure proposée, non testée en production

**Research date :** 2026-05-10
**Valid until :** 2026-06-10 (schéma stable — pas de fast-moving deps)
