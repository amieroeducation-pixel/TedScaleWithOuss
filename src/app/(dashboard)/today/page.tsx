'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { C } from '@/lib/theme'
import { AgendaEventType, AgendaEvent, AGENDA_COLORS, loadDayAgenda, saveDayAgenda, todayDateKey, fantasticalUrl } from '@/lib/agenda'
import { saveLastSection } from '@/lib/navigation-state'
import CallingSessionPanel from '@/components/calling/CallingSessionPanel'
import { useCelebrations } from '@/hooks/useCelebrations'

// ─── Objectifs du jour ────────────────────────────────────────────────────────
interface TodayTargets { contacts: number; calls: number; rdv1: number; rdv2: number }
const DEFAULT_TARGETS: TodayTargets = { contacts: 10, calls: 20, rdv1: 5, rdv2: 3 }
const TARGETS_DAY_KEY  = () => `today_targets_${new Date().toDateString()}`
const TARGETS_DEF_KEY  = 'today_targets_default'

function loadStoredTargets(): TodayTargets {
  try {
    const day = localStorage.getItem(TARGETS_DAY_KEY())
    if (day) return { ...DEFAULT_TARGETS, ...JSON.parse(day) }
    const def = localStorage.getItem(TARGETS_DEF_KEY)
    if (def) return { ...DEFAULT_TARGETS, ...JSON.parse(def) }
  } catch { /* ignore */ }
  return DEFAULT_TARGETS
}

// ─── Types Weekly Signal ────────────────────────────────────────────────────
type RelanceRow = {
  id: string
  full_name: string
  profession: string | null
  pipeline_stage: string | null
  next_action_date: string
  lead_score: number | null
  phone: string | null
  email: string | null
  days_until: number
}

type RdvRow = {
  id: string
  type: string
  occurred_at: string
  notes: string | null
  prospect_id: string
  prospect_name: string
  profession: string | null
  day_label: string
}

type SignalResp = {
  relances: RelanceRow[]
  rdvSemaine: RdvRow[]
  todayCount: number
  weekRdvCount: number
}

type TodayTab = 'prospection' | 'relances'

// ─── Relances column types ─────────────────────────────────────────────────
type RelanceStatus = 'arappeler' | 'appelee' | 'replanifier' | 'terminee'
interface Relance {
  id: string; name: string; priority: 1 | 2 | 3; status: RelanceStatus; note?: string
}

const BLOCK_DURATION = 52 * 60 * 100 // 52 minutes in centiseconds

const TIMER_KEY = () => `today_timer_${new Date().toDateString()}`

function loadTimer(): { timerSec: number; running: boolean; startedAt: number } {
  try {
    const s = localStorage.getItem(TIMER_KEY())
    if (s) return JSON.parse(s)
  } catch { /* ignore */ }
  return { timerSec: 0, running: false, startedAt: 0 }
}

function saveTimer(timerSec: number, running: boolean, startedAt: number) {
  try { localStorage.setItem(TIMER_KEY(), JSON.stringify({ timerSec, running, startedAt })) } catch { /* ignore */ }
}

function pad(n: number) { return String(n).padStart(2, '0') }
function formatCentis(cs: number) {
  const totalSec = Math.floor(cs / 100)
  const centis = cs % 100
  return `${pad(Math.floor(totalSec / 60))}:${pad(totalSec % 60)}.${pad(centis)}`
}

// ─── Agenda helpers ────────────────────────────────────────────────────────
function todayFrDate() {
  return new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

// ─── Block timer indicator ─────────────────────────────────────────────────
function BlockIndicator({ done }: { done: boolean }) {
  return (
    <div style={{
      flex: 1, height: 7, borderRadius: 3,
      background: done ? '#1a1400' : C.surface1,
      border: `0.5px solid ${done ? `${C.gold}40` : C.surface3}`,
    }} />
  )
}

// ─── Kanban columns for Relances ──────────────────────────────────────────
const COLUMNS: Array<{ key: RelanceStatus; label: string; color: string }> = [
  { key: 'arappeler',  label: 'À rappeler',   color: C.indigo },
  { key: 'appelee',    label: 'Appelée',       color: C.green  },
  { key: 'replanifier',label: 'À replanifier', color: C.gold   },
  { key: 'terminee',   label: 'Terminées',     color: C.textLo },
]

function PressureDots({ n, color }: { n: 1 | 2 | 3; color: string }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block' }} />
      ))}
    </span>
  )
}

// ─── Audio player ─────────────────────────────────────────────────────────
function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null)
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
    const audio = audioRef.current
    if (!audio || playlist.length === 0) return
    audio.src = playlist[currentIdx]?.url ?? ''
    if (playing) audio.play()
  }, [currentIdx, playlist])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => {
      const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0
      setProgress(pct)
      setTimeDisplay(`${fmt(audio.currentTime)} / ${fmt(audio.duration || 0)}`)
    }
    const onEnded = () => {
      if (repeat) { audio.play(); return }
      if (currentIdx < playlist.length - 1) { setCurrentIdx(i => i + 1) }
      else { setPlaying(false) }
    }
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnded)
    return () => { audio.removeEventListener('timeupdate', onTime); audio.removeEventListener('ended', onEnded) }
  }, [currentIdx, playlist.length, repeat])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio || playlist.length === 0) return
    if (playing) { audio.pause(); setPlaying(false) }
    else { audio.play(); setPlaying(true) }
  }

  const prev = () => { if (currentIdx > 0) setCurrentIdx(i => i - 1) }
  const next = () => { if (currentIdx < playlist.length - 1) setCurrentIdx(i => i + 1) }

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    audio.currentTime = pct * audio.duration
  }

  const stop = () => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause(); audio.currentTime = 0; setPlaying(false)
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
      <div style={{ fontSize: 8, color: C.textLo, marginBottom: 8, fontWeight: 500 }}>🎵 Ambiance du jour</div>
      <div style={{ background: C.bgDeep, border: `0.5px solid ${C.line}`, borderRadius: 6, padding: 12 }}>
        <input ref={fileInputRef} type="file" accept="audio/mp3,audio/mp4,audio/mpeg,audio/wav" multiple style={{ display: 'none' }} onChange={loadFiles} />
        <audio ref={audioRef} style={{ display: 'none' }} />

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
            📁 Ajouter sons
          </button>
          <button onClick={() => setRepeat(r => !r)} disabled={!hasTrack} style={{ fontSize: 8, padding: '6px 12px', borderRadius: 4, border: `0.5px solid ${repeat ? C.gold : C.line}`, background: repeat ? '#1a1400' : C.surface1, color: repeat ? C.gold : C.textMid, cursor: 'pointer' }}>🔁</button>
          <button onClick={stop} disabled={!hasTrack} style={{ fontSize: 8, padding: '6px 12px', borderRadius: 4, border: `0.5px solid ${C.line}`, background: C.surface1, color: C.textMid, cursor: 'pointer' }}>⏹</button>
          <button onClick={clear} disabled={!hasTrack} style={{ fontSize: 8, padding: '6px 12px', borderRadius: 4, border: `0.5px solid ${C.cyan}40`, background: '#1a0a0a', color: C.cyan, cursor: 'pointer' }}>🗑️</button>
        </div>
      </div>
    </div>
  )
}

