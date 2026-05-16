# Fiches Prospect Complètes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter des fiches prospect complètes (modal PSG Cosmos) avec téléphone/email enrichis via Pappers, URL LinkedIn auto-générée, et nettoyer toutes les fausses données de la page Chefs d'entreprise en chargeant le vrai portefeuille depuis Supabase.

**Architecture:** Un composant `ProspectCard` partagé reçoit les données de base (SIREN, nom, ville) et enrichit lazily via `/api/enrichissement` (Pappers si clé dispo, fallback gracieux). Les deux pages (TNS + Chefs) ouvrent ce modal au clic sur un prospect. La page Chefs charge son portefeuille depuis `/api/prospects?source=chefs_entreprise` au mount, remplaçant les constantes hardcodées.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase, Pappers API v2 (optionnel), inline CSS via `C` de `src/lib/theme.ts`

---

## Fichiers concernés

| Fichier | Action | Responsabilité |
|---------|--------|----------------|
| `src/app/api/enrichissement/route.ts` | **Créer** | GET ?siren=&nom=&entreprise= → phone/email Pappers + LinkedIn URL |
| `src/components/prospects/ProspectCard.tsx` | **Créer** | Modal partagé PSG Cosmos avec enrichissement lazy |
| `src/app/(dashboard)/prospection/tns/page.tsx` | **Modifier** | Supprimer BASE_PROSPECTS affichés par défaut, ouvrir ProspectCard au clic |
| `src/app/(dashboard)/prospection/chefs-entreprise/page.tsx` | **Modifier** | Supprimer PORTEFEUILLE + MOCK_PIPELINE, charger Supabase, ouvrir ProspectCard |

---

### Task 1 : API d'enrichissement

**Fichiers :**
- Créer : `src/app/api/enrichissement/route.ts`

**Contexte :** Pappers API v2 endpoint : `GET https://api.pappers.fr/v2/entreprise?api_token=TOKEN&siren=SIREN`. Retourne `siege.telephone`, `dirigeants[0].email`, `site_internet`. Si PAPPERS_API_KEY absent/invalide → retourner null sans crash. LinkedIn URL toujours générée.

- [ ] **Step 1 : Créer le fichier**

