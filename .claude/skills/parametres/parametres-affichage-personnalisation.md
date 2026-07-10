---
name: parametres-affichage-personnalisation
description: Visibilité des sections dashboard, paramètres mobile et célébrations — se déclenche quand on touche aux onglets Sections/Mobile/Celebrations du module Paramètres
metadata:
  type: skill
  domain: settings
---

# Skill: Affichage & Personnalisation UI

## Périmètre

Tout ce qui contrôle l'apparence et la visibilité des sections du dashboard, sans impact sur les données métier.

## Onglets concernés

- **Sections** : Visibilité des 20 sections du dashboard
- **Mobile** : Sections mobiles, taille police, mode compact, menu bottom
- **Celebrations** (dans General) : Test confettis/fusée/feux d'artifice/gong

## Sous-sections

### Visibilité sections (Tab Sections)
20 checkboxes, toutes ON par défaut :
today, global, tns, chefs, particuliers, interpro, agenda, sequences, commerce, chrono, champions, revenue, pipeline, tasks, crm, clients, map, simulator, auto, analytics, assistant

**État** : NON PERSISTÉ — state reset au reload

### Mobile (Tab Mobile)
11 sections avec default ON/OFF :
today(ON), global(ON), champions(ON), tns(ON), chefs(OFF), particuliers(OFF), agenda(ON), sequences(OFF), commerce(ON), crm(OFF), settings(ON)

Plus : taille police (petit/moyen/grand), mode compact, menu en bas

**État** : NON PERSISTÉ — aucun handler de save

### Celebrations (section dans General)
5 boutons de test : confettis, fusée, feux d'artifice, gong RDV, gong contrat

**État** : Fonctionnel (animations/sons jouées directement)

## Impact sur le layout

- La visibilité des sections devrait filtrer la sidebar dans `layout.tsx`
- Les paramètres mobile devraient s'appliquer via CSS/media queries ou `useMediaQuery`
- Actuellement : AUCUN IMPACT réel (les checkboxes ne sont lues nulle part)

## Règles

1. Ne jamais modifier `layout.tsx` ou `theme.ts` sans demande explicite
2. La persistance doit utiliser `/api/settings` (colonne jsonb `ui_preferences` ou similaire)
3. Les sections visibles doivent être cohérentes entre desktop et mobile
