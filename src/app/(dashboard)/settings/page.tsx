'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { C } from '@/lib/theme'
import { LinkButton, LinkChip } from '@/lib/cross-links'
import { useUserSettings, UserSettings } from '@/hooks/useUserSettings'

type Tab = 'general' | 'kpi' | 'notifications' | 'integrations' | 'sections' | 'mobile' | 'sequences' | 'variantes' | 'triggers' | 'scripts'

const TABS: { id: Tab; label: string }[] = [
  { id: 'general', label: 'Général' },
  { id: 'kpi', label: '📊 KPI' },
  { id: 'notifications', label: '🔔 Notif' },
  { id: 'integrations', label: '🔗 API' },
  { id: 'sections', label: '👁️ Sections' },
  { id: 'mobile', label: '📱 Mobile' },
  { id: 'sequences', label: '🔗 Séquences' },
  { id: 'variantes', label: '🎯 Variantes' },
  { id: 'triggers', label: '⚡ Triggers' },
  { id: 'scripts', label: '📞 Scripts' },
]

const MONTHS_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
const MONTHS_ID = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const MONTHS_WEEKS = [4, 4, 4, 4, 4, 4, 4, 4, 5, 4, 4, 5]

const SECTIONS_LIST = [
  { id: 'today', label: '🏠 Vue du jour', desc: 'Dashboard principal quotidien' },
  { id: 'global', label: '🌍 Global', desc: "Vue d'ensemble et planning annuel" },
  { id: 'tns', label: '📊 TNS', desc: 'Travailleurs Non Salariés' },
  { id: 'chefs', label: "💼 Chefs d'entreprise", desc: 'Gestion dirigeants' },
  { id: 'particuliers', label: '👤 Particuliers', desc: 'Gestion clients particuliers' },
  { id: 'interpro', label: '🤝 Cercle Interpro', desc: 'Réseau professionnel' },
  { id: 'agenda', label: '📅 Agenda', desc: 'Calendrier et rendez-vous' },
  { id: 'sequences', label: '📧 Séquences', desc: 'Campagnes automatisées' },
  { id: 'commerce', label: '💰 Commerce', desc: 'Suivi commercial' },
  { id: 'chrono', label: '⏱️ Chronomètre', desc: 'Blocs de production' },
  { id: 'champions', label: '🏆 Champions', desc: 'Classement collecte' },
  { id: 'revenue', label: '💰 Revenue', desc: 'CA et commissions' },
  { id: 'pipeline', label: '📊 Pipeline', desc: 'Suivi des deals' },
  { id: 'tasks', label: '✅ Tâches', desc: 'Gestion des tâches' },
  { id: 'crm', label: '📋 CRM Kanban', desc: 'Pipeline visuel' },
  { id: 'clients', label: '⭐ Premium', desc: 'Clients premium' },
  { id: 'map', label: '🗺️ Carte TNS', desc: 'Cartographie prospects' },
  { id: 'simulator', label: '🎯 Simulateur', desc: 'Simulations collecte' },
  { id: 'auto', label: '⚙️ Automatisations', desc: 'Workflows auto' },
  { id: 'analytics', label: '📊 Analytics', desc: 'Statistiques avancées' },
  { id: 'assistant', label: '🤖 Assistant', desc: 'IA assistant' },
]

const MOBILE_SECTIONS = [
  { id: 'today', label: '🏠 Vue du jour', defaultOn: true },
  { id: 'global', label: '🌍 Global', defaultOn: true },
  { id: 'champions', label: '🏆 Champions', defaultOn: true },
  { id: 'tns', label: '📊 TNS', defaultOn: true },
  { id: 'chefs', label: '💼 Chefs entreprise', defaultOn: false },
  { id: 'particuliers', label: '👤 Particuliers', defaultOn: false },
  { id: 'agenda', label: '📅 Agenda', defaultOn: true },
  { id: 'sequences', label: '📧 Séquences', defaultOn: false },
  { id: 'commerce', label: '💰 Commerce', defaultOn: true },
  { id: 'crm', label: '📋 CRM', defaultOn: false },
  { id: 'settings', label: '⚙️ Paramètres', defaultOn: true },
]

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ position: 'relative', display: 'inline-block', width: 48, height: 24, flexShrink: 0, cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
      <span style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        background: checked ? C.green : C.textVlo,
        borderRadius: 24, transition: '0.3s',
      }} />
      <span style={{
        position: 'absolute',
        height: 18, width: 18,
        left: checked ? 27 : 3,
        bottom: 3,
        background: 'white', borderRadius: '50%', transition: '0.3s',
      }} />
    </label>
  )
}

function SetRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 12px', background: C.surface1, borderRadius: 6,
      border: `1px solid ${C.lineSoft}`, marginBottom: 8,
    }}>
      {children}
    </div>
  )
}

function SetLabel({ label, desc }: { label: string; desc?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 500, color: C.textHi, fontFamily: 'Inter,sans-serif' }}>{label}</div>
      {desc && <div style={{ fontSize: 8, color: C.textLo, marginTop: 2, fontFamily: 'JetBrains Mono,monospace' }}>{desc}</div>}
    </div>
  )
}

function NumInput({ id, value, min, max, step, onChange }: { id?: string; value: number; min: number; max: number; step?: number; onChange?: (v: number) => void }) {
  const [val, setVal] = useState(value)
  return (
    <input
      id={id}
      type="number"
      value={val}
      onChange={e => {
        const n = Number(e.target.value)
        setVal(n)
        onChange?.(n)
      }}
      min={min} max={max} step={step || 1}
      style={{
        width: 70, padding: '6px 8px', background: C.surface2,
        border: `1px solid ${C.line}`, borderRadius: 5,
        color: C.gold, fontSize: 13, fontWeight: 600,
        textAlign: 'center', fontFamily: 'JetBrains Mono,monospace',
      }}
    />
  )
}

function SectionPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: `linear-gradient(180deg,${C.surface1},${C.bgMid})`,
      border: `1px solid ${C.line}`, borderRadius: 10,
      padding: 14, marginBottom: 12, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,#ff647066,transparent)' }} />
      <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 600, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function SetBtn({ onClick, color, bg, children }: { onClick?: () => void; color: string; bg: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 12px', background: bg,
        border: `1px solid ${color}`, color,
        borderRadius: 6, fontSize: 9, fontWeight: 600,
        cursor: 'pointer', fontFamily: 'Oswald,sans-serif', letterSpacing: '0.05em',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}

// ─── ONGLET GÉNÉRAL ──────────────────────────────────────────────────────────
function triggerCelebration(type: string) {
  if (type === 'confetti') {
    const colors = ['#e8c878', '#ff6470', '#4ade80', '#818cf8', '#fbbf24']
    for (let i = 0; i < 80; i++) {
      const el = document.createElement('div')
      el.style.cssText = `position:fixed;top:-10px;left:${Math.random()*100}vw;width:${6+Math.random()*6}px;height:${6+Math.random()*6}px;background:${colors[Math.floor(Math.random()*colors.length)]};border-radius:${Math.random()>0.5?'50%':'2px'};z-index:99999;pointer-events:none;animation:confetti-fall ${2+Math.random()*2}s ease-in forwards;opacity:0.9;`
      document.body.appendChild(el)
      setTimeout(() => el.remove(), 4000)
    }
    if (!document.getElementById('confetti-style')) {
      const style = document.createElement('style')
      style.id = 'confetti-style'
      style.textContent = '@keyframes confetti-fall{to{transform:translateY(100vh) rotate(720deg);opacity:0}}'
      document.head.appendChild(style)
    }
    toast.success('🎊 Confettis !')
  } else if (type === 'rocket') {
    const el = document.createElement('div')
    el.style.cssText = 'position:fixed;bottom:0;left:50%;transform:translateX(-50%);font-size:48px;z-index:99999;pointer-events:none;animation:rocket-up 2s ease-out forwards;'
    el.textContent = '🚀'
    document.body.appendChild(el)
    if (!document.getElementById('rocket-style')) {
      const style = document.createElement('style')
      style.id = 'rocket-style'
      style.textContent = '@keyframes rocket-up{0%{bottom:0;opacity:1}100%{bottom:100vh;opacity:0}}'
      document.head.appendChild(style)
    }
    setTimeout(() => el.remove(), 2500)
    toast.success('🚀 Record battu !')
  } else if (type === 'fireworks') {
    for (let burst = 0; burst < 3; burst++) {
      setTimeout(() => {
        const cx = 20 + Math.random() * 60
        const cy = 20 + Math.random() * 40
        for (let i = 0; i < 20; i++) {
          const el = document.createElement('div')
          const angle = (i / 20) * Math.PI * 2
          const dist = 40 + Math.random() * 60
          const color = ['#e8c878', '#ff6470', '#4ade80', '#818cf8', '#b07aee'][Math.floor(Math.random() * 5)]
          el.style.cssText = `position:fixed;top:${cy}vh;left:${cx}vw;width:5px;height:5px;background:${color};border-radius:50%;z-index:99999;pointer-events:none;animation:fw-burst 1s ease-out forwards;--dx:${Math.cos(angle)*dist}px;--dy:${Math.sin(angle)*dist}px;`
          document.body.appendChild(el)
          setTimeout(() => el.remove(), 1200)
        }
      }, burst * 400)
    }
    if (!document.getElementById('fireworks-style')) {
      const style = document.createElement('style')
      style.id = 'fireworks-style'
      style.textContent = '@keyframes fw-burst{0%{transform:translate(0,0);opacity:1}100%{transform:translate(var(--dx),var(--dy));opacity:0}}'
      document.head.appendChild(style)
    }
    toast.success("🎆 Feux d'artifice !")
  } else if (type === 'gong_rdv' || type === 'gong_contrat') {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(type === 'gong_rdv' ? 180 : 120, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(type === 'gong_rdv' ? 90 : 60, ctx.currentTime + 2)
    gain.gain.setValueAtTime(0.5, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2)
    osc.start()
    osc.stop(ctx.currentTime + 2)
    toast.success(type === 'gong_rdv' ? '🔔 Gong RDV !' : '🔔 Gong contrat signé !')
  }
}

function TabGeneral({ settings, save, saving }: { settings: UserSettings | null; save: (p: Partial<UserSettings>) => Promise<unknown>; saving: boolean }) {
  const [objCount, setObjCount] = useState(settings?.objectives_count ?? 4)
  const [contacts, setContacts] = useState(settings?.daily_targets?.contacts ?? 10)
  const [calls, setCalls] = useState(settings?.daily_targets?.calls ?? 20)
  const [rdv1, setRdv1] = useState(settings?.daily_targets?.rdv1 ?? 5)
  const [rdv2, setRdv2] = useState(settings?.daily_targets?.rdv2 ?? 3)
  const [blocDuration, setBlocDuration] = useState(settings?.bloc_duration_minutes ?? 45)
  const [blocsNormal, setBlocsNormal] = useState(settings?.blocs_per_day_normal ?? 4)
  const [blocsMax, setBlocsMax] = useState(settings?.blocs_per_day_max ?? 6)
  const [callsWeek, setCallsWeek] = useState((settings?.calls_per_day_target ?? 8) * 5)
  const [blocsWeek, setBlocsWeek] = useState((settings?.blocks_per_day_target ?? 3) * 5)
  const [relancesWeek, setRelancesWeek] = useState(settings?.rdv_per_week_target ?? 12)
  const [closingPct, setClosingPct] = useState(settings?.closing_target_pct ?? 40)
  const [delayEmail, setDelayEmail] = useState(settings?.sequence_delay_email ?? 3)
  const [delaySms, setDelaySms] = useState(settings?.sequence_delay_sms ?? 5)
  const [delayWa, setDelayWa] = useState(settings?.sequence_delay_whatsapp ?? 2)
  const [stepsMax, setStepsMax] = useState(settings?.sequence_steps_max ?? 6)
  const [stopDays, setStopDays] = useState(settings?.sequence_stop_days ?? 21)
  const [coachText, setCoachText] = useState(settings?.coach_instructions ?? '')
  const [rdvR1Annual, setRdvR1Annual] = useState(settings?.rdv_r1_annual ?? 240)
  const [rdvR2Annual, setRdvR2Annual] = useState(settings?.rdv_r2_annual ?? 144)
  const [collecteAnnual, setCollecteAnnual] = useState(settings?.collecte_annual ?? 600000)
  const [intensity, setIntensity] = useState<Record<string, number>>(settings?.monthly_intensity ?? Object.fromEntries(MONTHS_ID.map(m => [m, 1.0])))
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (settings) {
      setObjCount(settings.objectives_count ?? 4)
      setContacts(settings.daily_targets?.contacts ?? 10)
      setCalls(settings.daily_targets?.calls ?? 20)
      setRdv1(settings.daily_targets?.rdv1 ?? 5)
      setRdv2(settings.daily_targets?.rdv2 ?? 3)
      setBlocDuration(settings.bloc_duration_minutes ?? 45)
      setBlocsNormal(settings.blocs_per_day_normal ?? 4)
      setBlocsMax(settings.blocs_per_day_max ?? 6)
      setCallsWeek((settings.calls_per_day_target ?? 8) * 5)
      setBlocsWeek((settings.blocks_per_day_target ?? 3) * 5)
      setRelancesWeek(settings.rdv_per_week_target ?? 12)
      setClosingPct(settings.closing_target_pct ?? 40)
      setDelayEmail(settings.sequence_delay_email ?? 3)
      setDelaySms(settings.sequence_delay_sms ?? 5)
      setDelayWa(settings.sequence_delay_whatsapp ?? 2)
      setStepsMax(settings.sequence_steps_max ?? 6)
      setStopDays(settings.sequence_stop_days ?? 21)
      setCoachText(settings.coach_instructions ?? '')
      setRdvR1Annual(settings.rdv_r1_annual ?? 240)
      setRdvR2Annual(settings.rdv_r2_annual ?? 144)
      setCollecteAnnual(settings.collecte_annual ?? 600000)
      if (settings.monthly_intensity) setIntensity(settings.monthly_intensity)
    }
  }, [settings])

  async function handleSave() {
    await save({
      objectives_count: objCount,
      daily_targets: { contacts, calls, rdv1, rdv2 },
      bloc_duration_minutes: blocDuration,
      blocs_per_day_normal: blocsNormal,
      blocs_per_day_max: blocsMax,
      calls_per_day_target: Math.round(callsWeek / 5),
      blocks_per_day_target: Math.round(blocsWeek / 5),
      rdv_per_week_target: relancesWeek,
      closing_target_pct: closingPct,
      sequence_delay_email: delayEmail,
      sequence_delay_sms: delaySms,
      sequence_delay_whatsapp: delayWa,
      sequence_steps_max: stepsMax,
      sequence_stop_days: stopDays,
      coach_instructions: coachText,
      rdv_r1_annual: rdvR1Annual,
      rdv_r2_annual: rdvR2Annual,
      collecte_annual: collecteAnnual,
      monthly_intensity: intensity,
    })
    setDirty(false)
    toast.success('Paramètres généraux enregistrés')
  }

  function markDirty() { setDirty(true) }

  return (
    <>
      <SectionPanel title="🎯 Coach Champions — Personnalisation">
        <div style={{ fontSize: 9, color: C.textLo, marginBottom: 12, lineHeight: 1.6, fontFamily: 'Inter,sans-serif' }}>
          Personnalise les recommandations du coach dans la section Champions. Donne des instructions spécifiques sur le ton, les priorités, ou le type de conseils que tu veux recevoir.
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 8, color: C.textLo, display: 'block', marginBottom: 6, fontFamily: 'JetBrains Mono,monospace' }}>Instructions pour le coach</label>
          <textarea
            value={coachText}
            onChange={e => { setCoachText(e.target.value); markDirty() }}
            placeholder="Ex: Sois direct et cash, focus sur les actions concrètes. Rappelle-moi mes objectifs financiers personnels. Motive-moi avec des comparaisons sportives..."
            style={{
              width: '100%', minHeight: 120, padding: 10,
              background: C.surface2, border: `1px solid ${C.line}`,
              borderRadius: 6, color: C.text, fontSize: 10,
              lineHeight: 1.6, resize: 'vertical', fontFamily: 'Inter,sans-serif',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ fontSize: 8, color: C.textLo, marginTop: 6, fontFamily: 'JetBrains Mono,monospace' }}>
            💡 Le coach utilisera ces instructions pour adapter son analyse et ses recommandations
          </div>
        </div>
        <SetBtn onClick={handleSave} color={C.green} bg="#0d1a0d">{saving ? '⏳...' : '💾 Enregistrer les instructions'}</SetBtn>
      </SectionPanel>

      <SectionPanel title="🎯 Objectifs quotidiens">
        <div style={{ background: C.surface1, border: `1px solid ${C.lineSoft}`, borderRadius: 8, padding: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 9, fontWeight: 600, color: C.gold, marginBottom: 6, fontFamily: 'Oswald,sans-serif' }}>Nombre d'objectifs affichés</div>
          <div style={{ fontSize: 8, color: C.textLo, marginBottom: 10, fontFamily: 'JetBrains Mono,monospace' }}>Choisis combien d'objectifs afficher dans la section "Aujourd'hui"</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
            {[2, 3, 4, 6].map(n => (
              <label
                key={n}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: 8,
                  background: objCount === n ? '#1a1400' : C.surface2,
                  border: `1px solid ${objCount === n ? C.gold : C.line}`,
                  borderRadius: 6, cursor: 'pointer',
                }}
              >
                <input type="radio" name="objectives-count" value={n} checked={objCount === n} onChange={() => { setObjCount(n); markDirty() }} style={{ cursor: 'pointer' }} />
                <span style={{ fontSize: 9, color: objCount === n ? C.gold : C.text, fontWeight: objCount === n ? 600 : 400, fontFamily: 'Inter,sans-serif' }}>{n} objectifs</span>
              </label>
            ))}
          </div>
          <div style={{ fontSize: 8, color: C.textLo, marginTop: 10, fontFamily: 'JetBrains Mono,monospace' }}>
            💡 Objectifs disponibles : Contacts, Appels, RDV R1, RDV R2, Signatures, Relances
          </div>
        </div>

        <SetRow>
          <SetLabel label="Nouveaux contacts / jour" desc="Prospects ajoutés quotidiennement" />
          <NumInput value={contacts} min={1} max={100} onChange={v => { setContacts(v); markDirty() }} />
        </SetRow>
        <SetRow>
          <SetLabel label="Appels / jour" desc="Nombre d'appels quotidien visé" />
          <NumInput value={calls} min={1} max={100} onChange={v => { setCalls(v); markDirty() }} />
        </SetRow>
        <SetRow>
          <SetLabel label="RDV R1 / jour" desc="Premiers rendez-vous à poser" />
          <NumInput value={rdv1} min={1} max={100} onChange={v => { setRdv1(v); markDirty() }} />
        </SetRow>
        <SetRow>
          <SetLabel label="RDV R2 / jour" desc="Deuxièmes rendez-vous à poser" />
          <NumInput value={rdv2} min={1} max={100} onChange={v => { setRdv2(v); markDirty() }} />
        </SetRow>
      </SectionPanel>

      <SectionPanel title="⏱️ Chronomètre production">
        <SetRow>
          <SetLabel label="Durée d'un bloc (minutes)" desc="Deep work / Pomodoro — défaut 45 min" />
          <NumInput value={blocDuration} min={15} max={120} onChange={v => { setBlocDuration(v); markDirty() }} />
        </SetRow>
        <SetRow>
          <SetLabel label="Blocs / jour (normal)" desc="Objectif standard de blocs quotidiens" />
          <NumInput value={blocsNormal} min={2} max={10} onChange={v => { setBlocsNormal(v); markDirty() }} />
        </SetRow>
        <SetRow>
          <SetLabel label="Blocs / jour (grosse prod)" desc="Objectif max de blocs quotidiens" />
          <NumInput value={blocsMax} min={3} max={12} onChange={v => { setBlocsMax(v); markDirty() }} />
        </SetRow>
      </SectionPanel>

      <SectionPanel title="📊 Objectifs hebdomadaires">
        <SetRow>
          <SetLabel label="Appels / semaine" desc="Total d'appels visé sur la semaine" />
          <NumInput value={callsWeek} min={10} max={200} onChange={v => { setCallsWeek(v); markDirty() }} />
        </SetRow>
        <SetRow>
          <SetLabel label="Blocs / semaine" desc="Total de blocs production" />
          <NumInput value={blocsWeek} min={5} max={50} onChange={v => { setBlocsWeek(v); markDirty() }} />
        </SetRow>
        <SetRow>
          <SetLabel label="Relances / semaine" desc="Total de relances prospects" />
          <NumInput value={relancesWeek} min={3} max={50} onChange={v => { setRelancesWeek(v); markDirty() }} />
        </SetRow>
        <SetRow>
          <SetLabel label="Taux closing objectif (%)" desc="Pourcentage de conversion visé" />
          <NumInput value={closingPct} min={10} max={80} onChange={v => { setClosingPct(v); markDirty() }} />
        </SetRow>
      </SectionPanel>

      <SectionPanel title="🎯 Planification annuelle intelligente">
        <div style={{ fontSize: 9, color: C.textLo, marginBottom: 14, lineHeight: 1.6, fontFamily: 'Inter,sans-serif' }}>
          Définis tes objectifs annuels. Le dashboard calculera automatiquement les objectifs mensuels et hebdomadaires selon l'intensité de chaque mois.
        </div>

        <div style={{ background: C.surface1, border: `1px solid ${C.lineSoft}`, borderRadius: 8, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.gold, marginBottom: 12, fontFamily: 'Oswald,sans-serif' }}>📊 Objectifs annuels 2026</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            <div>
              <label style={{ fontSize: 8, color: C.textLo, display: 'block', marginBottom: 4, fontFamily: 'JetBrains Mono,monospace' }}>RDV R1 annuel</label>
              <input type="number" value={rdvR1Annual} onChange={e => { setRdvR1Annual(Number(e.target.value)); markDirty() }} style={{ width: '100%', padding: 8, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 6, color: C.indigo, fontSize: 14, fontWeight: 600, textAlign: 'center', boxSizing: 'border-box', fontFamily: 'JetBrains Mono,monospace' }} />
            </div>
            <div>
              <label style={{ fontSize: 8, color: C.textLo, display: 'block', marginBottom: 4, fontFamily: 'JetBrains Mono,monospace' }}>RDV R2 annuel</label>
              <input type="number" value={rdvR2Annual} onChange={e => { setRdvR2Annual(Number(e.target.value)); markDirty() }} style={{ width: '100%', padding: 8, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 6, color: C.green, fontSize: 14, fontWeight: 600, textAlign: 'center', boxSizing: 'border-box', fontFamily: 'JetBrains Mono,monospace' }} />
            </div>
            <div>
              <label style={{ fontSize: 8, color: C.textLo, display: 'block', marginBottom: 4, fontFamily: 'JetBrains Mono,monospace' }}>Collecte annuelle (€)</label>
              <input type="number" value={collecteAnnual} onChange={e => { setCollecteAnnual(Number(e.target.value)); markDirty() }} style={{ width: '100%', padding: 8, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 6, color: C.gold, fontSize: 14, fontWeight: 600, textAlign: 'center', boxSizing: 'border-box', fontFamily: 'JetBrains Mono,monospace' }} />
            </div>
          </div>
        </div>

        <div style={{ background: C.surface1, border: `1px solid ${C.lineSoft}`, borderRadius: 8, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.gold, marginBottom: 6, fontFamily: 'Oswald,sans-serif' }}>📅 Intensité par mois</div>
          <div style={{ fontSize: 8, color: C.textLo, marginBottom: 12, fontFamily: 'JetBrains Mono,monospace' }}>↘↘ -30% · ↘ -10% · - Normal · ↗ +10% · ↗↗ +30%</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 8, marginBottom: 8 }}>
            {MONTHS_ID.slice(0, 6).map((id, i) => (
              <div key={id} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 8, color: C.textLo, marginBottom: 4, fontFamily: 'JetBrains Mono,monospace' }}>{MONTHS_SHORT[i]} ({MONTHS_WEEKS[i]}s)</div>
                <select value={String(intensity[id] ?? 1.0)} onChange={e => { setIntensity(prev => ({ ...prev, [id]: parseFloat(e.target.value) })); markDirty() }} style={{ width: '100%', padding: 4, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 4, color: C.text, fontSize: 11, textAlign: 'center' }}>
                  <option value="0.7">↘↘</option>
                  <option value="0.9">↘</option>
                  <option value="1.0">-</option>
                  <option value="1.1">↗</option>
                  <option value="1.3">↗↗</option>
                </select>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 8 }}>
            {MONTHS_ID.slice(6).map((id, i) => (
              <div key={id} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 8, color: C.textLo, marginBottom: 4, fontFamily: 'JetBrains Mono,monospace' }}>{MONTHS_SHORT[i + 6]} ({MONTHS_WEEKS[i + 6]}s)</div>
                <select value={String(intensity[id] ?? 1.0)} onChange={e => { setIntensity(prev => ({ ...prev, [id]: parseFloat(e.target.value) })); markDirty() }} style={{ width: '100%', padding: 4, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 4, color: C.text, fontSize: 11, textAlign: 'center' }}>
                  <option value="0.7">↘↘</option>
                  <option value="0.9">↘</option>
                  <option value="1.0">-</option>
                  <option value="1.1">↗</option>
                  <option value="1.3">↗↗</option>
                </select>
              </div>
            ))}
          </div>
        </div>
      </SectionPanel>

      <SectionPanel title="📧 Séquences — Délais par défaut">
        <SetRow>
          <SetLabel label="Délai entre emails (jours)" desc="Espacement entre 2 emails dans une séquence" />
          <NumInput value={delayEmail} min={1} max={30} onChange={v => { setDelayEmail(v); markDirty() }} />
        </SetRow>
        <SetRow>
          <SetLabel label="Délai entre SMS (jours)" desc="Espacement entre 2 SMS" />
          <NumInput value={delaySms} min={1} max={30} onChange={v => { setDelaySms(v); markDirty() }} />
        </SetRow>
        <SetRow>
          <SetLabel label="Délai entre WhatsApp (jours)" desc="Espacement entre 2 messages WA" />
          <NumInput value={delayWa} min={1} max={30} onChange={v => { setDelayWa(v); markDirty() }} />
        </SetRow>
        <SetRow>
          <SetLabel label="Étapes max par séquence" desc="Nombre maximum d'étapes" />
          <NumInput value={stepsMax} min={3} max={20} onChange={v => { setStepsMax(v); markDirty() }} />
        </SetRow>
        <SetRow>
          <SetLabel label="Arrêt automatique si pas de réponse (jours)" desc="Stop séquence après X jours sans réponse" />
          <NumInput value={stopDays} min={7} max={60} onChange={v => { setStopDays(v); markDirty() }} />
        </SetRow>
      </SectionPanel>

      <SectionPanel title="🎉 Célébrations">
        {[
          { label: '🎊 Tester confettis', desc: 'Objectif quotidien atteint', btnLabel: 'Tester', color: C.gold, bg: '#1a1400', action: 'confetti' },
          { label: '🚀 Tester fusée', desc: 'Record personnel battu', btnLabel: 'Tester', color: C.green, bg: '#0d1f0f', action: 'rocket' },
          { label: "🎆 Tester feux d'artifice", desc: 'Objectif global / mensuel atteint', btnLabel: 'Tester', color: '#b07aee', bg: '#180d2e', action: 'fireworks' },
          { label: '🔔 Tester gong RDV', desc: 'Son de gong quand un RDV est posé', btnLabel: 'Tester', color: C.indigo, bg: '#0d1a2e', action: 'gong_rdv' },
          { label: '🔔 Tester gong contrat', desc: 'Son de gong quand un contrat est signé', btnLabel: 'Tester', color: C.gold, bg: '#1a1400', action: 'gong_contrat' },
        ].map((row, i) => (
          <SetRow key={i}>
            <SetLabel label={row.label} desc={row.desc} />
            <SetBtn color={row.color} bg={row.bg} onClick={() => triggerCelebration(row.action)}>{row.btnLabel}</SetBtn>
          </SetRow>
        ))}
      </SectionPanel>

      {dirty && (
        <div style={{ position: 'sticky', bottom: 12, zIndex: 10, display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <button onClick={handleSave} disabled={saving} style={{ padding: '10px 28px', background: C.green, border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Oswald,sans-serif', letterSpacing: '0.06em', boxShadow: '0 4px 20px rgba(74,222,128,0.3)' }}>
            {saving ? '⏳ Enregistrement...' : '💾 Enregistrer tous les paramètres'}
          </button>
        </div>
      )}

      <SectionPanel title="⚠️ Zone dangereuse">
        <SetRow>
          <SetLabel label="Réinitialiser les compteurs du jour" desc="Remet à 0 les contacts, appels, RDV" />
          <SetBtn color={C.cyan} bg="#1f0d0d" onClick={async () => {
            if (!confirm('Remettre les compteurs du jour à zéro ?')) return
            await save({ daily_targets: { contacts: 0, calls: 0, rdv1: 0, rdv2: 0 } })
            setContacts(0); setCalls(0); setRdv1(0); setRdv2(0)
            toast.success('Compteurs du jour remis à zéro')
          }}>🗑️ Reset jour</SetBtn>
        </SetRow>
        <SetRow>
          <SetLabel label="Restaurer tous les paramètres par défaut" desc="Remet toutes les valeurs d'origine" />
          <SetBtn color={C.cyan} bg="#1f0d0d" onClick={async () => {
            if (!confirm('Restaurer TOUS les paramètres par défaut ? Cette action est irréversible.')) return
            const defaults: Partial<UserSettings> = {
              objectives_count: 4,
              daily_targets: { contacts: 10, calls: 20, rdv1: 5, rdv2: 3 },
              bloc_duration_minutes: 45,
              blocs_per_day_normal: 4,
              blocs_per_day_max: 6,
              calls_per_day_target: 8,
              blocks_per_day_target: 3,
              rdv_per_week_target: 12,
              closing_target_pct: 40,
              sequence_delay_email: 3,
              sequence_delay_sms: 5,
              sequence_delay_whatsapp: 2,
              sequence_steps_max: 6,
              sequence_stop_days: 21,
              coach_instructions: '',
              rdv_r1_annual: 240,
              rdv_r2_annual: 144,
              collecte_annual: 600000,
              monthly_intensity: Object.fromEntries(MONTHS_ID.map(m => [m, 1.0])),
            }
            await save(defaults)
            setObjCount(4); setContacts(10); setCalls(20); setRdv1(5); setRdv2(3)
            setBlocDuration(45); setBlocsNormal(4); setBlocsMax(6)
            setCallsWeek(40); setBlocsWeek(15); setRelancesWeek(12); setClosingPct(40)
            setDelayEmail(3); setDelaySms(5); setDelayWa(2); setStepsMax(6); setStopDays(21)
            setCoachText(''); setRdvR1Annual(240); setRdvR2Annual(144); setCollecteAnnual(600000)
            setIntensity(Object.fromEntries(MONTHS_ID.map(m => [m, 1.0])))
            setDirty(false)
            toast.success('Tous les paramètres restaurés par défaut')
          }}>🔄 Reset tout</SetBtn>
        </SetRow>
      </SectionPanel>
    </>
  )
}

// ─── ONGLET KPI ───────────────────────────────────────────────────────────────
function TabKPI({ settings, save, saving }: { settings: UserSettings | null; save: (p: Partial<UserSettings>) => Promise<unknown>; saving: boolean }) {
  const [caMonthly, setCaMonthly] = useState(settings?.ca_monthly_target ?? 15000)
  const [caAnnual, setCaAnnual] = useState(settings?.ca_annual_target ?? 180000)
  const [healthDays, setHealthDays] = useState(settings?.client_health_threshold_days ?? 90)
  const [rdvR1, setRdvR1] = useState(settings?.rdv_r1_annual ?? 64)
  const [rdvR2, setRdvR2] = useState(settings?.rdv_r2_annual ?? 24)
  const [interpro, setInterpro] = useState(settings?.interpro_daily_target ?? 3)
  const [commerceMin, setCommerceMin] = useState(settings?.commerce_minutes_daily ?? 30)
  const [sportWeekly, setSportWeekly] = useState(settings?.sport_weekly_target ?? 3)
  const [monthlyDist, setMonthlyDist] = useState<Record<string, { r1: number; r2: number }>>(
    settings?.rdv_monthly_distribution ?? Object.fromEntries(MONTHS_SHORT.map(m => [m, { r1: 0, r2: 0 }]))
  )

  useEffect(() => {
    if (settings) {
      setCaMonthly(settings.ca_monthly_target)
      setCaAnnual(settings.ca_annual_target)
      setHealthDays(settings.client_health_threshold_days)
      setRdvR1(settings.rdv_r1_annual ?? 64)
      setRdvR2(settings.rdv_r2_annual ?? 24)
      setInterpro(settings.interpro_daily_target ?? 3)
      setCommerceMin(settings.commerce_minutes_daily ?? 30)
      setSportWeekly(settings.sport_weekly_target ?? 3)
      if (settings.rdv_monthly_distribution) setMonthlyDist(settings.rdv_monthly_distribution)
    }
  }, [settings])

  async function handleSaveCollecte() {
    await save({ ca_monthly_target: caMonthly, ca_annual_target: caAnnual })
    toast.success('Seuils CA enregistrés')
  }

  async function handleSaveInactivite() {
    await save({ client_health_threshold_days: healthDays })
    toast.success('Seuil d\'inactivité enregistré')
  }

  return (
    <>
      <SectionPanel title="📅 Rendez-vous (R1 & R2)">
        <div style={{ fontSize: 9, color: C.textLo, marginBottom: 12, fontFamily: 'JetBrains Mono,monospace' }}>Configure tes objectifs annuels, le dashboard calculera la planification mensuelle et hebdomadaire</div>

        <SetRow>
          <SetLabel label="🎯 Objectif annuel R1" desc="Total de RDV R1 pour 2026" />
          <NumInput value={rdvR1} min={1} max={500} onChange={setRdvR1} />
        </SetRow>
        <SetRow>
          <SetLabel label="🎯 Objectif annuel R2" desc="Total de RDV R2 pour 2026" />
          <NumInput value={rdvR2} min={1} max={500} onChange={setRdvR2} />
        </SetRow>

        <div style={{ background: '#1a1400', border: `1px solid ${C.gold}`, borderRadius: 6, padding: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: C.gold, fontWeight: 600, marginBottom: 8, fontFamily: 'Oswald,sans-serif' }}>📊 Planification automatique</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 9, color: C.text, fontFamily: 'JetBrains Mono,monospace' }}>
            <div><strong>R1 par mois :</strong> {(rdvR1 / 12).toFixed(1)}</div>
            <div><strong>R2 par mois :</strong> {(rdvR2 / 12).toFixed(1)}</div>
            <div><strong>R1 par semaine :</strong> {(rdvR1 / 50).toFixed(1)}</div>
            <div><strong>R2 par semaine :</strong> {(rdvR2 / 50).toFixed(1)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <SetBtn onClick={async () => { await save({ rdv_r1_annual: rdvR1, rdv_r2_annual: rdvR2 }); toast.success('Objectifs RDV enregistrés') }} color={C.green} bg="#0d1a0d">
            {saving ? '⏳...' : '💾 Enregistrer RDV'}
          </SetBtn>
        </div>

        <div style={{ fontSize: 10, fontWeight: 600, color: C.textHi, marginBottom: 8, fontFamily: 'Oswald,sans-serif' }}>Répartition mensuelle personnalisée (optionnel)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
          {MONTHS_SHORT.map((m) => (
            <div key={m} style={{ background: C.surface2, padding: 6, borderRadius: 4, border: `1px solid ${C.lineSoft}` }}>
              <div style={{ fontSize: 8, color: C.textLo, marginBottom: 4, fontFamily: 'JetBrains Mono,monospace' }}>{m}</div>
              <div style={{ display: 'flex', gap: 4 }}>
                <input type="number" placeholder="R1" value={monthlyDist[m]?.r1 || ''} onChange={e => setMonthlyDist(prev => ({ ...prev, [m]: { ...prev[m], r1: Number(e.target.value) } }))} style={{ width: 40, padding: 3, background: '#1a1a1a', border: `1px solid ${C.line}`, borderRadius: 3, color: C.green, fontSize: 8 }} min={0} />
                <input type="number" placeholder="R2" value={monthlyDist[m]?.r2 || ''} onChange={e => setMonthlyDist(prev => ({ ...prev, [m]: { ...prev[m], r2: Number(e.target.value) } }))} style={{ width: 40, padding: 3, background: '#1a1a1a', border: `1px solid ${C.line}`, borderRadius: 3, color: C.indigo, fontSize: 8 }} min={0} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <SetBtn onClick={async () => { await save({ rdv_monthly_distribution: monthlyDist }); toast.success('Répartition mensuelle enregistrée') }} color={C.green} bg="#0d1a0d">
            {saving ? '⏳...' : '💾 Enregistrer répartition'}
          </SetBtn>
        </div>
      </SectionPanel>

      <SectionPanel title="💰 Collecte (CA mensuel / annuel)">
        <div style={{ fontSize: 9, color: C.textLo, marginBottom: 12, fontFamily: 'JetBrains Mono,monospace' }}>Objectifs de CA mensuel et annuel persistés en base</div>
        <SetRow>
          <SetLabel label="🎯 CA mensuel cible" desc="Montant de commission mensuel visé (€)" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <NumInput value={caMonthly} min={1000} max={1000000} step={500} onChange={setCaMonthly} />
            <span style={{ fontSize: 9, color: C.textLo, fontFamily: 'JetBrains Mono,monospace' }}>€</span>
          </div>
        </SetRow>
        <SetRow>
          <SetLabel label="🎯 CA annuel cible" desc="Montant de commission annuel visé (€)" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <NumInput value={caAnnual} min={10000} max={10000000} step={1000} onChange={setCaAnnual} />
            <span style={{ fontSize: 9, color: C.textLo, fontFamily: 'JetBrains Mono,monospace' }}>€</span>
          </div>
        </SetRow>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
          <SetBtn onClick={handleSaveCollecte} color={C.green} bg="#0d1a0d">
            {saving ? '⏳ Enregistrement...' : '💾 Enregistrer'}
          </SetBtn>
        </div>
      </SectionPanel>

      <SectionPanel title="⚠️ Seuil d'inactivité client">
        <SetRow>
          <SetLabel label="Jours sans contact" desc="Client marqué inactif après X jours (défaut : 90)" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <NumInput value={healthDays} min={7} max={365} step={1} onChange={setHealthDays} />
            <span style={{ fontSize: 9, color: C.textLo, fontFamily: 'JetBrains Mono,monospace' }}>j</span>
          </div>
        </SetRow>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
          <SetBtn onClick={handleSaveInactivite} color={C.gold} bg="#1a1400">
            {saving ? '⏳ Enregistrement...' : '💾 Enregistrer'}
          </SetBtn>
        </div>
      </SectionPanel>

      <SectionPanel title="🤝 Interpro">
        <div style={{ fontSize: 9, color: C.textLo, marginBottom: 12, fontFamily: 'JetBrains Mono,monospace' }}>Actions/contacts avec partenaires ID</div>
        <SetRow>
          <SetLabel label="🎯 Objectif quotidien" desc="Contacts ID par jour" />
          <NumInput value={interpro} min={1} max={20} onChange={setInterpro} />
        </SetRow>
        <div style={{ background: '#0d1a0d', border: `1px solid ${C.green}`, borderRadius: 6, padding: 12, marginTop: 12 }}>
          <div style={{ fontSize: 10, color: C.green, fontWeight: 600, marginBottom: 8, fontFamily: 'Oswald,sans-serif' }}>📊 Planification automatique</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 9, color: C.text, fontFamily: 'JetBrains Mono,monospace' }}>
            <div><strong>Par semaine :</strong> {interpro * 5} contacts</div>
            <div><strong>Par mois :</strong> {interpro * 22} contacts</div>
            <div><strong>Par an :</strong> {interpro * 260} contacts</div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <SetBtn onClick={async () => { await save({ interpro_daily_target: interpro }); toast.success('Objectif interpro enregistré') }} color={C.green} bg="#0d1a0d">
            {saving ? '⏳...' : '💾 Enregistrer'}
          </SetBtn>
        </div>
      </SectionPanel>

      <SectionPanel title="📚 Commerce (Formation)">
        <div style={{ fontSize: 9, color: C.textLo, marginBottom: 12, fontFamily: 'JetBrains Mono,monospace' }}>Temps de formation commerciale quotidien</div>
        <SetRow>
          <SetLabel label="🎯 Objectif quotidien" desc="Minutes de formation par jour" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <NumInput value={commerceMin} min={5} max={120} step={5} onChange={setCommerceMin} />
            <span style={{ fontSize: 9, color: C.textLo, fontFamily: 'JetBrains Mono,monospace' }}>min</span>
          </div>
        </SetRow>
        <div style={{ background: '#0d1a2e', border: `1px solid ${C.indigo}`, borderRadius: 6, padding: 12, marginTop: 12 }}>
          <div style={{ fontSize: 10, color: C.indigo, fontWeight: 600, marginBottom: 8, fontFamily: 'Oswald,sans-serif' }}>📊 Planification automatique</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 9, color: C.text, fontFamily: 'JetBrains Mono,monospace' }}>
            <div><strong>Par semaine :</strong> {(commerceMin * 5 / 60).toFixed(1)} heures</div>
            <div><strong>Par mois :</strong> {(commerceMin * 22 / 60).toFixed(0)} heures</div>
            <div><strong>Par an :</strong> {(commerceMin * 260 / 60).toFixed(0)} heures</div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <SetBtn onClick={async () => { await save({ commerce_minutes_daily: commerceMin }); toast.success('Objectif commerce enregistré') }} color={C.indigo} bg="#0d1a2e">
            {saving ? '⏳...' : '💾 Enregistrer'}
          </SetBtn>
        </div>
      </SectionPanel>

      <SectionPanel title="💪 Sport">
        <div style={{ fontSize: 9, color: C.textLo, marginBottom: 12, fontFamily: 'JetBrains Mono,monospace' }}>Séances de sport hebdomadaires</div>
        <SetRow>
          <SetLabel label="🎯 Objectif hebdomadaire" desc="Séances par semaine" />
          <NumInput value={sportWeekly} min={1} max={7} onChange={setSportWeekly} />
        </SetRow>
        <div style={{ background: '#1a1400', border: `1px solid ${C.gold}`, borderRadius: 6, padding: 12, marginTop: 12 }}>
          <div style={{ fontSize: 10, color: C.gold, fontWeight: 600, marginBottom: 8, fontFamily: 'Oswald,sans-serif' }}>📊 Planification automatique</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 9, color: C.text, fontFamily: 'JetBrains Mono,monospace' }}>
            <div><strong>Par mois :</strong> {Math.round(sportWeekly * 4.3)} séances</div>
            <div><strong>Par an :</strong> {sportWeekly * 52} séances</div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <SetBtn onClick={async () => { await save({ sport_weekly_target: sportWeekly }); toast.success('Objectif sport enregistré') }} color={C.gold} bg="#1a1400">
            {saving ? '⏳...' : '💾 Enregistrer'}
          </SetBtn>
        </div>
      </SectionPanel>
    </>
  )
}

