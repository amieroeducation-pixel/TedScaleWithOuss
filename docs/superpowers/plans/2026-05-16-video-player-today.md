# VideoPlayer Today Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un composant `VideoPlayer` dans la colonne droite de la page Today, sous l'agenda, pour lire des vidéos de motivation en playlist depuis des fichiers locaux.

**Architecture:** Composant React `VideoPlayer` autonome, calqué sur `AudioPlayer` existant. Utilise `useRef<HTMLVideoElement>`, `URL.createObjectURL` pour les fichiers locaux, et un state playlist identique à l'audio. Ajouté directement dans `today/page.tsx` avant `export default`.

**Tech Stack:** Next.js 15 App Router, React hooks (`useState`, `useEffect`, `useRef`), HTML5 `<video>`, inline CSS via `C` de `src/lib/theme.ts`

---

## File Structure

| Fichier | Action |
|---|---|
| `src/app/(dashboard)/today/page.tsx` | Modifier — ajouter `VideoPlayer` component + l'intégrer dans la colonne droite |

---

### Task 1 : Ajouter le composant `VideoPlayer` — state, refs, handlers

**Files:**
- Modify: `src/app/(dashboard)/today/page.tsx` — insérer le composant avant `export default function TodayPage`

- [ ] **Step 1 : Ouvrir le fichier et repérer le point d'insertion**

Le composant `AudioPlayer` se termine à la ligne ~210 (fermeture de la fonction `AudioPlayer`).
Insérer `VideoPlayer` immédiatement après, avant `// ─── Main page ───`.

- [ ] **Step 2 : Ajouter le composant avec state, refs et handlers**

Insérer ce bloc complet après la fermeture de `AudioPlayer` et avant `// ─── Main page ───` :

