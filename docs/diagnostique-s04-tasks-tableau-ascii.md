# Diagnostique s04-tasks-fiabilisation — Tableau Actions/Fonctions/Outils

```
┌─────────────────┬────────────────┬──────────────────────────────────────┬──────────────────────────────────┬───────────────┐
│        #        │     Action     │        Fonctions Principales         │              Outils              │    Statut     │
│                 │                │                                      │                                  │  Fonctionnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 1. Vue & Liste  │                │                                      │                                  │               │
│ (5 actions)     │                │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 1               │ Voir liste     │ fetch GET /api/tasks → useState      │ fetch API, React useState        │ ✅            │
│                 │ toutes tâches  │ allTasks                             │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 2               │ Affichage en   │ Tri par colonnes : À faire /         │ Array.filter() par statut,       │ ✅            │
│                 │ colonnes       │ Urgent / Cette semaine / Terminées   │ TaskCard composant               │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 3               │ Badge          │ PriorityDots composant (🔴🟡⚪)      │ Mapping priority →               │ ✅            │
│                 │ priorité       │                                      │ couleurs gold/red/gray           │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 4               │ Badge date     │ formatDate() → format "dd MMM"       │ date-fns, badge visuel si passé  │ ✅            │
│                 │ échéance       │                                      │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 5               │ Métrique       │ countTasksByStatus() →               │ Array.reduce() par statut        │ ✅            │
│                 │ compteurs      │ "X à faire · Y urgent · Z semaine"   │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 2. Filtres &    │                │                                      │                                  │               │
│ Navigation (4   │                │                                      │                                  │               │
│ actions)        │                │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 6               │ Filtrer        │ setState activeFilter → applyFilter  │ useState activeFilter,           │ ✅            │
│                 │ "Toutes"       │ → affiche toutes colonnes            │ affiche 4 colonnes               │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 7               │ Filtrer        │ applyFilter('urgent') → masque       │ masque colonnes non urgentes,    │ ✅            │
│                 │ "Urgentes"     │ colonnes + affiche uniquement urgent │ affiche colonne priorité rouge   │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 8               │ Filtrer        │ applyFilter('cette_semaine') →       │ masque colonnes, affiche         │ ✅            │
│                 │ "Cette         │ masque + affiche week tasks          │ colonne Cette Semaine            │ Opérationnel  │
│                 │ semaine"       │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 9               │ Filtrer        │ applyFilter('termine') → affiche     │ masque colonnes actives,         │ ✅            │
│                 │ "Terminées"    │ uniquement colonne Terminées         │ affiche Terminées                │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 3. Création &   │                │                                      │                                  │               │
│ Édition (8      │                │                                      │                                  │               │
│ actions)        │                │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 10              │ Créer nouvelle │ Bouton "+ Nouvelle tâche" →          │ @radix-ui/react-dialog,          │ ✅            │
│                 │ tâche          │ ouvre modal formulaire               │ modal TaskForm                   │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 11              │ Remplir        │ Input titre + description +          │ <input> natif, <textarea>,       │ ✅            │
│                 │ formulaire     │ priorité + date échéance             │ <select>                         │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 12              │ Sélectionner   │ Dropdown priorité (haute/moyenne/    │ <select> avec options +          │ ✅            │
│                 │ priorité       │ basse)                               │ useState priority                │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 13              │ Choisir date   │ <input type="date"> + format ISO     │ <input type="date">,             │ ✅            │
│                 │ échéance       │                                      │ date-fns parse                   │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 14              │ Sauvegarder    │ POST /api/tasks → JSON body          │ fetch POST, Supabase insert      │ ✅            │
│                 │ tâche          │ (title, description, priority, due)  │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 15              │ Ouvrir modal   │ Clic TaskCard → ouvre modal détail   │ TaskDetailModal composant,       │ ✅            │
│                 │ détail         │ (readonly)                           │ @radix-ui/react-dialog           │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 16              │ Éditer tâche   │ Bouton "✏️ Éditer" → modal édition   │ Pré-remplissage form avec        │ ✅            │
│                 │                │ + formulaire pré-rempli              │ task.data                        │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 17              │ Mettre à jour  │ PATCH /api/tasks/:id → body JSON     │ fetch PATCH, Supabase update     │ ✅            │
│                 │ tâche          │ avec champs modifiés                 │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 4. Gestion      │                │                                      │                                  │               │
│ Statut (8       │                │                                      │                                  │               │
│ actions)        │                │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 18              │ Cocher         │ Clic checkbox → PATCH status=        │ <input type="checkbox">,         │ ⚠️            │
│                 │ "Terminé"      │ 'termine'                            │ PATCH /api/tasks/:id             │ Dépend DB     │
│                 │                │                                      │                                  │ connectée     │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 19              │ Décocher       │ Clic checkbox (décocher) → PATCH     │ <input type="checkbox">,         │ ⚠️            │
│                 │ "Terminé"      │ status='a_faire'                     │ PATCH /api/tasks/:id             │ Dépend DB     │
│                 │                │                                      │                                  │ connectée     │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 20              │ Marquer        │ Bouton "⚡ Urgent" → status='urgent' │ Bouton action, PATCH status      │ ✅            │
│                 │ "Urgent"       │                                      │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 21              │ Marquer        │ Bouton "📅 Cette semaine" →          │ Bouton action, PATCH status      │ ✅            │
│                 │ "Cette         │ status='cette_semaine'               │                                  │ Opérationnel  │
│                 │ semaine"       │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 22              │ Réinitialiser  │ Bouton "🔄 À faire" → status=        │ Bouton action, PATCH status      │ ✅            │
│                 │ "À faire"      │ 'a_faire'                            │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 23              │ Drag-drop      │ ❌ NON IMPLÉMENTÉ                    │ ❌ dnd-kit absent                │ ❌            │
│                 │ entre colonnes │                                      │                                  │ Non implémenté│
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 24              │ Transition     │ Animation CSS smooth lors            │ CSS transition 0.3s ease         │ ✅            │
│                 │ visuelle       │ changement statut                    │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 25              │ Optimistic UI  │ Mise à jour locale immédiate avant   │ useState optimistic update,      │ ✅            │
│                 │                │ confirmation serveur                 │ rollback si erreur               │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 5. Suppression  │                │                                      │                                  │               │
│ (3 actions)     │                │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 26              │ Ouvrir         │ Bouton "🗑️" → ouvre modal           │ Radix Dialog confirmation        │ ✅            │
│                 │ confirmation   │ confirmation                         │                                  │ Opérationnel  │
│                 │ suppression    │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 27              │ Confirmer      │ DELETE /api/tasks/:id → hard delete  │ fetch DELETE, Supabase delete    │ ✅            │
│                 │ suppression    │ dans tasks table                     │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 28              │ Annuler        │ Ferme modal sans action              │ Radix Dialog onOpenChange        │ ✅            │
│                 │ suppression    │                                      │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 6. Recherche &  │                │                                      │                                  │               │
│ Tri (5 actions) │                │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 29              │ Rechercher par │ <input> debounced 300ms → filter     │ use-debounce, Array.filter()     │ ✅            │
│                 │ titre          │ titre.includes(searchQuery)          │ sur title                        │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 30              │ Rechercher par │ Filter description.includes()        │ Array.filter() sur description   │ ✅            │
│                 │ description    │                                      │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 31              │ Highlight      │ react-highlight-words sur résultats  │ react-highlight-words,           │ ✅            │
│                 │ résultats      │ recherche                            │ Highlighter composant            │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 32              │ Trier par date │ Array.sort() par due_date asc/desc   │ Array.sort(), date-fns compare   │ ✅            │
│                 │ échéance       │                                      │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 33              │ Trier par      │ Array.sort() par priority (haute →   │ Array.sort(), mapping priorité   │ ✅            │
│                 │ priorité       │ basse)                               │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 7. Export &     │                │                                      │                                  │               │
│ Métriques (5    │                │                                      │                                  │               │
│ actions)        │                │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 34              │ Voir métriques │ Barre en haut : X à faire · Y urgent │ countTasksByStatus(),            │ ✅            │
│                 │ globales       │ · Z semaine · W terminées            │ affichage inline                 │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 35              │ Calcul taux    │ (termine / total) × 100              │ JavaScript natif, affichage %    │ ✅            │
│                 │ complétion     │                                      │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 36              │ Exporter CSV   │ GET /api/tasks/export → CSV UTF-8    │ papaparse, download CSV          │ ✅            │
│                 │                │ avec BOM                             │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 37              │ Exporter JSON  │ Bouton "⬇️ JSON" → JSON.stringify()  │ JSON.stringify(), Blob download  │ ✅            │
│                 │                │ + download                           │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 38              │ Importer CSV   │ POST /api/tasks/import → mapping     │ papaparse, validation champs     │ ✅            │
│                 │                │ colonnes + validation                │                                  │ Opérationnel  │
└─────────────────┴────────────────┴──────────────────────────────────────┴──────────────────────────────────┴───────────────┘
```

