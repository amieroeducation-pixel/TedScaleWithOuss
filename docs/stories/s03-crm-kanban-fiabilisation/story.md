# Story S03 : CRM Kanban - Fiabilisation

## Objectif

Fiabiliser le CRM Kanban avec drag-and-drop complet et gestion des prospects (CRUD + interactions).

## Contexte

- **Page actuelle** : `/dashboard/crm`
- **Stack** : Next.js 15 App Router + Supabase + react-beautiful-dnd
- **Design** : PSG Cosmos (dark/gold) avec CSS inline via `C.xxx`

## Livrables attendus (9 tâches TDD)

1. **Schemas Zod centralisés** pour validation
2. **ProspectDeleteDialog component** avec confirmation
3. **Rollback drag-drop amélioré** (optimistic UI + error handling)
4. **InteractionTimeline component** (affichage historique)
5. **AddInteractionModal component** (ajout notes/calls/meetings)
6. **Integration timeline** dans ProspectDetailModal
7. **Tests unitaires** (Vitest) pour schemas + utils
8. **Tests E2E** (Playwright) - 11 scénarios complets
9. **Documentation technique**

## Règles critiques

### Qualité maximale
- Code 100% fonctionnel avec gestion erreurs complète
- Tests E2E obligatoires (11 scénarios minimum)
- Pas de mocks, pas de hardcoded, pas de TODOs
- TDD strict : tests avant implémentation

### Architecture
- **Supabase SSR** : `createSupabaseServerClient()` côté serveur
- **Design system** : `import { C } from '@/styles/theme'` uniquement
- **API routes** : `/app/api/crm/[...]`
- **Components** : `/components/crm/[...]`

## Scénarios E2E attendus

1. Affichage initial du Kanban (3 colonnes + prospects)
2. Drag-and-drop prospect entre colonnes
3. Drag-and-drop avec rollback sur erreur réseau
4. Création nouveau prospect
5. Modification prospect existant
6. Suppression prospect avec confirmation
7. Ajout interaction note
8. Ajout interaction call
9. Ajout interaction meeting
10. Affichage timeline interactions
11. Filtrage/recherche prospects

## Contraintes

- Budget : 3-4h max
- Build npm doit passer
- Review score 10/10 obligatoire
- THE LOOP : fix jusqu'à 100% opérationnel
