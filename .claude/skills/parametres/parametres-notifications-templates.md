---
name: parametres-notifications-templates
description: Canaux de notification, événements déclencheurs et templates de messages par stade pipeline — se déclenche quand on touche à l'onglet Notifications du module Paramètres
metadata:
  type: skill
  domain: settings
---

# Skill: Notifications & Templates Messages

## Périmètre

Configuration des canaux de notification, des événements déclencheurs, et de l'éditeur de templates de messages par canal × stade pipeline.

## Onglet concerné

- **Notifications**

## Sous-sections

### Canaux de notification
- Push navigateur (toggle, default ON)
- Email (toggle + champ email, default OFF)
- SMS (toggle + champ téléphone, default OFF)
- Telegram (toggle + Bot Token + Chat ID, default OFF)

**État** : NON PERSISTÉ — les toggles et champs se réinitialisent au reload

### Événements à notifier
- Prospection hebdo prête (Lundi 8h)
- Prospection mensuelle prête (1er lundi 8h)
- Leads urgence 48h détectés
- Workflow terminé (résultats)
- Échec workflow (erreur API)
- Rappel RDV (N heures avant, default 24)

**État** : NON PERSISTÉ — checkboxes se réinitialisent au reload

### Tests notifications
- 4 boutons Test (Push, Email, SMS, Telegram)
- **État** : boutons affichent un toast mais n'envoient rien

### Templates de messages
- Sélecteur canal (WhatsApp, Email, SMS)
- Sélecteur stade pipeline (a_contacter, rdv1, rdv2, rdv3, converti, perdu, default)
- Textarea éditeur avec compteur caractères (SMS)
- Bouton "Enregistrer le template"

**État** : FONCTIONNEL — persisté via `/api/settings` PATCH `message_templates`

## Données DB

| Champ | Clé DB (`user_settings`) | Structure |
|-------|--------------------------|-----------|
| Templates messages | `message_templates` | `Record<channel, Record<stage, string>>` |

## Sections qui consomment les templates

| Section | Usage |
|---------|-------|
| CRM (Kanban) | Messages pré-remplis pour relances WhatsApp/Email/SMS |
| Séquences executor | Contenu des messages envoyés automatiquement |

## Règles métier

1. Le template "default" s'applique si aucun template spécifique au stade n'est défini
2. Pour SMS, le compteur montre 160 chars/segment (alerte au-delà)
3. Les canaux de notification sont indépendants des canaux de relance (séquences)
