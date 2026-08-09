# ADR-001: Stack Next.js + Supabase sans boilerplate externe

## Status
Accepted (existant — hérité du projet initial)

## Context
Le Dashboard CGP est un outil interne solo. Il faut une stack fullstack rapide à développer, avec auth, DB, et déploiement simple.

## Decision
Next.js 15 App Router + Supabase (PostgreSQL + Auth SSR) + Cloud Run. Pas de boilerplate externe (ship-saas.now ou autre).

## Options considered

| Option | Avantages | Inconvénients | Verdict |
|--------|-----------|---------------|---------|
| **Next.js + Supabase (choisi)** | Stack maîtrisée, auth SSR native, DB PostgreSQL, gratuit en usage solo | Pas de starter kit structuré | Retenu |
| ship-saas.now | Boilerplate complet (auth, billing, landing) | Overhead billing/landing inutile pour outil interne, coût licence | Rejeté |
| Next.js + Prisma + Better Auth | ORM typé, auth flexible | Migration depuis Supabase coûteuse, perte realtime/storage | Rejeté |

## Consequences
- Conventions extraites du code existant (pas d'un boilerplate)
- Query builder Supabase direct (pas d'ORM)
- Auth via `@supabase/ssr` avec `getUser()` dans middleware
