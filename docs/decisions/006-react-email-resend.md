# ADR-006: react-email + resend pour emails transactionnels

## Status
Accepted

## Context
Le Dashboard a besoin d'envoyer des emails transactionnels : confirmations de RDV, rappels, séquences nurturing. Brevo API est déjà utilisé pour SMS mais pas email. Il faut un système d'email avec templates React et delivery fiable.

## Decision
Utiliser **react-email** pour les templates email (composants React) et **resend** pour la delivery (alternative moderne à Brevo/SendGrid).

## Options considered

| Option | Avantages | Inconvénients | Verdict |
|--------|-----------|---------------|---------|
| **react-email + resend (choisi)** | Templates React (DX excellent), Resend gratuit 3k emails/mois, délivrabilité top | Package @react-email deprecated (mais fonctionne) | Retenu |
| Brevo (existant) + custom HTML | Brevo déjà configuré (SMS), API unifiée | Templates HTML string (maintenance difficile), prix élevé (300 emails/jour free) | Rejeté partiellement |
| SendGrid + Handlebars | Industry standard | Setup complexe, templates Handlebars verbeux | Rejeté |
| Nodemailer + HTML | Gratuit, contrôle total | Pas de templates, délivrabilité faible (spam risk) | Rejeté |

## Consequences
- **Installation** : `npm install react-email resend @react-email/components`
- **Templates** : `src/emails/` (composants React)
- **Delivery** : Resend API key (gratuit 3000 emails/mois)
- **Fallback** : Garder Brevo pour SMS (existant) et email de secours
- **Use cases** :
  - Confirmation booking RDV (story s08)
  - Rappels RDV par email (story s09 fallback SMS)
  - Séquences nurturing email (story s05)
  - Welcome email (futur)

## Implementation notes
```typescript
// src/emails/ConfirmationRDV.tsx
import { Html, Head, Body, Container, Text, Button } from '@react-email/components'

export function ConfirmationRDV({ prenom, date, heure }: Props) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'Arial, sans-serif' }}>
        <Container>
          <Text>Bonjour {prenom},</Text>
          <Text>Votre rendez-vous est confirmé le {date} à {heure}.</Text>
          <Button href="https://calendar.google.com/...">Ajouter au calendrier</Button>
        </Container>
      </Body>
    </Html>
  )
}

// API route usage
import { Resend } from 'resend'
import { ConfirmationRDV } from '@/emails/ConfirmationRDV'

const resend = new Resend(process.env.RESEND_API_KEY)

await resend.emails.send({
  from: 'Ted CGP <noreply@tedcgp.fr>',
  to: prospect.email,
  subject: 'Confirmation RDV',
  react: ConfirmationRDV({ prenom, date, heure }),
})
```

**Note** : @react-email/components est deprecated mais reste fonctionnel. Alternative future : migrer vers `@react-email/render` + composants custom si maintenance s'arrête.
