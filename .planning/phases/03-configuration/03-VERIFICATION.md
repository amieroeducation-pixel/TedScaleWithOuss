---
phase: 03-configuration
verified: 2026-05-11T00:00:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Persister et recharger les seuils KPI"
    expected: "Modifier ca_monthly_target + cliquer Enregistrer, recharger la page — la nouvelle valeur s'affiche dans le champ"
    why_human: "Nécessite Supabase actif et session auth — ne peut pas être vérifié sans serveur lancé"
  - test: "Créer un template de séquence et ajouter une étape"
    expected: "Cliquer '+ Nouveau template', nommer, créer, expand, '+ Etape' — l'étape email J+3 apparaît dans la liste"
    why_human: "Interaction UI + persistance DB — ne peut pas être vérifié sans serveur lancé"
  - test: "Conflit auto_trigger sur l'onglet Triggers"
    expected: "Activer le toggle d'un template sur un stade déjà occupé — rollback immédiat + message d'erreur rouge inline (pas de crash)"
    why_human: "Nécessite au moins 2 templates avec le même pipeline_stage en base — données de test requises"
  - test: "Sauvegarder et recharger un template de message JSONB"
    expected: "Onglet Notif, sélectionner WhatsApp + 'À contacter', taper un texte, Enregistrer, recharger — le texte est rechargé dans le textarea"
    why_human: "Persistance JSONB dans user_settings — nécessite Supabase actif avec session"
---

# Phase 3 : Configuration — Rapport de Vérification

**Objectif de la phase :** L'utilisateur peut personnaliser séquences, seuils KPI, templates de messages et triggers depuis une page Paramètres
**Vérifié :** 2026-05-11
**Statut :** HUMAN_NEEDED — Vérification automatique : 5/5 vérités confirmées dans le code, 4 comportements nécessitant un test humain (serveur + DB)
**Re-vérification :** Non — vérification initiale

---

## Succès Critère du ROADMAP (5 critères contractuels)

| # | Critère | Statut | Preuve |
|---|---------|--------|--------|
| 1 | L'utilisateur peut créer, modifier et supprimer des étapes de séquence par stade pipeline avec délais configurables | ✓ VERIFIED | `TabSequences` dans `settings/page.tsx` (lignes 866-1109) — CRUD complet via 4 routes API |
| 2 | L'utilisateur peut éditer les templates de messages pour chaque canal (WhatsApp, Email, SMS) et chaque stade | ✓ VERIFIED | `TabNotifications` (lignes 629-704) — sélecteur canal/stade + textarea + `save({ message_templates })` |
| 3 | L'utilisateur peut définir les seuils KPI (CA mensuel cible, CA annuel cible, jours d'inactivité) | ✓ VERIFIED | `TabKPI` (lignes 358-509) — champs contrôlés + `handleSaveCollecte` + `handleSaveInactivite` |
| 4 | L'utilisateur peut activer ou désactiver chaque trigger automatique individuellement | ✓ VERIFIED | `TabTriggers` (lignes 1112-1216) — toggle individuel + PATCH optimiste avec rollback 409 |
| 5 | Toutes les configurations sont persistées dans `user_settings` et rechargées au démarrage sans perte | ✓ VERIFIED | `useUserSettings` fetch GET au mount + PATCH on save ; merge JSONB double protection côté client+serveur |

**Score :** 5/5 critères vérifiés dans le code

---

## Vérités Observables (Plans PLAN frontmatter)

### Plan 03-01 : Settings API + KPI

