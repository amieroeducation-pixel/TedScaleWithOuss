# Design System — PSG Cosmos Champions

Dashboard CGP premium dark/gold — inspiré identité Paris Saint-Germain

---

## Vision

Interface professionnelle dark premium avec accents gold et gradient ribbon PSG. Typographie sportive (Oswald headers) + technique (JetBrains Mono data). Navigation latérale avec sections groupées. Feedback immédiat (toasts, confetti, badges).

**Cible** : CGP qui veut un outil puissant mais visuellement inspirant — like a champion's dashboard.

---

## Design Tokens

### Colors

```typescript
// src/lib/theme.ts
export const C = {
  // Backgrounds
  bgDeep: '#0a0e22',    // Fond principal ultra dark
  bgMid: '#14193d',     // Fond intermédiaire
  
  // Surfaces
  surface1: '#11163a',  // Cartes niveau 1
  surface2: '#1a2150',  // Cartes niveau 2 (inputs, modals)
  surface3: '#252e68',  // Cartes niveau 3 (hover states)
  
  // Lines
  line: '#3a4690',      // Bordures visibles
  lineSoft: '#1a2150',  // Bordures subtiles
  
  // Text
  textHi: '#ffffff',    // Titres principaux
  text: '#d8e1ff',      // Corps de texte
  textMid: '#8ea0d9',   // Texte secondaire
  textLo: '#5a6ba8',    // Labels, hints
  textVlo: '#3a4885',   // Texte désactivé
  
  // Accent Colors
  cyan: '#ff6470',      // Rose PSG (actions primaires)
  indigo: '#7a92e8',    // Bleu PSG (liens, info)
  magenta: '#c84048',   // Rouge PSG (warnings)
  lime: '#f5e8c8',      // Beige/crème PSG
  gold: '#e8c878',      // Or (metrics, success, premium)
  warn: '#d8884a',      // Orange (alerts modérées)
  green: '#4ade80',     // Vert (success confirmé)
  purple: '#b07aee',    // Violet (bonus, achievements)
  
  // Gradient
  ribbon: 'linear-gradient(90deg, #c84048 0%, #ff6470 25%, #f5e8c8 55%, #7a92e8 80%, #5c70b8 100%)'
  // Utilisé : header sections, top borders cartes importantes
}
```

**Usage guidelines** :
- **bgDeep** : body background
- **surface1-3** : cartes empilées (1 = base, 2 = hover/focus, 3 = active/pressed)
- **text hierarchy** : textHi titres → text corps → textMid labels → textLo hints
- **gold** : métriques KPI, badges premium, success states
- **cyan/indigo** : CTA buttons, liens
- **green** : confirmations (toast success, validation)
- **ribbon** : top border 1px sur SectionPanel, header separators

---

### Typography

**Fonts** :
```css
font-family: 'Oswald', sans-serif;          /* Headers, titres sections, boutons CTA */
font-family: 'Inter', sans-serif;           /* Corps de texte, paragraphes */
font-family: 'JetBrains Mono', monospace;   /* Données, metrics, code, labels techniques */
```

**Scale** :
- **Headers** : 
  - H1 (page title): 22-26px, Oswald, bold, textHi
  - H2 (section): 14-18px, Oswald, 600, gold ou textHi
  - H3 (card title): 12-14px, Oswald, 600, textHi
- **Body** : 
  - Primary: 10-11px, Inter, 400, text
  - Secondary: 9px, Inter, 400, textMid
  - Small: 8px, Inter ou JetBrains Mono, 400, textLo
- **Data/Metrics** : 
  - Large: 24-32px, Oswald, 700, gold
  - Medium: 16-20px, JetBrains Mono, 600, text
  - Small: 10-12px, JetBrains Mono, 500, textMid

**Letter-spacing** :
- Oswald headers : `0.05em` - `0.12em` (uppercase tracking)
- JetBrains Mono : `0em` (monospace standard)

---

### Spacing

**Base unit** : 4px

