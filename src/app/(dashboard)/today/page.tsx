'use client'

import { useState, useEffect, useRef } from 'react'
import { C } from '@/lib/theme'

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
  id: number; name: string; priority: 1 | 2 | 3; status: RelanceStatus; note?: string
}

const BLOCK_DURATION = 45 * 60 // 45 minutes in seconds

function pad(n: number) { return String(n).padStart(2, '0') }
function formatSeconds(s: number) { return `${pad(Math.floor(s / 60))}:${pad(s % 60)}` }

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

  const clear = () => {
    playlist.forEach(t => URL.revokeObjectURL(t.url))
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

        {/* Zone vidéo — video toujours monté, ref toujours valide */}
        <div style={{ width: '100%', height: 200, background: '#000', borderRadius: 5, marginBottom: 8, overflow: 'hidden', position: 'relative' }}>
          <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'contain', display: hasTrack ? 'block' : 'none' }} />
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

// ─── Main page ────────────────────────────────────────────────────────────
export default function TodayPage() {
  const [tab, setTab] = useState<TodayTab>('prospection')
  const [clock, setClock] = useState('--:--')

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

  // Block timer
  const [timerSec, setTimerSec] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const [blocksCompleted, setBlocksCompleted] = useState(3)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startTimer = () => {
    if (timerRunning) return
    setTimerRunning(true)
    timerRef.current = setInterval(() => {
      setTimerSec(s => {
        if (s + 1 >= BLOCK_DURATION) {
          clearInterval(timerRef.current!)
          setTimerRunning(false)
          setBlocksCompleted(b => Math.min(b + 1, 6))
          return 0
        }
        return s + 1
      })
    }, 1000)
  }

  const pauseTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setTimerRunning(false)
  }

  const completeBlock = () => {
    pauseTimer()
    setTimerSec(0)
    setBlocksCompleted(b => Math.min(b + 1, 6))
  }

  // Counters
  const [contacts, setContacts] = useState(6)
  const [calls, setCalls] = useState(14)
  const [rdv1, setRdv1] = useState(3)
  const [rdv2, setRdv2] = useState(2)

  const contactPct = Math.round((contacts / 10) * 100)
  const callPct    = Math.round((calls / 20)     * 100)
  const rdv1Pct    = Math.round((rdv1 / 5)       * 100)
  const rdv2Pct    = Math.round((rdv2 / 3)       * 100)

  // Script tabs
  const [scriptTab, setScriptTab] = useState<'tns' | 'chef' | 'particulier'>('tns')
  const scripts: Record<string, string> = {
    tns: `Bonjour, je suis [Prénom] du cabinet [Nom].\n\nJe contacte les professionnels indépendants pour un audit patrimonial gratuit...\n\n→ Êtes-vous ouvert à un échange de 20 minutes cette semaine ?`,
    chef: `Bonjour, je suis [Prénom] du cabinet [Nom].\n\nNous accompagnons les chefs d'entreprise dans l'optimisation de leur rémunération et fiscalité...\n\n→ Seriez-vous disponible pour une présentation rapide ?`,
    particulier: `Bonjour, je suis [Prénom] du cabinet [Nom].\n\nNous aidons les particuliers à optimiser leur épargne et préparer leur retraite...\n\n→ Un échange de 15 minutes vous conviendrait-il ?`,
  }

  // Relances
  const [relances, setRelances] = useState<Relance[]>([])
  const [showRelanceModal, setShowRelanceModal] = useState(false)
  const [newRelance, setNewRelance] = useState({ name: '', priority: 1 as 1 | 2 | 3, note: '' })

  const addRelance = () => {
    if (!newRelance.name.trim()) return
    setRelances(r => [...r, { id: Date.now(), name: newRelance.name, priority: newRelance.priority, status: 'arappeler', note: newRelance.note }])
    setNewRelance({ name: '', priority: 1, note: '' })
    setShowRelanceModal(false)
  }

  const moveRelance = (id: number, status: RelanceStatus) => {
    setRelances(r => r.map(rel => rel.id === id ? { ...rel, status } : rel))
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
  ) => (
    <div>
      <div style={{ fontSize: 8, color: C.textLo, marginBottom: 6, fontWeight: 500 }}>{label}</div>
      <div style={{ textAlign: 'center', margin: '8px 0' }}>
        <div style={{ fontSize: fontSize, fontWeight: 600, color }}>{value}</div>
        <div style={{ fontSize: 8, color: C.textLo }}>/ objectif {objectif}</div>
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

  return (
    <div style={{ background: C.bgDeep, minHeight: '100vh', padding: 16, color: C.text, fontFamily: 'JetBrains Mono, monospace' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap')`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.textHi }}>Vendredi 25 avril 2026</div>
          <div style={{ fontSize: 9, color: C.textLo, marginTop: 2 }}>Vue du jour · Productivité &amp; Actions</div>
        </div>
        <div style={{ fontSize: 24, color: C.gold, fontWeight: 300 }}>{clock}</div>
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
              { label: 'Nouveaux contacts', value: `${contacts}/10`,       sub: 'Prospects ajoutés aujourd\'hui', subColor: C.gold  },
              { label: 'Appels effectués',  value: `${calls} calls`,       sub: 'Objectif 20/jour',               subColor: C.green },
              { label: 'Blocs production',  value: `${blocksCompleted}/6`, sub: `${Math.round((blocksCompleted / 6) * 100)}% · Production normale`, subColor: C.textMid },
              { label: 'Temps productif',   value: `${blocksCompleted}×45min`, sub: '3 blocs × 45min',            subColor: C.gold  },
            ] as Array<{ label: string; value: string; sub: string; subColor: string }>).map(({ label, value, sub, subColor }) => (
              <div key={label} style={{ background: C.surface1, border: `0.5px solid ${C.line}`, borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 9, color: C.textMid, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.textHi, marginBottom: 4 }}>{value}</div>
                <div style={{ fontSize: 9, color: subColor }}>{sub}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

            {/* LEFT COLUMN */}
            <div style={{ minWidth: 0 }}>
              <div style={{ background: C.surface1, border: `0.5px solid ${C.line}`, borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.textHi, marginBottom: 12 }}>Chronomètre de production · Blocs 45min</div>

                {/* Timer display */}
                <div style={{ textAlign: 'center', margin: '15px 0 10px' }}>
                  <div style={{ fontSize: 42, fontWeight: 300, color: C.gold, fontVariantNumeric: 'tabular-nums', letterSpacing: 2 }}>
                    {formatSeconds(timerSec)}
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
                  <button style={{ fontSize: 8, padding: '5px 10px', borderRadius: 4, border: `0.5px solid ${C.gold}40`, background: '#1a1400', color: C.gold, cursor: 'pointer', fontWeight: 500 }}>⚙️ Paramétrer</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                  {counterRow('Nouveaux contacts', contacts, setContacts, contactPct, C.gold, '#1a1400', `${C.gold}40`, 10, '+ Contact', 36)}
                  {counterRow('Appels effectués', calls, setCalls, callPct, C.indigo, '#0d1a2e', `${C.indigo}40`, 20, '+ Appel', 36)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
                  {counterRow('RDV R1 posés', rdv1, setRdv1, rdv1Pct, C.green, '#0d1a0d', `${C.green}40`, 5, '+ RDV R1', 28)}
                  {counterRow('RDV R2 posés', rdv2, setRdv2, rdv2Pct, '#b07aee', '#1a0d1a', '#b07aee40', 3, '+ RDV R2', 28)}
                </div>

                {/* Audio player */}
                <AudioPlayer />
              </div>
            </div>

            {/* RIGHT COLUMN — Agenda */}
            <div style={{ minWidth: 0 }}>
              <div style={{ background: C.surface1, border: `0.5px solid ${C.line}`, borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.textHi, marginBottom: 12 }}>Agenda du jour · Vendredi 25 avril</div>

                <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr', gap: 0, border: `0.5px solid ${C.surface2}`, borderRadius: 7, overflow: 'hidden', background: C.surface1 }}>
                  {/* 8h */}
                  <div style={{ background: C.surface2, padding: 4, textAlign: 'center', fontSize: 8, color: C.textVlo, borderRight: `0.5px solid ${C.line}`, borderBottom: `0.5px solid ${C.lineSoft}` }}>8h</div>
                  <div style={{ background: C.bgMid, minHeight: 40, borderBottom: `0.5px solid ${C.lineSoft}`, padding: 4 }} />

                  {/* 9h — Prospection TNS */}
                  <div style={{ background: C.surface2, padding: 4, textAlign: 'center', fontSize: 8, color: C.textVlo, borderRight: `0.5px solid ${C.line}`, borderBottom: `0.5px solid ${C.lineSoft}` }}>9h</div>
                  <div style={{ background: C.bgMid, minHeight: 40, borderBottom: `0.5px solid ${C.lineSoft}`, padding: 4, position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 2, left: 2, right: 2, height: 58, background: '#1a1400', borderLeft: `2px solid ${C.gold}`, borderRadius: 3, padding: '3px 5px' }}>
                      <div style={{ fontSize: 7, color: C.textLo }}>9h00-10h30</div>
                      <div style={{ fontSize: 8, color: C.text, fontWeight: 500 }}>Prospection TNS</div>
                    </div>
                  </div>

                  {/* 10h */}
                  <div style={{ background: C.surface2, padding: 4, textAlign: 'center', fontSize: 8, color: C.textVlo, borderRight: `0.5px solid ${C.line}`, borderBottom: `0.5px solid ${C.lineSoft}` }}>10h</div>
                  <div style={{ background: C.bgMid, minHeight: 40, borderBottom: `0.5px solid ${C.lineSoft}`, padding: 4 }} />

                  {/* 11h — RDV 2 Dr. Martin */}
                  <div style={{ background: C.surface2, padding: 4, textAlign: 'center', fontSize: 8, color: C.textVlo, borderRight: `0.5px solid ${C.line}`, borderBottom: `0.5px solid ${C.lineSoft}` }}>11h</div>
                  <div style={{ background: C.bgMid, minHeight: 40, borderBottom: `0.5px solid ${C.lineSoft}`, padding: 4, position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 2, left: 2, right: 2, height: 38, background: '#0d1a2e', borderLeft: `2px solid ${C.indigo}`, borderRadius: 3, padding: '3px 5px' }}>
                      <div style={{ fontSize: 7, color: C.textLo }}>11h00-12h00</div>
                      <div style={{ fontSize: 8, color: C.text, fontWeight: 500 }}>RDV 2</div>
                      <div style={{ fontSize: 7, color: C.textMid }}>Dr. Martin</div>
                    </div>
                  </div>

                  {/* 12h–17h */}
                  {['12h','13h','14h','15h','16h'].map((h, i) => (
                    <>
                      <div key={`h${h}`} style={{ background: C.surface2, padding: 4, textAlign: 'center', fontSize: 8, color: C.textVlo, borderRight: `0.5px solid ${C.line}`, borderBottom: `0.5px solid ${C.lineSoft}` }}>{h}</div>
                      <div key={`c${h}`} style={{ background: C.bgMid, minHeight: 40, borderBottom: `0.5px solid ${C.lineSoft}`, padding: 4 }} />
                    </>
                  ))}

                  {/* 17h — last row no border-bottom */}
                  <div style={{ background: C.surface2, padding: 4, textAlign: 'center', fontSize: 8, color: C.textVlo, borderRight: `0.5px solid ${C.line}` }}>17h</div>
                  <div style={{ background: C.bgMid, minHeight: 40, padding: 4 }} />
                </div>
              </div>

              {/* VideoPlayer — motivation */}
              <VideoPlayer />
            </div>
          </div>

          {/* Script d'appel */}
          <div style={{ background: C.surface1, border: `0.5px solid ${C.line}`, borderRadius: 8, padding: 14, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.textHi }}>Script d'appel</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {(['tns','chef','particulier'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setScriptTab(s)}
                    style={{
                      fontSize: 8, padding: '3px 8px', borderRadius: 10,
                      background: scriptTab === s ? '#1a1400' : C.surface1,
                      color: scriptTab === s ? C.gold : C.textLo,
                      border: `0.5px solid ${scriptTab === s ? `${C.gold}40` : C.line}`,
                      cursor: 'pointer',
                    }}
                  >{s === 'tns' ? 'TNS' : s === 'chef' ? 'Chef' : 'Particulier'}</button>
                ))}
              </div>
            </div>
            <div style={{ fontSize: 10, color: C.text, lineHeight: 1.7, padding: 12, background: C.bgMid, borderRadius: 5, border: `0.5px solid ${C.lineSoft}`, minHeight: 120, whiteSpace: 'pre-wrap' }}>
              {scripts[scriptTab]}
            </div>
          </div>

          {/* Objections */}
          <div style={{ background: C.surface1, border: `0.5px solid ${C.line}`, borderRadius: 8, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: C.textHi, marginBottom: 6 }}>Objections &amp; Réponses</div>
            <div style={{ fontSize: 8, color: C.textMid, marginBottom: 8 }}>Top 5 objections avec réponses types</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { obj: 'Je n\'ai pas le temps', rep: 'Justement, notre audit vous fera gagner du temps sur le long terme. 20 minutes suffisent.' },
                { obj: 'Je travaille déjà avec quelqu\'un', rep: 'Parfait, un second avis est toujours utile. Nous offrons un diagnostic complémentaire gratuit.' },
                { obj: 'Ce n\'est pas le bon moment', rep: 'Quand serait un bon moment pour vous ? Je m\'adapte à votre agenda.' },
                { obj: 'Ça ne m\'intéresse pas', rep: 'Je comprends. Puis-je vous demander ce qui vous permettrait d\'être intéressé ?' },
                { obj: 'C\'est trop cher', rep: 'Notre consultation initiale est entièrement gratuite. Vous n\'avez rien à perdre.' },
              ].map(({ obj, rep }, i) => (
                <div key={i} style={{ background: C.bgMid, border: `0.5px solid ${C.line}`, borderRadius: 6, padding: '8px 10px' }}>
                  <div style={{ fontSize: 8, color: C.cyan, fontWeight: 600, marginBottom: 3 }}>❓ {obj}</div>
                  <div style={{ fontSize: 8, color: C.textMid, lineHeight: 1.5 }}>💬 {rep}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Liste appels ONOFF */}
          <div style={{ background: C.surface1, border: `0.5px solid ${C.line}`, borderRadius: 8, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.textHi }}>Liste d'appels ONOFF</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {['TNS','Chefs','Particuliers'].map(f => (
                  <button key={f} style={{ fontSize: 8, padding: '3px 8px', borderRadius: 10, background: f === 'TNS' ? '#1a1400' : C.surface1, color: f === 'TNS' ? C.gold : C.textLo, border: `0.5px solid ${f === 'TNS' ? `${C.gold}40` : C.line}`, cursor: 'pointer' }}>{f}</button>
                ))}
              </div>
            </div>
            <div style={{ color: C.textLo, fontSize: 9, fontStyle: 'italic' }}>Liste générée dynamiquement depuis vos contacts ONOFF.</div>
          </div>
        </div>
      )}

      {/* ─── RELANCES ─── */}
      {tab === 'relances' && (
        <div>
          {/* KPI + add button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, flex: 1 }}>
              {([
                { label: 'Relances actives', value: relances.filter(r => r.status !== 'terminee').length, sub: 'Cette semaine', subColor: C.gold },
                { label: 'Haute priorité',   value: relances.filter(r => r.priority === 3).length, sub: 'URGENT',         subColor: C.cyan },
                { label: 'Appelées',          value: relances.filter(r => r.status === 'appelee').length, sub: 'Ce mois',   subColor: C.green },
                { label: 'Temps estimé',      value: '45min',                                       sub: 'Total jour',    subColor: C.gold },
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
    </div>
  )
}
