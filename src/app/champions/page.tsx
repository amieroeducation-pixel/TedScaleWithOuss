'use client'

import React, { useState, useEffect, useRef } from 'react'
import Script from 'next/script'
import { useRouter } from 'next/navigation'
import { C } from '@/lib/theme'

/* ── TYPES ───────────────────────────────────────────────────────────────── */
type KanbanStage = 'contact' | 'rdv1' | 'rdv2' | 'rdv3' | 'converti' | 'perdu'
type PressureLevel = 'low' | 'medium' | 'high' | 'max'
type SourceType = 'tns' | 'chef' | 'particulier'

interface Prospect {
  id: string
  name: string
  role: string
  initials: string
  city: string
  source: SourceType
  score: number          // 1-5 stars
  last: string
  next: string
  alert: boolean
  pressure: PressureLevel
  stage: KanbanStage
  phone: string
  email: string
  aum: string
}

/* ── KANBAN STAGES ───────────────────────────────────────────────────────── */
const STAGES: { id: KanbanStage; label: string; colorKey: string }[] = [
  { id: 'contact',  label: 'À contacter', colorKey: 'hc' },
  { id: 'rdv1',     label: 'RDV 1',       colorKey: 'h1' },
  { id: 'rdv2',     label: 'RDV 2',       colorKey: 'h2' },
  { id: 'rdv3',     label: 'RDV 3',       colorKey: 'h3' },
  { id: 'converti', label: 'Convertis',   colorKey: 'hv' },
  { id: 'perdu',    label: 'Perdus',      colorKey: 'hp' },
]

const STAGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  hc: { bg: C.surface2,  text: C.textLo,   border: C.line    },
  h1: { bg: '#0d1a3e',   text: C.indigo,   border: C.indigo + '55' },
  h2: { bg: '#1e1a00',   text: C.gold,     border: C.gold + '55'   },
  h3: { bg: '#1a0d1e',   text: '#b07aee',  border: '#b07aee55'     },
  hv: { bg: '#0d1f0f',   text: C.green,    border: C.green + '55'  },
  hp: { bg: '#1f0d0d',   text: C.cyan,     border: C.cyan + '55'   },
}

/* ── SCORE → AVATAR TIER ─────────────────────────────────────────────────── */
const SCORE_TIER: Record<number, { bg: string; color: string; label: string }> = {
  5: { bg: 'linear-gradient(135deg,#ffd66b,#ff9e3a)', color: C.bgDeep, label: 'Potentiel maximal' },
  4: { bg: 'linear-gradient(135deg,#5adb6a,#3a9a4a)', color: C.bgDeep, label: 'Bon potentiel' },
  3: { bg: C.surface3,                                 color: C.textMid, label: 'Standard' },
  2: { bg: '#2a1a0a',                                  color: '#c88a4a', label: 'Modéré' },
  1: { bg: '#2a0d0d',                                  color: C.cyan,    label: 'Faible' },
}

const STAR_COLORS: Record<number, string> = { 5: C.gold, 4: C.green, 3: C.textMid, 2: C.warn, 1: C.cyan }

/* ── PRESSURE ────────────────────────────────────────────────────────────── */
const PRESSURE_COLORS: Record<PressureLevel, string> = {
  low: C.green, medium: C.gold, high: C.warn, max: C.cyan,
}
const PRESSURE_IDX: Record<PressureLevel, number> = { low: 0, medium: 1, high: 2, max: 3 }

