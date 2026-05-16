# Calling Session Dashboard — Design Spec

**Goal:** Relier les modules de prospection TNS et Chefs d'entreprise à une session d'appels structurée dans la vue Today, avec scripts paramétrables, suivi des contacts, bilan IA tous les 10 appels et optimisation progressive des scripts.

**Architecture:** Sessions d'appels persistées en Supabase. Les prospects sélectionnés depuis une recherche TNS ou Chefs sont snapshotés en DB au moment de la création de session, indépendamment des résultats éphémères de recherche. Les scripts et objections sont gérés dans les Paramètres et versionnés. L'IA analyse les bilans accumulés pour suggérer des améliorations.

**Tech Stack:** Next.js 15 App Router, Supabase PostgreSQL, API Claude (amélioration scripts), inline CSS via `C` de `src/lib/theme.ts`.

---

## Section 1 — Schéma de base de données

### `call_scripts`
| Champ | Type | Notes |
|-------|------|-------|
| id | uuid PK | |
| user_id | uuid FK | |
| metier | text | clé METIERS_CONFIG (ex: `kinesitherapeute`) |
| titre | text | ex: "Script Kiné v2" |
| contenu | text | texte complet du script |
| is_default | boolean | script actif pour ce métier |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `call_objections`
| Champ | Type | Notes |
|-------|------|-------|
| id | uuid PK | |
| user_id | uuid FK | |
| metier | text | |
| question | text | ex: "J'ai déjà un conseiller" |
| reponse | text | réponse suggérée |
| ordre | int | ordre d'affichage pendant l'appel |
| created_at | timestamptz | |

### `calling_sessions`
| Champ | Type | Notes |
|-------|------|-------|
| id | uuid PK | |
| user_id | uuid FK | |
| titre | text | ex: "Kinés Paris - 16/05/2026" |
| metier | text | |
| ville | text | |
| source | text | `'tns'` ou `'chefs'` |
| statut | text | `'active'` / `'pausee'` / `'terminee'` |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `calling_session_contacts`
| Champ | Type | Notes |
|-------|------|-------|
| id | uuid PK | |
| session_id | uuid FK | |
| user_id | uuid FK | |
| ordre | int | position dans la liste |
| siren | text nullable | |
| nom | text | |
| entreprise | text | |
| metier | text | |
| ville | text | |
| telephone | text | |
| email | text nullable | |
| adresse | text nullable | |
| source | text | `'pappers'` / `'google_maps'` / `'datagouv'` |
| statut_appel | text | `'a_appeler'` / `'contacte'` / `'pas_repondu'` / `'pas_interesse'` / `'chaud'` |
| note | text nullable | note libre post-appel |
| rappel_date | timestamptz nullable | date de rappel planifiée |
| added_to_crm | boolean | default false |
| called_at | timestamptz nullable | horodatage du dernier appel |
| script_rating | smallint nullable | note script 1-5 (remplie au bilan J+10) |
| objections_rencontrees | jsonb nullable | `[{id, rating}]` — rempli au bilan J+10 |
| created_at | timestamptz | |

**Note importante :** `calling_session_contacts` stocke une copie snapshot du prospect au moment de la création de session. Aucune dépendance aux résultats de recherche après création.

---

## Section 2 — Routes API

```
/api/call-scripts
  GET  → liste scripts de l'utilisateur, filtrables par ?metier=
  POST → créer un script { metier, titre, contenu, is_default }

/api/call-scripts/[id]
  PUT    → modifier { titre, contenu, is_default }
  DELETE → supprimer (interdit si is_default et seul script du métier)

/api/call-objections
  GET  → liste objections, filtrables par ?metier=
  POST → créer { metier, question, reponse, ordre }

/api/call-objections/[id]
  PUT    → modifier { question, reponse, ordre }
  DELETE → supprimer

/api/calling-sessions
  GET  → liste sessions, statut 'active' en premier
  POST → créer session + injecter contacts en une transaction
         body: { titre, metier, ville, source, script_id, contacts: Prospect[] }

/api/calling-sessions/[id]
  GET → détail session + tous les contacts ordonnés
  PUT → changer statut { statut: 'pausee' | 'terminee' }

/api/calling-sessions/[id]/contacts/[contactId]
  PUT → mettre à jour { statut_appel, note, rappel_date, added_to_crm, called_at }

/api/calling-sessions/[id]/bilan
  POST → soumettre le bilan des 10 appels
         body: { contacts: [{ id, script_rating, objections_rencontrees }] }

/api/call-analytics/improve-script
  POST → envoie à Claude : script actuel + bilans + commentaires
         body: { script_id, metier }
         retourne: { script_ameliore, objections_ameliorees }
```

---

## Section 3 — UI Flow

### Création de session (page TNS ou Chefs d'entreprise)

1. L'utilisateur fait une recherche → voit les résultats
2. Une **checkbox** apparaît sur chaque ligne de résultat
3. Après sélection, bouton **"Créer une session d'appels (N contacts)"** apparaît
4. Modal de confirmation :
   - Titre de la session (pré-rempli : "Kinés Paris — 16/05/2026")
   - Dropdown "Script à utiliser" (scripts disponibles pour ce métier)
   - Bouton "Lancer la session" → POST `/api/calling-sessions` → redirect vers Today

### Today — Fusion des sections existantes

La page Today contient déjà trois sections dans l'onglet Prospection :
- **Script d'appel** — tabs TNS/Chef/Particulier, contenu hardcodé
- **Objections & Réponses** — 5 objections hardcodées
- **Liste d'appels ONOFF** — placeholder vide avec tabs TNS/Chefs/Particuliers

