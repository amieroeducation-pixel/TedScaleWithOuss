# TNS Triple Canal Sourcing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter Google Places comme 3ème canal de sourcing dans l'enrichissement prospect — en plus de Data.gouv (entreprise/adresse) et Pappers (email/téléphone siège) — pour récupérer des numéros de portable professionnels via les fiches Google Business des TNS.

**Architecture:** Le endpoint `/api/enrichissement` est étendu pour accepter `metier` et `ville`, puis appelle séquentiellement Pappers (canal 2, si SIREN dispo) puis Google Places (canal 3, requête `{nom} {metier} {ville}` → `textsearch` → `place/details`). Le téléphone retourné est le premier non-null dans l'ordre Pappers > Google Places. `ProspectCard.tsx` passe les nouveaux paramètres. Le script de déploiement inclut `GOOGLE_PLACES_API_KEY` dans les vars Cloud Run.

**Tech Stack:** Next.js 15 App Router, TypeScript, Google Places API v1 (textsearch + place details), Pappers API v2, Cloud Run GCP `integration-make-365608`

**Pré-requis utilisateur :** Obtenir une clé Google Places API (instructions en Task 1) et la mettre dans `.env.local` à la ligne `GOOGLE_PLACES_API_KEY=<ta_clé>`.

---

## Fichiers concernés

| Fichier | Action | Responsabilité |
|---------|--------|----------------|
| `.env.local` | **Modifier** | Renseigner `GOOGLE_PLACES_API_KEY` |
| `deploy-cloudrun.ps1` | **Modifier** | Ajouter `GOOGLE_PLACES_API_KEY` dans la liste des secrets Cloud Run |
| `src/app/api/enrichissement/route.ts` | **Modifier** | Accepter `metier`+`ville`, ajouter canal Google Places |
| `src/components/prospects/ProspectCard.tsx` | **Modifier** | Passer `metier` et `ville` dans l'appel enrichissement |

---

### Task 1 : Obtenir et configurer la clé Google Places API

**Fichiers :**
- Modifier : `.env.local`
- Modifier : `deploy-cloudrun.ps1`

**Contexte :** Google Places API (anciennement Maps JavaScript API) donne accès aux numéros de téléphone des fiches Google Business. Elle nécessite une clé API Google Cloud. Le projet GCP `integration-make-365608` (celui de Cloud Run) peut héberger cette clé.

- [ ] **Step 1 : Créer la clé dans Google Cloud Console**

1. Aller sur https://console.cloud.google.com/apis/credentials?project=integration-make-365608
2. Cliquer **+ Créer des identifiants → Clé API**
3. Cliquer **Restreindre la clé** → Restrictions d'API → sélectionner **Places API** (et éventuellement **Maps JavaScript API**)
4. Copier la clé générée (format : `AIzaSy...`)

Ensuite activer l'API si ce n'est pas fait :
https://console.cloud.google.com/apis/library/places-backend.googleapis.com?project=integration-make-365608

- [ ] **Step 2 : Ajouter la clé dans `.env.local`**

Ouvrir `.env.local` à la racine du projet. Remplacer la ligne vide :
```
GOOGLE_PLACES_API_KEY=
```
par :
```
GOOGLE_PLACES_API_KEY=AIzaSy...ta_clé_ici
```

- [ ] **Step 3 : Ajouter `GOOGLE_PLACES_API_KEY` dans `deploy-cloudrun.ps1`**

Fichier : `deploy-cloudrun.ps1` ligne ~73

Trouver le bloc :
```powershell
  "PAPPERS_API_KEY"
) | Where-Object { $envVars.ContainsKey($_) } | ForEach-Object {
```

Le remplacer par :
```powershell
  "PAPPERS_API_KEY",
  "GOOGLE_PLACES_API_KEY"
) | Where-Object { $envVars.ContainsKey($_) } | ForEach-Object {
```

- [ ] **Step 4 : Commit**