/* ── DATA ────────────────────────────────────────────────────────────────── */
const INITIAL_PROSPECTS: Prospect[] = [
  { id:'p1',  name:'P. Rousseau',   role:'Médecin gén.',      initials:'PR', city:'Paris 16e',    source:'tns',   score:5, last:'Jamais contacté',   next:'Appel découverte',     alert:false, pressure:'low',    stage:'contact',  phone:'01 47 22 XX XX', email:'p.rousseau@...', aum:'—'      },
  { id:'p2',  name:'S. Moreau',     role:'Sophrologue',        initials:'SM', city:'Neuilly-s-S.', source:'tns',   score:4, last:'Il y a 3j',          next:'Email intro',          alert:false, pressure:'low',    stage:'contact',  phone:'01 47 55 XX XX', email:'s.moreau@...',   aum:'—'      },
  { id:'p3',  name:'B. Girard',     role:'Ostéopathe',         initials:'BG', city:'Aulnay',       source:'tns',   score:2, last:'Il y a 1j',          next:'Premier contact',      alert:false, pressure:'low',    stage:'contact',  phone:'01 60 77 XX XX', email:'b.girard@...',   aum:'—'      },
  { id:'p4',  name:'F. Dubois',     role:'Kinésithérapeute',   initials:'FD', city:'Boulogne-B.',  source:'tns',   score:4, last:'RDV jeu. 15h',       next:'RDV jeudi 15h',        alert:false, pressure:'medium', stage:'rdv1',     phone:'01 46 33 XX XX', email:'f.dubois@...',   aum:'55k€'   },
  { id:'p5',  name:'A. Petit',      role:"Chef d'entreprise",  initials:'AP', city:'Paris 8e',     source:'chef',  score:5, last:'Il y a 4j',          next:'Étude patrimoniale',   alert:false, pressure:'medium', stage:'rdv1',     phone:'01 53 44 XX XX', email:'a.petit@...',    aum:'180k€'  },
  { id:'p6',  name:'M. Lefort',     role:'Infirmière lib.',    initials:'ML', city:'Aulnay',       source:'tns',   score:3, last:'5j sans rép.',       next:'Relance WA',           alert:true,  pressure:'high',   stage:'rdv1',     phone:'01 60 88 XX XX', email:'m.lefort@...',   aum:'30k€'   },
  { id:'p7',  name:'Dr. Martin',    role:'Chirurgien',         initials:'DM', city:'Vincennes',    source:'tns',   score:5, last:'5j sans rép.',       next:'Proposition',          alert:true,  pressure:'max',    stage:'rdv2',     phone:'01 55 22 XX XX', email:'d.martin@...',   aum:'340k€'  },
  { id:'p8',  name:'C. Blanc',      role:'Infirmière lib.',    initials:'CB', city:'Montreuil',    source:'tns',   score:3, last:'Il y a 2j',          next:'Dossier à envoyer',    alert:false, pressure:'high',   stage:'rdv2',     phone:'01 43 77 XX XX', email:'c.blanc@...',    aum:'45k€'   },
  { id:'p9',  name:'L. Chen',       role:'Pharmacienne',       initials:'LC', city:'Paris 6e',     source:'tns',   score:5, last:'RDV mer. 16h',       next:'Proposition finale',   alert:false, pressure:'high',   stage:'rdv3',     phone:'01 45 66 XX XX', email:'l.chen@...',     aum:'290k€'  },
  { id:'p10', name:'J. Barré',      role:'Radiologue',         initials:'JB', city:'Vincennes',    source:'tns',   score:4, last:'Il y a 1j',          next:'Closing RDV 3',        alert:false, pressure:'max',    stage:'rdv3',     phone:'01 55 11 XX XX', email:'j.barre@...',    aum:'220k€'  },
  { id:'p11', name:'M. Bernard',    role:'Dentiste',           initials:'MB', city:'Paris 15e',    source:'tns',   score:5, last:'4 200 €/an',         next:'Ass. vie + PER',       alert:false, pressure:'low',    stage:'converti', phone:'01 42 88 XX XX', email:'m.bernard@...',  aum:'1.2M€'  },
  { id:'p12', name:'T. Nguyen',     role:'Infirmière lib.',    initials:'TN', city:'Saint-Denis',  source:'tns',   score:3, last:'2 800 €/an',         next:'Prévoyance',           alert:false, pressure:'low',    stage:'converti', phone:'01 48 55 XX XX', email:'t.nguyen@...',   aum:'680k€'  },
  { id:'p13', name:'J. Lambert',    role:'Ostéopathe',         initials:'JL', city:'Versailles',   source:'chef',  score:4, last:'Concurrent',         next:'Relance 3 mois',       alert:false, pressure:'low',    stage:'perdu',    phone:'01 39 44 XX XX', email:'j.lambert@...',  aum:'—'      },
]

const KPI_DATA = [
  { label: 'CA Avril',      value: '18 400 €', sub: '+12% vs mars',   trend: 12,  ok: true  },
  { label: 'Taux Closing',  value: '34%',      sub: 'Objectif 40%',   trend: -6,  ok: false },
  { label: 'RDV Semaine',   value: '7',        sub: '3 confirmés',    trend: 3,   ok: true  },
  { label: 'À Relancer',    value: '12',       sub: '4 urgents',      trend: -4,  ok: false },
]

const COMMISSIONS = [
  { label: 'Assurance Vie',  pct: 85, amount: 7800, color: C.cyan   },
  { label: 'PER Madelin',    pct: 55, amount: 5100, color: C.indigo },
  { label: 'Compte-Titres',  pct: 28, amount: 2600, color: C.gold   },
  { label: 'Capitalisation', pct: 18, amount: 1700, color: C.lime   },
  { label: 'Tontine',        pct: 12, amount: 1200, color: C.warn   },
]

const FUNNEL = [
  { label: 'Leads',     count: 142, color: C.textMid },
  { label: 'Contactés', count: 88,  color: C.indigo  },
  { label: 'RDV 1',     count: 77,  color: C.cyan    },
  { label: 'RDV 2',     count: 58,  color: C.gold    },
  { label: 'Closing',   count: 34,  color: C.green   },
]

const DAYS = ['Lun 21', 'Mar 22', 'Mer 23', 'Jeu 24', 'Ven 25']
const HOURS = Array.from({ length: 10 }, (_, i) => i + 8)

const EVENTS = [
  { id:'e1', day:0, hour:9,  title:'Sandra Vidal — RDV3',  type:'rdv'     },
  { id:'e2', day:1, hour:10, title:'F. Laurent — Prop.',   type:'rdv'     },
  { id:'e3', day:1, hour:14, title:'Bloc prospection TNS', type:'bloc'    },
  { id:'e4', day:2, hour:9,  title:'Interpro CGP Lyon',    type:'interpro'},
  { id:'e5', day:2, hour:15, title:'Dr. Sophie Moreau',    type:'rdv'     },
  { id:'e6', day:3, hour:11, title:'Suivi portefeuille',   type:'rdv'     },
  { id:'e7', day:3, hour:16, title:'Commerce réseau',      type:'commerce'},
  { id:'e8', day:4, hour:8,  title:'Sport matinal',        type:'sport'   },
  { id:'e9', day:4, hour:14, title:'Rédaction rapports',   type:'tache'   },
]

const EVENT_COLORS: Record<string, string> = {
  rdv: C.indigo, bloc: C.green, interpro: C.gold,
  commerce: C.warn, sport: C.cyan, tache: C.textLo,
}

