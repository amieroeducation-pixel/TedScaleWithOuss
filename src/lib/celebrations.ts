// ─── Celebrations Module — TedScale PSG Cosmos ───────────────────────────────
// Usage direct : Celebrations.confetti() / Celebrations.fireworks() / etc.
// Usage événement : window.dispatchEvent(new CustomEvent('celebrate:goal', { detail: { type, text } }))

// ════════════════════════════════════════════════════════════════════════════════
// PLAY SOUND — lecture d'un son via Web Audio (SSR-safe)
// ════════════════════════════════════════════════════════════════════════════════
function playSound(url: string, volume = 0.85, fadeInMs = 400) {
  if (typeof window === 'undefined') return
  const audio = new Audio(url)
  audio.volume = 0
  audio.play().catch(() => {}) // autoplay peut être bloqué par le navigateur
  const step = volume / (fadeInMs / 50)
  const id = setInterval(() => {
    audio.volume = Math.min(audio.volume + step, volume)
    if (audio.volume >= volume) clearInterval(id)
  }, 50)
}

export interface ConfettiOptions  { count?: number; colors?: string[]; size?: number; speed?: number }
export interface FlaresOptions    { count?: number; color?: string }
export interface FireworksOptions { duration?: number }
export interface FireOptions      { on: boolean }
export interface GoalBannerOptions{ text: string; subtext?: string; duration?: number }

// ─── Palette PSG Cosmos ───────────────────────────────────────────────────────
const GOLD    = '#e8c878'
const INDIGO  = '#7a92e8'
const RED     = '#ff6470'
const GREEN   = '#4ade80'
const WHITE   = '#ffffff'
const DEEP    = '#0a0e22'
const PSG_COLORS = [GOLD, INDIGO, RED, GREEN, WHITE, '#b07aee', '#4acde8']

// ─── Utils ────────────────────────────────────────────────────────────────────
const rnd  = (a: number, b: number) => Math.random() * (b - a) + a
const rInt = (a: number, b: number) => Math.floor(rnd(a, b + 1))
const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)]
const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

function getRoot(): HTMLDivElement {
  let r = document.getElementById('cel-root') as HTMLDivElement | null
  if (!r) {
    r = document.createElement('div')
    r.id = 'cel-root'
    Object.assign(r.style, {
      position: 'fixed', inset: '0', pointerEvents: 'none',
      zIndex: '999999', overflow: 'hidden',
    })
    document.body.appendChild(r)
    injectStyles()
  }
  return r
}

function makeCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width  = window.innerWidth
  c.height = window.innerHeight
  Object.assign(c.style, { position: 'absolute', inset: '0', width: '100%', height: '100%' })
  return c
}

function injectStyles() {
  if (document.getElementById('cel-styles')) return
  const s = document.createElement('style')
  s.id = 'cel-styles'
  s.textContent = `
    @keyframes cel-bannerIn  { from{opacity:0;transform:scale(0.2) rotate(-8deg)} to{opacity:1;transform:scale(1) rotate(0deg)} }
    @keyframes cel-bannerOut { from{opacity:1;transform:scale(1)}                 to{opacity:0;transform:scale(1.3) rotate(3deg)} }
    @keyframes cel-pulse     { 0%,100%{text-shadow:0 0 40px #e8c87880,0 0 80px #e8c87840} 50%{text-shadow:0 0 80px #e8c878cc,0 0 160px #e8c87880} }
    @keyframes cel-subIn     { from{opacity:0;transform:translateY(20px)} to{opacity:0.9;transform:translateY(0)} }
    @keyframes cel-flash     { 0%{opacity:0.55} 100%{opacity:0} }
    @keyframes cel-streakIn  { from{opacity:0;transform:translateX(80px) scale(0.8)} to{opacity:1;transform:translateX(0) scale(1)} }
    @keyframes cel-streakOut { from{opacity:1;transform:scale(1)} to{opacity:0;transform:translateX(80px) scale(0.9)} }
    @keyframes cel-ripple    { from{transform:scale(0);opacity:0.7} to{transform:scale(1);opacity:0} }
  `
  document.head.appendChild(s)
}