```tsx
// ─── Video player ─────────────────────────────────────────────────────────
function VideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [playlist, setPlaylist] = useState<Array<{ name: string; url: string }>>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [timeDisplay, setTimeDisplay] = useState('0:00 / 0:00')
  const [repeat, setRepeat] = useState(false)

  const fmt = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${pad(sec)}`
  }

  const loadFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const newTracks = files.map(f => ({ name: f.name.replace(/\.[^.]+$/, ''), url: URL.createObjectURL(f) }))
    setPlaylist(prev => [...prev, ...newTracks])
  }

  useEffect(() => {
    const video = videoRef.current
    if (!video || playlist.length === 0) return
    video.src = playlist[currentIdx]?.url ?? ''
    if (playing) video.play()
  }, [currentIdx, playlist])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const onTime = () => {
      const pct = video.duration ? (video.currentTime / video.duration) * 100 : 0
      setProgress(pct)
      setTimeDisplay(`${fmt(video.currentTime)} / ${fmt(video.duration || 0)}`)
    }
    const onEnded = () => {
      if (repeat) { video.play(); return }
      if (currentIdx < playlist.length - 1) { setCurrentIdx(i => i + 1) }
      else { setPlaying(false) }
    }
    video.addEventListener('timeupdate', onTime)
    video.addEventListener('ended', onEnded)
    return () => { video.removeEventListener('timeupdate', onTime); video.removeEventListener('ended', onEnded) }
  }, [currentIdx, playlist.length, repeat])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video || playlist.length === 0) return
    if (playing) { video.pause(); setPlaying(false) }
    else { video.play(); setPlaying(true) }
  }

  const prev = () => { if (currentIdx > 0) setCurrentIdx(i => i - 1) }
  const next = () => { if (currentIdx < playlist.length - 1) setCurrentIdx(i => i + 1) }

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current
    if (!video) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    video.currentTime = pct * video.duration
  }

  const stop = () => {
    const video = videoRef.current
    if (!video) return
    video.pause(); video.currentTime = 0; setPlaying(false)
  }

  const clear = () => {
    stop(); setPlaylist([]); setCurrentIdx(0); setProgress(0); setTimeDisplay('0:00 / 0:00')
  }

  const hasTrack = playlist.length > 0

  const btnBase = {
    borderRadius: 4, border: `0.5px solid ${C.line}`, background: C.surface1,
    color: C.textMid, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  }

  return (
    <div style={{ marginTop: 16, paddingTop: 16, borderTop: `0.5px solid ${C.line}` }}>
      <div style={{ fontSize: 8, color: C.textLo, marginBottom: 8, fontWeight: 500 }}>🎬 Motivation du jour</div>
      <div style={{ background: C.bgDeep, border: `0.5px solid ${C.line}`, borderRadius: 6, padding: 12 }}>
        <input ref={fileInputRef} type="file" accept="video/mp4,video/webm,video/ogg,video/quicktime,video/3gpp,video/3gpp2" multiple style={{ display: 'none' }} onChange={loadFiles} />

        {/* Zone vidéo */}
        <div style={{ width: '100%', height: 200, background: '#000', borderRadius: 5, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {hasTrack ? (
            <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : (
            <div style={{ fontSize: 9, color: C.textVlo }}>Aucune vidéo chargée</div>
          )}
        </div>

        {/* Nom de la vidéo courante */}
        <div style={{ fontSize: 9, color: C.textMid, marginBottom: 8, minHeight: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {hasTrack ? playlist[currentIdx]?.name : 'Aucun fichier chargé'}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <button onClick={prev} disabled={!hasTrack || currentIdx === 0} style={{ ...btnBase, width: 28, height: 28, fontSize: 12 }}>⏮</button>
          <button onClick={togglePlay} disabled={!hasTrack} style={{ ...btnBase, width: 36, height: 36, borderRadius: '50%', border: `0.5px solid ${C.green}40`, background: '#0d1a0d', color: C.green, fontSize: 16 }}>
            {playing ? '⏸' : '▶'}
          </button>
          <button onClick={next} disabled={!hasTrack || currentIdx >= playlist.length - 1} style={{ ...btnBase, width: 28, height: 28, fontSize: 12 }}>⏭</button>
          <div onClick={seek} style={{ flex: 1, height: 6, background: C.surface1, borderRadius: 10, overflow: 'hidden', cursor: 'pointer' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: C.green, borderRadius: 10, transition: 'width 0.1s' }} />
          </div>
          <div style={{ fontSize: 8, color: C.textLo, minWidth: 45, textAlign: 'right' }}>{timeDisplay}</div>
        </div>

        {/* Playlist */}
        {playlist.length > 0 && (
          <div style={{ maxHeight: 120, overflowY: 'auto', marginBottom: 8 }}>
            {playlist.map((t, i) => (
              <div key={i} onClick={() => { setCurrentIdx(i); setPlaying(true) }}
                style={{ padding: '3px 6px', fontSize: 8, cursor: 'pointer', borderRadius: 3, background: i === currentIdx ? C.surface2 : 'transparent', color: i === currentIdx ? C.gold : C.textMid }}>
                {i + 1}. {t.name}
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => fileInputRef.current?.click()} style={{ flex: 1, fontSize: 8, padding: 6, borderRadius: 4, border: `0.5px solid ${C.indigo}40`, background: '#0d1a2e', color: C.indigo, cursor: 'pointer', fontWeight: 500 }}>
            📁 Ajouter vidéos
          </button>
          <button onClick={() => setRepeat(r => !r)} disabled={!hasTrack} style={{ fontSize: 8, padding: '6px 12px', borderRadius: 4, border: `0.5px solid ${repeat ? C.gold : C.line}`, background: repeat ? '#1a1400' : C.surface1, color: repeat ? C.gold : C.textMid, cursor: 'pointer' }}>🔁</button>
          <button onClick={stop} disabled={!hasTrack} style={{ fontSize: 8, padding: '6px 12px', borderRadius: 4, border: `0.5px solid ${C.line}`, background: C.surface1, color: C.textMid, cursor: 'pointer' }}>⏹</button>
          <button onClick={clear} disabled={!hasTrack} style={{ fontSize: 8, padding: '6px 12px', borderRadius: 4, border: `0.5px solid ${C.cyan}40`, background: '#1a0a0a', color: C.cyan, cursor: 'pointer' }}>🗑️</button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3 : Vérifier que `pad` est accessible**

`pad` est définie à la ligne ~47 du fichier (`function pad(n: number)`), avant les deux composants. Elle est dans le scope du module — les deux composants peuvent l'utiliser. Aucune modification nécessaire.

- [ ] **Step 4 : Build de vérification**

```powershell
cd C:\Users\Ted\Documents\GitHub\TedScaleWithOuss
npm run build
```

Expected : build sans erreur TypeScript ni ESLint. Si erreur `video.play()` (retourne une Promise), wrapper avec `.catch(() => {})` :
```tsx
video.play().catch(() => {})
```

---

### Task 2 : Intégrer `VideoPlayer` dans la colonne droite

**Files:**
- Modify: `src/app/(dashboard)/today/page.tsx` — colonne droite du layout Prospection

- [ ] **Step 1 : Repérer la colonne droite dans le JSX**

Chercher le commentaire `{/* RIGHT COLUMN — Agenda */}` (autour de la ligne 567). Le bloc se termine par la fermeture du `<div style={{ minWidth: 0 }}>` de la colonne droite.

- [ ] **Step 2 : Ajouter `<VideoPlayer />` après le bloc agenda**

Modifier la colonne droite pour qu'elle ressemble à ceci :

```tsx
{/* RIGHT COLUMN — Agenda */}
<div style={{ minWidth: 0 }}>
  <div style={{ background: C.surface1, border: `0.5px solid ${C.line}`, borderRadius: 8, padding: 14 }}>
    <div style={{ fontSize: 10, fontWeight: 600, color: C.textHi, marginBottom: 12 }}>Agenda du jour · Vendredi 25 avril</div>
    {/* ...grille agenda existante, inchangée... */}
  </div>

  {/* VideoPlayer — nouveau */}
  <VideoPlayer />
</div>
```

Le composant `<VideoPlayer />` gère lui-même son `marginTop: 16` et `borderTop` — pas besoin de wrapper supplémentaire.

- [ ] **Step 3 : Vérifier en dev**

```powershell
npm run dev
```

Ouvrir `http://localhost:3000/dashboard/today`. Vérifier :
- La colonne droite affiche l'agenda en haut et le lecteur vidéo "🎬 Motivation du jour" en dessous
- La zone noire "Aucune vidéo chargée" s'affiche
- Le bouton "📁 Ajouter vidéos" ouvre bien le sélecteur de fichiers
- Charger un `.mp4` : la vidéo apparaît dans la zone, le nom s'affiche, play/pause fonctionne
- Charger un `.mov` ou `.3gp` : idem
- Tester prev/next avec plusieurs fichiers
- Tester boucle 🔁 et arrêt ⏹
- Vérifier que l'`AudioPlayer` existant (colonne gauche) fonctionne toujours normalement

- [ ] **Step 4 : Commit**

```powershell
cd C:\Users\Ted\Documents\GitHub\TedScaleWithOuss
git add src/app/(dashboard)/today/page.tsx
git commit -m "feat(today): add VideoPlayer — playlist vidéos motivation colonne droite sous agenda"
```

---

### Task 3 : Déploiement

**Files:**
- Aucun fichier supplémentaire — `GOOGLE_PLACES_API_KEY` et les autres secrets sont déjà configurés dans `deploy-cloudrun.ps1`

- [ ] **Step 1 : Déployer sur Cloud Run**

```powershell
.\deploy-cloudrun.ps1 -ProjectId integration-make-365608
```

Prérequis : Docker Desktop démarré + `gcloud auth login` effectué.

- [ ] **Step 2 : Vérifier en production**

Ouvrir https://ted-scale-with-ouss-272642857923.europe-west1.run.app/dashboard/today
Vérifier que le VideoPlayer s'affiche sous l'agenda et fonctionne avec un MP4 local.
