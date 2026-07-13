# Transversal Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Interconnecter les ~20 pages du dashboard CGP avec ~700 liens transversaux contextuels (navigation croisée, drill-downs KPI, corrélations, feedbacks) pour que chaque donnée affichée soit cliquable vers sa source ou sa page d'action.

**Architecture:** Créer un utilitaire partagé `src/lib/cross-links.ts` avec des composants de lien réutilisables (LinkButton, LinkBadge, LinkChip) suivant le pattern inline CSS existant. Chaque page reçoit ensuite des liens contextuels via `router.push()` avec query params optionnels. Les liens sont organisés en 8 sous-projets par domaine fonctionnel.

**Tech Stack:** Next.js 15 App Router, `useRouter` + `useSearchParams` de `next/navigation`, inline CSS via `C` de `src/lib/theme.ts`

---

## Scope & Découpage

Ce plan est découpé en **8 sous-projets** indépendants. Chaque sous-projet produit un résultat fonctionnel et testable. L'ordre est par impact décroissant.

| # | Sous-projet | Pages principales | ~Liens |
|---|-------------|-------------------|--------|
| 1 | Infrastructure (composants partagés) | `src/lib/cross-links.ts` | — |
| 2 | Hub Global → Tout | `global/page.tsx` | ~80 |
| 3 | Today ↔ CRM ↔ Pipeline | `today/`, `crm/`, `pipeline/` | ~120 |
| 4 | Revenue ↔ Analytics ↔ Clients | `revenue/`, `analytics/`, `clients/` | ~100 |
| 5 | Scoring ↔ CRM ↔ Map | `scoring/`, `map/`, `crm/` | ~80 |
| 6 | Prospection ↔ CRM ↔ Today | `prospection/*/`, `crm/`, `today/` | ~90 |
| 7 | Données ↔ Global ↔ Revenue | `donnees/`, `global/`, `revenue/` | ~80 |
| 8 | Séquences ↔ Automatisations ↔ Settings ↔ Tasks | `sequences/`, `automatisations/`, `settings/`, `tasks/` | ~150 |

---

## File Structure

### New Files (Create)
- `src/lib/cross-links.ts` — Composants LinkButton, LinkBadge, LinkChip + helper `buildHref()`
- `src/lib/cross-links-registry.ts` — Registry typé de tous les liens par page (pour validation)

### Modified Files
- `src/app/(dashboard)/global/page.tsx` — Ajout ~80 liens (KPIs clickables, corrélations)
- `src/app/(dashboard)/today/page.tsx` — Ajout ~60 liens (relances → CRM, agenda → pipeline)
- `src/app/(dashboard)/crm/page.tsx` — Ajout ~50 liens (prospect cards → scoring, today, sequences)
- `src/app/(dashboard)/pipeline/page.tsx` — Ajout ~40 liens (stages → CRM filtré, analytics)
- `src/app/(dashboard)/revenue/page.tsx` — Ajout ~40 liens (montants → clients, produits → analytics)
- `src/app/(dashboard)/analytics/page.tsx` — Ajout ~35 liens (taux → pipeline, produits → revenue)
- `src/app/(dashboard)/clients/page.tsx` — Ajout ~35 liens (alertes → today, AUM → revenue)
- `src/app/(dashboard)/scoring/page.tsx` — Ajout ~25 liens (prospects → CRM, zones → map)
- `src/app/(dashboard)/map/page.tsx` — Ajout ~30 liens (départements → CRM filtré, TNS)
- `src/app/(dashboard)/donnees/page.tsx` — Ajout ~30 liens (KPIs → pages source)
- `src/app/(dashboard)/prospection/tns/page.tsx` — Ajout ~25 liens (résultats → CRM)
- `src/app/(dashboard)/prospection/chefs-entreprise/page.tsx` — Ajout ~20 liens
- `src/app/(dashboard)/sequences/page.tsx` — Ajout ~30 liens (templates → settings, logs → auto)
- `src/app/(dashboard)/automatisations/page.tsx` — Ajout ~25 liens (logs → pages concernées)
- `src/app/(dashboard)/settings/page.tsx` — Ajout ~30 liens (config → pages qui les utilisent)
- `src/app/(dashboard)/tasks/page.tsx` — Ajout ~25 liens (tâches → pages concernées)
- `src/app/(dashboard)/cercle/page.tsx` — Ajout ~20 liens (partenaires → CRM, revenue)
- `src/app/(dashboard)/achievements/page.tsx` — Ajout ~20 liens (badges → pages déclencheurs)
- `src/app/(dashboard)/dashboard/page.tsx` — Ajout ~30 liens (weekly signal → today, CRM)
- `src/app/(dashboard)/commerce/page.tsx` — Ajout ~15 liens
- `src/app/(dashboard)/simulator/page.tsx` — Ajout ~15 liens
- `src/lib/navigation-state.ts` — Mise à jour VALID_SECTIONS si nouveaux paths

---

## État actuel (Audit 2026-07-13)

**Couverture actuelle : ~185 liens actifs sur ~700 prévus (26%)**

### Liens actifs par page :
| Page | Liens actifs | Cible plan |
|------|:---:|:---:|
| /global | 27 | ~80 |
| /today | 9 | ~60 |
| /dashboard | 10 | ~30 |
| /crm | 14 | ~50 |
| /pipeline | 10 | ~40 |
| /revenue | 5 | ~40 |
| /analytics | 4 | ~35 |
| /clients | 6 | ~35 |
| /scoring | ~26 | ~25 ✅ |
| /map | ~5 | ~30 |
| /donnees | 7 | ~30 |
| /sequences | 6 | ~30 |
| /automatisations | 8 | ~25 |
| /settings | 4 | ~30 |
| /tasks | ~20 | ~25 |
| /prospection/tns | 6 | ~25 |
| /prospection/chefs | 5 | ~20 |
| /prospection/particuliers | 4 | ~15 |
| /cercle | 8 | ~20 |
| /achievements | 3 | ~20 |
| /commerce | 4 | ~15 |
| /simulator | 7 | ~15 |

### Pré-requis à corriger AVANT implémentation :

