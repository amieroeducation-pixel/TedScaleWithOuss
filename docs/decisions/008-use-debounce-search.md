# ADR-008: use-debounce pour recherche et auto-save

## Status
Accepted

## Context
Le Dashboard a plusieurs inputs de recherche (CRM, nurturing, prospection TNS) et des champs avec auto-save (édition prospect inline). Sans debouncing, chaque frappe déclenche une requête API/DB → surcharge réseau et UX dégradée.

## Decision
Utiliser le hook `use-debounce` pour debouncer les inputs de recherche et les auto-saves.

## Options considered

| Option | Avantages | Inconvénients | Verdict |
|--------|-----------|---------------|---------|
| **use-debounce (choisi)** | Hook React simple, TypeScript, 1.5kb, maintenance active | Dépendance externe pour feature simple | Retenu |
| lodash.debounce | Battle-tested, feature-rich | Taille (17kb), pas React-optimisé | Rejeté |
| Custom hook | Pas de dépendance, contrôle total | Bugs edge cases (unmount, race conditions) | Rejeté |

## Consequences
- **Installation** : `npm install use-debounce`
- **Use cases** :
  1. **Recherche CRM/Nurturing** : debounce 300ms → query DB
  2. **Auto-save édition prospect** : debounce 1000ms → PATCH API
  3. **Recherche prospection TNS** : debounce 500ms → API entreprises.data.gouv.fr

## Implementation notes
```typescript
// Recherche CRM
import { useDebouncedValue } from 'use-debounce'

function CRMPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch] = useDebouncedValue(search, 300)

  const { data: prospects } = useQuery({
    queryKey: ['prospects', debouncedSearch],
    queryFn: () => fetch(`/api/prospects?search=${debouncedSearch}`).then(r => r.json()),
  })

  return <input value={search} onChange={(e) => setSearch(e.target.value)} />
}

// Auto-save édition
import { useDebouncedCallback } from 'use-debounce'

function ProspectForm() {
  const updateProspect = useDebouncedCallback(
    async (id, data) => {
      await fetch(`/api/prospects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
      toast.success('Sauvegardé')
    },
    1000,
    { leading: false, trailing: true }
  )

  return <input onChange={(e) => updateProspect(prospectId, { notes: e.target.value })} />
}
```

**Performance gain** : Recherche 300ms debounce → 70% moins de requêtes API pour un mot de 10 lettres (1 requête au lieu de 10).