// ════════════════════════════════════════════════════════════════════════════════
// SCREEN FLASH — éclair coloré plein écran pour les moments d'impact
// ════════════════════════════════════════════════════════════════════════════════
function screenFlash(color: string = GOLD, duration: number = 250) {
  if (typeof window === 'undefined') return
  const root = getRoot()
  const flash = document.createElement('div')
  Object.assign(flash.style, {
    position: 'absolute', inset: '0',
    background: `radial-gradient(ellipse at center, ${color}55 0%, ${color}18 55%, transparent 80%)`,
    animation: `cel-flash ${duration}ms ease-out forwards`,
    pointerEvents: 'none',
  })
  root.appendChild(flash)
  setTimeout(() => flash.remove(), duration + 60)
}

// ════════════════════════════════════════════════════════════════════════════════
// SHOCKWAVE — cercle d'onde expansive (pour les moments épiques)
// ════════════════════════════════════════════════════════════════════════════════
function shockwave(color: string = GOLD, count: number = 2) {
  if (typeof window === 'undefined') return
  const root = getRoot()
  for (let i = 0; i < count; i++) {
    const ring = document.createElement('div')
    const delay_ms = i * 180
    Object.assign(ring.style, {
      position: 'absolute',
      top: '50%', left: '50%',
      width: '200vmax', height: '200vmax',
      marginTop: '-100vmax', marginLeft: '-100vmax',
      border: `3px solid ${color}`,
      borderRadius: '50%',
      animation: `cel-ripple 1.2s ${delay_ms}ms ease-out forwards`,
      pointerEvents: 'none',
    })
    root.appendChild(ring)
    setTimeout(() => ring.remove(), 1400 + delay_ms)
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// MINI BURST — micro éclat discret pour chaque appel passé
// ════════════════════════════════════════════════════════════════════════════════
function miniBurst(opts: { color?: string } = {}) {
  if (typeof window === 'undefined') return
  const color = opts.color ?? GREEN
  const root  = getRoot()
  const canvas = makeCanvas()
  root.appendChild(canvas)
  const ctx = canvas.getContext('2d')!
  const cx = rnd(canvas.width * 0.3, canvas.width * 0.7)
  const cy = canvas.height - 40

  const parts = Array.from({ length: 18 }, () => ({
    x: cx, y: cy,
    vx: rnd(-5, 5), vy: rnd(-14, -5),
    color: pick([color, GOLD, WHITE]),
    alpha: 1, life: 0, max: rInt(22, 40), r: rnd(3, 8),
  }))

  let raf = 0
  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    let alive = false
    for (const p of parts) {
      p.life++; p.x += p.vx; p.y += p.vy; p.vy += 0.5; p.vx *= 0.96
      p.alpha = Math.max(0, 1 - p.life / p.max)
      if (p.life < p.max) alive = true
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fillStyle = p.color + Math.floor(p.alpha * 255).toString(16).padStart(2, '0')
      ctx.fill()
    }
    if (alive) raf = requestAnimationFrame(draw)
    else canvas.remove()
  }
  raf = requestAnimationFrame(draw)
  setTimeout(() => { cancelAnimationFrame(raf); canvas.remove() }, 2000)
}

// ════════════════════════════════════════════════════════════════════════════════
// CONFETTI
// ════════════════════════════════════════════════════════════════════════════════
function confetti(opts: ConfettiOptions = {}) {
  if (typeof window === 'undefined') return
  const count  = opts.count  ?? 160
  const colors = opts.colors ?? PSG_COLORS
  const size   = opts.size   ?? 1
  const speed  = opts.speed  ?? 1
  const root   = getRoot()
  const canvas = makeCanvas()
  root.appendChild(canvas)
  const ctx = canvas.getContext('2d')!

  type Shape = 'rect' | 'circle' | 'star' | 'ribbon'
  interface P {
    x: number; y: number; vx: number; vy: number
    color: string; rot: number; vr: number
    w: number; h: number; shape: Shape
    alpha: number; life: number; max: number
    sway: number; swaySpeed: number; swayOffset: number
  }

  const parts: P[] = Array.from({ length: count }, () => ({
    x: rnd(0, canvas.width),
    y: rnd(-canvas.height * 0.5, -10),
    vx: rnd(-1.5, 1.5),
    vy: rnd(1.5, 5) * speed,
    color: pick(colors),
    rot: rnd(0, Math.PI * 2),
    vr: rnd(-0.12, 0.12),
    w: rnd(8, 18) * size,
    h: rnd(4, 12) * size,
    shape: pick(['rect','rect','rect','circle','star','ribbon'] as Shape[]),
    alpha: 1,
    life: 0,
    max: rInt(140, 220),
    sway: 0,
    swaySpeed: rnd(0.02, 0.06),
    swayOffset: rnd(0, Math.PI * 2),
  }))

  let raf = 0
  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    let alive = false
    for (const p of parts) {
      p.life++
      p.sway = Math.sin(p.life * p.swaySpeed + p.swayOffset) * 1.2
      p.x += p.vx + p.sway; p.vy += 0.06; p.y += p.vy; p.rot += p.vr
      p.alpha = Math.max(0, 1 - p.life / p.max)
      if (p.life < p.max) alive = true

      ctx.save(); ctx.globalAlpha = p.alpha
      ctx.translate(p.x, p.y); ctx.rotate(p.rot)
      ctx.fillStyle = p.color

      switch (p.shape) {
        case 'rect':
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); break
        case 'ribbon':
          ctx.beginPath(); ctx.moveTo(-p.w/2, 0)
          ctx.bezierCurveTo(-p.w/4, -p.h, p.w/4, p.h, p.w/2, 0)
          ctx.lineWidth = 2; ctx.strokeStyle = p.color; ctx.stroke(); break
        case 'circle':
          ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2); ctx.fill(); break
        case 'star': {
          ctx.beginPath()
          for (let i = 0; i < 10; i++) {
            const a = (i * Math.PI) / 5 - Math.PI / 2
            const r = i % 2 === 0 ? p.w / 2 : p.w / 5
            i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
                    : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
          }
          ctx.closePath(); ctx.fill(); break
        }
      }
      ctx.restore()
    }
    if (alive) { raf = requestAnimationFrame(draw) }
    else canvas.remove()
  }
  raf = requestAnimationFrame(draw)
  setTimeout(() => { cancelAnimationFrame(raf); canvas.remove() }, 10000)
}

