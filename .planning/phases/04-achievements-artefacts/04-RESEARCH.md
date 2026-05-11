# Phase 4 : Achievements & Artefacts — Research

**Date de recherche :** 2026-05-11
**Domaine :** Gamification, persistance Supabase, animations visuelles, notifications React
**Confiance globale :** HIGH

---

## Résumé

Phase 4 ajoute un système de récompenses visuelles (badges, célébrations) et un historique des succès au dashboard CGP. L'objectif est de déclencher une animation fire/confetti quand l'objectif CA mensuel est atteint, d'afficher des badges lors de seuils de clients actifs (10, 25, 50), et de persister ces achievements en BDD pour éviter tout re-déclenchement.

**Bonne nouvelle #1 :** Les assets de célébration (`public/celebrations.js` + `public/celebrations.css`) existent déjà dans le projet. Ils exposent une API `window.Celebrations.*` complète avec confetti, feu, feux d'artifice, flares, et bannière BUUUT/OBJECTIF. Zero nouvelle dépendance pour l'animation.

**Bonne nouvelle #2 :** La table `user_settings` stocke déjà `ca_monthly_target`. L'API `/api/revenue/stats` retourne déjà `caCurrentMonth`, `objectiveMonth` et `clientCount`. La détection des achievements est donc une comparaison côté serveur sans nouveau code de données.

**Décision principale :** Une nouvelle table `achievements` en Supabase (migration 006), un hook `useAchievements`, une API route `/api/achievements`, et un composant `AchievementsProvider` dans le layout dashboard déclenchant les célébrations via `window.dispatchEvent`.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Support de recherche |
|----|-------------|----------------------|
| ACH-01 | Badge + notification visuelle quand objectif CA mensuel atteint | `/api/revenue/stats` retourne `caCurrentMonth` + `objectiveMonth` — comparaison directe |
| ACH-02 | Animation fire/confetti lors de l'atteinte de l'objectif CA (une seule fois) | `public/celebrations.js` + `public/celebrations.css` déjà présents — `Celebrations.celebrateAll()` |
| ACH-03 | Badge lors de seuils de clients actifs (10, 25, 50) | `/api/revenue/stats` retourne `clientCount` — seuils hardcodés comme constantes |
| ACH-04 | Timeline des objectifs atteints avec dates | Nouvelle table `achievements` + page `/achievements` ou drawer |
| ACH-05 | Achievements persistés en BDD — ne se re-déclenchent pas | Clé unique `(user_id, achievement_key)` dans table `achievements` |
</phase_requirements>

---

## Carte des Responsabilités Architecturales

| Capacité | Tier Principal | Tier Secondaire | Rationale |
|----------|---------------|-----------------|-----------|
| Détection atteinte objectif | API (Server) | — | Comparaison `caCurrentMonth >= objectiveMonth` en route Next.js — pas côté client |
| Persistance achievement | Database (Supabase) | API | INSERT unique `ON CONFLICT DO NOTHING` — anti-doublon natif PostgreSQL |
| Déclenchement animation | Browser (Client) | — | `window.Celebrations.*` est une API DOM — ne peut s'exécuter que côté client |
| Affichage badge en sidebar | Browser (Client) | — | Composant React dans layout `(dashboard)` |
| Timeline des succès | Browser (Client) | API | Page `/achievements` fetch depuis `/api/achievements` |
| Anti-re-déclenchement | Database (Supabase) | — | Contrainte `UNIQUE(user_id, achievement_key)` — pas de logique applicative |

---

## Stack Standard

### Core (déjà installé — aucune nouvelle dépendance)

| Librairie | Version | Usage | Statut |
|-----------|---------|-------|--------|
| `public/celebrations.js` | N/A (asset projet) | Animations fire/confetti/fireworks | [VERIFIED: glob projet] |
| `public/celebrations.css` | N/A (asset projet) | Styles des effets visuels | [VERIFIED: glob projet] |
| Supabase JS | ^2.105.4 | Persistance achievements | [VERIFIED: package.json] |
| Sonner | ^2.0.7 | Toast notification badge | [VERIFIED: package.json] |
| Zustand | ^5.0.13 | Store global achievements (optionnel) | [VERIFIED: package.json] |
| Next.js 15 | ^15.5.18 | App Router, API routes | [VERIFIED: package.json] |

### Pas nécessaire pour cette phase

