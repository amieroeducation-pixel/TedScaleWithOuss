'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { C } from '@/lib/theme'
import { TabProps, Toggle, SetRow, SetLabel, NumInput, SectionPanel, SetBtn } from './shared'

const DEFAULT_TEMPLATES = {
  '24h': "Bonjour {{nom}}, rappel de votre RDV demain à {{heure}}. À bientôt !",
  '1h': "Bonjour {{nom}}, votre RDV est dans 1h ({{heure}}). Merci d'être ponctuel !"
}

export function RappelsSmsTab({ settings, save, saving }: TabProps) {
  const [enabled, setEnabled] = useState(settings?.reminder_enabled ?? true)
  const [delay24h, setDelay24h] = useState(settings?.reminder_delay_24h ?? 24)
  const [delay1h, setDelay1h] = useState(settings?.reminder_delay_1h ?? 1)
  const [cabinetLocation, setCabinetLocation] = useState(settings?.cabinet_location ?? 'Mon cabinet')
  const [template24h, setTemplate24h] = useState('')
  const [template1h, setTemplate1h] = useState('')
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [savingTemplates, setSavingTemplates] = useState(false)

  // Charger les templates depuis Supabase
  useEffect(() => {
    async function loadTemplates() {
      try {
        const res = await fetch('/api/settings/reminder-templates')
        if (res.ok) {
          const data = await res.json()
          setTemplate24h(data['24h'] || DEFAULT_TEMPLATES['24h'])
          setTemplate1h(data['1h'] || DEFAULT_TEMPLATES['1h'])
        } else {
          // Utiliser les templates par défaut
          setTemplate24h(DEFAULT_TEMPLATES['24h'])
          setTemplate1h(DEFAULT_TEMPLATES['1h'])
        }
      } catch (e) {
        console.error('Erreur chargement templates:', e)
        setTemplate24h(DEFAULT_TEMPLATES['24h'])
        setTemplate1h(DEFAULT_TEMPLATES['1h'])
      } finally {
        setLoadingTemplates(false)
      }
    }
    loadTemplates()
  }, [])

  async function handleSaveSettings() {
    await save({
      reminder_enabled: enabled,
      reminder_delay_24h: delay24h,
      reminder_delay_1h: delay1h,
      cabinet_location: cabinetLocation
    })
    toast.success('Paramètres sauvegardés')
  }

  async function handleSaveTemplates() {
    setSavingTemplates(true)
    try {
      const res = await fetch('/api/settings/reminder-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          '24h': template24h,
          '1h': template1h
        })
      })

      if (res.ok) {
        toast.success('Templates sauvegardés')
      } else {
        const error = await res.json()
        toast.error(`Erreur: ${error.error || 'Échec sauvegarde'}`)
      }
    } catch (e) {
      toast.error('Erreur réseau')
    } finally {
      setSavingTemplates(false)
    }
  }

  function handleResetTemplates() {
    setTemplate24h(DEFAULT_TEMPLATES['24h'])
    setTemplate1h(DEFAULT_TEMPLATES['1h'])
    toast.success('Templates réinitialisés aux valeurs par défaut')
  }

  return (
    <div style={{ padding: 20, maxWidth: 900 }}>
      <div style={{
        fontFamily: 'Oswald,sans-serif',
        fontSize: 24,
        fontWeight: 700,
        color: C.gold,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: '0.1em'
      }}>
        📲 Rappels SMS Automatiques
      </div>
      <div style={{
        fontFamily: 'JetBrains Mono,monospace',
        fontSize: 10,
        color: C.textLo,
        marginBottom: 24,
        lineHeight: 1.5
      }}>
        Envoi automatique de rappels SMS avant les rendez-vous pris via la page de booking publique.
        <br />
        Variables disponibles : {'{nom}'}, {'{date}'}, {'{heure}'}, {'{lieu}'}
      </div>

      {/* Activation générale */}
      <SectionPanel title="Activation">
        <SetRow>
          <SetLabel
            label="Activer les rappels SMS"
            desc="Désactiver pour stopper tous les rappels automatiques"
          />
          <Toggle
            checked={enabled}
            onChange={(v) => {
              setEnabled(v)
              save({ reminder_enabled: v })
              toast.success(v ? 'Rappels activés' : 'Rappels désactivés')
            }}
          />
        </SetRow>
      </SectionPanel>

      {/* Configuration des délais */}
      <SectionPanel title="Délais d'envoi">
        <div style={{ fontSize: 9, color: C.textLo, marginBottom: 12, fontFamily: 'JetBrains Mono,monospace' }}>
          Configurer les délais avant le RDV pour l'envoi des rappels.
        </div>
        <SetRow>
          <SetLabel
            label="Rappel anticipé"
            desc="Nombre d'heures avant le RDV (défaut: 24h)"
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <NumInput
              value={delay24h}
              min={1}
              max={72}
              onChange={setDelay24h}
            />
            <span style={{ fontSize: 10, color: C.textLo, fontFamily: 'JetBrains Mono,monospace' }}>heures</span>
          </div>
        </SetRow>

        <SetRow>
          <SetLabel
            label="Rappel imminent"
            desc="Nombre d'heures avant le RDV (défaut: 1h)"
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <NumInput
              value={delay1h}
              min={0.5}
              max={12}
              step={0.5}
              onChange={setDelay1h}
            />
            <span style={{ fontSize: 10, color: C.textLo, fontFamily: 'JetBrains Mono,monospace' }}>heures</span>
          </div>
        </SetRow>

        <SetRow>
          <SetLabel
            label="Lieu du cabinet"
            desc="Utilisé dans la variable {{lieu}} des templates SMS"
          />
          <input
            type="text"
            value={cabinetLocation}
            onChange={(e) => setCabinetLocation(e.target.value)}
            style={{
              padding: '6px 10px',
              background: C.surface2,
              border: `1px solid ${C.line}`,
              borderRadius: 6,
              color: C.textHi,
              fontSize: 11,
              fontFamily: 'JetBrains Mono,monospace',
              width: 260,
            }}
            placeholder="Ex: 12 rue de la Paix, Paris"
          />
        </SetRow>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <SetBtn
            onClick={handleSaveSettings}
            color={C.gold}
            bg={C.surface2}
          >
            {saving ? 'Sauvegarde...' : '💾 Sauvegarder paramètres'}
          </SetBtn>
        </div>
      </SectionPanel>

      {/* Templates SMS */}
      <SectionPanel title="Templates SMS">
        {loadingTemplates ? (
          <div style={{ textAlign: 'center', padding: 20, color: C.textLo, fontSize: 10 }}>
            Chargement des templates...
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.textHi, marginBottom: 6, fontFamily: 'Inter,sans-serif' }}>
                Template rappel anticipé ({delay24h}h avant)
              </div>
              <textarea
                value={template24h}
                onChange={(e) => setTemplate24h(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: 10,
                  background: C.surface2,
                  border: `1px solid ${C.line}`,
                  borderRadius: 6,
                  color: C.textHi,
                  fontSize: 11,
                  fontFamily: 'JetBrains Mono,monospace',
                  resize: 'vertical'
                }}
                placeholder="Ex: Bonjour {{nom}}, rappel de votre RDV demain à {{heure}}. À bientôt !"
              />
              <div style={{ fontSize: 8, color: C.textVlo, marginTop: 4, fontFamily: 'JetBrains Mono,monospace' }}>
                Variables : {'{nom}'} = nom du contact, {'{date}'} = date complète, {'{heure}'} = heure du RDV, {'{lieu}'} = lieu du cabinet
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.textHi, marginBottom: 6, fontFamily: 'Inter,sans-serif' }}>
                Template rappel imminent ({delay1h}h avant)
              </div>
              <textarea
                value={template1h}
                onChange={(e) => setTemplate1h(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: 10,
                  background: C.surface2,
                  border: `1px solid ${C.line}`,
                  borderRadius: 6,
                  color: C.textHi,
                  fontSize: 11,
                  fontFamily: 'JetBrains Mono,monospace',
                  resize: 'vertical'
                }}
                placeholder="Ex: Bonjour {{nom}}, votre RDV est dans 1h ({{heure}}). Merci d'être ponctuel !"
              />
              <div style={{ fontSize: 8, color: C.textVlo, marginTop: 4, fontFamily: 'JetBrains Mono,monospace' }}>
                Variables : {'{nom}'} = nom du contact, {'{date}'} = date complète, {'{heure}'} = heure du RDV, {'{lieu}'} = lieu du cabinet
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <SetBtn
                onClick={handleResetTemplates}
                color={C.textLo}
                bg={C.surface1}
              >
                🔄 Réinitialiser
              </SetBtn>
              <SetBtn
                onClick={handleSaveTemplates}
                color={C.gold}
                bg={C.surface2}
              >
                {savingTemplates ? 'Sauvegarde...' : '💾 Sauvegarder templates'}
              </SetBtn>
            </div>
          </>
        )}
      </SectionPanel>

      {/* Aperçu / Info */}
      <div style={{
        background: `linear-gradient(135deg, ${C.surface1}, ${C.bgMid})`,
        border: `1px solid ${C.lineSoft}`,
        borderRadius: 10,
        padding: 14,
        marginTop: 16
      }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: C.gold, marginBottom: 8, fontFamily: 'Oswald,sans-serif' }}>
          ℹ️ INFORMATIONS
        </div>
        <div style={{ fontSize: 9, color: C.textLo, lineHeight: 1.6, fontFamily: 'JetBrains Mono,monospace' }}>
          • Les rappels sont envoyés automatiquement via le cron <code>/api/cron/rdv-reminder</code>
          <br />
          • Seuls les bookings avec statut "confirmed" ou "pending" sont traités
          <br />
          • Anti-doublon : un rappel de chaque type (24h/1h) n'est envoyé qu'une seule fois
          <br />
          • Les logs sont visibles dans la page <strong>Automatisations</strong>
          <br />
          • Format téléphone requis : +33612345678 (E.164)
        </div>
      </div>
    </div>
  )
}
