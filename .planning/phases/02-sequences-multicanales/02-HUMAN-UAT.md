---
status: partial
phase: 02-sequences-multicanales
source: [02-VERIFICATION.md]
started: 2026-05-10T00:00:00Z
updated: 2026-05-10T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Migration DB appliquée
expected: supabase db push appliqué avec succès — tables sequence_templates, sequence_instances, etc. visibles en base
result: APPROVED (confirmé lors du checkpoint 02A — user a approuvé après supabase db push)

### 2. Section Séquences visible dans le drawer prospect
expected: Section "Séquences de relance" visible dans le drawer d'une carte prospect sur /crm, avec sélecteur de template et bouton "Démarrer"
result: [pending]

### 3. Lifecycle séquence complet (Start/Pause/Cancel)
expected: Démarrer une séquence depuis le drawer, la voir apparaître avec statut "planifié", la pauser et l'annuler
result: [pending]

### 4. Auto-trigger SEQ-02 au changement de stade pipeline
expected: Déplacer un prospect dans le Kanban déclenche automatiquement la séquence associée au nouveau stade (si auto_trigger=true sur le template)
result: [pending]

## Summary

total: 4
passed: 1
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