// ─── Video player ─────────────────────────────────────────────────────────
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

function VideoPlayer() {
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

// ─── Main page ────────────────────────────────────────────────────────────
export default function TodayPage() {
  const { celebrate } = useCelebrations()
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') as TodayTab | null
  const [tab, setTab] = useState<TodayTab>(initialTab === 'relances' ? 'relances' : 'prospection')
  const [clock, setClock] = useState('--:--')
  const [displayDate, setDisplayDate] = useState('')
  useEffect(() => { setDisplayDate(todayFrDate()); saveLastSection('/today') }, [])

  // ─── Ambiance musicale — une seule fois par heure ────────────────────────
  useEffect(() => {
    const KEY = 'ldc_last_played'
    const ONE_HOUR = 60 * 60 * 1000
    const last = parseInt(localStorage.getItem(KEY) ?? '0', 10)
    if (Date.now() - last < ONE_HOUR) return
    localStorage.setItem(KEY, String(Date.now()))
    const audio = new Audio('/sounds/ldc-theme.mp3')
    audio.volume = 0.4
    audio.play().catch(() => {})
    return () => { audio.pause(); audio.src = '' }
  }, [])

  // ─── Objectifs configurables ──────────────────────────────────────────────
  const [targets, setTargets] = useState<TodayTargets>(DEFAULT_TARGETS)
  const [showTargetModal, setShowTargetModal] = useState(false)
  const [targetForm, setTargetForm] = useState<TodayTargets>(DEFAULT_TARGETS)
  const celebratedAllRef = useRef(false)
  const [showEndDay, setShowEndDay] = useState(false)
  const [endDaySaving, setEndDaySaving] = useState(false)
  const [endDaySaved, setEndDaySaved] = useState(false)

  // ─── Weekly Signal state ──────────────────────────────────────────────────
  const [signal, setSignal] = useState<SignalResp | null>(null)
  const [signalLoading, setSignalLoading] = useState(true)
  const [signalError, setSignalError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/today/signal')
      .then(r => r.json())
      .then((j: { data?: SignalResp; error?: string }) => {
        if (j.error) setSignalError(j.error)
        else if (j.data) setSignal(j.data)
      })
      .catch(e => setSignalError((e as Error).message))
      .finally(() => setSignalLoading(false))
  }, [])

  // Live clock
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setClock(`${pad(now.getHours())}:${pad(now.getMinutes())}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  // Block timer — blocks completed persistent via localStorage (reset each day)
  const [timerSec, setTimerSec] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const [blocksCompleted, setBlocksCompleted] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const key = `blocks_${new Date().toDateString()}`
    const stored = localStorage.getItem(key)
    if (stored) setBlocksCompleted(Math.min(parseInt(stored, 10), 6))
  }, [])

  useEffect(() => {
    const stored = loadTimer()
    if (stored.running && stored.startedAt > 0) {
      const elapsed = Math.floor((Date.now() - stored.startedAt) / 10)
      const resumeSec = Math.min(stored.timerSec + elapsed, BLOCK_DURATION - 1)
      setTimerSec(resumeSec)
      setTimerRunning(true)
    } else {
      setTimerSec(stored.timerSec)
    }
  }, [])

  useEffect(() => {
    const t = loadStoredTargets()
    setTargets(t)
    setTargetForm(t)
  }, [])

  // ─── Agenda éditable — persisted in Supabase via /api/today/agenda ─────────
  const [agendaEvents, setAgendaEvents] = useState<AgendaEvent[]>([])
  const [showAgendaModal, setShowAgendaModal] = useState(false)
  const [agendaForm, setAgendaForm] = useState({ time: '09:00', title: '', type: 'rdv' as AgendaEventType })

  // Chargement des compteurs du jour au montage
  useEffect(() => {
    const c = loadCounters()
    setContacts(c.contacts)
    setCalls(c.calls)
    setRdv1(c.rdv1)
    setRdv2(c.rdv2)
  }, [])

  // Load agenda from DB
  useEffect(() => {
    const dk = todayDateKey()
    fetch(`/api/today/agenda?date=${dk}`)
      .then(r => r.json())
      .then(j => { if (j.data) setAgendaEvents(j.data) })
      .catch(() => {
        // Fallback to localStorage if API fails
        setAgendaEvents(loadDayAgenda(dk))
      })
  }, [])

  // Effect-based timer: starts/stops interval based on timerRunning state (centiseconds)
  useEffect(() => {
    if (!timerRunning) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      return
    }
    timerRef.current = setInterval(() => {
      setTimerSec(s => {
        if (s + 1 >= BLOCK_DURATION) {
          setTimerRunning(false)
          setBlocksCompleted(b => {
            const next = Math.min(b + 1, 6)
            localStorage.setItem(`blocks_${new Date().toDateString()}`, String(next))
            setTimeout(() => {
              if (next >= 6) celebrate('objectif_journee', '6 / 6 BLOCS !')
              else if (next === 5) celebrate('objectif_blocs', 'ENCORE UN !')
              else celebrate('appel_passe')
            }, 0)
            return next
          })
          saveTimer(0, false, 0)
          return 0
        }
        if ((s + 1) % 100 === 0) saveTimer(s + 1, true, Date.now() - (s + 1) * 10)
        return s + 1
      })
    }, 10)
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }
  }, [timerRunning, celebrate])

  const startTimer = () => {
    if (timerRunning) return
    setTimerRunning(true)
    saveTimer(timerSec, true, Date.now() - timerSec * 10)
  }

  const pauseTimer = () => {
    setTimerRunning(false)
    setTimerSec(s => { saveTimer(s, false, 0); return s })
  }

  const completeBlock = () => {
    setTimerRunning(false)
    setTimerSec(0)
    saveTimer(0, false, 0)
    setBlocksCompleted(b => {
      const next = Math.min(b + 1, 6)
      localStorage.setItem(`blocks_${new Date().toDateString()}`, String(next))
      setTimeout(() => {
        if (next >= 6) celebrate('objectif_journee', '6 / 6 BLOCS !')
        else if (next === 5) celebrate('objectif_blocs', 'ENCORE UN !')
        else celebrate('appel_passe')
      }, 0)
      return next
    })
  }

  // Counters — source de vérité = DB, localStorage = cache
  const COUNTERS_KEY = `today_counters_${new Date().toDateString()}`
  function loadCounters() {
    try { const s = localStorage.getItem(COUNTERS_KEY); if (s) return JSON.parse(s) } catch { /* ignore */ }
    return { contacts: 0, calls: 0, rdv1: 0, rdv2: 0 }
  }
  const [contacts, setContacts] = useState(0)
  const [calls, setCalls] = useState(0)
  const [rdv1, setRdv1] = useState(0)
  const [rdv2, setRdv2] = useState(0)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialLoadDone = useRef(false)

  // Charger depuis DB au mount
  useEffect(() => {
    fetch('/api/today/kpis')
      .then(r => r.json())
      .then(j => {
        if (j.data?.kpi) {
          setContacts(j.data.kpi.contacts)
          setCalls(j.data.kpi.calls)
          setRdv1(j.data.kpi.rdv1)
          setRdv2(j.data.kpi.rdv2)
          setBlocksCompleted(j.data.kpi.blocks)
        }
        if (j.data?.targets) {
          setTargets(j.data.targets)
          setTargetForm(j.data.targets)
        }
        initialLoadDone.current = true
      })
      .catch(() => {
        const c = loadCounters()
        setContacts(c.contacts); setCalls(c.calls); setRdv1(c.rdv1); setRdv2(c.rdv2)
        initialLoadDone.current = true
      })
  }, [])

  const contactPct = Math.round((contacts / targets.contacts) * 100)
  const callPct    = Math.round((calls    / targets.calls)    * 100)
  const rdv1Pct    = Math.round((rdv1     / targets.rdv1)     * 100)
  const rdv2Pct    = Math.round((rdv2     / targets.rdv2)     * 100)

  // Debounce 2s — sauvegarde DB + localStorage à chaque changement
  useEffect(() => {
    if (!initialLoadDone.current) return
    try { localStorage.setItem(COUNTERS_KEY, JSON.stringify({ contacts, calls, rdv1, rdv2 })) } catch { /* ignore */ }
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      fetch('/api/today/kpis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts, calls, rdv1, rdv2, blocks: blocksCompleted }),
      }).catch(() => {})
    }, 2000)
  }, [contacts, calls, rdv1, rdv2, blocksCompleted])

  // ─── Wrapped setters — déclenchent une célébration quand l'objectif est atteint ──
  const setContactsW = useCallback((fn: (v: number) => number) => {
    setContacts(v => fn(v))
  }, [])

  const setCallsW = useCallback((fn: (v: number) => number) => {
    setCalls(v => {
      const next = fn(v)
      if (v < targets.calls && next >= targets.calls)
        setTimeout(() => celebrate('objectif_blocs', 'OBJECTIF APPELS !'), 50)
      return next
    })
  }, [targets.calls, celebrate])

  const setRdv1W = useCallback((fn: (v: number) => number) => {
    setRdv1(v => {
      const next = fn(v)
      if (v < targets.rdv1 && next >= targets.rdv1)
        setTimeout(() => celebrate('r1', 'OBJECTIF R1 !'), 50)
      return next
    })
  }, [targets.rdv1, celebrate])

  const setRdv2W = useCallback((fn: (v: number) => number) => {
    setRdv2(v => {
      const next = fn(v)
      if (v < targets.rdv2 && next >= targets.rdv2)
        setTimeout(() => celebrate('r2', 'OBJECTIF R2 !'), 50)
      return next
    })
  }, [targets.rdv2, celebrate])

  // ─── Journée parfaite — tous les objectifs atteints ──────────────────────
  useEffect(() => {
    if (
      contacts >= targets.contacts &&
      calls    >= targets.calls &&
      rdv1     >= targets.rdv1 &&
      rdv2     >= targets.rdv2 &&
      !celebratedAllRef.current
    ) {
      celebratedAllRef.current = true
      setTimeout(() => celebrate('journee_parfaite', 'JOURNÉE PARFAITE !'), 300)
    }
  }, [contacts, calls, rdv1, rdv2, targets, celebrate])

  // Reset quand les cibles changent
  useEffect(() => { celebratedAllRef.current = false }, [targets])

  // ─── Sauvegarde des objectifs ─────────────────────────────────────────────
  const saveTargetsToday = () => {
    localStorage.setItem(TARGETS_DAY_KEY(), JSON.stringify(targetForm))
    setTargets(targetForm)
    setShowTargetModal(false)
  }

  const saveTargetsDefault = () => {
    localStorage.setItem(TARGETS_DEF_KEY, JSON.stringify(targetForm))
    localStorage.setItem(TARGETS_DAY_KEY(), JSON.stringify(targetForm))
    setTargets(targetForm)
    setShowTargetModal(false)
  }

  // Relances — persisted in Supabase via /api/today/relances
  const [relances, setRelances] = useState<Relance[]>([])
  const [relancesLoading, setRelancesLoading] = useState(true)
  const [showRelanceModal, setShowRelanceModal] = useState(false)
  const [newRelance, setNewRelance] = useState({ name: '', priority: 1 as 1 | 2 | 3, note: '' })

  // Load relances from DB on mount
  useEffect(() => {
    fetch('/api/today/relances')
      .then(r => r.json())
      .then(j => { if (j.data) setRelances(j.data) })
      .catch(() => {})
      .finally(() => setRelancesLoading(false))
  }, [])

  const addRelance = async () => {
    if (!newRelance.name.trim()) return
    try {
      const res = await fetch('/api/today/relances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRelance.name, priority: newRelance.priority, note: newRelance.note }),
      })
      const j = await res.json()
      if (j.data) setRelances(r => [...r, j.data])
    } catch { /* ignore */ }
    setNewRelance({ name: '', priority: 1, note: '' })
    setShowRelanceModal(false)
  }

  const moveRelance = (id: string, status: RelanceStatus) => {
    setRelances(r => r.map(rel => rel.id === id ? { ...rel, status } : rel))
    // Persist status change
    fetch('/api/today/relances', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    }).catch(() => {})
  }

  const relancesByCol = (col: RelanceStatus) => relances.filter(r => r.status === col)

  const pressureColor: Record<1 | 2 | 3, string> = { 1: C.green, 2: C.gold, 3: C.cyan }

  const tabBtn = (key: TodayTab, label: string) => {
    const active = tab === key
    return (
      <button
        onClick={() => setTab(key)}
        style={{
          flex: 1, padding: 10, borderRadius: '6px 6px 0 0', border: 'none',
          background: active ? '#1a1400' : C.surface1,
          color: active ? C.gold : C.textLo,
          fontSize: 11, fontWeight: active ? 600 : 500, cursor: 'pointer',
          borderBottom: `2px solid ${active ? C.gold : 'transparent'}`,
        }}
      >{label}</button>
    )
  }

  const counterRow = (
    label: string,
    value: number,
    setValue: (fn: (v: number) => number) => void,
    pct: number,
    color: string,
    btnBg: string,
    btnBorder: string,
    objectif: number,
    plusLabel: string,
    fontSize: number,
    emoji: string = '🔥',
  ) => {
    const done = pct >= 100
    return (
    <div>
      <div style={{ fontSize: 8, color: done ? color : C.textLo, marginBottom: 6, fontWeight: done ? 600 : 500 }}>
        {label}{done ? ` ${emoji}` : ''}
      </div>
      <div style={{ textAlign: 'center', margin: '8px 0' }}>
        <div style={{ fontSize: fontSize, fontWeight: 600, color, ...(done ? { filter: `drop-shadow(0 0 8px ${color}90)` } : {}) }}>{value}</div>
        <div style={{ fontSize: 8, color: done ? color : C.textLo }}>{done ? '✓ objectif atteint' : `/ objectif ${objectif}`}</div>
      </div>
      <div style={{ display: 'flex', gap: 3 }}>
        <button
          onClick={() => setValue(v => v + 1)}
          style={{ flex: 1, fontSize: 8, padding: 6, borderRadius: 4, border: `0.5px solid ${btnBorder}`, background: btnBg, color, cursor: 'pointer', fontWeight: 500 }}
        >{plusLabel}</button>
        <button
          onClick={() => setValue(v => Math.max(0, v - 1))}
          style={{ fontSize: 8, padding: '6px 8px', borderRadius: 4, border: `0.5px solid ${C.line}`, background: C.surface1, color: C.textMid, cursor: 'pointer' }}
        >−</button>
      </div>
      <div style={{ background: C.surface1, height: 6, borderRadius: 10, overflow: 'hidden', marginTop: 6 }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color, borderRadius: 10, transition: 'width 0.3s' }} />
      </div>
    </div>
    )
  }

  async function handleEndDay() {
    setEndDaySaving(true)
    try {
      await fetch('/api/today/kpis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts, calls, rdv1, rdv2, blocks: blocksCompleted }),
      })
      setEndDaySaved(true)
      celebrate('objectif_journee', 'JOURNÉE TERMINÉE !')
    } catch { /* ignore */ }
    finally { setEndDaySaving(false) }
  }

  return (
    <div style={{ background: C.bgDeep, minHeight: '100vh', padding: 16, color: C.text, fontFamily: 'JetBrains Mono, monospace' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap')`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.textHi, textTransform: 'capitalize' as const }}>{displayDate}</div>
          <div style={{ fontSize: 9, color: C.textLo, marginTop: 2 }}>Vue du jour · Productivité &amp; Actions</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setShowEndDay(true)}
            style={{ fontSize: 8, padding: '6px 12px', borderRadius: 6, border: `1px solid ${C.gold}55`, background: '#1a1400', color: C.gold, cursor: 'pointer', fontWeight: 600, letterSpacing: 0.5 }}
          >
            ✓ Fin de journée
          </button>
          <div style={{ fontSize: 24, color: C.gold, fontWeight: 300 }}>{clock}</div>
        </div>
      </div>

      {/* ─── WEEKLY SIGNAL ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>

        {/* Section 1 — Relances 7 jours (DATA-06) */}
        <div style={{ background: C.surface1, border: `0.5px solid ${C.line}`, borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 11, fontWeight: 600, color: C.gold, textTransform: 'uppercase', letterSpacing: 1 }}>
              Relances prioritaires
            </div>
            {!signalLoading && !signalError && (
              <div style={{ fontSize: 9, color: C.textMid }}>
                <span style={{ color: signal?.todayCount ? C.warn : C.textLo, fontWeight: signal?.todayCount ? 600 : 400 }}>{signal?.todayCount ?? 0} aujourd&apos;hui</span>
                <span style={{ color: C.textVlo }}> · </span>
                <span>{signal?.relances.length ?? 0} cette semaine</span>
              </div>
            )}
          </div>

          {signalLoading && <div style={{ fontSize: 11, color: C.textLo }}>Chargement signal...</div>}
          {signalError && <div style={{ fontSize: 11, color: C.warn }}>Erreur : {signalError}</div>}

          {!signalLoading && !signalError && (
            <>
              {(signal?.relances.length ?? 0) === 0 ? (
                <div style={{ fontSize: 9, color: C.textLo, fontStyle: 'italic' }}>Aucune relance planifiee dans les 7 prochains jours.</div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {(signal?.relances ?? []).slice(0, 10).map(r => (
                      <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.bgMid, border: `0.5px solid ${C.lineSoft}`, borderRadius: 5, padding: '5px 8px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: C.textHi, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.full_name}</div>
                          {r.profession && <div style={{ fontSize: 9, color: C.textLo }}>{r.profession}</div>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                          {r.pipeline_stage && (
                            <span style={{ fontSize: 7, padding: '2px 5px', borderRadius: 3, background: C.surface2, color: C.textMid, border: `0.5px solid ${C.line}`, textTransform: 'uppercase' }}>
                              {r.pipeline_stage}
                            </span>
                          )}
                          <span style={{ fontSize: 8, padding: '2px 6px', borderRadius: 3, fontWeight: 600, background: r.days_until === 0 ? `${C.warn}20` : '#1a1400', color: r.days_until === 0 ? C.warn : C.gold, border: `0.5px solid ${r.days_until === 0 ? C.warn : C.gold}40` }}>
                            {r.days_until === 0 ? 'AUJOURD\'HUI' : `J+${r.days_until}`}
                          </span>
                          {r.lead_score !== null && (
                            <span style={{ fontSize: 9, fontWeight: 700, color: r.lead_score >= 70 ? C.green : r.lead_score >= 40 ? C.gold : C.textLo }}>
                              {r.lead_score}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {(signal?.relances.length ?? 0) > 10 && (
                    <div style={{ fontSize: 8, color: C.textLo, marginTop: 6, fontStyle: 'italic' }}>+ {(signal?.relances.length ?? 0) - 10} autres</div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Section 2 — RDV de la semaine (DATA-07) */}
        <div style={{ background: C.surface1, border: `0.5px solid ${C.line}`, borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 11, fontWeight: 600, color: C.gold, textTransform: 'uppercase', letterSpacing: 1 }}>
              RDV de la semaine
            </div>
            {!signalLoading && !signalError && (
              <div style={{ fontSize: 9, color: C.textMid }}>{signal?.weekRdvCount ?? 0} RDV cette semaine</div>
            )}
          </div>

          {signalLoading && <div style={{ fontSize: 11, color: C.textLo }}>Chargement signal...</div>}
          {signalError && <div style={{ fontSize: 11, color: C.warn }}>Erreur : {signalError}</div>}

          {!signalLoading && !signalError && (
            <>
              {(signal?.rdvSemaine.length ?? 0) === 0 ? (
                <div style={{ fontSize: 9, color: C.textLo, fontStyle: 'italic' }}>Aucun RDV planifie cette semaine. Cree des interactions de type rdv1/rdv2/rdv3.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {(signal?.rdvSemaine ?? []).map(rdv => {
                    const rdvColor = rdv.type === 'rdv1' ? C.indigo : rdv.type === 'rdv2' ? C.green : C.gold
                    return (
                      <div key={rdv.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.bgMid, border: `0.5px solid ${C.lineSoft}`, borderRadius: 5, padding: '5px 8px' }}>
                        <div style={{ flexShrink: 0 }}>
                          <div style={{ fontSize: 9, color: C.gold, fontWeight: 600 }}>{rdv.day_label}</div>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: C.textHi, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rdv.prospect_name}</div>
                          {rdv.profession && <div style={{ fontSize: 9, color: C.textLo }}>{rdv.profession}</div>}
                        </div>
                        <span style={{ fontSize: 7, padding: '2px 5px', borderRadius: 3, fontWeight: 700, background: `${rdvColor}15`, color: rdvColor, border: `0.5px solid ${rdvColor}40`, textTransform: 'uppercase', flexShrink: 0 }}>
                          {rdv.type.toUpperCase()}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>

      </div>

      {/* Tab bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6, borderBottom: `0.5px solid ${C.line}`, paddingBottom: 8 }}>
          {tabBtn('prospection', '📊 Prospection')}
          {tabBtn('relances', '📞 Relances')}
        </div>
      </div>

      {/* ─── PROSPECTION ─── */}
      {tab === 'prospection' && (
        <div>
          {/* KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>
            {([
              { label: 'Nouveaux contacts', value: `${contacts}/${targets.contacts}`,  sub: 'Prospects ajoutés aujourd\'hui', subColor: C.gold,    done: contacts >= targets.contacts },
              { label: 'Appels effectués',  value: `${calls} calls`,                   sub: `Objectif ${targets.calls}/jour`, subColor: C.green,   done: calls >= targets.calls },
              { label: 'Blocs production',  value: `${blocksCompleted}/6`,             sub: `${Math.round((blocksCompleted / 6) * 100)}% · Production normale`, subColor: C.textMid, done: blocksCompleted >= 6 },
              { label: 'Temps productif',   value: `${blocksCompleted}×52min`,         sub: '3 blocs × 52min',               subColor: C.gold,    done: false },
            ] as Array<{ label: string; value: string; sub: string; subColor: string; done: boolean }>).map(({ label, value, sub, subColor, done }) => (
              <div key={label} style={{ background: C.surface1, border: `0.5px solid ${done ? subColor + '60' : C.line}`, borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 9, color: done ? subColor : C.textMid, marginBottom: 4, fontWeight: done ? 600 : 400 }}>{label}{done ? ' 🔥' : ''}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.textHi, marginBottom: 4, ...(done ? { filter: `drop-shadow(0 0 6px ${subColor}80)` } : {}) }}>{value}</div>
                <div style={{ fontSize: 9, color: subColor }}>{sub}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

            {/* LEFT COLUMN */}
            <div style={{ minWidth: 0 }}>
              <div style={{ background: C.surface1, border: `0.5px solid ${C.line}`, borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.textHi, marginBottom: 12 }}>Chronomètre de production · Blocs 52min</div>

                {/* Timer display */}
                <div style={{ textAlign: 'center', margin: '15px 0 10px' }}>
                  <div style={{ fontSize: 38, fontWeight: 300, color: C.gold, fontVariantNumeric: 'tabular-nums', letterSpacing: 1, fontFamily: 'JetBrains Mono,monospace' }}>
                    {formatCentis(timerSec)}
                  </div>
                  <div style={{ fontSize: 9, color: C.textLo, marginTop: 6 }}>
                    Bloc {blocksCompleted + (timerSec > 0 ? 1 : 0)}/6 · {timerRunning ? 'En cours' : 'En pause'}
                  </div>
                </div>

                {/* Timer buttons */}
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 10 }}>
                  <button onClick={startTimer} style={{ fontSize: 9, padding: '6px 12px', borderRadius: 4, border: `0.5px solid ${C.gold}40`, background: '#1a1400', color: C.gold, cursor: 'pointer', fontWeight: 500 }}>▶ Start</button>
                  <button onClick={pauseTimer} style={{ fontSize: 9, padding: '6px 12px', borderRadius: 4, border: `0.5px solid ${C.line}`, background: C.surface1, color: C.textMid, cursor: 'pointer' }}>⏸ Pause</button>
                  <button onClick={completeBlock} style={{ fontSize: 9, padding: '6px 12px', borderRadius: 4, border: `0.5px solid ${C.green}40`, background: '#0d1f0f', color: C.green, cursor: 'pointer', fontWeight: 500 }}>✓ Terminé</button>
                </div>

                {/* Block indicators */}
                <div style={{ display: 'flex', gap: 5 }}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <BlockIndicator key={i} done={i < blocksCompleted} />
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 7, color: C.textVlo }}>
                  <span>Normal (4)</span>
                  <span>Grosse prod (6)</span>
                </div>

                {/* Objectifs du jour */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 14, borderTop: `0.5px solid ${C.line}` }}>
                  <div style={{ fontSize: 9, color: C.textMid, fontWeight: 500 }}>Objectifs du jour</div>
                  <button onClick={() => { setTargetForm(targets); setShowTargetModal(true) }} style={{ fontSize: 8, padding: '5px 10px', borderRadius: 4, border: `0.5px solid ${C.gold}40`, background: '#1a1400', color: C.gold, cursor: 'pointer', fontWeight: 500 }}>⚙️ Paramétrer</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                  {counterRow('Nouveaux contacts', contacts, setContactsW, contactPct, C.gold,    '#1a1400', `${C.gold}40`,    targets.contacts, '+ Contact', 36, '🔥')}
                  {counterRow('Appels effectués', calls,    setCallsW,    callPct,    C.indigo,  '#0d1a2e', `${C.indigo}40`,  targets.calls,    '+ Appel',   36, '🔥')}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
                  {counterRow('RDV R1 posés', rdv1, setRdv1W, rdv1Pct, C.green,   '#0d1a0d', `${C.green}40`,   targets.rdv1, '+ RDV R1', 28, '🚀')}
                  {counterRow('RDV R2 posés', rdv2, setRdv2W, rdv2Pct, '#b07aee', '#1a0d1a', '#b07aee40',      targets.rdv2, '+ RDV R2', 28, '🚀')}
                </div>

                {/* Audio player */}
                <AudioPlayer />
              </div>
            </div>

            {/* RIGHT COLUMN — Agenda */}
            <div style={{ minWidth: 0 }}>
              <div style={{ background: C.surface1, border: `0.5px solid ${C.line}`, borderRadius: 8, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: C.textHi, textTransform: 'capitalize' as const }}>Agenda · {displayDate}</div>
                  <button
                    onClick={() => setShowAgendaModal(true)}
                    style={{ fontSize: 8, padding: '5px 10px', borderRadius: 5, border: `0.5px solid ${C.indigo}40`, background: '#0d1a2e', color: C.indigo, cursor: 'pointer', fontWeight: 500 }}
                  >+ Événement</button>
                </div>

                {agendaEvents.length === 0 ? (
                  <div style={{ fontSize: 9, color: C.textVlo, fontStyle: 'italic', textAlign: 'center', padding: '24px 0' }}>
                    Aucun événement · Clique &quot;+ Événement&quot; pour ajouter
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[...agendaEvents].sort((a, b) => a.time.localeCompare(b.time)).map(ev => {
                      const colors = AGENDA_COLORS[ev.type]
                      return (
                        <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: colors.bg, border: `0.5px solid ${colors.border}`, borderRadius: 6, padding: '6px 10px' }}>
                          <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: colors.text, width: 36, flexShrink: 0 }}>{ev.time}</span>
                          <span style={{ fontSize: 10, color: C.textHi, flex: 1 }}>{ev.title}</span>
                          <a
                            href={fantasticalUrl(ev, todayDateKey())}
                            style={{ fontSize: 10, textDecoration: 'none', color: C.textVlo, cursor: 'pointer', padding: '0 2px' }}
                            title="Ouvrir dans Fantastical"
                          >📲</a>
                          <button
                            onClick={() => {
                              setAgendaEvents(prev => prev.filter(e => e.id !== ev.id))
                              fetch(`/api/today/agenda?id=${ev.id}`, { method: 'DELETE' }).catch(() => {})
                            }}
                            style={{ background: 'none', border: 'none', color: C.textVlo, cursor: 'pointer', fontSize: 10, padding: '0 2px' }}
                          >✕</button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* VideoPlayer — motivation */}
              <VideoPlayer />
            </div>
          </div>

          {/* Session d'appels — remplace Script hardcodé + Objections + Liste ONOFF */}
          <CallingSessionPanel />
        </div>
      )}

      {/* ─── RELANCES ─── */}
      {tab === 'relances' && (
        <div>
          {relancesLoading && <div style={{ fontSize: 11, color: C.textLo, marginBottom: 12 }}>Chargement des relances...</div>}
          {/* KPI + add button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, flex: 1 }}>
              {([
                { label: 'Relances actives', value: relances.filter(r => r.status !== 'terminee').length, sub: 'Cette semaine', subColor: C.gold },
                { label: 'Haute priorité',   value: relances.filter(r => r.priority === 3).length, sub: 'URGENT',         subColor: C.cyan },
                { label: 'Appelées',          value: relances.filter(r => r.status === 'appelee').length, sub: 'Ce mois',   subColor: C.green },
                { label: 'Temps estimé',      value: '52min',                                       sub: 'Total jour',    subColor: C.gold },
              ] as Array<{ label: string; value: string | number; sub: string; subColor: string }>).map(({ label, value, sub, subColor }) => (
                <div key={label} style={{ background: C.surface1, border: `0.5px solid ${C.line}`, borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 9, color: C.textMid, marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: C.textHi, marginBottom: 4 }}>{value}</div>
                  <div style={{ fontSize: 9, color: subColor }}>{sub}</div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowRelanceModal(true)}
              style={{ marginLeft: 12, padding: '6px 14px', background: '#0d1f0f', border: `1px solid ${C.green}`, color: C.green, borderRadius: 6, fontSize: 9, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >➕ Nouvelle relance</button>
          </div>

          {/* Pressure legend */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 10, fontSize: 8, color: C.textMid }}>
            <span><PressureDots n={1} color={C.green} /> Normal (1)</span>
            <span><PressureDots n={2} color={C.gold} /> Moyen (2)</span>
            <span><PressureDots n={3} color={C.cyan} /> Urgent (3)</span>
          </div>

          {/* Kanban board */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            {COLUMNS.map(col => (
              <div key={col.key} style={{ background: C.surface1, border: `0.5px solid ${C.line}`, borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ background: C.surface2, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `0.5px solid ${C.line}` }}>
                  <span style={{ fontSize: 9, fontWeight: 600, color: col.color }}>{col.label}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.textHi, background: C.bgDeep, borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {relancesByCol(col.key).length}
                  </span>
                </div>
                <div style={{ padding: 8, minHeight: 100 }}>
                  {relancesByCol(col.key).length === 0 && (
                    <div style={{ fontSize: 8, color: C.textVlo, fontStyle: 'italic', padding: '8px 4px' }}>Aucune relance</div>
                  )}
                  {relancesByCol(col.key).map(rel => (
                    <div key={rel.id} style={{ background: C.bgMid, border: `0.5px solid ${C.line}`, borderRadius: 6, padding: 8, marginBottom: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                        <div style={{ fontSize: 9, color: C.textHi, fontWeight: 600 }}>{rel.name}</div>
                        <PressureDots n={rel.priority} color={pressureColor[rel.priority]} />
                      </div>
                      {rel.note && <div style={{ fontSize: 7, color: C.textMid, marginBottom: 4 }}>{rel.note}</div>}
                      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                        {COLUMNS.filter(c => c.key !== col.key).map(c => (
                          <button
                            key={c.key}
                            onClick={() => moveRelance(rel.id, c.key)}
                            style={{ fontSize: 6, padding: '2px 5px', borderRadius: 3, border: `0.5px solid ${c.color}40`, background: 'transparent', color: c.color, cursor: 'pointer' }}
                          >→ {c.label}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Modal objectifs du jour ─── */}
      {showTargetModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: C.bgMid, border: `1px solid ${C.gold}30`, borderRadius: 14, padding: 28, width: 340, boxShadow: `0 8px 40px rgba(0,0,0,0.6)` }}>
            <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 14, fontWeight: 700, color: C.gold, marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              ⚙ Objectifs du jour
            </div>
            <div style={{ fontSize: 8, color: C.textVlo, marginBottom: 20 }}>
              Ajustez vos cibles selon votre journée
            </div>

            {([
              { key: 'contacts' as const, label: 'Nouveaux contacts', color: C.gold   },
              { key: 'calls'    as const, label: 'Appels effectués',  color: C.indigo },
              { key: 'rdv1'     as const, label: 'RDV R1 posés',      color: C.green  },
              { key: 'rdv2'     as const, label: 'RDV R2+ posés',     color: '#b07aee'},
            ]).map(({ key, label, color }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 8, color: C.textLo, marginBottom: 6 }}>{label}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    onClick={() => setTargetForm(f => ({ ...f, [key]: Math.max(1, f[key] - 1) }))}
                    style={{ width: 32, height: 32, borderRadius: 6, border: `0.5px solid ${C.line}`, background: C.surface1, color: C.textMid, cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
                  >−</button>
                  <div style={{ flex: 1, textAlign: 'center', fontSize: 26, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
                    {targetForm[key]}
                  </div>
                  <button
                    onClick={() => setTargetForm(f => ({ ...f, [key]: f[key] + 1 }))}
                    style={{ width: 32, height: 32, borderRadius: 6, border: `0.5px solid ${color}50`, background: `${color}12`, color, cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
                  >+</button>
                  <div style={{ width: 60, height: 5, background: C.surface2, borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min((targetForm[key] / 30) * 100, 100)}%`, height: '100%', background: color, borderRadius: 10 }} />
                  </div>
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', gap: 8, marginTop: 22 }}>
              <button onClick={() => setShowTargetModal(false)}
                style={{ flex: 1, padding: 9, borderRadius: 6, border: `0.5px solid ${C.line}`, background: C.surface1, color: C.textMid, fontSize: 9, cursor: 'pointer' }}>
                Annuler
              </button>
              <button onClick={saveTargetsToday}
                style={{ flex: 1, padding: 9, borderRadius: 6, border: `0.5px solid ${C.gold}40`, background: '#1a1400', color: C.gold, fontSize: 9, cursor: 'pointer', fontWeight: 600 }}>
                Aujourd'hui
              </button>
              <button onClick={saveTargetsDefault}
                style={{ flex: 1, padding: 9, borderRadius: 6, border: `0.5px solid ${C.indigo}40`, background: '#0d1020', color: C.indigo, fontSize: 9, cursor: 'pointer', fontWeight: 600 }}>
                Par défaut
              </button>
            </div>
            <div style={{ marginTop: 10, fontSize: 7, color: C.textVlo, textAlign: 'center', lineHeight: 1.5 }}>
              "Aujourd'hui" · pour cette journée uniquement
              <br />"Par défaut" · réutilisé les prochains jours
            </div>
          </div>
        </div>
      )}

      {/* ─── Relance modal ─── */}
      {showRelanceModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: C.bgMid, border: `1px solid ${C.line}`, borderRadius: 12, padding: 24, width: 360 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.textHi, marginBottom: 16 }}>➕ Nouvelle relance</div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 8, color: C.textLo, display: 'block', marginBottom: 4 }}>Nom du prospect</label>
              <input
                type="text"
                value={newRelance.name}
                onChange={e => setNewRelance(r => ({ ...r, name: e.target.value }))}
                placeholder="Nom Prénom"
                style={{ width: '100%', padding: 8, background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textHi, fontSize: 12, boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 8, color: C.textLo, display: 'block', marginBottom: 4 }}>Priorité</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {([1,2,3] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setNewRelance(r => ({ ...r, priority: p }))}
                    style={{ flex: 1, padding: 6, borderRadius: 6, border: `1px solid ${newRelance.priority === p ? pressureColor[p] : C.line}`, background: newRelance.priority === p ? `${pressureColor[p]}20` : C.surface1, color: pressureColor[p], cursor: 'pointer', fontSize: 9 }}
                  >
                    <PressureDots n={p} color={pressureColor[p]} /> {p === 1 ? 'Normal' : p === 2 ? 'Moyen' : 'Urgent'}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 8, color: C.textLo, display: 'block', marginBottom: 4 }}>Note (optionnel)</label>
              <input
                type="text"
                value={newRelance.note}
                onChange={e => setNewRelance(r => ({ ...r, note: e.target.value }))}
                placeholder="Contexte, heure souhaitée..."
                style={{ width: '100%', padding: 8, background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textHi, fontSize: 11, boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowRelanceModal(false)}
                style={{ flex: 1, padding: 10, background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textMid, cursor: 'pointer', fontSize: 10 }}
              >Annuler</button>
              <button
                onClick={addRelance}
                style={{ flex: 2, padding: 10, background: '#0d1f0f', border: `1px solid ${C.green}`, borderRadius: 6, color: C.green, cursor: 'pointer', fontSize: 10, fontWeight: 600 }}
              >Créer la relance</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal agenda */}
      {showAgendaModal && (
        <div onClick={() => setShowAgendaModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.bgMid, border: `1px solid ${C.indigo}30`, borderRadius: 14, padding: 24, width: '100%', maxWidth: 380 }}>
            <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 14, fontWeight: 600, color: C.indigo, marginBottom: 18 }}>📅 Nouvel événement</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 5 }}>Heure</label>
                <input type="time" value={agendaForm.time} onChange={e => setAgendaForm(f => ({ ...f, time: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textHi, fontSize: 12, boxSizing: 'border-box' as const }} />
              </div>
              <div>
                <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 5 }}>Type</label>
                <select value={agendaForm.type} onChange={e => setAgendaForm(f => ({ ...f, type: e.target.value as AgendaEventType }))}
                  style={{ width: '100%', padding: '8px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textHi, fontSize: 11 }}>
                  <option value="rdv">🔵 RDV</option>
                  <option value="bloc">🟢 Bloc production</option>
                  <option value="tache">⚪ Tâche</option>
                  <option value="sport">🔴 Sport</option>
                  <option value="commerce">🟡 Commerce</option>
                  <option value="interpro">🟡 Interpro</option>
                  <option value="autre">⚫ Autre</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 5 }}>Titre *</label>
              <input autoFocus type="text" value={agendaForm.title} onChange={e => setAgendaForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: RDV Dr. Martin, Bloc appels TNS..."
                style={{ width: '100%', padding: '8px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textHi, fontSize: 11, fontFamily: 'JetBrains Mono,monospace', boxSizing: 'border-box' as const }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowAgendaModal(false)} style={{ flex: 1, padding: 10, borderRadius: 8, background: C.surface1, border: `1px solid ${C.line}`, color: C.textLo, fontFamily: 'Oswald,sans-serif', fontSize: 11, cursor: 'pointer' }}>ANNULER</button>
              <button
                onClick={async () => {
                  if (!agendaForm.title.trim()) return
                  try {
                    const res = await fetch('/api/today/agenda', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ title: agendaForm.title.trim(), time: agendaForm.time, type: agendaForm.type, date: todayDateKey() }),
                    })
                    const j = await res.json()
                    if (j.data) {
                      setAgendaEvents(prev => [...prev, j.data])
                    }
                  } catch {
                    // Fallback: add locally
                    const next = [...agendaEvents, { id: Date.now().toString(), time: agendaForm.time, title: agendaForm.title.trim(), type: agendaForm.type }]
                    setAgendaEvents(next)
                    saveDayAgenda(todayDateKey(), next)
                  }
                  setAgendaForm(f => ({ ...f, title: '' }))
                  setShowAgendaModal(false)
                }}
                disabled={!agendaForm.title.trim()}
                style={{ flex: 2, padding: 10, borderRadius: 8, background: '#0d1a2e', border: `1px solid ${C.indigo}66`, color: C.indigo, fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 600, cursor: agendaForm.title.trim() ? 'pointer' : 'not-allowed', opacity: agendaForm.title.trim() ? 1 : 0.6 }}
              >AJOUTER</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal fin de journée */}
      {showEndDay && (
        <div onClick={() => { if (!endDaySaving) setShowEndDay(false) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.bgMid, border: `1px solid ${C.gold}55`, borderRadius: 16, padding: 28, width: '100%', maxWidth: 380, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: C.ribbon, borderRadius: '16px 16px 0 0' }} />
            <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 18, fontWeight: 700, color: C.gold, marginBottom: 20, marginTop: 4 }}>Bilan de journée</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Contacts', value: contacts, target: targets.contacts, color: C.green },
                { label: 'Appels',   value: calls,    target: targets.calls,    color: C.cyan  },
                { label: 'RDV R1',   value: rdv1,     target: targets.rdv1,     color: C.gold  },
                { label: 'RDV R2',   value: rdv2,     target: targets.rdv2,     color: C.gold  },
              ].map(({ label, value, target, color }) => (
                <div key={label} style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: C.textLo, marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: 1 }}>{label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: value >= target ? color : C.textMid }}>{value}</div>
                  <div style={{ fontSize: 8, color: C.textLo }}>/ {target}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: C.textMid, marginBottom: 20, textAlign: 'center' }}>
              {blocksCompleted} bloc{blocksCompleted > 1 ? 's' : ''} de travail complété{blocksCompleted > 1 ? 's' : ''}
            </div>
            {endDaySaved ? (
              <div style={{ textAlign: 'center', color: C.green, fontSize: 13, fontWeight: 600 }}>✓ Données sauvegardées</div>
            ) : (
              <button
                onClick={handleEndDay}
                disabled={endDaySaving}
                style={{ width: '100%', padding: '12px 0', borderRadius: 8, border: `1px solid ${C.gold}`, background: `${C.gold}22`, color: C.gold, fontSize: 12, fontWeight: 700, cursor: endDaySaving ? 'not-allowed' : 'pointer', fontFamily: 'Oswald,sans-serif', letterSpacing: 1 }}
              >
                {endDaySaving ? '...' : 'SAUVEGARDER & TERMINER'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
