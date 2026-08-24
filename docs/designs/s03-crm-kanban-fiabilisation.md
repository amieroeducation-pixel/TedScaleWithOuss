# Design: s03-crm-kanban-fiabilisation

**Story**: docs/stories/s03-crm-kanban-fiabilisation/story.md  
**Date**: 2026-08-17  
**Design system**: docs/design-system.md (PSG Cosmos Champions)

---

## Overview

Cette story améliore le CRM Kanban existant (`/dashboard/crm`) avec 3 nouveaux composants UI :

1. **ProspectDeleteDialog** — Modal de confirmation avant suppression
2. **InteractionTimeline** — Affichage chronologique des interactions dans la fiche prospect
3. **AddInteractionModal** — Formulaire d'ajout d'interaction (note, call, meeting)

**Contraintes** :
- Le layout Kanban existant est conservé (colonnes drag-and-drop)
- ProspectDetailModal existant est enrichi (pas remplacé)
- Design system PSG Cosmos respecté à 100%

---

## Screen 1: ProspectDeleteDialog

### Context
Modal de confirmation qui s'ouvre quand l'utilisateur clique sur le bouton "Supprimer" dans ProspectDetailModal.

### Layout
- **Container**: Dialog modal Radix UI
- **Overlay**: rgba(10, 14, 34, 0.85) avec backdrop-blur
- **Content**: 
  - Width: 460px
  - Background: C.surface1
  - Border: 1px solid C.line
  - BorderRadius: 12px
  - Padding: 20px

### Elements

**Header** :
- Icon: 🗑️ (fontSize 24px, marginRight 8px)
- Title: "Supprimer ce prospect ?" (fontSize 14px, Oswald 600, textHi)

**Body** :
- Prospect name: "[Nom Complet]" (fontSize 13px, gold, bold)
- Warning text: "Cette action est irréversible. Toutes les interactions associées seront également supprimées." (fontSize 10px, textMid, marginTop 8px)
- Interaction count: "X interactions seront supprimées" (fontSize 9px, warn, marginTop 6px)

**Actions** :
- Button "Annuler" (secondary style, left)
  - Background: C.surface2
  - Color: C.textMid
  - Border: 1px solid C.line
  - Padding: 8px 16px
  - BorderRadius: 6px
  - FontSize: 10px
  - Cursor: pointer
- Button "Supprimer définitivement" (danger style, right)
  - Background: C.magenta
  - Color: C.textHi
  - Border: 1px solid C.cyan
  - Padding: 8px 16px
  - BorderRadius: 6px
  - FontSize: 10px
  - FontWeight: 700
  - Cursor: pointer

### States

**Default** :
- Buttons enabled
- Focus trap actif

**Loading** (API call en cours) :
- "Supprimer" button disabled + spinner ⏳
- "Annuler" button disabled
- Overlay non-cliquable

**Error** :
- Toast error (sonner) : "Impossible de supprimer : [raison]"
- Buttons re-enabled

**Success** :
- Modal se ferme
- Toast success : "Prospect supprimé"
- Retour à la liste CRM (prospect disparu)

---

## Screen 2: InteractionTimeline (dans ProspectDetailModal)

### Context
Section ajoutée dans ProspectDetailModal, après les sections Contact/Stage/Tags existantes.

### Layout
- **Container**: Section dans le modal (bordure top séparatrice)
- **Padding**: 16px 20px
- **BorderTop**: 1px solid C.line
- **MaxHeight**: 300px (scrollable si > 10 interactions)

### Elements

**Header** :
- Label: "HISTORIQUE INTERACTIONS" (fontSize 9px, JetBrains Mono, textLo, uppercase, letterSpacing 1px, marginBottom 12px)
- Count badge: "(X)" (fontSize 8px, gold, marginLeft 4px)

**Timeline Items** (foreach interaction) :
- Container:
  - Display: flex
  - Gap: 10px
  - MarginBottom: 10px
  - Position: relative
- Icon (left):
  - Width: 24px
  - Type-based emoji:
    - appel: 📞
    - rdv1/rdv2/rdv3: 📅
    - email: ✉️
    - whatsapp: 💬
    - linkedin: 💼
    - autre: 📝
  - Background: C.surface2
  - BorderRadius: 50%
  - Padding: 4px