| # | Vérité | Statut | Preuve |
|---|--------|--------|--------|
| 1 | GET /api/settings retourne les valeurs par défaut si aucune row n'existe (code PGRST116 géré) | ✓ VERIFIED | `route.ts` lignes 43-45 : `if (error.code === 'PGRST116') return apiSuccess(getDefaultSettings())` |
| 2 | PATCH /api/settings persiste ca_monthly_target, ca_annual_target et client_health_threshold_days | ✓ VERIFIED | `PatchSettingsSchema` ligne 19-28 + UPSERT ligne 87-93 — tous 3 champs dans le schéma Zod |
| 3 | L'onglet KPI charge les valeurs réelles depuis l'API au montage | ✓ VERIFIED | `useUserSettings` fetch GET + `useEffect([settings])` dans `TabKPI` synchronise les champs contrôlés |
| 4 | Modifier un seuil et cliquer Enregistrer persiste la valeur | ✓ VERIFIED | `handleSaveCollecte` et `handleSaveInactivite` appellent `save()` → PATCH → UPSERT Supabase |

### Plan 03-02 : Sequences CRUD

| # | Vérité | Statut | Preuve |
|---|--------|--------|--------|
| 1 | L'utilisateur peut créer un nouveau template depuis l'onglet Séquences | ✓ VERIFIED | `createTemplate()` → POST `/api/crm/sequences/templates` + affichage dans la liste |
| 2 | L'utilisateur peut renommer un template et changer son pipeline_stage | ✓ VERIFIED | `patchTemplate()` → PATCH `/api/crm/sequences/templates/{id}` ; select inline dans l'UI |
| 3 | L'utilisateur peut supprimer un template (steps supprimés par cascade) | ✓ VERIFIED | `deleteTemplate()` → DELETE + `.eq('user_id', user.id)` ; cascade définie en migration |
| 4 | L'utilisateur peut ajouter une étape (channel, delay_days) | ✓ VERIFIED | `addStep()` → POST steps avec `{ channel: 'email', delay_days: 3, step_order }` |
| 5 | L'utilisateur peut modifier ou supprimer une étape existante | ✓ VERIFIED | `patchStep()` + `deleteStep()` dans l'UI expanded ; routes PATCH + DELETE steps opérationnelles |
| 6 | Activer auto_trigger sur un stage déjà occupé produit une erreur claire | ✓ VERIFIED | Route `[id]/route.ts` lignes 38-53 : SELECT count + 409 si conflit ; `toggleAutoTrigger` affiche `setError(apiErr)` |
| 7 | L'onglet Séquences remplace le placeholder du plan 03-01 | ✓ VERIFIED | Ligne 1340 : `{activeTab === 'sequences' && <TabSequences />}` — plus aucun `<div>...placeholder...</div>` |

### Plan 03-03 : Triggers + Messages

| # | Vérité | Statut | Preuve |
|---|--------|--------|--------|
| 1 | L'onglet Triggers liste tous les templates avec pipeline_stage et toggle auto_trigger | ✓ VERIFIED | `TabTriggers` fetch GET templates au mount + rendu `SetRow` par template avec `Toggle` |
| 2 | Activer/désactiver un trigger persisté en base immédiatement | ✓ VERIFIED | `handleToggle()` → PATCH optimiste + sync avec réponse serveur ou rollback si erreur |
| 3 | L'onglet Notifications permet d'éditer les templates JSONB par canal et par stade | ✓ VERIFIED | Section "TEMPLATES DE MESSAGES" lignes 629-704 : sélecteur canal + sélecteur stade + textarea |
| 4 | Sauvegarder un template de message déclenche PATCH /api/settings | ✓ VERIFIED | `saveMessageTemplate()` appelle `save({ message_templates: merged })` → PATCH /api/settings |
| 5 | Rechargement : templates de messages et état des triggers rechargés sans perte | ✓ VERIFIED | `useUserSettings` fetch GET au mount ; `TabTriggers` fetch GET au mount ; merge JSONB double protection |

---

## Artefacts Requis