```powershell
git add deploy-cloudrun.ps1
git commit -m "feat: add GOOGLE_PLACES_API_KEY to Cloud Run deploy secrets"
```

Note : `.env.local` est gitignored et ne doit pas être commité.

---

### Task 2 : Mettre à jour `/api/enrichissement` — canal Google Places

**Fichiers :**
- Modifier : `src/app/api/enrichissement/route.ts`

**Contexte :** Le endpoint actuel (53 lignes) accepte `siren`, `nom`, `entreprise` et appelle Pappers si PAPPERS_API_KEY est défini. On ajoute :
- Deux nouveaux params : `metier` et `ville`
- Un canal Google Places : si `GOOGLE_PLACES_API_KEY` est défini ET que Pappers n'a pas retourné de téléphone, on appelle `textsearch` puis `place/details` pour récupérer `formatted_phone_number`
- Le champ `source` devient `'pappers' | 'google_places' | 'generated'`

Google Places API URLs :
- Text Search : `https://maps.googleapis.com/maps/api/place/textsearch/json?query={query}&language=fr&region=fr&key={key}`
- Place Details : `https://maps.googleapis.com/maps/api/place/details/json?place_id={id}&fields=formatted_phone_number&language=fr&key={key}`

Coût : ~$0.049 par prospect ouvert avec Google Places (Text Search + Details). $200 crédit gratuit/mois = ~4 000 lookups gratuits.

- [ ] **Step 1 : Remplacer le contenu du fichier**

