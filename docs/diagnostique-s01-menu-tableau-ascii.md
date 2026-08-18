# Diagnostique s01-menu-dynamique — Tableau Actions/Fonctions/Outils

**Méthodologie killer-saas** : Analyse exhaustive de la story s01-menu-dynamique pour documenter TOUTES les actions utilisateur, fonctions techniques, outils et statut fonctionnel.

---

## 📊 Résumé Exécutif

**Total : 12 actions** — **9 ✅ Opérationnel** / **0 ⚠️ Partiel** / **3 ❌ Non implémenté**

**Taux de fonctionnalité : 75%**

### Par Catégorie

| Catégorie | Total | ✅ | ⚠️ | ❌ | Taux |
|-----------|-------|----|----|----|----|
| Navigation & Affichage | 6 | 6 | 0 | 0 | 100% |
| Interaction Menu | 3 | 3 | 0 | 0 | 100% |
| Configuration Visibilité | 3 | 0 | 0 | 3 | 0% |

### Actions à Compléter

1. **#10 (❌)** : Sections sommeil dans Settings — Aucune logique toggle visibilité dans settings/page.tsx
2. **#11 (❌)** : Toggle visibilité menu — Pas de composant Toggle pour afficher/masquer sections
3. **#12 (❌)** : Persist choix DB — Pas de route `/api/settings/menu-visibility`

---

## 📋 Tableau Détaillé Actions/Fonctions/Outils

