# s08-booking-page — Page publique de prise de RDV (Kill Calendly)

**En tant que** prospect, je veux cliquer sur un lien partagé par le CGP et choisir un créneau disponible pour prendre RDV, puis recevoir une confirmation.

## Acceptance Criteria
1. Une URL publique `/booking/[slug]` affiche les créneaux disponibles de la semaine (lun-ven, plages configurables)
2. Les créneaux occupés dans Google Calendar sont masqués
3. Le prospect saisit son nom, téléphone, email et sélectionne un créneau → le RDV est confirmé
4. Le RDV confirmé crée un événement Google Calendar + une entrée en DB (`bookings` table)
5. Le CGP voit le nouveau RDV dans sa vue Aujourd'hui
6. La page est responsive et fonctionne sur mobile (prospects sur téléphone)

## Agentic Notes
- **Fichiers à créer** : `src/app/booking/[slug]/page.tsx` (page publique, hors layout dashboard), table `bookings` en Supabase
- **Ref Calendly** : page `calendly.com/user/30min` — sélection jour → créneau → formulaire → confirmation. UI épurée, pas de login requis
- **Contrainte** : cette page est PUBLIQUE (pas d'auth) — middleware.ts doit exclure `/booking` du redirect auth (cette story est responsable de la modification du middleware)
- **Architecture** : extraire les composants UI en sous-fichiers si la page dépasse 500 lignes
- **Config** : durée de RDV (30min par défaut), plages horaires (9h-18h), jours dispo — stockés dans `user_settings`
- **Design** : doit respecter la charte PSG Cosmos (la page publique est une vitrine du CGP)

## Complexity: 3
