# WORKFLOW D'AUDIT & COMPLÉTION — Dashboard CGP Top Performer

**Date** : 3 juillet 2026
**Projet** : Ted Scale With Ouss — Dashboard CGP
**URL Prod** : https://ted-scale-with-ouss-272642857923.europe-west1.run.app
**Auth** : amiero.education@gmail.com / Ted2026!

---

## CONTEXTE

Le dashboard PSG Cosmos est un outil tout-en-un pour un CGP (Conseiller en Gestion de Patrimoine) indépendant top performer. Il doit :
- Aider à prospecter (recherche TNS, chefs d'entreprise, LinkedIn)
- Aider à contacter (séquences de messages, scripts d'appels)
- Suivre l'activité (appels, RDV, conversions, CA)
- Motiver (vidéos, musique, achievements, célébrations)
- Donner un retour data (KPI, graphiques, historique)

**Constat** : Le dashboard est une coquille. Le design est terminé mais l'intérieur est largement vide ou déconnecté. Ce ne sont pas des bugs — ce sont des **éléments inachevés** qui donnent l'illusion d'un produit fini.

---

## ÉTAT ACTUEL VÉRIFIÉ (audit du 01/07/2026)

### Base de données : 28 tables Supabase existantes

prospects, interactions, clients, financial_products, contracts, revenue_objectives, pipeline_events, scraping_jobs, scraping_results, user_settings, sequence_templates, sequence_template_steps, sequence_instances, sequence_instance_steps, achievements, cron_logs, call_scripts, call_objections, calling_sessions, calling_session_contacts, daily_kpis, playbook_runs, playbook_prospects, telegram_config, sequence_versions, tasks, partners, videos

### Colonnes manquantes (migrations à créer)

- `daily_kpis` → colonne `blocks integer NOT NULL DEFAULT 0`
- `user_settings` → colonnes `google_calendar_access_token` (text) et `google_calendar_token_expiry` (bigint)

### Variable d'environnement manquante

- `ANTHROPIC_API_KEY` (pour l'assistant IA)

---

## INVENTAIRE COMPLET — Ce qui ne marche pas / est vide

### A. PAGES 100% MAQUETTE (interface sans contenu réel)

| Page | Ce qui manque |
|------|---------------|
| `/dashboard` (vue hebdo) | 4 KPIs hardcodés, actions prioritaires inventées, baromètre figé — rien ne vient de la DB |
| `/prospection/particuliers` | Données mockées `MOCK_PARTICULIERS`, import CSV non branché, aucun appel API |
| `/simulator` | Calculs purement locaux, pas d'export PDF, pas d'envoi au prospect |
| `/assistant` | Chatbot factice, réponses dans un tableau JS, pas d'IA réelle |

### B. PAGES PARTIELLEMENT VIDES

| Page | Ce qui fonctionne | Ce qui est vide/hardcodé |
|------|-------------------|--------------------------|
| `/global` | Onglet Synthèse via API | Interpro, Commerce, Performance hebdo = hardcodés. Boutons "Voir X" sans action. "Actualiser et calculer" ne fait rien |
| `/today` | Signal + KPIs du jour | Relances = mémoire locale (perdu au refresh). Agenda = localStorage. Vidéos non persistées |
| `/map` | Recherche TNS fonctionne | Départements/stats hardcodés, zones non cliquables |
| `/commerce` | Produits via API | Thèmes/vidéos hardcodés, progression non persistée |
| `/sequences` | CRUD templates OK | Catalogue principal hardcodé. Toggle activer/désactiver = mémoire locale |
| `/scoring` | Charge prospects DB | Grilles de pondération hardcodées, non sauvegardées |
| `/revenue` | Stats via API | Commissions trimestrielles et "Objectifs vs Réalisé" hardcodés |

### C. BOUTONS / ONGLETS QUI NE FONT RIEN

| Localisation | Élément | Problème |
|-------------|---------|----------|
| `/global` | "Voir détails", "Voir cercle", "Voir tâches", "Voir formation" | Pas de onClick ni href |
| `/global` | "Actualiser et calculer" | Pas de handler |
| `/clients` | Bouton "Contacter" | `onClick={() => {}}` |
| `/sequences` | "▼ Voir détails" (x3) | Ne répondent pas au clic |
| `/today` | Onglets "Prospection" / "Relances" | Masqués après clic "Fin de journée" |
| `/today` | Chronomètre (Start/Pause/Terminé) | Non interactifs après changement d'état |
| `/today` | "+ Événement" | Non accessible |
| `/today` | "⚙️ Paramétrer" | Masqué hors viewport |
| `/cercle` | Bouton "depuis LinkedIn" | Ne fait rien |
| `/map` | Départements cliquables | Non implémenté |

### D. INCOHÉRENCES DE FLUX

| Problème | Impact |
|----------|--------|
| Un prospect ajouté au CRM reste dans les résultats de recherche | Doublons, on rappelle quelqu'un déjà contacté |
| Les numéros trouvés ne sont pas reportés dans les cartes prospects | On perd l'info de contact |
| Les numéros TNS sont toujours les mêmes dans "Aujourd'hui" | Pas de renouvellement |
| Certains numéros sont incorrects | Appels vers de mauvais numéros |
| Les métiers affichés ne correspondent pas à la réalité | Ex: "kinésiologue" au lieu de "infirmière" |
| L'agenda Today et l'agenda hebdo ne sont pas synchronisés | Confusion sur les RDV |
| Les vidéos disparaissent au refresh | Perte de contenu motivationnel |
| La section active n'est pas mémorisée | UX frustrante |
| Les contacts validés dans un playbook n'apparaissent pas dans l'historique | Pas de traçabilité |

### E. ÉLÉMENTS MANQUANTS DEMANDÉS

| Fonctionnalité | Description |
|----------------|-------------|
| Modifier une fiche prospect | Impossible actuellement |
| Filtrer portables uniquement | Pas de filtre 06/07 |
| Vouvoiement dans les séquences | Actuellement tutoiement |
| Notifications mobile | Pas de push via bot ou natif |
| Export Excel des RDV | RDV non exportés |
| Graphiques KPI avec évolution | Page `/donnees` créée mais avec données de démo |
| Métiers manquants dans la liste TNS | Liste incomplète |

---

## WORKFLOW DE COMPLÉTION

### Méthode : Par flux métier, pas par page

Le dashboard doit être complété **par parcours utilisateur**, pas page par page. Chaque parcours traverse plusieurs pages.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FLUX CGP TOP PERFORMER                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  MATIN                                                              │
│  ┌──────┐    ┌──────────┐    ┌────────┐    ┌──────────┐           │
│  │Today │───▶│Prospection│───▶│ Appels │───▶│Logger RDV│           │
│  │(KPIs)│    │(Recherche)│    │(Contact)│    │ (Agenda) │           │
│  └──────┘    └──────────┘    └────────┘    └──────────┘           │
│                                                                     │
│  JOURNÉE                                                            │
│  ┌──────┐    ┌──────────┐    ┌────────┐    ┌──────────┐           │
│  │ RDV  │───▶│ Résultat │───▶│Pipeline│───▶│Signature │           │
│  │(R1/2)│    │(Logger)  │    │ (CRM)  │    │(Revenue) │           │
│  └──────┘    └──────────┘    └────────┘    └──────────┘           │
│                                                                     │
│  FIN DE JOURNÉE                                                     │
│  ┌──────┐    ┌──────────┐    ┌────────┐                           │
│  │Stats │───▶│ Données  │───▶│Objectifs│                           │
│  │(KPIs)│    │(Graphes) │    │(Global) │                           │
│  └──────┘    └──────────┘    └────────┘                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

### SESSION 1 : FONDATIONS + PROSPECTION

**Objectif** : Le flux recherche → ajout prospect → anti-doublons fonctionne de bout en bout.

| # | Tâche | Pages impactées |
|---|-------|-----------------|
| 1 | Migration Supabase (colonnes manquantes + index anti-doublons) | DB |
| 2 | API anti-doublons : POST /api/prospects vérifie le téléphone avant insert | API |
| 3 | Résultats TNS : exclure prospects déjà en base + badge "Déjà ajouté" | `/prospection/tns` |
| 4 | Résultats Chefs : idem + numéros reportés dans les cartes | `/prospection/chefs-entreprise` |
| 5 | Ajouter métiers manquants dans la liste TNS | `/prospection/tns` |
| 6 | Filtrer portables uniquement (06/07) | `/prospection/tns`, `/prospection/chefs-entreprise` |
| 7 | Fiche prospect modifiable (bouton Modifier + PATCH API) | `ProspectCard.tsx` |
| 8 | Rotation des numéros dans "Aujourd'hui" (pas toujours les mêmes) | `/today` |

**Déployer et tester avec Playwright.**

---

### SESSION 2 : CONTACTS + TODAY TEMPS RÉEL

**Objectif** : Logger un appel met à jour tout le dashboard. Today affiche des données réelles.

| # | Tâche | Pages impactées |
|---|-------|-----------------|
| 1 | Bouton "Logger appel" dans CRM → modal résultat → POST /api/interactions | `/crm` |
| 2 | Appel loggé → prospect change de statut automatiquement | API |
| 3 | Compteurs Today viennent de /api/today/kpis (pas localStorage) | `/today` |
| 4 | Onglet "Relances" charge depuis DB (prospects avec relance prévue) | `/today` |
| 5 | Agenda Today charge depuis DB (interactions type=rdv date=today) | `/today` |
| 6 | Vidéos persistées dans table `videos` (pas perdu au refresh) | `/today` |
| 7 | Chronomètre Start/Pause/Terminé fonctionnel | `/today` |
| 8 | Bouton "+ Événement" fonctionnel → crée un RDV en DB | `/today` |

**Déployer et tester.**

---

### SESSION 3 : AGENDA + VUE HEBDO + DONNÉES

**Objectif** : L'agenda est synchronisé partout. La vue hebdo affiche des données réelles. Les KPI sont trackés.

| # | Tâche | Pages impactées |
|---|-------|-----------------|
| 1 | API /api/calendar/events unifie Today + Vue hebdo (source : DB) | API |
| 2 | Vue hebdo : 4 KPIs depuis API réelles (CA, closing, RDV, relances) | `/dashboard` |
| 3 | Vue hebdo : actions prioritaires = algorithme (prospects chauds + relances) | `/dashboard` |
| 4 | Vue hebdo : baromètre = calculé depuis daily_kpis de la semaine | `/dashboard` |
| 5 | Page /donnees : brancher sur /api/donnees/historique (plus de DEMO_DATA) | `/donnees` |
| 6 | Export Excel fonctionnel (bouton génère un .xlsx) | `/donnees` |
| 7 | Section active conservée (query param ou sessionStorage) | Toutes les pages |

**Déployer et tester.**

---

### SESSION 4 : GLOBAL + SÉQUENCES + CERCLE

**Objectif** : Toutes les sections partielles sont complétées. Vouvoiement partout.

| # | Tâche | Pages impactées |
|---|-------|-----------------|
| 1 | Global : Interpro branché sur table partners | `/global` |
| 2 | Global : Commerce branché sur progression vidéos | `/global` |
| 3 | Global : Performance hebdo depuis daily_kpis | `/global` |
| 4 | Global : boutons "Voir X" → liens href vers les bonnes sections | `/global` |
| 5 | Séquences : vouvoiement dans tous les templates/messages | `/sequences`, templates |
| 6 | Séquences : "Voir détails" fonctionnel | `/sequences` |
| 7 | Séquences : catalogue hardcodé → seedé en DB | `/sequences` |
| 8 | Cercle : bouton "depuis LinkedIn" → formulaire URL + scrape infos | `/cercle` |
| 9 | Playbooks : contacts validés visibles dans l'historique | `/playbooks` |
| 10 | Clients : bouton "Contacter" → ouvre modal contact | `/clients` |

**Déployer et tester.**

---

### SESSION 5 : PAGES MORTES + NOTIFICATIONS + FINITION

**Objectif** : Le dashboard est 100% fonctionnel. Aucune page morte.

| # | Tâche | Pages impactées |
|---|-------|-----------------|
| 1 | Particuliers : remplacer mocks par API + import CSV fonctionnel | `/prospection/particuliers` |
| 2 | Assistant : brancher sur Claude API avec contexte dashboard | `/assistant` |
| 3 | Simulator : export PDF de la simulation | `/simulator` |
| 4 | Revenue : commissions et objectifs depuis DB (plus de hardcode) | `/revenue` |
| 5 | Map : zones cliquables → lance recherche TNS sur le département | `/map` |
| 6 | Commerce : progression vidéos persistée | `/commerce` |
| 7 | Scoring : grilles sauvegardées en DB | `/scoring` |
| 8 | Notifications mobile via Telegram Bot | API + Bot |
| 9 | Export Excel des RDV (bouton dans settings ou agenda) | `/settings` |

**Déployer. Test final Playwright exhaustif. Dashboard terminé.**

---

## CONTRAINTES

- Ne JAMAIS toucher `theme.ts` ni `layout.tsx` sans demande explicite
- Stack : Next.js 15 App Router + Supabase + Cloud Run
- Exécuter jusqu'au bout sans demander de validation intermédiaire
- Pas d'abstractions inutiles — code direct et fonctionnel
- Tester chaque session sur la prod via Playwright (headed + vidéo)
- Le vouvoiement est obligatoire dans toutes les séquences de messages

---

## PROMPT PRÊT À COLLER PAR SESSION

Pour chaque session, coller ce prompt dans Claude Code (depuis le dossier du projet) :

```
/superpowers:writing-plans

Contexte : Dashboard CGP "Ted Scale With Ouss" (Next.js 15 + Supabase + Cloud Run).
Réfère-toi au fichier WORKFLOW_AUDIT_COMPLETION.md à la racine du projet pour le plan complet.

Exécute la SESSION [X] du workflow. Fais tout sans demander de validation intermédiaire.
Déploie sur Cloud Run à la fin et teste avec Playwright.
```

Remplace `[X]` par le numéro de session (1 à 5).