```
┌─────────────────┬────────────────┬──────────────────────────────────────┬──────────────────────────────────┬───────────────┐
│        #        │     Action     │        Fonctions Principales         │              Outils              │    Statut     │
│                 │   Utilisateur  │                                      │                                  │  Fonctionnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 1. Navigation & │                │                                      │                                  │               │
│ Affichage (6    │                │                                      │                                  │               │
│ actions)        │                │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 1               │ Voir menu      │ NAV_SECTIONS.map() → render sections │ React, Next.js usePathname       │ ✅            │
│                 │ latéral        │ avec labels et items                 │                                  │ Opérationnel  │
│                 │                │                                      │                                  │               │
│                 │                │ **Geste** : Ouvrir l'app — le menu   │ **Fonction** : Const              │               │
│                 │                │ apparaît à gauche automatiquement    │ NAV_SECTIONS hardcodé avec 5     │               │
│                 │                │ (sidebarOpen=true par défaut)        │ sections (Principal, Clients,    │               │
│                 │                │                                      │ Acquisition, Outils, Pilotage).  │               │
│                 │                │                                      │ Boucle .map() pour render.       │               │
│                 │                │                                      │                                  │               │
│                 │                │                                      │ **Justification ✅** : Code       │               │
│                 │                │                                      │ présent dans layout.tsx lignes   │               │
│                 │                │                                      │ 10-61, map ligne 204+            │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 2               │ Naviguer entre │ Next.js Link → pathname detection    │ Next.js Link, usePathname()      │ ✅            │
│                 │ pages          │ active (border-left gold)            │                                  │ Opérationnel  │
│                 │                │                                      │                                  │               │
│                 │                │ **Geste** : Cliquer sur un item du   │ **Fonction** : <Link              │               │
│                 │                │ menu (ex: "Aujourd'hui", "CRM")      │ href={item.href}> avec détection │               │
│                 │                │                                      │ pathname === item.href pour      │               │
│                 │                │                                      │ active state (border-left gold   │               │
│                 │                │                                      │ 2px)                             │               │
│                 │                │                                      │                                  │               │
│                 │                │                                      │ **Justification ✅** : pathname   │               │
│                 │                │                                      │ usePathname() ligne 72, Link     │               │
│                 │                │                                      │ render ligne 227, style active   │               │
│                 │                │                                      │ conditionnel ligne 235           │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 3               │ Voir badges    │ Badge count dynamique (Tâches: 5,    │ useState, inline style badge     │ ✅            │
│                 │ notifications  │ Chefs: 8, Champions: recentCount)    │                                  │ Opérationnel  │
│                 │                │                                      │                                  │               │
│                 │                │ **Geste** : Regarder le menu —       │ **Fonction** : item.badge         │               │
│                 │                │ certains items affichent un badge    │ hardcodé dans NAV_SECTIONS       │               │
│                 │                │ numérique rouge (ex: Tâches "5",     │ (lignes 20, 37). Pour            │               │
│                 │                │ Chefs "8")                           │ Achievements: fetch /api/        │               │
│                 │                │                                      │ achievements → setRecentCount    │               │
│                 │                │                                      │ (lignes 78-90)                   │               │
│                 │                │                                      │                                  │               │
│                 │                │                                      │ **Justification ✅** : Badge      │               │
│                 │                │                                      │ render conditionnel ligne 242,   │               │
│                 │                │                                      │ recentCount useState ligne 75,   │               │
│                 │                │                                      │ fetch achievements ligne 79      │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 4               │ Voir sections  │ NAV_SECTIONS.label render avec style │ CSS inline, color #9ca3af       │ ✅            │
│                 │ groupées       │ uppercase gris (Principal, Clients,  │                                  │ Opérationnel  │
│                 │                │ Acquisition, Outils, Pilotage)       │                                  │               │
│                 │                │                                      │                                  │               │
│                 │                │ **Geste** : Scroller le menu — voir  │ **Fonction** : Boucle             │               │
│                 │                │ les titres de sections en majuscules │ NAV_SECTIONS.map() → render      │               │
│                 │                │ gris                                 │ <div>{section.label}</div> avec  │               │
│                 │                │                                      │ style uppercase, fontSize 10px,  │               │
│                 │                │                                      │ color #9ca3af (ligne 209-217)    │               │
│                 │                │                                      │                                  │               │
│                 │                │                                      │ **Justification ✅** : Sections   │               │
│                 │                │                                      │ hardcodées lignes 10-61, render  │               │
│                 │                │                                      │ labels ligne 209                 │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 5               │ Voir icônes    │ Emoji inline dans labels             │ Unicode emojis                   │ ✅            │
│                 │ sections       │ (🏆 Champions, ⚡ Playbooks,         │                                  │ Opérationnel  │
│                 │                │ 📊 Analytics, 🤖 Assistant, etc.)    │                                  │               │
│                 │                │                                      │                                  │               │
│                 │                │ **Geste** : Regarder le menu —       │ **Fonction** : Labels avec        │               │
│                 │                │ certains items ont des emojis comme  │ emojis hardcodés dans            │               │
│                 │                │ préfixe (🏆, ⚡, 📊, 📈, 🤖, ⚙️)     │ NAV_SECTIONS (lignes 18, 44, 54, │               │
│                 │                │                                      │ 55, 56, 57)                      │               │
│                 │                │                                      │                                  │               │
│                 │                │                                      │ **Justification ✅** : Emojis     │               │
│                 │                │                                      │ présents directement dans les    │               │
│                 │                │                                      │ strings label                    │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 6               │ Scroller menu  │ Overflow-y auto, height calc avec    │ CSS overflow-y: auto             │ ✅            │
│                 │                │ padding bottom                       │                                  │ Opérationnel  │
│                 │                │                                      │                                  │               │
│                 │                │ **Geste** : Scroller vers le bas si  │ **Fonction** : Style sidebar      │               │
│                 │                │ menu plus haut que viewport          │ overflowY: 'auto' (ligne 189)    │               │
│                 │                │                                      │ avec height: '100vh' et padding  │               │
│                 │                │                                      │ bottom (ligne 186-200)           │               │
│                 │                │                                      │                                  │               │
│                 │                │                                      │ **Justification ✅** : CSS        │               │
│                 │                │                                      │ scroll présent ligne 189         │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 2. Interaction  │                │                                      │                                  │               │
│ Menu (3         │                │                                      │                                  │               │
│ actions)        │                │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 7               │ Hover item     │ CSS hover transition (color + bg)    │ CSS hover inline, transition     │ ✅            │
│                 │ menu           │                                      │ 0.12s                            │ Opérationnel  │
│                 │                │                                      │                                  │               │
│                 │                │ **Geste** : Passer la souris sur un  │ **Fonction** : Style Link avec    │               │
│                 │                │ item du menu → fond semi-transparent │ ':hover' → backgroundColor       │               │
│                 │                │ + texte gold                         │ rgba(255,255,255,0.03), color    │               │
│                 │                │                                      │ C.gold, transition 0.12s (ligne  │               │
│                 │                │                                      │ 228-233, 237-238)                │               │
│                 │                │                                      │                                  │               │
│                 │                │                                      │ **Justification ✅** : Inline     │               │
│                 │                │                                      │ style avec transition lignes     │               │
│                 │                │                                      │ 228-240                          │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 8               │ Toggle sidebar │ Bouton ≡ en haut du menu → toggle    │ useState sidebarOpen,            │ ✅            │
│                 │ (réduire)      │ sidebarOpen state                    │ setSidebarOpen()                 │ Opérationnel  │
│                 │                │                                      │                                  │               │
│                 │                │ **Geste** : Cliquer sur le bouton ≡  │ **Fonction** : useState           │               │
│                 │                │ en haut à gauche du menu → sidebar   │ sidebarOpen (ligne 76), bouton   │               │
│                 │                │ se réduit (width 60px, labels        │ onClick={() =>                   │               │
│                 │                │ masqués)                             │ setSidebarOpen(!sidebarOpen)}    │               │
│                 │                │                                      │ (ligne 252), width conditionnel  │               │
│                 │                │                                      │ 240px ou 60px (ligne 187)        │               │
│                 │                │                                      │                                  │               │
│                 │                │                                      │ **Justification ✅** : Logique    │               │
│                 │                │                                      │ toggle complète lignes 76, 187,  │               │
│                 │                │                                      │ 252                              │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 9               │ Animation      │ CSS transition width + opacity       │ CSS transition all 0.25s ease    │ ✅            │
│                 │ sidebar        │ smooth                               │                                  │ Opérationnel  │
│                 │                │                                      │                                  │               │
│                 │                │ **Geste** : Après toggle — observer  │ **Fonction** : Style sidebar      │               │
│                 │                │ animation fluide du collapse         │ transition: 'all 0.25s ease'     │               │
│                 │                │                                      │ (ligne 190), opacity              │               │
│                 │                │                                      │ conditionnelle labels (ligne     │               │
│                 │                │                                      │ 211, 231)                        │               │
│                 │                │                                      │                                  │               │
│                 │                │                                      │ **Justification ✅** : Transition │               │
│                 │                │                                      │ CSS ligne 190                    │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 3.              │                │                                      │                                  │               │
│ Configuration   │                │                                      │                                  │               │
│ Visibilité (3   │                │                                      │                                  │               │
│ actions)        │                │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 10              │ Sections       │ Onglet dans Settings pour            │ ❌ Aucun code présent            │ ❌            │
│                 │ sommeil dans   │ activer/désactiver sections menu     │                                  │ À implémenter │
│                 │ Settings       │                                      │                                  │               │
│                 │                │                                      │                                  │               │
│                 │                │ **Geste** : Ouvrir Paramètres →      │ **Fonction** : Aucun onglet       │               │
│                 │                │ onglet "Menu" → voir liste sections  │ "Menu" ou "Visibilité" dans      │               │
│                 │                │ avec toggle visible/masqué           │ settings/page.tsx. TABS          │               │
│                 │                │                                      │ hardcodés ne contiennent pas     │               │
│                 │                │                                      │ "menu" (ligne 9). Pas de         │               │
│                 │                │                                      │ composant TabMenu.               │               │
│                 │                │                                      │                                  │               │
│                 │                │                                      │ **Justification ❌** : Grep       │               │
│                 │                │                                      │ 'menu.*visibility' retourne 0    │               │
│                 │                │                                      │ fichier, settings/shared.tsx ne  │               │
│                 │                │                                      │ contient pas TabMenu             │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 11              │ Toggle         │ Composant Toggle pour chaque section │ ❌ Pas de composant Toggle        │ ❌            │
│                 │ visibilité     │ menu dans Settings                   │ pour menu                        │ À implémenter │
│                 │ menu           │                                      │                                  │               │
│                 │                │                                      │                                  │               │
│                 │                │ **Geste** : Dans Settings > Menu →   │ **Fonction** : Composant Toggle   │               │
│                 │                │ cliquer toggle "Principal" → section │ existe dans settings/shared.tsx  │               │
│                 │                │ disparaît du menu latéral            │ (ligne 11) MAIS non utilisé pour │               │
│                 │                │                                      │ sections menu. Pas de state      │               │
│                 │                │                                      │ menu_visibility dans             │               │
│                 │                │                                      │ UserSettings.                    │               │
│                 │                │                                      │                                  │               │
│                 │                │                                      │ **Justification ❌** : Aucun      │               │
│                 │                │                                      │ toggle menu_sections_visible     │               │
│                 │                │                                      │ dans settings/page.tsx, pas de   │               │
│                 │                │                                      │ useState menu_visibility         │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 12              │ Persist choix  │ PATCH /api/settings/menu-visibility  │ ❌ Pas de route API               │ ❌            │
│                 │ DB             │ → colonne menu_sections_visible JSON │                                  │ À implémenter │
│                 │                │                                      │                                  │               │
│                 │                │ **Geste** : Après toggle visibility  │ **Fonction** : Route               │               │
│                 │                │ → settings sauvegardés en DB → au    │ /api/settings/menu-visibility    │               │
│                 │                │ prochain reload, sections masquées   │ n'existe pas. Grep retourne 0    │               │
│                 │                │ ne réapparaissent pas                │ fichier. Table user_settings ne  │               │
│                 │                │                                      │ contient pas colonne             │               │
│                 │                │                                      │ menu_sections_visible (migration │               │
│                 │                │                                      │ manquante).                      │               │
│                 │                │                                      │                                  │               │
│                 │                │                                      │ **Justification ❌** : Grep       │               │
│                 │                │                                      │ '/api/settings/menu' retourne 0  │               │
│                 │                │                                      │ fichier                          │               │
└─────────────────┴────────────────┴──────────────────────────────────────┴──────────────────────────────────┴───────────────┘
```