- Content (right):
  - Type label: "Appel" | "RDV" | "Email" | "Note" (fontSize 10px, textHi, fontWeight 600)
  - Date/Time: "12 août 2026, 14h30" (fontSize 9px, textLo, JetBrains Mono)
  - Notes (if present): texte multi-lignes (fontSize 9px, textMid, marginTop 4px, italic)
  - Duration (if present): "Durée: 30min" (fontSize 8px, gold, marginTop 2px)
- Timeline line (between items):
  - Position: absolute
  - Left: 12px (center of icon)
  - Height: 100%
  - Width: 1px
  - Background: C.lineSoft
  - Top: 24px (below first icon)

**Empty state** :
- Icon: 📭 (fontSize 24px, centered)
- Message: "Aucune interaction enregistrée" (fontSize 10px, textLo, centered)

**Action button** (bottom) :
- "➕ Ajouter une interaction" (fontSize 9px, Oswald 600, cyan, background surface2, border cyan, padding 6px 12px, borderRadius 6px, cursor pointer)

### States

**Loading** :
- Skeleton: 3 blocs animés (background surface2 pulse)

**Error** :
- Message inline: "Erreur chargement historique" (fontSize 9px, warn)
- Retry button

**Loaded** :
- Liste affichée (scrollable si > 10)
- Bouton "Ajouter" visible

---

## Screen 3: AddInteractionModal

### Context
Modal qui s'ouvre quand l'utilisateur clique sur "➕ Ajouter une interaction" depuis ProspectDetailModal ou depuis la timeline.

### Layout
- **Container**: Dialog modal Radix UI
- **Overlay**: rgba(10, 14, 34, 0.85) avec backdrop-blur
- **Content**:
  - Width: 520px
  - Background: C.surface1
  - Border: 1px solid C.line
  - BorderRadius: 12px
  - Padding: 20px

### Elements

**Header** :
- Icon: ➕ (fontSize 18px, marginRight 6px)
- Title: "Ajouter une interaction" (fontSize 14px, Oswald 600, textHi)
- Close button: ✕ (top-right, fontSize 18px, textLo, hover textHi, cursor pointer)

**Form** :

1. **Type selector** (required):
   - Label: "Type" (fontSize 8px, JetBrains Mono, textLo, display block, marginBottom 4px)
   - 3 quick buttons (horizontal):
     - "📝 Note" (default selected)
     - "📞 Appel"
     - "📅 Rendez-vous"
   - Style:
     - Padding: 8px 12px
     - Background: selected ? `${C.cyan}15` : C.surface2
     - Border: selected ? `1px solid ${C.cyan}` : `1px solid ${C.line}`
     - Color: selected ? C.cyan : C.textMid
     - BorderRadius: 6px
     - FontSize: 10px
     - FontWeight: 600
     - Cursor: pointer
   - Advanced toggle: "Autres types..." (fontSize 8px, textLo, marginTop 6px, cursor pointer) → reveals dropdown avec tous les types API

2. **Date/Time** (required):
   - Label: "Date et heure" (fontSize 8px, JetBrains Mono, textLo)
   - Input: datetime-local
     - Width: 100%
     - Background: C.surface2
     - Border: 1px solid C.line
     - BorderRadius: 5px
     - Padding: 6px 8px
     - Color: C.text
     - FontSize: 10px
     - FontFamily: JetBrains Mono
   - Default value: now()

3. **Duration** (optional, visible si type = Appel ou RDV):
   - Label: "Durée (minutes)" (fontSize 8px, JetBrains Mono, textLo)
   - Input: number
     - Width: 100px
     - Background: C.surface2
     - Border: 1px solid C.line
     - BorderRadius: 5px
     - Padding: 6px 8px
     - Color: C.gold
     - FontSize: 11px
     - FontWeight: 600
     - TextAlign: center
     - FontFamily: JetBrains Mono
   - Placeholder: "30"

4. **Notes** (optional):
   - Label: "Notes" (fontSize 8px, JetBrains Mono, textLo)
   - Textarea:
     - Width: 100%
     - MinHeight: 80px
     - Background: C.surface2
     - Border: 1px solid C.line
     - BorderRadius: 5px
     - Padding: 8px
     - Color: C.text
     - FontSize: 10px
     - FontFamily: Inter
     - Resize: vertical
   - Placeholder: "Détails de l'échange, points abordés, prochaines actions..."