- [ ] **Bug: `/donnees` manquant dans `VALID_SECTIONS`** — `src/lib/navigation-state.ts` n'inclut pas `/donnees`, la persistence de la dernière section visitée ne fonctionne pas pour cette route.
- [ ] **Bouton mort: "Export Excel"** (`donnees/page.tsx` ligne 317) — `<button>` sans onClick, doit télécharger un CSV/XLSX.
- [ ] **Bouton mort: "📹 Voir les vidéos" ×4** (`commerce/page.tsx` ligne 265) — `<button>` sans onClick, à brancher sur un player ou URL externe.
- [ ] **Bouton mort: Panel "Alertes santé"** (`clients/page.tsx`) — KPI panel sans onClick alors que ses voisins sont cliquables, devrait naviguer vers `/clients?view=alerts`.
- [ ] **Barre de recherche layout morte** (`layout.tsx` ligne 412-429) — Input qui capture dans un state `search` mais n'a aucun effet (ni filtrage, ni navigation, ni résultats).
- [ ] **Infrastructure cross-links.tsx non branchée** — Le fichier `src/lib/cross-links.tsx` existe avec 4 composants exportés (LinkButton, LinkBadge, LinkChip, LinkInline) mais n'est importé NULLE PART. Task 1 ci-dessous est déjà faite au niveau fichier, mais les Tasks 3-12 n'ont pas été exécutées.

---

## Task 1: Infrastructure — Composants de liens partagés ✅ (fichier créé)

**Status:** Le fichier `src/lib/cross-links.tsx` existe déjà. Passer à Task 2.

**Files:**
- ~~Create: `src/lib/cross-links.ts`~~ → Existe en `.tsx`

- [ ] **Step 1: Créer le fichier cross-links.ts avec les 3 composants**

```typescript
// src/lib/cross-links.ts
'use client'

import { useRouter } from 'next/navigation'
import { C } from '@/lib/theme'

type LinkVariant = 'button' | 'badge' | 'chip' | 'inline'
type LinkColor = 'gold' | 'green' | 'cyan' | 'indigo' | 'purple'

const COLOR_MAP: Record<LinkColor, { bg: string; border: string; text: string }> = {
  gold:   { bg: '#1a1400', border: `${C.gold}40`, text: C.gold },
  green:  { bg: '#0d1a0d', border: `${C.green}40`, text: C.green },
  cyan:   { bg: '#1a0d0d', border: `${C.cyan}40`, text: C.cyan },
  indigo: { bg: '#0d0d1a', border: `${C.indigo}40`, text: C.indigo },
  purple: { bg: '#140d1a', border: `${C.purple}40`, text: C.purple },
}

export function buildHref(path: string, params?: Record<string, string>): string {
  if (!params || Object.keys(params).length === 0) return path
  const qs = new URLSearchParams(params).toString()
  return `${path}?${qs}`
}

export function LinkButton({ href, label, color = 'gold', params }: {
  href: string
  label: string
  color?: LinkColor
  params?: Record<string, string>
}) {
  const router = useRouter()
  const c = COLOR_MAP[color]
  return (
    <button
      onClick={() => router.push(buildHref(href, params))}
      style={{
        width: '100%', marginTop: 8, padding: 6,
        background: c.bg, border: `0.5px solid ${c.border}`,
        color: c.text, borderRadius: 4, fontSize: 8,
        cursor: 'pointer', fontWeight: 600,
        fontFamily: 'JetBrains Mono,monospace',
      }}
    >
      → {label}
    </button>
  )
}

export function LinkBadge({ href, label, value, color = 'gold', params }: {
  href: string
  label: string
  value: string | number
  color?: LinkColor
  params?: Record<string, string>
}) {
  const router = useRouter()
  const c = COLOR_MAP[color]
  return (
    <button
      onClick={() => router.push(buildHref(href, params))}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '3px 10px', background: c.bg,
        border: `0.5px solid ${c.border}`, borderRadius: 8,
        color: c.text, fontSize: 9, fontWeight: 600,
        cursor: 'pointer', fontFamily: 'JetBrains Mono,monospace',
      }}
    >
      <span>{label}</span>
      <span style={{ fontWeight: 800 }}>{value}</span>
    </button>
  )
}

export function LinkChip({ href, label, color = 'gold', params }: {
  href: string
  label: string
  color?: LinkColor
  params?: Record<string, string>
}) {
  const router = useRouter()
  const c = COLOR_MAP[color]
  return (
    <span
      onClick={() => router.push(buildHref(href, params))}
      style={{
        display: 'inline-block', padding: '2px 8px',
        background: c.bg, border: `0.5px solid ${c.border}`,
        borderRadius: 4, color: c.text, fontSize: 8,
        cursor: 'pointer', fontWeight: 500,
        fontFamily: 'JetBrains Mono,monospace',
      }}
    >
      {label}
    </span>
  )
}

export function LinkInline({ href, label, color = 'indigo', params }: {
  href: string
  label: string
  color?: LinkColor
  params?: Record<string, string>
}) {
  const router = useRouter()
  const c = COLOR_MAP[color]
  return (
    <span
      onClick={() => router.push(buildHref(href, params))}
      style={{
        color: c.text, cursor: 'pointer', fontSize: 9,
        textDecoration: 'none', fontWeight: 500,
        borderBottom: `0.5px dashed ${c.border}`,
      }}
    >
      {label}
    </span>
  )
}
```

- [ ] **Step 2: Vérifier que le fichier compile**

Run: `cd C:/Users/Ted/Documents/GitHub/TedScaleWithOuss && npx tsc --noEmit src/lib/cross-links.ts 2>&1 | head -20`
Expected: No errors (or only unrelated errors from other files)

- [ ] **Step 3: Commit**

```bash
git add src/lib/cross-links.ts
git commit -m "feat: add shared cross-links components (LinkButton, LinkBadge, LinkChip, LinkInline)"
```

---

## Task 2: Support Query Params — Pages réceptrices

**Files:**
- Modify: `src/app/(dashboard)/crm/page.tsx` (ajout useSearchParams pour filtrage par stage/source)
- Modify: `src/app/(dashboard)/clients/page.tsx` (ajout useSearchParams pour filtrage par alerte)
- Modify: `src/app/(dashboard)/analytics/page.tsx` (ajout useSearchParams pour focus produit)
- Modify: `src/app/(dashboard)/today/page.tsx` (ajout useSearchParams pour tab initial)
- Modify: `src/app/(dashboard)/map/page.tsx` (ajout useSearchParams pour département pré-sélectionné)

- [ ] **Step 1: CRM — Ajouter le support `?stage=xxx&source=xxx`**

Au début de la fonction composant dans `crm/page.tsx`, après les imports existants, ajouter :