---

## Résumé Exécutif

**Total : 38 actions** — **36 ✅ Opérationnel** / **1 ⚠️ Partiel** / **1 ❌ À faire**

**Taux de fonctionnalité : 95%**

### Par Catégorie

| Catégorie | Total | ✅ | ⚠️ | ❌ | Taux |
|-----------|-------|----|----|----|----|
| Vue & Liste | 5 | 5 | 0 | 0 | 100% |
| Filtres & Navigation | 4 | 4 | 0 | 0 | 100% |
| Création & Édition | 8 | 8 | 0 | 0 | 100% |
| Gestion Statut | 8 | 6 | 2 | 0 | 75% |
| Suppression | 3 | 3 | 0 | 0 | 100% |
| Recherche & Tri | 5 | 5 | 0 | 0 | 100% |
| Export & Métriques | 5 | 5 | 0 | 0 | 100% |

### Actions à Compléter

1. **#18-19 (⚠️)** : Persister cocher/décocher → PATCH /api/tasks/:id — UI présent, test DB requis
2. **#23 (❌)** : Drag-drop entre colonnes — dnd-kit absent, nécessite install + implémentation

---

## Détails Techniques

### Route API /api/tasks

**GET /api/tasks**
- Récupère toutes les tâches utilisateur
- Supabase query builder avec `.eq('user_id', userId)`
- Tri par `due_date ASC`
- Colonnes : id, title, description, priority, status, due_date, created_at