Ces trois sections sont **fusionnées en un seul panneau CRM intégré** qui remplace les trois. Problème ergonomique résolu : script et objections sont visibles sans scroller pendant un appel.

**Layout CRM (session active) :**

```
┌─────────────────────────────────────────────────────────────┐
│ SESSION : Kinés Paris · 12/20 appelés          [Terminer]   │
├──────────────────┬──────────────────────────────────────────┤
│ LISTE CONTACTS   │ FICHE CONTACT ACTIF                      │
│ (40%)            │ (60%)                                    │
│                  │  📞 06 12 34 56 78   [Appeler]           │
│ ● Dr. Martin 🟢  │  [À appeler][Contacté][Pas répondu]...   │
│ ● Cabinet X  ⚪  │  Note : ______________________           │
│ ● Mme Dubois 🔴  │  Rappel : [date]    [+ Ajouter au CRM]  │
│ ...              │  [← Précédent]          [Suivant →]      │
│                  ├──────────────────────────────────────────┤
│                  │ ▶ SCRIPT (accordéon, ouvert par défaut)  │
│                  │   "Bonjour, je suis Ted..."              │
│                  │ ▶ OBJECTIONS (accordéon)                 │
│                  │   ❓ J'ai déjà un conseiller             │
│                  │   ❓ Pas le temps                        │
└──────────────────┴──────────────────────────────────────────┘
```

**Pastilles de statut dans la liste :**
- ⚪ À appeler / 🟡 Pas répondu / 🟢 Chaud / 🔵 Contacté / 🔴 Pas intéressé

**Navigation :** clic sur un contact dans la liste → charge sa fiche à droite. Boutons Précédent/Suivant dans la fiche pour naviguer.

**Pas de session active :** le panneau affiche "Aucune session active — lancez une recherche TNS ou Chefs pour créer une session" avec un lien vers `/prospection/tns`.

### Bilan tous les 10 appels

Après le 10ème appel de la session (détecté côté client quand 10 contacts ont un `called_at` renseigné depuis le dernier bilan), Today affiche un modal interstitiel :
- **Note du script** : 1-5 étoiles
- **Objections rencontrées** : liste des objections du métier avec checkbox "rencontrée" + note 1-5 si cochée
- **Commentaire libre** : textarea "Ce qui a bien marché / ce qui a bloqué"
- Bouton "Valider le bilan" → POST `/api/calling-sessions/[id]/bilan` → retour à la session

Les sessions persistent jusqu'à être marquées "terminée" — les contacts non appelés restent disponibles le lendemain.

---

## Section 4 — IA & Optimisation des scripts

### Accumulation des données

Chaque bilan (tous les 10 appels) alimente :
- `script_rating` sur chaque contact du lot
- `objections_rencontrees` avec les notes par objection

Ces données sont agrégées côté API pour calculer :
- Note moyenne du script sur ses N derniers bilans
- Objections les moins bien notées (< 3/5) → signalées en orange dans les Paramètres

### Amélioration IA (dans les Paramètres)

Onglet **"IA & Bilans"** dans `/settings` :

1. **Historique des bilans** — tableau : date, session, note script, top objection problématique
2. **Par script** — note moyenne + bouton **"Analyser et améliorer"**
3. Appui sur le bouton → `POST /api/call-analytics/improve-script` :
   - Envoie à Claude : script actuel + tous les bilans (notes + commentaires)
   - Claude retourne : version améliorée du script + reformulation des objections les moins bien notées
4. Affichage diff côte à côte (version actuelle vs suggestion IA)
5. Actions : **"Accepter"** (crée nouvelle version, is_default=true) / **"Modifier"** / **"Ignorer"**
6. L'ancienne version est conservée (`is_default=false`) — versioning natif

---

## Section 5 — Paramètres (Scripts & Objections)

Nouvel onglet **"Scripts & Objections"** dans la page `/settings` existante.

### Scripts
- Liste par métier avec note moyenne et badge "Actif"
- Bouton "Nouveau script" → formulaire inline : métier + titre + textarea contenu
- Bouton "Modifier" / "Supprimer" (interdit sur le seul script d'un métier)
- Clic "Activer" → met `is_default=true` sur ce script, retire l'autre

### Objections
- Sélecteur de métier → liste des objections ordonnées
- Note moyenne affichée sur chaque objection (issue des bilans)
- Objections < 3/5 affichées en orange avec suggestion "À réviser"
- Bouton "Nouvelle objection" → champs question + réponse
- Drag-and-drop pour réordonner via `dnd-kit` (déjà installé pour le CRM Kanban) — ordre reflété pendant l'appel

### Onglet "IA & Bilans"
- Historique des bilans avec filtres par métier et période
- Bouton d'amélioration IA par script (voir Section 4)

---

## Contraintes & Notes

- **Player vidéo Today** : une autre session ajoute un player vidéo à Today. La section "Sessions d'appels" est une section verticale indépendante en bas de page — aucun conflit de layout.
- **Pas de real-time IA pendant l'appel** : l'IA intervient uniquement en mode analyse/amélioration post-bilan, pas en live.
- **Bilan déclenché côté client** : le compteur d'appels est géré en state React — quand `called_at` est renseigné sur 10 contacts, l'écran bilan s'affiche.
- **Snapshot prospects** : les contacts sont copiés intégralement dans `calling_session_contacts` — toute modification ultérieure des données source n'affecte pas la session.
- **RLS Supabase** : toutes les tables filtrent par `user_id = auth.uid()`.