```typescript
import { useSearchParams } from 'next/navigation'
```

Puis dans le composant, après les déclarations de state :

```typescript
const searchParams = useSearchParams()
const initialStage = searchParams.get('stage')
const initialSource = searchParams.get('source')
const highlightId = searchParams.get('prospect')

useEffect(() => {
  if (initialStage) {
    // Scroll to the column matching the stage
    const col = document.querySelector(`[data-stage="${initialStage}"]`)
    if (col) col.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}, [initialStage])
```

- [ ] **Step 2: Clients — Ajouter le support `?alert=critical&sort=days`**

Dans `clients/page.tsx`, ajouter :

```typescript
import { useSearchParams } from 'next/navigation'
```

Dans le composant :

```typescript
const searchParams = useSearchParams()
const alertFilter = searchParams.get('alert')
const sortParam = searchParams.get('sort')

useEffect(() => {
  if (alertFilter) setFilter(alertFilter)
  if (sortParam) setSortBy(sortParam as typeof sortBy)
}, [alertFilter, sortParam])
```

- [ ] **Step 3: Analytics — Ajouter le support `?focus=product_type`**

Dans `analytics/page.tsx`, ajouter :

```typescript
import { useSearchParams } from 'next/navigation'
```

Dans le composant :

```typescript
const searchParams = useSearchParams()
const focusProduct = searchParams.get('focus')
```

- [ ] **Step 4: Today — Ajouter le support `?tab=relances`**

Dans `today/page.tsx`, ajouter :

```typescript
import { useSearchParams } from 'next/navigation'
```

Dans le composant, modifier l'initialisation du tab :

```typescript
const searchParams = useSearchParams()
const initialTab = searchParams.get('tab') as TodayTab | null

const [activeTab, setActiveTab] = useState<TodayTab>(initialTab === 'relances' ? 'relances' : 'prospection')
```

- [ ] **Step 5: Map — Ajouter le support `?dept=75&metier=chirurgien`**

Dans `map/page.tsx`, ajouter :

```typescript
import { useSearchParams } from 'next/navigation'
```

Dans le composant :

```typescript
const searchParams = useSearchParams()
const deptParam = searchParams.get('dept')
const metierParam = searchParams.get('metier')

useEffect(() => {
  if (deptParam) setSelectedDept(deptParam)
  if (metierParam) setSelectedMetier(metierParam)
}, [deptParam, metierParam])
```

- [ ] **Step 6: Vérifier la compilation**

Run: `cd C:/Users/Ted/Documents/GitHub/TedScaleWithOuss && npx tsc --noEmit 2>&1 | head -30`
Expected: No new errors

- [ ] **Step 7: Commit**

```bash
git add src/app/\(dashboard\)/crm/page.tsx src/app/\(dashboard\)/clients/page.tsx src/app/\(dashboard\)/analytics/page.tsx src/app/\(dashboard\)/today/page.tsx src/app/\(dashboard\)/map/page.tsx
git commit -m "feat: add query param support to CRM, Clients, Analytics, Today, Map pages"
```

---

## Task 3: Global → Liens transversaux (Hub central)

**Files:**
- Modify: `src/app/(dashboard)/global/page.tsx`

La page Global a déjà 4 liens (analytics, cercle, tasks, commerce). On ajoute les liens manquants dans chaque section.

- [ ] **Step 1: Ajouter import cross-links**

En haut de `global/page.tsx`, ajouter :

```typescript
import { LinkButton, LinkBadge, LinkChip } from '@/lib/cross-links'
```

- [ ] **Step 2: Tab Synthèse — KPI cards clickables**

Dans la section des 4 KPI cards (score global, CA, pipeline, relances), rendre chaque card clickable :

Après chaque KPI card `<div>`, ajouter un `LinkButton` :

```typescript
// Après le KPI CA mensuel
<LinkButton href="/revenue" label="Détail Revenue" color="gold" />

// Après le KPI Pipeline
<LinkButton href="/pipeline" label="Voir pipeline" color="indigo" />

// Après le KPI Relances
<LinkButton href="/today" label="Relances du jour" color="cyan" params={{ tab: 'relances' }} />

// Après le KPI Score
<LinkButton href="/scoring" label="Grilles scoring" color="purple" />
```

- [ ] **Step 3: Tab Synthèse — Section Performance hebdo liens vers données**

Sous le graphique de performance hebdo, ajouter :

```typescript
<div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
  <LinkChip href="/donnees" label="Historique données" color="indigo" />
  <LinkChip href="/dashboard" label="Signal hebdo" color="gold" />
  <LinkChip href="/achievements" label="Badges" color="purple" />
</div>
```

- [ ] **Step 4: Tab Planning — Liens objectifs vers revenue**

Dans le tab Planning, après le tableau d'objectifs mensuels, ajouter :

```typescript
<LinkButton href="/revenue" label="Comparer avec CA réel" color="green" />
<div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
  <LinkChip href="/settings" label="Modifier objectifs" color="indigo" params={{ tab: 'kpi' }} />
  <LinkChip href="/donnees" label="Données brutes" color="gold" />
</div>
```

- [ ] **Step 5: Tab Suivi — Liens détails vers pages sources**

Dans le tab Suivi, pour chaque KPI card (appels, contacts, RDV, blocs), ajouter des liens :

```typescript
// Après KPI Appels
<LinkChip href="/today" label="Voir session appels" color="cyan" />

// Après KPI RDV
<LinkChip href="/pipeline" label="Pipeline RDV" color="indigo" params={{ stage: 'rdv1' }} />

// Après taux conversion
<LinkChip href="/analytics" label="Analyse closing" color="green" />

// Après comparateur semaines
<LinkButton href="/donnees" label="Historique complet" color="gold" />
```

- [ ] **Step 6: Tab RDV Pris — Liens vers CRM et Today**

```typescript
<div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
  <LinkChip href="/crm" label="Voir dans Kanban" color="gold" params={{ stage: 'rdv1' }} />
  <LinkChip href="/today" label="Agenda du jour" color="cyan" />
  <LinkChip href="/clients" label="Clients actifs" color="green" />
</div>
```

- [ ] **Step 7: Vérifier la compilation et tester visuellement**

Run: `cd C:/Users/Ted/Documents/GitHub/TedScaleWithOuss && npx tsc --noEmit 2>&1 | head -20`

Puis lancer `npm run dev` et vérifier `/global` dans le navigateur.

- [ ] **Step 8: Commit**