| Artefact | Attendu | Statut | Détails |
|----------|---------|--------|---------|
| `src/app/api/settings/route.ts` | GET + PATCH avec UPSERT et defaults PGRST116 | ✓ VERIFIED | 97 lignes — GET + PGRST116 + PATCH Zod + UPSERT + merge JSONB |
| `src/hooks/useUserSettings.ts` | Hook fetch + save avec état local | ✓ VERIFIED | 49 lignes — `useEffect` fetch, `save` PATCH, `UserSettings` type |
| `src/app/(dashboard)/settings/page.tsx` | TabKPI + TabSequences + TabTriggers + TabNotifications branchés | ✓ VERIFIED | 1344 lignes — tous 4 onglets fonctionnels et branchés sur API |
| `src/app/api/crm/sequences/templates/route.ts` | GET (existant) + POST nouveau template | ✓ VERIFIED | GET existant préservé + POST ajouté — Zod + INSERT + 201 |
| `src/app/api/crm/sequences/templates/[id]/route.ts` | PATCH (nom/stage/auto_trigger) + DELETE | ✓ VERIFIED | Conflict check 409 avant PATCH auto_trigger=true + IDOR `.eq('user_id')` |
| `src/app/api/crm/sequences/templates/[id]/steps/route.ts` | GET steps + POST nouvelle step | ✓ VERIFIED | `verifyTemplateOwnership()` + gestion code 23505 UNIQUE |
| `src/app/api/crm/sequences/templates/[id]/steps/[stepId]/route.ts` | PATCH + DELETE step | ✓ VERIFIED | `verifyStepOwnership()` via join inner + step_order exclu du PATCH |

---

## Liens Clés (Wiring)

| De | Vers | Via | Statut | Détails |
|----|------|-----|--------|---------|
| `settings/page.tsx (TabKPI)` | `/api/settings` | `useUserSettings` hook — fetch GET au mount, PATCH on save | ✓ WIRED | Ligne 1283 : `useUserSettings()` instancié, passé en props à TabKPI ligne 1335 |
| `src/app/api/settings/route.ts` | `supabase user_settings` | `upsert({ id: user.id, ...updateData })` | ✓ WIRED | Ligne 87 : UPSERT avec `.eq('id', user.id).select().single()` |
| `settings/page.tsx (TabSequences)` | `/api/crm/sequences/templates` | fetch GET + POST/PATCH/DELETE on actions | ✓ WIRED | Lignes 881, 902, 925, 916 — tous les verbes HTTP présents |
| `PATCH template auto_trigger=true` | conflict check user_id + pipeline_stage | SELECT count avant PATCH | ✓ WIRED | `[id]/route.ts` lignes 38-53 — `count > 0` → 409 |
| `settings/page.tsx (TabTriggers)` | `/api/crm/sequences/templates PATCH auto_trigger` | fetch PATCH on Toggle change | ✓ WIRED | `handleToggle()` ligne 1129 → PATCH + rollback 409 |
| `settings/page.tsx (TabNotifications)` | `/api/settings PATCH message_templates` | `save({ message_templates: merged })` via `useUserSettings` | ✓ WIRED | `saveMessageTemplate()` ligne 538 — merge double protection |

---

## Trace Data-Flow (Niveau 4)

| Artefact | Variable de données | Source | Produit des données réelles | Statut |
|----------|--------------------|---------|-----------------------------|--------|
| `TabKPI` — champs caMonthly/caAnnual/healthDays | `settings` (prop) | `useUserSettings()` → `fetch('/api/settings')` → Supabase `user_settings` | Oui — GET avec fallback PGRST116, PATCH avec UPSERT | ✓ FLOWING |
| `TabSequences` — liste templates | `templates` (state) | `fetch('/api/crm/sequences/templates')` → Supabase `sequence_templates` | Oui — `.select('id, name, pipeline_stage, auto_trigger').eq('user_id')` | ✓ FLOWING |
| `TabTriggers` — liste templates + toggles | `templates` (state) | `fetch('/api/crm/sequences/templates')` → même route | Oui — identique à TabSequences | ✓ FLOWING |
| `TabNotifications` — editedText | `settings?.message_templates` (prop) | même `useUserSettings()` → `user_settings.message_templates` JSONB | Oui — `useEffect([selectedChannel, selectedStage, settings])` sync | ✓ FLOWING |

