# Plan de Fiabilisation — Section Nurturing Go-Live

**Date :** 2026-08-04
**Revue :** /plan-eng-review (6 issues, 0 unresolved)
**Objectif :** Rendre le nurturing 100% fonctionnel en production

---

## Résumé

Le code nurturing existe (10 API routes, 724 lignes UI, 4 migrations SQL, 1 cron), mais 3 bugs empêchent un fonctionnement correct. Le plan corrige ces bugs, vérifie l'état de la DB, refactore en sous-composants, et ajoute des tests critiques.

---

## Architecture actuelle

```
┌──────────────────────────────────────────────────────────┐
│                    Browser (page.tsx)                      │
│                                                          │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────────┐  │
│  │ ContactList │ │ContactDetail │ │ MessageComposer  │  │
│  │ (filtres,   │ │(interactions,│ │ (email, WA,      │  │
│  │  tempéra-   │ │ séquences,   │ │  scheduling,     │  │
│  │  ture)      │ │ config)      │ │  templates)      │  │
│  └──────┬──────┘ └──────┬───────┘ └────────┬─────────┘  │
│         │               │                   │            │
└─────────┼───────────────┼───────────────────┼────────────┘
          │               │                   │
          ▼               ▼                   ▼
┌──────────────────────────────────────────────────────────┐
│              /api/nurturing/* (10 routes)                  │
│                                                          │
│  contacts · interactions · messages · documents          │
│  document-sends · prospect-themes · contact-config       │
│  scheduled · seed · documents/upload                     │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│                 Supabase (PostgreSQL)                      │
│                                                          │
│  prospects (+ nurturing columns)                         │
│  interactions · nurturing_themes · nurturing_messages    │
│  nurturing_documents · nurturing_document_sends          │
│  prospect_themes · scheduled_messages                    │
│  sequence_instances · sequence_instance_steps            │
└──────────────────────────────────────────────────────────┘
```

---

## Data Flow — Température (après correction)

```
                    CLIENT-SIDE ONLY
                    ════════════════
  prospects.last_contact_at ──┐
  prospects.sequence_active ──┼──► calculateTempCategory()
  prospects.nb_relances_     ─┤         │
    sans_reponse              │         ▼
  prospects.pressure_score ───┘    hot│warm│cold│dead
                                        │
                                        ▼
                                   UI badge couleur
                                   (pas stocké en DB)


  CRON nurturing-temperature :
  ════════════════════════════
  interactions ──► calcule nb_relances_sans_reponse
                   (NE TOUCHE PLUS nurturing_category)
```

---

## Tâches d'implémentation

### Phase 1 : Pré-requis (T0)

#### T0 — Vérifier les migrations en production
- **Priorité :** P0 (bloquant)
- **Effort :** human: ~5min / CC: ~1min
- **Action :** Exécuter dans Supabase SQL Editor :
  ```sql
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN ('nurturing_themes', 'nurturing_messages',
    'nurturing_documents', 'nurturing_document_sends',
    'prospect_themes', 'scheduled_messages');
  ```
- **Si manquant :** Appliquer les migrations dans l'ordre :
  1. `20260716_nurturing_storage.sql`
  2. `20260717_scheduled_messages.sql`
  3. `20260719_nurturing_tables.sql`
  4. `20260720_nurturing_backend.sql`
  5. `20260725_nurturing_prospect_columns.sql`
- **Vérifier aussi les colonnes :**
  ```sql
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'prospects'
  AND column_name IN ('nurturing_category', 'nb_relances_sans_reponse',
    'next_action_channel', 'pressure_score', 'preferred_channel',
    'contact_frequency_days');
  ```

---

### Phase 2 : Bug Fixes (T1-T3) — SÉQUENTIEL AVANT REFACTORING

#### T1 — Cron : supprimer l'update de nurturing_category
- **Priorité :** P1
- **Effort :** human: ~30min / CC: ~5min
- **Fichier :** `src/app/api/cron/nurturing-temperature/route.ts`
- **Changement :**
  - Supprimer la fonction `computeCategory()` et son appel
  - Supprimer le `.update({ nurturing_category: newCategory })`
  - Garder UNIQUEMENT la mise à jour de `nb_relances_sans_reponse`
  - Le cron calcule `consecutiveNR` et met à jour le champ correspondant
