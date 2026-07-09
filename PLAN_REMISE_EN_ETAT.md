# PLAN DE REMISE EN ÉTAT — Dashboard CGP Top Performer

**Date** : 3 juillet 2026
**Objectif** : Rendre le dashboard 100% fonctionnel et cohérent. Un CGP doit pouvoir l'utiliser toute la journée sans friction, du premier appel à la signature.

---

## PRINCIPES DE COHÉRENCE

1. **Un prospect contacté disparaît des résultats de recherche** (anti-doublons)
2. **Toute action met à jour les stats en temps réel** (pas de données isolées)
3. **Les données persistent en DB** (rien en localStorage qui mérite d'être gardé)
4. **Le flux est linéaire** : Recherche → CRM → Appel → RDV → Signature → Revenue
5. **Chaque section sert le même but** : aider le CGP à performer

---

## PHASE 1 — FONDATIONS (critique, tout le reste en dépend)

### 1.1 Migration Supabase manquante

**Fichier** : `supabase/migrations/016_fix_missing_columns.sql`

```sql
-- Colonne blocs manquante dans daily_kpis
ALTER TABLE daily_kpis ADD COLUMN IF NOT EXISTS blocks integer NOT NULL DEFAULT 0;

-- Colonnes Google Calendar OAuth manquantes
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS google_calendar_access_token text;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS google_calendar_token_expiry bigint;

-- Index anti-doublons sur prospects (téléphone unique par utilisateur)
CREATE UNIQUE INDEX IF NOT EXISTS idx_prospects_phone_user 
  ON prospects(phone, user_id) WHERE phone IS NOT NULL AND phone != '';
```

### 1.2 API anti-doublons prospects

**Fichier** : `src/app/api/prospects/route.ts`

- Avant d'insérer un prospect, vérifier si le téléphone existe déjà en base
- Si doublon → retourner 409 Conflict avec le prospect existant
- Les résultats de recherche TNS/Chefs doivent exclure les prospects déjà en base

**Fichier** : `src/app/api/prospection/tns/route.ts`
- Après la recherche, filtrer les résultats : exclure ceux dont le téléphone est déjà dans `prospects`

**Fichier** : `src/app/api/prospection/chefs/workflow/route.ts`
- Idem : exclure les entreprises déjà en base (par SIREN ou téléphone)

### 1.3 API daily_kpis — Enregistrement automatique

**Fichier** : `src/app/api/today/kpis/route.ts`

- POST : incrémente le compteur du jour (appels, contacts, rdv, blocs)
- GET : retourne les KPIs du jour en cours
- Les compteurs se remettent à 0 chaque jour automatiquement

---

## PHASE 2 — FLUX PROSPECTION (le cœur du dashboard)

### 2.1 Recherche TNS → CRM (sans doublons)

**Fichier** : `src/app/(dashboard)/prospection/tns/page.tsx`

- [ ] Quand un prospect est ajouté au CRM via "Ajouter", il disparaît immédiatement de la liste des résultats
- [ ] Badge "Déjà dans le CRM" sur les résultats qui existent déjà en base
- [ ] Les numéros affichés dans la section "Base TNS Actuelle" / "Aujourd'hui" doivent tourner (pas toujours les mêmes)
- [ ] Ajouter les métiers manquants dans la liste des checkbox (podologue, sage-femme, ostéopathe, psychologue, diététicien, pédicure, orthophoniste, ergothérapeute)
- [ ] Filtrer pour n'afficher que les numéros de portable (commencent par 06/07)
- [ ] Les numéros reportés dans les cartes prospects doivent être ceux trouvés par la recherche

### 2.2 Recherche Chefs → CRM (sans doublons)

**Fichier** : `src/app/(dashboard)/prospection/chefs-entreprise/page.tsx`

- [ ] Même logique anti-doublons
- [ ] Les numéros trouvés doivent se retrouver dans la carte prospect
- [ ] Le métier affiché doit être le code NAF réel (pas une approximation IA)

### 2.3 Fiche Prospect modifiable

**Fichier** : `src/components/prospects/ProspectCard.tsx`

- [ ] Ajouter un bouton "✏️ Modifier" sur la fiche
- [ ] Champs éditables : nom, téléphone, email, métier, ville, notes
- [ ] PATCH `/api/prospects/[id]` pour sauvegarder les modifications
- [ ] Historique des interactions visible dans la fiche

---

## PHASE 3 — FLUX CONTACT & APPELS

### 3.1 Logger un appel → Met à jour les stats

**Fichier** : `src/app/(dashboard)/crm/page.tsx` + `src/app/(dashboard)/today/page.tsx`

- [ ] Bouton "📞 Logger appel" sur chaque carte prospect dans le CRM
- [ ] Modal : Résultat (Décroché/Messagerie/Pas de réponse/RDV pris/Pas intéressé)
- [ ] POST `/api/interactions` avec type='appel'
- [ ] Met à jour automatiquement :
  - Le compteur "Appels passés" dans /today
  - Le statut du prospect dans le pipeline
  - Les stats daily_kpis

### 3.2 Prospect contacté → Change de statut

- [ ] Si résultat = "RDV pris" → prospect passe en statut `r1_planifie`
- [ ] Si résultat = "Pas intéressé" → prospect passe en statut `perdu`
- [ ] Si résultat = "Rappeler" → reste en `a_contacter` mais avec une date de relance

### 3.3 Section Today — Données temps réel

**Fichier** : `src/app/(dashboard)/today/page.tsx`

- [ ] Les compteurs (appels, contacts, RDV) viennent de `/api/today/kpis` (pas localStorage)
- [ ] L'onglet "Relances" charge les prospects avec une relance prévue aujourd'hui depuis la DB
- [ ] L'agenda charge depuis la DB (table `interactions` avec type='rdv' et date=today)
- [ ] Les vidéos importées se sauvegardent dans la table `videos` (pas perdu au refresh)
- [ ] Boutons "Prospection" et "Relances" (onglets) doivent fonctionner

---

## PHASE 4 — FLUX RDV & AGENDA

### 4.1 Synchronisation agenda Today ↔ Vue hebdo

**Fichier** : `src/app/(dashboard)/today/page.tsx` + `src/app/(dashboard)/dashboard/page.tsx`

- [ ] Les RDV créés dans /today apparaissent dans la vue hebdo et inversement
- [ ] Source unique : table `interactions` avec type='rdv'
- [ ] API : GET `/api/calendar/events?week=current` retourne les RDV de la semaine

### 4.2 Vue hebdo — Données réelles (plus de hardcode)

**Fichier** : `src/app/(dashboard)/dashboard/page.tsx`

- [ ] KPI "CA mensuel" → depuis `/api/revenue/stats`
- [ ] KPI "Taux closing" → depuis `/api/analytics/closing`
- [ ] KPI "RDV semaine" → depuis `/api/calendar/events?week=current`
- [ ] KPI "À relancer" → depuis `/api/prospects?status=a_contacter&has_relance=true`
- [ ] Actions prioritaires → algorithme : prospects chauds (R2 en attente) + relances du jour + clients inactifs
- [ ] Baromètre → calculé depuis `daily_kpis` de la semaine

---

## PHASE 5 — FLUX SIGNATURE & REVENUE

### 5.1 Prospect → Client → Commission

- [ ] Quand un prospect passe en statut "converti" dans le CRM :
  - Il devient un client dans la table `clients`
  - Un formulaire demande le produit souscrit et le montant
  - La commission est enregistrée dans `contracts`
  - Le CA se met à jour dans `/revenue`

### 5.2 Page Revenue — Plus de hardcode

**Fichier** : `src/app/(dashboard)/revenue/page.tsx`

- [ ] "Commissions trimestrielles" → depuis la DB (pas `COMMISSIONS_TRIMESTRE` hardcodé)
- [ ] "Objectifs vs Réalisé" → depuis `revenue_objectives` en DB

---

## PHASE 6 — DONNÉES & KPI (page /donnees)

### 6.1 Brancher sur données réelles

**Fichier** : `src/app/(dashboard)/donnees/page.tsx`

- [ ] Remplacer `DEMO_DATA` par un appel API : GET `/api/donnees/historique`
- [ ] Cette API retourne les `daily_kpis` agrégés
- [ ] Bouton "Export Excel" → génère un .xlsx téléchargeable

### 6.2 API données historique

**Fichier** : `src/app/api/donnees/historique/route.ts`

- [ ] GET avec params : `?from=2026-07-01&to=2026-07-31&period=jour|semaine|mois`
- [ ] Retourne les daily_kpis agrégés selon la période

---

## PHASE 7 — GLOBAL & SECTIONS ANNEXES

### 7.1 Page Global — Brancher les piliers

**Fichier** : `src/app/(dashboard)/global/page.tsx`

- [ ] Pilier "Interpro" → depuis table `partners` (count, days since last contact)
- [ ] Pilier "Commerce" → depuis table `videos` (vues/total)
- [ ] Performance hebdo → depuis `daily_kpis` des 5 derniers jours ouvrés
- [ ] Boutons "Voir détails/cercle/tâches/formation" → liens href vers les sections

### 7.2 Séquences — Vouvoiement + persistance

**Fichier** : Tous les templates de séquences

- [ ] Remplacer le tutoiement par le vouvoiement dans tous les messages/scripts
- [ ] Le catalogue de séquences hardcodé → seeder dans `sequence_templates` en DB

### 7.3 Cercle — Bouton LinkedIn

**Fichier** : `src/app/(dashboard)/cercle/page.tsx`

- [ ] Le bouton "depuis LinkedIn" doit ouvrir un formulaire pour coller l'URL LinkedIn
- [ ] Scraper les infos publiques (nom, photo, poste) via l'URL
- [ ] Sauvegarder dans la table `partners`

### 7.4 Playbooks — Historique des contacts validés

**Fichier** : Pages playbooks

- [ ] Les contacts validés pendant un playbook run doivent apparaître dans l'historique
- [ ] Requête : `SELECT * FROM playbook_prospects WHERE run_id = X AND validated = true`

---

## PHASE 8 — PERSISTENCE & NAVIGATION

### 8.1 Section active conservée

- [ ] Quand on change de section et qu'on revient, la section active (onglet) est conservée
- [ ] Solution : stocker l'onglet actif dans l'URL (query param `?tab=xxx`) ou `sessionStorage`

### 8.2 Vidéos persistantes

**Fichier** : `src/app/(dashboard)/today/page.tsx`

- [ ] Les vidéos importées sont sauvées dans la table `videos` avec `type='motivation'`
- [ ] Au chargement de la page : charger les vidéos depuis la DB
- [ ] Ne plus utiliser localStorage pour ça

### 8.3 Notifications mobile

- [ ] Intégrer le Telegram Bot existant (token déjà configuré)
- [ ] Notifications push via Telegram : relances du jour, RDV à venir, objectifs atteints

---

## PHASE 9 — PAGES MORTES À ACTIVER

### 9.1 Prospection Particuliers

- [ ] Remplacer `MOCK_PARTICULIERS` par un appel API
- [ ] Import CSV fonctionnel → POST `/api/prospects` avec `source='particuliers'`

### 9.2 Assistant IA

- [ ] Brancher sur API Anthropic (Claude)
- [ ] System prompt : contexte du dashboard (KPIs du jour, prospects chauds, relances)
- [ ] L'assistant peut répondre aux questions sur la stratégie, aider à rédiger des messages

### 9.3 Simulator — Export PDF

- [ ] Bouton "📄 Export PDF" → génère un PDF propre de la simulation
- [ ] Envoi possible par email au prospect

---

## ORDRE D'EXÉCUTION RECOMMANDÉ

| Priorité | Phases | Temps estimé | Impact |
|----------|--------|--------------|--------|
| 🔴 1 | Phase 1 (fondations) + Phase 2 (prospection) | 1 session | Le cœur du dashboard fonctionne |
| 🔴 2 | Phase 3 (contacts) + Phase 4 (agenda) | 1 session | Flux complet prospection → RDV |
| 🟠 3 | Phase 5 (signature) + Phase 6 (données) | 1 session | Revenue + KPI réels |
| 🟡 4 | Phase 7 (global) + Phase 8 (persistance) | 1 session | Cohérence UX |
| 🟢 5 | Phase 9 (pages mortes) | 1 session | Dashboard complet |

---

## LIVRABLES PAR SESSION

**Session 1** : Anti-doublons + Prospection fonctionnelle + Fiches éditables
**Session 2** : Logger appels + Today temps réel + Agenda synchronisé
**Session 3** : Vue hebdo réelle + Revenue réel + Page données branchée
**Session 4** : Global branché + Vouvoiement + Persistance navigation/vidéos
**Session 5** : Particuliers + Assistant IA + Simulator PDF + Notifications

---

## CONTRAINTES

- Ne JAMAIS toucher `theme.ts` ni `layout.tsx` (design PSG Cosmos validé)
- Exécuter jusqu'au bout sans demander de validation intermédiaire
- Pas d'abstractions inutiles — code direct et fonctionnel
- Tester sur la prod après chaque session via Playwright