---

## Vérifications Comportementales (Spot-Checks)

| Comportement | Vérification | Résultat | Statut |
|---|---|---|---|
| `getDefaultSettings()` exportée | `grep "export function getDefaultSettings"` dans route.ts | Trouvée ligne 6 | ✓ PASS |
| Zod v4 `.issues` (pas `.errors`) | Grep dans tous les fichiers modifiés | `.issues[0].message` utilisé partout — `.errors` absent | ✓ PASS |
| `await params` Next.js 15 | Grep dans les routes dynamiques | `const { id } = await params` présent dans toutes les routes [id] | ✓ PASS |
| `className=` absent (design C.*) | Grep dans settings/page.tsx | Aucun résultat — uniquement `style={{ }}` avec `C.*` | ✓ PASS |
| Aucun placeholder résiduel | Grep "Onglet Séquences — disponible" / "Onglet Triggers — disponible" | Aucun résultat — placeholders remplacés par les vrais composants | ✓ PASS |
| IDOR protection steps | `verifyStepOwnership` via join inner | `sequence_template_steps!inner(user_id)` — vérification en 1 requête | ✓ PASS |

---

## Couverture des Requirements

| Requirement | Plan(s) | Description | Statut | Preuve |
|-------------|---------|-------------|--------|--------|
| CFG-01 | 03-02 | Configurer séquences par stade (ajouter/modifier/supprimer étapes) | ✓ SATISFAIT | TabSequences + routes CRUD templates + steps |
| CFG-02 | 03-02 | Définir délais entre étapes (J+0, J+2, J+5...) | ✓ SATISFAIT | `delay_days` éditable dans UI + PATCH step ; Zod `z.number().int().min(0).max(365)` |
| CFG-03 | 03-02 | Choisir canaux actifs par étape (WhatsApp/Email/SMS/Appel/LinkedIn) | ✓ SATISFAIT | `CHANNEL_OPTIONS` dans UI + `z.enum(CHANNELS)` dans route ; 5 canaux disponibles |
| CFG-04 | 03-03 | Éditer templates de messages par canal et par stade | ✓ SATISFAIT | Section "TEMPLATES DE MESSAGES" dans TabNotifications — sélecteur canal + stade + textarea |
| CFG-05 | 03-02, 03-03 | Configurer quels changements de stade déclenchent une séquence | ✓ SATISFAIT | `pipeline_stage` sélectionnable par template (03-02) + `auto_trigger` toggle (03-03) |
| CFG-06 | 03-01 | Configurer seuils KPI (CA mensuel cible, CA annuel cible) | ✓ SATISFAIT | TabKPI `caMonthly` + `caAnnual` contrôlés + `handleSaveCollecte` → PATCH |
| CFG-07 | 03-01 | Configurer seuil d'inactivité client (défaut 90 jours) | ✓ SATISFAIT | TabKPI `healthDays` contrôlé + `handleSaveInactivite` → PATCH |
| CFG-08 | 03-02, 03-03 | Activer/désactiver chaque trigger individuellement | ✓ SATISFAIT | Toggle dans TabSequences + TabTriggers → PATCH auto_trigger ; conflit 409 bloquant |
| CFG-09 | 03-01, 03-02, 03-03 | Configuration persistée dans user_settings et rechargée au démarrage | ✓ SATISFAIT | `useUserSettings` fetch GET au mount ; TabTriggers fetch GET au mount ; merge JSONB |

**Tous les 9 requirements CFG (01 à 09) satisfaits.**

Note REQUIREMENTS.md : CFG-01 à CFG-05 et CFG-08 sont encore marqués `[ ]` (Pending) dans la table de traçabilité. Ceux-ci devraient être mis à jour en `[x]` après validation humaine.

---

## Anti-Patterns Détectés