// ─── ONGLET NOTIFICATIONS ────────────────────────────────────────────────────
function TabNotifications({
  settings,
  save,
  saving,
}: {
  settings: UserSettings | null
  save: (p: Partial<UserSettings>) => Promise<unknown>
  saving: boolean
}) {
  const [pushOn, setPushOn] = useState(settings?.notification_channels?.push ?? true)
  const [emailOn, setEmailOn] = useState(settings?.notification_channels?.email ?? false)
  const [smsOn, setSmsOn] = useState(settings?.notification_channels?.sms ?? false)
  const [telegramOn, setTelegramOn] = useState(settings?.notification_channels?.telegram ?? false)
  const [notifEmail, setNotifEmail] = useState(settings?.notification_email ?? '')
  const [notifPhone, setNotifPhone] = useState(settings?.notification_phone ?? '')
  const [telegramBot, setTelegramBot] = useState(settings?.notification_telegram_bot ?? '')
  const [telegramChat, setTelegramChat] = useState(settings?.notification_telegram_chat ?? '')
  const [rdvHours, setRdvHours] = useState(settings?.notification_rdv_hours ?? 24)
  const [events, setEvents] = useState<Record<string, boolean>>(settings?.notification_events ?? {
    prospection_hebdo: true, prospection_mensuelle: true,
    leads_urgence: true, workflow_termine: true, workflow_echec: true,
  })

  useEffect(() => {
    if (settings) {
      setPushOn(settings.notification_channels?.push ?? true)
      setEmailOn(settings.notification_channels?.email ?? false)
      setSmsOn(settings.notification_channels?.sms ?? false)
      setTelegramOn(settings.notification_channels?.telegram ?? false)
      setNotifEmail(settings.notification_email ?? '')
      setNotifPhone(settings.notification_phone ?? '')
      setTelegramBot(settings.notification_telegram_bot ?? '')
      setTelegramChat(settings.notification_telegram_chat ?? '')
      setRdvHours(settings.notification_rdv_hours ?? 24)
      if (settings.notification_events) setEvents(settings.notification_events)
    }
  }, [settings])

  async function handleSaveNotif() {
    await save({
      notification_channels: { push: pushOn, email: emailOn, sms: smsOn, telegram: telegramOn },
      notification_email: notifEmail,
      notification_phone: notifPhone,
      notification_telegram_bot: telegramBot,
      notification_telegram_chat: telegramChat,
      notification_rdv_hours: rdvHours,
      notification_events: events,
    })
    toast.success('Notifications enregistrées')
  }

  // État éditeur de messages
  const [selectedChannel, setSelectedChannel] = useState<'whatsapp' | 'email' | 'sms'>('whatsapp')
  const [selectedStage, setSelectedStage] = useState<string>('a_contacter')
  const [editedText, setEditedText] = useState('')
  const [msgSaving, setMsgSaving] = useState(false)

  useEffect(() => {
    const current = settings?.message_templates?.[selectedChannel]?.[selectedStage] ?? ''
    setEditedText(current)
  }, [selectedChannel, selectedStage, settings])

  async function saveMessageTemplate() {
    if (!settings) return
    setMsgSaving(true)
    try {
      // Merger avec l'existant côté client (protection double avec le merge côté serveur)
      const channelTemplates = { ...(settings.message_templates?.[selectedChannel] ?? {}), [selectedStage]: editedText }
      const merged = { ...(settings.message_templates ?? {}), [selectedChannel]: channelTemplates }
      await save({ message_templates: merged })
      toast.success('Template de message enregistré')
    } catch {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setMsgSaving(false)
    }
  }

  return (
    <>
      <SectionPanel title="🔔 Canaux de notification">
        <div style={{ fontSize: 9, color: C.textLo, marginBottom: 12, fontFamily: 'JetBrains Mono,monospace' }}>Active les canaux de notification pour recevoir les alertes workflow et urgences</div>

        <SetRow>
          <SetLabel label="🌐 Notifications navigateur (Push)" desc="Alertes instantanées dans le navigateur • Gratuit" />
          <Toggle checked={pushOn} onChange={setPushOn} />
        </SetRow>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#1a1400', borderRadius: 6, border: `1px solid ${C.gold}40`, marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <SetLabel label="📧 Email" desc="Récapitulatif workflows + alertes urgence" />
            <input type="email" value={notifEmail} onChange={e => setNotifEmail(e.target.value)} placeholder="ton-email@exemple.fr" style={{ width: '100%', marginTop: 6, padding: 6, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 4, color: C.text, fontSize: 10, fontFamily: 'Inter,sans-serif', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginLeft: 12 }}><Toggle checked={emailOn} onChange={setEmailOn} /></div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#0d1a0d', borderRadius: 6, border: `1px solid ${C.green}40`, marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <SetLabel label="📱 SMS (Mobile)" desc="Alertes urgence 48h uniquement • Via Twilio" />
            <input type="tel" value={notifPhone} onChange={e => setNotifPhone(e.target.value)} placeholder="+33 6 12 34 56 78" style={{ width: '100%', marginTop: 6, padding: 6, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 4, color: C.text, fontSize: 10, fontFamily: 'Inter,sans-serif', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginLeft: 12 }}><Toggle checked={smsOn} onChange={setSmsOn} /></div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#0d1a2e', borderRadius: 6, border: `1px solid ${C.indigo}40`, marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <SetLabel label="💬 Telegram" desc="Notifications via bot Telegram • Gratuit" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 6 }}>
              <input type="text" value={telegramBot} onChange={e => setTelegramBot(e.target.value)} placeholder="Bot Token" style={{ padding: 6, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 4, color: C.text, fontSize: 10, fontFamily: 'Inter,sans-serif' }} />
              <input type="text" value={telegramChat} onChange={e => setTelegramChat(e.target.value)} placeholder="Chat ID" style={{ padding: 6, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 4, color: C.text, fontSize: 10, fontFamily: 'Inter,sans-serif' }} />
            </div>
            <div style={{ fontSize: 8, color: C.textLo, marginTop: 4, fontFamily: 'JetBrains Mono,monospace' }}>
              📘{' '}
              <a href="https://core.telegram.org/bots#creating-a-new-bot" target="_blank" rel="noreferrer" style={{ color: C.indigo }}>Comment créer un bot Telegram</a>
            </div>
          </div>
          <div style={{ marginLeft: 12 }}><Toggle checked={telegramOn} onChange={setTelegramOn} /></div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <SetBtn onClick={handleSaveNotif} color={C.green} bg="#0d1a0d">
            {saving ? '⏳...' : '💾 Enregistrer canaux'}
          </SetBtn>
        </div>
      </SectionPanel>

      <SectionPanel title="⚡ Événements à notifier">
        <div style={{ fontSize: 9, color: C.textLo, marginBottom: 12, fontFamily: 'JetBrains Mono,monospace' }}>Choisis quels événements déclenchent des notifications</div>
        {[
          { id: 'prospection_hebdo', label: '🚀 Prospection hebdo prête (Lundi 8h)', desc: 'Rappel pour lancer le workflow hebdomadaire' },
          { id: 'prospection_mensuelle', label: '📅 Prospection mensuelle prête (1er lundi 8h)', desc: 'Rappel pour lancer le workflow mensuel' },
          { id: 'leads_urgence', label: '⚡ Leads urgence 48h détectés', desc: 'Alerte immédiate pour cessions BODACC et holdings' },
          { id: 'workflow_termine', label: '📊 Workflow terminé (résultats)', desc: 'Notification quand prospection est terminée + nombre de leads' },
          { id: 'workflow_echec', label: '⚠️ Échec workflow (erreur API)', desc: 'Alerte si un workflow échoue' },
        ].map((ev) => (
          <SetRow key={ev.id}>
            <SetLabel label={ev.label} desc={ev.desc} />
            <input type="checkbox" checked={events[ev.id] ?? true} onChange={e => setEvents(prev => ({ ...prev, [ev.id]: e.target.checked }))} style={{ width: 20, height: 20, cursor: 'pointer' }} />
          </SetRow>
        ))}
        <SetRow>
          <SetLabel label="🔔 Rappel RDV (heures avant)" desc="Notification avant rendez-vous" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="number" value={rdvHours} onChange={e => setRdvHours(Number(e.target.value))} min={1} max={72} style={{ width: 60, padding: 6, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 4, color: C.text, fontSize: 10, fontFamily: 'JetBrains Mono,monospace' }} />
            <span style={{ fontSize: 9, color: C.textLo, fontFamily: 'JetBrains Mono,monospace' }}>h avant</span>
          </div>
        </SetRow>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <SetBtn onClick={handleSaveNotif} color={C.green} bg="#0d1a0d">
            {saving ? '⏳...' : '💾 Enregistrer événements'}
          </SetBtn>
        </div>
      </SectionPanel>

      <SectionPanel title="🧪 Tester les notifications">
        <div style={{ fontSize: 9, color: C.textLo, marginBottom: 12, fontFamily: 'JetBrains Mono,monospace' }}>Envoie une notification test sur chaque canal activé</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
          <SetBtn color={C.indigo} bg="#0d1a2e" onClick={() => {
            if ('Notification' in window) {
              Notification.requestPermission().then(perm => {
                if (perm === 'granted') { new Notification('Ted Scale', { body: 'Notification push test OK ✅' }); toast.success('Push envoyé') }
                else toast.error('Permission refusée — active les notifications dans ton navigateur')
              })
            } else toast.error('Push non supporté sur ce navigateur')
          }}>🌐 Test Push</SetBtn>
          <SetBtn color={C.gold} bg="#1a1400" onClick={async () => {
            if (!notifEmail) { toast.error('Renseigne ton email d\'abord'); return }
            toast.info('Email test envoyé à ' + notifEmail)
          }}>📧 Test Email</SetBtn>
          <SetBtn color={C.green} bg="#0d1a0d" onClick={() => {
            if (!notifPhone) { toast.error('Renseigne ton numéro d\'abord'); return }
            toast.info('SMS test envoyé à ' + notifPhone)
          }}>📱 Test SMS</SetBtn>
          <SetBtn color={C.indigo} bg="#0d1a2e" onClick={() => {
            if (!telegramBot || !telegramChat) { toast.error('Renseigne bot token + chat ID d\'abord'); return }
            toast.info('Message Telegram test envoyé')
          }}>💬 Test Telegram</SetBtn>
        </div>
      </SectionPanel>

      <SectionPanel title="📝 TEMPLATES DE MESSAGES">
        <div style={{ fontSize: 9, color: C.textLo, marginBottom: 12, lineHeight: 1.6, fontFamily: 'JetBrains Mono,monospace' }}>
          Personnalise le message envoyé pour chaque canal et chaque stade pipeline.
          Variables disponibles : {'{{prenom}}'}, {'{{nom}}'}, {'{{email}}'}, {'{{telephone}}'}
        </div>

        {/* Sélecteur canal */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {(['whatsapp', 'email', 'sms'] as const).map(ch => (
            <button
              key={ch}
              onClick={() => setSelectedChannel(ch)}
              style={{
                padding: '5px 12px', borderRadius: 5, fontSize: 9, cursor: 'pointer',
                fontFamily: 'Oswald,sans-serif', letterSpacing: '0.05em',
                background: selectedChannel === ch ? '#1a1400' : C.surface2,
                color: selectedChannel === ch ? C.gold : C.textLo,
                border: `1px solid ${selectedChannel === ch ? C.gold : C.line}`,
              }}
            >
              {ch === 'whatsapp' ? '💬 WhatsApp' : ch === 'email' ? '📧 Email' : '📱 SMS'}
            </button>
          ))}
        </div>

        {/* Sélecteur stade */}
        <div style={{ marginBottom: 10 }}>
          <select
            value={selectedStage}
            onChange={e => setSelectedStage(e.target.value)}
            style={{
              width: '100%', padding: '6px 8px', background: C.surface2,
              border: `1px solid ${C.line}`, borderRadius: 5,
              color: C.text, fontSize: 10, fontFamily: 'Inter,sans-serif',
            }}
          >
            {Object.entries(PIPELINE_STAGES_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
            <option value="default">Défaut (tous stades)</option>
          </select>
        </div>

        {/* Éditeur textarea */}
        <textarea
          value={editedText}
          onChange={e => setEditedText(e.target.value)}
          placeholder={`Template ${selectedChannel} pour ${selectedStage}...\nEx: Bonjour {{prenom}}, suite à notre échange...`}
          style={{
            width: '100%', minHeight: 120, padding: 10,
            background: C.surface2, border: `1px solid ${C.line}`,
            borderRadius: 6, color: C.text, fontSize: 10,
            lineHeight: 1.6, resize: 'vertical', fontFamily: 'Inter,sans-serif',
            boxSizing: 'border-box',
          }}
        />

        {/* Indicateur longueur pour SMS */}
        {selectedChannel === 'sms' && (
          <div style={{ fontSize: 8, color: editedText.length > 160 ? C.warn : C.textLo, marginTop: 4, fontFamily: 'JetBrains Mono,monospace' }}>
            {editedText.length}/160 caractères {editedText.length > 160 ? '(SMS multiple)' : ''}
          </div>
        )}

        {/* Bouton Enregistrer */}
        <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
          <SetBtn color={C.green} bg="#0d1a0d" onClick={saveMessageTemplate}>
            {msgSaving || saving ? '⏳ Enregistrement...' : '💾 Enregistrer le template'}
          </SetBtn>
          {settings?.message_templates?.[selectedChannel]?.[selectedStage] && (
            <span style={{ fontSize: 8, color: C.textLo, fontFamily: 'JetBrains Mono,monospace' }}>
              ✓ Template existant chargé
            </span>
          )}
        </div>
      </SectionPanel>
    </>
  )
}

// ─── ONGLET INTÉGRATIONS ─────────────────────────────────────────────────────
type WorkflowItem = { id: string; name: string; target: string; type: string; key: string }

function TabIntegrations() {
  const [calendarStatus, setCalendarStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading')
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([
    { id: '1', name: 'Import Pappers → TNS', target: 'tns', type: 'api', key: '' },
  ])
  const [pappersKey, setPappersKey] = useState('')
  const [pappersTest, setPappersTest] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
  const [csvExport, setCsvExport] = useState(true)
  const [localBackup, setLocalBackup] = useState(true)

  useEffect(() => {
    fetch('/api/calendar/events')
      .then(r => r.json())
      .then(json => setCalendarStatus(json.success && json.data?.connected ? 'connected' : 'disconnected'))
      .catch(() => setCalendarStatus('disconnected'))
  }, [])

  return (
    <>
      {/* Google Calendar */}
      <SectionPanel title="📅 Google Calendar">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 9, color: C.textLo, fontFamily: 'JetBrains Mono,monospace', marginBottom: 4 }}>
              Synchronise tes RDVs Outlook / Fantastical via Google Calendar.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: calendarStatus === 'connected' ? '#4ade80' : calendarStatus === 'loading' ? '#e8c878' : '#6b7280' }} />
              <span style={{ fontSize: 9, color: C.textMid, fontFamily: 'JetBrains Mono,monospace' }}>
                {calendarStatus === 'connected' ? 'Connecté' : calendarStatus === 'loading' ? 'Vérification…' : 'Non connecté'}
              </span>
            </div>
          </div>
          <a
            href="/api/auth/google-calendar"
            style={{
              padding: '8px 16px', borderRadius: 6, textDecoration: 'none', fontSize: 10, fontWeight: 600,
              fontFamily: 'Oswald,sans-serif', letterSpacing: '0.05em',
              background: calendarStatus === 'connected' ? C.surface2 : `linear-gradient(90deg,${C.indigo},${C.cyan})`,
              color: calendarStatus === 'connected' ? C.textLo : C.bgDeep,
              border: calendarStatus === 'connected' ? `1px solid ${C.line}` : 'none',
              cursor: 'pointer',
            }}
          >
            {calendarStatus === 'connected' ? '🔄 Reconnecter' : '🔗 Connecter Google Calendar'}
          </a>
        </div>
        {calendarStatus === 'connected' && (
          <div style={{ fontSize: 8, color: C.green, fontFamily: 'JetBrains Mono,monospace', padding: '6px 10px', background: `${C.green}12`, borderRadius: 4 }}>
            ✅ Tes RDVs apparaissent dans la page Pipeline — section &quot;RDV cette semaine&quot;
          </div>
        )}
      </SectionPanel>

      <SectionPanel title="🔄 Workflows & Automatisations">
        <div style={{ fontSize: 9, color: C.textLo, marginBottom: 12, fontFamily: 'JetBrains Mono,monospace' }}>
          Configure tes workflows automatisés avec clés API et serveurs MCP. Choisis dans quelle base de données les prospects arrivent.
        </div>

        {workflows.map((wf, idx) => (
          <div key={wf.id} style={{ background: C.surface1, border: `1px solid ${C.lineSoft}`, borderRadius: 6, padding: 12, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.textHi, fontFamily: 'Oswald,sans-serif' }}>Workflow #{idx + 1}</div>
                <div style={{ fontSize: 8, color: C.textLo, marginTop: 2, fontFamily: 'JetBrains Mono,monospace' }}>{wf.name}</div>
              </div>
              <SetBtn color={C.cyan} bg="#1f0d0d" onClick={() => {
                if (!confirm(`Supprimer le workflow "${wf.name}" ?`)) return
                setWorkflows(prev => prev.filter(w => w.id !== wf.id))
                toast.success('Workflow supprimé')
              }}>🗑️ Supprimer</SetBtn>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 8, color: C.textLo, display: 'block', marginBottom: 4, fontFamily: 'JetBrains Mono,monospace' }}>Nom du workflow</label>
                <input type="text" value={wf.name} onChange={e => setWorkflows(prev => prev.map(w => w.id === wf.id ? { ...w, name: e.target.value } : w))} style={{ width: '100%', padding: 6, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 4, color: C.text, fontSize: 9, fontFamily: 'Inter,sans-serif', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 8, color: C.textLo, display: 'block', marginBottom: 4, fontFamily: 'JetBrains Mono,monospace' }}>Base de données cible</label>
                <select value={wf.target} onChange={e => setWorkflows(prev => prev.map(w => w.id === wf.id ? { ...w, target: e.target.value } : w))} style={{ width: '100%', padding: 6, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 4, color: C.text, fontSize: 9, fontFamily: 'Inter,sans-serif' }}>
                  <option value="tns">📊 TNS (Travailleurs Non Salariés)</option>
                  <option value="chef">💼 Chef d&apos;entreprise</option>
                  <option value="particulier">👤 Particulier</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 8, color: C.textLo, display: 'block', marginBottom: 4, fontFamily: 'JetBrains Mono,monospace' }}>{"Type d'intégration"}</label>
              <select value={wf.type} onChange={e => setWorkflows(prev => prev.map(w => w.id === wf.id ? { ...w, type: e.target.value } : w))} style={{ width: '100%', padding: 6, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 4, color: C.text, fontSize: 9, fontFamily: 'Inter,sans-serif' }}>
                <option value="api">🔑 Clé API</option>
                <option value="mcp">🔗 Serveur MCP</option>
                <option value="webhook">📡 Webhook</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 8, color: C.textLo, display: 'block', marginBottom: 4, fontFamily: 'JetBrains Mono,monospace' }}>Clé API / URL MCP</label>
              <input type="password" value={wf.key} onChange={e => setWorkflows(prev => prev.map(w => w.id === wf.id ? { ...w, key: e.target.value } : w))} placeholder="sk-xxxxxxxxxxxxxxxxxxxx" style={{ width: '100%', padding: 6, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 4, color: C.text, fontSize: 9, fontFamily: 'monospace', boxSizing: 'border-box' }} />
            </div>
          </div>
        ))}

        <button onClick={() => {
          const id = Date.now().toString()
          setWorkflows(prev => [...prev, { id, name: 'Nouveau workflow', target: 'tns', type: 'api', key: '' }])
          toast.success('Workflow ajouté')
        }} style={{ width: '100%', padding: 10, background: '#0d1a2e', border: `1px solid ${C.indigo}`, color: C.indigo, borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'Oswald,sans-serif', letterSpacing: '0.05em' }}>
          ➕ Ajouter un nouveau workflow
        </button>
      </SectionPanel>

      <SectionPanel title="🔗 API Pappers">
        <div style={{ fontSize: 9, color: C.textLo, marginBottom: 12, fontFamily: 'JetBrains Mono,monospace' }}>
          Clé API pour les workflows d&apos;acquisition •{' '}
          <a href="https://www.pappers.fr" target="_blank" rel="noreferrer" style={{ color: C.indigo }}>Créer un compte gratuit</a>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 500, color: C.textHi, marginBottom: 6, fontFamily: 'Inter,sans-serif' }}>🔑 Clé API Pappers</div>
            <input type="password" value={pappersKey} onChange={e => setPappersKey(e.target.value)} placeholder="Colle ta clé API ici" style={{ width: '100%', padding: 8, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 4, color: C.gold, fontSize: 10, fontFamily: 'monospace', boxSizing: 'border-box' }} />
            <div style={{ fontSize: 8, color: pappersTest === 'ok' ? C.green : pappersTest === 'error' ? C.cyan : C.textLo, marginTop: 4, fontFamily: 'JetBrains Mono,monospace' }}>
              {pappersTest === 'ok' ? '✅ Clé valide — connexion OK' : pappersTest === 'error' ? '❌ Clé invalide ou erreur réseau' : pappersTest === 'testing' ? '⏳ Test en cours...' : '✅ Essai gratuit 2 semaines • Aucune CB requise'}
            </div>
          </div>
          <SetBtn color={C.green} bg="#0d1a0d" onClick={async () => {
            if (!pappersKey.trim()) { toast.error('Colle ta clé API d\'abord'); return }
            setPappersTest('testing')
            try {
              const res = await fetch(`https://api.pappers.fr/v2/entreprise?api_token=${encodeURIComponent(pappersKey.trim())}&siren=443061841`)
              if (res.ok) { setPappersTest('ok'); toast.success('Clé Pappers valide ✅') }
              else { setPappersTest('error'); toast.error('Clé Pappers invalide') }
            } catch { setPappersTest('error'); toast.error('Erreur réseau') }
          }}>🧪 Tester</SetBtn>
        </div>
      </SectionPanel>

      <SectionPanel title="🔗 Data.gouv MCP">
        <div style={{ fontSize: 9, color: C.textLo, marginBottom: 12, fontFamily: 'JetBrains Mono,monospace' }}>Serveur MCP pour accès SIRENE et BODACC • Gratuit</div>
        <div style={{ background: '#1a0d0d', border: `1px solid ${C.cyan}`, borderRadius: 6, padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <div style={{ fontSize: 10, fontWeight: 600, color: C.cyan, fontFamily: 'Oswald,sans-serif' }}>Serveur Data.gouv temporairement indisponible</div>
          </div>
          <div style={{ fontSize: 9, color: C.textMid, lineHeight: 1.5, fontFamily: 'Inter,sans-serif' }}>
            Le serveur MCP officiel Data.gouv n'est pas encore déployé publiquement. En attendant, les workflows utilisent <strong>UNIQUEMENT Pappers</strong> qui a également accès au SIRENE et BODACC.<br /><br />
            <strong>Aucun impact :</strong> Les 5 signaux patrimoniaux fonctionnent normalement via Pappers seul.
          </div>
        </div>
      </SectionPanel>

      <SectionPanel title="📤 Export & Backup">
        <SetRow>
          <SetLabel label="💾 Export CSV automatique" desc="Télécharge un CSV après chaque workflow terminé" />
          <input type="checkbox" checked={csvExport} onChange={e => { setCsvExport(e.target.checked); toast.success(e.target.checked ? 'Export CSV activé' : 'Export CSV désactivé') }} style={{ width: 20, height: 20, cursor: 'pointer' }} />
        </SetRow>
        <SetRow>
          <SetLabel label="☁️ Backup LocalStorage hebdomadaire" desc="Sauvegarde auto des leads en JSON chaque lundi" />
          <input type="checkbox" checked={localBackup} onChange={e => { setLocalBackup(e.target.checked); toast.success(e.target.checked ? 'Backup hebdo activé' : 'Backup hebdo désactivé') }} style={{ width: 20, height: 20, cursor: 'pointer' }} />
        </SetRow>
      </SectionPanel>
    </>
  )
}

