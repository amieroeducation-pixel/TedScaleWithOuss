# ADR-003: Cron jobs via API routes + header secret

## Status
Accepted (existant — pattern établi)

## Context
Le Dashboard a besoin de jobs planifiés (rappels RDV, relances, santé clients). Il faut un mécanisme d'exécution fiable et débuggable.

## Decision
Chaque job cron est une route API `GET /api/cron/<job-name>` authentifiée par header `x-cron-secret`. Appelé par un scheduler externe (Task Scheduler Windows en local, Cloud Scheduler en prod).

## Options considered

| Option | Avantages | Inconvénients | Verdict |
|--------|-----------|---------------|---------|
| **API routes + secret header (choisi)** | Testable en local (curl), loggable, toggle par job, même infra Next.js | Pas de retry natif, dépend du scheduler externe | Retenu |
| Supabase Edge Functions | Intégrées à Supabase, cron natif pg_cron | Debug difficile, déploiement séparé, cold start | Rejeté |
| Vercel Cron | Intégré au hosting | Vendor lock-in, pas dispo sur Cloud Run | Rejeté |

## Consequences
- Chaque cron suit le pattern : `verifyCronSecret()` → `isCronEnabled()` → logique → `logCronRun()`
- Table `cron_logs` pour l'observabilité
- `CRON_SECRET` env var obligatoire en prod
