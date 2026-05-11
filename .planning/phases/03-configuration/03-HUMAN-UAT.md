---
status: partial
phase: 03-configuration
source: [03-VERIFICATION.md]
started: 2026-05-11T00:00:00Z
updated: 2026-05-11T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Persister et recharger les seuils KPI
expected: Modifier CA mensuel cible dans l'onglet KPI → sauvegarder → recharger la page → valeur conservée en base
result: [pending]

### 2. CRUD template séquence
expected: Créer un template depuis l'onglet Séquences → ajouter une étape → modifier canal/délai → supprimer → persisté en Supabase
result: [pending]

### 3. Conflit auto_trigger 409
expected: 2 templates sur le même stade pipeline, activer auto_trigger sur le 2e → rollback visible + message d'erreur inline rouge
result: [pending]

### 4. Template message JSONB
expected: Sélectionner canal WhatsApp + stade "RDV1" → taper un message → enregistrer → recharger → message conservé
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