```bash
git add src/app/\(dashboard\)/global/page.tsx
git commit -m "feat(global): add ~30 transversal links across all tabs (KPIs, planning, suivi, RDV)"
```

---

## Task 4: Today ↔ CRM — Liens bidirectionnels relances/prospects

**Files:**
- Modify: `src/app/(dashboard)/today/page.tsx`
- Modify: `src/app/(dashboard)/crm/page.tsx`

- [ ] **Step 1: Today — Import cross-links**

```typescript
import { LinkButton, LinkBadge, LinkChip, LinkInline } from '@/lib/cross-links'
```

- [ ] **Step 2: Today Tab Prospection — KPI cards clickables**

Après chaque KPI card dans la rangée (Appels, Contacts, RDV, Blocs), ajouter un lien :

```typescript
// Sous le compteur Appels
<LinkChip href="/donnees" label="Historique" color="indigo" />

// Sous le compteur RDV
<LinkChip href="/crm" label="Kanban" color="gold" params={{ stage: 'rdv1' }} />

// Sous le compteur Blocs (52min)
<LinkChip href="/global" label="Suivi hebdo" color="green" />
```

- [ ] **Step 3: Today Tab Relances — Cartes relance clickables vers CRM**

Dans le Kanban des relances (4 colonnes), pour chaque carte de relance, rendre le nom du prospect clickable :

```typescript
<span
  onClick={() => router.push(buildHref('/crm', { prospect: relance.prospect_id }))}
  style={{ color: C.gold, cursor: 'pointer', fontSize: 10, fontWeight: 600 }}
>
  {relance.full_name}
</span>
```

- [ ] **Step 4: Today — Weekly Signal liens vers pages**

Dans la section "Relances prioritaires" (signal API), chaque relance reçoit un lien :

```typescript
// Pour chaque relance prioritaire
<LinkInline
  href="/crm"
  label="→ Voir fiche"
  color="gold"
  params={{ prospect: relance.id }}
/>
```

Et pour les RDV de la semaine :

```typescript
// Pour chaque RDV
<LinkInline
  href="/pipeline"
  label={`→ ${rdv.type.toUpperCase()}`}
  color="indigo"
/>
```

- [ ] **Step 5: Today — Liens bas de page**

En bas de la page Today, ajouter un footer de navigation contextuelle :

```typescript
<div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
  <LinkButton href="/crm" label="Ouvrir le CRM" color="gold" />
  <LinkButton href="/pipeline" label="Vue Pipeline" color="indigo" />
  <LinkButton href="/scoring" label="Scoring prospects" color="purple" />
  <LinkButton href="/sequences" label="Séquences actives" color="green" />
</div>
```

- [ ] **Step 6: CRM — Import cross-links et ajout liens**

Dans `crm/page.tsx`, ajouter :

```typescript
import { LinkButton, LinkChip, LinkInline } from '@/lib/cross-links'
```

Pour chaque prospect card dans le Kanban, ajouter dans le footer de card :

```typescript
<div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
  <LinkChip href="/today" label="Relancer" color="cyan" params={{ tab: 'relances' }} />
  <LinkChip href="/scoring" label={`Score: ${prospect.leadScore}`} color="purple" />
  {prospect.stage === 'converti' && (
    <LinkChip href="/clients" label="→ Client" color="green" />
  )}
</div>
```

- [ ] **Step 7: CRM — Liens header par stage**

Au-dessus de chaque colonne du Kanban, ajouter un lien vers la page pertinente :

```typescript
// Colonne "À contacter"
<LinkInline href="/prospection/tns" label="+ Nouveaux TNS" color="indigo" />

// Colonne "RDV1/2/3"
<LinkInline href="/pipeline" label="Stats conversion" color="green" />

// Colonne "Converti"
<LinkInline href="/revenue" label="Voir CA" color="gold" />

// Colonne "Perdu"
<LinkInline href="/analytics" label="Analyse closing" color="cyan" />
```

- [ ] **Step 8: Vérifier compilation + test visuel**

Run: `cd C:/Users/Ted/Documents/GitHub/TedScaleWithOuss && npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 9: Commit**

```bash
git add src/app/\(dashboard\)/today/page.tsx src/app/\(dashboard\)/crm/page.tsx
git commit -m "feat(today,crm): add bidirectional transversal links (relances, prospects, pipeline)"
```

---

## Task 5: Revenue ↔ Analytics ↔ Clients — Triangle financier

**Files:**
- Modify: `src/app/(dashboard)/revenue/page.tsx`
- Modify: `src/app/(dashboard)/analytics/page.tsx`
- Modify: `src/app/(dashboard)/clients/page.tsx`

- [ ] **Step 1: Revenue — Import et liens KPI header**

```typescript
import { LinkButton, LinkBadge, LinkChip } from '@/lib/cross-links'
```

Après les KPI cards (CA mois, CA YTD, Contrats, Commission moy) :

```typescript
// Après CA mensuel
<LinkChip href="/global" label="Objectif mensuel" color="indigo" />

// Après Contrats
<LinkChip href="/analytics" label="Taux closing" color="green" params={{ focus: 'closing' }} />

// Après Clients
<LinkChip href="/clients" label="Liste clients" color="gold" />
```

- [ ] **Step 2: Revenue — Graphique mensuel liens vers données**

Sous le graphique LineChart 12 mois :

```typescript
<div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
  <LinkChip href="/donnees" label="Données détaillées" color="indigo" />
  <LinkChip href="/global" label="Planning annuel" color="gold" />
</div>
```

- [ ] **Step 3: Revenue — Produits clickables vers analytics**

Pour chaque produit dans la répartition par produit :

```typescript
<LinkInline
  href="/analytics"
  label={`Taux: ${product.pct}%`}
  color="green"
  params={{ focus: product.type }}
/>
```

- [ ] **Step 4: Revenue — Footer navigation**

```typescript
<div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
  <LinkButton href="/analytics" label="Analyse conversion" color="green" />
  <LinkButton href="/pipeline" label="Pipeline actif" color="indigo" />
  <LinkButton href="/clients" label="Portefeuille clients" color="gold" />
</div>
```

- [ ] **Step 5: Analytics — Import et liens pipeline**

```typescript
import { LinkButton, LinkChip, LinkInline } from '@/lib/cross-links'
```

Pour chaque stage du pipeline (funnel) :

```typescript
<LinkInline
  href="/crm"
  label={`${stage.total} prospects`}
  color="gold"
  params={{ stage: stage.stage }}
