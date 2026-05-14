'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { C } from '@/lib/theme'
import { useUserSettings, UserSettings } from '@/hooks/useUserSettings'

type Tab = 'general' | 'kpi' | 'notifications' | 'integrations' | 'sections' | 'mobile' | 'sequences' | 'triggers'

const TABS: { id: Tab; label: string }[] = [
  { id: 'general', label: 'Général' },
  { id: 'kpi', label: '📊 KPI' },
  { id: 'notifications', label: '🔔 Notif' },
  { id: 'integrations', label: '🔗 API' },
  { id: 'sections', label: '👁️ Sections' },
  { id: 'mobile', label: '📱 Mobile' },
  { id: 'sequences', label: '🔗 Séquences' },
  { id: 'triggers', label: '⚡ Triggers' },
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
function TabGeneral() {
  const [objCount, setObjCount] = useState(4)

  return (
    <>
      <SectionPanel title="🎯 Coach Champions — Personnalisation">
        <div style={{ fontSize: 9, color: C.textLo, marginBottom: 12, lineHeight: 1.6, fontFamily: 'Inter,sans-serif' }}>
          Personnalise les recommandations du coach dans la section Champions. Donne des instructions spécifiques sur le ton, les priorités, ou le type de conseils que tu veux recevoir.
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 8, color: C.textLo, display: 'block', marginBottom: 6, fontFamily: 'JetBrains Mono,monospace' }}>Instructions pour le coach</label>
          <textarea
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
        <SetBtn color={C.green} bg="#0d1a0d">💾 Enregistrer les instructions</SetBtn>
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
                <input type="radio" name="objectives-count" value={n} checked={objCount === n} onChange={() => setObjCount(n)} style={{ cursor: 'pointer' }} />
                <span style={{ fontSize: 9, color: objCount === n ? C.gold : C.text, fontWeight: objCount === n ? 600 : 400, fontFamily: 'Inter,sans-serif' }}>{n} objectifs</span>
              </label>
            ))}
          </div>
          <div style={{ fontSize: 8, color: C.textLo, marginTop: 10, fontFamily: 'JetBrains Mono,monospace' }}>
            💡 Objectifs disponibles : Contacts, Appels, RDV R1, RDV R2, Signatures, Relances
          </div>
        </div>

        {[
          { label: 'Nouveaux contacts / jour', desc: 'Prospects ajoutés quotidiennement', val: 10 },
          { label: 'Appels / jour', desc: "Nombre d'appels quotidien visé", val: 20 },
          { label: 'RDV R1 / jour', desc: 'Premiers rendez-vous à poser', val: 5 },
          { label: 'RDV R2 / jour', desc: 'Deuxièmes rendez-vous à poser', val: 3 },
        ].map((row, i) => (
          <SetRow key={i}>
            <SetLabel label={row.label} desc={row.desc} />
            <NumInput value={row.val} min={1} max={100} />
          </SetRow>
        ))}
      </SectionPanel>

      <SectionPanel title="⏱️ Chronomètre production">
        {[
          { label: "Durée d'un bloc (minutes)", desc: 'Deep work / Pomodoro — défaut 45 min', val: 45, min: 15, max: 120 },
          { label: 'Blocs / jour (normal)', desc: 'Objectif standard de blocs quotidiens', val: 4, min: 2, max: 10 },
          { label: 'Blocs / jour (grosse prod)', desc: 'Objectif max de blocs quotidiens', val: 6, min: 3, max: 12 },
        ].map((row, i) => (
          <SetRow key={i}>
            <SetLabel label={row.label} desc={row.desc} />
            <NumInput value={row.val} min={row.min} max={row.max} />
          </SetRow>
        ))}
      </SectionPanel>

      <SectionPanel title="📊 Objectifs hebdomadaires">
        {[
          { label: 'Appels / semaine', desc: "Total d'appels visé sur la semaine", val: 40, min: 10, max: 200 },
          { label: 'Blocs / semaine', desc: 'Total de blocs production', val: 15, min: 5, max: 50 },
          { label: 'Relances / semaine', desc: 'Total de relances prospects', val: 12, min: 3, max: 50 },
          { label: 'Taux closing objectif (%)', desc: 'Pourcentage de conversion visé', val: 40, min: 10, max: 80 },
        ].map((row, i) => (
          <SetRow key={i}>
            <SetLabel label={row.label} desc={row.desc} />
            <NumInput value={row.val} min={row.min} max={row.max} />
          </SetRow>
        ))}
      </SectionPanel>

      <SectionPanel title="🎯 Planification annuelle intelligente">
        <div style={{ fontSize: 9, color: C.textLo, marginBottom: 14, lineHeight: 1.6, fontFamily: 'Inter,sans-serif' }}>
          Définis tes objectifs annuels. Le dashboard calculera automatiquement les objectifs mensuels et hebdomadaires selon l'intensité de chaque mois.
        </div>

        <div style={{ background: C.surface1, border: `1px solid ${C.lineSoft}`, borderRadius: 8, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.gold, marginBottom: 12, fontFamily: 'Oswald,sans-serif' }}>📊 Objectifs annuels 2026</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {[
              { label: 'RDV R1 annuel', val: 240, color: C.indigo },
              { label: 'RDV R2 annuel', val: 144, color: C.green },
              { label: 'Collecte annuelle (€)', val: 600000, color: C.gold },
            ].map((f, i) => (
              <div key={i}>
                <label style={{ fontSize: 8, color: C.textLo, display: 'block', marginBottom: 4, fontFamily: 'JetBrains Mono,monospace' }}>{f.label}</label>
                <input
                  type="number"
                  defaultValue={f.val}
                  style={{ width: '100%', padding: 8, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 6, color: f.color, fontSize: 14, fontWeight: 600, textAlign: 'center', boxSizing: 'border-box', fontFamily: 'JetBrains Mono,monospace' }}
                />
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: C.surface1, border: `1px solid ${C.lineSoft}`, borderRadius: 8, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.gold, marginBottom: 6, fontFamily: 'Oswald,sans-serif' }}>📅 Intensité par mois</div>
          <div style={{ fontSize: 8, color: C.textLo, marginBottom: 12, fontFamily: 'JetBrains Mono,monospace' }}>↘↘ -30% · ↘ -10% · - Normal · ↗ +10% · ↗↗ +30%</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 8, marginBottom: 8 }}>
            {MONTHS_ID.slice(0, 6).map((id, i) => (
              <div key={id} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 8, color: C.textLo, marginBottom: 4, fontFamily: 'JetBrains Mono,monospace' }}>{MONTHS_SHORT[i]} ({MONTHS_WEEKS[i]}s)</div>
                <select defaultValue="1.0" style={{ width: '100%', padding: 4, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 4, color: C.text, fontSize: 11, textAlign: 'center' }}>
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
                <select defaultValue="1.0" style={{ width: '100%', padding: 4, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 4, color: C.text, fontSize: 11, textAlign: 'center' }}>
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
        {[
          { label: 'Délai entre emails (jours)', desc: 'Espacement entre 2 emails dans une séquence', val: 3, min: 1, max: 30 },
          { label: 'Délai entre SMS (jours)', desc: 'Espacement entre 2 SMS', val: 5, min: 1, max: 30 },
          { label: 'Délai entre WhatsApp (jours)', desc: 'Espacement entre 2 messages WA', val: 2, min: 1, max: 30 },
          { label: 'Étapes max par séquence', desc: "Nombre maximum d'étapes", val: 6, min: 3, max: 20 },
          { label: 'Arrêt automatique si pas de réponse (jours)', desc: 'Stop séquence après X jours sans réponse', val: 21, min: 7, max: 60 },
        ].map((row, i) => (
          <SetRow key={i}>
            <SetLabel label={row.label} desc={row.desc} />
            <NumInput value={row.val} min={row.min} max={row.max} />
          </SetRow>
        ))}
      </SectionPanel>

      <SectionPanel title="🎉 Célébrations">
        {[
          { label: '🎊 Tester confettis', desc: 'Objectif quotidien atteint', btnLabel: 'Tester', color: C.gold, bg: '#1a1400' },
          { label: '🚀 Tester fusée', desc: 'Record personnel battu', btnLabel: 'Tester', color: C.green, bg: '#0d1f0f' },
          { label: "🎆 Tester feux d'artifice", desc: 'Objectif global / mensuel atteint', btnLabel: 'Tester', color: '#b07aee', bg: '#180d2e' },
          { label: '🔔 Tester gong RDV', desc: 'Son de gong quand un RDV est posé', btnLabel: 'Tester', color: C.indigo, bg: '#0d1a2e' },
          { label: '🔔 Tester gong contrat', desc: 'Son de gong quand un contrat est signé', btnLabel: 'Tester', color: C.gold, bg: '#1a1400' },
        ].map((row, i) => (
          <SetRow key={i}>
            <SetLabel label={row.label} desc={row.desc} />
            <SetBtn color={row.color} bg={row.bg}>{row.btnLabel}</SetBtn>
          </SetRow>
        ))}
      </SectionPanel>

      <SectionPanel title="⚠️ Zone dangereuse">
        <SetRow>
          <SetLabel label="Réinitialiser les compteurs du jour" desc="Remet à 0 les contacts, appels, RDV" />
          <SetBtn color={C.cyan} bg="#1f0d0d">🗑️ Reset jour</SetBtn>
        </SetRow>
        <SetRow>
          <SetLabel label="Restaurer tous les paramètres par défaut" desc="Remet toutes les valeurs d'origine" />
          <SetBtn color={C.cyan} bg="#1f0d0d">🔄 Reset tout</SetBtn>
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

  // Synchroniser les valeurs locales quand settings charge depuis l'API
  useEffect(() => {
    if (settings) {
      setCaMonthly(settings.ca_monthly_target)
      setCaAnnual(settings.ca_annual_target)
      setHealthDays(settings.client_health_threshold_days)
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
          <NumInput value={64} min={1} max={500} />
        </SetRow>
        <SetRow>
          <SetLabel label="🎯 Objectif annuel R2" desc="Total de RDV R2 pour 2026" />
          <NumInput value={24} min={1} max={500} />
        </SetRow>

        <div style={{ background: '#1a1400', border: `1px solid ${C.gold}`, borderRadius: 6, padding: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: C.gold, fontWeight: 600, marginBottom: 8, fontFamily: 'Oswald,sans-serif' }}>📊 Planification automatique</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 9, color: C.text, fontFamily: 'JetBrains Mono,monospace' }}>
            <div><strong>R1 par mois :</strong> 5.3</div>
            <div><strong>R2 par mois :</strong> 2</div>
            <div><strong>R1 par semaine :</strong> 1.2</div>
            <div><strong>R2 par semaine :</strong> 0.5</div>
          </div>
        </div>

        <div style={{ fontSize: 10, fontWeight: 600, color: C.textHi, marginBottom: 8, fontFamily: 'Oswald,sans-serif' }}>Répartition mensuelle personnalisée (optionnel)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
          {MONTHS_SHORT.map((m, i) => (
            <div key={m} style={{ background: C.surface2, padding: 6, borderRadius: 4, border: `1px solid ${C.lineSoft}` }}>
              <div style={{ fontSize: 8, color: C.textLo, marginBottom: 4, fontFamily: 'JetBrains Mono,monospace' }}>{m}</div>
              <div style={{ display: 'flex', gap: 4 }}>
                <input type="number" placeholder="R1" style={{ width: 40, padding: 3, background: '#1a1a1a', border: `1px solid ${C.line}`, borderRadius: 3, color: C.green, fontSize: 8 }} min={0} />
                <input type="number" placeholder="R2" style={{ width: 40, padding: 3, background: '#1a1a1a', border: `1px solid ${C.line}`, borderRadius: 3, color: C.indigo, fontSize: 8 }} min={0} />
              </div>
            </div>
          ))}
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
          <NumInput value={3} min={1} max={20} />
        </SetRow>
        <div style={{ background: '#0d1a0d', border: `1px solid ${C.green}`, borderRadius: 6, padding: 12, marginTop: 12 }}>
          <div style={{ fontSize: 10, color: C.green, fontWeight: 600, marginBottom: 8, fontFamily: 'Oswald,sans-serif' }}>📊 Planification automatique</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 9, color: C.text, fontFamily: 'JetBrains Mono,monospace' }}>
            <div><strong>Par semaine :</strong> 15 contacts</div>
            <div><strong>Par mois :</strong> 65 contacts</div>
            <div><strong>Par an :</strong> 780 contacts</div>
          </div>
        </div>
      </SectionPanel>

      <SectionPanel title="📚 Commerce (Formation)">
        <div style={{ fontSize: 9, color: C.textLo, marginBottom: 12, fontFamily: 'JetBrains Mono,monospace' }}>Temps de formation commerciale quotidien</div>
        <SetRow>
          <SetLabel label="🎯 Objectif quotidien" desc="Minutes de formation par jour" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <NumInput value={30} min={5} max={120} step={5} />
            <span style={{ fontSize: 9, color: C.textLo, fontFamily: 'JetBrains Mono,monospace' }}>min</span>
          </div>
        </SetRow>
        <div style={{ background: '#0d1a2e', border: `1px solid ${C.indigo}`, borderRadius: 6, padding: 12, marginTop: 12 }}>
          <div style={{ fontSize: 10, color: C.indigo, fontWeight: 600, marginBottom: 8, fontFamily: 'Oswald,sans-serif' }}>📊 Planification automatique</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 9, color: C.text, fontFamily: 'JetBrains Mono,monospace' }}>
            <div><strong>Par semaine :</strong> 2.5 heures</div>
            <div><strong>Par mois :</strong> 10 heures</div>
            <div><strong>Par an :</strong> 120 heures</div>
          </div>
        </div>
      </SectionPanel>

      <SectionPanel title="💪 Sport">
        <div style={{ fontSize: 9, color: C.textLo, marginBottom: 12, fontFamily: 'JetBrains Mono,monospace' }}>Séances de sport hebdomadaires</div>
        <SetRow>
          <SetLabel label="🎯 Objectif hebdomadaire" desc="Séances par semaine" />
          <NumInput value={3} min={1} max={7} />
        </SetRow>
        <div style={{ background: '#1a1400', border: `1px solid ${C.gold}`, borderRadius: 6, padding: 12, marginTop: 12 }}>
          <div style={{ fontSize: 10, color: C.gold, fontWeight: 600, marginBottom: 8, fontFamily: 'Oswald,sans-serif' }}>📊 Planification automatique</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 9, color: C.text, fontFamily: 'JetBrains Mono,monospace' }}>
            <div><strong>Par mois :</strong> 13 séances</div>
            <div><strong>Par an :</strong> 156 séances</div>
          </div>
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
  const [pushOn, setPushOn] = useState(true)
  const [emailOn, setEmailOn] = useState(false)
  const [smsOn, setSmsOn] = useState(false)
  const [telegramOn, setTelegramOn] = useState(false)

  // État éditeur de messages
  const [selectedChannel, setSelectedChannel] = useState<'whatsapp' | 'email' | 'sms'>('whatsapp')
  const [selectedStage, setSelectedStage] = useState<string>('a_contacter')
  const [editedText, setEditedText] = useState('')
  const [msgSaving, setMsgSaving] = useState(false)

  // Synchroniser editedText depuis settings quand channel/stage changent
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
            <input type="email" placeholder="ton-email@exemple.fr" style={{ width: '100%', marginTop: 6, padding: 6, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 4, color: C.text, fontSize: 10, fontFamily: 'Inter,sans-serif', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginLeft: 12 }}><Toggle checked={emailOn} onChange={setEmailOn} /></div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#0d1a0d', borderRadius: 6, border: `1px solid ${C.green}40`, marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <SetLabel label="📱 SMS (Mobile)" desc="Alertes urgence 48h uniquement • Via Twilio" />
            <input type="tel" placeholder="+33 6 12 34 56 78" style={{ width: '100%', marginTop: 6, padding: 6, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 4, color: C.text, fontSize: 10, fontFamily: 'Inter,sans-serif', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginLeft: 12 }}><Toggle checked={smsOn} onChange={setSmsOn} /></div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#0d1a2e', borderRadius: 6, border: `1px solid ${C.indigo}40`, marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <SetLabel label="💬 Telegram" desc="Notifications via bot Telegram • Gratuit" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 6 }}>
              <input type="text" placeholder="Bot Token" style={{ padding: 6, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 4, color: C.text, fontSize: 10, fontFamily: 'Inter,sans-serif' }} />
              <input type="text" placeholder="Chat ID" style={{ padding: 6, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 4, color: C.text, fontSize: 10, fontFamily: 'Inter,sans-serif' }} />
            </div>
            <div style={{ fontSize: 8, color: C.textLo, marginTop: 4, fontFamily: 'JetBrains Mono,monospace' }}>
              📘{' '}
              <a href="https://core.telegram.org/bots#creating-a-new-bot" target="_blank" rel="noreferrer" style={{ color: C.indigo }}>Comment créer un bot Telegram</a>
            </div>
          </div>
          <div style={{ marginLeft: 12 }}><Toggle checked={telegramOn} onChange={setTelegramOn} /></div>
        </div>
      </SectionPanel>

      <SectionPanel title="⚡ Événements à notifier">
        <div style={{ fontSize: 9, color: C.textLo, marginBottom: 12, fontFamily: 'JetBrains Mono,monospace' }}>Choisis quels événements déclenchent des notifications</div>
        {[
          { label: '🚀 Prospection hebdo prête (Lundi 8h)', desc: 'Rappel pour lancer le workflow hebdomadaire', defaultOn: true },
          { label: '📅 Prospection mensuelle prête (1er lundi 8h)', desc: 'Rappel pour lancer le workflow mensuel', defaultOn: true },
          { label: '⚡ Leads urgence 48h détectés', desc: 'Alerte immédiate pour cessions BODACC et holdings', defaultOn: true },
          { label: '📊 Workflow terminé (résultats)', desc: 'Notification quand prospection est terminée + nombre de leads', defaultOn: true },
          { label: '⚠️ Échec workflow (erreur API)', desc: 'Alerte si un workflow échoue', defaultOn: true },
        ].map((ev, i) => (
          <SetRow key={i}>
            <SetLabel label={ev.label} desc={ev.desc} />
            <input type="checkbox" defaultChecked={ev.defaultOn} style={{ width: 20, height: 20, cursor: 'pointer' }} />
          </SetRow>
        ))}
        <SetRow>
          <SetLabel label="🔔 Rappel RDV (heures avant)" desc="Notification avant rendez-vous" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="number" defaultValue={24} min={1} max={72} style={{ width: 60, padding: 6, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 4, color: C.text, fontSize: 10, fontFamily: 'JetBrains Mono,monospace' }} />
            <span style={{ fontSize: 9, color: C.textLo, fontFamily: 'JetBrains Mono,monospace' }}>h avant</span>
          </div>
        </SetRow>
      </SectionPanel>

      <SectionPanel title="🧪 Tester les notifications">
        <div style={{ fontSize: 9, color: C.textLo, marginBottom: 12, fontFamily: 'JetBrains Mono,monospace' }}>Envoie une notification test sur chaque canal activé</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
          <SetBtn color={C.indigo} bg="#0d1a2e">🌐 Test Push</SetBtn>
          <SetBtn color={C.gold} bg="#1a1400">📧 Test Email</SetBtn>
          <SetBtn color={C.green} bg="#0d1a0d">📱 Test SMS</SetBtn>
          <SetBtn color={C.indigo} bg="#0d1a2e">💬 Test Telegram</SetBtn>
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
function TabIntegrations() {
  const [calendarStatus, setCalendarStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading')

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

        <div style={{ background: C.surface1, border: `1px solid ${C.lineSoft}`, borderRadius: 6, padding: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.textHi, fontFamily: 'Oswald,sans-serif' }}>Workflow #1</div>
              <div style={{ fontSize: 8, color: C.textLo, marginTop: 2, fontFamily: 'JetBrains Mono,monospace' }}>Import automatique Pappers</div>
            </div>
            <SetBtn color={C.cyan} bg="#1f0d0d">🗑️ Supprimer</SetBtn>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 8, color: C.textLo, display: 'block', marginBottom: 4, fontFamily: 'JetBrains Mono,monospace' }}>Nom du workflow</label>
              <input type="text" defaultValue="Import Pappers → TNS" style={{ width: '100%', padding: 6, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 4, color: C.text, fontSize: 9, fontFamily: 'Inter,sans-serif', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 8, color: C.textLo, display: 'block', marginBottom: 4, fontFamily: 'JetBrains Mono,monospace' }}>Base de données cible</label>
              <select style={{ width: '100%', padding: 6, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 4, color: C.text, fontSize: 9, fontFamily: 'Inter,sans-serif' }}>
                <option value="tns">📊 TNS (Travailleurs Non Salariés)</option>
                <option value="chef">💼 Chef d'entreprise</option>
                <option value="particulier">👤 Particulier</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 8, color: C.textLo, display: 'block', marginBottom: 4, fontFamily: 'JetBrains Mono,monospace' }}>{"Type d'intégration"}</label>
            <select style={{ width: '100%', padding: 6, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 4, color: C.text, fontSize: 9, fontFamily: 'Inter,sans-serif' }}>
              <option value="api">🔑 Clé API</option>
              <option value="mcp">🔗 Serveur MCP</option>
              <option value="webhook">📡 Webhook</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: 8, color: C.textLo, display: 'block', marginBottom: 4, fontFamily: 'JetBrains Mono,monospace' }}>Clé API / URL MCP</label>
            <input type="password" placeholder="sk-xxxxxxxxxxxxxxxxxxxx" style={{ width: '100%', padding: 6, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 4, color: C.text, fontSize: 9, fontFamily: 'monospace', boxSizing: 'border-box' }} />
          </div>
        </div>

        <button style={{ width: '100%', padding: 10, background: '#0d1a2e', border: `1px solid ${C.indigo}`, color: C.indigo, borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'Oswald,sans-serif', letterSpacing: '0.05em' }}>
          ➕ Ajouter un nouveau workflow
        </button>
      </SectionPanel>

      <SectionPanel title="🔗 API Pappers">
        <div style={{ fontSize: 9, color: C.textLo, marginBottom: 12, fontFamily: 'JetBrains Mono,monospace' }}>
          Clé API pour les workflows d'acquisition •{' '}
          <a href="https://www.pappers.fr" target="_blank" rel="noreferrer" style={{ color: C.indigo }}>Créer un compte gratuit</a>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 500, color: C.textHi, marginBottom: 6, fontFamily: 'Inter,sans-serif' }}>🔑 Clé API Pappers</div>
            <input type="password" placeholder="Colle ta clé API ici" style={{ width: '100%', padding: 8, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 4, color: C.gold, fontSize: 10, fontFamily: 'monospace', boxSizing: 'border-box' }} />
            <div style={{ fontSize: 8, color: C.textLo, marginTop: 4, fontFamily: 'JetBrains Mono,monospace' }}>✅ Essai gratuit 2 semaines • Aucune CB requise</div>
          </div>
          <SetBtn color={C.green} bg="#0d1a0d">🧪 Tester</SetBtn>
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
          <input type="checkbox" defaultChecked style={{ width: 20, height: 20, cursor: 'pointer' }} />
        </SetRow>
        <SetRow>
          <SetLabel label="☁️ Backup LocalStorage hebdomadaire" desc="Sauvegarde auto des leads en JSON chaque lundi" />
          <input type="checkbox" defaultChecked style={{ width: 20, height: 20, cursor: 'pointer' }} />
        </SetRow>
      </SectionPanel>
    </>
  )
}

