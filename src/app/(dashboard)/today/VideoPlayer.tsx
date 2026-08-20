'use client'

import { useState, useEffect, useRef } from 'react'
import { C } from '@/lib/theme'

function pad(n: number) { return String(n).padStart(2, '0') }

function getYouTubeEmbedUrl(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return `https://www.youtube.com/embed/${m[1]}`
  }
  return null
}

// IndexedDB helper for persisting local video files
const VIDEO_DB_NAME = 'ted_videos'
const VIDEO_STORE = 'files'

function openVideoDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(VIDEO_DB_NAME, 1)
    req.onupgradeneeded = () => { req.result.createObjectStore(VIDEO_STORE, { keyPath: 'id' }) }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function saveVideoFile(id: string, name: string, blob: Blob) {
  const db = await openVideoDB()
  const tx = db.transaction(VIDEO_STORE, 'readwrite')
  tx.objectStore(VIDEO_STORE).put({ id, name, blob })
  db.close()
}

async function loadVideoFiles(): Promise<Array<{ id: string; name: string; blob: Blob }>> {
  const db = await openVideoDB()
  return new Promise((resolve) => {
    const tx = db.transaction(VIDEO_STORE, 'readonly')
    const req = tx.objectStore(VIDEO_STORE).getAll()
    req.onsuccess = () => { db.close(); resolve(req.result ?? []) }
    req.onerror = () => { db.close(); resolve([]) }
  })
}

async function deleteVideoFile(id: string) {
  const db = await openVideoDB()
  const tx = db.transaction(VIDEO_STORE, 'readwrite')
  tx.objectStore(VIDEO_STORE).delete(id)
  db.close()
}

