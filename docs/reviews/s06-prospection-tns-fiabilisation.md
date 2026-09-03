---
story: s06-prospection-tns-fiabilisation
date: 2026-09-03
reviewer: claude-reviewer-agent
---

# Review — s06-prospection-tns-fiabilisation

## DoD Checklist

| # | Item | Status |
|---|------|--------|
| 1 | Tous les metiers frontend existent dans METIERS_CONFIG backend | PASS |
| 2 | Pagination dynamique Data.gouv (pas page=1 en dur) | PASS |
| 3 | Numeros Google Places valides via normalizePhoneFR | PASS |
| 4 | Deduplication prospect par phone_normalized | PASS |
| 5 | Inference metiers couvre cas NAF partages | PASS |
| 6 | tsc --noEmit passe (src/) | PASS |
| 7 | npm run build passe | PASS |

## Test Results

- TypeScript: 0 erreurs src/ (2 pre-existantes e2e/)
- Build: propre
- Unit tests: 62/62 pass

## Findings

1. **Minor** — Dead code: keyword `pedicur` duplique entre Podologue (L120) et Pedicure-podologue (L137), la seconde entree est unreachable. Couvert par le fallback requestedLabel.
2. **Minor** — page_offset accepte sans validation Zod (pattern pre-existant, pas de regression).
3. **Minor** — Frontend n'envoie pas page_offset (marque optionnel dans le plan).
4. **Minor** — Keyword `conseil` potentiellement trop large, mitige par l'ordre de priorite.

## Pre-existing (non-blocking)

- GET /api/prospects manque filtre user_id (pas introduit par cette story).

Max severity: minor
Ship allowed: yes