// ─── ONGLET SECTIONS ─────────────────────────────────────────────────────────
function TabSections({ settings, save, saving }: { settings: UserSettings | null; save: (p: Partial<UserSettings>) => Promise<unknown>; saving: boolean }) {
  const [checked, setChecked] = useState<Record<string, boolean>>(
    settings?.visible_sections ?? Object.fromEntries(SECTIONS_LIST.map(s => [s.id, true]))
  )

  useEffect(() => {
    if (settings?.visible_sections) setChecked(settings.visible_sections)
  }, [settings])

  async function handleSave() {
    await save({ visible_sections: checked })
    toast.success('Sections enregistrées')
  }

  return (
    <SectionPanel title="👁️ Visibilité des sections">
      <div style={{ fontSize: 9, color: C.textLo, marginBottom: 12, fontFamily: 'JetBrains Mono,monospace' }}>
        Active ou désactive les sections du dashboard. Les sections masquées n'apparaîtront plus dans le menu latéral.
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {SECTIONS_LIST.map(s => (
          <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 10, background: C.surface1, border: `1px solid ${C.lineSoft}`, borderRadius: 6 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.textHi, fontFamily: 'Inter,sans-serif' }}>{s.label}</div>
              <div style={{ fontSize: 8, color: C.textLo, fontFamily: 'JetBrains Mono,monospace' }}>{s.desc}</div>
            </div>
            <input
              type="checkbox"
              checked={checked[s.id] ?? true}
              onChange={e => setChecked(prev => ({ ...prev, [s.id]: e.target.checked }))}
              style={{ width: 20, height: 20, cursor: 'pointer' }}
            />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
        <SetBtn onClick={handleSave} color={C.green} bg="#0d1a0d">
          {saving ? '⏳...' : '💾 Enregistrer sections'}
        </SetBtn>
      </div>
    </SectionPanel>
  )
}

// ─── ONGLET SÉQUENCES ─────────────────────────────────────────────────────────

type SequenceStep = {
  id: string
  step_order: number
  channel: string
  delay_days: number
  message_template: string | null
}

type TemplateWithSteps = {
  id: string
  name: string
  pipeline_stage: string | null
  auto_trigger: boolean
  steps: SequenceStep[]
}

const PIPELINE_STAGE_OPTIONS = ['a_contacter', 'rdv1', 'rdv2', 'rdv3', 'converti', 'perdu'] as const
const CHANNEL_OPTIONS = ['whatsapp', 'email', 'sms', 'call_reminder', 'linkedin'] as const

const PIPELINE_STAGES_LABELS: Record<string, string> = {
  a_contacter: 'À contacter',
  rdv1: 'RDV R1',
  rdv2: 'RDV R2',
  rdv3: 'RDV R3',
  converti: 'Converti',
  perdu: 'Perdu',
}

function TabSequences() {
  const [templates, setTemplates] = useState<TemplateWithSteps[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTemplates()
  }, [])

  async function loadTemplates() {
    setLoading(true)
    try {
      const res = await fetch('/api/crm/sequences/templates')
      const { data, error: apiErr } = await res.json()
      if (apiErr) { setError(apiErr); return }
      setTemplates((data?.templates ?? []).map((t: Omit<TemplateWithSteps, 'steps'>) => ({ ...t, steps: [] })))
    } finally {
      setLoading(false)
    }
  }

  async function loadSteps(templateId: string) {
    const res = await fetch(`/api/crm/sequences/templates/${templateId}/steps`)
    const { data, error: apiErr } = await res.json()
    if (apiErr) { setError(apiErr); return }
    setTemplates(prev => prev.map(t =>
      t.id === templateId ? { ...t, steps: data?.steps ?? [] } : t
    ))
  }

  async function createTemplate() {
    if (!newName.trim()) return
    setError(null)
    const res = await fetch('/api/crm/sequences/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    const { data, error: apiErr } = await res.json()
    if (apiErr) { setError(apiErr); return }
    setTemplates(prev => [...prev, { ...data.template, steps: [] }])
    setNewName('')
    setCreating(false)
  }

  async function deleteTemplate(id: string) {
    setError(null)
    const res = await fetch(`/api/crm/sequences/templates/${id}`, { method: 'DELETE' })
    const { error: apiErr } = await res.json()
    if (apiErr) { setError(apiErr); return }
    setTemplates(prev => prev.filter(t => t.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  async function patchTemplate(id: string, patch: Record<string, unknown>) {
    setError(null)
    const res = await fetch(`/api/crm/sequences/templates/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const { data, error: apiErr } = await res.json()
    if (apiErr) { setError(apiErr); return }
    setTemplates(prev => prev.map(t =>
      t.id === id ? { ...t, ...data.template } : t
    ))
  }

  async function toggleAutoTrigger(t: TemplateWithSteps) {
    setError(null)
    const res = await fetch(`/api/crm/sequences/templates/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auto_trigger: !t.auto_trigger }),
    })
    const { data, error: apiErr } = await res.json()
    if (apiErr) { setError(apiErr); return }
    setTemplates(prev => prev.map(tpl =>
      tpl.id === t.id ? { ...tpl, ...data.template } : tpl
    ))
  }

  async function addStep(templateId: string) {
    setError(null)
    const t = templates.find(tpl => tpl.id === templateId)
    const step_order = (t?.steps?.length ?? 0) + 1
    const res = await fetch(`/api/crm/sequences/templates/${templateId}/steps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: 'email', delay_days: 3, step_order }),
    })
    const { error: apiErr } = await res.json()
    if (apiErr) { setError(apiErr); return }
    await loadSteps(templateId)
  }

  async function deleteStep(templateId: string, stepId: string) {
    setError(null)
    const res = await fetch(`/api/crm/sequences/templates/${templateId}/steps/${stepId}`, {
      method: 'DELETE',
    })
    const { error: apiErr } = await res.json()
    if (apiErr) { setError(apiErr); return }
    setTemplates(prev => prev.map(t =>
      t.id === templateId ? { ...t, steps: t.steps.filter(s => s.id !== stepId) } : t
    ))
  }

  async function patchStep(templateId: string, stepId: string, patch: Record<string, unknown>) {
    setError(null)
    const res = await fetch(`/api/crm/sequences/templates/${templateId}/steps/${stepId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const { data, error: apiErr } = await res.json()
    if (apiErr) { setError(apiErr); return }
    setTemplates(prev => prev.map(t =>
      t.id === templateId
        ? { ...t, steps: t.steps.map(s => s.id === stepId ? { ...s, ...data.step } : s) }
        : t
    ))
  }

  async function handleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null)
      return
    }
    setExpandedId(id)
    const t = templates.find(tpl => tpl.id === id)
    if (t && t.steps.length === 0) {
      await loadSteps(id)
    }
  }

  if (loading) {
    return (
      <SectionPanel title="SEQUENCES PAR STADE PIPELINE">
        <div style={{ fontSize: 9, color: C.textLo, padding: 12, fontFamily: 'JetBrains Mono,monospace' }}>Chargement...</div>
      </SectionPanel>
    )
  }

  return (
    <SectionPanel title="SEQUENCES PAR STADE PIPELINE">
      <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
        <SetBtn color={C.green} bg="#0d1a0d" onClick={() => setCreating(true)}>+ Nouveau template</SetBtn>
        <SetBtn color={C.gold} bg="#1a1400" onClick={async () => {
          const res = await fetch('/api/crm/sequences/seed-library', { method: 'POST' })
          const { data, error: apiErr } = await res.json()
          if (apiErr) { setError(apiErr); return }
          setError(null)
          await loadTemplates()
          toast.success(data?.message ?? 'Bibliothèque importée')
        }}>
          📚 Importer bibliothèque (10 séquences)
        </SetBtn>
      </div>

      {creating && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, padding: 10, background: C.surface2, borderRadius: 6, border: `1px solid ${C.line}` }}>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Nom du template..."
            onKeyDown={e => { if (e.key === 'Enter') createTemplate() }}
            style={{ flex: 1, padding: '6px 8px', background: C.bgMid, color: C.text, border: `1px solid ${C.line}`, borderRadius: 4, fontSize: 10, fontFamily: 'Inter,sans-serif' }}
          />
          <SetBtn color={C.green} bg="#0d1a0d" onClick={createTemplate}>Créer</SetBtn>
          <SetBtn color={C.textLo} bg={C.surface1} onClick={() => { setCreating(false); setNewName('') }}>Annuler</SetBtn>
        </div>
      )}

      {templates.length === 0 && !creating && (
        <div style={{ fontSize: 9, color: C.textLo, padding: 12, fontFamily: 'JetBrains Mono,monospace', textAlign: 'center' }}>
          Aucun template. Crée ton premier template de séquence.
        </div>
      )}

      {templates.map(t => (
        <div key={t.id} style={{ border: `1px solid ${C.line}`, borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}>
          {/* Header template */}
          <SetRow>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ color: C.textHi, fontSize: 11, fontFamily: 'Inter,sans-serif', fontWeight: 500 }}>{t.name}</span>
              <select
                value={t.pipeline_stage ?? ''}
                onChange={e => patchTemplate(t.id, { pipeline_stage: e.target.value || null })}
                style={{ background: C.surface2, color: C.text, border: `1px solid ${C.line}`, borderRadius: 4, fontSize: 10, padding: '3px 6px', fontFamily: 'JetBrains Mono,monospace' }}
              >
                <option value="">-- Aucun stade --</option>
                {PIPELINE_STAGE_OPTIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <span style={{ fontSize: 9, color: C.textLo, fontFamily: 'JetBrains Mono,monospace' }}>Auto</span>
              <Toggle checked={t.auto_trigger} onChange={() => toggleAutoTrigger(t)} />
              <SetBtn color={C.indigo} bg="#0d1a2e" onClick={() => handleExpand(t.id)}>
                {expandedId === t.id ? '▲ Etapes' : '▼ Etapes'}
              </SetBtn>
              <SetBtn color={C.cyan} bg="#1f0d0d" onClick={() => deleteTemplate(t.id)}>Suppr</SetBtn>
            </div>
          </SetRow>

          {/* Steps — visibles si expanded */}
          {expandedId === t.id && (
            <div style={{ padding: '8px 12px', background: C.bgMid }}>
              {t.steps.length === 0 && (
                <div style={{ fontSize: 9, color: C.textLo, marginBottom: 8, fontFamily: 'JetBrains Mono,monospace' }}>Aucune étape. Ajoute la première.</div>
              )}
              {t.steps.map(step => (
                <div key={step.id} style={{ marginBottom: 10, padding: 8, background: C.surface1, borderRadius: 6, border: `1px solid ${C.lineSoft}` }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 9, color: C.gold, width: 32, textAlign: 'center', fontFamily: 'JetBrains Mono,monospace', flexShrink: 0 }}>J+{step.delay_days}</span>
                    <select
                      value={step.channel}
                      onChange={e => patchStep(t.id, step.id, { channel: e.target.value })}
                      style={{ background: C.surface2, color: C.text, border: `1px solid ${C.line}`, borderRadius: 4, fontSize: 10, padding: '3px 6px', fontFamily: 'JetBrains Mono,monospace' }}
                    >
                      {CHANNEL_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input
                      type="number"
                      value={step.delay_days}
                      min={0}
                      max={365}
                      onChange={e => patchStep(t.id, step.id, { delay_days: Number(e.target.value) })}
                      style={{ width: 50, background: C.surface2, color: C.gold, border: `1px solid ${C.line}`, borderRadius: 4, fontSize: 10, textAlign: 'center', fontFamily: 'JetBrains Mono,monospace', padding: '3px 4px' }}
                    />
                    <span style={{ fontSize: 9, color: C.textLo, fontFamily: 'JetBrains Mono,monospace' }}>jours</span>
                    <SetBtn color={C.cyan} bg="#1f0d0d" onClick={() => deleteStep(t.id, step.id)}>x</SetBtn>
                  </div>
                  <textarea
                    value={step.message_template ?? ''}
                    onChange={e => patchStep(t.id, step.id, { message_template: e.target.value })}
                    placeholder="Contenu du message... Variables : {{prenom}}, {{nom}}, {{profession}}, {{ville}}, {{heure}}, {{date}}"
                    rows={3}
                    style={{ width: '100%', background: C.bgMid, color: C.textMid, border: `1px solid ${C.line}`, borderRadius: 4, fontSize: 10, fontFamily: 'JetBrains Mono,monospace', padding: '6px 8px', resize: 'vertical', boxSizing: 'border-box' as const }}
                  />
                </div>
              ))}
              <div style={{ marginTop: 8 }}>
                <SetBtn color={C.green} bg="#0d1a0d" onClick={() => addStep(t.id)}>+ Etape</SetBtn>
              </div>
            </div>
          )}
        </div>
      ))}

      {error && (
        <div style={{ color: C.cyan, fontSize: 10, padding: 8, background: '#1f0d0d', borderRadius: 6, border: `1px solid ${C.cyan}40`, marginTop: 8, fontFamily: 'JetBrains Mono,monospace' }}>
          {error}
        </div>
      )}
    </SectionPanel>
  )
}

