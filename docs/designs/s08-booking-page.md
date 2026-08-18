# Design: s08-booking-page

**Story:** docs/stories/s08-booking-page/story.md  
**Research:** docs/research/s08-booking-page.md  
**Design system:** docs/design-system.md

---

## Scope

Cette story s08 a un boilerplate **déjà complet** (commit a64f7f3, 12 août 2026) :
- Page publique `/booking/[slug]` existe (606 lignes UI fonctionnelle)
- 3 API routes opérationnelles
- Migrations DB complètes

**Design nécessaire uniquement pour** :
- Page Settings Booking (`/settings/booking`) — actuellement placeholder 4 lignes
- Écrans d'erreur manquants (token refresh fail, email fail)

La page publique `/booking/[slug]` n'a PAS besoin de redesign (déjà conforme PSG Cosmos selon research).

---

## Screen 1: Settings Booking Page

### Context
- URL: `/dashboard/settings/booking`
- Layout: Dashboard avec sidebar PSG Cosmos
- User: CGP connecté
- Goal: Configurer slug public, durée RDV, plages horaires, voir historique bookings

### Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ PARAMÈTRES RÉSERVATION                                          │ ← H1 (Oswald 22px textHi)
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 🔗 Lien Public                                   [surface1 card] │
│                                                                   │
│ Votre lien de prise de RDV :                    (textMid 10px)  │
│ ┌─────────────────────────────────────────────┐                 │
│ │ https://tedscale.com/booking/ted-leroux     │ (surface2 input)│
│ └─────────────────────────────────────────────┘                 │
│                                                                   │
│ [📋 Copier le lien]                             (cyan button)   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ⏱️ Durée des rendez-vous                        [surface1 card] │
│                                                                   │
│ Durée par défaut :                               (textMid 10px) │
│ ┌──────────┐                                                     │
│ │ 30       │ minutes                             (surface2 input)│
│ └──────────┘                                                     │
│                                                                   │
│ Durées disponibles :                             (textMid 10px) │
│ [x] 15 min  [x] 30 min  [x] 45 min  [x] 60 min  (checkboxes)   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 📅 Plages horaires                               [surface1 card]│
│                                                                   │
│ Jours actifs :                                   (textMid 10px) │
│ [x] Lun  [x] Mar  [x] Mer  [x] Jeu  [x] Ven  [ ] Sam  [ ] Dim  │
│                                                                   │
│ Horaires :                                       (textMid 10px) │
│ Début : ┌──────┐   Fin : ┌──────┐               (surface2)     │
│         │ 09:00│         │ 18:00│                               │
│         └──────┘         └──────┘                               │
│                                                                   │
│ Pause déjeuner :                                 (textMid 10px) │
│ [x] Bloquer 12h-14h                              (checkbox)     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 📊 Historique                                    [surface1 card]│
│                                                                   │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ 18 août 2026, 14h30  │ Jean Dupont           │ Confirmé   │   │
│ │ +33 6 12 34 56 78    │ jean@example.com      │ [Annuler]  │   │
│ ├───────────────────────────────────────────────────────────┤   │
│ │ 20 août 2026, 10h00  │ Marie Martin          │ Confirmé   │   │
│ │ +33 6 98 76 54 32    │ marie@example.com     │ [Annuler]  │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│ [Voir tous les rendez-vous →]                   (indigo link)   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ [Enregistrer les modifications]                 (cyan button)   │
└─────────────────────────────────────────────────────────────────┘
```

### Components

#### 1. Public Link Card
- **Container**: `background: C.surface1`, `border: 1px solid C.line`, `borderRadius: 12px`, `padding: 20px`
- **Icon**: 🔗 (emoji, 20px)
- **Title**: "Lien Public" (Oswald 14px, textHi, fontWeight 600)
- **Label**: "Votre lien de prise de RDV :" (Inter 10px, textMid)
- **Input readonly**: `background: C.surface2`, `color: C.text`, `padding: 12px`, `borderRadius: 6px`, `fontFamily: 'JetBrains Mono'`, `fontSize: 10px`
- **Button "Copier"**: `background: C.cyan`, `color: white`, `padding: 8px 16px`, `borderRadius: 6px`, `fontSize: 10px`, `fontWeight: 600`, `cursor: pointer`
- **Toast on copy**: "Lien copié !" (toast vert)

#### 2. Duration Card
- **Container**: Same as Public Link Card
- **Icon**: ⏱️
- **Title**: "Durée des rendez-vous"
- **Input number**: `background: C.surface2`, `width: 80px`, `padding: 8px 12px`, `borderRadius: 6px`, `fontSize: 11px`, `color: C.text`
- **Checkboxes**: Custom checkbox avec `background: C.surface2` unchecked, `background: C.cyan` checked, `borderRadius: 4px`, `width: 16px`, `height: 16px`

#### 3. Time Slots Card
- **Container**: Same
- **Icon**: 📅
- **Day toggles**: Inline checkboxes (même style que Duration)
- **Time inputs**: Type "time", `background: C.surface2`, `padding: 8px 12px`, `borderRadius: 6px`, `fontSize: 11px`, `color: C.text`
- **Lunch break toggle**: Checkbox + label "Bloquer 12h-14h"

#### 4. History Card
- **Container**: Same
- **Icon**: 📊
- **Table**: 
  - Header: "Date/Heure | Contact | Status | Action" (JetBrains Mono 8px, textLo, uppercase, letterSpacing 1px)
  - Rows: `background: C.surface2`, `padding: 12px`, `borderRadius: 6px`, `marginBottom: 8px`
  - Date: JetBrains Mono 10px, textHi
  - Contact name: Inter 11px, textHi
  - Email/Phone: Inter 9px, textMid
  - Status badge: `background: C.green` si Confirmé, `background: C.warn` si Pending, `color: white`, `padding: 4px 8px`, `borderRadius: 4px`, `fontSize: 8px`, `fontWeight: 600`
  - Button "Annuler": `color: C.magenta`, `fontSize: 9px`, `textDecoration: underline`, `cursor: pointer`

#### 5. Save Button
- **Style**: `background: C.cyan`, `color: white`, `padding: 12px 24px`, `borderRadius: 8px`, `fontSize: 12px`, `fontWeight: 600`, `fontFamily: 'Oswald'`, `letterSpacing: 0.05em`, `cursor: pointer`, `width: 100%`
- **Hover**: `background: lighten(C.cyan, 10%)`
- **Loading**: Spinner cyan + text "Enregistrement..."

---

## Screen 2: Error State — Token Refresh Fail

### Context
- Trigger: Google Calendar token expired et refresh échoue (401, invalid_grant)
- Location: `/booking/[slug]` (page publique) ou `/dashboard/settings/booking`
- Goal: Informer le CGP qu'il doit réauthoriser Google Calendar

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                   │
│                          ⚠️                                       │
│                                                                   │
│          Connexion Google Calendar expirée                       │
│                                                                   │
│   Vos créneaux ne peuvent plus être synchronisés.               │
│   Reconnectez votre compte Google pour activer                  │
│   les réservations.                                              │
│                                                                   │
│   [🔗 Reconnecter Google Calendar]                              │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Components

- **Container**: `background: C.surface1`, `border: 1px solid C.warn`, `borderRadius: 12px`, `padding: 40px`, `textAlign: center`, `maxWidth: 500px`, `margin: 0 auto`
- **Icon**: ⚠️ (48px, color: C.warn)
- **Title**: "Connexion Google Calendar expirée" (Oswald 16px, textHi, fontWeight 600)
- **Body**: Message explicatif (Inter 10px, textMid, lineHeight 1.6)
- **Button**: `background: C.indigo`, `color: white`, `padding: 12px 24px`, `borderRadius: 8px`, `fontSize: 11px`, `fontWeight: 600`, `cursor: pointer`
- **Action**: Redirect vers `/api/auth/google-calendar` (OAuth flow)

---

## Screen 3: Error State — Email Send Fail

### Context
- Trigger: Brevo API fail après création booking (rate limit, API key invalid, network error)
- Location: `/booking/[slug]` après submit formulaire
- Goal: Informer prospect que RDV est créé mais email échouera

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                   │
│                          ✅                                       │
│                                                                   │
│            Rendez-vous confirmé                                  │
│                                                                   │
│   Votre rendez-vous est bien enregistré pour le :               │
│   18 août 2026 à 14h30                                           │
│                                                                   │
│   ⚠️ L'email de confirmation n'a pas pu être envoyé.            │
│   Vous recevrez un rappel SMS 24h avant le RDV.                 │
│                                                                   │
│   [Retour à l'accueil]                                           │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Components

- **Container**: Same as Screen 2
- **Icon success**: ✅ (48px, color: C.green)
- **Title**: "Rendez-vous confirmé" (Oswald 16px, textHi, fontWeight 600)
- **Date/time**: JetBrains Mono 14px, gold, fontWeight 600
- **Warning**: ⚠️ + message (Inter 9px, textMid, background: rgba(C.warn, 0.1), padding: 12px, borderRadius: 6px, marginTop: 16px)
- **Button**: `background: C.cyan`, `color: white`, `padding: 12px 24px`, `borderRadius: 8px`, `fontSize: 11px`, `fontWeight: 600`

---

## States

### Settings Booking Page

1. **Default** (chargement initial)
   - Skeleton loader pour chaque card (pulse animation)
   - Après fetch : affiche données réelles

2. **Edit mode** (user change un champ)
   - Bouton "Enregistrer" devient actif (cyan vif)
   - Champs modifiés ont border cyan

3. **Saving** (après clic Enregistrer)
   - Bouton devient disabled + spinner
   - Text: "Enregistrement..."

4. **Success** (après save)
   - Toast vert: "Paramètres enregistrés !"
   - Bouton redevient normal

5. **Error** (si save fail)
   - Toast rouge: "Erreur : [message]"
   - Bouton redevient normal

### Error Screens

1. **Token expired** (render immédiat si refresh fail)
2. **Email fail warning** (render après booking success mais email 500)

---

## Interactions

### Settings Page

| Action | Trigger | Result |
|--------|---------|--------|
| Copier lien | Clic bouton "Copier le lien" | Clipboard copy + toast "Lien copié !" |
| Modifier durée | Change input number | Champ devient cyan border |
| Toggle jour | Clic checkbox jour | Checkbox checked/unchecked |
| Modifier horaires | Change time inputs | Champs deviennent cyan border |
| Toggle pause déj | Clic checkbox "Bloquer 12h-14h" | Checkbox checked/unchecked |
| Enregistrer | Clic "Enregistrer les modifications" | PATCH `/api/settings` → toast success ou error |
| Annuler booking | Clic "Annuler" dans historique | Confirm modal → DELETE `/api/bookings/[id]` → row disparaît |
| Voir tous | Clic "Voir tous les rendez-vous" | Navigate `/dashboard/bookings` (nouvelle page, hors scope s08) |

### Error Screens

| Action | Trigger | Result |
|--------|---------|--------|
| Reconnecter | Clic "Reconnecter Google Calendar" | Redirect `/api/auth/google-calendar` |
| Retour accueil | Clic "Retour à l'accueil" | Redirect `/` |

---

## Design System Coverage

### Tokens utilisés

| Token | Usage |
|-------|-------|
| `C.bgDeep` | Body background |
| `C.surface1` | Cards container |
| `C.surface2` | Inputs, table rows |
| `C.line` | Card borders |
| `C.textHi` | Titres, labels importants |
| `C.text` | Corps de texte |
| `C.textMid` | Labels secondaires |
| `C.textLo` | Table headers |
| `C.cyan` | Primary buttons, active borders |
| `C.indigo` | Links, secondary buttons |
| `C.gold` | Date/time display (success screen) |
| `C.green` | Success badges, toast |
| `C.warn` | Warning icon, pending badges |
| `C.magenta` | Cancel button text |

### Components existants réutilisés

- **Toast** (sonner library, déjà installé)
- **Input** (pattern standard avec `C.surface2` background)
- **Button** (pattern Oswald + cyan background)
- **Checkbox** (custom avec `C.surface2` / `C.cyan`)
- **Card** (pattern `C.surface1` + `C.line` border)

### Typography

- **Headers**: Oswald 14-22px, 600 weight
- **Body**: Inter 9-11px
- **Data**: JetBrains Mono 10-14px (lien booking, date/time, table)

### Spacing

- Card padding: 20px
- Input padding: 8-12px
- Button padding: 8-24px (selon taille)
- Gap entre cards: 20px
- Gap entre éléments dans card: 12-16px

---

## Design System Gaps

**Aucun gap détecté.** Tous les composants nécessaires sont déjà dans le design system PSG Cosmos.

---

## Out of Scope

1. **Page publique `/booking/[slug]`** — déjà implémentée et conforme (606 lignes)
2. **API routes** — déjà opérationnelles
3. **Migrations DB** — déjà migrées
4. **Page `/dashboard/bookings`** (liste complète RDV) — future story
5. **Modification booking existant** — hors AC story s08
6. **Notifications SMS intégrées** — dépend de story s09

---

## Implementation Notes

### Settings Page Priority

Implémenter les sections dans cet ordre :
1. Public Link (lecture seule + copy button) — 30min
2. Duration (input + checkboxes) — 45min
3. Time Slots (jours + horaires + pause) — 1h
4. History (table avec 5 derniers bookings + cancel) — 1h30
5. Save logic (PATCH endpoint) — 45min

### Error Screens Priority

1. Token expired (critique) — 30min
2. Email fail warning (nice-to-have) — 20min

### Tests E2E Coverage

8 scénarios minimum (story AC) :
1. Settings: Affichage initial + données correctes
2. Settings: Copier lien → clipboard + toast
3. Settings: Modifier durée → save → verify
4. Settings: Toggle jours → save → verify
5. Settings: Modifier horaires → save → verify
6. Settings: Annuler booking → confirm → disparaît
7. Error: Token expired → affiche warning + reconnect button
8. Error: Email fail → affiche success avec warning SMS

---

**Design prêt pour implémentation.** Toutes les spécifications sont basées sur le design system PSG Cosmos existant.