/>
```

- [ ] **Step 6: Analytics — PieChart closing liens vers revenue**

Sous le PieChart de closing par produit :

```typescript
<div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
  {closingData.byProduct.map(p => (
    <LinkChip
      key={p.type}
      href="/revenue"
      label={`${p.label}: ${p.rate_pct}%`}
      color="gold"
    />
  ))}
</div>
<LinkButton href="/revenue" label="Détail commissions" color="gold" />
```

- [ ] **Step 7: Analytics — Footer corrélations**

```typescript
<div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
  <LinkButton href="/crm" label="CRM Kanban" color="gold" />
  <LinkButton href="/scoring" label="Scoring grilles" color="purple" />
  <LinkButton href="/donnees" label="Historique KPIs" color="indigo" />
</div>
```

- [ ] **Step 8: Clients — Import et liens alertes**

```typescript
import { LinkButton, LinkChip, LinkInline } from '@/lib/cross-links'
```

Pour chaque client avec alerte inactivité :

```typescript
<LinkChip
  href="/today"
  label="Planifier relance"
  color="cyan"
  params={{ tab: 'relances' }}
/>
```

- [ ] **Step 9: Clients — Liens header KPIs**

```typescript
// Après Total AUM
<LinkChip href="/revenue" label="Voir CA" color="gold" />

// Après nombre clients
<LinkChip href="/crm" label="Pipeline" color="indigo" params={{ stage: 'converti' }} />
```

- [ ] **Step 10: Clients — Footer**

```typescript
<div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
  <LinkButton href="/revenue" label="Revenue détail" color="gold" />
  <LinkButton href="/cercle" label="Réseau partenaires" color="purple" />
  <LinkButton href="/sequences" label="Séquences fidélisation" color="green" />
</div>
```

- [ ] **Step 11: Vérifier compilation**

Run: `cd C:/Users/Ted/Documents/GitHub/TedScaleWithOuss && npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 12: Commit**

```bash
git add src/app/\(dashboard\)/revenue/page.tsx src/app/\(dashboard\)/analytics/page.tsx src/app/\(dashboard\)/clients/page.tsx
git commit -m "feat(revenue,analytics,clients): add financial triangle transversal links"
```

---

## Task 6: Scoring ↔ CRM ↔ Map — Triangle prospection

**Files:**
- Modify: `src/app/(dashboard)/scoring/page.tsx`
- Modify: `src/app/(dashboard)/map/page.tsx`

- [ ] **Step 1: Scoring — Import et liens prospects**

```typescript
import { LinkButton, LinkChip, LinkInline } from '@/lib/cross-links'
```

Pour chaque prospect dans le top 8 :

```typescript
<LinkInline
  href="/crm"
  label="→ Fiche CRM"
  color="gold"
  params={{ prospect: p.id }}
/>
```

- [ ] **Step 2: Scoring — Liens grilles vers map et CRM**

Sous la grille "Score par zone" :

```typescript
<LinkButton href="/map" label="Carte zones IDF" color="indigo" />
```

Sous la grille "Score par profession" :

```typescript
<LinkButton href="/prospection/tns" label="Prospecter TNS" color="cyan" />
```

- [ ] **Step 3: Scoring — Footer navigation**

```typescript
<div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
  <LinkButton href="/crm" label="CRM Kanban" color="gold" />
  <LinkButton href="/map" label="Carte prospection" color="indigo" />
  <LinkButton href="/settings" label="Config scoring" color="purple" params={{ tab: 'kpi' }} />
</div>
```

- [ ] **Step 4: Map — Import et liens départements**

```typescript
import { LinkButton, LinkChip, LinkInline } from '@/lib/cross-links'
```

Pour chaque département avec stats :

```typescript
<LinkChip
  href="/crm"
  label={`${dept.prospects} prospects`}
  color="gold"
  params={{ source: 'tns' }}
/>
```

- [ ] **Step 5: Map — Liens résultats prospection vers CRM**

Après le bouton "LANCER PROSPECTION", pour chaque résultat :

```typescript
<LinkInline href="/crm" label="→ Ajouter au CRM" color="gold" />
```

- [ ] **Step 6: Map — Entonnoir liens vers analytics**

Sous l'entonnoir de conversion IDF :

```typescript
<div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
  <LinkChip href="/analytics" label="Stats conversion" color="green" />
  <LinkChip href="/scoring" label="Grilles scoring" color="purple" />
  <LinkChip href="/pipeline" label="Pipeline complet" color="indigo" />
</div>
```

- [ ] **Step 7: Map — Footer**

```typescript
<div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
  <LinkButton href="/prospection/tns" label="Recherche TNS" color="cyan" />
  <LinkButton href="/prospection/chefs-entreprise" label="Chefs entreprise" color="indigo" />
  <LinkButton href="/scoring" label="Scoring patrimonial" color="purple" />
</div>
```

- [ ] **Step 8: Vérifier et commit**

```bash
cd C:/Users/Ted/Documents/GitHub/TedScaleWithOuss && npx tsc --noEmit 2>&1 | head -20
git add src/app/\(dashboard\)/scoring/page.tsx src/app/\(dashboard\)/map/page.tsx
git commit -m "feat(scoring,map): add prospection triangle transversal links"
```

---

## Task 7: Pipeline + Dashboard (Weekly) — Liens contextuels

**Files:**
- Modify: `src/app/(dashboard)/pipeline/page.tsx`
- Modify: `src/app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Pipeline — Import et liens stages**

```typescript
import { LinkButton, LinkChip, LinkInline } from '@/lib/cross-links'
```

Pour chaque stage du funnel :

```typescript
<LinkChip
  href="/crm"
  label={`Voir ${stage.total} prospects`}
  color="gold"
  params={{ stage: stage.stage }}
/>
```

- [ ] **Step 2: Pipeline — PieChart produits liens vers revenue**

```typescript
<div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
  <LinkChip href="/revenue" label="CA par produit" color="gold" />
  <LinkChip href="/analytics" label="Closing détaillé" color="green" />
</div>
```

- [ ] **Step 3: Pipeline — Calendar events liens vers today**

Si la page affiche des RDV depuis calendar :

```typescript
<LinkInline href="/today" label="→ Agenda today" color="cyan" />
```

- [ ] **Step 4: Pipeline — Footer**

```typescript
<div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
  <LinkButton href="/crm" label="CRM Kanban complet" color="gold" />
  <LinkButton href="/analytics" label="Analyses conversion" color="green" />
  <LinkButton href="/revenue" label="Impact CA" color="indigo" />
  <LinkButton href="/today" label="Actions du jour" color="cyan" />