```typescript
// src/app/api/enrichissement/route.ts
import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiUnauthorized } from '@/lib/api'

type PappersEntreprise = {
  siege?: { telephone?: string }
  dirigeants?: Array<{ email?: string; telephone?: string }>
  site_internet?: string
}

type GoogleTextSearchResult = {
  results?: Array<{ place_id?: string }>
  status?: string
}

type GooglePlaceDetails = {
  result?: { formatted_phone_number?: string }
  status?: string
}

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { searchParams } = new URL(request.url)
  const siren     = searchParams.get('siren')     ?? ''
  const nom       = searchParams.get('nom')       ?? ''
  const entreprise = searchParams.get('entreprise') ?? ''
  const metier    = searchParams.get('metier')    ?? ''
  const ville     = searchParams.get('ville')     ?? ''

  let telephone: string | null = null
  let email: string | null = null
  let website: string | null = null
  let source = 'generated'

  // ── Canal 2 : Pappers (prioritaire — données officielles + email dirigeant) ──
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
        email     = p.dirigeants?.[0]?.email ?? null
        website   = p.site_internet ?? null
        if (telephone || email) source = 'pappers'
      }
    } catch { /* Pappers indisponible */ }
  }

  // ── Canal 3 : Google Places (fallback quand Pappers n'a pas de téléphone) ──
  const googleKey = process.env.GOOGLE_PLACES_API_KEY
  if (googleKey && !telephone) {
    const query = [nom || entreprise, metier, ville].filter(Boolean).join(' ')
    if (query.trim()) {
      try {
        // Étape 1 — trouver le place_id
        const textRes = await fetch(
          `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&language=fr&region=fr&key=${googleKey}`,
          { cache: 'no-store' }
        )
        if (textRes.ok) {
          const textData = await textRes.json() as GoogleTextSearchResult
          const placeId = textData.results?.[0]?.place_id

          if (placeId) {
            // Étape 2 — récupérer le numéro de téléphone
            const detailRes = await fetch(
              `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_phone_number&language=fr&key=${googleKey}`,
              { cache: 'no-store' }
            )
            if (detailRes.ok) {
              const detail = await detailRes.json() as GooglePlaceDetails
              const raw = detail.result?.formatted_phone_number ?? null
              if (raw) {
                telephone = raw.replace(/\s+/g, ' ').trim()
                source = 'google_places'
              }
            }
          }
        }
      } catch { /* Google Places indisponible */ }
    }
  }

  // ── URLs générées (toujours présentes) ──
  const linkedinQuery = [nom, entreprise].filter(Boolean).join(' ')
  const linkedinUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(linkedinQuery || metier + ' ' + ville)}&origin=SWITCH_SEARCH_TYPE`

  const pjQuery = entreprise || nom || metier
  const pjVille = ville || 'France'
  const pjUrl = `https://www.pagesjaunes.fr/annuaire/chercherlespros?quoiqui=${encodeURIComponent(pjQuery)}&ou=${encodeURIComponent(pjVille)}`

  return apiSuccess({
    telephone,
    email,
    website,
    linkedinUrl,
    pagesJaunesUrl: pjUrl,
    pappersUrl: siren ? `https://www.pappers.fr/entreprise/${siren}` : null,
    source,
  })
}
```

- [ ] **Step 2 : Vérifier TypeScript**

```powershell
npx tsc --noEmit 2>&1 | Select-String "enrichissement"
```

Attendu : aucune ligne (= 0 erreur sur ce fichier).

- [ ] **Step 3 : Commit**

```powershell
git add src/app/api/enrichissement/route.ts
git commit -m "feat(enrichissement): add Google Places as 3rd phone sourcing channel"
```

---

### Task 3 : Mettre à jour `ProspectCard` — passer `metier` et `ville`

**Fichiers :**
- Modifier : `src/components/prospects/ProspectCard.tsx`

**Contexte :** L'appel à `/api/enrichissement` dans `ProspectCard.tsx` (autour de la ligne 50) passe actuellement `siren`, `nom`, `entreprise`. Pour que le canal Google Places fonctionne, il faut aussi passer `metier` et `ville`. La propriété `source` retournée doit être affichée dans le badge "Contact" pour que l'utilisateur sache d'où vient le numéro.

- [ ] **Step 1 : Passer `metier` et `ville` dans l'appel enrichissement**

Trouver dans `ProspectCard.tsx` le bloc `useEffect` avec l'appel fetch :

```typescript
// Avant (lignes ~49-53)
const params = new URLSearchParams()
if (prospect.siren) params.set('siren', prospect.siren)
params.set('nom', prospect.nom)
if (prospect.entreprise) params.set('entreprise', prospect.entreprise)
const res = await fetch(`/api/enrichissement?${params}`)
```

Remplacer par :

```typescript
const params = new URLSearchParams()
if (prospect.siren)    params.set('siren',      prospect.siren)
if (prospect.nom)      params.set('nom',         prospect.nom)
if (prospect.entreprise) params.set('entreprise', prospect.entreprise)
if (prospect.metier)   params.set('metier',      prospect.metier)
if (prospect.ville)    params.set('ville',       prospect.ville)
const res = await fetch(`/api/enrichissement?${params}`)
```

- [ ] **Step 2 : Afficher le badge source dans la section Contact**

Trouver la ligne du titre "Contact" dans le JSX (autour de :) :

```tsx
<div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 10, fontWeight: 500, color: C.textLo, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 10 }}>
  Contact {enrichLoading && <span style={{ color: C.indigo, fontSize: 9 }}>· chargement…</span>}
</div>
```

Remplacer par :

```tsx
<div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 10, fontWeight: 500, color: C.textLo, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
  <span>Contact</span>
  {enrichLoading && <span style={{ color: C.indigo, fontSize: 9 }}>· chargement…</span>}
  {!enrichLoading && enrich && (
    <span style={{
      fontSize: 7, padding: '1px 6px', borderRadius: 5, fontFamily: 'JetBrains Mono,monospace',
      background: enrich.source === 'pappers' ? C.gold + '20' : enrich.source === 'google_places' ? '#1a2e1a' : C.surface2,
      color: enrich.source === 'pappers' ? C.gold : enrich.source === 'google_places' ? C.green : C.textVlo,
      border: `1px solid ${enrich.source === 'pappers' ? C.gold + '40' : enrich.source === 'google_places' ? C.green + '40' : C.lineSoft}`,
    }}>
      {enrich.source === 'pappers' ? 'Pappers' : enrich.source === 'google_places' ? 'Google' : 'Généré'}
    </span>
  )}
