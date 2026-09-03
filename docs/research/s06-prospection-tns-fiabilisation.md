# Research — Story s06-prospection-tns-fiabilisation

## Target story

**s06-prospection-tns-fiabilisation** — Prospection TNS sans donnees incorrectes

**En tant que** CGP, je veux que la recherche TNS retourne des donnees correctes (bons metiers, numeros valides renouveles) et que les resultats soient exploitables.

### Acceptance Criteria
1. Le metier affiche correspond au code NAF retourne par l'API (mapping verifie pour les 21 codes)
2. Les numeros de telephone sont valides (format francais, portables identifies)
3. Une recherche successive ne retourne pas toujours les memes resultats (pagination/offset)
4. Un filtre "portables uniquement" est disponible
5. L'enrichissement d'un prospect TNS vers le CRM transfere correctement toutes les donnees

## Current state of the code

### Ce qui fonctionne deja
- Page frontend complete (`tns/page.tsx`, ~823 lignes) avec recherche multi-metiers, panier, export CSV
- API backend (`api/prospection/tns/route.ts`, ~545 lignes) avec 3 canaux : Data.gouv + Pappers + Google Places
- 50+ metiers dans METIERS_CONFIG avec codes NAF associes
- Fonction `inferMetierFromLibelle()` pour inferer le vrai metier quand plusieurs metiers partagent le meme code NAF (ex: 86.22A pour tous les specialistes)
- Normalisation des telephones via `phone-utils.ts` (normalizePhoneFR, isMobilePhone)
- Deduplication CRM : les numeros deja en base sont exclus des resultats
- Deduplication des perdus : les prospects marques "perdu" sont exclus
- Filtre "portables uniquement" (06/07) deja present dans l'UI (checkbox `mobileOnly`) et gere cote API
- Scoring par profession (PROFESSION_SCORES) avec bonus geographique (ZONE_BONUS)
- Ajout individuel et en masse au CRM via POST /api/prospects
- Session d'appels (CreateSessionModal) pour les contacts du panier

