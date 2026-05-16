# Design — VideoPlayer · Page Today

**Date :** 2026-05-16  
**Statut :** Validé  
**Fichier cible :** `src/app/(dashboard)/today/page.tsx`

---

## Contexte

La page Today est le cockpit de prospection quotidien de Ted. Elle est ouverte en permanence pendant les sessions d'appels. Elle contient déjà un `AudioPlayer` (playlist de sons d'ambiance) dans la colonne gauche. L'objectif est d'ajouter un `VideoPlayer` (vidéos de motivation) dans la colonne droite, sous l'agenda.

---

## Décisions de design

| Sujet | Décision |
|---|---|
| Placement | Colonne droite, sous le bloc "Agenda du jour" |
| Taille vidéo | ~200px de hauteur |
| Playlist | Oui — plusieurs fichiers, navigation prev/next, liste défilante |
| Approche | Composant `VideoPlayer` indépendant, miroir de `AudioPlayer` |
| Formats | mp4, webm, ogg, mov (iPhone), 3gp / 3g2 (Android) |

---

## Architecture du composant

### State

```typescript
playlist: Array<{ name: string; url: string }>  // object URLs
currentIdx: number
playing: boolean
progress: number        // 0-100
timeDisplay: string     // "0:00 / 0:00"
repeat: boolean
```

### Refs

```typescript
videoRef: useRef<HTMLVideoElement>
fileInputRef: useRef<HTMLInputElement>
```

### Formats acceptés

```
video/mp4, video/webm, video/ogg, video/quicktime (.mov — iPhone),
video/3gpp (.3gp — Android), video/3gpp2 (.3g2 — Android)
```

### Comportements

- Chargement de fichiers locaux via `URL.createObjectURL`
- Auto-play sur la vidéo suivante en fin de lecture
- Boucle si `repeat` activé
- Seek via clic sur la barre de progression
- Fond noir + texte "Aucune vidéo chargée" quand playlist vide

---

## Interface visuelle

```
┌─────────────────────────────────────────┐
│ 🎬 Motivation du jour                   │
├─────────────────────────────────────────┤
│  ┌───────────────────────────────────┐  │
│  │                                   │  │
│  │       <video> ~200px de haut      │  │
│  │       (fond noir si vide)         │  │
│  │                                   │  │
│  └───────────────────────────────────┘  │
│  Nom de la vidéo courante               │
│  ⏮  ▶  ⏭  ████░░░░░░  0:00/0:00       │
│  ┌─ playlist défilante (max 120px) ───┐  │
│  │  1. video1.mp4  ← actif (gold)    │  │
│  │  2. motivation.mov                │  │
│  └───────────────────────────────────┘  │
│  [📁 Ajouter vidéos]  [🔁]  [⏹]  [🗑️]  │
└─────────────────────────────────────────┘
```

**Charte visuelle :** identique à `AudioPlayer`
- Fond `C.bgDeep`, bordure `C.line`, label `fontSize: 8` doré
- Barre de progression verte (`C.green`)
- Item actif en playlist : `C.gold`
- Boutons : même `btnBase` que AudioPlayer

---

## Intégration dans `today/page.tsx`

### Avant `export default function TodayPage`

Ajouter le composant `VideoPlayer` (~120 lignes).

### Dans le JSX — colonne droite

```tsx
{/* RIGHT COLUMN — Agenda + VideoPlayer */}
<div style={{ minWidth: 0 }}>
  {/* Bloc agenda existant — inchangé */}
  <div style={{ background: C.surface1, ... }}>
    ...agenda...
  </div>

  {/* VideoPlayer — nouveau */}
  <div style={{ marginTop: 16 }}>
    <VideoPlayer />
  </div>
</div>
```

---

## Layout global après implémentation

```
Colonne gauche                    Colonne droite
──────────────────────────────    ──────────────────────────
Chronomètre + compteurs           Agenda du jour
  └─ AudioPlayer 🎵                 └─ VideoPlayer 🎬 (nouveau)
```

---

## Coordination sessions parallèles

- **ONOFF liste d'appels** (autre session) : bloc en bas de l'onglet Prospection, lignes 662-673. Aucun conflit avec le VideoPlayer.
- **Playbooks + TedAgent Telegram** (session à venir) : sans rapport avec cette page.

---

## Ce qui ne change pas

- `AudioPlayer` : intact, même position, même code
- Layout 2 colonnes : inchangé
- Onglet Relances : inchangé
- Bloc ONOFF placeholder : inchangé (prêt pour l'autre session)
- Aucune nouvelle dépendance npm