- **Verify :** `npm run build` (pas d'erreur TypeScript)

#### T2 — Frontend : mapper is_honored vers le statut UI
- **Priorité :** P1
- **Effort :** human: ~30min / CC: ~5min
- **Fichier :** `src/app/(dashboard)/nurturing/page.tsx`
- **Changement (ligne ~455) :**
  ```typescript
  // AVANT (cassé) :
  status: i.responded_at ? 'replied' : i.seen_at ? 'seen' : 'pending',

  // APRÈS (corrigé) :
  status: i.is_honored ? 'replied' : 'pending',
  ```
- **Vérification additionnelle :** `grep -rn "responded_at\|seen_at" src/` pour trouver d'autres occurrences
- **Verify :** npm run build + test visuel que les interactions s'affichent avec le bon statut

#### T3 — Seed : retirer responded_at
- **Priorité :** P1
- **Effort :** human: ~15min / CC: ~3min
- **Fichier :** `src/app/api/nurturing/seed/route.ts`
- **Changement :** Supprimer la ligne `responded_at: new Date(...)` de l'insert interaction (ligne ~61)
- **Verify :** POST `/api/nurturing/seed` → 200 OK, vérifier que Jean Test est créé

---

### Phase 3 : Refactoring (T4)

#### T4 — Découper page.tsx en sous-composants
- **Priorité :** P2
- **Effort :** human: ~4h / CC: ~30min
- **Fichiers créés :**
  ```
  src/app/(dashboard)/nurturing/
  ├── page.tsx              (orchestrateur : state lifting + layout)
  ├── ContactList.tsx       (sidebar gauche : liste filtrée + badges)
  ├── ContactDetail.tsx     (panneau droit : onglets séquence/historique/config)
  ├── MessageComposer.tsx   (zone d'envoi : canal + template + pièce jointe)
  ├── SequencePanel.tsx     (modal séquences : liste/création/détail)
  └── DocumentLibrary.tsx   (modal documents : upload + sélection)
  ```
- **Règles :**
  - `page.tsx` garde les useState principaux et les passe en props
  - Chaque composant reçoit callbacks pour mutations (onSend, onSave, etc.)
  - Pas de fetch dans les enfants — tout remonte via le parent
  - Style inline préservé (thème V = PSG Cosmos)
- **Verify :** `npm run build` + rendu visuellement identique à l'existant

---

### Phase 3b : Archivage contacts (T6)

#### T6 — Archiver des contacts nurturing
- **Priorité :** P2
- **Effort :** human: ~1h / CC: ~10min
- **Comportement :** Masqués par défaut, bouton toggle "Voir archivés" pour les retrouver
- **Migration SQL :**
  ```sql
  ALTER TABLE prospects ADD COLUMN IF NOT EXISTS nurturing_archived boolean DEFAULT false;
  ```
- **API — modifier** `src/app/api/nurturing/contacts/route.ts` :
  - GET : ajouter `.eq('nurturing_archived', false)` par défaut
  - Accepter query param `?include_archived=true` pour les voir
- **API — créer** `src/app/api/nurturing/contacts/archive/route.ts` :
  ```typescript
  // PATCH { prospect_id, archived: true|false }
  // → update prospects SET nurturing_archived = $archived WHERE id = $prospect_id
  ```
- **UI :**
  - Bouton "Archiver" dans le menu contextuel de chaque contact (icône 📦)
  - Filtre toggle "📦 Archivés" dans la barre de filtres (à côté des filtres température)
  - Contacts archivés affichés avec opacité réduite + bouton "Désarchiver"
  - Le cron nurturing-temperature ignore les prospects archivés
- **Verify :** Archiver un contact → disparaît de la liste. Toggle "Archivés" → le contact apparaît grisé. Désarchiver → retour normal.

---

### Phase 4 : Tests (T5)

#### T5 — Tests critiques
- **Priorité :** P2
- **Effort :** human: ~2h / CC: ~20min
- **Fichiers :**
  - `tests/nurturing.spec.ts` (Playwright E2E)
  - `tests/unit/calculateTempCategory.test.ts` (unit)

**Tests E2E (Playwright) :**
1. Page load → contacts affichés (pas de spinner infini)
2. Création contact → apparaît dans la liste
3. Clic contact → détails chargés (interactions visibles)
4. Filtrage température → liste filtrée correctement

**Test unitaire :**
```typescript
// calculateTempCategory
test('dead si nb_relances >= 5', ...)
test('dead si pressure_score = a_stopper', ...)
test('hot si lastContact <= 3 jours', ...)
test('hot si sequence active', ...)
test('warm si lastContact 4-7 jours', ...)
test('cold si lastContact > 7 jours', ...)
test('cold si lastContact null', ...)
```

---

## NOT in scope

| Item | Raison |
|------|--------|
| Cloud Scheduler pour cron serveur | Fonctionne pour 1 utilisateur, amélioration future |
| Couverture tests 100% (20 paths) | Tests critiques couvrent les paths corrigés |
| API consolidée `/contact-full` | Latence acceptable solo |
| calculateTempCategory côté serveur | Pas de besoin immédiat |
| Automatisation exécution séquences | Dépend infrastructure cron globale |
| Granularité statut seen/replied | is_honored suffit (pas d'API tracking ouvertures) |

---

## Ordre d'exécution

```
T0 (vérif DB) → T1+T2+T3 (bug fixes) → T4 (refactoring) → T6 (archivage) → T5 (tests)
     │                 │                       │                  │               │
     ▼                 ▼                       ▼                  ▼               ▼
  Si tables      npm run build           Rendu visuel       Archiver un      npx playwright
  manquent →     OK + test visuel        identique          contact →        test --grep
  appliquer                                                 disparaît        nurturing
  migrations
```

---

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 1 | STALE (via /autoplan) | mode: SELECTIVE_EXPANSION, 0 critical gaps |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | — |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 2 | CLEAR (PLAN) | 6 issues, 1 critical gap |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | — |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |

**VERDICT:** ENG CLEARED — ready to implement.

NO UNRESOLVED DECISIONS