**Actions** :
- Button "Annuler" (secondary, left):
  - Same style as ProspectDeleteDialog cancel button
- Button "Enregistrer" (success, right):
  - Background: `${C.green}15`
  - Color: C.green
  - Border: 1px solid C.green
  - Padding: 8px 20px
  - BorderRadius: 6px
  - FontSize: 10px
  - FontWeight: 700
  - Cursor: pointer
  - Disabled if type not selected

### States

**Default** :
- Type "Note" pré-sélectionné
- Date/Time = now()
- Focus sur textarea notes

**Loading** (saving) :
- "Enregistrer" button disabled + spinner ⏳
- Form inputs disabled

**Validation errors** :
- Type non sélectionné: border input red + message "Sélectionnez un type"
- Date future si type = Appel passé: warning "Date dans le futur ?"

**Success** :
- Modal se ferme
- Toast success: "Interaction ajoutée"
- Timeline rafraîchie dans ProspectDetailModal
- Prospect.last_contact_at updated

**Error** :
- Toast error: "Impossible d'enregistrer : [raison]"
- Form reste ouvert, inputs enabled

---

## Integration dans ProspectDetailModal

### Modifications existantes

**Structure actuelle** (crm/page.tsx lignes 441-735) :
1. Header (nom, profession, avatar)
2. Edit form (if editing)
3. Contact section
4. Stage section
5. Next action section
6. Tags section
7. Pressure level section
8. Sequences section

**Nouvelle structure** :
1-8. (inchangé)
9. **Historique interactions** (InteractionTimeline) — AJOUT
10. **Actions footer** — MODIFIÉ
    - Bouton "🗑️ Supprimer" ajouté (opens ProspectDeleteDialog)
    - Position: absolute bottom 20px left 20px

### Layout ajustements

**Modal height** :
- MaxHeight: 85vh → 90vh (plus de contenu)
- OverflowY: auto (scrollable)

**Scroll behavior** :
- Timeline section scrollable indépendamment (maxHeight 300px)
- Reste du modal scrollable aussi

**Responsive** (mobile) :
- Width: 100% (full screen on mobile)
- Padding: 16px (reduced)
- Timeline maxHeight: 200px

---

## Component reuse & patterns

### From design system

**Used** :
- Dialog (Radix UI) — overlay + content pattern
- Buttons — Primary, Secondary, Danger, Success variants
- Inputs — Text, Number, Textarea, Datetime-local
- Timeline — custom component (nouveau pattern)
- Toast (sonner) — Success, Error feedback
- Loading state — spinner + disabled

**Typography** :
- Headers: Oswald 600
- Body: Inter 400
- Labels: JetBrains Mono uppercase
- Metrics: JetBrains Mono 600

**Colors** :
- Backgrounds: surface1 (modals), surface2 (inputs)
- Accents: cyan (CTA), gold (data), green (success), magenta (danger), warn (warnings)
- Text: textHi (titres), text (body), textMid (secondary), textLo (labels)

**Spacing** :
- Modal padding: 20px
- Input padding: 6-8px
- Button padding: 8px 16px
- Section gaps: 12-16px
- Timeline item gaps: 10px

---

## Design system gaps

Aucun gap détecté. Tous les patterns nécessaires sont couverts par le design system existant :
- Modal structure (Dialog Radix)
- Form inputs (Text, Number, Textarea, Datetime)
- Button variants (Success, Danger)
- Timeline pattern (peut être construit avec les tokens existants)

---

## Out of scope

**Non inclus dans cette story** :
- Edition inline des interactions existantes (AC #2 concerne prospects uniquement)
- Suppression d'une interaction individuelle (pas dans AC)
- Filtrage de la timeline par type (nice-to-have)
- Export de la timeline en PDF/CSV (feature future)
- Notifications lors d'ajout d'interaction (pas demandé)

---

## Files reference

**Mockup**: docs/designs/s03-crm-kanban-fiabilisation.html  
**Research**: docs/research/s03-crm-kanban-fiabilisation.md  
**Story**: docs/stories/s03-crm-kanban-fiabilisation/story.md  
**Design system**: docs/design-system.md

---

**Version**: 1.0  
**Created**: 2026-08-17  
**Status**: Ready for planning