const NAV_SECTIONS = [
  { label: 'Principal', items: [
    { id:'global',     label:'Global'           },
    { id:'today',      label:"Aujourd'hui"      },
    { id:'weekly',     label:'Vue hebdo'        },
    { id:'revenue',    label:'Revenue'          },
    { id:'champions',  label:'🏆 Champions'     },
    { id:'pipeline',   label:'Pipeline'         },
    { id:'tasks',      label:'Tâches',  badge:5 },
  ]},
  { label: 'Clients', items: [
    { id:'crm',        label:'CRM Kanban'       },
    { id:'clients',    label:'Premium'          },
    { id:'cercle',     label:'Cercle'           },
  ]},
  { label: 'Acquisition', items: [
    { id:'map',        label:'Carte TNS'        },
    { id:'tns',        label:'Prospection TNS'  },
    { id:'chefs',      label:"Chefs d'entreprise", badge:8 },
    { id:'particuliers', label:'Particuliers'  },
  ]},
  { label: 'Outils', items: [
    { id:'sequences',  label:'Séquences'        },
    { id:'simulator',  label:'Simulateur'       },
    { id:'commerce',   label:'Commerce'         },
    { id:'auto',       label:'Automatisations'  },
  ]},
  { label: 'Pilotage', items: [
    { id:'analytics',  label:'📊 Analytics'     },
    { id:'assistant',  label:'🤖 Assistant'     },
    { id:'settings',   label:'⚙️ Paramètres'   },
    { id:'scoring',    label:'Scoring patrimonial' },
  ]},
]

const NAV_ROUTES: Record<string, string> = {
  global:      '/global',
  today:       '/today',
  weekly:      '/dashboard',
  revenue:     '/revenue',
  champions:   '/champions',
  pipeline:    '/pipeline',
  tasks:       '/tasks',
  crm:         '/crm',
  clients:     '/clients',
  cercle:      '/cercle',
  map:         '/map',
  tns:         '/prospection/tns',
  chefs:       '/prospection/chefs-entreprise',
  particuliers:'/prospection/particuliers',
  sequences:   '/sequences',
  simulator:   '/simulator',
  commerce:    '/commerce',
  auto:        '/automatisations',
  analytics:   '/analytics',
  assistant:   '/assistant',
  settings:    '/settings',
  scoring:     '/scoring',
}

/* ── STARBALL ─────────────────────────────────────────────────────────────── */
function StarballSVG() {
  return (
    <svg width={36} height={36} viewBox="0 0 36 36" fill="none" style={{
      filter:'drop-shadow(0 0 12px rgba(255,100,112,0.7)) drop-shadow(0 0 20px rgba(245,232,200,0.3))',
      flexShrink: 0,
    }}>
      <circle cx={18} cy={18} r={17} fill={C.bgMid} stroke={C.line} strokeWidth={1}/>
      <circle cx={18} cy={18} r={13} fill={C.surface1} opacity={0.7}/>
      <path d="M18 7l2.35 7.23h7.6l-6.15 4.47 2.35 7.23L18 21.46l-6.15 4.47 2.35-7.23-6.15-4.47h7.6z" fill={C.textHi} opacity={0.9}/>
      <path d="M18 5l1.4 4.3h4.52l-3.66 2.66 1.4 4.3L18 13.6l-3.66 2.66 1.4-4.3-3.66-2.66h4.52z" fill={C.cyan} opacity={0.5}/>
    </svg>
  )
}

/* ── GAUGE SVG ────────────────────────────────────────────────────────────── */
function ScoreGauge({ score }: { score: number }) {
  const r = 52, cx = 70, cy = 72
  const circ = Math.PI * r
  const dashOffset = circ * (1 - score / 100)
  const rad = ((score / 100 * 180) - 180) * Math.PI / 180
  const px = cx + r * Math.cos(rad)
  const py = cy + r * Math.sin(rad)
  return (
    <svg viewBox="0 0 140 90" style={{ width:'100%', maxWidth:170, overflow:'visible' }}>
      <defs>
        <linearGradient id="gaugeG" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={C.magenta}/>
          <stop offset="50%" stopColor={C.cyan}/>
          <stop offset="100%" stopColor={C.gold}/>
        </linearGradient>
      </defs>
      <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`} fill="none" stroke={C.surface3} strokeWidth={8} strokeLinecap="round"/>
      <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`} fill="none" stroke="url(#gaugeG)" strokeWidth={8} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={dashOffset}/>
      <circle cx={px} cy={py} r={5} fill={C.cyan} style={{ filter:`drop-shadow(0 0 6px ${C.cyan})` }}/>
      <text x={cx} y={cy-4} textAnchor="middle" fontFamily="Oswald,sans-serif" fontSize={28} fontWeight={600} fill={C.textHi}>{score}</text>
      <text x={cx} y={cy+12} textAnchor="middle" fontFamily="JetBrains Mono,monospace" fontSize={7.5} fill={C.textLo} letterSpacing="0.14em">SCORE GLOBAL</text>
    </svg>
  )
}

/* ── PRESSURE DOTS ───────────────────────────────────────────────────────── */
function PressureDots({ level }: { level: PressureLevel }) {
  const activeIdx = PRESSURE_IDX[level]
  const dotColors = [C.green, C.gold, C.warn, C.cyan]
  return (
    <div style={{ display:'flex', gap:3, position:'absolute', top:8, right:8 }}>
      {dotColors.map((col, i) => (
        <div key={i} style={{
          width:7, height:7, borderRadius:'50%',
          background: i === activeIdx ? col : C.surface3,
          border: `1px solid ${i === activeIdx ? col : C.line}`,
          boxShadow: i === activeIdx ? `0 0 7px ${col}` : 'none',
        }}/>
      ))}
    </div>
  )
}

/* ── STARS ───────────────────────────────────────────────────────────────── */
function Stars({ score }: { score: number }) {
  const col = STAR_COLORS[score] || C.textMid
  return (
    <div style={{ display:'flex', gap:1, alignItems:'center', marginBottom:4 }}>
      {Array.from({ length:5 }).map((_, i) => (
        <span key={i} style={{ fontSize:9, color: i < score ? col : C.surface3 }}>★</span>
      ))}
      <span style={{ fontSize:8, color:col, marginLeft:3, fontFamily:'JetBrains Mono,monospace' }}>
        {SCORE_TIER[score]?.label}
      </span>
    </div>
  )
}