// ════════════════════════════════════════════════════════════════════════════════
// GOLD RAIN — pluie d'or lente pour les signatures et R3
// ════════════════════════════════════════════════════════════════════════════════
function goldRain() {
  confetti({
    count: 300,
    colors: [GOLD, '#f5e0a0', '#d4a842', '#fff8e0', '#c8a435', WHITE],
    size: 1.7,
    speed: 0.55,
  })
}

// ════════════════════════════════════════════════════════════════════════════════
// FLARES — fumigènes rouges denses
// ════════════════════════════════════════════════════════════════════════════════
function flares(opts: FlaresOptions = {}) {
  if (typeof window === 'undefined') return
  const count = opts.count ?? 5
  const hex   = opts.color ?? '#dd1520'
  const root  = getRoot()
  const canvas = makeCanvas()
  root.appendChild(canvas)
  const ctx = canvas.getContext('2d')!

  const rr = parseInt(hex.slice(1, 3), 16)
  const gg = parseInt(hex.slice(3, 5), 16)
  const bb = parseInt(hex.slice(5, 7), 16)

  interface Smoke {
    x: number; y: number; vx: number; vy: number
    r: number; vr: number; alpha: number; life: number; max: number
    rr: number; gg: number; bb: number
  }

  const smokes: Smoke[] = []
  const cols = Array.from({ length: count }, (_, i) =>
    (i + 0.5) * (canvas.width / count) + rnd(-60, 60)
  )

  let frame = 0
  const EMIT = 90
  let raf = 0

  function emit() {
    for (const cx of cols) {
      for (let k = 0; k < 8; k++) {
        const heat = Math.random()
        smokes.push({
          x: cx + rnd(-30, 30), y: canvas.height + rnd(0, 30),
          vx: rnd(-0.8, 0.8), vy: rnd(-5, -2.5),
          r: rnd(18, 45), vr: rnd(1.2, 2.5),
          alpha: rnd(0.5, 0.85), life: 0, max: rInt(70, 110),
          rr: Math.min(255, rr + Math.floor(heat * 80)),
          gg: Math.min(255, gg + Math.floor(heat * 40)),
          bb,
        })
      }
      for (let k = 0; k < 4; k++) {
        smokes.push({
          x: cx + rnd(-20, 20), y: canvas.height - rnd(0, 20),
          vx: rnd(-2, 2), vy: rnd(-8, -4),
          r: rnd(2, 5), vr: 0, alpha: 1, life: 0, max: rInt(30, 60),
          rr: 255, gg: 200, bb: 50,
        })
      }
    }
  }

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (frame < EMIT) emit()
    frame++
    let alive = false
    for (const s of smokes) {
      s.life++; s.x += s.vx; s.y += s.vy; s.r += s.vr
      s.vy *= 0.97; s.vx += rnd(-0.05, 0.05)
      s.alpha = Math.max(0, (1 - s.life / s.max) * 0.75)
      if (s.life < s.max) alive = true
      if (s.vr === 0) {
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${s.rr},${s.gg},${s.bb},${s.alpha * 2})`; ctx.fill()
      } else {
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r)
        g.addColorStop(0,   `rgba(${s.rr},${s.gg},${s.bb},${s.alpha})`)
        g.addColorStop(0.5, `rgba(${s.rr},${Math.min(s.gg+30,255)},${s.bb},${s.alpha * 0.6})`)
        g.addColorStop(1,   `rgba(${s.rr},${s.gg},${s.bb},0)`)
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = g; ctx.fill()
      }
    }
    if (!alive && frame > EMIT) canvas.remove()
    else raf = requestAnimationFrame(draw)
  }
  raf = requestAnimationFrame(draw)
  setTimeout(() => { cancelAnimationFrame(raf); canvas.remove() }, 9000)
}

// ════════════════════════════════════════════════════════════════════════════════
// FIREWORKS
// ════════════════════════════════════════════════════════════════════════════════
function fireworks(opts: FireworksOptions = {}) {
  if (typeof window === 'undefined') return
  const dur  = (opts.duration ?? 3.5) * 1000
  const root = getRoot()
  const canvas = makeCanvas()
  root.appendChild(canvas)
  const ctx = canvas.getContext('2d')!
  const W = canvas.width, H = canvas.height

  interface Trail { x: number; y: number }
  interface Spark { x: number; y: number; vx: number; vy: number; color: string; alpha: number; life: number; max: number }
  interface Rocket { x: number; y: number; vy: number; color: string; done: boolean; trail: Trail[] }

  const rockets: Rocket[] = []
  const sparks: Spark[] = []

  function launch() {
    rockets.push({
      x: rnd(W * 0.15, W * 0.85), y: H,
      vy: rnd(-14, -10), color: pick(PSG_COLORS),
      done: false, trail: [],
    })
  }

  function burst(x: number, y: number, color: string) {
    const n = rInt(70, 120)
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2; const spd = rnd(1.5, 7)
      sparks.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, color, alpha: 1, life: 0, max: rInt(45, 90) })
    }
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * Math.PI * 2
      sparks.push({ x, y, vx: Math.cos(a) * rnd(8, 12), vy: Math.sin(a) * rnd(8, 12), color: GOLD, alpha: 1, life: 0, max: rInt(20, 40) })
    }
  }

  const start = Date.now(); let lastLaunch = 0; let raf = 0
  const draw = () => {
    ctx.fillStyle = 'rgba(10,14,34,0.18)'; ctx.fillRect(0, 0, W, H)
    const now = Date.now()
    if (now - start < dur - 800 && now - lastLaunch > rnd(280, 550)) { launch(); lastLaunch = now }
    for (const r of rockets) {
      if (r.done) continue
      r.trail.push({ x: r.x, y: r.y }); if (r.trail.length > 12) r.trail.shift()
      r.y += r.vy; r.vy += 0.25
      r.trail.forEach((t, i) => {
        const a = (i / r.trail.length) * 0.9
        ctx.beginPath(); ctx.arc(t.x, t.y, 2, 0, Math.PI * 2)
        ctx.fillStyle = r.color + Math.floor(a * 255).toString(16).padStart(2, '0'); ctx.fill()
      })
      ctx.beginPath(); ctx.arc(r.x, r.y, 3, 0, Math.PI * 2); ctx.fillStyle = WHITE; ctx.fill()
      if (r.vy >= -0.5) { r.done = true; burst(r.x, r.y, r.color) }
    }
    let aliveSparks = false
    for (const s of sparks) {
      s.life++; s.x += s.vx; s.y += s.vy; s.vy += 0.12; s.vx *= 0.97; s.vy *= 0.97
      s.alpha = Math.max(0, 1 - s.life / s.max)
      if (s.life < s.max) aliveSparks = true
      ctx.beginPath(); ctx.arc(s.x, s.y, 2.5, 0, Math.PI * 2)
      ctx.fillStyle = s.color + Math.floor(s.alpha * 255).toString(16).padStart(2, '0'); ctx.fill()
    }
    const elapsed = now - start
    if (elapsed > dur + 2000 && !aliveSparks) canvas.remove()
    else raf = requestAnimationFrame(draw)
  }
  raf = requestAnimationFrame(draw)
  setTimeout(() => { cancelAnimationFrame(raf); canvas.remove() }, dur + 8000)
}

// ════════════════════════════════════════════════════════════════════════════════
// FIRE — dashboard en feu (cellular automaton)
// ════════════════════════════════════════════════════════════════════════════════
let _fireCanvas: HTMLCanvasElement | null = null
let _fireRAF = 0

function fire(opts: FireOptions) {
  if (typeof window === 'undefined') return
  if (!opts.on) {
    cancelAnimationFrame(_fireRAF); _fireCanvas?.remove(); _fireCanvas = null
    return
  }
  if (_fireCanvas) return
  const root = getRoot()
  _fireCanvas = makeCanvas()
  Object.assign(_fireCanvas.style, { mixBlendMode: 'screen', opacity: '0.85' })
  root.appendChild(_fireCanvas)
  const ctx = _fireCanvas.getContext('2d')!
  const W = _fireCanvas.width, H = _fireCanvas.height
  const FW = 160, FH = 90
  const buf = new Uint8Array(FW * FH)
  const pal = Array.from({ length: 256 }, (_, i): [number, number, number] => {
    if (i < 60)  return [i * 4, 0, 0]
    if (i < 100) return [240, (i - 60) * 4, 0]
    if (i < 160) return [255, 160 + (i - 100) * 1.5 | 0, 0]
    if (i < 220) return [255, 255, (i - 160) * 4]
    return [255, 255, 255]
  })
  function step() {
    for (let x = 0; x < FW; x++) buf[(FH - 1) * FW + x] = 220 + rInt(0, 35)
    for (let y = 0; y < FH - 1; y++) {
      for (let x = 0; x < FW; x++) {
        const sum =
          buf[(y + 1) * FW + x] + buf[(y + 1) * FW + ((x - 1 + FW) % FW)] +
          buf[(y + 1) * FW + ((x + 1) % FW)] + buf[(Math.min(y + 2, FH - 1)) * FW + x]
        buf[y * FW + x] = Math.max(0, (sum >> 2) - rInt(0, 3))
      }
    }
  }
  const scaleX = W / FW, scaleY = H / FH
  const drawFire = () => {
    if (!_fireCanvas) return; step()
    ctx.clearRect(0, 0, W, H)
    for (let y = 0; y < FH; y++) {
      for (let x = 0; x < FW; x++) {
        const v = buf[y * FW + x]; if (v < 5) continue
        const [r, g, b] = pal[v]
        ctx.fillStyle = `rgba(${r},${g},${b},0.92)`
        ctx.fillRect(x * scaleX, (FH - 1 - y) * scaleY, scaleX + 1, scaleY + 1)
      }
    }
    _fireRAF = requestAnimationFrame(drawFire)
  }
  drawFire()
}

// ════════════════════════════════════════════════════════════════════════════════
// GOAL BANNER
// ════════════════════════════════════════════════════════════════════════════════
function goalBanner(opts: GoalBannerOptions) {
  if (typeof window === 'undefined') return
  const text = opts.text, subtext = opts.subtext ?? '', dur = opts.duration ?? 3000
  const root = getRoot()
  const wrap = document.createElement('div')
  Object.assign(wrap.style, {
    position: 'absolute', inset: '0',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    animation: 'cel-bannerIn 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards',
  })
  const scan = document.createElement('div')
  Object.assign(scan.style, {
    position: 'absolute', inset: '0',
    background: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.06) 2px,rgba(0,0,0,0.06) 4px)',
  })
  wrap.appendChild(scan)
  const glow = document.createElement('div')
  Object.assign(glow.style, {
    position: 'absolute', width: '80vw', height: '50vh',
    background: `radial-gradient(ellipse at center, ${GOLD}25 0%, transparent 70%)`,
    borderRadius: '50%',
  })
  wrap.appendChild(glow)
  const main = document.createElement('div')
  Object.assign(main.style, {
    fontFamily: "'Oswald', 'Impact', sans-serif",
    fontSize: 'clamp(64px, 13vw, 128px)', fontWeight: '900',
    color: GOLD, textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: '1',
    WebkitTextStroke: `3px ${DEEP}`,
    textShadow: `0 0 40px ${GOLD}90, 0 0 80px ${GOLD}50, 6px 6px 0 ${DEEP}`,
    animation: 'cel-pulse 0.8s ease-in-out infinite',
    position: 'relative', zIndex: '1',
  })
  main.textContent = text; wrap.appendChild(main)
  if (subtext) {
    const sub = document.createElement('div')
    Object.assign(sub.style, {
      fontFamily: "'JetBrains Mono', monospace", fontSize: 'clamp(12px, 2vw, 20px)',
      color: WHITE, letterSpacing: '0.35em', textTransform: 'uppercase',
      marginTop: '12px', animation: 'cel-subIn 0.4s 0.3s ease-out forwards',
      opacity: '0', position: 'relative', zIndex: '1',
    })
    sub.textContent = subtext; wrap.appendChild(sub)
  }
  const ribbon = document.createElement('div')
  Object.assign(ribbon.style, {
    position: 'absolute', top: '0', left: '0', right: '0', height: '6px',
    background: `linear-gradient(90deg,${RED},${GOLD},${WHITE},${INDIGO},${GREEN},${GOLD},${RED})`,
    backgroundSize: '400% 100%',
  })
  wrap.appendChild(ribbon)
  const ribbon2 = ribbon.cloneNode(true) as HTMLElement
  Object.assign(ribbon2.style, { top: 'auto', bottom: '0' })
  wrap.appendChild(ribbon2)
  root.appendChild(wrap)
  setTimeout(() => {
    wrap.style.animation = 'cel-bannerOut 0.4s ease-in forwards'
    setTimeout(() => wrap.remove(), 420)
  }, dur)
}

// ════════════════════════════════════════════════════════════════════════════════
// STREAK TOAST — badge discret en coin pour les séries d'appels
// ════════════════════════════════════════════════════════════════════════════════
function streakToast(count: number) {
  if (typeof window === 'undefined') return
  const root = getRoot()
  const toast = document.createElement('div')
  const emoji = count >= 15 ? '⚡' : count >= 10 ? '🔥' : '✅'
  const label = count >= 15 ? `${emoji} INARRÊTABLE — ${count}` : count >= 10 ? `${emoji} MACHINE — ${count}` : `${emoji} SÉRIE x${count}`
  Object.assign(toast.style, {
    position: 'absolute', bottom: '80px', right: '24px',
    background: 'linear-gradient(135deg, #140e00, #241800)',
    border: `1px solid ${GOLD}50`, borderRadius: '10px',
    padding: '10px 18px', color: GOLD,
    fontFamily: "'Oswald', sans-serif", fontSize: '18px', fontWeight: '700',
    letterSpacing: '0.05em',
    boxShadow: `0 4px 24px ${GOLD}25, 0 0 0 1px ${GOLD}15`,
    animation: 'cel-streakIn 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards',
  })
  toast.textContent = label
  root.appendChild(toast)
  setTimeout(() => {
    toast.style.animation = 'cel-streakOut 0.3s ease-in forwards'
    setTimeout(() => toast.remove(), 360)
  }, 2800)
}

// ════════════════════════════════════════════════════════════════════════════════
// CELEBRATE ALL — séquence épique complète
// ════════════════════════════════════════════════════════════════════════════════
async function celebrateAll(text: string = 'BUUUT !', subtext: string = 'OBJECTIF ATTEINT') {
  if (typeof window === 'undefined') return
  goalBanner({ text, subtext, duration: 4500 })
  await delay(150)
  flares({ count: 6, color: '#dd1520' })
  await delay(250)
  confetti({ count: 220 })
  await delay(400)
  fireworks({ duration: 4.5 })
}

// ════════════════════════════════════════════════════════════════════════════════
// CUSTOM DOM EVENTS
// Types : appel_passe | rdv_pris | objectif_blocs | objectif_journee
//         r1 | r2 | r3 | signature | session_terminee | streak
// ════════════════════════════════════════════════════════════════════════════════

// Throttle pour éviter le lag quand plusieurs célébrations s'enchaînent vite
let _lastMediumCelebMs = 0
const MEDIUM_THROTTLE_MS = 1400

function _handleEvent(e: Event) {
  const d = (e as CustomEvent).detail ?? {}
  const { type, text, level } = d

  // ── Appel passé : micro éclat discret (non intrusif) ──────────────────────
  if (level === 'small' || type === 'appel_passe') {
    miniBurst({ color: GREEN })
    return
  }

  // ── RDV pris / contact chaud : flash rouge + fumigènes + banner ───────────
  if (level === 'medium' || type === 'rdv_pris') {
    const now = Date.now()
    if (now - _lastMediumCelebMs < MEDIUM_THROTTLE_MS) return
    _lastMediumCelebMs = now
    screenFlash(RED, 280)
    flares({ count: 2 })
    goalBanner({ text: text ?? 'RDV PRIS !', subtext: '🎯 DANS LE PANIER', duration: 2500 })
    setTimeout(() => confetti({ count: 80 }), 300)
    return
  }

  // ── Mi-chemin / objectif blocs ────────────────────────────────────────────
  if (type === 'objectif_blocs') {
    const now = Date.now()
    if (now - _lastMediumCelebMs < MEDIUM_THROTTLE_MS) return
    _lastMediumCelebMs = now
    screenFlash(INDIGO, 220)
    fireworks({ duration: 1.5 })
    goalBanner({ text: text ?? 'EN ROUTE !', subtext: 'GARDE LE RYTHME', duration: 2200 })
    return
  }

  // ── Objectif journée accomplie ────────────────────────────────────────────
  if (level === 'big' || type === 'objectif_journee') {
    screenFlash(GOLD, 350)
    shockwave(GOLD, 2)
    flares({ count: 3, color: INDIGO })
    goalBanner({ text: text ?? 'OBJECTIF DU JOUR !', subtext: 'JOURNÉE ACCOMPLIE', duration: 3800 })
    setTimeout(() => confetti({ count: 130 }), 250)
    return
  }

  // ── R1 : premier rendez-vous qualifié ─────────────────────────────────────
  if (type === 'r1') {
    const now = Date.now()
    if (now - _lastMediumCelebMs < MEDIUM_THROTTLE_MS) return
    _lastMediumCelebMs = now
    screenFlash(INDIGO, 300)
    flares({ count: 3, color: INDIGO })
    goalBanner({ text: text ?? 'R1 VALIDÉ !', subtext: 'RENDEZ-VOUS QUALIFIÉ', duration: 3000 })
    setTimeout(() => confetti({ count: 100 }), 200)
    return
  }

  // ── R2 : découverte patrimoniale ──────────────────────────────────────────
  if (type === 'r2') {
    screenFlash(GOLD, 350)
    celebrateAll(text ?? 'R2 VALIDÉ !', 'DÉCOUVERTE PATRIMONIALE')
    return
  }

  // ── R3 : présentation solutions + pluie d'or ──────────────────────────────
  if (type === 'r3') {
    screenFlash(GOLD, 420)
    shockwave(GOLD, 3)
    celebrateAll(text ?? 'R3 VALIDÉ !', 'SOLUTIONS PRÉSENTÉES')
    setTimeout(() => goldRain(), 1500)
    return
  }

  // ── Journée parfaite — tous les objectifs du jour atteints ──────────────
  if (type === 'journee_parfaite') {
    playSound('/sounds/ldc-theme.mp3', 0.7)
    screenFlash(GOLD, 600)
    shockwave(GOLD, 4)
    celebrateAll(text ?? 'JOURNÉE PARFAITE !', 'TOUS LES OBJECTIFS ATTEINTS !')
    setTimeout(() => goldRain(), 1200)
    setTimeout(() => fireworks({ duration: 3 }), 5500)
    return
  }

  // ── Objectif mensuel — collecte / CA mensuel ────────────────────────────
  if (type === 'objectif_mensuel') {
    playSound('/sounds/ldc-theme.mp3', 1.0)
    screenFlash(GOLD, 800)
    shockwave(GOLD, 5)
    fire({ on: true })
    setTimeout(() => fire({ on: false }), 6000)
    celebrateAll(text ?? 'OBJECTIF MENSUEL !', 'COLLECTE ATTEINTE ! 🏆')
    setTimeout(() => goldRain(), 800)
    setTimeout(() => fireworks({ duration: 5 }), 1200)
    setTimeout(() => goldRain(), 4000)
    return
  }

  // ── Signature : Saint Graal — tout s'embrase ─────────────────────────────
  if (type === 'signature') {
    screenFlash(GOLD, 550)
    shockwave(GOLD, 3)
    celebrateAll(text ?? 'SIGNÉ !', 'NOUVEAU CLIENT !')
    setTimeout(() => goldRain(), 1200)
    setTimeout(() => fireworks({ duration: 3 }), 5000)
    return
  }

  // ── Série d'appels consécutifs ────────────────────────────────────────────
  if (type === 'streak') {
    const count: number = d.count ?? 5
    streakToast(count)
    if (count >= 10) {
      fire({ on: true })
      setTimeout(() => fire({ on: false }), 3500)
    }
    return
  }

  // ── Session terminée ─────────────────────────────────────────────────────
  if (level === 'epic' || type === 'session_terminee') {
    celebrateAll(text ?? 'SESSION TERMINÉE !', 'BIEN JOUÉ !')
    return
  }

  confetti()
}

if (typeof window !== 'undefined') {
  window.addEventListener('celebrate:goal', _handleEvent)
}

// ════════════════════════════════════════════════════════════════════════════════
// EXPORT
// ════════════════════════════════════════════════════════════════════════════════
export const Celebrations = {
  confetti,
  flares,
  fireworks,
  fire,
  goalBanner,
  celebrateAll,
  miniBurst,
  screenFlash,
  shockwave,
  goldRain,
  streakToast,
}