| Librairie | Raison de l'exclusion |
|-----------|----------------------|
| canvas-confetti | `celebrations.js` fait déjà tout en vanilla JS sans dépendance |
| react-confetti | Idem — surcharge inutile |
| framer-motion | Le CSS dans `celebrations.css` gère toutes les animations |

---

## Schéma Supabase — Analyse existante

### Tables existantes pertinentes

**Pas de table `achievements` dans les migrations 001–005.** [VERIFIED: lecture de toutes les migrations]

La table `user_settings` (migration 001) contient :
- `ca_monthly_target` — objectif CA mensuel de l'utilisateur [VERIFIED]
- `ca_annual_target` — objectif CA annuel [VERIFIED]

La vue `v_monthly_revenue` + route `/api/revenue/stats` retourne déjà :
- `caCurrentMonth` — CA du mois en cours [VERIFIED]
- `objectiveMonth` — objectif du mois en cours [VERIFIED]
- `clientCount` — nombre total de clients [VERIFIED]

### Nouvelle migration requise : 006_achievements.sql

```sql
-- Migration 006 : Achievements & Artefacts (Phase 4)

CREATE TABLE achievements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Clé métier unique par type d'achievement
  -- Exemples : 'ca_monthly_2026_05', 'clients_10', 'clients_25', 'clients_50'
  achievement_key  text NOT NULL,
  
  -- Type pour grouper dans la timeline
  achievement_type text NOT NULL CHECK (achievement_type IN ('ca_monthly', 'clients_milestone')),
  
  -- Données contextuelles au moment du déclenchement
  label       text NOT NULL,          -- ex : "Objectif CA Mai 2026 atteint"
  value       numeric,                -- CA atteint ou nb clients
  target      numeric,                -- Objectif visé
  
  -- Timestamp du succès
  achieved_at timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  
  -- Anti-doublon : un achievement par clé par utilisateur
  UNIQUE (user_id, achievement_key)
);

CREATE INDEX idx_achievements_user_id ON achievements(user_id);
CREATE INDEX idx_achievements_achieved_at ON achievements(achieved_at DESC);
```

**Stratégie anti-doublon (ACH-05) :** `INSERT ... ON CONFLICT (user_id, achievement_key) DO NOTHING`. Si l'achievement existe déjà, la requête retourne 0 lignes insérées sans erreur. La logique applicative vérifie `rowsAffected === 0` pour ne pas déclencher la célébration.

---

## Architecture Patterns

### Flux de détection et déclenchement

```
Chargement page dashboard (layout.tsx)
  │
  ├─► AchievementsProvider (Client Component)
  │     │
  │     ├─► fetch('/api/achievements/check')  ← Route POST
  │     │     │
  │     │     ├─► Récupère caCurrentMonth, objectiveMonth, clientCount
  │     │     │   (réutilise la logique de /api/revenue/stats)
  │     │     │
  │     │     ├─► Tente INSERT achievements pour chaque condition remplie
  │     │     │   ON CONFLICT DO NOTHING
  │     │     │
  │     │     └─► Retourne : { newAchievements: Achievement[] }
  │     │
  │     └─► Si newAchievements.length > 0 :
  │           ├─► toast.success("Badge débloqué !") via Sonner
  │           └─► window.dispatchEvent(new CustomEvent('celebrate:all'))
  │               → Celebrations.celebrateAll() s'exécute
  │
  └─► Badge visuel dans sidebar (si achievements récents < 7j)
```

### Structure de fichiers recommandée

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── achievements/
│   │   │   └── page.tsx          # Timeline des succès (ACH-04)
│   │   └── layout.tsx            # Ajouter <AchievementsProvider> ici
│   └── api/
│       └── achievements/
│           ├── route.ts           # GET — liste achievements
│           └── check/
│               └── route.ts      # POST — vérifie + insère nouveaux achievements
├── components/
│   └── achievements/
│       ├── AchievementsProvider.tsx  # 'use client' — détection + célébration
│       └── AchievementBadge.tsx      # Badge affiché dans sidebar
└── hooks/
    └── useAchievements.ts            # fetch + state achievements
```

### Pattern 1 : Route POST /api/achievements/check

```typescript
// src/app/api/achievements/check/route.ts
// Source : [ASSUMED] — pattern cohérent avec /api/settings et /api/revenue/stats existants

import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

const CLIENT_MILESTONES = [10, 25, 50] as const

