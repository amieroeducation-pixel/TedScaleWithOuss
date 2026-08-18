# Diagnostique s06-prospection-tns-fiabilisation — Tableau Actions/Fonctions/Outils

```
┌─────────────────┬────────────────┬──────────────────────────────────────┬──────────────────────────────────┬───────────────┐
│        #        │     Action     │        Fonctions Principales         │              Outils              │    Statut     │
│                 │                │                                      │                                  │  Fonctionnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 1. Recherche    │                │                                      │                                  │               │
│ TNS (11         │                │                                      │                                  │               │
│ actions)        │                │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 1               │ Voir liste 68  │ METIERS.map() 68 métiers (médecins,  │ METIERS const, checkbox list     │ ✅            │
│                 │ métiers        │ spécialistes, dentaire, paramédical, │                                  │ Opérationnel  │
│                 │                │ juridique, comptable, immobilier)    │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 2               │ Sélectionner   │ metiersSelected state + onChange     │ useState, checkbox multiple      │ ✅            │
│                 │ métier(s)      │ multi-select → affiche compteur      │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 3               │ Saisir ville   │ input ville + onChange               │ useState ville                   │ ✅            │
│                 │                │                                      │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 4               │ Cocher inclure │ checkbox includeTel + onChange       │ useState includeTel              │ ✅            │
│                 │ téléphone      │                                      │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 5               │ Cocher inclure │ checkbox includeEmail + onChange     │ useState includeEmail            │ ✅            │
│                 │ email          │                                      │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 6               │ Filtrer        │ checkbox mobileOnly + onChange →     │ useState mobileOnly,             │ ✅            │
│                 │ portables      │ POST { mobileOnly } → backend filtre │ isMobilePhone() backend          │ Opérationnel  │
│                 │ uniquement     │ 06/07                                │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 7               │ Définir limite │ input nombre limite (1-200) +        │ useState limite                  │ ✅            │
│                 │ résultats      │ onChange                             │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 8               │ Lancer         │ handleSearch() → Promise.all() pour  │ POST /api/prospection/tns (par   │ ✅            │
│                 │ recherche      │ chaque métier → POST                 │ métier), Promise.all(),          │ Opérationnel  │
│                 │ multi-métiers  │ /api/prospection/tns → fusion        │ déduplication par téléphone      │               │
│                 │                │ résultats + dédoublonnage            │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 9               │ Voir résultats │ searchResults state → affiche liste  │ searchResults array, Panel UI    │ ✅            │
│                 │ recherche      │ + compteur total                     │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 10              │ Afficher       │ searchError state → bandeau rouge    │ useState searchError, bandeau    │ ✅            │
│                 │ message erreur │ avec icône ⚠️                        │ UI conditionnel                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 11              │ Loader pendant │ searchLoading state → bouton         │ useState searchLoading, bouton   │ ✅            │
│                 │ recherche      │ "⏳ RECHERCHE EN COURS..."           │ disabled + texte                 │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 2. API Backend  │                │                                      │                                  │               │
│ TNS (5 actions) │                │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 12              │ Appel Data.    │ fetch API Data.gouv.fr avec NAF code │ Data.gouv API entreprises,       │ ✅            │
│                 │ gouv.fr API    │ + ville → retourne établissements    │ METIERS_CONFIG mapping           │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 13              │ Appel Pappers  │ fetch Pappers API avec siren →       │ Pappers API (téléphone +         │ ✅            │
│                 │ API            │ enrichissement téléphone + email     │ email), PAPPERS_API_KEY env      │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 14              │ Appel Google   │ fetch Google Places API Text Search  │ Google Places API, GOOGLE_API_   │ ✅            │
│                 │ Places API     │ + geocode → lat/lng + googleUrl      │ KEY env                          │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 15              │ Inférer métier │ inferMetierFromLibelle() → mapping   │ KEYWORD_MAP 20 mots-clés →       │ ✅            │
│                 │ depuis libellé │ mots-clés vers métier réel (ex:      │ métier réel (86.22A partagé)     │ Opérationnel  │
│                 │                │ "cardio" → Cardiologue)              │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 16              │ Calculer score │ computeLeadScore() → scoring         │ Score dynamique: téléphone       │ ✅            │
│                 │ dynamique      │ multi-critères (tel, mobile, email,  │ mobile (+40%), email (+20%),     │ Opérationnel  │
│                 │                │ SIREN, coordonnées GPS)              │ coords GPS (+15%), SIREN (+10%)  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 3. Panier       │                │                                      │                                  │               │
│ Multi-Métiers   │                │                                      │                                  │               │
│ (6 actions)     │                │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 17              │ Cocher contact │ toggleSelect(r) → panier state       │ isPanier(), normPhone(),         │ ✅            │
│                 │ individuel     │ (add/remove par téléphone normalisé) │ checkbox par ligne               │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 18              │ Tout           │ toggleAll() → vérifie si tous        │ searchResults.every(), panier    │ ✅            │
│                 │ sélectionner   │ cochés → add/remove tous résultats   │ state filter                     │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 19              │ Voir bandeau   │ Bandeau persistant si panier.length  │ Bandeau sticky vert avec         │ ✅            │
│                 │ panier         │ > 0 → affiche compteur + métiers     │ compteur + compteur métiers      │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 20              │ Créer session  │ Bouton "🚀 CRÉER LA SESSION" →       │ CreateSessionModal, panier data, │ ✅            │
│                 │ d'appels       │ ouvre modal CreateSessionModal avec  │ redirect /today                  │ Opérationnel  │
│                 │                │ contacts panier                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 21              │ Vider panier   │ Bouton "Vider" → setPanier([])       │ setPanier([]), bouton rouge      │ ✅            │
│                 │                │                                      │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 22              │ Persistence    │ panier state persiste entre          │ useState panier (persist via     │ ✅            │
│                 │ panier entre   │ recherches (accumulation multi-      │ composant, reset après création  │ Opérationnel  │
│                 │ recherches     │ métiers)                             │ session)                         │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 4. Actions      │                │                                      │                                  │               │
│ Résultats (5    │                │                                      │                                  │               │
│ actions)        │                │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 23              │ Cliquer ligne  │ onClick → setSelectedProspect() →    │ ProspectCard modal, prospect     │ ✅            │
│                 │ résultat       │ ouvre modal détail ProspectCard      │ data                             │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 24              │ Appeler        │ <a href="tel:..."> lien direct       │ HTML tel: protocol, bouton vert  │ ✅            │
│                 │ téléphone      │                                      │ avec numéro                      │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 25              │ Ouvrir Google  │ <a href="googleUrl" target="_blank"> │ Google Search URL (métier +      │ ✅            │
│                 │ recherche      │ lien vers Google Search              │ ville + nom), icône 🔍           │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 26              │ Voir score     │ ScoreDot component avec couleur      │ ScoreDot (vert ≥80%, or ≥65%,    │ ✅            │
│                 │                │ dynamique + pourcentage              │ cyan <65%)                       │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 27              │ Export CSV     │ exportCSV() → génère CSV UTF-8 avec  │ Blob API, papaparse-like manual, │ ✅            │
│                 │ résultats      │ 7 colonnes (nom, entreprise, métier, │ download trigger                 │ Opérationnel  │
│                 │                │ ville, tel, SIREN, score)            │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 5. Ajout CRM    │                │                                      │                                  │               │
│ (2 actions)     │                │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 28              │ Tout ajouter   │ addAllToProspection() →              │ POST /api/prospects (bulk),      │ ✅            │
│                 │ au CRM         │ Promise.all() POST pour chaque       │ existingPhones filter,           │ Opérationnel  │
│                 │                │ contact non existant → ajout bulk    │ contactedPhones sync             │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 29              │ Exclusion      │ Filtre existingPhones (Set) →        │ existingPhones state (Set),      │ ✅            │
│                 │ doublons CRM   │ vérifie téléphone normalisé → badge  │ normPhone(), badge "Déjà en      │ Opérationnel  │
│                 │                │ "Déjà en base"                       │ base" violet                     │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 6. Base TNS     │                │                                      │                                  │               │
│ actuelle (2     │                │                                      │                                  │               │
│ actions)        │                │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 30              │ Voir base TNS  │ fetch /api/prospects?limit=200       │ GET /api/prospects filter        │ ✅            │
│                 │ actuelle       │ filter source='tns' → affiche liste  │ source='tns', prospects state    │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 31              │ Filtrer base   │ activeFilter state (all/medecin/     │ FILTER_LABELS hardcodé (5 tabs), │ ⚠️            │
│                 │ par métier     │ infirmier/kine/avocat) → filter      │ metierFilter champ non utilisé   │ Incomplet     │
│                 │                │ prospects.filter()                   │ (tabs ne filtrent pas vraiment)  │               │
└─────────────────┴────────────────┴──────────────────────────────────────┴──────────────────────────────────┴───────────────┘
```

