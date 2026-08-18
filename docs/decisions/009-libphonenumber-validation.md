# ADR-009: libphonenumber-js pour validation téléphone FR

## Status
Accepted

## Context
Le Dashboard manipule des numéros de téléphone dans 4 contextes : prospection TNS, nurturing, CRM, et booking page publique. Les numéros doivent être validés (format français), normalisés (+33), et identifiés (mobile vs fixe pour filtrer "portables uniquement").

## Decision
Utiliser **libphonenumber-js** (port JS de libphonenumber Google) pour validation et parsing téléphone.

## Options considered

| Option | Avantages | Inconvénients | Verdict |
|--------|-----------|---------------|---------|
| **libphonenumber-js (choisi)** | Métadonnées opérateurs FR, détection mobile/fixe, validation stricte, 142kb (ou 14kb version min) | Taille bundle (acceptable server-side) | Retenu |
| Regex custom `/^0[67]\d{8}$/` | Léger, rapide | Pas de normalisation internationale (+33), pas de détection mobile/fixe | Rejeté |
| google-libphonenumber (Java port) | Version officielle Google | Taille énorme (2MB), complexité Java-like API | Rejeté |

## Consequences
- **Installation** : `npm install libphonenumber-js`
- **Use cases** :
  1. **Validation booking form** : vérifier format avant création RDV
  2. **Filtre "portables uniquement"** : prospection TNS (06/07 only)
  3. **Normalisation** : `06 12 34 56 78` → `+33612345678` (stockage DB)
  4. **Affichage** : `+33612345678` → `06 12 34 56 78` (UI)

## Implementation notes
```typescript
// src/lib/phone.ts
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js'

export function normalizePhoneFr(raw: string): string | null {
  try {
    const parsed = parsePhoneNumber(raw, 'FR')
    if (!parsed || !parsed.isValid()) return null
    return parsed.format('E.164') // +33612345678
  } catch {
    return null
  }
}

export function isMobilePhoneFr(phone: string): boolean {
  try {
    const parsed = parsePhoneNumber(phone, 'FR')
    return parsed?.getType() === 'MOBILE'
  } catch {
    return false
  }
}

export function formatPhoneDisplay(e164: string): string {
  try {
    const parsed = parsePhoneNumber(e164)
    return parsed?.formatNational() || e164 // "06 12 34 56 78"
  } catch {
    return e164
  }
}

// Validation Zod
import { z } from 'zod'

const phoneSchema = z.string().refine(
  (val) => isValidPhoneNumber(val, 'FR'),
  { message: 'Numéro de téléphone français invalide' }
)
```

**Exemples formats acceptés** :
- `0612345678` → valide, normalisé `+33612345678`
- `06 12 34 56 78` → valide
- `+33 6 12 34 56 78` → valide
- `06.12.34.56.78` → valide
- `+33612345678` → valide

**Détection mobile** : `06`, `07` = mobile, `01-05`, `09` = fixe