export async function POST(_request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  // 1. Récupérer les données KPI actuelles
  const [revenueRes, clientsRes] = await Promise.all([
    supabase.from('v_monthly_revenue')
      .select('revenue')
      .eq('user_id', user.id)
      .eq('year', year)
      .eq('month_num', month)
      .single(),
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
  ])

  const { data: settingsData } = await supabase
    .from('user_settings').select('ca_monthly_target').eq('id', user.id).single()

  const caCurrentMonth = Number(revenueRes.data?.revenue ?? 0)
  const caTarget = Number(settingsData?.ca_monthly_target ?? 15000)
  const clientCount = clientsRes.count ?? 0

  const newAchievements: Achievement[] = []

  // 2. Vérifier objectif CA mensuel
  if (caCurrentMonth >= caTarget && caTarget > 0) {
    const key = `ca_monthly_${year}_${String(month).padStart(2, '0')}`
    const { data } = await supabase.from('achievements').insert({
      user_id: user.id,
      achievement_key: key,
      achievement_type: 'ca_monthly',
      label: `Objectif CA ${MONTH_LABELS[month - 1]} ${year} atteint`,
      value: caCurrentMonth,
      target: caTarget,
    }).select().single()
    // Si data non null → nouvel achievement (ON CONFLICT DO NOTHING retournerait null)
    if (data) newAchievements.push(data)
  }

  // 3. Vérifier seuils clients actifs
  for (const milestone of CLIENT_MILESTONES) {
    if (clientCount >= milestone) {
      const key = `clients_${milestone}`
      const { data } = await supabase.from('achievements').insert({
        user_id: user.id,
        achievement_key: key,
        achievement_type: 'clients_milestone',
        label: `${milestone} clients actifs`,
        value: clientCount,
        target: milestone,
      }).select().single()
      if (data) newAchievements.push(data)
    }
  }

  return apiSuccess({ newAchievements })
}
```

**Note sur l'INSERT/ON CONFLICT :** Supabase JS v2 — pour un INSERT qui ne doit pas erreur sur doublon, utiliser `upsert` avec `ignoreDuplicates: true` ou vérifier le code d'erreur `23505` (unique_violation). L'approche recommandée ici est de tenter l'insert et d'ignorer l'erreur `23505`. [ASSUMED — vérifier comportement exact supabase-js v2 insert + unique constraint]

### Pattern 2 : AchievementsProvider — déclenchement célébration

```typescript
// src/components/achievements/AchievementsProvider.tsx
'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

export function AchievementsProvider() {
  const checked = useRef(false)

  useEffect(() => {
    // Ne checker qu'une seule fois par session (pas de polling)
    if (checked.current) return
    checked.current = true

    fetch('/api/achievements/check', { method: 'POST' })
      .then(r => r.json())
      .then(({ data }) => {
        if (!data?.newAchievements?.length) return

        data.newAchievements.forEach((a: Achievement) => {
          toast.success(`Badge débloqué : ${a.label}`, {
            duration: 6000,
            icon: '🏆',
          })
        })

        // Déclencher la célébration visuelle (assets déjà chargés)
        window.dispatchEvent(new CustomEvent('celebrate:all', {
          detail: { text: 'OBJECTIF !' }
        }))
      })
      .catch(() => {/* silencieux — ne pas bloquer le dashboard */})
  }, [])

  return null  // Composant invisible — side effects only
}
```

### Pattern 3 : Chargement des assets Celebrations dans le layout

Le layout `(dashboard)/layout.tsx` est un Server Component (malgré le `'use client'` actuel — vérifier). Les scripts vanilla JS dans `public/` doivent être chargés via `<Script>` de Next.js :

```typescript
// Dans layout.tsx, ajouter en haut du return :
import Script from 'next/script'