/* ── SOURCE TAG ──────────────────────────────────────────────────────────── */
function SourceTag({ source }: { source: SourceType }) {
  const styles: Record<SourceType, { bg:string; color:string; label:string }> = {
    tns:        { bg:'rgba(122,146,232,0.15)', color:C.indigo, label:'TNS'        },
    chef:       { bg:'rgba(232,200,120,0.15)', color:C.gold,   label:'Chef'       },
    particulier:{ bg:'rgba(200,64,72,0.15)',   color:C.cyan,   label:'Part.'      },
  }
  const s = styles[source]
  return (
    <span style={{
      fontSize:7, padding:'1px 5px', borderRadius:8, fontWeight:600,
      background:s.bg, color:s.color,
      border:`0.5px solid ${s.color}44`,
      fontFamily:'JetBrains Mono,monospace',
    }}>{s.label}</span>
  )
}

/* ── ACTION BUTTONS ──────────────────────────────────────────────────────── */
function ActionButtons({ prospect }: { prospect: Prospect }) {
  const waMsg = encodeURIComponent(`Bonjour ${prospect.name.split('.').pop()?.trim()?.split(' ').pop()}, je me permets de vous contacter suite à notre échange. Êtes-vous disponible cette semaine ?`)
  const btns = [
    { label:'WA',  color:'#4ab84a', href:`https://wa.me/?text=${waMsg}` },
    { label:'in',  color:C.indigo,  href:'https://linkedin.com'         },
    { label:'✉',   color:C.gold,    href:`mailto:${prospect.email}`     },
    { label:'SMS', color:'#b07aee', href:`sms:${prospect.phone}`        },
    { label:'▶',   color:C.green,   href:'#'                            },
  ]
  return (
    <div style={{ display:'flex', gap:2, flexWrap:'wrap', marginTop:5 }}>
      {btns.map(b => (
        <a key={b.label} href={b.href} target="_blank" rel="noopener"
          style={{
            fontSize:7, padding:'1px 5px', borderRadius:3, cursor:'pointer',
            border:`0.5px solid ${b.color}44`, color:b.color,
            background:`${b.color}12`, textDecoration:'none', fontWeight:600,
            fontFamily:'JetBrains Mono,monospace', lineHeight:'16px',
          }}>
          {b.label}
        </a>
      ))}
    </div>
  )
}

