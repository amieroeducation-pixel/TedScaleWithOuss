---
name: parametres-connexions-api
description: Configuration et validation des connexions Google Calendar, Pappers, workflows externes — se déclenche quand on touche à l'onglet Intégrations du module Paramètres
metadata:
  type: skill
  domain: settings
---

# Skill: Connexions API & Intégrations

## Périmètre

Tout ce qui concerne les connexions vers des services externes depuis le module Paramètres.

## Onglet concerné

- **Integrations**

## Sous-sections

### Google Calendar
- **État** : fonctionnel (OAuth via `/api/auth/google-calendar`)
- **Vérification** : GET `/api/calendar/events` pour vérifier la connexion
- **UI** : Indicateur connecté/déconnecté + bouton Connecter/Reconnecter

### Workflows & Automatisations
- **État** : NON CÂBLÉ (formulaire sans handler de save)
- **Champs** : Nom du workflow, Base cible (tns/chef/particulier), Type intégration (api/mcp/webhook), Clé API/URL
- **Bug** : Les boutons "Supprimer" et "Ajouter" ne font rien

### API Pappers
- **État** : NON CÂBLÉ (champ + bouton Tester sans handler)
- **Usage** : Utilisé dans `/api/prospection/tns` via `process.env.PAPPERS_API_KEY`

### Data.gouv MCP
- **État** : Panel informatif seulement (affiché comme "indisponible")

### Export & Backup
- **État** : NON PERSISTÉ (2 checkboxes sans handler)
- **Champs** : Export CSV automatique, Backup LocalStorage hebdomadaire

## Sections du dashboard qui dépendent des intégrations

| Intégration | Pages consommatrices |
|-------------|---------------------|
| Google Calendar | Today (agenda), Pipeline (RDV semaine) |
| Pappers | Prospection TNS (enrichissement numéros) |
| Data.gouv | Prospection TNS (recherche entreprises) — via env, pas configurable |

## Règles métier

1. Les clés API (Pappers, Google) sont des secrets — ne jamais les exposer côté client
2. La connexion Google Calendar utilise un flux OAuth server-side avec refresh token
3. Les workflows sont un concept non implémenté — à décider : supprimer ou câbler