</div>
```

- [ ] **Step 3 : Vérifier TypeScript**

```powershell
npx tsc --noEmit 2>&1 | Select-String "error TS"
```

Attendu : 0 erreur.

- [ ] **Step 4 : Commit**

```powershell
git add src/components/prospects/ProspectCard.tsx
git commit -m "feat(ProspectCard): pass metier+ville to enrichissement, show source badge"
```

---

### Task 4 : Déployer et valider

**Pré-requis :** `GOOGLE_PLACES_API_KEY` renseigné dans `.env.local` + Docker Desktop démarré.

- [ ] **Step 1 : Build local rapide**

```powershell
npx tsc --noEmit 2>&1 | Select-String "error TS"
```

Attendu : 0 erreur.

- [ ] **Step 2 : Déployer**

```powershell
.\deploy-cloudrun.ps1 -ProjectId integration-make-365608
```

Attendu : `=== DEPLOY TERMINE ===` + révision > `00012`.

- [ ] **Step 3 : Valider Pappers en prod**

1. Ouvrir `/prospection/tns` sur la prod
2. Rechercher "Médecin généraliste" + "Paris" → Rechercher
3. Cliquer sur n'importe quel résultat → ProspectCard s'ouvre
4. Attendre la fin du chargement → badge "Pappers" ou "Google" ou "Généré" visible
5. Si badge "Pappers" : téléphone et/ou email affichés ✅
6. Si badge "Généré" : Pappers n'a pas de données pour ce SIREN → normal

- [ ] **Step 4 : Valider Google Places en prod**

1. Dans la même session, ouvrir un prospect qui a badge "Généré" (Pappers sans données)
2. Vérifier dans les logs Cloud Run si `GET /api/enrichissement` est suivi de calls Google Maps :

```powershell
gcloud run services logs read ted-scale-with-ouss --region europe-west1 --project integration-make-365608 --limit 20
```

3. Si badge "Google" apparaît → un numéro a été trouvé sur Google Business ✅
4. Si badge "Généré" → le professionnel n'a pas de fiche Google Business (pas d'erreur, comportement attendu)

- [ ] **Step 5 : Vérifier les logs pour erreurs**

```powershell
gcloud run services logs read ted-scale-with-ouss --region europe-west1 --project integration-make-365608 --limit 20 2>&1 | Select-String "API Error|500|error"
```

Attendu : aucune ligne d'erreur liée à enrichissement.

---

## Architecture finale — 3 canaux de sourcing TNS

```
Clic sur prospect → ProspectCard ouvre → /api/enrichissement?siren=&nom=&metier=&ville=

  Canal 1 — Data.gouv (déjà fait en amont)
  └─ /api/prospection/tns → SIREN, nom entreprise, adresse, code postal

  Canal 2 — Pappers (si PAPPERS_API_KEY + SIREN)
  └─ api.pappers.fr/v2/entreprise?siren=SIREN
     → téléphone siège / dirigeant + email dirigeant
     → badge "Pappers" 🟡

  Canal 3 — Google Places (si GOOGLE_PLACES_API_KEY + pas de téléphone Pappers)
  └─ textsearch?query="Dr. Dupont médecin généraliste Paris"
     → place_id → place/details?fields=formatted_phone_number
     → numéro de portable ou fixe pro (Google Business)
     → badge "Google" 🟢

  Fallback — URLs générées (toujours)
  └─ LinkedIn URL, Pages Jaunes URL, Pappers URL, Google Maps URL
     → badge "Généré" ⚫
```

## Notes de coût Google Places

| Volume | Coût estimé |
|--------|-------------|
| Crédit mensuel gratuit | $200 |
| Text Search | $0.032/requête |
| Place Details | $0.017/requête |
| **Total par lookup** | **~$0.049** |
| **Lookups gratuits/mois** | **~4 000** |

Pour un CGP en prospection manuelle (50-100 fiches/semaine), le crédit gratuit couvre largement l'usage.