### Bugs connus identifies (cf. memoire bugs-list-2026-06-25)
1. **Numeros TNS toujours identiques** (bug #2) — L'API Data.gouv est appelee avec `page=1` en dur. Pas d'offset ni de randomisation entre recherches successives. Chaque recherche identique retourne exactement les memes resultats.
2. **Numeros incorrects** (bug #3) — Certains numeros retournes par Google Places peuvent ne pas correspondre au bon professionnel (homonymie, mauvais matching textsearch). Pas de validation croisee.
3. **Metiers incorrects** (bug #4) — Quand plusieurs metiers partagent le meme code NAF (86.22A), l'API Data.gouv retourne tous les specialistes melangees. `inferMetierFromLibelle()` tente de corriger mais le `libelle_activite_principale` est souvent generique ("Activite des medecins specialistes") sans distinction.
4. **Metiers manquants** (bug #5) — La liste METIERS dans le frontend (page.tsx) contient des metiers supplementaires par rapport a METIERS_CONFIG dans l'API. Certains metiers UI ne sont pas dans le backend : `pedicure`, `psychomotricien`, `audioprothesiste`, `opticien`, `homeopathe` (l'API a homéopathe dans 86.90D mais le frontend a une entry separee).

### Problemes techniques identifies

#### P1 — Pas de pagination API Data.gouv
```typescript
// route.ts ligne 229 — page toujours 1
params.set('page', '1')
```
Consequence : recherches successives = memes resultats. L'API Data.gouv supporte `page` et `per_page`.

#### P2 — Metier frontend/backend desynchronise
Le frontend a des metiers (`pedicure`, `psychomotricien`, `audioprothesiste`, `opticien`) absents de `METIERS_CONFIG` dans l'API. L'API retourne `Metier non reconnu` pour ces metiers.

#### P3 — Deduplication prospect par phone brut (pas normalise)
Dans `api/prospects/route.ts` ligne 98, la verification de doublon utilise `phone` brut au lieu de `phone_normalized`. Si le meme numero est saisi dans des formats differents (avec/sans espaces), il peut etre ajoute 2 fois.

#### P4 — Pas de validation des numeros Google Places
Les numeros retournes par Google Places ne sont pas valides via `normalizePhoneFR()` avant inclusion. Un numero etranger ou mal formate peut passer.

#### P5 — per_page fixe a 25
```typescript
// route.ts ligne 229
per_page: '25'
```
Quand l'utilisateur demande 200 resultats, seulement 25 sont fetches de Data.gouv (page 1). Google Places peut en ajouter jusqu'a 60, mais le total est loin des 200 demandes.

## Anchor points

| Fichier | Role | Lignes |
|---------|------|--------|
| `src/app/(dashboard)/prospection/tns/page.tsx` | Page frontend recherche TNS | ~823 |
| `src/app/api/prospection/tns/route.ts` | API backend 3 canaux (Data.gouv + Pappers + Google Places) | ~545 |
| `src/lib/phone-utils.ts` | Normalisation/validation telephones FR | ~52 |
| `src/lib/api.ts` | Helpers reponse API | ~25 |
| `src/app/api/prospects/route.ts` | CRUD prospects (POST = ajout CRM) | ~125 |
| `src/components/prospects/ProspectCard.tsx` | Carte detail prospect | - |
| `src/components/calling/CreateSessionModal.tsx` | Modal session d'appels | - |

## Verified APIs / functions

| Fonction | Fichier | Comportement |
|----------|---------|-------------|
| `canalDataGouv()` | route.ts | Appelle recherche-entreprises.api.gouv.fr, enrichit via Pappers puis Google Places, infere metier |
| `canalGooglePlaces()` | route.ts | Recherche directe Google Places textsearch + detail, pagine (3 pages max = 60 resultats) |
| `inferMetierFromLibelle()` | route.ts | Mapping mots-cles → metier reel, fonctionne pour la majorite des cas |
| `computeLeadScore()` | route.ts | Score base profession + bonus zone geographique |
| `normalizePhoneFR()` | phone-utils.ts | Normalise vers format 0X XX XX XX XX, retourne null si invalide |
| `isMobilePhone()` | phone-utils.ts | Verifie si normalise commence par 06 ou 07 |
| `handleSearch()` | page.tsx | Appelle POST /api/prospection/tns pour chaque metier selectionne, fusionne, deduplique |

## Risks & traps

1. **API Data.gouv — rate limiting** : pas de documentation claire sur les limites, mais des timeouts de 8s sont deja en place
2. **Google Places — cout** : chaque detail request coute ~0.017 USD. 60 resultats × 0.017 = ~1 USD par recherche
3. **Pappers API** : cle optionnelle, certains utilisateurs n'en auront pas. Le code gere deja le cas `pappersKey` undefined
4. **Metiers partages NAF** : le code NAF 86.22A couvre 15+ specialites. `inferMetierFromLibelle()` est un best-effort, pas 100% fiable
5. **Numeros fixes vs mobiles** : beaucoup de professionnels n'ont que des fixes. Le filtre "portables uniquement" peut drastiquement reduire les resultats

## What needs to change (scope for the plan)

1. **Pagination Data.gouv** : implementer la pagination (pages multiples) et/ou un offset aleatoire pour varier les resultats entre recherches
2. **Synchroniser metiers frontend/backend** : ajouter les metiers manquants dans METIERS_CONFIG ou les retirer du frontend
3. **Augmenter per_page** : passer de 25 a un nombre adapte a la limite demandee par l'utilisateur
4. **Deduplication prospect normalisee** : utiliser phone_normalized au lieu de phone brut dans POST /api/prospects
5. **Validation numeros Google Places** : filtrer les numeros invalides (via normalizePhoneFR) avant de les inclure dans les resultats