// Dans le JSX, avant </> :
<Script src="/celebrations.js" strategy="lazyOnload" />
```

**`strategy="lazyOnload"`** : le script se charge après que la page est interactive — idéal pour des effets non-critiques. [VERIFIED: docs Next.js Script component]

**Alternative si layout déjà 'use client' :** useEffect avec injection dynamique de `<script>` dans `document.head` — mais `<Script>` Next.js est préférable pour le caching et la déduplication.

### Pattern 4 : Page Timeline /achievements (ACH-04)

```typescript
// src/app/(dashboard)/achievements/page.tsx
// Affiche les achievements triés par achieved_at DESC
// Aucun graphique nécessaire — liste stylée avec dates et labels
// Pattern identique à la page settings (fetch au montage, inline CSS C.*)
```

---

## Détection des seuils — Logique métier

### Seuil CA mensuel (ACH-01, ACH-02)

- **Source données :** `v_monthly_revenue` (vue Supabase existante) + `user_settings.ca_monthly_target`
- **Condition :** `caCurrentMonth >= caTarget && caTarget > 0`
- **Clé achievement :** `ca_monthly_YYYY_MM` (ex : `ca_monthly_2026_05`)
- **Granularité :** Par mois — se redéclenche chaque mois si l'objectif est atteint à nouveau [ASSUMED — à valider avec utilisateur]
- **Cas zéro :** Si `caTarget === 0` ou null → ne pas déclencher (éviter des faux positifs au démarrage)

### Seuils clients actifs (ACH-03)

- **Source données :** `COUNT(*) FROM clients WHERE user_id = ?`
- **Seuils :** `[10, 25, 50]` — constants hardcodées (pas configurables en v1)
- **Clé achievement :** `clients_10`, `clients_25`, `clients_50`
- **Permanents :** Une fois atteint, jamais re-déclenché (même si le nombre descend) — garanti par `UNIQUE(user_id, achievement_key)`

---

## Ne Pas Hand-Roller

| Problème | Ne pas construire | Utiliser plutôt | Pourquoi |
|----------|-------------------|-----------------|----------|
| Animations feu/confetti | Animation React custom | `public/celebrations.js` | Déjà présent, testé, performant (vanilla JS, aucune dépendance) |
| Anti-doublon achievements | Flag en localStorage ou React state | Contrainte UNIQUE PostgreSQL | localStorage vidé au rechargement — contredit ACH-05 |
| Polling temps réel | setInterval fetch | Check unique au montage du Provider | Outil usage solo — pas besoin de temps réel multi-onglets |
| Notification toast | Composant custom | Sonner (déjà installé) | Déjà utilisé dans tout le dashboard |

---

## Pièges Courants

### Piège 1 : Re-déclenchement après rechargement (ACH-05)

**Ce qui va mal :** Stocker `hasTriggered` dans useState ou localStorage — l'état est perdu au rechargement.
**Pourquoi :** React state = mémoire de session. localStorage = vidé si l'utilisateur efface les données navigateur.
**Comment éviter :** La table `achievements` avec `UNIQUE(user_id, achievement_key)` est la seule source de vérité. Le check POST `/api/achievements/check` retourne 0 nouveaux achievements si déjà persistés.
**Signe d'alerte :** Si la célébration se déclenche à chaque rechargement → la contrainte UNIQUE n'est pas appliquée ou l'INSERT n'utilise pas `ON CONFLICT DO NOTHING`.

### Piège 2 : celebrations.js chargé côté serveur

**Ce qui va mal :** Importer `celebrations.js` comme module ES dans un composant React → `window is not defined` côté serveur.
**Pourquoi :** Next.js 15 exécute les Server Components sans accès DOM.
**Comment éviter :** Utiliser `<Script src="/celebrations.js" strategy="lazyOnload" />` dans le layout, ou `window.dispatchEvent(...)` dans un `useEffect` uniquement. Ne jamais importer le fichier directement.
**Signe d'alerte :** `ReferenceError: window is not defined` au build ou au premier rendu.

### Piège 3 : INSERT supabase-js + contrainte UNIQUE

**Ce qui va mal :** `supabase.from('achievements').insert(...)` lève une erreur code `23505` sur doublon au lieu de retourner silencieusement.
**Pourquoi :** supabase-js v2 propage les erreurs PostgreSQL telles quelles.
**Comment éviter :** Utiliser `upsert(..., { ignoreDuplicates: true })` OU vérifier `error?.code === '23505'` et le traiter comme succès (pas de nouvel achievement). Ne pas utiliser `.throwOnError()`.
**Signe d'alerte :** Erreur console côté serveur lors du deuxième chargement du dashboard.

### Piège 4 : celebrations.js chargé avant que le DOM soit prêt

**Ce qui va mal :** `window.dispatchEvent(new CustomEvent('celebrate:all'))` est appelé avant que `celebrations.js` ait fini de s'initialiser → aucun listener enregistré.
**Pourquoi :** `strategy="lazyOnload"` charge le script après l'hydratation — race condition possible si `AchievementsProvider` se monte et appelle `dispatchEvent` trop tôt.
**Comment éviter :** Vérifier `typeof window.Celebrations !== 'undefined'` avant dispatch, ou ajouter un petit délai (`setTimeout(..., 500)`). Alternativement, utiliser `strategy="beforeInteractive"` — mais ce n'est pas recommandé pour un effet optionnel.

### Piège 5 : Détection CA — objectif à zéro

**Ce qui va mal :** Si l'utilisateur n'a pas configuré `ca_monthly_target` (valeur par défaut `15000` en DB), le check se déclenche dès que le CA dépasse 15k€ sans que l'utilisateur en soit conscient.
**Comment éviter :** Comportement attendu (valeur par défaut correcte). Documenter dans l'UI que le seuil par défaut est 15 000 €.

---

## Exemples de Code

### Chargement Script Celebrations dans layout

```typescript
// Source : docs Next.js Script (lazyOnload strategy)
import Script from 'next/script'

