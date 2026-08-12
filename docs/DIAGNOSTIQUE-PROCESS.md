# Process Diagnostique — Méthodologie Standard

**Process obligatoire pour TOUS les projets — à intégrer dans chaque CLAUDE.md**

Ce process garantit un **AUDIT complet du BOILERPLATE** avec distinction claire ACTION vs FONCTION et tests manuels réels.

---

## 📋 Définition

**Diagnostique** = **État des lieux exhaustif du BOILERPLATE existant** pour documenter :
1. **Actions utilisateur** — Ce que l'utilisateur FAIT dans le boilerplate existant (clics, saisies, sélections)
2. **Fonctions techniques** — Le CODE déjà présent qui exécute ces actions (handlers, API calls, calculs)
3. **Outils utilisés** — Packages déjà installés, libraries, APIs
4. **Statut fonctionnel RÉEL** — Testé manuellement : ça marche ou pas ?

**IMPORTANT** : Le Diagnostique est un **AUDIT**, pas un développement. On teste ce qui EXISTE, on ne crée rien de nouveau.

**Règle critique** : **ACTION ≠ FONCTION**
- ❌ FAUX : "Créer un contact" (trop vague, mélange action et fonction)
- ✅ CORRECT :
  - **ACTION** : "Cliquer sur 'Nouveau contact', remplir nom/email/tel, cliquer 'Sauvegarder'"
  - **FONCTION** : `handleCreateContact()` → validation zod → `POST /api/contacts` → `createContact()` DB

---

## 🔍 Process en 2 Phases (AUDIT uniquement)

### Phase 1 : INVENTAIRE (Lister tout ce qui existe)

**Objectif** : Découvrir TOUT ce qui est déjà dans le boilerplate

#### Étape 1.1 : Lecture Code
- [ ] Lire TOUS les fichiers concernés (page, composants, API routes)
- [ ] Identifier TOUTES les fonctions impliquées (handlers, helpers, API)
- [ ] Noter les packages utilisés (imports)
- [ ] Chercher les TODOs, commentaires "non implémenté", fonctions vides

#### Étape 1.2 : Distinction Actions vs Fonctions
Pour chaque fonctionnalité, créer un tableau :

| Niveau | Description | Exemple |
|--------|-------------|---------|
| **ACTION utilisateur** | Geste physique/visuel de l'utilisateur | "Cliquer sur le bouton 'Exporter CSV'" |
| **Handler UI** | Fonction déclenchée par l'action | `handleExportClick()` |
| **Logique métier** | Traitement des données | `generateCSV(contacts)` |
| **API call** | Requête serveur (si besoin) | `POST /api/exports` |
| **Fonction serveur** | Code backend | `exportContactsToCSV()` |
| **Feedback UI** | Retour utilisateur | "Afficher toast 'Export réussi'" |

#### Étape 1.3 : Lister les Packages Installés
```bash
cat package.json | grep "dependencies"
```
- [ ] Noter TOUS les packages (nom + version)
- [ ] Identifier les outils UI (Radix, Material, Chakra, etc.)
- [ ] Identifier les outils form (react-hook-form, formik, etc.)
- [ ] Identifier les outils state (zustand, redux, react-query, etc.)

---

### Phase 2 : TEST (Vérifier ce qui marche)

**Objectif** : TESTER le boilerplate existant sans rien développer

#### Étape 2.1 : Lancer le Serveur
```bash
npm run dev
```

#### Étape 2.2 : Test Manuel de CHAQUE Action
- [ ] Naviguer vers chaque page du boilerplate
- [ ] **TESTER chaque action** dans le navigateur (clics, saisies, formulaires)
- [ ] Noter le comportement RÉEL :
  - ✅ Fonctionne comme attendu
  - ⚠️ Fonctionne partiellement (bug, limitation)
  - ❌ Ne fonctionne pas (erreur, absent, bouton mort)

**Template de test** :
```
Page testée : [nom de la page]

Action #1 : [description]
Étapes :
1. [étape 1]
2. [étape 2]
3. [résultat]

Comportement observé :
- [ce qui se passe]
- [messages erreur si présents]
- [bugs visuels si présents]

Statut : [✅/⚠️/❌]

---

Action #2 : ...
```

**Scénarios de test obligatoires** :
1. **Happy path** : Utilisation normale
2. **Edge cases** : Liste vide, caractères spéciaux, champs vides
3. **Error cases** : Erreurs réseau, validations échouées

