<!-- GSD:project-start source:PROJECT.md -->
## Project

**Ted Scale With Ouss**

Dashboard personnel de pilotage pour Conseiller en Gestion de Patrimoine (CGP) indépendant. Il centralise pipeline client, suivi des commissions, relances multicanales automatisées, et KPIs hebdomadaires dans une interface dark/gold premium. L'outil tourne en local sur Windows et remplace la gestion fragmentée entre tableurs, WhatsApp et agenda papier.

**Core Value:** **Avoir sur un seul écran tout ce qu'il faut faire aujourd'hui** — relances prioritaires, alertes clients inactifs, CA en temps réel — sans aller chercher l'information ailleurs.

### Constraints

- **Stack** : Next.js 15 App Router uniquement — pas de Pages Router, pas de migration
- **Auth** : Supabase Auth SSR (`@supabase/ssr` v0.10) avec `getUser()` dans middleware
- **Zod** : Version 4 — `.issues` (pas `.errors`), `PropertyKey[]` pour les paths
- **Design** : Thème dark/gold inline CSS — pas de migration vers shadcn/ui default tokens
- **Scope local** : Validé en local avant tout déploiement
<!-- GSD:project-end -->

<!-- GSD:stack-start source:STACK.md -->
## Technology Stack

Technology stack not yet documented. Will populate after codebase mapping or first phase.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