---

## 🔧 Outils Utilisés

### Actions ✅ Opérationnelles (9)
- **React** : useState, useEffect, usePathname (Next.js)
- **Next.js** : Link, useRouter
- **CSS** : Inline styles via theme.ts (C.bgDeep, C.gold), transitions, hover effects
- **Supabase** : fetch `/api/achievements` pour badge Champions

### Actions ❌ Non Implémentées (3)
- **Manquant** : Onglet Settings > Menu
- **Manquant** : Composant Toggle menu sections
- **Manquant** : Route API `/api/settings/menu-visibility`
- **Manquant** : Colonne DB `menu_sections_visible` (JSON)

---

## 🚧 Actions Non Implémentées — Détails

### #10 — Sections sommeil dans Settings

**Problème** : Aucun onglet "Menu" ou "Visibilité" dans `settings/page.tsx`.

**Fichiers concernés** :
- `src/app/(dashboard)/settings/page.tsx` — Ajouter onglet "Menu" dans TABS
- `src/app/(dashboard)/settings/shared.tsx` — Créer TabMenu component

**Code manquant** :
```tsx
// Dans settings/shared.tsx
export function TabMenu({ settings, save }: { settings: UserSettings | null; save: (p: Partial<UserSettings>) => Promise<unknown> }) {
  const [visible, setVisible] = useState<Record<string, boolean>>(settings?.menu_sections_visible ?? {
    principal: true,
    clients: true,
    acquisition: true,
    outils: true,
    pilotage: true,
  })

  return (
    <SectionPanel title="Visibilité Sections Menu">
      {Object.keys(visible).map((key) => (
        <SetRow key={key}>
          <SetLabel>{key.charAt(0).toUpperCase() + key.slice(1)}</SetLabel>
          <Toggle
            value={visible[key]}
            onChange={(v) => {
              const next = { ...visible, [key]: v }
              setVisible(next)
              save({ menu_sections_visible: next })
            }}
          />
        </SetRow>
      ))}
    </SectionPanel>
  )
}
```