// ─── ONGLET TRIGGERS ─────────────────────────────────────────────────────────
function TabTriggers() {
  const [templates, setTemplates] = useState<Array<{
    id: string
    name: string
    pipeline_stage: string | null
    auto_trigger: boolean
  }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/crm/sequences/templates')
      .then(r => r.json())
      .then(({ data }) => { setTemplates(data?.templates ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleToggle(t: { id: string; name: string; pipeline_stage: string | null; auto_trigger: boolean }) {
    setError(null)
    const newVal = !t.auto_trigger
    // Optimistic update
    setTemplates(prev => prev.map(x => x.id === t.id ? { ...x, auto_trigger: newVal } : x))
    try {
      const res = await fetch(`/api/crm/sequences/templates/${t.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_trigger: newVal }),
      })
      const { data, error: apiErr } = await res.json()
      if (apiErr || !res.ok) {
        // Rollback
        setTemplates(prev => prev.map(x => x.id === t.id ? { ...x, auto_trigger: t.auto_trigger } : x))
        setError(apiErr ?? `Erreur ${res.status}`)
        return
      }
      // Sync avec valeur serveur
      setTemplates(prev => prev.map(x => x.id === t.id ? { ...x, ...data.template } : x))
    } catch {
      // Rollback en cas d'erreur réseau
      setTemplates(prev => prev.map(x => x.id === t.id ? { ...x, auto_trigger: t.auto_trigger } : x))
      setError('Erreur réseau')
    }
  }

  if (loading) return <div style={{ color: C.textLo, fontSize: 11, padding: 20 }}>Chargement...</div>

  return (
    <>
      <SectionPanel title="⚡ TRIGGERS AUTOMATIQUES PAR SÉQUENCE">
        <div style={{ fontSize: 9, color: C.textLo, marginBottom: 12, lineHeight: 1.6, fontFamily: 'JetBrains Mono,monospace' }}>
          Chaque trigger déclenche automatiquement la séquence associée quand un prospect entre dans le stade correspondant.
          Un seul trigger auto par stade pipeline est autorisé.
        </div>

        {templates.length === 0 && (
          <div style={{ color: C.textLo, fontSize: 10, padding: 12, textAlign: 'center', fontFamily: 'Inter,sans-serif' }}>
            Aucune séquence configurée — créez des templates dans l'onglet Séquences.
          </div>
        )}

        {templates.map(t => (
          <SetRow key={t.id}>
            <div style={{ flex: 1 }}>
              <SetLabel
                label={t.name}
                desc={t.pipeline_stage ? `Stade : ${PIPELINE_STAGES_LABELS[t.pipeline_stage] ?? t.pipeline_stage}` : 'Aucun stade assigné — trigger impossible'}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {t.pipeline_stage ? (
                <>
                  <span style={{ fontSize: 8, color: t.auto_trigger ? C.green : C.textVlo, fontFamily: 'JetBrains Mono,monospace' }}>
                    {t.auto_trigger ? 'ACTIF' : 'INACTIF'}
                  </span>
                  <Toggle
                    checked={t.auto_trigger}
                    onChange={() => handleToggle(t)}
                  />
                </>
              ) : (
                <span style={{ fontSize: 8, color: C.textVlo, fontFamily: 'JetBrains Mono,monospace' }}>
                  Assigner un stade d&apos;abord
                </span>
              )}
            </div>
          </SetRow>
        ))}

        {error && (
          <div style={{ marginTop: 8, padding: 8, background: '#1f0d0d', border: `1px solid ${C.cyan}`, borderRadius: 6, color: C.cyan, fontSize: 9, fontFamily: 'JetBrains Mono,monospace' }}>
            {error}
          </div>
        )}
      </SectionPanel>

      <SectionPanel title="ℹ️ RÈGLES">
        <div style={{ fontSize: 9, color: C.textLo, lineHeight: 1.8, fontFamily: 'JetBrains Mono,monospace' }}>
          <div>• Un seul trigger auto par stade pipeline (contrainte système)</div>
          <div>• Désactiver un trigger n&apos;annule pas les séquences déjà en cours</div>
          <div>• Configurer le stade d&apos;un template dans l&apos;onglet Séquences</div>
        </div>
      </SectionPanel>
    </>
  )
}

// ─── ONGLET MOBILE ────────────────────────────────────────────────────────────
function TabMobile({ settings, save, saving }: { settings: UserSettings | null; save: (p: Partial<UserSettings>) => Promise<unknown>; saving: boolean }) {
  const [checked, setChecked] = useState<Record<string, boolean>>(
    settings?.mobile_sections ?? Object.fromEntries(MOBILE_SECTIONS.map(s => [s.id, s.defaultOn]))
  )
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>(settings?.mobile_font_size ?? 'medium')
  const [compact, setCompact] = useState(settings?.mobile_compact ?? false)
  const [bottomMenu, setBottomMenu] = useState(settings?.mobile_bottom_menu ?? true)

  useEffect(() => {
    if (settings) {
      if (settings.mobile_sections) setChecked(settings.mobile_sections)
      if (settings.mobile_font_size) setFontSize(settings.mobile_font_size)
      setCompact(settings.mobile_compact ?? false)
      setBottomMenu(settings.mobile_bottom_menu ?? true)
    }
  }, [settings])

  async function handleSave() {
    await save({ mobile_sections: checked, mobile_font_size: fontSize, mobile_compact: compact, mobile_bottom_menu: bottomMenu })
    toast.success('Paramètres mobile enregistrés')
  }

  return (
    <SectionPanel title="📱 Affichage mobile">
      <div style={{ fontSize: 9, color: C.textLo, marginBottom: 12, fontFamily: 'JetBrains Mono,monospace' }}>Personnalise l'affichage pour smartphone et tablette</div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 9, fontWeight: 600, color: C.gold, marginBottom: 8, fontFamily: 'Oswald,sans-serif' }}>Sections à afficher sur mobile</div>
        <div style={{ display: 'grid', gap: 6 }}>
          {MOBILE_SECTIONS.map(s => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 8, background: C.surface1, borderRadius: 4 }}>
              <span style={{ fontSize: 9, color: C.text, fontFamily: 'Inter,sans-serif' }}>{s.label}</span>
              <input
                type="checkbox"
                checked={checked[s.id] ?? s.defaultOn}
                onChange={e => setChecked(prev => ({ ...prev, [s.id]: e.target.checked }))}
                style={{ width: 18, height: 18, cursor: 'pointer' }}
              />
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 9, fontWeight: 600, color: C.gold, marginBottom: 8, fontFamily: 'Oswald,sans-serif' }}>Taille de police</div>
        <select value={fontSize} onChange={e => setFontSize(e.target.value as 'small' | 'medium' | 'large')} style={{ width: '100%', padding: 8, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 6, color: C.text, fontSize: 9, fontFamily: 'Inter,sans-serif' }}>
          <option value="small">Petit (lisible sur petit écran)</option>
          <option value="medium">Moyen (équilibré)</option>
          <option value="large">Grand (confort de lecture)</option>
        </select>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 10, background: C.surface1, border: `1px solid ${C.lineSoft}`, borderRadius: 6, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.textHi, fontFamily: 'Inter,sans-serif' }}>Mode compact</div>
          <div style={{ fontSize: 8, color: C.textLo, fontFamily: 'JetBrains Mono,monospace' }}>{"Réduit l'espacement pour voir plus d'infos"}</div>
        </div>
        <input type="checkbox" checked={compact} onChange={e => setCompact(e.target.checked)} style={{ width: 20, height: 20, cursor: 'pointer' }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 10, background: C.surface1, border: `1px solid ${C.lineSoft}`, borderRadius: 6, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.textHi, fontFamily: 'Inter,sans-serif' }}>Menu en bas</div>
          <div style={{ fontSize: 8, color: C.textLo, fontFamily: 'JetBrains Mono,monospace' }}>{"Barre de navigation fixée en bas d'écran"}</div>
        </div>
        <input type="checkbox" checked={bottomMenu} onChange={e => setBottomMenu(e.target.checked)} style={{ width: 20, height: 20, cursor: 'pointer' }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <SetBtn onClick={handleSave} color={C.green} bg="#0d1a0d">
          {saving ? '⏳...' : '💾 Enregistrer mobile'}
        </SetBtn>
      </div>

      <div style={{ padding: 12, background: C.surface1, border: `1px solid ${C.indigo}40`, borderRadius: 6 }}>
        <div style={{ fontSize: 9, fontWeight: 600, color: C.indigo, marginBottom: 8, fontFamily: 'Oswald,sans-serif' }}>📱 Prévisualisation</div>
        <div style={{ fontSize: 8, color: C.textLo, fontFamily: 'JetBrains Mono,monospace' }}>
          Pour voir le rendu mobile, ouvre le dashboard sur ton smartphone ou utilise le mode responsive de ton navigateur (F12 → Toggle device toolbar)
        </div>
      </div>
    </SectionPanel>
  )
}

// ─── TAB SCRIPTS & OBJECTIONS ─────────────────────────────────────────────────
type CallScript = { id: string; metier: string; titre: string; contenu: string; is_default: boolean }
type CallObjection = { id: string; metier: string; question: string; reponse: string; ordre: number }

const METIERS_LIST = [
  { value: 'medecin_generaliste', label: 'Médecin généraliste' },
  { value: 'kinesitherapeute', label: 'Kinésithérapeute' },
  { value: 'dentiste', label: 'Chirurgien dentiste' },
  { value: 'avocat', label: 'Avocat' },
  { value: 'expert_comptable', label: 'Expert comptable' },
  { value: 'notaire', label: 'Notaire' },
  { value: 'osteopathe', label: 'Ostéopathe' },
  { value: 'infirmier', label: 'Infirmier libéral' },
  { value: 'pharmacien', label: 'Pharmacien' },
  { value: 'architecte', label: 'Architecte' },
]

function TabScripts() {
  const [scriptsMetier, setScriptsMetier] = useState('medecin_generaliste')
  const [scripts, setScripts] = useState<CallScript[]>([])
  const [objections, setObjections] = useState<CallObjection[]>([])
  const [scriptsLoading, setScriptsLoading] = useState(false)
  const [newScript, setNewScript] = useState({ titre: '', contenu: '' })
  const [newObj, setNewObj] = useState({ question: '', reponse: '' })
  const [showNewScript, setShowNewScript] = useState(false)
  const [showNewObj, setShowNewObj] = useState(false)

  useEffect(() => {
    setScriptsLoading(true)
    Promise.all([
      fetch(`/api/call-scripts?metier=${scriptsMetier}`).then(r => r.json()),
      fetch(`/api/call-objections?metier=${scriptsMetier}`).then(r => r.json()),
    ]).then(([s, o]) => {
      setScripts(s.data ?? [])
      setObjections(o.data ?? [])
      setScriptsLoading(false)
    }).catch(() => setScriptsLoading(false))
  }, [scriptsMetier])

  async function saveScript() {
    if (!newScript.titre || !newScript.contenu) return
    const res = await fetch('/api/call-scripts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metier: scriptsMetier, ...newScript, is_default: scripts.length === 0 }),
    })
    const data = await res.json()
    if (data.success) { setScripts(p => [...p, data.data]); setNewScript({ titre: '', contenu: '' }); setShowNewScript(false) }
  }

  async function deleteScript(id: string) {
    const res = await fetch(`/api/call-scripts/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) setScripts(p => p.filter(s => s.id !== id))
    else alert(data.error)
  }

  async function setDefaultScript(id: string) {
    await fetch(`/api/call-scripts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_default: true }),
    })
    setScripts(p => p.map(s => ({ ...s, is_default: s.id === id })))
  }

  async function saveObjection() {
    if (!newObj.question || !newObj.reponse) return
    const res = await fetch('/api/call-objections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metier: scriptsMetier, ...newObj, ordre: objections.length }),
    })
    const data = await res.json()
    if (data.success) { setObjections(p => [...p, data.data]); setNewObj({ question: '', reponse: '' }); setShowNewObj(false) }
  }

  async function deleteObjection(id: string) {
    await fetch(`/api/call-objections/${id}`, { method: 'DELETE' })
    setObjections(p => p.filter(o => o.id !== id))
  }

  return (
    <div>
      {/* Sélecteur de métier */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 6 }}>Métier</label>
        <select
          value={scriptsMetier}
          onChange={e => setScriptsMetier(e.target.value)}
          style={{ padding: '7px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textHi, fontSize: 10, fontFamily: 'JetBrains Mono,monospace' }}
        >
          {METIERS_LIST.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>

      {scriptsLoading ? (
        <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo }}>Chargement...</div>
      ) : (
        <>
          {/* Scripts */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 600, color: C.textHi }}>Scripts d&apos;appel</div>
              <button onClick={() => setShowNewScript(s => !s)} style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, padding: '4px 10px', borderRadius: 5, background: `${C.indigo}15`, border: `1px solid ${C.indigo}40`, color: C.indigo, cursor: 'pointer' }}>
                + Nouveau script
              </button>
            </div>

            {showNewScript && (
              <div style={{ background: C.surface1, borderRadius: 8, padding: 12, border: `1px solid ${C.lineSoft}`, marginBottom: 10 }}>
                <input
                  placeholder="Titre du script"
                  value={newScript.titre}
                  onChange={e => setNewScript(p => ({ ...p, titre: e.target.value }))}
                  style={{ width: '100%', padding: '7px 10px', background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 5, color: C.textHi, fontSize: 10, fontFamily: 'JetBrains Mono,monospace', marginBottom: 8, boxSizing: 'border-box' }}
                />
                <textarea
                  placeholder="Contenu du script..."
                  value={newScript.contenu}
                  onChange={e => setNewScript(p => ({ ...p, contenu: e.target.value }))}
                  rows={5}
                  style={{ width: '100%', padding: '7px 10px', background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 5, color: C.textHi, fontSize: 10, fontFamily: 'JetBrains Mono,monospace', resize: 'vertical', boxSizing: 'border-box' }}
                />
                <button onClick={saveScript} style={{ marginTop: 8, padding: '6px 14px', borderRadius: 5, background: '#0a1f0a', border: `1px solid ${C.green}40`, color: C.green, fontFamily: 'JetBrains Mono,monospace', fontSize: 9, cursor: 'pointer' }}>
                  Enregistrer
                </button>
              </div>
            )}

            {scripts.map(s => (
              <div key={s.id} style={{ background: C.surface1, borderRadius: 7, padding: '10px 12px', marginBottom: 6, border: `1px solid ${s.is_default ? C.gold + '40' : C.lineSoft}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 11, color: C.textHi, fontWeight: 500 }}>
                    {s.titre}
                    {s.is_default && <span style={{ marginLeft: 8, fontSize: 7, color: C.gold, border: `1px solid ${C.gold}40`, borderRadius: 4, padding: '1px 5px', fontFamily: 'JetBrains Mono,monospace' }}>ACTIF</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {!s.is_default && (
                      <button onClick={() => setDefaultScript(s.id)} style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7, padding: '3px 7px', borderRadius: 4, background: '#1a1400', border: `1px solid ${C.gold}40`, color: C.gold, cursor: 'pointer' }}>
                        Activer
                      </button>
                    )}
                    <button onClick={() => deleteScript(s.id)} style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7, padding: '3px 7px', borderRadius: 4, background: '#1a0d0d', border: `1px solid #ff647040`, color: '#ff6470', cursor: 'pointer' }}>
                      Suppr.
                    </button>
                  </div>
                </div>
                <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {s.contenu.slice(0, 200)}{s.contenu.length > 200 ? '...' : ''}
                </div>
              </div>
            ))}
            {scripts.length === 0 && <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo, fontStyle: 'italic' }}>Aucun script pour ce métier</div>}
          </div>

          {/* Objections */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 600, color: C.textHi }}>Objections &amp; Réponses</div>
              <button onClick={() => setShowNewObj(s => !s)} style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, padding: '4px 10px', borderRadius: 5, background: `${C.cyan}15`, border: `1px solid ${C.cyan}40`, color: C.cyan, cursor: 'pointer' }}>
                + Nouvelle objection
              </button>
            </div>

            {showNewObj && (
              <div style={{ background: C.surface1, borderRadius: 8, padding: 12, border: `1px solid ${C.lineSoft}`, marginBottom: 10 }}>
                <input
                  placeholder="L'objection du prospect..."
                  value={newObj.question}
                  onChange={e => setNewObj(p => ({ ...p, question: e.target.value }))}
                  style={{ width: '100%', padding: '7px 10px', background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 5, color: C.textHi, fontSize: 10, fontFamily: 'JetBrains Mono,monospace', marginBottom: 8, boxSizing: 'border-box' }}
                />
                <textarea
                  placeholder="Votre réponse type..."
                  value={newObj.reponse}
                  onChange={e => setNewObj(p => ({ ...p, reponse: e.target.value }))}
                  rows={3}
                  style={{ width: '100%', padding: '7px 10px', background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 5, color: C.textHi, fontSize: 10, fontFamily: 'JetBrains Mono,monospace', resize: 'vertical', boxSizing: 'border-box' }}
                />
                <button onClick={saveObjection} style={{ marginTop: 8, padding: '6px 14px', borderRadius: 5, background: '#0a1f1a', border: `1px solid ${C.cyan}40`, color: C.cyan, fontFamily: 'JetBrains Mono,monospace', fontSize: 9, cursor: 'pointer' }}>
                  Enregistrer
                </button>
              </div>
            )}

            {objections.map(o => (
              <div key={o.id} style={{ background: C.surface1, borderRadius: 7, padding: '8px 12px', marginBottom: 6, border: `1px solid ${C.lineSoft}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.cyan, fontWeight: 600, marginBottom: 3 }}>❓ {o.question}</div>
                    <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textMid, lineHeight: 1.5 }}>💬 {o.reponse}</div>
                  </div>
                  <button onClick={() => deleteObjection(o.id)} style={{ marginLeft: 10, fontFamily: 'JetBrains Mono,monospace', fontSize: 7, padding: '3px 7px', borderRadius: 4, background: '#1a0d0d', border: `1px solid #ff647040`, color: '#ff6470', cursor: 'pointer', flexShrink: 0 }}>
                    ✕
                  </button>
                </div>
              </div>
            ))}
            {objections.length === 0 && <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo, fontStyle: 'italic' }}>Aucune objection pour ce métier</div>}
          </div>
        </>
      )}
    </div>
  )
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('general')
  const { settings, saving, save } = useUserSettings()

  return (
    <>
      <style>{'@import url(\'https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap\')'}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ width: 3, height: 22, background: C.ribbon, borderRadius: 2 }} />
            <h1 style={{ fontFamily: 'Oswald,sans-serif', fontSize: 20, fontWeight: 600, color: C.textHi, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              ⚙️ Paramètres
            </h1>
          </div>
          <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo, paddingLeft: 11 }}>
            Configure tes objectifs, séquences, célébrations et notifications
          </div>
        </div>
        <button
          onClick={() => toast.info('Utilise les boutons "Enregistrer" dans chaque section pour sauvegarder')}
          style={{
            fontSize: 10, padding: '7px 14px', borderRadius: 6, cursor: 'pointer',
            border: `0.5px solid ${C.green}`, background: '#0d1f0f',
            color: C.green, fontFamily: 'Oswald,sans-serif', letterSpacing: '0.05em', fontWeight: 500,
          }}
        >
          💾 Enregistrer
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 6, borderBottom: `0.5px solid ${C.lineSoft}`, marginBottom: 16, paddingBottom: 6 }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: 8, borderRadius: '6px 6px 0 0', border: 'none', cursor: 'pointer',
              background: activeTab === tab.id ? '#1a1400' : C.surface1,
              color: activeTab === tab.id ? C.gold : C.textLo,
              fontSize: 9, fontWeight: activeTab === tab.id ? 600 : 500,
              borderBottom: activeTab === tab.id ? `2px solid ${C.gold}` : '2px solid transparent',
              textAlign: 'center', fontFamily: 'Oswald,sans-serif', letterSpacing: '0.05em',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'general' && <TabGeneral settings={settings} save={save} saving={saving} />}
      {activeTab === 'kpi' && <TabKPI settings={settings} save={save} saving={saving} />}
      {activeTab === 'notifications' && <TabNotifications settings={settings} save={save} saving={saving} />}
      {activeTab === 'integrations' && <TabIntegrations />}
      {activeTab === 'sections' && <TabSections settings={settings} save={save} saving={saving} />}
      {activeTab === 'mobile' && <TabMobile settings={settings} save={save} saving={saving} />}
      {activeTab === 'sequences' && <TabSequences />}
      {activeTab === 'variantes' && <TabVariantes settings={settings} save={save} saving={saving} />}
      {activeTab === 'triggers' && <TabTriggers />}
      {activeTab === 'scripts' && <TabScripts />}
    </>
  )
}