**Scale** :
- 2px : fine separators
- 4px : tight padding (badges, chips)
- 6px : compact padding (small buttons)
- 8px : standard padding (inputs, cards internal)
- 10px : comfortable padding (card content)
- 12px : section padding
- 14px : panel padding
- 16px : modal padding
- 20px : large gap
- 24px : section spacing

**Gaps** (flex/grid) :
- xs: 4px
- sm: 6px
- md: 8px
- lg: 12px
- xl: 16px

---

### Border Radius

- **Micro** : 2-3px (badges, chips, tags)
- **Small** : 4-6px (buttons, inputs, small cards)
- **Medium** : 8-10px (panels, modals, large cards)
- **Large** : 12-16px (hero sections, main containers)
- **XL** : 20-24px (full-screen modals, special containers)
- **Circle** : 50% (avatars, dots, indicators)

**Pattern** : plus l'élément est large, plus le radius augmente (consistency visuelle)

---

### Shadows & Elevation

**Aucune shadow utilisée** — design flat premium avec borders uniquement.

**Elevation via borders** :
- Level 0 : no border
- Level 1 : `1px solid ${C.lineSoft}`
- Level 2 : `1px solid ${C.line}`
- Level 3 : `2px solid ${C.line}` ou ribbon gradient top border

---

## Components Inventory

### Navigation

**Sidebar** (`layout.tsx`) :
- Fixed left 240px → 60px (collapsed)
- 5 sections groupées : Principal, Clients, Acquisition, Outils, Pilotage
- Badge dynamique (achievements recent count)
- Active state : background surface2 + border-left cyan 3px
- Hover : background surface1 + transition 0.12s

**Search** :
- Global search input (placeholder "Rechercher...")
- Icon : 🔍
- Shortcut hint : "⌘K"

---

### Buttons

**Primary CTA** :
```typescript
{
  padding: '8px 16px',
  background: `linear-gradient(90deg, ${C.indigo}, ${C.cyan})`,
  color: C.bgDeep,
  borderRadius: 6,
  fontSize: 10,
  fontWeight: 600,
  fontFamily: 'Oswald,sans-serif',
  letterSpacing: '0.05em',
  cursor: 'pointer',
  border: 'none',
}
```

**Secondary** :
```typescript
{
  padding: '6px 12px',
  background: C.surface2,
  color: C.text,
  border: `1px solid ${C.line}`,
  borderRadius: 6,
  fontSize: 9,
  fontWeight: 600,
  fontFamily: 'Oswald,sans-serif',
}
```

**Danger** :
```typescript
{
  background: C.magenta,
  color: C.textHi,
  border: `1px solid ${C.cyan}`,
}
```

**Success** :
```typescript
{
  background: '#0d1a0d',
  color: C.green,
  border: `1px solid ${C.green}`,
}
```

**Icon-only** :
- 32x32px ou 24x24px
- Emoji ou SVG icon
- Hover : background surface2

---

### Inputs

**Text Input** :
```typescript
{
  width: '100%',
  padding: '6px 8px',
  background: C.surface2,
  border: `1px solid ${C.line}`,
  borderRadius: 5,
  color: C.text,
  fontSize: 10,
  fontFamily: 'Inter,sans-serif',
  boxSizing: 'border-box',
}
// Focus : border color cyan
```

**Number Input** :
```typescript
{
  width: 70,
  padding: '6px 8px',
  background: C.surface2,
  border: `1px solid ${C.line}`,
  borderRadius: 5,
  color: C.gold,
  fontSize: 13,
  fontWeight: 600,
  textAlign: 'center',
  fontFamily: 'JetBrains Mono,monospace',
}
```

**Textarea** :
- `minHeight: 120`
- `resize: 'vertical'`
- Même style que text input

**Toggle** (`settings/shared.tsx`) :
- Width: 48px, Height: 24px
- Off : background textVlo
- On : background green
- Pill shape : `borderRadius: 24`
- Handle : 18x18 white circle

---