---

## Résumé Exécutif

**Total : 31 actions** — **30 ✅ Opérationnel** / **1 ⚠️ Partiel** / **0 ❌ À faire**

**Taux de fonctionnalité : 97%**

### Par Catégorie

| Catégorie | Total | ✅ | ⚠️ | ❌ | Taux |
|-----------|-------|----|----|----|----|
| Recherche TNS | 11 | 11 | 0 | 0 | 100% |
| API Backend TNS | 5 | 5 | 0 | 0 | 100% |
| Panier Multi-Métiers | 6 | 6 | 0 | 0 | 100% |
| Actions Résultats | 5 | 5 | 0 | 0 | 100% |
| Ajout CRM | 2 | 2 | 0 | 0 | 100% |
| Base TNS actuelle | 2 | 1 | 1 | 0 | 50% |

### Action à Compléter

**#31 (⚠️)** : Filtrer base TNS par métier — Tabs hardcodés (medecin/infirmier/kine/avocat) incomplets

**Problème** :
- `FILTER_LABELS` hardcodé avec 5 valeurs : `all | medecin | infirmier | kine | avocat`
- Le champ `metierFilter` existe dans le type `Prospect` mais n'est jamais renseigné depuis l'API
- Les tabs affichent des compteurs hardcodés "Médecins (8)", "Infirmiers (5)"... qui ne reflètent pas la réalité
- Le filtre `activeFilter !== 'all' && p.metierFilter !== activeFilter` ne filtre rien car tous les prospects ont `metierFilter: 'all'`