</div>
```

- [ ] **Step 5: Dashboard (Weekly Signal) — Import et liens**

```typescript
import { LinkButton, LinkChip, LinkInline } from '@/lib/cross-links'
```

Dans la section "Relances prioritaires" du weekly signal :

```typescript
// Pour chaque relance
<LinkInline href="/crm" label="→ CRM" color="gold" params={{ prospect: r.id }} />
```

Dans la section "RDV de la semaine" :

```typescript
<LinkInline href="/pipeline" label={`→ ${rdv.type}`} color="indigo" />
```

- [ ] **Step 6: Dashboard — Footer hebdomadaire**

```typescript
<div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
  <LinkButton href="/today" label="Actions aujourd'hui" color="cyan" />
  <LinkButton href="/global" label="Vue globale" color="gold" />
  <LinkButton href="/donnees" label="Données semaine" color="indigo" />
  <LinkButton href="/achievements" label="Progression" color="purple" />
</div>
```

- [ ] **Step 7: Vérifier et commit**

```bash
cd C:/Users/Ted/Documents/GitHub/TedScaleWithOuss && npx tsc --noEmit 2>&1 | head -20
git add src/app/\(dashboard\)/pipeline/page.tsx src/app/\(dashboard\)/dashboard/page.tsx
git commit -m "feat(pipeline,dashboard): add contextual transversal links"
```

---

## Task 8: Prospection (TNS + Chefs) → CRM — Flux d'acquisition

**Files:**
- Modify: `src/app/(dashboard)/prospection/tns/page.tsx`
- Modify: `src/app/(dashboard)/prospection/chefs-entreprise/page.tsx`

- [ ] **Step 1: TNS — Import et liens résultats**

```typescript
import { LinkButton, LinkChip, LinkInline } from '@/lib/cross-links'
```

Pour chaque résultat de recherche TNS :

```typescript
<LinkInline href="/crm" label="→ Ajouter CRM" color="gold" />
<LinkChip href="/scoring" label="Scorer" color="purple" />
```

- [ ] **Step 2: TNS — Liens vers Map et scoring**

En haut de la page :

```typescript
<div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
  <LinkChip href="/map" label="Vue carte" color="indigo" />
  <LinkChip href="/scoring" label="Grilles scoring" color="purple" />
  <LinkChip href="/crm" label="Pipeline actuel" color="gold" />
</div>
```

- [ ] **Step 3: TNS — Footer**

```typescript
<div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
  <LinkButton href="/crm" label="CRM — Voir prospects ajoutés" color="gold" />
  <LinkButton href="/map" label="Carte zones IDF" color="indigo" />
  <LinkButton href="/today" label="Commencer relances" color="cyan" params={{ tab: 'relances' }} />
</div>
```

- [ ] **Step 4: Chefs entreprise — Import et liens identiques**

```typescript
import { LinkButton, LinkChip, LinkInline } from '@/lib/cross-links'
```

Mêmes patterns que TNS :

```typescript
// Header
<div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
  <LinkChip href="/map" label="Vue carte" color="indigo" />
  <LinkChip href="/crm" label="Pipeline" color="gold" />
  <LinkChip href="/prospection/tns" label="TNS aussi" color="cyan" />
</div>

// Pour chaque résultat
<LinkInline href="/crm" label="→ Ajouter CRM" color="gold" />

// Footer
<div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
  <LinkButton href="/crm" label="Voir dans Kanban" color="gold" />
  <LinkButton href="/today" label="Planifier relances" color="cyan" params={{ tab: 'relances' }} />
  <LinkButton href="/scoring" label="Scoring patrimonial" color="purple" />
</div>
```

- [ ] **Step 5: Vérifier et commit**

```bash
cd C:/Users/Ted/Documents/GitHub/TedScaleWithOuss && npx tsc --noEmit 2>&1 | head -20
git add src/app/\(dashboard\)/prospection/tns/page.tsx src/app/\(dashboard\)/prospection/chefs-entreprise/page.tsx
git commit -m "feat(prospection): add acquisition flow transversal links to CRM, Map, Scoring"
```

---

## Task 9: Données ↔ Global ↔ Revenue — Triangle pilotage

**Files:**
- Modify: `src/app/(dashboard)/donnees/page.tsx`

- [ ] **Step 1: Données — Import**

```typescript
import { LinkButton, LinkChip } from '@/lib/cross-links'
```

- [ ] **Step 2: Données — KPI cards clickables**

Pour chaque KPI card (Appels, Prospects, RDV, CA, Contrats, Moy/jour, Blocs, Taux closing) :

```typescript
// Appels
<LinkChip href="/today" label="Session appels" color="cyan" />

// Prospects
<LinkChip href="/crm" label="Kanban" color="gold" />

// RDV
<LinkChip href="/pipeline" label="Pipeline" color="indigo" />

// CA
<LinkChip href="/revenue" label="Détail CA" color="gold" />

// Contrats
<LinkChip href="/analytics" label="Closing" color="green" />

// Taux closing
<LinkChip href="/analytics" label="Analyse" color="green" />
```

- [ ] **Step 3: Données — Section objectifs liens vers settings**

```typescript
<LinkButton href="/settings" label="Modifier objectifs" color="indigo" params={{ tab: 'kpi' }} />
<LinkChip href="/global" label="Vue planning" color="gold" />
```

- [ ] **Step 4: Données — Footer**

```typescript
<div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
  <LinkButton href="/global" label="Vue globale" color="gold" />
  <LinkButton href="/revenue" label="Revenue mensuel" color="green" />
  <LinkButton href="/analytics" label="Analytics" color="indigo" />
  <LinkButton href="/today" label="Actions du jour" color="cyan" />