// Dans le JSX du layout :
<Script src="/celebrations.js" strategy="lazyOnload" />
```

### INSERT avec gestion doublon — supabase-js v2

```typescript
// Source : [ASSUMED — pattern supabase-js v2 upsert ignoreDuplicates]
const { data, error } = await supabase
  .from('achievements')
  .upsert(
    { user_id, achievement_key, achievement_type, label, value, target },
    { onConflict: 'user_id,achievement_key', ignoreDuplicates: true }
  )
  .select()
  .single()

// data === null si doublon (ignoreDuplicates: true retourne null si pas d'insert)
const isNew = data !== null
```

### Dispatch événement célébration (dans useEffect uniquement)

```typescript
// Source : public/celebrations.js — API documentée en en-tête du fichier [VERIFIED]
useEffect(() => {
  window.dispatchEvent(new CustomEvent('celebrate:all', {
    detail: { text: 'OBJECTIF !' }
  }))
}, []) // Dépendance vide — ne s'exécute qu'une fois côté client
```

### Fetch liste achievements pour la timeline (ACH-04)

```typescript
// GET /api/achievements — retourne achievements triés par achieved_at DESC
const { data } = await supabase
  .from('achievements')
  .select('*')
  .eq('user_id', user.id)
  .order('achieved_at', { ascending: false })
