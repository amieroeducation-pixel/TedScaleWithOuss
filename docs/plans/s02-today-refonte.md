---
validated: yes
---
# Plan — Story s02-today-refonte

Branch: `feature/s02-today-refonte`

## Target story

**En tant que** CGP, je veux que la page "Aujourd'hui" affiche mes RDV du jour (synchro Google Calendar), mes relances prioritaires, et mes tâches urgentes — le tout sans bug et sans donnée fantôme.

### Acceptance Criteria

1. Les RDV du jour sont récupérés depuis Google Calendar API (pas localStorage) et affichés dans la grille agenda
2. Les relances prioritaires du jour sont tirées de la section Nurturing (contacts dont la prochaine action est aujourd'hui)
3. Les tâches urgentes (priorité haute + deadline aujourd'hui) apparaissent dans le bloc actions prioritaires
4. Le compteur d'appels/RDV/prospects de la semaine est calculé depuis les données réelles en DB
5. La page charge en < 2s et ne contient aucun squelette "..." ni donnée mockée

## Tasks (ordered)

1. [x] **Créer `/api/tasks` route** — GET avec query params `urgency` et `deadline`, retourne tasks depuis DB (table existe déjà)
2. [x] **Test unitaire `/api/tasks`** — vérifier retour JSON correct, filtres urgency/deadline, auth required
3. [x] **Extraire composants lourds** — Créer `today/AudioPlayer.tsx`, `today/VideoPlayer.tsx`, `today/DeepWorkTimer.tsx` depuis le monolithe (lignes ~200-400)
4. [ ] **Extraire composants métier** — Créer `today/WeeklySignal.tsx`, `today/DailyCounters.tsx`, `today/TodayAgenda.tsx` (lignes ~400-1200)
5. [x] **Créer `today/UrgentTasks.tsx`** — Nouveau composant : fetch `/api/tasks?urgency=urgent&deadline=today`, affichage cards avec priorité/deadline
6. [x] **Intégrer Calendar API dans TodayAgenda** — Ajouter fetch `/api/calendar/events` + merge avec `user_agenda`, distinction visuelle (🗓️ vs ✏️)
7. [ ] **Filtrer relances "aujourd'hui" dans WeeklySignal** — Extraire `days_until === 0` depuis signal API, créer section "Relances prioritaires du jour"
8. [ ] **Nettoyer page principale** — `page.tsx` devient orchestrateur (~300 lignes max) : imports composants, layout, suspense
9. [x] **Créer `today/types.ts`** — Exporter types partagés (Signal, Task, AgendaEvent, Counters, Targets)
10. [x] **Vérifier fallback token Calendar expiré** — Si `connected: false`, afficher message "Reconnectez Calendar" dans Settings avec bouton
11. [x] **Test E2E complet** — Créer `e2e/today.spec.ts` : charge page, vérifie présence RDV/relances/tasks, mesure load time < 2s
12. [ ] **Supprimer code mort** — Retirer squelettes "...", données mockées si présentes, commentaires obsolètes
13. [x] **Build + typecheck** — `npm run build && tsc --noEmit` doit passer sans erreur

## Files touched

**Nouveaux fichiers** :
- `src/app/api/tasks/route.ts` (GET endpoint)
- `src/app/(dashboard)/today/AudioPlayer.tsx`
- `src/app/(dashboard)/today/VideoPlayer.tsx`
- `src/app/(dashboard)/today/DeepWorkTimer.tsx`
- `src/app/(dashboard)/today/WeeklySignal.tsx`
- `src/app/(dashboard)/today/DailyCounters.tsx`
- `src/app/(dashboard)/today/TodayAgenda.tsx`
- `src/app/(dashboard)/today/UrgentTasks.tsx`
- `src/app/(dashboard)/today/types.ts`
- `e2e/today.spec.ts`

**Fichiers modifiés** :
- `src/app/(dashboard)/today/page.tsx` (1592 → ~300 lignes, devient orchestrateur)

## Test strategy

### Unit tests
- `/api/tasks` route — retour JSON, filtres, auth
- Composants extraits — render sans crash (smoke tests)

### E2E tests
- Charge page Today
- Vérifie présence sections : Timer, Counters, Weekly Signal, Agenda, Urgent Tasks
- Vérifie RDV depuis Calendar API (mock ou real selon env)
- Vérifie relances du jour (filtré depuis signal)
- Vérifie tâches urgentes (depuis `/api/tasks`)
- Mesure load time < 2s (performance assertion)
- Teste fallback Calendar non connecté (affiche message)

### Manual testing
- Lancer `npm run dev`
- Naviguer `/today`
- Vérifier chaque section s'affiche sans erreur console
- Incrémenter compteurs → vérifier persistence DB (reload page)
- Ajouter événement agenda → vérifier sauvegarde
- Si Calendar connecté, vérifier RDV Google apparaît avec 🗓️

## Definition of Done

- [ ] Tous les AC validés (5/5)
- [x] `/api/tasks` route créée et testée
- [ ] Composants extraits (8 fichiers) + types — ⚠️ PARTIEL (3/6)
- [x] Calendar API intégré dans agenda (merge avec manuel)
- [ ] Relances du jour filtrées et affichées
- [x] Tâches urgentes affichées
- [ ] Page principale < 350 lignes — ⚠️ PARTIEL (1225 lignes, objectif 300)
- [ ] Aucun squelette "..." ni donnée mockée
- [ ] Tests E2E passent (load time < 2s)
- [x] Build + typecheck passent
- [ ] Aucune régression sur autres pages
- [ ] Code review pass (antihallu) — ⚠️ REVIEW EN COURS (2/3 critiques résolus)

## Notes d'implémentation

### API tasks — Structure attendue

```typescript
// GET /api/tasks?urgency=urgent&deadline=today
{
  success: true,
  data: {
    tasks: Array<{
      id: string,
      title: string,
      description: string | null,
      priority: number,
      col: string,
      urgency: 'urgent' | 'normal',
      this_week: boolean,
      deadline: string | null,
      created_at: string
    }>
  }
}
```

### Merge Calendar + Agenda manuel

**Stratégie** : Afficher les deux sources
- Calendar RDV → icône 🗓️, couleur or (`C.gold`)
- Agenda manuel → icône ✏️, couleur ribbon (`C.ribbon`)
- Merge dans state : `[...calendarEvents, ...manualAgenda]`

### Extraction composants — Ordre

1. **AudioPlayer** + **VideoPlayer** — lourds, indépendants, pas de props complexes
2. **DeepWorkTimer** — logique timer + blocks, props: counters, callbacks
3. **WeeklySignal** — affiche relances/RDV semaine, props: signal
4. **DailyCounters** — compteurs du jour, props: counters, onUpdate
5. **TodayAgenda** — grille agenda, props: events, onAdd, onDelete
6. **UrgentTasks** — nouveau composant, props: tasks

### Performance

- Load time cible : < 2s
- Optimisations :
  - React.lazy() pour AudioPlayer + VideoPlayer (pas critiques au mount)
  - Suspense boundary autour composants lourds
  - Debounce saves (déjà en place pour counters)

### Fallback Calendar non connecté

Si `/api/calendar/events` retourne `{ connected: false }` :
- Afficher banner jaune en haut de TodayAgenda : "⚠️ Calendrier non connecté — Connectez dans Paramètres"
- Bouton "Connecter" → redirect `/settings` (scroll vers OAuth section)

### Tests E2E — Credentials

Utiliser helper `getTestCredentials()` créé dans s01 (voir `e2e/test-helpers.ts`).

---

**Plan prêt pour validation.**
