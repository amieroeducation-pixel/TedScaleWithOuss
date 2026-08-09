# ADR-007: Radix UI primitives pour composants accessibles

## Status
Accepted

## Context
Le Dashboard utilise des modals/dialogs/alerts dans toutes les sections (nurturing, CRM, tâches, booking). Actuellement implémentés en custom CSS avec accessibilité partielle. Il faut des primitives accessibles (WCAG 2.1 AA) avec keyboard navigation, focus trap, et escape handlers.

## Decision
Utiliser **@radix-ui/react-*** primitives (foundation de shadcn/ui) pour les composants UI interactifs.

## Options considered

| Option | Avantages | Inconvénients | Verdict |
|--------|-----------|---------------|---------|
| **Radix UI (choisi)** | Accessible par défaut, headless (styling libre PSG Cosmos), TypeScript natif, maintenance solide | Taille bundle (+50kb gzipped pour 5 composants) | Retenu |
| shadcn/ui (full) | Composants pré-stylés, copier-coller | Style Tailwind incompatible design PSG Cosmos (inline CSS) | Rejeté |
| Headless UI (Tailwind Labs) | Léger, bien documenté | Moins de composants que Radix | Rejeté |
| React Aria (Adobe) | Très accessible, hooks-based | Verbeux, courbe apprentissage | Rejeté |
| Custom modals | Contrôle total, léger | Accessibilité difficile (focus trap, aria, escape), maintenance | Rejeté |

## Consequences
- **Installation** : 
  ```bash
  npm install @radix-ui/react-dialog @radix-ui/react-alert-dialog @radix-ui/react-select @radix-ui/react-tooltip @radix-ui/react-checkbox
  ```
- **Styling** : Headless (pas de CSS par défaut) → styles inline PSG Cosmos
- **Composants prioritaires** :
  - `Dialog` — Modals (création prospect, édition tâche, détail contact)
  - `AlertDialog` — Confirmations suppression (prospect, tâche)
  - `Select` — Dropdowns (assignation séquence, filtre tags)
  - `Tooltip` — Infos bulle (lead score, next action)
  - `Checkbox` — Filtres multi-select (tags CRM, statuts tâches)

## Implementation notes
```typescript
// Exemple Dialog stylé PSG Cosmos
import * as Dialog from '@radix-ui/react-dialog'
import { C } from '@/lib/theme'

export function ProspectModal({ open, onClose, children }) {
  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay style={{ 
          position: 'fixed', 
          inset: 0, 
          background: 'rgba(0,0,0,0.7)' 
        }} />
        <Dialog.Content style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: C.bgMid,
          border: `1px solid ${C.line}`,
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '600px',
          width: '90%',
        }}>
          {children}
          <Dialog.Close style={{ position: 'absolute', top: 16, right: 16 }}>
            ×
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
```

**Avantages accessibilité automatiques** :
- Focus trap (Tab circule dans le modal)
- Escape key ferme le modal
- Click overlay ferme le modal
- `aria-modal`, `aria-labelledby`, `role="dialog"` auto
- Focus retourne à l'élément déclencheur après fermeture
