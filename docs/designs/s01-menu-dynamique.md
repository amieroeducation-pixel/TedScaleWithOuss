---
story: s01-menu-dynamique
date: 2026-08-12
status: post-mortem
commit: 57c73a9
screens: 2
mockup: ./s01-menu-dynamique.html
---

# Design — s01-menu-dynamique (Post-Mortem)

**Note**: Cette story a été implémentée sans phase de design préalable. Ce document capture le design **tel qu'il existe** dans le code actuel pour référence future.

## Story Goal

Permettre à l'utilisateur de masquer/afficher les 5 grandes sections du menu latéral via la page Settings, personnalisant ainsi son interface selon son usage.

---

## Screens

### 1. Settings → Onglet Menu

**Context**: Page `/settings` avec onglet "📂 Menu" actif

**Layout**:
```
┌─────────────────────────────────────────────────────────────────┐
│ Settings                                     [Général] [KPI] ... │
│                                              [📂 Menu] ← ACTIF   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────── VISIBILITÉ SECTIONS MENU ──────────────────────┐   │
│  │ Masquez les sections du menu latéral que vous n'utilisez │   │
│  │ pas.                                                       │   │
│  │                                                            │   │
│  │  ┌──────────────────────────────────────────────────┐    │   │
│  │  │ Principal                               [Toggle] │    │   │
│  │  │ Dashboard, Aujourd'hui, Global                   │    │   │
│  │  └──────────────────────────────────────────────────┘    │   │
│  │                                                            │   │
│  │  ┌──────────────────────────────────────────────────┐    │   │
│  │  │ Clients                                 [Toggle] │    │   │
│  │  │ Clients Premium, CRM Kanban, Revenue             │    │   │
│  │  └──────────────────────────────────────────────────┘    │   │
│  │                                                            │   │
│  │  ┌──────────────────────────────────────────────────┐    │   │
│  │  │ Acquisition                             [Toggle] │    │   │
│  │  │ TNS, Chefs d'entreprise, Particuliers            │    │   │
│  │  └──────────────────────────────────────────────────┘    │   │
│  │                                                            │   │
│  │  ┌──────────────────────────────────────────────────┐    │   │
│  │  │ Outils                                  [Toggle] │    │   │
│  │  │ Assistant, Simulateur, Scoring, Map              │    │   │
│  │  └──────────────────────────────────────────────────┘    │   │
│  │                                                            │   │
│  │  ┌──────────────────────────────────────────────────┐    │   │
│  │  │ Pilotage                                [Toggle] │    │   │
│  │  │ Analytics, Achievements, Automatisations         │    │   │
│  │  └──────────────────────────────────────────────────┘    │   │
│  │                                                            │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Components utilisés** (design system):
- `SectionPanel` : Container principal avec ribbon gradient top border
- `SetRow` : Chaque ligne section (background surface1, border lineSoft, padding 10px 12px)
- `SetLabel` : Label + description (label 10px Inter 500 textHi, desc 8px JetBrains Mono textLo)
- `Toggle` : Switch 48x24px (off: textVlo, on: green, handle 18x18 white)

**Typography**:
- Panel title: 11px Oswald 600 gold uppercase letterSpacing 0.12em
- Description: 9px JetBrains Mono textLo
- Section labels: 10px Inter 500 textHi
- Section descriptions: 8px JetBrains Mono textLo

**Spacing**:
- Panel padding: 14px
- Panel marginBottom: 12px
- Row padding: 10px 12px
- Row marginBottom: 8px
- Description marginTop: 2px (dans SetLabel)

**Colors** (PSG Cosmos):
- Panel background: `linear-gradient(180deg, ${C.surface1}, ${C.bgMid})`
- Panel border: C.line
- Ribbon top: `linear-gradient(90deg, transparent, #ff647066, transparent)`
- Title: C.gold
- Row background: C.surface1
- Row border: C.lineSoft
- Toggle OFF: C.textVlo (#3a4885)
- Toggle ON: C.green (#4ade80)
- Toggle handle: white

**States**:

1. **Default** (all sections visible):
   - Tous les toggles ON (green)
   - Menu latéral affiche 5 sections complètes

2. **Section désactivée** (ex: Clients OFF):
   - Toggle OFF (textVlo gray)
   - Optimistic update immédiat → PATCH `/api/settings`
   - Menu latéral : section "Clients" disparaît du DOM après reload

3. **Saving**:
   - Pas de spinner visible (optimistic)
   - Save en arrière-plan via `save({ menu_sections_visible })`

4. **Error**:
   - (Non implémenté dans code actuel — silent fail)

---

### 2. Menu Latéral (Sidebar)

**Context**: Navigation principale présente sur toutes les pages dashboard

**Layout avant toggle** (toutes sections visibles):
```
┌─────────────────────┐
│ [UCL Logo] Champion'│
│ CGP Dashboard       │
├─────────────────────┤
│ PRINCIPAL           │
│ • Global            │
│ • Aujourd'hui       │
│ • Vue hebdo         │
│ • Revenue           │
│ • 🏆 Champions   [3]│ ← Badge achievements
│ • Pipeline          │
│ • Tâches        [5] │ ← Badge statique
├─────────────────────┤
│ CLIENTS             │
│ • CRM Kanban        │
│ • Premium           │
│ • Nurturing         │
│ • Cercle            │
├─────────────────────┤
│ ACQUISITION         │
│ • Carte TNS         │
│ • Prospection TNS   │
│ • Chefs entrep. [8] │
│ • Particuliers      │
├─────────────────────┤
│ OUTILS              │
│ • ⚡ Playbooks      │
│ • Séquences         │
│ • Simulateur        │
│ • Commerce          │
│ • Automatisations   │
├─────────────────────┤
│ PILOTAGE            │
│ • 📊 Analytics      │
│ • 📈 Données & KPI  │
│ • 🤖 Assistant      │
│ • ⚙️ Paramètres     │
│ • Scoring patrim.   │
├─────────────────────┤
│ [TK] Ted K.         │
│ CGP Manager         │
└─────────────────────┘
```

**Layout après toggle** (ex: section Clients masquée):
```
┌─────────────────────┐
│ [UCL Logo] Champion'│
│ CGP Dashboard       │
├─────────────────────┤
│ PRINCIPAL           │
│ • Global            │
│ • Aujourd'hui       │
│ • Vue hebdo         │
│ • Revenue           │
│ • 🏆 Champions   [3]│
│ • Pipeline          │
│ • Tâches        [5] │
├─────────────────────┤
│ ACQUISITION         │ ← Section suivante monte
│ • Carte TNS         │
│ • Prospection TNS   │
│ • Chefs entrep. [8] │
│ • Particuliers      │
├─────────────────────┤
│ OUTILS              │
│ • ⚡ Playbooks      │
│ • Séquences         │
│ • Simulateur        │
│ • Commerce          │
│ • Automatisations   │
├─────────────────────┤
│ PILOTAGE            │
│ • 📊 Analytics      │
│ • 📈 Données & KPI  │
│ • 🤖 Assistant      │
│ • ⚙️ Paramètres     │
│ • Scoring patrim.   │
├─────────────────────┤
│ [TK] Ted K.         │
│ CGP Manager         │
└─────────────────────┘
```

**Dimensions**:
- Width: 185px (fixed)
- Collapsed width: 0px (left: -185px via transition)
- Section header fontSize: 7px JetBrains Mono 600 uppercase textVlo (#3a4885)
- Nav item fontSize: 11px Inter (400 normal, 500 active)
- Nav item padding: 3px 10px
- Nav item dot: 3x3 borderRadius 50%

**Colors** (PSG Cosmos):
- Background: `linear-gradient(180deg, rgba(8,18,74,0.96), rgba(4,8,31,0.99))`
- Border right: C.line (#3a4690)
- Ribbon top: gradient PSG (#c84048 → #ff6470 → #f5e8c8 → #7a92e8 → #5c70b8)
- Section header: C.textVlo (#3a4885)
- Nav item normal: `rgba(255,216,102,0.65)` (gold translucent)
- Nav item active: `#ffe89a` (gold bright)
- Active indicator border-left: C.cyan 2px (#ff6470)
- Active background: `linear-gradient(90deg, rgba(200,64,72,0.22), transparent 70%)`
- Badge background: gradient ribbon (statiques) ou C.gold (achievements)
- Badge text: C.bgDeep (#0a0e22)

**States**:

1. **Section visible** (menuVisibility[key] !== false):
   - Section header + items rendus dans DOM
   - Ordre d'apparition : Principal → Clients → Acquisition → Outils → Pilotage

2. **Section masquée** (menuVisibility[key] === false):
   - Section entièrement absente du DOM (pas de display:none, vraiment filtrée)
   - Sections suivantes remontent

3. **Nav item active**:
   - Border-left cyan 2px
   - Background gradient rouge translucent
   - Text color bright gold (#ffe89a)
   - Dot glow (boxShadow `0 0 6px rgba(255,100,112,0.7)`)

4. **Nav item hover** (non actif):
   - (Non implémenté dans code actuel — pas de hover distinct du défaut)

---

## Interaction Flow

### Séquence principale

```
1. User clicks Settings → onglet "📂 Menu"
       ↓
2. TabMenu component mounted
   - Lit settings.menu_sections_visible via props
   - State local `visible` initialisé avec valeurs DB
       ↓
3. User toggle section "Clients" OFF
       ↓
4. handleToggle('clients', false)
   - Optimistic: setVisible({ ...visible, clients: false })
   - Async: save({ menu_sections_visible: { ...visible, clients: false } })
       ↓
5. save() → PATCH /api/settings
   - Body: { menu_sections_visible: {...} }
   - Supabase UPDATE user_settings SET ...
       ↓
6. User navigue vers /dashboard (ou reload)
       ↓
7. layout.tsx useEffect → GET /api/settings
       ↓
8. setMenuVisibility(data.menu_sections_visible)
   - menuVisibility.clients === false
       ↓
9. NAV_SECTIONS.filter(section => menuVisibility[key] !== false)
   - Section "Clients" exclue du render
       ↓
10. Sidebar affiche 4 sections (Principal, Acquisition, Outils, Pilotage)
```

### Edge cases

1. **Première visite** (menu_sections_visible null en DB):
   - Migration DEFAULT met toutes sections à true
   - Fallback filter: `!== false` traite null comme true
   - Résultat: toutes sections visibles (safe)

2. **Toggle rapide 5x**:
   - Plusieurs save() concurrents
   - Supabase last-write-wins
   - Optimistic UI peut desync si network lent
   - Résolution: reload force sync

3. **Section label change** (ex: "Outils" → "Tools" dans code):
   - Filter utilise `section.label.toLowerCase()` → "tools"
   - DB a toujours key "outils"
   - Match échoue → section réapparaît même si toggle OFF
   - **Mitigé**: labels hardcodés dans NAV_SECTIONS, peu probable

---

## Design System Conformité

### ✅ Respecté

1. **Colors**: Tous tokens PSG Cosmos (C.surface1, C.gold, C.green, C.line, etc.)
2. **Typography**: Oswald headers (11px 600 gold), JetBrains Mono labels (8px textLo), Inter body (10px)
3. **Spacing**: Panel padding 14px, row padding 10px 12px, marginBottom 8-12px (multiples de 4px)
4. **Border Radius**: Panel 10px, row 6px, toggle 24px (pill shape)
5. **Components**: Réutilise SectionPanel, SetRow, SetLabel, Toggle de settings/shared.tsx
6. **Inline CSS**: Zéro Tailwind class, tout via style={{}} objects
7. **Flat design**: Aucune shadow, elevation via borders uniquement

### ⚠️ Gaps identifiés

1. **Toggle component**:
   - Design system doc mentionne Toggle mais pas specs exactes
   - Implémentation actuelle: 48x24 pill avec handle 18x18
   - **Recommandation**: Documenter dimensions exactes dans design-system.md

2. **Hover states**:
   - Design system doc mentionne hover pour nav items (`background surface1 + transition 0.12s`)
   - **Non implémenté** dans code actuel layout.tsx
   - Nav items n'ont pas de hover distinct
   - **Recommandation**: Ajouter hover background surface1 + cursor pointer

3. **Loading state**:
   - Pas de spinner pendant save()
   - Optimistic update silencieux
   - **Conforme** au principe "no animations lourdes" du design system
   - Mais utilisateur n'a aucun feedback si save échoue
   - **Recommandation**: Toast discret en cas d'erreur

4. **Error handling UI**:
   - `save()` peut échouer (network, auth, DB)
   - Code actuel: silent fail (catch sans feedback)
   - **Recommandation**: Toast error si PATCH échoue

---

## Notes d'implémentation

### Fichiers modifiés

1. **Migration**: `supabase/migrations/20260811_add_menu_visibility.sql`
   - Colonne JSONB avec 5 clés default true

2. **Component**: `src/app/(dashboard)/settings/shared.tsx` (lignes 153-194)
   - TabMenu: 5 SetRow avec Toggle + handleToggle async

3. **Layout**: `src/app/(dashboard)/layout.tsx` (lignes 77-83, 100-109, 222-224)
   - State menuVisibility, fetch GET /api/settings, filter NAV_SECTIONS

4. **Type**: `src/hooks/useUserSettings.ts`
   - Type UserSettings inclut `menu_sections_visible?: Record<string, boolean>`

### Conventions respectées

- ✅ Inline CSS uniquement
- ✅ PSG Cosmos tokens
- ✅ Component reuse (SectionPanel, Toggle, etc.)
- ✅ Optimistic updates
- ✅ JSONB persistence pattern
- ✅ Client-side fetch (SSR-safe)

---

## Testing Notes

**Manuel tests performed** (docs/tests-phase0-1-resultats.md):
1. ✅ Naviguer Settings → onglet Menu visible
2. ✅ Toggle OFF section Clients → PATCH appelé → DB updated
3. ✅ Reload page → GET /api/settings → section Clients absente sidebar
4. ✅ Toggle ON → section réapparaît après reload

**E2E test** (e2e/phase0-1-test.spec.ts lines 248-293):
- ✅ Passed

**Coverage**:
- ✅ Happy path (toggle on/off + persistence)
- ⚠️ Error path non testé (network fail, auth fail)
- ⚠️ Race condition non testé (toggle rapide 5x)

---

## Future Improvements (hors scope s01)

1. **Live preview**: Afficher aperçu menu dans Settings pendant édition (sans reload)
2. **Real-time sync**: WebSocket pour synchro multi-onglets
3. **Hover states**: Ajouter hover background surface1 sur nav items
4. **Error toasts**: Feedback si save échoue
5. **Undo/Redo**: Historique changements avec annulation rapide
6. **Drag-to-reorder**: Réorganiser ordre sections (complexité +3)
7. **Custom labels**: Permettre renommer sections (complexité +2)

---

**Design captured**: Post-mortem du commit 57c73a9  
**Mockup**: docs/designs/s01-menu-dynamique.html (créé ci-après)  
**Status**: Story shipped — documentation à des fins de référence