```

---

## Où afficher la timeline (ACH-04) — Analyse

**Option A : Nouvelle page `/achievements`** (recommandée)
- Cohérent avec le pattern des autres pages du dashboard
- Lien existant dans la sidebar : `{ id: 'champions', href: '/champions', label: '🏆 Champions' }` — cette route existe déjà dans le nav. La page `/achievements` peut soit remplacer `/champions` soit coexister.
- Avantage : URL partageable, navigation claire

**Option B : Drawer dans la sidebar**
- Plus complexe (state global, portail React)
- Moins cohérent avec le reste du dashboard qui utilise des pages complètes

**Décision :** Option A — page `/achievements` (nouvelle route sous `(dashboard)`). Vérifier si `/champions` est déjà implémenté.

---

## Où placer AchievementsProvider dans le layout

Le layout `(dashboard)/layout.tsx` contient déjà `<Toaster theme="dark" position="bottom-right" richColors />` (ligne 434). [VERIFIED]

Le layout utilise `'use client'` (ligne 1). [VERIFIED]

Ajouter `<AchievementsProvider />` juste avant `</> ` final, après `<Toaster />`. Le `<Script>` de Next.js doit être dans un Client Component — compatible avec le layout actuel.

---

## État de l'Art (patterns Next.js 15 pour ce cas)

| Ancienne approche | Approche actuelle | Impact |
|-------------------|-------------------|--------|
| Polling setInterval | Check unique au montage | Moins de requêtes, usage solo |
| localStorage pour anti-doublon | Contrainte UNIQUE PostgreSQL | Survit aux rechargements, multi-appareils |
| Bibliothèque tierce confetti | Asset vanilla JS projet | Zéro dépendance supplémentaire |
| Context global React | Composant Provider invisible | Plus simple, pas de re-renders inutiles |

---

## Environnement — Disponibilité

Phase purement code/config — les dépendances externes (Supabase, Next.js) sont déjà opérationnelles.

| Dépendance | Statut | Version | Note |
|------------|--------|---------|------|
| Supabase project | Disponible | vqtzcxvmzznbepyvlcut | [VERIFIED: PROJECT.md] |
| celebrations.js | Disponible | asset projet | [VERIFIED: glob] |
| celebrations.css | Disponible | asset projet | [VERIFIED: glob] |
| Sonner | Disponible | ^2.0.7 | [VERIFIED: package.json] |
| Zustand | Disponible | ^5.0.13 | [VERIFIED: package.json — non requis si Provider simple] |

---

## Log des Assumptions

| # | Claim | Section | Risque si faux |
|---|-------|---------|----------------|
| A1 | `upsert(..., { ignoreDuplicates: true })` retourne `null` quand doublon | Code Examples | Comportement incorrect → re-déclenchement ou erreur |
| A2 | La clé achievement CA est par mois (`ca_monthly_YYYY_MM`) — se redéclenche chaque nouveau mois | Détection CA | Si Ted veut "une seule fois par objectif annuel" → clé à modifier |
| A3 | La page `/champions` est vide/mock — la timeline peut aller sur `/achievements` ou réutiliser `/champions` | Timeline | Conflit avec une page existante déjà développée |
| A4 | Le check achievements se fait une seule fois au chargement du dashboard (pas de polling) | Architecture | Si Ted ouvre plusieurs onglets ou laisse le dashboard ouvert, il pourrait rater un achievement |

---

## Questions Ouvertes (RESOLVED)

1. **Seuil CA : par mois ou par objectif unique ?**
   - Ce qu'on sait : L'objectif est `ca_monthly_target` configuré dans Settings — il peut changer chaque mois
   - Ce qui est flou : Ted veut-il que l'achievement soit déclenché une fois par mois calendaire, ou une seule fois pour le même seuil ?
   - Recommandation : Clé `ca_monthly_YYYY_MM` — re-déclenche chaque mois si l'objectif est atteint ce mois-là. C'est le comportement le plus motivant.

2. **La page `/champions` est-elle déjà implémentée ?**
   - Ce qu'on sait : Elle est dans la nav (`{ id: 'champions', href: '/champions', label: '🏆 Champions' }`)
   - Ce qui est flou : Y a-t-il déjà un fichier `src/app/(dashboard)/champions/page.tsx` ?
   - Recommandation : Créer `/achievements` et lier depuis la sidebar — ne pas écraser `/champions`.

3. **Zustand ou Context pour les achievements ?**
   - Ce qu'on sait : Zustand est installé. Le pattern existant utilise des hooks locaux (useUserSettings).
   - Recommandation : Un simple Provider React `AchievementsProvider` avec `useRef` pour éviter la double exécution — pas de store global nécessaire pour ce cas simple.

---

## Sources

### Primaires (HIGH confidence)
- `public/celebrations.js` — API Celebrations complète, lue et vérifiée ligne par ligne [VERIFIED]
- `public/celebrations.css` — Toutes les classes CSS d'animation [VERIFIED]
- `supabase/migrations/001_init_schema.sql` — Schema complet, pas de table achievements [VERIFIED]
- `supabase/migrations/003_functions.sql` — Vue `v_monthly_revenue`, données CA disponibles [VERIFIED]
- `src/app/api/revenue/stats/route.ts` — `caCurrentMonth`, `objectiveMonth`, `clientCount` confirmés [VERIFIED]
- `src/app/api/settings/route.ts` — `ca_monthly_target` dans user_settings [VERIFIED]
- `src/app/(dashboard)/layout.tsx` — Sonner Toaster présent, layout 'use client' [VERIFIED]
- `package.json` — Stack complet vérifiée (Zustand, Sonner, Next.js 15, Supabase JS) [VERIFIED]

### Secondaires (MEDIUM confidence)
- Pattern `upsert + ignoreDuplicates` supabase-js v2 — [ASSUMED] basé sur connaissance supabase-js, à valider
- Strategy `lazyOnload` Next.js Script — [ASSUMED] basé sur connaissance Next.js Script component

---

## Métadonnées

**Breakdown confiance :**
- Détection achievements : HIGH — données existantes confirmées
- Celebrations assets : HIGH — fichiers lus et compris en détail
- Schéma migration 006 : HIGH — pattern établi par migrations 001-005
- Pattern supabase `ignoreDuplicates` : MEDIUM — non vérifié en session via Context7
- Intégration Script Next.js : MEDIUM — [ASSUMED] mais pattern standard

**Date de recherche :** 2026-05-11
**Validité estimée :** 60 jours (stack stable, pas de dépendances nouvelles)