// ─── ONGLET SECTIONS ─────────────────────────────────────────────────────────
function TabSections() {
  const [checked, setChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(SECTIONS_LIST.map(s => [s.id, true]))
  )

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
              checked={checked[s.id]}
              onChange={e => setChecked(prev => ({ ...prev, [s.id]: e.target.checked }))}
              style={{ width: 20, height: 20, cursor: 'pointer' }}
            />
          </div>
        ))}
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
      <div style={{ marginBottom: 12 }}>
        <SetBtn color={C.green} bg="#0d1a0d" onClick={() => setCreating(true)}>+ Nouveau template</SetBtn>
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
                <div key={step.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
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
function TabMobile() {
  const [checked, setChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(MOBILE_SECTIONS.map(s => [s.id, s.defaultOn]))
  )

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
                checked={checked[s.id]}
                onChange={e => setChecked(prev => ({ ...prev, [s.id]: e.target.checked }))}
                style={{ width: 18, height: 18, cursor: 'pointer' }}
              />
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 9, fontWeight: 600, color: C.gold, marginBottom: 8, fontFamily: 'Oswald,sans-serif' }}>Taille de police</div>
        <select defaultValue="medium" style={{ width: '100%', padding: 8, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 6, color: C.text, fontSize: 9, fontFamily: 'Inter,sans-serif' }}>
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
        <input type="checkbox" style={{ width: 20, height: 20, cursor: 'pointer' }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 10, background: C.surface1, border: `1px solid ${C.lineSoft}`, borderRadius: 6, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.textHi, fontFamily: 'Inter,sans-serif' }}>Menu en bas</div>
          <div style={{ fontSize: 8, color: C.textLo, fontFamily: 'JetBrains Mono,monospace' }}>{"Barre de navigation fixée en bas d'écran"}</div>
        </div>
        <input type="checkbox" defaultChecked style={{ width: 20, height: 20, cursor: 'pointer' }} />
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
      {activeTab === 'general' && <TabGeneral />}
      {activeTab === 'kpi' && <TabKPI settings={settings} save={save} saving={saving} />}
      {activeTab === 'notifications' && <TabNotifications settings={settings} save={save} saving={saving} />}
      {activeTab === 'integrations' && <TabIntegrations />}
      {activeTab === 'sections' && <TabSections />}
      {activeTab === 'mobile' && <TabMobile />}
      {activeTab === 'sequences' && <TabSequences />}
      {activeTab === 'triggers' && <TabTriggers />}
    </>
  )
}
