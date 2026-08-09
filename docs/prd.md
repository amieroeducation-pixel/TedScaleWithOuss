# PRD — Refonte Dashboard CGP "Ted Scale With Ouss"

## Kill Frame

### Target
- **SaaS tué** : Calendly (https://calendly.com/fr/)
- **Produit refondu** : Dashboard CGP "Ted Scale With Ouss" (interne)

### Kill Mode
**Remplacement interne** — Arrêter de payer Calendly, posséder les données, intégrer la prise de RDV et les rappels dans le workflow CGP existant. Refonte complète du Dashboard pour le rendre 100% opérationnel.

### Why
- Calendly : coût mensuel pour 2 fonctions utilisées (lien de prise de RDV + rappels SMS). Tout le reste (teams, routing, analytics Calendly) non utilisé.
- Dashboard actuel : architecture fragile, failles un peu partout, sections non opérationnelles à 100%. Trop de temps investi pour un outil pas assez utilisable au quotidien.
- Objectif : un seul outil fiable, adapté au métier CGP, ergonomique, avec une architecture solide.

### Perimeter (20% qui fait 80%)

**Sections actives (core loop quotidien) :**

| Section | Description | Score |
|---------|-------------|-------|
| Aujourd'hui | Vue quotidienne — RDV, relances prioritaires, tâches du jour | 2 |
| Nurturing | Relances multicanales — suivi prospects chauds/tièdes/froids | 3 |
| Prospection TNS | Recherche prospects via API entreprises.data.gouv.fr | 2 |
| CRM Kanban | Pipeline commercial drag-drop par étape | 2 |
| Tâches | Gestion des tâches quotidiennes | 2 |

**Module transversal — Kill Calendly :**

| Feature | Description | Score |
|---------|-------------|-------|
| Lien de prise de RDV | Page publique partageable, créneaux disponibles, booking | 3 |
| Rappels SMS avant RDV | Cron automatique, notification prospect avant le RDV | 2 |
| Synchro Google Calendar | OAuth bidirectionnel, créneaux dispo = Calendar | 3 |

**Sections en sommeil (présentes dans le menu, non prioritaires) :**
- Revenue, Clients, Analytics, Achievements, Simulateur, Scoring, Cercle, Assistant IA, Commerce, Map, Séquences (absorbé par Nurturing), Global

**Architecture menu :**
- Sections actives en haut du menu latéral
- Sections en sommeil en dessous, grisées
- Paramètre utilisateur pour masquer/afficher chaque section à volonté

| Feature | Score |
|---------|-------|
| Menu dynamique (toggle sections visibles/sommeil) | 2 |

### Graveyard (out définitif)
- Fonctionnalités enterprise Calendly (team routing, round-robin, collective events)
- Analytics Calendly (conversion funnel meetings)
- Intégrations tierces Calendly (Salesforce, HubSpot, Zoom)
- Workflows Calendly (séquences post-meeting)

### Complexity Scale
| Score | Signification |
|-------|---------------|
| 1 | Trivial — config, copier-coller, <1h |
| 2 | Simple — pattern connu, <4h |
| 3 | Modéré — logique métier, API externe, ~1 jour |
| 4 | Complexe — architecture, multi-composants, 2-3 jours |
| 5 | Lourd — R&D, incertitude technique, >3 jours |

### L'Angle (ce qu'on fait mieux)
1. **Fiabilité à 100%** — Chaque section fonctionne de bout en bout, pas de faille, pas de squelette
2. **Adaptation métier CGP** — Conçu pour le workflow exact d'un CGP indépendant TNS IDF, pas un outil générique
3. **Ergonomie/UI** — Interface intuitive, rapide, design PSG Cosmos cohérent
4. **Architecture solide** — Code maintenable, APIs fiables, automatisations qui tournent sans intervention
5. **Tout-en-un** — Plus besoin de Calendly + tableur + WhatsApp séparé : un seul écran

---

## Besoin
Un CGP indépendant a besoin d'un outil unique pour piloter sa journée : voir ses priorités, relancer ses prospects, prendre des RDV automatiquement, et suivre son pipeline commercial — sans ouvrir 5 applications différentes ni payer pour des SaaS sous-utilisés.

## Utilisateur cible
- **Ted** — CGP indépendant TNS, Île-de-France
- Usage quotidien solo, pas de fonctionnalités team/multi-user
- Travaille sur Windows, navigateur desktop
- Prospects : TNS (professions libérales), chefs d'entreprise IDF, particuliers

## Contraintes techniques
- **Stack** : Next.js 15 App Router, TypeScript, Supabase (PostgreSQL + Auth SSR)
- **Design** : Thème PSG Cosmos (inline CSS via theme.ts) — NE PAS MODIFIER sans demande explicite
- **Auth** : Supabase Auth SSR v0.10, `getUser()` dans middleware
- **SMS** : Brevo API (déjà intégré)
- **Calendrier** : Google Calendar API (OAuth déjà initié)
- **Déploiement** : Cloud Run (GCP) ou Vercel
- **OS dev** : Windows

## Critères de succès

### Parité Calendly
- [ ] Lien de prise de RDV public fonctionnel (prospect choisit un créneau, booking confirmé)
- [ ] Rappels SMS automatiques envoyés avant chaque RDV (configurable : 24h, 1h)
- [ ] Synchro bidirectionnelle Google Calendar (créneaux bloqués = indisponibles)

### Qualité Dashboard
- [ ] Les 5 sections actives sont 100% opérationnelles (aucun bug bloquant, aucun squelette)
- [ ] Menu latéral dynamique avec sections actives/sommeil + paramétrage
- [ ] Architecture nettoyée — code maintenable, APIs cohérentes
- [ ] UI ergonomique et cohérente sur toutes les sections actives

### Mesurable
- [ ] 0 bug critique sur les sections actives
- [ ] Temps de chargement < 2s par page
- [ ] Ted utilise le Dashboard quotidiennement sans recourir à un outil externe

---

## Prochaine étape
`/ks-stories` — Découper ce PRD en user stories exécutables.