```typescript
// src/app/api/enrichissement/route.ts
import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

type PappersEntreprise = {
  siege?: { telephone?: string }
  dirigeants?: Array<{ email?: string; telephone?: string; prenom?: string; nom?: string }>
  site_internet?: string
  nom_entreprise?: string
}

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { searchParams } = new URL(request.url)
  const siren = searchParams.get('siren') ?? ''
  const nom = searchParams.get('nom') ?? ''
  const entreprise = searchParams.get('entreprise') ?? ''

  let telephone: string | null = null
  let email: string | null = null
  let website: string | null = null
  let pappersSource = false

  // Enrichissement Pappers (optionnel — gracieux si clé absente/invalide)
  const pappersKey = process.env.PAPPERS_API_KEY
  if (pappersKey && siren) {
    try {
      const res = await fetch(
        `https://api.pappers.fr/v2/entreprise?api_token=${pappersKey}&siren=${siren}`,
        { cache: 'no-store' }
      )
      if (res.ok) {
        const p = await res.json() as PappersEntreprise
        telephone = p.siege?.telephone ?? p.dirigeants?.[0]?.telephone ?? null
        email = p.dirigeants?.[0]?.email ?? null
        website = p.site_internet ?? null
        pappersSource = true
      }
    } catch {
      // Pappers indisponible — continuer sans
    }
  }

  // URL LinkedIn — toujours générée
  const linkedinQuery = [nom, entreprise].filter(Boolean).join(' ')
  const linkedinUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(linkedinQuery)}&origin=SWITCH_SEARCH_TYPE`

  // URL Pages Jaunes de secours
  const pjUrl = siren
    ? `https://www.pagesjaunes.fr/annuaire/chercherlespros?quoiqui=${encodeURIComponent(entreprise || nom)}&ou=France`
    : null

  return apiSuccess({
    telephone,
    email,
    website,
    linkedinUrl,
    pagesJaunesUrl: pjUrl,
    pappersUrl: siren ? `https://www.pappers.fr/entreprise/${siren}` : null,
    source: pappersSource ? 'pappers' : 'generated',
  })
}
```

- [ ] **Step 2 : Vérifier TypeScript**

```powershell
cd C:\Users\Ted\Documents\GitHub\TedScaleWithOuss
npx tsc --noEmit 2>&1 | Select-String "enrichissement"
```

Attendu : aucune erreur sur ce fichier.

- [ ] **Step 3 : Commit**

```powershell
git add src/app/api/enrichissement/route.ts
git commit -m "feat: add /api/enrichissement — Pappers phone/email + LinkedIn URL generation"
```

---

### Task 2 : Composant ProspectCard

**Fichiers :**
- Créer : `src/components/prospects/ProspectCard.tsx`

**Contexte :** Modal PSG Cosmos (position fixed, backdrop dark). Reçoit des données de base, appelle `/api/enrichissement` au mount. Inline CSS uniquement via `C` de `@/lib/theme`. Boutons : LinkedIn (nouvel onglet), Pages Jaunes (nouvel onglet), Pappers (nouvel onglet), "Ajouter au CRM" (callback prop), "Fermer".

Type d'entrée :
```typescript
type ProspectCardData = {
  id: string | number
  nom: string
  entreprise?: string
  siren?: string | null
  metier?: string
  ville?: string
  codePostal?: string
  adresse?: string
  telephone?: string | null   // pré-rempli si dispo, sinon enrichi
  email?: string | null
  signal?: string
  signalLabel?: string
  score?: number
  scoreColor?: string
  source?: string
  googleUrl?: string
  mapsUrl?: string
}
```

- [ ] **Step 1 : Créer le dossier**

```powershell
New-Item -ItemType Directory -Force "C:\Users\Ted\Documents\GitHub\TedScaleWithOuss\src\components\prospects"
```

- [ ] **Step 2 : Créer le composant**

```typescript
// src/components/prospects/ProspectCard.tsx
'use client'

import { useEffect, useState } from 'react'
import { C } from '@/lib/theme'

export type ProspectCardData = {
  id: string | number
  nom: string
  entreprise?: string
  siren?: string | null
  metier?: string
  ville?: string
  codePostal?: string
  adresse?: string
  telephone?: string | null
  email?: string | null
  signal?: string
  signalLabel?: string
  score?: number
  scoreColor?: string
  source?: string
  googleUrl?: string
  mapsUrl?: string
}

type EnrichData = {
  telephone: string | null
  email: string | null
  website: string | null
  linkedinUrl: string
  pagesJaunesUrl: string | null
  pappersUrl: string | null
  source: string
}

type Props = {
  prospect: ProspectCardData
  onClose: () => void
  onAddToCRM?: (prospect: ProspectCardData) => void
}