---

### #11 — Toggle visibilité menu

**Problème** : Composant Toggle existe mais non branché pour menu sections.

**Fichiers concernés** :
- `src/app/(dashboard)/layout.tsx` — Filtrer NAV_SECTIONS selon settings

**Code manquant** :
```tsx
// Dans layout.tsx
const [menuVisibility, setMenuVisibility] = useState<Record<string, boolean> | null>(null)

useEffect(() => {
  fetch('/api/settings')
    .then(r => r.json())
    .then(({ data }) => {
      setMenuVisibility(data?.menu_sections_visible ?? null)
    })
}, [])

// Dans render NAV_SECTIONS
{NAV_SECTIONS.filter(section => {
  const key = section.label.toLowerCase()
  return menuVisibility?.[key] !== false
}).map((section, i) => (
  // ... render section
))}
```

---

### #12 — Persist choix DB

**Problème** : Pas de route API ni colonne DB.

**Fichiers à créer** :
- Route `/api/settings/menu-visibility` (déjà géré par route générique `/api/settings`)
- Migration Supabase : ajouter colonne `menu_sections_visible jsonb` dans `user_settings`

**Migration SQL** :
```sql
-- supabase/migrations/XXX_add_menu_visibility.sql
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS menu_sections_visible jsonb DEFAULT '{"principal": true, "clients": true, "acquisition": true, "outils": true, "pilotage": true}'::jsonb;
```