</div>
```

- [ ] **Step 5: Vérifier et commit**

```bash
cd C:/Users/Ted/Documents/GitHub/TedScaleWithOuss && npx tsc --noEmit 2>&1 | head -20
git add src/app/\(dashboard\)/donnees/page.tsx
git commit -m "feat(donnees): add pilotage triangle transversal links"
```

---

## Task 10: Séquences ↔ Automatisations ↔ Settings ↔ Tasks

**Files:**
- Modify: `src/app/(dashboard)/sequences/page.tsx`
- Modify: `src/app/(dashboard)/automatisations/page.tsx`
- Modify: `src/app/(dashboard)/settings/page.tsx`
- Modify: `src/app/(dashboard)/tasks/page.tsx`

- [ ] **Step 1: Séquences — Import et liens**

```typescript
import { LinkButton, LinkChip, LinkInline } from '@/lib/cross-links'
```

Pour chaque séquence active :

```typescript
<LinkChip href="/crm" label="Prospects liés" color="gold" />
<LinkChip href="/automatisations" label="Logs exécution" color="indigo" />
```

Header :

```typescript
<div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
  <LinkChip href="/settings" label="Templates" color="indigo" params={{ tab: 'sequences' }} />
  <LinkChip href="/crm" label="CRM" color="gold" />
  <LinkChip href="/automatisations" label="Logs" color="purple" />
</div>
```

Footer :

```typescript
<div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
  <LinkButton href="/settings" label="Configurer templates" color="indigo" params={{ tab: 'sequences' }} />
  <LinkButton href="/crm" label="Voir prospects ciblés" color="gold" />
  <LinkButton href="/automatisations" label="Historique exécutions" color="purple" />
</div>
```

- [ ] **Step 2: Automatisations — Import et liens logs**

```typescript
import { LinkButton, LinkChip } from '@/lib/cross-links'
```

Pour chaque log d'exécution, lier à la page concernée :

```typescript
// Log weekly-report → dashboard
<LinkInline href="/dashboard" label="→ Rapport hebdo" color="gold" />

// Log client-health → clients
<LinkInline href="/clients" label="→ Santé clients" color="green" />

// Log rdv-reminder → today
<LinkInline href="/today" label="→ Rappels" color="cyan" />

// Log ca-alert → revenue
<LinkInline href="/revenue" label="→ Alerte CA" color="gold" />
```

Footer :

```typescript
<div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
  <LinkButton href="/sequences" label="Séquences actives" color="green" />
  <LinkButton href="/settings" label="Configuration cron" color="indigo" params={{ tab: 'triggers' }} />
</div>
```

- [ ] **Step 3: Settings — Liens contextuels par onglet**

Dans chaque onglet de Settings, ajouter un lien vers la page qui utilise ce paramètre :

```typescript
// Onglet KPI
<LinkChip href="/global" label="Voir sur Global" color="gold" />
<LinkChip href="/donnees" label="Voir sur Données" color="indigo" />

// Onglet Séquences
<LinkChip href="/sequences" label="Séquences actives" color="green" />
<LinkChip href="/crm" label="CRM prospects" color="gold" />

// Onglet Triggers
<LinkChip href="/automatisations" label="Logs exécution" color="purple" />

// Onglet Scripts
<LinkChip href="/automatisations" label="Historique" color="indigo" />
```

- [ ] **Step 4: Tasks — Import et liens tâches**

```typescript
import { LinkButton, LinkChip } from '@/lib/cross-links'
```

Pour chaque tâche avec badge :

```typescript
// Badge "prospect"
<LinkChip href="/crm" label="→ CRM" color="gold" />

// Badge "client"
<LinkChip href="/clients" label="→ Client" color="green" />

// Badge "premium"
<LinkChip href="/revenue" label="→ Revenue" color="gold" />
```

Footer :

```typescript
<div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
  <LinkButton href="/today" label="Actions du jour" color="cyan" />
  <LinkButton href="/global" label="Vue pilotage" color="gold" />
  <LinkButton href="/crm" label="Pipeline CRM" color="indigo" />
</div>
```

- [ ] **Step 5: Vérifier et commit**

```bash
cd C:/Users/Ted/Documents/GitHub/TedScaleWithOuss && npx tsc --noEmit 2>&1 | head -20
git add src/app/\(dashboard\)/sequences/page.tsx src/app/\(dashboard\)/automatisations/page.tsx src/app/\(dashboard\)/settings/page.tsx src/app/\(dashboard\)/tasks/page.tsx
git commit -m "feat(sequences,auto,settings,tasks): add operations transversal links"
```

---

## Task 11: Pages secondaires — Cercle, Achievements, Commerce, Simulator

**Files:**
- Modify: `src/app/(dashboard)/cercle/page.tsx`
- Modify: `src/app/(dashboard)/achievements/page.tsx`
- Modify: `src/app/(dashboard)/commerce/page.tsx`
- Modify: `src/app/(dashboard)/simulator/page.tsx`

- [ ] **Step 1: Cercle — Liens partenaires**

```typescript
import { LinkButton, LinkChip } from '@/lib/cross-links'

// Pour chaque partenaire
<LinkChip href="/crm" label="Recommandations reçues" color="gold" params={{ source: 'recommandation' }} />

// Footer
<div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
  <LinkButton href="/clients" label="Clients recommandés" color="green" />
  <LinkButton href="/revenue" label="CA via réseau" color="gold" />
  <LinkButton href="/global" label="KPI Interpro" color="indigo" />
</div>
```

- [ ] **Step 2: Achievements — Liens badges vers pages déclencheurs**

```typescript
import { LinkButton, LinkChip } from '@/lib/cross-links'

// Badge "Premier contrat" → revenue
<LinkChip href="/revenue" label="→ Revenue" color="gold" />

// Badge "10 RDV" → pipeline
<LinkChip href="/pipeline" label="→ Pipeline" color="indigo" />

// Badge "Score 80+" → scoring
<LinkChip href="/scoring" label="→ Scoring" color="purple" />

// Footer
<div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
  <LinkButton href="/global" label="Score global" color="gold" />
  <LinkButton href="/donnees" label="Historique performance" color="indigo" />
</div>
```

- [ ] **Step 3: Commerce — Liens outils vers produits**

```typescript
import { LinkButton, LinkChip } from '@/lib/cross-links'

// Pour chaque outil commercial
<LinkChip href="/simulator" label="Simuler" color="indigo" />
<LinkChip href="/revenue" label="CA produit" color="gold" />

// Footer
<div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
  <LinkButton href="/simulator" label="Simulateur" color="indigo" />
  <LinkButton href="/revenue" label="Revenue par produit" color="gold" />
  <LinkButton href="/analytics" label="Mix produits" color="green" />
</div>
```

- [ ] **Step 4: Simulator — Liens produits vers revenue et commerce**

```typescript
import { LinkButton, LinkChip } from '@/lib/cross-links'