export default function ProspectCard({ prospect, onClose, onAddToCRM }: Props) {
  const [enrich, setEnrich] = useState<EnrichData | null>(null)
  const [enrichLoading, setEnrichLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const params = new URLSearchParams()
        if (prospect.siren) params.set('siren', prospect.siren)
        params.set('nom', prospect.nom)
        if (prospect.entreprise) params.set('entreprise', prospect.entreprise)
        const res = await fetch(`/api/enrichissement?${params}`)
        const data = await res.json()
        if (data.success) setEnrich(data.data)
      } catch { /* ignore */ }
      finally { setEnrichLoading(false) }
    }
    load()
  }, [prospect.siren, prospect.nom, prospect.entreprise])

  const telephone = prospect.telephone ?? enrich?.telephone ?? null
  const email = prospect.email ?? enrich?.email ?? null
  const linkedinUrl = enrich?.linkedinUrl ?? `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(prospect.nom + ' ' + (prospect.entreprise ?? ''))}`
  const pagesJaunesUrl = enrich?.pagesJaunesUrl ?? null
  const pappersUrl = enrich?.pappersUrl ?? (prospect.siren ? `https://www.pappers.fr/entreprise/${prospect.siren}` : null)

  const initials = prospect.nom.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '??'
  const scoreColor = prospect.scoreColor ?? C.gold

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: C.bgMid, border: `1px solid ${C.line}`, borderRadius: 16, padding: 24, width: '100%', maxWidth: 480, position: 'relative', boxShadow: `0 0 40px ${C.indigo}22` }}
      >
        {/* Ribbon top */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: C.ribbon, borderRadius: '16px 16px 0 0' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20, marginTop: 8 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: `linear-gradient(135deg,${C.surface3},${C.surface2})`, border: `2px solid ${scoreColor}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Oswald,sans-serif', fontSize: 18, fontWeight: 700, color: scoreColor, flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 16, fontWeight: 600, color: C.textHi, marginBottom: 2 }}>{prospect.nom}</div>
            {prospect.entreprise && <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: C.textMid }}>{prospect.entreprise}</div>}
            {prospect.metier && <div style={{ fontSize: 11, color: C.textLo, marginTop: 2 }}>{prospect.metier}</div>}
          </div>
          {prospect.score !== undefined && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 13, fontWeight: 700, color: scoreColor }}>{Math.round(prospect.score * (prospect.score <= 1 ? 100 : 1))}
                {prospect.score <= 1 ? '%' : '/10'}
              </div>
              <div style={{ fontSize: 8, color: C.textLo, marginTop: 1 }}>Score</div>
            </div>
          )}
        </div>

        {/* Infos */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {prospect.siren && <InfoRow label="SIREN" value={prospect.siren} />}
          {(prospect.ville || prospect.codePostal) && <InfoRow label="Ville" value={[prospect.codePostal, prospect.ville].filter(Boolean).join(' ')} />}
          {prospect.adresse && <InfoRow label="Adresse" value={prospect.adresse} span />}
          {prospect.signalLabel && <InfoRow label="Signal" value={prospect.signalLabel} accent={scoreColor} />}
          {prospect.source && <InfoRow label="Source" value={prospect.source} />}
        </div>

        {/* Contact enrichi */}
        <div style={{ background: C.surface1, borderRadius: 10, padding: 12, marginBottom: 16, border: `1px solid ${C.lineSoft}` }}>
          <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 10, fontWeight: 500, color: C.textLo, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 10 }}>
            Contact {enrichLoading && <span style={{ color: C.indigo, fontSize: 9 }}>· chargement…</span>}
          </div>
          <ContactRow icon="📞" label="Téléphone" value={telephone} fallbackUrl={pagesJaunesUrl} fallbackLabel="Pages Jaunes" />
          <ContactRow icon="✉" label="Email" value={email} />
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' as const }}>
            <ExternalBtn href={linkedinUrl} label="LinkedIn" color={C.indigo} />
            {pagesJaunesUrl && <ExternalBtn href={pagesJaunesUrl} label="Pages Jaunes" color={C.gold} />}
            {pappersUrl && <ExternalBtn href={pappersUrl} label="Pappers" color={C.textMid} />}
            {prospect.googleUrl && <ExternalBtn href={prospect.googleUrl} label="Google" color={C.textLo} />}
            {prospect.mapsUrl && <ExternalBtn href={prospect.mapsUrl} label="Maps" color={C.green} />}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          {onAddToCRM && (
            <button
              onClick={() => { onAddToCRM(prospect); onClose() }}
              style={{ flex: 1, padding: '10px 0', borderRadius: 8, background: `linear-gradient(90deg,${C.indigo}33,${C.surface3})`, border: `1px solid ${C.indigo}66`, color: C.indigo, fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.1em' }}
            >
              + AJOUTER AU CRM
            </button>
          )}
          <button
            onClick={onClose}
            style={{ padding: '10px 16px', borderRadius: 8, background: C.surface1, border: `1px solid ${C.line}`, color: C.textLo, fontFamily: 'Oswald,sans-serif', fontSize: 11, cursor: 'pointer' }}
          >
            FERMER
          </button>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value, accent, span }: { label: string; value: string; accent?: string; span?: boolean }) {
  return (
    <div style={{ gridColumn: span ? '1 / -1' : undefined }}>
      <div style={{ fontSize: 8, color: C.textVlo, textTransform: 'uppercase' as const, letterSpacing: '0.12em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: accent ?? C.textMid }}>{value}</div>
    </div>
  )
}

function ContactRow({ icon, label, value, fallbackUrl, fallbackLabel }: { icon: string; label: string; value: string | null; fallbackUrl?: string | null; fallbackLabel?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
      <span style={{ fontSize: 12, width: 18 }}>{icon}</span>
      <span style={{ fontSize: 9, color: C.textLo, width: 64 }}>{label}</span>
      {value
        ? <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 11, color: C.textHi }}>{value}</span>
        : fallbackUrl
          ? <a href={fallbackUrl} target="_blank" rel="noreferrer" style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.indigo, textDecoration: 'none' }}>Rechercher sur {fallbackLabel} →</a>
          : <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: C.textVlo }}>—</span>
      }
    </div>
  )
}

function ExternalBtn({ href, label, color }: { href: string; label: string; color: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      style={{ padding: '4px 10px', borderRadius: 6, background: color + '15', border: `1px solid ${color}40`, color, fontFamily: 'JetBrains Mono,monospace', fontSize: 8, fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }}
    >
      {label} ↗
    </a>
  )
}
```

- [ ] **Step 3 : Vérifier TypeScript**

```powershell
npx tsc --noEmit 2>&1 | Select-String "ProspectCard"
```

Attendu : aucune erreur TypeScript.

- [ ] **Step 4 : Commit**

```powershell
git add src/components/prospects/ProspectCard.tsx
git commit -m "feat: add ProspectCard modal — enriched contact, LinkedIn/Pappers/PJ links"
```

---

### Task 3 : Intégration TNS — ProspectCard au clic, supprimer l'affichage par défaut des faux prospects

**Fichiers :**
- Modifier : `src/app/(dashboard)/prospection/tns/page.tsx`

**Contexte :** La page a deux zones : (1) `prospects` state initialisé avec `BASE_PROSPECTS` (13 faux) toujours affiché, (2) `searchResults` affiché après recherche. On doit : supprimer l'affichage de `BASE_PROSPECTS` par défaut (ils restent en état mais ne s'affichent que si l'utilisateur en a ajouté via "Tout ajouter"), et ouvrir ProspectCard quand on clique sur un résultat de recherche ou un prospect du tableau.

- [ ] **Step 1 : Ajouter l'import et le state de card**

Trouver et modifier dans `src/app/(dashboard)/prospection/tns/page.tsx` :

Après la ligne `'use client'` et les imports existants, ajouter :
```typescript
import ProspectCard, { type ProspectCardData } from '@/components/prospects/ProspectCard'
```

Dans `export default function TnsPage()`, ajouter après les useState existants :
```typescript
const [selectedProspect, setSelectedProspect] = useState<ProspectCardData | null>(null)
```

- [ ] **Step 2 : Supprimer l'affichage par défaut de BASE_PROSPECTS**

Localiser la section qui rend le tableau de `prospects` (filtré par `activeFilter`). Remplacer l'affichage du tableau par une condition : si `prospects` contient uniquement les BASE_PROSPECTS non modifiés (state initial), afficher un état vide encourageant la recherche. Implémenter en ajoutant un flag :

Changer l'init state :
```typescript
const [hasUserProspects, setHasUserProspects] = useState(false)
```

Dans `addAllToProspection()`, après `setProspects(prev => [...asProspects, ...prev])`, ajouter :
```typescript
setHasUserProspects(true)
```

Dans le JSX, trouver le bloc qui rend le tableau des prospects et le conditionner :
```tsx
{hasUserProspects ? (
  /* tableau existant avec prospects.filter(...).map(...) */
) : (
  <div style={{ textAlign: 'center', padding: '48px 0', color: C.textLo }}>
    <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
    <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 14, color: C.textMid, marginBottom: 6 }}>Aucun prospect ajouté</div>
    <div style={{ fontSize: 11, color: C.textLo }}>Lancez une recherche et cliquez "Tout ajouter" pour remplir votre liste</div>
  </div>
)}
```

- [ ] **Step 3 : Ouvrir ProspectCard sur clic (résultats de recherche)**

Dans le `.map((r, i) => ...)` qui rend les `searchResults`, trouver la `<div>` racine de chaque ligne et ajouter :
```tsx
onClick={() => setSelectedProspect({
  id: r.id,
  nom: r.nom,
  entreprise: r.entreprise,
  siren: r.siren,
  metier: r.metier,
  ville: r.ville,
  codePostal: r.codePostal,
  adresse: r.adresse,
  telephone: r.telephone,
  email: r.email,
  score: r.score,
  source: r.source,
  googleUrl: r.googleUrl,
  mapsUrl: r.mapsUrl,
})}
style={{ ...(existingStyle), cursor: 'pointer' }}
```

- [ ] **Step 4 : Rendre la ProspectCard et gérer "Ajouter au CRM" depuis la card**

À la fin du JSX retourné, avant le `</>` fermant, ajouter :
```tsx
{selectedProspect && (
  <ProspectCard
    prospect={selectedProspect}
    onClose={() => setSelectedProspect(null)}
    onAddToCRM={async (p) => {
      await fetch('/api/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: p.nom,
          company: p.entreprise ?? '',
          profession: p.metier ?? '',
          city: p.ville ?? '',
          phone: p.telephone ?? '',
          email: p.email ?? '',
          source: 'tns',
          notes: p.adresse ? `Adresse: ${p.adresse}` : '',
        }),
      })
    }}
  />
)}
```

- [ ] **Step 5 : Vérifier TypeScript et build**

```powershell
npx tsc --noEmit 2>&1 | Select-String "error TS"
```

Attendu : 0 erreurs.

- [ ] **Step 6 : Commit**

```powershell
git add src/app/(dashboard)/prospection/tns/page.tsx
git commit -m "feat(tns): ProspectCard on click, hide mock default list, empty state"
```

---

### Task 4 : Nettoyage Chefs — supprimer les fausses données, charger Supabase, ProspectCard

**Fichiers :**
- Modifier : `src/app/(dashboard)/prospection/chefs-entreprise/page.tsx`

**Contexte :**
- `PORTEFEUILLE` (6 chefs mockés) → remplacé par `/api/prospects?source=chefs_entreprise&limit=50` au mount
- `MOCK_PIPELINE` → supprimé (la page Acquisition/Pipeline n'utilisera que les données du workflow réel)
- Tab "Portefeuille Actuel" → charge depuis Supabase
- Tab "Acquisition" → workflow real (déjà fonctionnel) + ProspectCard sur les leads

Le type `Chef` actuel a des champs qui n'existent pas en DB (`role`, `ca`, `aum`, `rdv`, `avatarBg`, `avatarColor`). On crée un type DB-compatible :
```typescript
type SupabaseProspect = {
  id: string
  full_name: string
  company?: string
  city?: string
  phone?: string
  email?: string
  profession?: string
  pipeline_stage?: string
  notes?: string
  source?: string
}
```

- [ ] **Step 1 : Ajouter les imports**

En haut du fichier, ajouter :
```typescript
import { useEffect } from 'react'
import ProspectCard, { type ProspectCardData } from '@/components/prospects/ProspectCard'
```

- [ ] **Step 2 : Supprimer PORTEFEUILLE et MOCK_PIPELINE**

Supprimer les constantes `PORTEFEUILLE` (lignes ~66-72) et `MOCK_PIPELINE` (lignes ~75-92). Supprimer également le type `Chef` et remplacer par `SupabaseProspect`.

Ajouter le type :
```typescript
type SupabaseProspect = {
  id: string
  full_name: string
  company?: string | null
  city?: string | null
  phone?: string | null
  email?: string | null
  profession?: string | null
  pipeline_stage?: string | null
  notes?: string | null
  source?: string | null
}
```

- [ ] **Step 3 : Mettre à jour le state**

Dans `export default function ChefsEntreprisePage()`, remplacer :
```typescript
const [chefs, setChefs] = useState<Chef[]>(PORTEFEUILLE)
```
par :
```typescript
const [chefs, setChefs] = useState<SupabaseProspect[]>([])
const [chefsLoading, setChefsLoading] = useState(true)
const [selectedProspect, setSelectedProspect] = useState<ProspectCardData | null>(null)
```

- [ ] **Step 4 : Charger depuis Supabase au mount**

Ajouter juste après les déclarations de state :
```typescript
useEffect(() => {
  async function loadChefs() {
    try {
      const res = await fetch('/api/prospects?source=chefs_entreprise&limit=50')
      const data = await res.json()
      if (data.success) setChefs(data.data ?? [])
    } catch { /* silently */ }
    finally { setChefsLoading(false) }
  }
  loadChefs()
}, [])
```

Note : `/api/prospects` n'a pas de filtre `source` actuellement. Modifier temporairement pour accepter `?source=` dans la query string en ajoutant dans le GET de `src/app/api/prospects/route.ts` :
```typescript
const source = searchParams.get('source')
// après les filtres existants :
if (source) {
  query = query.eq('source', source)
}
```

- [ ] **Step 5 : Adapter le rendu du Portefeuille**

Remplacer le rendu de `filtered` (chefs filtrés et mappés vers des cartes) par un rendu basé sur `SupabaseProspect`. Chaque card affiche :
- Initiales calculées depuis `full_name`
- `full_name` comme nom
- `company` comme entreprise
- `city` comme ville
- `pipeline_stage` comme badge de statut
- Bouton "Fiche" qui ouvre `setSelectedProspect({...})`

```tsx
{chefsLoading ? (
  <div style={{ color: C.textLo, fontSize: 12, padding: 24, textAlign: 'center' }}>Chargement…</div>
) : chefs.length === 0 ? (
  <div style={{ textAlign: 'center', padding: '48px 0', color: C.textLo }}>
    <div style={{ fontSize: 32, marginBottom: 12 }}>👔</div>
    <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 14, color: C.textMid, marginBottom: 6 }}>Portefeuille vide</div>
    <div style={{ fontSize: 11, color: C.textLo }}>Ajoutez des leads depuis l'onglet Acquisition</div>
  </div>
) : (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    {chefs.filter(c => !search || c.full_name.toLowerCase().includes(search.toLowerCase()) || (c.company ?? '').toLowerCase().includes(search.toLowerCase())).map(c => {
      const initials = c.full_name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
      const stageColor: Record<string, string> = { converti: '#4ade80', rdv2: '#e8c878', rdv1: '#7a92e8', a_contacter: '#7a92e8', perdu: '#ff6470' }
      const color = stageColor[c.pipeline_stage ?? ''] ?? C.indigo
      return (
        <div key={c.id} onClick={() => setSelectedProspect({ id: c.id, nom: c.full_name, entreprise: c.company ?? undefined, ville: c.city ?? undefined, telephone: c.phone ?? null, email: c.email ?? null, source: c.source ?? undefined })} style={{ background: C.surface1, borderRadius: 10, padding: 12, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', border: `1px solid ${C.lineSoft}` }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: color + '22', border: `1px solid ${color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Oswald,sans-serif', fontSize: 13, fontWeight: 700, color, flexShrink: 0 }}>{initials}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 600, color: C.textHi }}>{c.full_name}</div>
            <div style={{ fontSize: 9, color: C.textLo }}>{[c.company, c.city].filter(Boolean).join(' · ')}</div>
          </div>
          {c.pipeline_stage && <span style={{ fontSize: 8, padding: '2px 7px', borderRadius: 5, background: color + '20', color, border: `1px solid ${color}44` }}>{c.pipeline_stage}</span>}
        </div>
      )
    })}
  </div>
)}
```

- [ ] **Step 6 : Ouvrir ProspectCard sur les leads workflow**

Dans le rendu des `workflowLeads` (onglet Tableau), ajouter `onClick` sur chaque ligne lead :
```tsx
onClick={() => setSelectedProspect({
  id: lead.id,
  nom: lead.nom,
  siren: lead.siren,
  ville: lead.ville,
  codePostal: lead.codePostal,
  signal: lead.signal,
  signalLabel: lead.signalLabel,
  score: lead.score,
  scoreColor: lead.scoreColor,
  source: 'Data.gouv',
})}
```

- [ ] **Step 7 : Rendre ProspectCard**

À la fin du JSX retourné, avant le `</>` fermant :
```tsx
{selectedProspect && (
  <ProspectCard
    prospect={selectedProspect}
    onClose={() => setSelectedProspect(null)}
    onAddToCRM={async (p) => {
      await fetch('/api/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: p.nom,
          company: p.entreprise ?? '',
          city: p.ville ?? '',
          phone: p.telephone ?? '',
          email: p.email ?? '',
          source: 'chefs_entreprise',
          notes: p.signalLabel ? `Signal: ${p.signalLabel}` : '',
        }),
      })
      // Rafraîchir le portefeuille après ajout
      const res = await fetch('/api/prospects?source=chefs_entreprise&limit=50')
      const data = await res.json()
      if (data.success) setChefs(data.data ?? [])
    }}
  />
)}
```

- [ ] **Step 8 : Supprimer le type Chef et les refs restantes**

Rechercher et supprimer tout usage du type `Chef` et des constantes `PORTEFEUILLE`/`MOCK_PIPELINE` restantes. Remplacer `stats.contacts` par `chefs.length`, `stats.enCours` par `chefs.filter(c => c.pipeline_stage === 'rdv1' || c.pipeline_stage === 'rdv2').length`, etc.

- [ ] **Step 9 : Vérifier TypeScript + build complet**

```powershell
npx tsc --noEmit 2>&1 | Select-String "error TS"
npm run build 2>&1 | tail -20
```

Attendu : 0 erreur TypeScript, build vert.

- [ ] **Step 10 : Commit**

```powershell
git add src/app/(dashboard)/prospection/chefs-entreprise/page.tsx src/app/api/prospects/route.ts
git commit -m "feat(chefs): remove mock data, load Supabase portfolio, ProspectCard on leads"
```

---

### Task 5 : Déploiement et validation

- [ ] **Step 1 : Deploy**

```powershell
.\deploy-cloudrun.ps1 -ProjectId integration-make-365608
```

Attendu : `=== DEPLOY TERMINE ===`, révision > 00011.

- [ ] **Step 2 : Valider TNS en production**

- Naviguer `/prospection/tns` → lancer une recherche
- Cliquer sur un résultat → modal ProspectCard s'ouvre
- Vérifier : spinner "chargement…" puis contact enrichi (ou "—" si Pappers indispo)
- Bouton "LinkedIn ↗" s'ouvre dans un nouvel onglet avec la recherche pré-remplie

- [ ] **Step 3 : Valider Chefs en production**

- Naviguer `/prospection/chefs-entreprise`
- Tab "Portefeuille Actuel" : affiche les vrais prospects Supabase (ou état vide si aucun)
- Tab "Acquisition" → lancer un workflow → cliquer un lead → modal ProspectCard

- [ ] **Step 4 : Commit final si corrections mineures**

```powershell
git add -A
git commit -m "fix: post-deploy adjustments prospection cards"
```
