# ADR-002: Inline CSS via theme.ts pour la palette PSG Cosmos

## Status
Accepted (existant — convention imposée par l'utilisateur)

## Context
Le design PSG Cosmos utilise une palette spécifique (dark/gold/ribbon). Il faut un système de styling cohérent et protégé des modifications accidentelles.

## Decision
Toutes les couleurs passent par l'objet `C` exporté depuis `src/lib/theme.ts`. Appliquées en inline `style={{ }}`. Tailwind est limité aux utilitaires de layout (flex, grid, gap, padding).

## Options considered

| Option | Avantages | Inconvénients | Verdict |
|--------|-----------|---------------|---------|
| **Inline CSS + theme.ts (choisi)** | Source unique de vérité couleurs, impossible d'introduire une couleur off-brand par erreur | Verbeux, pas de pseudo-classes | Retenu |
| Tailwind custom theme | Classes concises, pseudo-classes | Risque de dérive (utilisation de couleurs par défaut Tailwind), theme.ts non protégé | Rejeté |
| CSS Modules | Scoped, pseudo-classes | Fragmentation fichiers, pas de source unique couleur | Rejeté |

## Consequences
- Tout agent doit importer `C` de `@/lib/theme.ts`
- `theme.ts` et `layout.tsx` ne sont JAMAIS modifiés sans demande explicite
- Tailwind reste installé pour `flex`, `grid`, `p-*`, `gap-*` etc.