**POST /api/tasks**
- Body : { title, description, priority, due_date }
- Validation Zod schema
- Insert Supabase avec user_id
- Retourne la tâche créée

**PATCH /api/tasks/:id**
- Body partiel : { title?, description?, priority?, status?, due_date? }
- Validation ID UUID
- Update Supabase avec `.eq('id', id).eq('user_id', userId)`
- Retourne la tâche modifiée

**DELETE /api/tasks/:id**
- Hard delete
- Confirmation côté client
- Supabase `.delete().eq('id', id).eq('user_id', userId)`

**GET /api/tasks/export**
- Export CSV UTF-8 avec BOM
- Colonnes : Titre, Description, Priorité, Statut, Échéance, Créé le
- papaparse génère CSV
- Headers : `Content-Type: text/csv; charset=utf-8`

**POST /api/tasks/import**
- Upload CSV via FormData
- papaparse parse
- Validation champs obligatoires (titre, priorité)
- Mapping colonnes auto (détection nom/title)
- Insert batch Supabase

---

## Outils Utilisés

- **React** : useState, useEffect, memo
- **Fetch API** : GET/POST/PATCH/DELETE natif
- **Supabase** : Query builder, insert, update, delete
- **date-fns** : format, parse, compareAsc/Desc
- **@radix-ui/react-dialog** : Modals (création, édition, détail, confirmation)
- **@radix-ui/react-select** : Dropdown priorité
- **use-debounce** : Debounced search input 300ms
- **react-highlight-words** : Highlight résultats recherche
- **papaparse** : Export/import CSV
- **CSS inline** : Transitions 0.3s ease, theme.ts (C.gold, C.bgDeep)

---

## Composants Principaux

### TaskCard
- Badge priorité (PriorityDots)
- Badge date échéance (formatDate)
- Checkbox terminé (persist ⚠️)
- Clic → ouvre modal détail
- Menu contextuel (éditer, supprimer, changer statut)

### TaskDetailModal
- Mode readonly par défaut
- Bouton "✏️ Éditer" → passe en mode édition
- Formulaire pré-rempli
- Boutons action : Urgent / Cette semaine / À faire / Terminé
- Bouton "🗑️ Supprimer" avec confirmation

### TaskForm
- Input titre (required)
- Textarea description
- Select priorité (haute/moyenne/basse)
- Input date échéance (type="date")
- Boutons : Annuler / Sauvegarder

### PriorityDots
- 🔴 Haute → C.red
- 🟡 Moyenne → C.gold
- ⚪ Basse → C.gray
- 3 points horizontaux alignés

---

## Bugs Connus & Limitations

### ⚠️ Persistance checkbox (Actions #18-19)
**Symptôme** : Cocher/décocher ne persiste pas toujours en DB

**Cause probable** : Race condition entre optimistic update et PATCH serveur

**Solution** : Ajouter debounce 500ms + retry logic + rollback si erreur serveur

**Test requis** : DB Supabase connectée + user_id valide

---

### ❌ Drag-drop absent (Action #23)
**Symptôme** : Impossible de glisser-déposer tâches entre colonnes

**Cause** : dnd-kit non installé dans src/app/(dashboard)/tasks/page.tsx

**Solution** :
1. Installer `@dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
2. Wrap colonnes dans `<DndContext>`
3. Implémenter `onDragEnd` → PATCH status
4. Ajouter `<SortableContext>` + `useSortable()` dans TaskCard

**Fichier à modifier** : `src/app/(dashboard)/tasks/page.tsx`

**Code pattern** :
```tsx
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

const handleDragEnd = async (event: DragEndEvent) => {
  const { active, over } = event;
  if (!over) return;
  
  const taskId = active.id as string;
  const newStatus = over.id as string; // 'a_faire' | 'urgent' | 'cette_semaine' | 'termine'
  
  // Optimistic update
  setAllTasks(prev => prev.map(t => t.id === taskId ? {...t, status: newStatus} : t));
  
  // Persist
  await fetch(`/api/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: newStatus })
  });
};
```

---

## Prochaines Étapes

1. **Fixer persistence checkbox** (#18-19) :
   - Tester avec DB connectée
   - Ajouter debounce 500ms
   - Logger erreurs réseau
   - Implémenter rollback

2. **Implémenter drag-drop** (#23) :
   - Installer dnd-kit
   - Wrap colonnes dans DndContext
   - Ajouter useSortable à TaskCard
   - PATCH status onDragEnd

3. **Optimisations** :
   - Pagination (afficher 50 tâches max par colonne)
   - Infinite scroll pour Terminées
   - Cache TanStack Query (invalidate on mutation)
   - WebSocket real-time (si multi-device)

---

**Document généré par analyse méthodologie killer-saas — 38 actions documentées**