export default function VideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [playlist, setPlaylist] = useState<Array<{ name: string; url: string; persisted?: boolean; fileId?: string }>>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [timeDisplay, setTimeDisplay] = useState('0:00 / 0:00')
  const [repeat, setRepeat] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [urlName, setUrlName] = useState('')
  const [showUrlForm, setShowUrlForm] = useState(false)

  // Load saved videos from IndexedDB on mount
  useEffect(() => {
    async function loadSavedVideos() {
      try {
        const files = await loadVideoFiles()
        if (files.length > 0) {
          const saved = files.map(f => ({
            name: f.name,
            url: URL.createObjectURL(f.blob),
            persisted: true,
            fileId: f.id,
          }))
          setPlaylist(saved)
        }
      } catch { /* ignore */ }
    }
    loadSavedVideos()
  }, [])

  const addUrlVideo = async () => {
    const url = urlInput.trim()
    if (!url || !url.startsWith('http')) return
    const name = urlName.trim() || 'Video'
    setPlaylist(prev => [...prev, { name, url, persisted: false }])
    setUrlInput('')
    setUrlName('')
    setShowUrlForm(false)
  }

  const removeVideo = async (idx: number) => {
    const track = playlist[idx]
    if (track?.persisted && track.fileId) {
      await deleteVideoFile(track.fileId)
    }
    URL.revokeObjectURL(track.url)
    setPlaylist(prev => prev.filter((_, i) => i !== idx))
    if (currentIdx >= idx && currentIdx > 0) setCurrentIdx(i => i - 1)
  }

  const fmt = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${pad(sec)}`
  }

  const loadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const newTracks = await Promise.all(files.map(async (f) => {
      const id = `vid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const name = f.name.replace(/\.[^.]+$/, '')
      await saveVideoFile(id, name, f)
      return { name, url: URL.createObjectURL(f), persisted: true, fileId: id }
    }))
    setPlaylist(prev => [...prev, ...newTracks])
    e.target.value = ''
  }

  useEffect(() => {
    const video = videoRef.current
    if (!video || playlist.length === 0) return
    video.src = playlist[currentIdx]?.url ?? ''
    if (playing) video.play().catch(() => {})
  }, [currentIdx, playlist, playing])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const onTime = () => {
      const pct = video.duration ? (video.currentTime / video.duration) * 100 : 0
      setProgress(pct)
      setTimeDisplay(`${fmt(video.currentTime)} / ${fmt(video.duration || 0)}`)
    }
    const onEnded = () => {
      if (repeat) { video.play().catch(() => {}); return }
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
    else { video.play().catch(() => {}); setPlaying(true) }
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

  const clear = async () => {
    for (const t of playlist) {
      URL.revokeObjectURL(t.url)
      if (t.persisted && t.fileId) await deleteVideoFile(t.fileId)
    }
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

        {/* Zone vidéo — supporte YouTube (iframe) et fichiers locaux (video) */}
        <div style={{ width: '100%', height: 200, background: '#000', borderRadius: 5, marginBottom: 8, overflow: 'hidden', position: 'relative' }}>
          {hasTrack && getYouTubeEmbedUrl(playlist[currentIdx]?.url ?? '') ? (
            <iframe
              src={getYouTubeEmbedUrl(playlist[currentIdx].url)!}
              style={{ width: '100%', height: '100%', border: 'none' }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'contain', display: hasTrack ? 'block' : 'none' }} />
          )}
          {!hasTrack && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: C.textVlo }}>
              Aucune vidéo chargée
            </div>
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
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div onClick={() => { setCurrentIdx(i); setPlaying(true) }}
                  style={{ flex: 1, padding: '3px 6px', fontSize: 8, cursor: 'pointer', borderRadius: 3, background: i === currentIdx ? C.surface2 : 'transparent', color: i === currentIdx ? C.gold : C.textMid }}>
                  {i + 1}. {t.name} {t.persisted ? '💾' : ''}
                </div>
                <button onClick={(e) => { e.stopPropagation(); removeVideo(i) }} style={{ background: 'none', border: 'none', color: C.textLo, cursor: 'pointer', fontSize: 8, padding: 2 }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* URL form */}
        {showUrlForm && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8, padding: 8, background: C.surface1, borderRadius: 4, border: `0.5px solid ${C.line}` }}>
            <input
              type="text"
              placeholder="Nom (optionnel)"
              value={urlName}
              onChange={e => setUrlName(e.target.value)}
              style={{ fontSize: 9, padding: '4px 6px', background: C.bgDeep, border: `0.5px solid ${C.line}`, borderRadius: 3, color: C.textHi }}
            />
            <input
              type="text"
              placeholder="URL de la video (YouTube, etc.)"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addUrlVideo() }}
              style={{ fontSize: 9, padding: '4px 6px', background: C.bgDeep, border: `0.5px solid ${C.line}`, borderRadius: 3, color: C.textHi }}
            />
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={addUrlVideo} style={{ flex: 1, fontSize: 8, padding: 4, borderRadius: 3, border: `0.5px solid ${C.green}40`, background: '#0d1a0d', color: C.green, cursor: 'pointer' }}>Ajouter</button>
              <button onClick={() => setShowUrlForm(false)} style={{ fontSize: 8, padding: '4px 8px', borderRadius: 3, border: `0.5px solid ${C.line}`, background: C.surface1, color: C.textMid, cursor: 'pointer' }}>Annuler</button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => fileInputRef.current?.click()} style={{ flex: 1, fontSize: 8, padding: 6, borderRadius: 4, border: `0.5px solid ${C.indigo}40`, background: '#0d1a2e', color: C.indigo, cursor: 'pointer', fontWeight: 500 }}>
            📁 Fichiers
          </button>
          <button onClick={() => setShowUrlForm(s => !s)} style={{ flex: 1, fontSize: 8, padding: 6, borderRadius: 4, border: `0.5px solid ${C.green}40`, background: '#0d1a0d', color: C.green, cursor: 'pointer', fontWeight: 500 }}>
            🔗 Ajouter URL
          </button>
          <button onClick={() => setRepeat(r => !r)} disabled={!hasTrack} style={{ fontSize: 8, padding: '6px 12px', borderRadius: 4, border: `0.5px solid ${repeat ? C.gold : C.line}`, background: repeat ? '#1a1400' : C.surface1, color: repeat ? C.gold : C.textMid, cursor: 'pointer' }}>🔁</button>
          <button onClick={stop} disabled={!hasTrack} style={{ fontSize: 8, padding: '6px 12px', borderRadius: 4, border: `0.5px solid ${C.line}`, background: C.surface1, color: C.textMid, cursor: 'pointer' }}>⏹</button>
          <button onClick={clear} disabled={!hasTrack} style={{ fontSize: 8, padding: '6px 12px', borderRadius: 4, border: `0.5px solid ${C.cyan}40`, background: '#1a0a0a', color: C.cyan, cursor: 'pointer' }}>🗑️</button>
        </div>
      </div>
    </div>
  )
}