#### Étape 2.3 : Documentation Bugs
Pour chaque bug détecté :
```
Bug #X : [titre court]

Reproduction :
1. [étape 1]
2. [étape 2]
3. [résultat incorrect]

Attendu : [ce qui devrait se passer]
Observé : [ce qui se passe]
Gravité : [Critique/Majeur/Mineur]

Fichiers concernés :
- [fichier:ligne]

Cause probable : [hypothèse]
```

#### Étape 2.4 : Mise à Jour Tableau

Mettre à jour le tableau Actions/Fonctions/Outils avec le résultat des tests :

```markdown
| # | Action Utilisateur | Fonctions Techniques | Outils | Statut |
|---|-------------------|---------------------|--------|--------|
| X | [liste détaillée des gestes] | [liste des fonctions code trouvées] | [packages installés] | [✅/⚠️/❌] |
```

**Règles statut** :
- ✅ **Opérationnel** : Fonctionne dans le navigateur, aucun bug bloquant
- ⚠️ **Partiel** : Fonctionne mais avec limitations/bugs mineurs
- ❌ **Non fonctionnel** : Ne fonctionne pas, erreur, ou absent du boilerplate

**JAMAIS mettre ✅ sans avoir testé manuellement dans le navigateur.**

---

## 📊 Tableau Standard Actions/Fonctions/Outils

### Structure Obligatoire

```
┌─────────────────┬────────────────┬──────────────────────────────────────┬──────────────────────────────────┬───────────────┐
│        #        │  Action User   │        Fonctions Principales         │              Outils              │    Statut     │
│                 │                │                                      │                                  │  Fonctionnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 1. CATÉGORIE    │                │                                      │                                  │               │
│ (X actions)     │                │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 1               │ [ACTION 1]     │ [FONCTIONS 1]                        │ [OUTILS 1]                       │ [✅/⚠️/❌]    │
│                 │ Détails gestes │ Liste complète des fonctions code    │ Packages utilisés                │ Justification │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 2               │ [ACTION 2]     │ [FONCTIONS 2]                        │ [OUTILS 2]                       │ [✅/⚠️/❌]    │
└─────────────────┴────────────────┴──────────────────────────────────────┴──────────────────────────────────┴───────────────┘
```

### Exemple Concret

```
┌─────────────────┬────────────────┬──────────────────────────────────────┬──────────────────────────────────┬───────────────┐
│ 1               │ Exporter       │ handleExportClick() →                │ papaparse (CSV), xlsx (Excel),   │ ✅            │
│                 │ contacts CSV   │ generateCSV(contacts) →              │ file-saver (download),           │ Opérationnel  │
│                 │                │ Blob creation → download trigger     │ Array.map(), Date.now()          │               │
│                 │                │                                      │                                  │               │
│                 │ Détails :      │ Détails :                            │                                  │ Testé :       │
│                 │ 1. Cliquer     │ 1. Filter contacts (search/temp)     │                                  │ - Export vide │
│                 │    bouton      │ 2. Map to CSV rows                   │                                  │ - Export 1    │
│                 │    "Exporter"  │ 3. papaparse.unparse()               │                                  │ - Export 100  │
│                 │ 2. Sélection   │ 4. new Blob([csv], { type })         │                                  │ - Caractères  │
│                 │    format      │ 5. URL.createObjectURL()             │                                  │   spéciaux    │
│                 │    (CSV/Excel) │ 6. <a> click trigger                 │                                  │ - Accent OK   │
│                 │ 3. Fichier     │ 7. revoke URL                        │                                  │               │
│                 │    téléchargé  │                                      │                                  │               │
└─────────────────┴────────────────┴──────────────────────────────────────┴──────────────────────────────────┴───────────────┘
```

---

## 🎯 Distinction ACTION vs FONCTION — Exemples

### ❌ MAUVAIS (mélange)

| # | Action | Fonction |
|---|--------|----------|
| 1 | Créer contact | POST /api/contacts |

**Problème** : On ne sait pas ce que l'utilisateur FAIT ni comment le code fonctionne.

### ✅ CORRECT (détaillé)

