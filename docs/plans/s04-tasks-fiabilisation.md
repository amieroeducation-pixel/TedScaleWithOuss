---
validated: yes
---
# Plan — Story s04-tasks-fiabilisation

Branch: `feature/s04-tasks-fiabilisation`

## Target story

**Gestion des tâches 100% opérationnelle** — Supprimer le fallback mock, garantir que toutes les opérations CRUD + drag-drop persistent en DB, distinguer "DB vide" de "erreur", build propre.

## Tasks (ordered)

1. [x] **Supprimer INITIAL_TASKS** — Retirer le tableau de tâches mockées (~lignes 49-68 de page.tsx). Remplacer par un empty state explicite quand la DB retourne 0 tâches.
2. [x] **Distinguer erreur vs vide** — Ajouter un état `error: string | null` dans la page. Si l'API échoue → afficher un message d'erreur (pas de données mock). Si l'API retourne un tableau vide → afficher un empty state "Aucune tâche — créez votre première tâche".
3. [x] **Ajouter `deadline` au PATCH** — Dans `src/app/api/tasks/[id]/route.ts`, ajouter `'deadline'` à la liste `allowed` des champs modifiables.
4. [x] **Ajouter toast notifications** — Importer `toast` depuis `sonner` dans page.tsx. Afficher un toast sur : création réussie, erreur de drag-drop, erreur de checkbox, erreur de création.
5. [x] **Nettoyer les tests stubs** — Dans `route.test.ts`, soit implémenter des tests basiques (POST crée, GET retourne, PATCH modifie), soit supprimer le fichier stub pour éviter les faux positifs.
6. [x] **Vérifier le build** — `npm run build` doit passer sans erreur TypeScript ni warning bloquant.

## Files touched

- `src/app/(dashboard)/tasks/page.tsx` — Suppression INITIAL_TASKS, ajout error state, empty state, toasts
- `src/app/api/tasks/[id]/route.ts` — Ajout `deadline` aux champs autorisés
- `src/app/api/tasks/route.test.ts` — Nettoyage ou implémentation tests
- (potentiellement) `src/app/(dashboard)/tasks/empty-state.tsx` — Composant empty state si extrait

## Test strategy

- **Niveau API** : Tests unitaires dans route.test.ts (POST crée une tâche, GET retourne la liste, PATCH modifie le col, DELETE supprime)
- **Niveau UI** : Test manuel — créer une tâche, recharger la page, vérifier qu'elle persiste. Drag-drop une tâche, recharger, vérifier la colonne. Cocher une tâche, recharger, vérifier qu'elle est dans "Terminées".
- **Niveau build** : `npm run build` passe proprement
- **Edge cases** : Page sans aucune tâche → empty state. API down → message erreur (pas de crash).

## Definition of Done

- [ ] `INITIAL_TASKS` supprimé du code — aucune donnée mockée ne subsiste
- [ ] Page charge uniquement depuis la DB — si DB vide, affiche empty state
- [ ] Si API en erreur, affiche un message d'erreur explicite (pas de fallback silencieux)
- [ ] Drag-drop persiste en DB (vérifiable après refresh)
- [ ] Checkbox "terminée" persiste en DB (vérifiable après refresh)
- [ ] Création de tâche persiste en DB (vérifiable après refresh)
- [ ] Deadline éditable et persisté via PATCH
- [ ] Toast notifications sur actions principales
- [ ] `npm run build` passe sans erreur
- [ ] Tests non-stubs (soit implémentés, soit fichier supprimé)