| Fichier | Ligne | Pattern | Gravité | Impact |
|---------|-------|---------|---------|--------|
| `settings/page.tsx` | 186, 233, 246 | `NumInput` dans TabGeneral sans `onChange` — non branchés sur persistance | ℹ️ Info | Hors scope Phase 3 — ces champs Général sont UI-only, non reliés à `user_settings` |
| `settings/page.tsx` | 267-274 | `input type="number"` avec `defaultValue` (non contrôlé) dans TabGeneral | ℹ️ Info | Hors scope Phase 3 — objectifs annuels non persistés dans `user_settings` |

**Aucun anti-pattern bloquant.** Les patterns détectés dans TabGeneral sont délibérément hors scope de la Phase 3 (CFG-01 à CFG-09 ne couvrent pas les objectifs quotidiens du TabGeneral).

---

## Vérification Humaine Requise

### 1. Persister et recharger les seuils KPI

**Test :** Sur `/settings` onglet KPI — modifier le CA mensuel cible (ex: 20 000), cliquer "Enregistrer", recharger la page, revenir sur l'onglet KPI.
**Attendu :** La valeur 20 000 s'affiche dans le champ (pas 15 000 par défaut).
**Pourquoi humain :** Persistance Supabase `user_settings` — nécessite session auth active et DB accessible.

### 2. Créer un template de séquence et ajouter une étape

**Test :** Sur `/settings` onglet Séquences — cliquer "+ Nouveau template", nommer "Test Relance", cliquer "Créer". Expand le template (▼ Etapes), cliquer "+ Etape".
**Attendu :** Template visible dans la liste ; étape "email J+3" visible dans l'accordéon.
**Pourquoi humain :** Écriture dans `sequence_templates` et `sequence_template_steps` — nécessite DB Supabase active.

### 3. Conflit auto_trigger (erreur 409 visible)

**Test :** Créer 2 templates avec le même `pipeline_stage` (ex: rdv1). Activer `auto_trigger` sur le premier. Tenter d'activer le toggle du second depuis l'onglet Triggers ou Séquences.
**Attendu :** Le toggle revient à son état précédent (rollback) et un message d'erreur rouge apparaît en dessous de la liste : "Un trigger auto existe déjà pour le stade rdv1. Désactivez-le d'abord."
**Pourquoi humain :** Scénario multi-données + comportement UI rollback — impossible à vérifier sans données en base.

### 4. Sauvegarder et recharger un template de message JSONB

**Test :** Onglet Notifications — sélectionner "WhatsApp" + stade "À contacter", taper "Bonjour {{prenom}}, je vous contacte...", cliquer "Enregistrer le template", recharger la page, revenir sur l'onglet.
**Attendu :** Toast "Template de message enregistré" apparaît. Après rechargement, le texte saisi est rechargé dans le textarea (indicateur "✓ Template existant chargé" visible).
**Pourquoi humain :** Persistance JSONB `user_settings.message_templates` — nécessite Supabase actif.

---

## Résumé

La Phase 3 atteint son objectif : **tous les artifacts existent, sont substantiels et correctement branchés sur des APIs Supabase réelles**. Aucun stub ou placeholder résiduel n'a été détecté dans le périmètre CFG.

Les 5 critères de succès du ROADMAP sont vérifiés dans le code :
1. CRUD séquences/étapes — opérationnel via 4 routes API + TabSequences
2. Éditeur templates JSONB par canal/stade — opérationnel dans TabNotifications
3. Seuils KPI persistés — route /api/settings + hook useUserSettings + TabKPI contrôlé
4. Triggers individuels — TabTriggers avec optimistic update et rollback 409
5. Persistance au démarrage — fetch GET au mount dans tous les composants concernés

Les 4 items en vérification humaine sont des tests de bout-en-bout nécessitant un serveur Next.js et Supabase actifs — ils ne remettent pas en cause l'implémentation visible dans le code.

---

_Vérifié : 2026-05-11_
_Verifier : Claude (gsd-verifier)_
