# Research — Story s04-tasks-fiabilisation

## Target story

**s04-tasks-fiabilisation** — Gestion des tâches 100% opérationnelle

**En tant que** CGP, je veux créer, modifier, déplacer et compléter des tâches dans un Kanban fiable, avec les données persistées en DB (pas de fallback mock).

### Acceptance Criteria
1. La création d'une tâche (titre, description, priorité, deadline, badge) persiste en DB via POST `/api/tasks`
2. Le drag-drop entre colonnes met à jour le statut en DB
3. Cocher une tâche la marque "Terminée" en DB
4. Au rechargement, toutes les tâches viennent de la DB — supprimer le fallback `INITIAL_TASKS` et les données mockées du code
5. Le filtre "Urgentes" / "Cette semaine" / "Terminées" fonctionne sur les données réelles
6. Le build `npm run build` passe sans erreur après les modifications

## Current state of the code

### Ce qui fonctionne déjà
- Kanban UI complet avec 5 colonnes (À faire, En cours, En attente, Bloquées, Terminées)
- Drag-and-drop via dnd-kit (implémentation complète avec optimistic updates + rollback)
- Modal création de tâche avec tous les champs
- Modal édition tâche
- Checkbox avec debounce (500ms) + retry (3x)
- Filtres : Toutes, Urgentes, Cette semaine, Terminées
- Métriques (tâches actives, haute priorité, terminées, temps estimé)
- API routes GET/POST/PATCH/DELETE complètes et fonctionnelles
- Migration DB en place (table `tasks` + RLS + deadline)

### Ce qui est mocké / à supprimer
- `INITIAL_TASKS` (lignes ~49-68) — 18 tâches sample affichées quand l'API échoue ou retourne vide
- La page tombe en fallback silencieusement sans indiquer l'erreur à l'utilisateur
- Les tests dans `route.test.ts` sont tous des stubs (`expect(true).toBe(true)`)

## Anchor points

| Fichier | Rôle |
|---------|------|
| `src/app/(dashboard)/tasks/page.tsx` (~813 lignes) | Page Kanban client component |
| `src/app/api/tasks/route.ts` (78 lignes) | GET/POST endpoints |
| `src/app/api/tasks/[id]/route.ts` (51 lignes) | PATCH/DELETE endpoints |
| `supabase/migrations/010_tasks.sql` | Table + RLS + index |
| `supabase/migrations/20260819_add_tasks_deadline.sql` | Ajout colonne deadline |
| `src/app/(dashboard)/today/UrgentTasks.tsx` | Widget tâches urgentes (Today) |
| `src/app/(dashboard)/today/types.ts` | Type Task partagé |
| `src/lib/api.ts` | Helpers apiSuccess/apiError/apiUnauthorized |
| `src/lib/supabase/server.ts` | Client Supabase SSR |

## Verified APIs / functions

### API Routes
- **GET /api/tasks** — Auth via `getUser()`, filtre `user_id`, params optionnels `?urgency=urgent&deadline=today`, retourne `{ success, data, error }`
- **POST /api/tasks** — Body: `{ title (requis), description, priority, col, estimated_time, badge, urgency, this_week }`, retourne la tâche créée
- **PATCH /api/tasks/:id** — Fields autorisés: `['title', 'description', 'priority', 'col', 'estimated_time', 'badge', 'urgency', 'this_week']`, ajoute `updated_at`
- **DELETE /api/tasks/:id** — Auth ownership check, retourne `{ deleted: id }`

### Page Functions clés
- `mapDbTask(t: any): Task` — Mappe objet DB vers type UI
- `handleDragEnd(event: DragEndEvent)` — Persiste col via PATCH, rollback si erreur
- `handleCheck(taskId, checked)` — Debounce 500ms + retry 3x, marque col='done'
- `handleCreate()` — POST /api/tasks + ajout optimiste à la liste
- `applyFilter(tasks, filter): Task[]` — Filtre côté client

### Schema DB (table `tasks`)
```
id UUID PK, user_id UUID FK (cascade), title TEXT NOT NULL,
description TEXT DEFAULT '', priority INT CHECK(1-4) DEFAULT 2,
col TEXT CHECK('todo'|'inprogress'|'waiting'|'blocked'|'done') DEFAULT 'todo',
estimated_time TEXT DEFAULT '', badge TEXT DEFAULT '',
urgency TEXT CHECK('urgent'|'normal') DEFAULT 'normal',
this_week BOOLEAN DEFAULT false, deadline DATE nullable,
created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
```

## Traps & constraints

1. **Fallback silencieux** — L'utilisateur ne sait pas si l'API a échoué ou s'il n'a aucune tâche. Il faut distinguer "DB vide" (état normal, afficher empty state) de "erreur réseau/DB" (afficher message d'erreur).

2. **`deadline` dans PATCH** — La liste `allowed` dans PATCH n'inclut pas `deadline`. Il faut l'ajouter pour que l'édition de deadline persiste.

3. **Tests stubs** — `route.test.ts` a des tests vides. La story demande un build propre, pas forcément des tests complets, mais il faut au minimum que les tests ne soient pas en erreur.

4. **Badge field** — Le champ `badge` en DB est déconnecté de la logique UI (qui détecte via le texte du titre). Pas bloquant mais à clarifier.

5. **`col` naming** — DB utilise `'inprogress'` (sans tiret ni underscore). La page mappe correctement mais attention à la cohérence.

6. **Toast non importé** — La page Tasks n'importe pas `sonner` pour les notifications. Les erreurs sont loguées en console uniquement.

## Open questions

1. Faut-il un empty state élégant quand la DB est vide (0 tâches) ou juste les colonnes vides ?
2. Les tests stubs doivent-ils être implémentés dans cette story ou juste nettoyés ?
3. Le champ `deadline` doit-il être éditable depuis le modal de détail ?