/* ── KANBAN CARD ──────────────────────────────────────────────────────────── */
function KanbanCard({ p, onSelect }: { p: Prospect; onSelect:(p:Prospect)=>void }) {
  const tier = SCORE_TIER[p.score]
  return (
    <div
      onClick={() => onSelect(p)}
      style={{
        background:`linear-gradient(180deg,${C.surface2},${C.surface1})`,
        border:`1px solid ${p.score>=4 ? C.gold+'44' : C.line}`,
        borderRadius:8, padding:'9px 10px',
        cursor:'pointer', marginBottom:6,
        position:'relative', overflow:'hidden',
        transition:'all 0.15s',
      }}
      onMouseEnter={e=>{
        const el=e.currentTarget as HTMLDivElement
        el.style.borderColor=C.cyan; el.style.transform='translateY(-1px)'
        el.style.boxShadow=`0 0 0 1px ${C.cyan}44, 0 4px 14px rgba(0,0,0,0.5)`
      }}
      onMouseLeave={e=>{
        const el=e.currentTarget as HTMLDivElement
        el.style.borderColor=p.score>=4?C.gold+'44':C.line
        el.style.transform='none'; el.style.boxShadow='none'
      }}
    >
      {/* Prismatic ribbon if score 5 */}
      {p.score===5 && (
        <div style={{ position:'absolute',top:0,left:0,right:0,height:1.5, background:C.ribbon, opacity:0.7 }}/>
      )}

      {/* Pressure dots */}
      <PressureDots level={p.pressure}/>

      {/* Avatar + Name + Role + City */}
      <div style={{ display:'flex', gap:7, alignItems:'flex-start', marginBottom:5, paddingRight:50 }}>
        <div style={{
          width:26, height:26, borderRadius:'50%', flexShrink:0,
          background:tier.bg, color:tier.color,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:8, fontWeight:700, fontFamily:'JetBrains Mono,monospace',
          border:`1px solid ${p.score>=4?C.gold:C.line}`,
          boxShadow:p.score>=4?`0 0 10px ${C.gold}44`:'none',
        }}>
          {p.initials}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:10, fontWeight:600, color:C.textHi, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {p.name}
          </div>
          <div style={{ fontSize:8, color:C.textLo }}>{p.role}</div>
          <div style={{ fontSize:8, color:C.textVlo }}>{p.city}</div>
        </div>
      </div>

      {/* Stars */}
      <Stars score={p.score}/>

      {/* Source tag + last contact */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
        <SourceTag source={p.source}/>
        <span style={{
          fontSize:8, color:p.alert ? C.cyan : C.textVlo,
          fontFamily:'JetBrains Mono,monospace',
          fontWeight:p.alert?700:400,
        }}>
          {p.alert && '⚠ '}{p.last}
        </span>
      </div>

      {/* Action buttons */}
      <ActionButtons prospect={p}/>

      {/* Next action */}
      <div style={{
        fontSize:7, color:C.textVlo, marginTop:5, paddingTop:5,
        borderTop:`0.5px solid ${C.lineSoft}`,
        whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
        fontFamily:'JetBrains Mono,monospace',
      }}>
        <span style={{ color:C.textLo }}>→ </span>{p.next}
      </div>
    </div>
  )
}

/* ── PROSPECT DRAWER ──────────────────────────────────────────────────────── */
function ProspectDrawer({ p, onClose }: { p:Prospect|null; onClose:()=>void }) {
  if (!p) return null
  const tier = SCORE_TIER[p.score]
  return (
    <div style={{ position:'fixed',inset:0,zIndex:200,display:'flex',alignItems:'stretch',justifyContent:'flex-end' }}>
      <div onClick={onClose} style={{ position:'absolute',inset:0,background:'rgba(10,14,34,0.75)',backdropFilter:'blur(4px)' }}/>
      <div style={{
        position:'relative', width:320, background:`linear-gradient(180deg,${C.surface1},${C.bgDeep})`,
        borderLeft:`1px solid ${C.line}`, boxShadow:`-20px 0 60px rgba(0,0,0,0.6)`,
        overflow:'auto', padding:20, display:'flex', flexDirection:'column', gap:16,
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <div style={{
              width:36, height:36, borderRadius:'50%', flexShrink:0,
              background:tier.bg, color:tier.color,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:11, fontWeight:700, border:`1px solid ${p.score>=4?C.gold:C.line}`,
              boxShadow:p.score>=4?`0 0 14px ${C.gold}44`:'none',
              fontFamily:'JetBrains Mono,monospace',
            }}>{p.initials}</div>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:C.textHi, fontFamily:'Oswald,sans-serif', letterSpacing:'0.06em' }}>{p.name}</div>
              <div style={{ fontSize:9, color:C.textLo }}>{p.role} · {p.city}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:`1px solid ${C.line}`, borderRadius:5, color:C.textMid, cursor:'pointer', padding:'3px 8px', fontSize:13 }}>✕</button>
        </div>

        <div style={{ padding:'12px 14px', background:C.surface2, borderRadius:10, border:`1px solid ${C.line}` }}>
          <div style={{ fontSize:8, color:C.textLo, fontFamily:'JetBrains Mono,monospace', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.14em' }}>AUM estimé</div>
          <div style={{ fontSize:22, fontWeight:500, color:C.textHi, fontFamily:'Oswald,sans-serif' }}>{p.aum}</div>
          <Stars score={p.score}/>
          <div style={{ display:'flex', gap:6, marginTop:4 }}>
            <SourceTag source={p.source}/>
            <span style={{ fontSize:8, color:p.alert?C.cyan:C.textVlo }}>{p.alert&&'⚠ '}{p.last}</span>
          </div>
        </div>

        <div>
          <div style={{ fontSize:8, color:C.textLo, fontFamily:'JetBrains Mono,monospace', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.14em' }}>Contacts</div>
          <div style={{ fontSize:9, color:C.textMid, lineHeight:2, fontFamily:'JetBrains Mono,monospace' }}>
            <div>📞 {p.phone}</div>
            <div>✉ {p.email}</div>
          </div>
        </div>

        <div>
          <div style={{ fontSize:8, color:C.textLo, fontFamily:'JetBrains Mono,monospace', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.14em' }}>Pression commerciale</div>
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            <PressureDots level={p.pressure}/>
            <span style={{ fontSize:9, color:PRESSURE_COLORS[p.pressure], marginLeft:80, fontWeight:600, fontFamily:'JetBrains Mono,monospace' }}>
              {p.pressure === 'low' ? 'Faible' : p.pressure === 'medium' ? 'Moyenne' : p.pressure === 'high' ? 'Haute' : 'Maximale'}
            </span>
          </div>
        </div>

        <div>
          <div style={{ fontSize:8, color:C.textLo, fontFamily:'JetBrains Mono,monospace', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.14em' }}>Prochaine action</div>
          <div style={{ fontSize:10, color:C.textHi, padding:'8px 10px', background:C.surface2, borderRadius:7, border:`1px solid ${C.line}`, fontFamily:'JetBrains Mono,monospace' }}>
            → {p.next}
          </div>
        </div>

        <div>
          <div style={{ fontSize:8, color:C.textLo, fontFamily:'JetBrains Mono,monospace', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.14em' }}>Actions rapides</div>
          <ActionButtons prospect={p}/>
        </div>
      </div>
    </div>
  )
}

/* ── MAIN PAGE ────────────────────────────────────────────────────────────── */
export default function ChampionsPage() {
  const router = useRouter()
  const [activeNav, setActiveNav] = useState('champions')
  const [prospects, setProspects] = useState<Prospect[]>(INITIAL_PROSPECTS)
  const [selected, setSelected] = useState<Prospect|null>(null)
  const [dragId, setDragId] = useState<string|null>(null)
  const [dragOver, setDragOver] = useState<KanbanStage|null>(null)
  const scriptLoaded = useRef(false)
  const prevConverti = useRef(prospects.filter(p=>p.stage==='converti').length)

  /* Auto-celebrate on converti */
  useEffect(() => {
    const n = prospects.filter(p=>p.stage==='converti').length
    if (n > prevConverti.current && scriptLoaded.current && typeof window !== 'undefined') {
      ;(window as any).Celebrations?.celebrateAll({ text:'CLIENT !' })
    }
    prevConverti.current = n
  }, [prospects])

  const handleDragStart = (e: React.DragEvent, id:string) => {
    setDragId(id); e.dataTransfer.effectAllowed='move'
  }
  const handleDragOver = (e: React.DragEvent, stage:KanbanStage) => {
    e.preventDefault(); setDragOver(stage)
  }
  const handleDrop = (e: React.DragEvent, stage:KanbanStage) => {
    e.preventDefault()
    if (!dragId) return
    setProspects(prev => prev.map(p=>p.id===dragId ? {...p,stage} : p))
    setDragId(null); setDragOver(null)
  }

  const diamond = (color=C.cyan) => (
    <span style={{ width:6,height:6,background:color,transform:'rotate(45deg)',display:'inline-block',boxShadow:`0 0 7px ${color}`,flexShrink:0 }}/>
  )

  const panelTitle = (label:string, accentColor=C.cyan) => (
    <div style={{ display:'flex',alignItems:'center',gap:7,marginBottom:14 }}>
      {diamond(accentColor)}
      <span style={{ fontFamily:'Oswald,sans-serif',fontSize:12,fontWeight:500,color:C.textHi,textTransform:'uppercase',letterSpacing:'0.16em' }}>
        {label}
      </span>
    </div>
  )

  const panel = (children:React.ReactNode, accentColor=C.cyan, extraStyle={}) => (
    <div style={{
      background:`linear-gradient(180deg,${C.surface1},${C.bgMid})`,
      border:`1px solid ${C.line}`, borderRadius:12, padding:16,
      position:'relative', overflow:'hidden', ...extraStyle,
    }}>
      <div style={{ position:'absolute',top:0,left:0,right:0,height:1, background:`linear-gradient(90deg,transparent,${accentColor}88,transparent)` }}/>
      {children}
    </div>
  )

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');`}</style>
      <Script src="/celebrations.js" strategy="afterInteractive" onLoad={()=>{ scriptLoaded.current=true }}/>
      <link rel="stylesheet" href="/celebrations.css"/>

      {/* ── Full-screen app shell ───────────────────────────────────────────── */}
      <div style={{
        position:'fixed', inset:0, overflow:'hidden',
        fontFamily:'Inter,system-ui,sans-serif',
        background:`
          radial-gradient(ellipse 1200px 600px at 50% -10%,rgba(200,64,72,0.45),transparent 55%),
          radial-gradient(ellipse 900px 500px at 85% 110%,rgba(92,112,184,0.35),transparent 60%),
          radial-gradient(ellipse 700px 400px at 10% 90%,rgba(245,232,200,0.15),transparent 60%),
          linear-gradient(180deg,${C.bgDeep} 0%,${C.bgMid} 50%,${C.bgDeep} 100%)
        `,
      }}>
        {/* Star field */}
        <div style={{
          position:'absolute',inset:0,pointerEvents:'none',
          background:`
            radial-gradient(1px 1px at 15% 20%,rgba(255,255,255,0.6),transparent),
            radial-gradient(1px 1px at 72% 8%,rgba(255,255,255,0.5),transparent),
            radial-gradient(1px 1px at 45% 35%,rgba(255,255,255,0.4),transparent),
            radial-gradient(1px 1px at 88% 55%,rgba(255,255,255,0.5),transparent),
            radial-gradient(1px 1px at 30% 65%,rgba(255,255,255,0.4),transparent),
            radial-gradient(1px 1px at 60% 80%,rgba(255,255,255,0.3),transparent),
            radial-gradient(1px 1px at 10% 90%,rgba(255,255,255,0.4),transparent),
            radial-gradient(1px 1px at 95% 25%,rgba(255,255,255,0.5),transparent)
          `,
        }}/>

        {/* ── App frame ──────────────────────────────────────────────────────── */}
        <div className="champions-app" style={{
          display:'flex', margin:'12px', height:'calc(100vh - 24px)',
          borderRadius:14, overflow:'hidden', border:`1px solid ${C.line}`,
          background:`linear-gradient(180deg,rgba(26,33,80,0.88) 0%,rgba(10,14,34,0.95) 100%)`,
          boxShadow:`0 0 0 1px rgba(255,100,112,0.12),0 0 80px rgba(200,64,72,0.20),0 0 160px rgba(92,112,184,0.15),inset 0 1px 0 rgba(245,232,200,0.06)`,
          position:'relative',
        }}>
          {/* Prismatic ribbon */}
          <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:C.ribbon,zIndex:10 }}/>

          {/* ── Sidebar ────────────────────────────────────────────────────────── */}
          <div style={{
            width:185, flexShrink:0,
            background:'linear-gradient(180deg,rgba(8,18,74,0.96),rgba(4,8,31,0.99))',
            borderRight:`1px solid ${C.line}`,
            display:'flex', flexDirection:'column', position:'relative', overflow:'hidden',
          }}>
            <div style={{ position:'absolute',top:0,right:0,bottom:0,width:1,background:`linear-gradient(180deg,transparent,rgba(77,208,255,0.3),transparent)`,pointerEvents:'none'}}/>

            {/* Logo */}
            <div style={{ padding:'18px 14px 14px', borderBottom:`1px solid ${C.lineSoft}`, display:'flex', alignItems:'center', gap:10 }}>
              <StarballSVG/>
              <div>
                <div style={{ fontFamily:'Oswald,sans-serif',fontSize:13,fontWeight:600,color:'#ffd866',letterSpacing:'0.14em',textTransform:'uppercase',textShadow:'0 0 14px rgba(255,216,102,0.55)' }}>
                  Champion's
                </div>
                <div style={{ fontFamily:'JetBrains Mono,monospace',fontSize:8,color:'#ffb84d',marginTop:2,letterSpacing:'0.18em',textTransform:'uppercase',textShadow:'0 0 8px rgba(255,184,77,0.45)' }}>
                  CGP Dashboard
                </div>
              </div>
            </div>

            {/* Nav */}
            <nav style={{ flex:1, padding:'6px 0', overflowY:'auto' }}>
              {NAV_SECTIONS.map(sec => (
                <div key={sec.label}>
                  <div style={{ fontSize:8,color:C.textVlo,padding:'8px 12px 3px',letterSpacing:'0.08em',textTransform:'uppercase' }}>
                    {sec.label}
                  </div>
                  {sec.items.map(item => {
                    const on = item.id === activeNav
                    return (
                      <div key={item.id} onClick={()=>{
                        setActiveNav(item.id)
                        const route = NAV_ROUTES[item.id]
                        if (route && item.id !== 'champions') router.push(route)
                      }} style={{
                        display:'flex', alignItems:'center', gap:6, padding:'5px 12px',
                        fontSize:10, fontWeight:500, cursor:'pointer',
                        borderLeft:`2px solid ${on?C.cyan:'transparent'}`,
                        background:on?`linear-gradient(90deg,rgba(200,64,72,0.22),transparent 70%)`:'transparent',
                        color:on?'#ffe89a':'rgba(255,216,102,0.65)',
                        textShadow:on?'0 0 10px rgba(255,216,102,0.4)':'none',
                        transition:'all 0.12s', position:'relative',
                      }}>
                        <span style={{ width:4,height:4,borderRadius:'50%',background:'currentColor',flexShrink:0,opacity:on?1:0.5 }}/>
                        <span style={{ flex:1 }}>{item.label}</span>
                        {(item as any).badge && (
                          <span style={{ minWidth:16,height:16,background:C.ribbon,color:C.bgDeep,borderRadius:8,fontSize:8,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'JetBrains Mono,monospace' }}>
                            {(item as any).badge}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </nav>

            {/* User */}
            <div style={{ padding:'10px 12px', borderTop:`1px solid ${C.lineSoft}`, display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:26,height:26,borderRadius:'50%',background:`linear-gradient(135deg,${C.magenta},${C.indigo})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:C.textHi,border:`1px solid ${C.line}`,fontFamily:'JetBrains Mono,monospace' }}>TK</div>
              <div>
                <div style={{ fontSize:10,color:C.textHi,fontWeight:600 }}>Ted</div>
                <div style={{ fontSize:7,color:C.textLo,fontFamily:'JetBrains Mono,monospace' }}>CGP Indépendant</div>
              </div>
            </div>
          </div>

          {/* ── Main content ────────────────────────────────────────────────────── */}
          <div style={{ flex:1, overflowY:'auto', overflowX:'hidden', padding:'16px', display:'flex', flexDirection:'column', gap:12 }}>

            {/* ROW 1 — KPI cards */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
              {KPI_DATA.map(kpi => (
                <div key={kpi.label} style={{
                  background:`linear-gradient(180deg,rgba(20,37,103,0.9),rgba(10,21,84,0.7))`,
                  border:`1px solid ${C.line}`, borderRadius:10, padding:'12px 14px', position:'relative', overflow:'hidden',
                }}>
                  <div style={{ position:'absolute',top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${kpi.ok?C.cyan:C.warn}88,transparent)` }}/>
                  <div style={{ fontFamily:'JetBrains Mono,monospace',fontSize:8,color:C.textLo,marginBottom:5,textTransform:'uppercase',letterSpacing:'0.14em' }}>{kpi.label}</div>
                  <div style={{ fontFamily:'Oswald,sans-serif',fontSize:24,fontWeight:500,color:C.textHi,margin:'4px 0' }}>{kpi.value}</div>
                  <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                    <span style={{ fontSize:8,color:C.textLo }}>{kpi.sub}</span>
                    <span style={{ fontSize:9,fontWeight:700,color:kpi.trend>0?C.green:C.cyan,fontFamily:'JetBrains Mono,monospace' }}>
                      {kpi.trend>0?'▲':'▼'} {Math.abs(kpi.trend)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* ROW 2 — Gauge + Agenda + Commissions */}
            <div style={{ display:'grid', gridTemplateColumns:'155px 1fr 195px', gap:10 }}>

              {/* Gauge */}
              {panel(
                <>
                  {panelTitle('Score', C.cyan)}
                  <div style={{ display:'flex', justifyContent:'center' }}>
                    <ScoreGauge score={68}/>
                  </div>
                  <div style={{ fontSize:8,color:C.textLo,fontFamily:'JetBrains Mono,monospace',textAlign:'center',marginTop:4,lineHeight:1.6 }}>
                    Closing {Math.round(prospects.filter(p=>p.stage==='converti').length/prospects.length*100)}% · Pipeline actif
                  </div>
                </>,
                C.cyan
              )}

              {/* Agenda */}
              {panel(
                <>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                    <div style={{ display:'flex',alignItems:'center',gap:7 }}>
                      {diamond(C.indigo)}
                      <span style={{ fontFamily:'Oswald,sans-serif',fontSize:12,fontWeight:500,color:C.textHi,textTransform:'uppercase',letterSpacing:'0.16em' }}>Agenda Sem. 19</span>
                    </div>
                    <span style={{ fontSize:8,color:C.textLo,fontFamily:'JetBrains Mono,monospace' }}>21–25 avr. 2026</span>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'28px repeat(5,1fr)', gap:2 }}>
                    <div/>
                    {DAYS.map(d => (
                      <div key={d} style={{ fontSize:7,fontFamily:'JetBrains Mono,monospace',color:C.textLo,textAlign:'center',paddingBottom:3,letterSpacing:'0.06em' }}>{d}</div>
                    ))}
                    {HOURS.map(hour => (
                      <React.Fragment key={`h${hour}`}>
                        <div style={{ fontSize:6,color:C.textVlo,fontFamily:'JetBrains Mono,monospace',display:'flex',alignItems:'center' }}>{hour}h</div>
                        {DAYS.map((_,di) => {
                          const ev = EVENTS.find(e=>e.day===di&&e.hour===hour)
                          return (
                            <div key={`${hour}-${di}`} title={ev?.title} style={{
                              height:19, borderRadius:3,
                              background:ev?EVENT_COLORS[ev.type]+'20':C.surface1,
                              border:`1px solid ${ev?EVENT_COLORS[ev.type]+'55':C.lineSoft}`,
                              position:'relative', overflow:'hidden',
                            }}>
                              {ev && (
                                <div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',padding:'0 3px' }}>
                                  <div style={{ fontSize:5.5,color:EVENT_COLORS[ev.type],fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',fontFamily:'JetBrains Mono,monospace' }}>
                                    {ev.title}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                </>,
                C.indigo
              )}

              {/* Commissions */}
              {panel(
                <>
                  {panelTitle('Commissions', C.gold)}
                  <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
                    {COMMISSIONS.map(c => (
                      <div key={c.label}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                          <span style={{ fontSize:8,color:C.textMid,fontFamily:'JetBrains Mono,monospace' }}>{c.label}</span>
                          <span style={{ fontSize:8,fontWeight:700,color:c.color,fontFamily:'JetBrains Mono,monospace' }}>{c.amount.toLocaleString('fr-FR')} €</span>
                        </div>
                        <div style={{ height:4,background:C.surface3,borderRadius:2 }}>
                          <div style={{ height:'100%',width:`${c.pct}%`,background:`linear-gradient(90deg,${c.color}88,${c.color})`,borderRadius:2,boxShadow:`0 0 5px ${c.color}44`,transition:'width 1s ease-out' }}/>
                        </div>
                        <div style={{ fontSize:7,color:C.textVlo,textAlign:'right',marginTop:1,fontFamily:'JetBrains Mono,monospace' }}>{c.pct}%</div>
                      </div>
                    ))}
                  </div>
                </>,
                C.gold
              )}
            </div>

            {/* ROW 3 — Kanban */}
            {panel(
              <>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                  <div style={{ display:'flex',alignItems:'center',gap:7 }}>
                    {diamond(C.cyan)}
                    <span style={{ fontFamily:'Oswald,sans-serif',fontSize:12,fontWeight:500,color:C.textHi,textTransform:'uppercase',letterSpacing:'0.16em' }}>Pipeline CRM</span>
                  </div>
                  <div style={{ fontSize:8,color:C.textLo,fontFamily:'JetBrains Mono,monospace' }}>
                    {prospects.length} prospects · glisser pour déplacer
                  </div>
                </div>

                {/* Pressure legend */}
                <div style={{ display:'flex', gap:12, marginBottom:10, padding:'5px 9px', background:C.surface1, borderRadius:5, flexWrap:'wrap' }}>
                  {([['low',C.green,'Faible'],['medium',C.gold,'Moyenne'],['high',C.warn,'Haute'],['max',C.cyan,'Max']] as const).map(([lvl,col,lbl]) => (
                    <div key={lvl} style={{ display:'flex',alignItems:'center',gap:4,fontSize:7,color:C.textLo,fontFamily:'JetBrains Mono,monospace' }}>
                      <div style={{ width:6,height:6,borderRadius:'50%',background:col,boxShadow:`0 0 5px ${col}` }}/>
                      {lbl}
                    </div>
                  ))}
                </div>

                {/* Columns */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:8 }}>
                  {STAGES.map(stage => {
                    const sc = STAGE_COLORS[stage.colorKey]
                    const cards = prospects.filter(p=>p.stage===stage.id)
                    const isOver = dragOver === stage.id
                    return (
                      <div key={stage.id}
                        onDragOver={e=>handleDragOver(e,stage.id)}
                        onDrop={e=>handleDrop(e,stage.id)}
                        style={{
                          background: isOver ? sc.bg : C.surface1+'88',
                          border:`1px solid ${isOver?sc.text:sc.border}`,
                          borderRadius:9, padding:'8px 7px', minHeight:100,
                          transition:'all 0.15s',
                        }}
                      >
                        {/* Column header */}
                        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8 }}>
                          <span style={{ fontSize:8,fontWeight:600,fontFamily:'Oswald,sans-serif',letterSpacing:'0.1em',textTransform:'uppercase',color:sc.text }}>{stage.label}</span>
                          <span style={{ fontSize:8,fontWeight:700,color:sc.text,background:`${sc.text}18`,borderRadius:4,padding:'1px 5px',fontFamily:'JetBrains Mono,monospace' }}>
                            {cards.length}
                          </span>
                        </div>
                        {cards.map(p => (
                          <div key={p.id} draggable onDragStart={e=>handleDragStart(e,p.id)} onDragEnd={()=>{setDragId(null);setDragOver(null)}} style={{ opacity:dragId===p.id?0.35:1 }}>
                            <KanbanCard p={p} onSelect={setSelected}/>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              </>,
              C.cyan
            )}

            {/* ROW 4 — Funnel */}
            {panel(
              <>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                  <div style={{ display:'flex',alignItems:'center',gap:7 }}>
                    {diamond(C.indigo)}
                    <span style={{ fontFamily:'Oswald,sans-serif',fontSize:12,fontWeight:500,color:C.textHi,textTransform:'uppercase',letterSpacing:'0.16em' }}>Funnel de conversion</span>
                  </div>
                  <span style={{ fontSize:8,color:C.textLo,fontFamily:'JetBrains Mono,monospace' }}>
                    Closing global {Math.round(34/142*100)}%
                  </span>
                </div>
                <div style={{ display:'flex', alignItems:'flex-end', gap:4, height:55 }}>
                  {FUNNEL.map((step, i) => {
                    const h = (step.count/FUNNEL[0].count*100)
                    return (
                      <div key={step.label} style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3 }}>
                        <div style={{ fontSize:9,fontWeight:700,color:step.color,fontFamily:'JetBrains Mono,monospace' }}>{step.count}</div>
                        <div style={{ width:'100%',height:`${h}%`,background:`linear-gradient(180deg,${step.color}44,${step.color}88)`,border:`1px solid ${step.color}66`,borderRadius:'3px 3px 0 0',boxShadow:`0 0 6px ${step.color}33`,minHeight:4 }}/>
                        <div style={{ fontSize:7,color:C.textLo,fontFamily:'JetBrains Mono,monospace',whiteSpace:'nowrap' }}>{step.label}</div>
                        {i < FUNNEL.length-1 && (
                          <div style={{ fontSize:7,color:C.textVlo }}>{Math.round(FUNNEL[i+1].count/step.count*100)}%</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>,
              C.indigo
            )}

          </div>
        </div>
      </div>

      <ProspectDrawer p={selected} onClose={()=>setSelected(null)}/>
    </>
  )
}