### Cards

**SectionPanel** (`settings/shared.tsx`) :
```typescript
{
  background: `linear-gradient(180deg, ${C.surface1}, ${C.bgMid})`,
  border: `1px solid ${C.line}`,
  borderRadius: 10,
  padding: 14,
  marginBottom: 12,
  position: 'relative',
  overflow: 'hidden',
}
// Top accent : 1px ribbon gradient
// Title : 11px Oswald 600 gold uppercase letterSpacing 0.12em
```

**ProspectCard** (`components/prospects/ProspectCard.tsx`) :
- Background surface1
- Border lineSoft
- Hover : border line + background surface2
- Drag : cursor grab
- Badge : top-right absolute, gold/cyan/green selon status

---

### Modals

**Dialog** (@radix-ui/react-dialog) :
- Overlay : rgba(10, 14, 34, 0.85) backdrop-blur
- Content : 
  - background surface1
  - border line
  - borderRadius 12
  - padding 20
  - maxWidth 600px
- Header : 
  - fontSize 14, Oswald 600, textHi
  - marginBottom 16
- Close button : top-right, emoji ❌

---

### Feedback

**Toast** (sonner) :
- Success : green background + checkmark ✅
- Error : magenta background + cross ❌
- Info : indigo background + info ℹ️
- Position : top-right
- Duration : 3000ms

**Confetti** (`achievements/AchievementsProvider.tsx`) :
- Trigger : achievements unlocked
- Colors : gold, cyan, green, indigo, warn
- Animation : fall + rotate 720deg
- Duration : 4s

**Loading State** :
- Spinner emoji : ⏳
- Text : "Chargement..." (textMid, JetBrains Mono 9px)
- Skeleton : background surface2 animate pulse

**Empty State** :
- Icon emoji : 📭
- Message : "Aucun élément" (textLo)
- CTA button si action possible

---

### Data Display

**Metric Card** :
```typescript
{
  background: C.surface1,
  border: `1px solid ${C.lineSoft}`,
  borderRadius: 8,
  padding: 12,
}
// Label : 8-10px JetBrains Mono uppercase textLo
// Value : 24-32px Oswald 700 gold
// Delta : 10px Inter textMid with △/▽ indicator
```

**Table** :
- No borders (clean)
- Row hover : background surface1
- Header : 
  - fontSize 8, JetBrains Mono uppercase, textLo
  - borderBottom 1px lineSoft
  - padding 8px 12px
- Cell : 
  - fontSize 10, Inter, text
  - padding 10px 12px

**Badge** :
```typescript
{
  padding: '2px 6px',
  background: C.surface2,
  color: C.gold,
  borderRadius: 3,
  fontSize: 8,
  fontWeight: 600,
  fontFamily: 'JetBrains Mono,monospace',
  border: `1px solid ${C.line}`,
}
// Variants : gold, cyan, green, warn selon status
```

---

### Kanban (dnd-kit)

**Column** :
```typescript
{
  background: C.bgMid,
  border: `1px solid ${C.lineSoft}`,
  borderRadius: 8,
  padding: 12,
  minHeight: 400,
}
// Header : stage name + count badge
// Gap : 8px entre cards
```

**Card Dragging** :
- `cursor: 'grab'`
- Active : `cursor: 'grabbing'` + `opacity: 0.5`
- Overlay : card clone avec shadow

---

## UI Patterns

### Forms

**Pattern standard** :
1. Label (8px JetBrains Mono textLo)
2. Input (see Inputs section)
3. Error message (8px Inter red below input)
4. Helper text (8px Inter textLo italic)

**Inline editing** :
- Display mode : text + edit icon (✏️)
- Edit mode : input inline + save/cancel buttons
- Optimistic update + rollback si erreur

**Validation** :
- Real-time (on blur ou on change)
- Error : border red + message
- Success : border green (optional)

---

### States

**Loading** :
- Button : disabled + spinner ⏳
- Section : skeleton (background surface2 pulse)
- Full page : centered spinner + "Chargement..."

