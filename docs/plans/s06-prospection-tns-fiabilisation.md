---
validated: yes
---
# Plan — Story s06-prospection-tns-fiabilisation

Branch: `feature/s06-prospection-tns-fiabilisation`

## Target story

**Prospection TNS sans donnees incorrectes** — Fiabiliser les donnees retournees par la recherche TNS : bons metiers, numeros valides, resultats varies entre recherches, transfert correct vers le CRM.

## Tasks (ordered)

1. [x] **Synchroniser les metiers frontend/backend** — Ajouter dans `METIERS_CONFIG` (route.ts) les metiers presents dans le frontend mais absents du backend : `pedicure` (86.90B), `psychomotricien` (86.90B), `audioprothesiste` (47.74Z), `opticien` (47.78A). Verifier que chaque entry du frontend a un correspondant backend valide.

2. [x] **Implementer la pagination Data.gouv** — Remplacer le `page: '1'` et `per_page: '25'` fixes par une pagination dynamique qui fetche plusieurs pages en fonction de la `limite` demandee. Calculer le nombre de pages necessaires (`Math.ceil(limite / 25)`) et fetcher les pages en parallele. Ajouter un parametre `page_offset` optionnel dans le body de la requete POST pour permettre de varier les resultats entre recherches successives.

3. [x] **Valider les numeros Google Places** — Dans `canalGooglePlaces()`, passer chaque numero retourne par `normalizePhoneFR()` avant de l'inclure dans les resultats. Exclure les numeros qui retournent `null` (invalides, etrangers, mal formates).

4. [x] **Corriger la deduplication prospect par phone normalise** — Dans `api/prospects/route.ts`, remplacer la verification de doublon `.eq('phone', prospectData.phone)` par `.eq('phone_normalized', phoneNormalized)` pour eviter les doublons de meme numero dans des formats differents.

5. [x] **Ameliorer l'inference des metiers (NAF partages)** — Enrichir `inferMetierFromLibelle()` avec des mots-cles supplementaires pour les metiers manquants. Quand le libelle d'activite ne permet pas d'inferer, afficher le metier demande par l'utilisateur plutot que le libelle generique NAF. Ajouter un fallback sur le nom de l'entreprise (ex: "Cabinet d'ophtalmologie" → Ophtalmologue).

6. [x] **Verifier le build** — `npx tsc --noEmit` puis `npm run build` doivent passer sans erreur TypeScript.

## Files touched

- `src/app/api/prospection/tns/route.ts` — Pagination, validation numeros, synchronisation metiers, inference amelioree
- `src/app/(dashboard)/prospection/tns/page.tsx` — Ajout parametre page_offset dans le body de recherche (optionnel)
- `src/app/api/prospects/route.ts` — Deduplication par phone_normalized
- `src/lib/phone-utils.ts` — Aucune modification prevue (deja fonctionnel)

## Test strategy

- **TypeScript** : `npx tsc --noEmit` passe sans erreur
- **Build** : `npm run build` passe proprement
- **Verification metiers** : Chaque metier du frontend a un correspondant dans METIERS_CONFIG (grep/diff des deux listes)
- **Verification numeros** : Tous les numeros retournes passent `normalizePhoneFR()` (pas de null dans les resultats finaux)
- **Verification pagination** : Deux recherches identiques avec des page_offset differents retournent des resultats differents
- **Verification deduplication** : Tester POST /api/prospects avec le meme numero dans 2 formats differents → 409 au 2eme

## Definition of Done

- [x] Tous les metiers du frontend existent dans METIERS_CONFIG backend
- [x] L'API Data.gouv est appelee avec pagination dynamique (pas page=1 en dur)
- [x] Les numeros Google Places sont valides via normalizePhoneFR avant inclusion
- [x] La deduplication prospect utilise phone_normalized
- [x] L'inference des metiers couvre les cas NAF partages courants
- [x] `npx tsc --noEmit` passe
- [x] `npm run build` passe