| # | Action Utilisateur | Fonctions Techniques |
|---|-------------------|---------------------|
| 1 | **Créer contact**<br><br>1. Cliquer "Nouveau contact"<br>2. Remplir nom (input text)<br>3. Remplir email (input email)<br>4. Remplir téléphone (input tel)<br>5. Cliquer "Sauvegarder"<br>6. Voir toast "Contact créé"<br>7. Contact apparaît dans liste | **handleCreateClick()**<br>→ setShowModal(true)<br><br>**handleNameChange(e)**<br>→ setFormData({...})<br><br>**handleEmailChange(e)**<br>→ validation email regex<br><br>**handlePhoneChange(e)**<br>→ normalizePhone() (libphonenumber-js)<br><br>**handleSubmit()**<br>→ validation zod schema<br>→ POST /api/contacts<br>→ createContact(data) (serveur)<br>→ INSERT INTO contacts<br>→ revalidatePath('/contacts')<br>→ toast.success()<br>→ refetch contacts |

---

## 📝 Template Rapport Diagnostique

À créer pour chaque module/feature analysé :

```markdown
# Diagnostique [Module X] — [Date]

## Résumé Exécutif

| Métrique | Valeur |
|----------|--------|
| Actions totales | X |
| ✅ Opérationnel | X (X%) |
| ⚠️ Partiel | X (X%) |
| ❌ Non fonctionnel | X (X%) |
| Tests manuels effectués | X |
| Bugs détectés | X |

## Actions Prioritaires

1. [Action 1] — [Raison] — [Effort estimé]
2. [Action 2] — [Raison] — [Effort estimé]

## Tableau Détaillé

[Tableau complet Actions/Fonctions/Outils/Statut]

## Bugs Détectés

### Bug #1 : [Titre]
- Gravité : [Critique/Majeur/Mineur]
- Reproduction : [étapes]
- Cause : [hypothèse]
- Fix proposé : [solution]

## Tests Effectués

### Scénario 1 : [Nom]
- Objectif : [description]
- Étapes : [liste]
- Résultat : [✅/⚠️/❌]
- Notes : [observations]

## Recommandations

1. **Corrections immédiates** (bugs critiques)
2. **Améliorations court terme** (quick wins)
3. **Évolutions long terme** (features manquantes)
```

---

## 🔧 Intégration dans CLAUDE.md

Ajouter cette section dans TOUS les CLAUDE.md :

```markdown
## Process Diagnostique

Avant de travailler sur une fonctionnalité, TOUJOURS effectuer un Diagnostique complet :

1. **Phase AVANT** : Lecture code + distinction Actions/Fonctions + test manuel état actuel
2. **Phase PENDANT** : Implémentation + build
3. **Phase APRÈS** : Test manuel complet + documentation bugs + mise à jour tableau

**Méthodologie complète** : Voir `docs/DIAGNOSTIQUE-PROCESS.md`

**Règle absolue** : Distinguer ACTIONS (utilisateur) vs FONCTIONS (code)
- ACTION = geste physique/visuel ("Cliquer sur X", "Saisir Y")
- FONCTION = code technique (`handleClick()`, `POST /api/...`)

**Ne JAMAIS mettre ✅ sans test manuel dans le navigateur.**
```

---

## 🎓 Formation Équipe

### Quiz de Validation

**Question 1** : Quelle est la différence entre ACTION et FONCTION ?
- [ ] Aucune, c'est pareil
- [ ] ACTION = ce que fait l'utilisateur, FONCTION = le code qui exécute
- [ ] ACTION = frontend, FONCTION = backend

**Question 2** : Quand peut-on mettre ✅ Opérationnel ?
- [ ] Après avoir écrit le code
- [ ] Après avoir lu le code et compris qu'il devrait marcher
- [ ] Après avoir testé manuellement dans le navigateur sans bug

**Question 3** : Que doit contenir la colonne "Action Utilisateur" ?
- [ ] "Créer un contact"
- [ ] "handleCreateContact()"
- [ ] "1. Cliquer 'Nouveau', 2. Remplir nom, 3. Cliquer 'Sauvegarder', 4. Voir toast"

<details>
<summary>Réponses</summary>

1. B — ACTION = ce que fait l'utilisateur, FONCTION = le code qui exécute
2. C — Après avoir testé manuellement dans le navigateur sans bug
3. C — Liste détaillée des gestes utilisateur

</details>

---

## 📚 Ressources

- Template tableau : `docs/templates/diagnostique-tableau.md`
- Template rapport : `docs/templates/diagnostique-rapport.md`
- Exemples : `docs/diagnostique/` (un par module)

---

**Document créé le** : 2026-08-11
**Auteur** : Process standardisé TedScaleWithOuss
**Version** : 1.0
**Statut** : Obligatoire pour tous les projets
