---
name: parametres-sequences-automatisations
description: CRUD des templates de séquences, étapes, triggers auto et variantes de messages — se déclenche quand on touche aux onglets Séquences/Triggers/Variantes du module Paramètres
metadata:
  type: skill
  domain: settings
---

# Skill: Séquences & Automatisations

## Périmètre

Configuration des séquences de relance multicanales, leur déclenchement automatique par stade pipeline, et les variantes de messages.

## Onglets concernés

- **Sequences** : CRUD templates + steps
- **Triggers** : Toggle auto_trigger par template
- **Variantes** : Visualisation et activation de variantes

## API Endpoints

| URL | Method | Purpose |
|-----|--------|---------|
| `/api/crm/sequences/templates` | GET | Liste tous les templates |
| `/api/crm/sequences/templates` | POST | Crée un template (body: `{name}`) |
| `/api/crm/sequences/templates/${id}` | PATCH | Update (pipeline_stage, auto_trigger) |
| `/api/crm/sequences/templates/${id}` | DELETE | Supprime le template |
| `/api/crm/sequences/templates/${id}/steps` | GET | Liste les étapes |
| `/api/crm/sequences/templates/${id}/steps` | POST | Ajoute une étape |
| `/api/crm/sequences/templates/${id}/steps/${stepId}` | PATCH | Modifie une étape |
| `/api/crm/sequences/templates/${id}/steps/${stepId}` | DELETE | Supprime une étape |
| `/api/crm/sequences/seed-library` | POST | Import des 10 séquences prédéfinies |
| `/api/crm/sequences/seed-library` | GET | Charge les variantes |

## État actuel

- CRUD templates + steps : **fonctionnel**
- Triggers auto : **fonctionnel** (toggle + optimistic update)
- Variantes : **partiellement cassé** — le bouton "Activer cette variante" affiche un toast mais ne persiste pas en DB

## Règles métier

1. Un seul trigger auto par stade pipeline (règle affichée dans l'UI)
2. Désactiver un trigger n'annule pas les séquences en cours
3. Les variantes doivent écrire dans `message_template` de l'étape correspondante
4. Les variables supportées : `{{prenom}}, {{nom}}, {{profession}}, {{ville}}, {{heure}}, {{date}}`

## Schéma DB

- Table `sequence_templates` : id, user_id, name, pipeline_stage, auto_trigger
- Table `sequence_steps` : id, template_id, step_order, channel, delay_days, message_template