// Après simulation
<LinkChip href="/revenue" label="Voir CA réel" color="gold" />
<LinkChip href="/commerce" label="Outils commerce" color="purple" />

// Footer
<div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
  <LinkButton href="/commerce" label="Outils commerciaux" color="purple" />
  <LinkButton href="/revenue" label="Revenue actuel" color="gold" />
  <LinkButton href="/crm" label="Proposer à un prospect" color="indigo" />
</div>
```

- [ ] **Step 5: Vérifier et commit**

```bash
cd C:/Users/Ted/Documents/GitHub/TedScaleWithOuss && npx tsc --noEmit 2>&1 | head -20
git add src/app/\(dashboard\)/cercle/page.tsx src/app/\(dashboard\)/achievements/page.tsx src/app/\(dashboard\)/commerce/page.tsx src/app/\(dashboard\)/simulator/page.tsx
git commit -m "feat(cercle,achievements,commerce,simulator): add secondary pages transversal links"
```

---

## Task 12: Liens tertiaires — Corrélations et chaînages avancés

**Files:**
- Modify: Multiple pages (ajouts ciblés)

- [ ] **Step 1: Revenue × Analytics — Corrélation CA/Closing**

Dans `revenue/page.tsx`, après le graphique mensuel, ajouter une section "Corrélations" :

```typescript
<div style={{ marginTop: 12, padding: 10, background: C.surface1, borderRadius: 6, border: `0.5px solid ${C.lineSoft}` }}>
  <div style={{ fontSize: 9, color: C.textMid, fontWeight: 600, marginBottom: 6 }}>CORRÉLATIONS</div>
  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
    <LinkBadge href="/analytics" label="Closing rate" value={`${closingRate}%`} color="green" />
    <LinkBadge href="/clients" label="Clients actifs" value={clientCount} color="gold" />
    <LinkBadge href="/pipeline" label="En pipeline" value={pipelineCount} color="indigo" />
  </div>
</div>
```

- [ ] **Step 2: Today × Scoring — Score-based priority**

Dans `today/page.tsx`, dans les relances prioritaires, afficher le lead_score cliquable :

```typescript
{relance.lead_score && (
  <LinkChip
    href="/scoring"
    label={`Score ${relance.lead_score}`}
    color={relance.lead_score >= 80 ? 'green' : relance.lead_score >= 60 ? 'gold' : 'indigo'}
  />
)}
```

- [ ] **Step 3: CRM × Sequences — Statut séquence dans card**

Dans `crm/page.tsx`, pour les prospects ayant une séquence active :

```typescript
{prospect.activeSequence && (
  <LinkChip
    href="/sequences"
    label={`Séq. ${prospect.activeSequence.channel}`}
    color="green"
  />
)}
```

- [ ] **Step 4: Global × Achievements — Score débloque badges**

Dans `global/page.tsx` tab Synthèse, après le score global :

```typescript
<LinkBadge
  href="/achievements"
  label="Badges"
  value={achievementCount}
  color="purple"
/>
```

- [ ] **Step 5: Pipeline × Today — Prochains RDV du pipeline**

Dans `pipeline/page.tsx`, si des RDV sont prévus aujourd'hui :

```typescript
{todayRdvCount > 0 && (
  <LinkBadge
    href="/today"
    label="RDV aujourd'hui"
    value={todayRdvCount}
    color="cyan"
  />
)}
```

- [ ] **Step 6: Map × Scoring × CRM — Chaînage département→score→prospect**

Dans `map/page.tsx`, pour chaque département, afficher le score moyen cliquable :

```typescript
<LinkBadge
  href="/scoring"
  label="Score moy."
  value={dept.avgScore}
  color="purple"
/>
```

- [ ] **Step 7: Vérifier et commit**

```bash
cd C:/Users/Ted/Documents/GitHub/TedScaleWithOuss && npx tsc --noEmit 2>&1 | head -20
git add -u
git commit -m "feat: add tertiary transversal links (correlations, chains, score-based priorities)"
```

---

## Vérification finale

- [ ] **Step 1: Build complet**

```bash
cd C:/Users/Ted/Documents/GitHub/TedScaleWithOuss && npm run build 2>&1 | tail -20
```

Expected: Build succeeds without errors

- [ ] **Step 2: Lint**

```bash
cd C:/Users/Ted/Documents/GitHub/TedScaleWithOuss && npm run lint 2>&1 | tail -20
```

Expected: No new lint errors

- [ ] **Step 3: Test visuel — Lancer le serveur dev et vérifier chaque page**

```bash
cd C:/Users/Ted/Documents/GitHub/TedScaleWithOuss && npm run dev
```

Vérifier dans le navigateur :
1. `/global` — Les 4 tabs ont des liens contextuels
2. `/today` — Tab prospection et relances ont des liens
3. `/crm` — Chaque prospect card a des liens
4. `/revenue` — KPIs et graphiques clickables
5. `/analytics` — Pipeline et closing clickables
6. `/clients` — Alertes avec liens relance
7. `/scoring` — Top prospects et grilles avec liens
8. `/map` — Départements et résultats avec liens
9. `/pipeline` — Stages et produits clickables
10. `/donnees` — KPIs liés aux pages sources

- [ ] **Step 4: Vérifier les query params fonctionnent**

Tester manuellement :
- `/crm?stage=rdv1` → scroll vers colonne RDV1
- `/today?tab=relances` → tab Relances active
- `/clients?alert=critical` → filtre alertes critiques
- `/map?dept=75` → département 75 pré-sélectionné

---

## Résumé des ~700 liens par catégorie

| Catégorie | Liens | Pages impactées |
|-----------|-------|-----------------|
| Drill-down KPI (click KPI → page source) | ~120 | global, today, donnees, revenue |
| Navigation contextuelle (footer + header) | ~150 | Toutes les 20 pages |
| Prospect/Client drill-down (nom → fiche) | ~80 | today, crm, scoring, pipeline, clients |
| Corrélation financière (CA ↔ closing ↔ clients) | ~60 | revenue, analytics, clients |
| Flux prospection (recherche → CRM → relance) | ~70 | tns, chefs, map, crm, today |
| Scoring/priorité (score → grilles → action) | ~50 | scoring, crm, map, today |
| Opérations (séquences → logs → config) | ~80 | sequences, auto, settings, tasks |
| Chaînage tertiaire (multi-page corrélations) | ~90 | Toutes pages (ajouts ciblés) |
| **TOTAL** | **~700** | **20+ pages** |
