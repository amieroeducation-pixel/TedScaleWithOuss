# Stories — Refonte Dashboard CGP + Kill Calendly

Source: [docs/prd.md](./prd.md)

---

## s01-menu-dynamique — Menu latéral avec sections actives/sommeil et paramétrage

**En tant que** CGP, je veux un menu latéral réorganisé avec mes sections actives en haut et les autres en sommeil grisées, et pouvoir masquer/afficher chaque section à volonté depuis les paramètres.

### Acceptance Criteria
1. Le menu affiche 5 sections actives en haut (Aujourd'hui, Nurturing, Prospection TNS, CRM Kanban, Tâches) avec séparateur visuel avant les sections en sommeil
2. Les sections en sommeil apparaissent grisées en dessous (Revenue, Clients, Analytics, etc.)
3. Dans Settings, un panneau "Sections visibles" liste toutes les sections avec un toggle on/off pour chacune
4. Le choix est persisté en DB (table `user_settings`) et appliqué au rechargement
5. Une section masquée disparaît du menu ; la réactiver la fait réapparaître à sa position

### Agentic Notes
- **Fichiers** : `src/app/(dashboard)/layout.tsx` (513 lignes — la nav est hardcodée en 5 groupes), `src/app/(dashboard)/settings/page.tsx`
- **Contrainte** : ne PAS modifier le design PSG Cosmos (couleurs, spacing) — uniquement réorganiser l'ordre et ajouter le gris/toggle
- **Pattern** : le hook `useUserSettings` existe déjà et persiste en Supabase
- **Piège** : le menu actuel a des badges dynamiques (achievements, chefs) — s'assurer qu'ils fonctionnent toujours après réorganisation

### Complexity: 2

---

## s02-today-refonte — Section Aujourd'hui fiable et opérationnelle

**En tant que** CGP, je veux que la page "Aujourd'hui" affiche mes RDV du jour (synchro Google Calendar), mes relances prioritaires, et mes tâches urgentes — le tout sans bug et sans donnée fantôme.

### Acceptance Criteria
1. Les RDV du jour sont récupérés depuis Google Calendar API (pas localStorage) et affichés dans la grille agenda
2. Les relances prioritaires du jour sont tirées de la section Nurturing (contacts dont la prochaine action est aujourd'hui)
3. Les tâches urgentes (priorité haute + deadline aujourd'hui) apparaissent dans le bloc actions prioritaires
4. Le compteur d'appels/RDV/prospects de la semaine est calculé depuis les données réelles en DB
5. La page charge en < 2s et ne contient aucun squelette "..." ni donnée mockée

### Agentic Notes
- **Fichiers** : `src/app/(dashboard)/today/page.tsx` (1592 lignes — très gros, à refactorer), `/api/calendar/events` (existe), `/api/today/signal` (existe)
- **Dépendance** : nécessite que Google Calendar OAuth fonctionne (déjà en place dans Settings)
- **Ref Calendly** : l'écran "Upcoming events" de Calendly montre les RDV du jour avec rappel — même densité d'info visée ici
- **Piège** : la page Today actuelle stocke des événements en localStorage et les mélange avec des données API → nettoyer pour source unique (Calendar API + DB)
- **Risque** : si OAuth token expiré, fallback gracieux (message "reconnectez Calendar" plutôt que page blanche)

### Complexity: 3

---

## s03-crm-kanban-fiabilisation — CRM Kanban 100% opérationnel

**En tant que** CGP, je veux que le Kanban CRM fonctionne sans bug : drag-drop fluide, fiches prospects modifiables, données persistées, et aucun numéro/métier incorrect.

### Acceptance Criteria
1. Le drag-drop d'un prospect entre colonnes met à jour le `pipeline_stage` en DB (optimistic UI + rollback si erreur)
2. Un clic sur un prospect ouvre une fiche modifiable (nom, téléphone, email, métier, ville, notes) — sauvegarde PATCH
3. Le bouton "Nouveau prospect" ouvre un formulaire et crée le prospect via POST `/api/prospects`
4. Les numéros de téléphone et métiers affichés correspondent aux données DB (pas de données hardcodées)
5. La recherche et le filtre par tag fonctionnent sur les données réelles

### Agentic Notes
- **Fichiers** : `src/app/(dashboard)/crm/page.tsx` (1835 lignes), `/api/prospects/` endpoints
- **Bugs connus** : fiches non modifiables (bug #6), numéros incorrects (bug #3), métiers incorrects (bug #4) — cf. mémoire `dashboard-bugs-list-2026-06-25`
- **Pattern** : dnd-kit déjà utilisé, CRUD prospects API existe
- **Piège** : l'enrichissement depuis la prospection TNS peut écraser des données manuelles → s'assurer que l'édition manuelle prévaut

### Complexity: 2

---

## s04-tasks-fiabilisation — Gestion des tâches 100% opérationnelle

**En tant que** CGP, je veux créer, modifier, déplacer et compléter des tâches dans un Kanban fiable, avec les données persistées en DB (pas de fallback mock).

### Acceptance Criteria
1. La création d'une tâche (titre, description, priorité, deadline, badge) persiste en DB via POST `/api/tasks`
2. Le drag-drop entre colonnes met à jour le statut en DB
3. Cocher une tâche la marque "Terminée" en DB
4. Au rechargement, toutes les tâches viennent de la DB (pas de `INITIAL_TASKS` fallback visible)
5. Le filtre "Urgentes" / "Cette semaine" / "Terminées" fonctionne sur les données réelles

### Agentic Notes
- **Fichiers** : `src/app/(dashboard)/tasks/page.tsx` (653 lignes), `/api/tasks` endpoint
- **État** : la page utilise un fallback `INITIAL_TASKS` si la DB est vide → créer une migration `tasks` si la table n'existe pas encore
- **Pattern** : même Kanban que CRM (dnd-kit) → réutiliser les patterns de drag-drop
- **Piège** : vérifier que la table `tasks` existe en Supabase et a les bonnes colonnes (title, description, status, priority, deadline, badge, user_id)

### Complexity: 2

---

## s05-nurturing-consolidation — Nurturing fiable sans faille

**En tant que** CGP, je veux que la section Nurturing fonctionne à 100% : séquences envoyées, température correcte, messages non vides, canaux WhatsApp/LinkedIn fonctionnels.

### Acceptance Criteria
1. Tous les messages de séquence ont un contenu réel (aucun template "..." ou squelette vide)
2. L'interpolation de variables fonctionne pour tous les placeholders ({Prénom}, {Profession}, {Ville}, {Date}, {Heure})
3. Les canaux WhatsApp et LinkedIn ne sont plus "skip" — ils ouvrent le lien/app approprié ou envoient via API
4. Le score de température reflète les interactions réelles (réponses, clics, RDV pris)
5. Le cron de pression fonctionne et envoie les relances automatiques sans auth bypass

### Agentic Notes
- **Fichiers** : `src/app/(dashboard)/nurturing/page.tsx` (1025 lignes), `src/lib/sequences/executor.ts`, `/api/crm/sequences/`
- **Bugs connus** : 14 messages vides (P1), WhatsApp/LinkedIn skip dans executor.ts (P1), interpolation incomplète (P1) — cf. mémoire `audit-sequences-2026-07-04`
- **Fix récent** : le cron auth bypass a été corrigé (commit `782dde8`) — vérifier que c'est toujours bon
- **Piège** : l'optimistic lock est "inversé" (marque 'sent' avant appel API) — à corriger dans executor.ts

### Complexity: 3

---

## s06-prospection-tns-fiabilisation — Prospection TNS sans données incorrectes

**En tant que** CGP, je veux que la recherche TNS retourne des données correctes (bons métiers, numéros valides renouvelés) et que les résultats soient exploitables.

### Acceptance Criteria
1. Le métier affiché correspond au code NAF retourné par l'API (mapping vérifié pour les 21 codes)
2. Les numéros de téléphone sont valides (format français, portables identifiés)
3. Une recherche successive ne retourne pas toujours les mêmes résultats (pagination/offset)
4. Un filtre "portables uniquement" est disponible
5. L'enrichissement d'un prospect TNS vers le CRM transfère correctement toutes les données

### Agentic Notes
- **Fichiers** : `src/app/(dashboard)/prospection/tns/page.tsx`, `/api/prospection/tns/`
- **Bugs connus** : numéros identiques (bug #2), numéros incorrects (bug #3), métiers incorrects (bug #4), métiers manquants (bug #5) — cf. mémoire bugs
- **API externe** : `entreprises.data.gouv.fr` — vérifier les champs retournés et le mapping NAF→métier
- **Piège** : l'API gouvernementale a des limites de débit et peut renvoyer des données incomplètes (champ téléphone optionnel)

### Complexity: 2

---

## s07-google-calendar-sync — Synchro bidirectionnelle Google Calendar

**En tant que** CGP, je veux que mes créneaux Google Calendar soient synchronisés : les RDV créés dans le Dashboard apparaissent dans Calendar, et les événements Calendar apparaissent dans le Dashboard.

### Acceptance Criteria
1. Un RDV créé dans le Dashboard (booking ou manuellement) crée un événement Google Calendar
2. Un événement créé dans Google Calendar apparaît dans la vue Aujourd'hui du Dashboard
3. Un créneau occupé dans Calendar est marqué indisponible pour la prise de RDV
4. Le refresh token se renouvelle automatiquement (pas d'expiration silencieuse)
5. En cas de déconnexion Calendar, un message clair invite à se reconnecter dans Settings

### Agentic Notes
- **Fichiers** : `/api/calendar/events` (GET + POST existent), `/api/auth/google-calendar/` (OAuth flow existe)
- **Ref Calendly** : Calendly vérifie les créneaux Calendar en temps réel avant d'afficher les dispos — même logique
- **État actuel** : OAuth + lecture + écriture fonctionnent déjà. Manque : la vérification de dispos avant booking, et la lecture automatique dans Today
- **Piège** : les tokens sont dans `user_settings` — s'assurer que le refresh automatique est fiable (token expiry = 1h)

### Complexity: 3

---

## s08-booking-page — Page publique de prise de RDV (Kill Calendly)

**En tant que** prospect, je veux cliquer sur un lien partagé par le CGP et choisir un créneau disponible pour prendre RDV, puis recevoir une confirmation.

### Acceptance Criteria
1. Une URL publique `/booking/[slug]` affiche les créneaux disponibles de la semaine (lun-ven, plages configurables)
2. Les créneaux occupés dans Google Calendar sont masqués
3. Le prospect saisit son nom, téléphone, email et sélectionne un créneau → le RDV est confirmé
4. Le RDV confirmé crée un événement Google Calendar + une entrée en DB (`bookings` table)
5. Le CGP voit le nouveau RDV dans sa vue Aujourd'hui
6. La page est responsive et fonctionne sur mobile (prospects sur téléphone)

### Agentic Notes
- **Fichiers à créer** : `src/app/booking/[slug]/page.tsx` (page publique, hors layout dashboard), table `bookings` en Supabase
- **Ref Calendly** : page `calendly.com/user/30min` — sélection jour → créneau → formulaire → confirmation. UI épurée, pas de login requis
- **Contrainte** : cette page est PUBLIQUE (pas d'auth) — middleware.ts doit exclure `/booking` du redirect auth
- **Config** : durée de RDV (30min par défaut), plages horaires (9h-18h), jours dispo — stockés dans `user_settings`
- **Design** : doit respecter la charte PSG Cosmos (la page publique est une vitrine du CGP)

### Complexity: 3

---

## s09-rappels-sms — Rappels SMS automatiques avant RDV

**En tant que** CGP, je veux que mes prospects reçoivent un SMS de rappel automatique avant chaque RDV (24h et/ou 1h avant) sans intervention manuelle.

### Acceptance Criteria
1. Un cron vérifie les RDV à venir et envoie un SMS de rappel 24h avant via Brevo
2. Un second rappel est envoyé 1h avant le RDV
3. Le contenu SMS est personnalisé (Prénom, date, heure, lieu)
4. Le délai de rappel (24h, 1h, les deux) est configurable dans Settings
5. Un log de chaque rappel envoyé est visible dans la section Automatisations (table `cron_logs`)
6. Pas de doublon : un rappel déjà envoyé pour un RDV n'est pas renvoyé

### Agentic Notes
- **Fichiers** : `/api/cron/` (pattern existant), Brevo SMS wrapper (déjà utilisé pour séquences), `cron_logs` table (existe)
- **Ref Calendly** : Calendly envoie email + SMS reminders avec texte configurable — même pattern
- **Source RDV** : table `bookings` (créée en s08) + événements Calendar (API)
- **Piège** : distinguer les RDV booking (ont un numéro de téléphone) des événements Calendar perso (pas de destinataire SMS)
- **Pattern** : réutiliser le guard anti-doublon de l'executor de séquences (`status='sent'` APRÈS envoi, pas avant)

### Complexity: 2

---

## s10-architecture-cleanup — Nettoyage architecture et cohérence APIs

**En tant que** développeur, je veux une architecture propre : fichiers monolithiques découpés, APIs cohérentes, pas de données mockées résiduelles, pour que le Dashboard soit maintenable.

### Acceptance Criteria
1. Les pages > 1000 lignes sont découpées en composants (Today: 1592L, CRM: 1835L, Settings: 2115L, Nurturing: 1025L)
2. Les APIs suivent un pattern cohérent (error handling, validation Zod, réponses typées)
3. Aucune donnée mockée/INITIAL_TASKS ne subsiste dans le code de production
4. Le `middleware.ts` exclut proprement les routes publiques (`/booking`, `/api/cron`)
5. Le build `npm run build` passe sans erreur et le lint `npm run lint` est propre

### Agentic Notes
- **Pages critiques** : `today/page.tsx` (1592L), `crm/page.tsx` (1835L), `settings/page.tsx` (2115L) → extraire composants dans des sous-fichiers
- **Pattern** : chaque page garde un fichier principal qui importe des composants — pas de restructuration de routes
- **Piège** : ne pas casser les imports existants, ne pas toucher au design (styles inline PSG Cosmos)
- **Scope** : uniquement les sections actives — ne pas toucher aux sections en sommeil
- **Ordre** : cette story peut se faire en parallèle des autres mais doit être validée en dernier (elle impacte tous les fichiers)

### Complexity: 3

---

## Ordre d'exécution (par dépendance)

```
s01-menu-dynamique          (aucune dépendance — restructure la nav)
  │
  ├── s04-tasks-fiabilisation    (menu prêt, tâches dans "actif")
  ├── s03-crm-kanban-fiabilisation
  ├── s06-prospection-tns-fiabilisation
  │
  ├── s05-nurturing-consolidation
  │
  └── s07-google-calendar-sync   (OAuth existe, consolider)
        │
        ├── s02-today-refonte     (dépend de Calendar sync + Nurturing pour les relances)
        │
        └── s08-booking-page      (dépend de Calendar sync pour les dispos)
              │
              └── s09-rappels-sms (dépend de booking pour la table RDV)

s10-architecture-cleanup        (en parallèle, validé en dernier)
```

## Résumé

| ID | Story | Complexité |
|----|-------|-----------|
| s01 | Menu dynamique actif/sommeil + paramétrage | 2 |
| s02 | Today refonte — Calendar + relances + tâches réelles | 3 |
| s03 | CRM Kanban 100% opérationnel | 2 |
| s04 | Tâches 100% opérationnel | 2 |
| s05 | Nurturing consolidation — messages, canaux, cron | 3 |
| s06 | Prospection TNS — données correctes | 2 |
| s07 | Google Calendar synchro bidirectionnelle | 3 |
| s08 | Page publique booking (Kill Calendly) | 3 |
| s09 | Rappels SMS automatiques avant RDV | 2 |
| s10 | Architecture cleanup — découpage, cohérence | 3 |

**Total estimé : ~12 jours de travail agent**