**Validation** :
- PATCH `/api/settings` avec body `{ menu_sections_visible: {...} }` → déjà supporté par route existante
- GET `/api/settings` retourne menu_sections_visible

---

## 📈 Prochaines Étapes

### Pour atteindre 100% fonctionnel

1. **Migration DB** (5 min) :
   - Créer `supabase/migrations/009_add_menu_visibility.sql`
   - Colonne `menu_sections_visible jsonb`

2. **Settings UI** (20 min) :
   - Ajouter onglet "Menu" dans settings/page.tsx
   - Créer TabMenu dans settings/shared.tsx
   - Utiliser composant Toggle existant

3. **Layout filtrage** (10 min) :
   - Fetch settings dans layout.tsx useEffect
   - Filtrer NAV_SECTIONS selon menu_sections_visible

4. **Tests manuels** (10 min) :
   - Toggle section dans Settings
   - Vérifier disparition dans menu
   - Reload page → persiste

**Estimation totale : 45 minutes**

---

## 📚 Architecture Actuelle

### Fichiers clés
- `src/app/(dashboard)/layout.tsx` — Menu latéral (NAV_SECTIONS hardcodé)
- `src/app/(dashboard)/settings/page.tsx` — Page paramètres (pas d'onglet Menu)
- `src/app/(dashboard)/settings/shared.tsx` — Composants Toggle, SectionPanel
- `src/hooks/useUserSettings.ts` — Hook settings (menu_sections_visible absent)

### NAV_SECTIONS structure
```ts
const NAV_SECTIONS = [
  {
    label: 'Principal',       // Clé: principal
    items: [...],
  },
  {
    label: 'Clients',         // Clé: clients
    items: [...],
  },
  {
    label: 'Acquisition',     // Clé: acquisition
    items: [...],
  },
  {
    label: 'Outils',          // Clé: outils
    items: [...],
  },
  {
    label: 'Pilotage',        // Clé: pilotage
    items: [...],
  },
]
```

---

## 🎯 Story s01-menu-dynamique — Statut

| Critère | Statut |
|---------|--------|
| Navigation fonctionnelle | ✅ |
| Badges dynamiques | ✅ |
| Toggle sidebar | ✅ |
| Hover effects | ✅ |
| Responsive | ✅ |
| **Configuration visibilité** | ❌ |
| **Persist DB** | ❌ |
| **Sections sommeil** | ❌ |

**Conclusion** : 75% opérationnel — Menu navigation parfait, manque feature "sommeil sections" (3 actions).

---

**Document généré par analyse killer-saas — 12 actions documentées pour s01-menu-dynamique**