**Solution à implémenter** :
1. Lors du fetch `/api/prospects`, mapper `profession` vers une catégorie métier
2. Calculer dynamiquement les compteurs par catégorie depuis les données réelles
3. Permettre filtrage réel par catégorie (ou retirer les tabs si non nécessaire)

---

## 🎯 Points Forts s06-prospection-tns

### ✅ Architecture 3 canaux parallèles
- **Data.gouv API** : Base établissements TNS (21 codes NAF)
- **Pappers API** : Enrichissement téléphone + email + SIREN
- **Google Places API** : Géolocalisation + URL Google + Maps

### ✅ Recherche multi-métiers robuste
- 68 métiers disponibles (médecine, paramédical, juridique, comptable, immobilier...)
- Recherche parallèle (`Promise.all()`) pour plusieurs métiers simultanés
- Déduplication automatique par téléphone normalisé
- Mapping intelligent NAF → métier réel (ex: 86.22A partagé entre 17 spécialités médicales)

### ✅ Scoring dynamique multi-critères
- **Téléphone mobile (06/07)** : +40% score
- **Email présent** : +20% score
- **Coordonnées GPS** : +15% score
- **SIREN valide** : +10% score
- Badge coloré (🟢 vert ≥80% / 🟡 or ≥65% / 🔵 cyan <65%)

### ✅ Panier persistant multi-métiers
- Accumulation contacts entre plusieurs recherches
- Sélection individuelle + "Tout sélectionner"
- Bandeau sticky avec compteur + compteur métiers
- Bouton "🚀 CRÉER LA SESSION" → modal CreateSessionModal → redirect `/today`
- Vider panier manuel

### ✅ Exclusion intelligente CRM/perdus
- `existingPhones` Set (téléphones déjà en base)
- `contactedPhones` Set (téléphones contactés depuis localStorage)
- Badge "Déjà en base" violet
- Badge "✓ Contacté" vert
- Filtre automatique lors de l'ajout CRM (évite doublons)

### ✅ Inférence métier depuis libellé
- Fonction `inferMetierFromLibelle()` avec KEYWORD_MAP
- 20 mappings mots-clés → métier réel
- Exemple : libellé "cardio" → "Cardiologue" (même si NAF 86.22A générique)
- Résout bug #4 (métiers incorrects) et bug #5 (métiers manquants)

