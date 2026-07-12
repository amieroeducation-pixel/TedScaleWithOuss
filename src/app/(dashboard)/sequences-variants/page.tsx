'use client'

import { useState, useEffect } from 'react'
import { C } from '@/lib/theme'
import { LinkButton, LinkChip } from '@/lib/cross-links'

type Variant = string
type Step = {
  step_order: number
  channel: string
  delay_days: number
  variants: Variant[]
}
type Sequence = {
  name: string
  steps: Step[]
}

export default function SequencesVariantsPage() {
  const [sequences, setSequences] = useState<Sequence[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSequence, setSelectedSequence] = useState<string | null>(null)
  const [selectedStep, setSelectedStep] = useState<number | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<number>(0)

  useEffect(() => {
    fetch('/api/crm/sequences/seed-library')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setSequences(data.data)
          if (data.data.length > 0) {
            setSelectedSequence(data.data[0].name)
          }
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const currentSequence = sequences.find(s => s.name === selectedSequence)
  const currentStep = currentSequence?.steps.find(st => st.step_order === selectedStep)

  if (loading) {
    return (
      <div style={{ padding: 40, color: C.text, fontFamily: 'Inter,sans-serif' }}>
        Chargement des variantes...
      </div>
    )
  }

  return (
    <div style={{ padding: 20, fontFamily: 'Inter,sans-serif', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.textHi, marginBottom: 6 }}>
          Variantes de Séquences
        </h1>
        <div style={{ fontSize: 11, color: C.textLo, fontFamily: 'JetBrains Mono,monospace' }}>
          Choisissez parmi 5-6 variantes par step • Style Laetitia Fall (vendue.fr)
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
        {/* Sidebar - Liste des séquences */}
        <div>
          <div style={{
            fontSize: 9,
            fontWeight: 600,
            color: C.textLo,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 12,
            fontFamily: 'JetBrains Mono,monospace',
          }}>
            Séquences ({sequences.length})
          </div>

          {sequences.map(seq => (
            <div
              key={seq.name}
              onClick={() => {
                setSelectedSequence(seq.name)
                setSelectedStep(null)
              }}
              style={{
                padding: '10px 12px',
                background: selectedSequence === seq.name ? C.surface2 : C.surface1,
                border: `1px solid ${selectedSequence === seq.name ? C.line : C.lineSoft}`,
                borderRadius: 8,
                marginBottom: 8,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 500, color: C.textHi, marginBottom: 3 }}>
                {seq.name}
              </div>
              <div style={{ fontSize: 8, color: C.textLo, fontFamily: 'JetBrains Mono,monospace' }}>
                {seq.steps.length} steps • {seq.steps.reduce((sum, st) => sum + st.variants.length, 0)} variantes
              </div>
            </div>
          ))}
        </div>

        {/* Main - Steps et Variantes */}
        <div>
          {currentSequence && (
            <>
              <div style={{
                fontSize: 9,
                fontWeight: 600,
                color: C.textLo,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 12,
                fontFamily: 'JetBrains Mono,monospace',
              }}>
                Steps de "{currentSequence.name}"
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
                {currentSequence.steps.map(step => (
                  <div
                    key={step.step_order}
                    onClick={() => {
                      setSelectedStep(step.step_order)
                      setSelectedVariant(0)
                    }}
                    style={{
                      padding: '12px',
                      background: selectedStep === step.step_order ? C.surface2 : C.surface1,
                      border: `1px solid ${selectedStep === step.step_order ? C.indigo : C.lineSoft}`,
                      borderRadius: 8,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ fontSize: 10, fontWeight: 600, color: C.textHi, marginBottom: 4 }}>
                      J+{step.delay_days} • {step.channel.toUpperCase()}
                    </div>
                    <div style={{ fontSize: 8, color: C.textLo, fontFamily: 'JetBrains Mono,monospace' }}>
                      {step.variants.length} variantes
                    </div>
                  </div>
                ))}
              </div>

              {/* Variantes du step sélectionné */}
              {currentStep && (
                <div>
                  <div style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: C.textHi,
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}>
                    <span>Variantes — Step {currentStep.step_order} ({currentStep.channel.toUpperCase()}, J+{currentStep.delay_days})</span>
                    <div style={{ fontSize: 9, color: C.textLo, fontFamily: 'JetBrains Mono,monospace' }}>
                      {currentStep.variants.length} choix disponibles
                    </div>
                  </div>

                  {/* Sélecteur de variantes */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                    {currentStep.variants.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedVariant(idx)}
                        style={{
                          padding: '8px 16px',
                          background: selectedVariant === idx ? C.indigo : C.surface1,
                          border: `1px solid ${selectedVariant === idx ? C.indigo : C.line}`,
                          borderRadius: 6,
                          color: selectedVariant === idx ? C.textHi : C.text,
                          fontSize: 10,
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: 'Oswald,sans-serif',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          transition: 'all 0.2s',
                        }}
                      >
                        Variante {String.fromCharCode(65 + idx)}
                      </button>
                    ))}
                  </div>

                  {/* Preview de la variante sélectionnée */}
                  <div style={{
                    background: C.bgDeep,
                    border: `1px solid ${C.line}`,
                    borderRadius: 8,
                    padding: 20,
                  }}>
                    <div style={{
                      fontSize: 9,
                      fontWeight: 600,
                      color: C.textLo,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      marginBottom: 12,
                      fontFamily: 'JetBrains Mono,monospace',
                    }}>
                      Aperçu — Variante {String.fromCharCode(65 + selectedVariant)}
                    </div>
                    <div style={{
                      fontSize: 11,
                      color: C.text,
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'Inter,sans-serif',
                    }}>
                      {currentStep.variants[selectedVariant]}
                    </div>

                    {/* Bouton pour installer cette variante */}
                    <div style={{ marginTop: 20, paddingTop: 20, borderTop: `1px solid ${C.lineSoft}` }}>
                      <button
                        onClick={() => {
                          // TODO: Implémenter la sauvegarde de la variante choisie
                          alert(`Variante ${String.fromCharCode(65 + selectedVariant)} sélectionnée!\n\nProchaine étape: sauvegarder dans sequence_template_steps.message_template`)
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
                        ✓ Utiliser cette variante
                      </button>
                      <div style={{ fontSize: 8, color: C.textLo, marginTop: 8, fontFamily: 'JetBrains Mono,monospace' }}>
                        Note: L'édition libre du message reste disponible dans Settings → Séquences
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Navigation transversale — Variantes */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 32, paddingTop: 20, borderTop: `1px solid ${C.gold}20` }}>
        <LinkButton href="/sequences" label="Séquences" color="gold" />
        <LinkButton href="/settings" label="Paramètres" color="indigo" />
        <LinkChip href="/crm" label="CRM" color="green" />
        <LinkChip href="/automatisations" label="Automatisations" color="cyan" />
      </div>
    </div>
  )
}
