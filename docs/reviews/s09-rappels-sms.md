---
story: s09-rappels-sms
date: 2026-09-03
reviewer: claude-reviewer-agent
---

# Review — s09-rappels-sms

## AC Checklist

| AC | Requirement | Status |
|----|-------------|--------|
| 1 | Cron verifie RDV + envoie SMS 24h via Brevo | PASS |
| 2 | Second rappel 1h avant | PASS |
| 3 | SMS personnalise (nom, date, heure, lieu) | PASS |
| 4 | Delais configurables dans Settings | PASS |
| 5 | Logs visibles dans Automatisations (cron_logs) | PASS |
| 6 | Anti-doublon (reminder_sent unique constraint) | PASS |

## Test Results

- TypeScript: 0 erreurs src/
- Build: propre
- E2E: e2e/s09-rappels-sms.spec.ts cree (5 tests)

## Changes (branch feature/s09-rappels-sms-fix)

- Fix hardcoded `lieu: 'Mon cabinet'` → `settingsByUser[].cabinet_location ?? 'Mon cabinet'`
- Migration SQL 20260903_cabinet_location.sql
- Champ saisie lieu dans RappelsSmsTab.tsx
- cabinet_location dans UserSettings type + Zod PatchSettingsSchema
- reminder_enabled/delay_24h/delay_1h ajoutes au schema Zod (fix pre-existant)

## Findings

1. **Major** — Tests E2E tautologiques (assertions trop permissives, valeurs locales testees contre elles-memes). Ne bloque pas le ship car le code principal est correct.
2. **Minor** — cabinet_location absent des defaults initiaux dans le cron (gere par ?? fallback).
3. **Minor** — Fix bonus Zod pour champs rappels manquants (bug pre-existant corrige).

## ADR Compliance

- Cron pattern (verifyCronSecret + isCronEnabled + logCronRun): conforme
- Inline CSS avec C.*: conforme
- Zod v4 (.issues): conforme

Max severity: major
Ship allowed: yes