---

## 🔧 Outils Utilisés

### Frontend
- **React** : useState, useEffect, useRouter
- **Next.js** : App Router, fetch API
- **UI Components** : Panel, PanelTitle, ScoreDot, StatusBadge, ActionBtn, ProspectCard, CreateSessionModal
- **Phone utils** : `normPhone()`, `normalizePhoneFR()`, `isMobilePhone()`
- **localStorage** : Persistence `tns_contacted_phones`

### Backend
- **Data.gouv API** : `https://recherche-entreprises.api.gouv.fr/search`
- **Pappers API** : Enrichissement SIREN → téléphone + email
- **Google Places API** : Text Search + Geocode → lat/lng + googleUrl
- **Supabase** : Table `prospects` (POST, GET, PATCH, DELETE)
- **Phone utils** : `normalizePhoneFR()`, `isMobilePhone()`

### APIs externes
- **21 codes NAF** : 86.21Z (médecin généraliste), 86.22A (spécialistes), 86.22B/C (dentaire/chirurgie), 86.90A/B/D/F (paramédical/psycho), 47.73Z (pharmacie), 69.10Z/69.20Z (juridique/comptable), 68.31Z/70.22Z/93.13Z (immobilier/conseil/sport), 71.11Z/71.12B/75.00Z (autres)

---

## ⚠️ Action Partielle Détaillée

### #31 — Filtrer base TNS par métier

**État actuel** :
- 5 tabs hardcodés : Tous / Médecins / Infirmiers / Kinés / Avocats
- Compteurs hardcodés dans `FILTER_LABELS` (ex: "Médecins (8)")
- Champ `metierFilter` existe dans type `Prospect` mais toujours = `'all'`
- Filtre `.filter(p => activeFilter !== 'all' && p.metierFilter !== activeFilter)` ne filtre rien

**Code concerné** :
```tsx
// page.tsx ligne 669-686
const FILTER_LABELS: Record<MetierFilter, string> = {
  all: 'Tous (23)', medecin: 'Médecins (8)', infirmier: 'Infirmiers (5)', kine: 'Kinés (6)', avocat: 'Avocats (4)',
}

// Filtre inactif ligne 440-444
const filtered = prospects.filter(p => {
  if (activeFilter !== 'all' && p.metierFilter !== activeFilter) return false
  const norm = p.telephone?.replace(/[\s.\-]/g, '') ?? ''
  return !contactedPhones.has(norm)
})
```

**Solution** :
1. **Option A (filtrage réel)** :
   - Mapper `profession` → catégorie lors du fetch prospects
   - Calculer compteurs dynamiques depuis `prospects` réels
   - Filtrer par catégorie réelle

2. **Option B (retirer tabs)** :
   - Si filtrage par métier non nécessaire (les 68 métiers rendent 5 tabs insuffisants)
   - Retirer les tabs et afficher "Base TNS actuelle (X prospects)"
   - Garder uniquement le filtre "non contactés" (déjà actif)

**Recommandation** : Option B (retirer tabs) + garder filtre "non contactés" déjà fonctionnel

---

## 📊 Statistiques Complètes

### Recherche TNS
- **68 métiers disponibles** (21 codes NAF)
- **3 APIs parallèles** (Data.gouv + Pappers + Google)
- **Limite** : 1-200 résultats par recherche
- **Filtres** : Portables uniquement (06/07), inclure email

### Panier
- **Persistance** : Accumulation multi-métiers entre recherches
- **Sélection** : Individuelle + "Tout sélectionner"
- **Compteurs** : Contacts + métiers uniques
- **Actions** : Créer session d'appels + Vider panier

### Scoring
- **Base** : 0.5 (50%)
- **Mobile** : +40% (total 90%)
- **Email** : +20% (total 70%)
- **GPS** : +15% (total 65%)
- **SIREN** : +10% (total 60%)

### Exclusion
- **CRM existants** : Badge "Déjà en base" violet
- **Contactés** : Badge "✓ Contacté" vert (localStorage)
- **Perdus** : Exclus automatiquement

---

**Document généré par analyse killer-saas — 31 actions documentées pour s06-prospection-tns-fiabilisation**