**Empty** :
- Icon emoji centered
- Message textLo
- CTA si action possible

**Error** :
- Toast error
- Inline message (red text)
- Retry button si applicable

**Success** :
- Toast success ✅
- Confetti si achievement
- Badge/indicator updated

---

### Animations

**Transitions** :
- Standard : `0.12s ease` (hover, focus)
- Smooth : `0.25s ease` (sidebar toggle, modal open)
- Fast : `0.08s ease` (button press)

**Keyframes** :
- `confetti-fall` : translateY(100vh) + rotate(720deg) + opacity 0
- `pulse` : opacity 0.5 → 1 → 0.5 (loading skeletons)
- `slide-in` : translateX(-100%) → 0 (sidebar, modals)

**No animations** :
- Drag-drop (handled by dnd-kit)
- Scroll (native smooth)

---

## Do's

✅ **Utiliser inline CSS** via `C` object (pas de Tailwind, pas de CSS modules)  
✅ **Typography hierarchy** : Oswald headers → Inter body → JetBrains Mono data  
✅ **Gold pour metrics** premium (CA, closing %, achievements)  
✅ **Ribbon gradient** top border sur sections importantes  
✅ **Feedback immédiat** (toast, confetti, optimistic updates)  
✅ **Emoji icons** pour actions rapides (📋 copier, 🗑️ supprimer, ✏️ éditer)  
✅ **Dark theme cohérent** : bgDeep → surface1-3 elevation  
✅ **Compact spacing** : dashboard dense pour CGP pressés  

---

## Don'ts

❌ **Pas de Tailwind classes** (theme.ts uniquement)  
❌ **Pas de box-shadow** (flat design premium)  
❌ **Pas de couleurs custom** hors palette PSG Cosmos  
❌ **Pas de Comic Sans** ou fonts fantaisistes  
❌ **Pas de spacing inconsistent** (toujours multiples de 4px)  
❌ **Pas de borders épaisses** (max 2px, sauf accent 3px)  
❌ **Pas de animations lourdes** (perf mobile)  
❌ **Pas de modifications theme.ts** sans demande explicite utilisateur  

---

## References

**Source** : Design PSG Cosmos validé par l'utilisateur (2026-05)  
**Palette** : Inspirée identité visuelle Paris Saint-Germain (dark navy, rouge, or, bleu royal)  
**Typographie** : Oswald (sportive), JetBrains Mono (technique CGP)  
**Pattern** : Dashboard dense pro avec feedback premium (confetti achievements)  

**Target analogy** : "Si un champion PSG avait un CRM de gestion de patrimoine"

---

## Component Library

### Réutilisables existants

**`components/prospects/`**
- `ProspectCard.tsx` : Card drag-droppable avec badge status
- `ProspectEditForm.tsx` : Formulaire édition prospect (modal)

**`components/achievements/`**
- `AchievementsProvider.tsx` : Context + confetti trigger

**`components/calling/`**
- `CallingSessionPanel.tsx` : Panel session appels avec timer
- `BilanModal.tsx` : Récap session (metrics + notes)

**`settings/shared.tsx`**
- `Toggle` : Switch on/off
- `SectionPanel` : Container avec ribbon top border
- `SetRow` : Row settings avec label/control
- `SetLabel` : Label + description
- `NumInput` : Input numérique centré
- `SetBtn` : Button settings styled

### À créer pour futures stories

- CommandPalette (⌘K) : search global
- DatePicker : sélection date avec calendar
- TimeRangePicker : sélection période (7j/30j/90j/custom)
- MetricCard : card KPI avec delta indicator
- ProgressBar : barre progression objectifs
- Avatar : circle avec initials ou photo
- Dropdown : menu contextuel actions
- Tabs : navigation onglets (ex: Settings)

---

**Version** : 1.0  
**Créé le** : 2026-08-12  
**Source** : Analyse boilerplate existant (theme.ts + 40+ pages dashboard)
