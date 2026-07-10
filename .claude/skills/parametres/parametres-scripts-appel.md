---
name: parametres-scripts-appel
description: Scripts d'appel et réponses aux objections par métier avec détection civilité — se déclenche quand on touche à l'onglet Scripts du module Paramètres ou aux scripts depuis le CRM
metadata:
  type: skill
  domain: settings
---

# Skill: Scripts d'appel & Objections

## Périmètre

Gestion des scripts de prospection téléphonique et WhatsApp par métier, ainsi que les réponses types aux objections.

## Onglet concerné

- **Scripts**

## API Endpoints

| URL | Method | Purpose |
|-----|--------|---------|
| `/api/call-scripts?metier=${m}` | GET | Charge les scripts par métier |
| `/api/call-scripts` | POST | Crée un script |
| `/api/call-scripts/${id}` | PUT | Met comme défaut |
| `/api/call-scripts/${id}` | DELETE | Supprime |
| `/api/call-objections?metier=${m}` | GET | Charge les objections par métier |
| `/api/call-objections` | POST | Crée une objection |
| `/api/call-objections/${id}` | DELETE | Supprime |

## État actuel

- CRUD scripts : **fonctionnel**
- CRUD objections : **fonctionnel**
- Auto-migration vers format `[Civilité]` : **fonctionnel**
- Détection genre via `src/lib/civilite.ts` : **fonctionnel**

## Métiers supportés

medecin_generaliste, kinesitherapeute, dentiste, avocat, expert_comptable, notaire, osteopathe, infirmier, pharmacien, architecte

## Variables de template

- `[Civilité]` : résolu dynamiquement (Monsieur/Madame/Docteur) via `detectCivilite()`
- `[Nom]` : nom de famille du prospect

## Sections qui consomment les scripts

| Section | Usage |
|---------|-------|
| CRM (Kanban) | Script picker pour WhatsApp/appel — modal avec preview |
| Calling sessions | Scripts affichés pendant l'appel |

## Schéma DB

- Table `call_scripts` : id, user_id, metier, titre, contenu, is_default, created_at
- Table `call_objections` : id, user_id, metier, question, reponse, ordre

## Règles métier

1. Un seul script "par défaut" par métier (les autres sont des alternatives)
2. La détection de civilité utilise le prénom (300+ prénoms féminins) + la profession (Docteur pour médecins)
3. L'auto-migration supprime les anciens scripts (format OUVERTURE/PITCH) et les remplace
