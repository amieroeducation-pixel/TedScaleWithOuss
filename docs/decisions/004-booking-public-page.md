# ADR-004: Page booking publique hors layout dashboard

## Status
Proposed (à implémenter dans s08-booking-page)

## Context
Pour tuer Calendly, il faut une page publique accessible sans authentification où les prospects peuvent réserver un créneau. Cette page doit être séparée du dashboard privé.

## Decision
La page de booking vit dans `src/app/booking/[slug]/page.tsx`, hors du route group `(dashboard)`. Elle est exclue de l'auth middleware. Elle utilise le design PSG Cosmos (vitrine CGP).

## Options considered

| Option | Avantages | Inconvénients | Verdict |
|--------|-----------|---------------|---------|
| **Route `/booking/[slug]` hors (dashboard) (choisi)** | Séparation claire public/privé, middleware simple, URL propre | Pas de réutilisation layout sidebar | Retenu |
| Sous-domaine `rdv.domain.com` | URL très courte, séparation totale | Complexité DNS/CORS, pas nécessaire pour usage solo | Rejeté |
| Route dans (dashboard) avec auth bypass | Réutilisation composants | Complique le middleware, risque de fuite auth | Rejeté |

## Consequences
- `middleware.ts` doit ajouter `/booking` à `isPublicRoute`
- La page booking a son propre layout minimal (pas de sidebar)
- Table `bookings` créée pour stocker les réservations
- Vérification disponibilité via Google Calendar API avant affichage créneaux