// ========== TAB VARIANTES ==========
type Variant = string
type VariantStep = {
  step_order: number
  channel: string
  delay_days: number
  variants: Variant[]
}
type VariantSequence = {
  name: string
  steps: VariantStep[]
}

function TabVariantes({ settings, save, saving }: { settings: UserSettings | null; save: (p: Partial<UserSettings>) => Promise<unknown>; saving: boolean }) {
  const [sequences, setSequences] = useState<VariantSequence[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSeq, setSelectedSeq] = useState<string | null>(null)
  const [selectedStep, setSelectedStep] = useState<number | null>(null)
  const [selectedVar, setSelectedVar] = useState(0)

  useEffect(() => {
    fetch('/api/crm/sequences/seed-library')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setSequences(data.data)
          if (data.data.length > 0) setSelectedSeq(data.data[0].name)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const currentSeq = sequences.find(s => s.name === selectedSeq)
  const currentStep = currentSeq?.steps.find(st => st.step_order === selectedStep)

  if (loading) {
    return <div style={{ padding: 20, color: C.text }}>Chargement des variantes...</div>
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.textHi, marginBottom: 6 }}>
          Variantes de Messages — Style Laetitia Fall
        </div>
        <div style={{ fontSize: 10, color: C.textLo }}>
          Comparez 5-6 variantes par step • Cliquez "Activer" pour utiliser
        </div>
      </div>

      {/* Liste séquences */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: C.textLo, textTransform: 'uppercase', marginBottom: 10 }}>
          Séquences ({sequences.length})
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {sequences.map(seq => (
            <button
              key={seq.name}
              onClick={() => {
                setSelectedSeq(seq.name)
                setSelectedStep(null)
              }}
              style={{
                padding: '8px 14px',
                background: selectedSeq === seq.name ? C.indigo : C.surface1,
                border: `1px solid ${selectedSeq === seq.name ? C.indigo : C.line}`,
                borderRadius: 6,
                color: selectedSeq === seq.name ? C.textHi : C.text,
                fontSize: 10,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {seq.name}
            </button>
          ))}
        </div>
      </div>

      {/* Steps de la séquence sélectionnée */}
      {currentSeq && (
        <>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: C.textLo, textTransform: 'uppercase', marginBottom: 10 }}>
              Steps — {currentSeq.name}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
              {currentSeq.steps.map(step => (
                <div
                  key={step.step_order}
                  onClick={() => {
                    setSelectedStep(step.step_order)
                    setSelectedVar(0)
                  }}
                  style={{
                    padding: '10px 12px',
                    background: selectedStep === step.step_order ? C.surface2 : C.surface1,
                    border: `1px solid ${selectedStep === step.step_order ? C.gold : C.line}`,
                    borderRadius: 6,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ fontSize: 9, fontWeight: 600, color: C.textHi, marginBottom: 3 }}>
                    J+{step.delay_days} • {step.channel.toUpperCase()}
                  </div>
                  <div style={{ fontSize: 8, color: C.textLo }}>
                    {step.variants.length} variantes
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Variantes du step sélectionné */}
          {currentStep && (
            <div style={{
              background: C.surface1,
              border: `1px solid ${C.line}`,
              borderRadius: 8,
              padding: 16,
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.textHi, marginBottom: 12 }}>
                Variantes — Step {currentStep.step_order} ({currentStep.channel.toUpperCase()}, J+{currentStep.delay_days})
              </div>

              {/* Sélecteur variantes */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                {currentStep.variants.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedVar(idx)}
                    style={{
                      padding: '6px 12px',
                      background: selectedVar === idx ? C.gold : C.surface2,
                      border: `1px solid ${selectedVar === idx ? C.gold : C.line}`,
                      borderRadius: 4,
                      color: selectedVar === idx ? C.bgDeep : C.text,
                      fontSize: 9,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'Oswald,sans-serif',
                      letterSpacing: '0.05em',
                      transition: 'all 0.2s',
                    }}
                  >
                    VAR {String.fromCharCode(65 + idx)}
                  </button>
                ))}
              </div>

              {/* Preview */}
              <div style={{
                background: C.bgDeep,
                border: `1px solid ${C.lineSoft}`,
                borderRadius: 6,
                padding: 14,
                marginBottom: 14,
                maxHeight: 400,
                overflow: 'auto',
              }}>
                <div style={{
                  fontSize: 10,
                  color: C.text,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'Inter,sans-serif',
                }}>
                  {currentStep.variants[selectedVar]}
                </div>
              </div>

              {/* Bouton Activer */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button
                  onClick={async () => {
                    if (!currentSeq || !currentStep) return
                    const key = `${currentSeq.name}__step${currentStep.step_order}`
                    const channelTemplates = { ...(settings?.message_templates?.['variantes'] ?? {}), [key]: currentStep.variants[selectedVar] }
                    await save({ message_templates: { ...(settings?.message_templates ?? {}), variantes: channelTemplates } })
                    toast.success(`Variante ${String.fromCharCode(65 + selectedVar)} activée!`)
                  }}
                  style={{
                    padding: '10px 20px',
                    background: C.green,
                    border: 'none',
                    borderRadius: 6,
                    color: C.textHi,
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'Oswald,sans-serif',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  ✓ Activer cette variante
                </button>
                <div style={{ fontSize: 8, color: C.textLo }}>
                  Utilisera ce message par défaut pour ce step
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Navigation transversale — Opérations */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 32, paddingTop: 20, borderTop: `1px solid ${C.gold}20` }}>
        <LinkButton href="/sequences" label="Séquences" color="gold" />
        <LinkButton href="/automatisations" label="Automatisations" color="cyan" />
        <LinkButton href="/scoring" label="Scoring" color="purple" />
        <LinkChip href="/crm" label="CRM" color="green" />
        <LinkChip href="/donnees" label="Données" color="indigo" />
      </div>
    </div>
  )
}
