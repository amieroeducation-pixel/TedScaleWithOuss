'use client'

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { toast } from 'sonner'
import { C } from '@/lib/theme'

interface AddInteractionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prospectId: string
  prospectName: string
  onSuccess: () => void
}

type QuickType = 'note' | 'call' | 'meeting'

interface FormData {
  type: string
  occurred_at: string
  duration_min: string
  notes: string
}

export default function AddInteractionModal({
  open,
  onOpenChange,
  prospectId,
  prospectName,
  onSuccess,
}: AddInteractionModalProps) {
  const [quickType, setQuickType] = useState<QuickType | null>(null)
  const [showAllTypes, setShowAllTypes] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    type: '',
    occurred_at: new Date().toISOString().slice(0, 16),
    duration_min: '',
    notes: '',
  })

  // Quick type to API type mapping
  const quickTypeToApi: Record<QuickType, string> = {
    note: 'autre',
    call: 'appel',
    meeting: 'rdv1',
  }

  const allTypes = [
    { value: 'appel', label: '📞 Appel' },
    { value: 'rdv1', label: '📅 RDV Découverte' },
    { value: 'rdv2', label: '📅 RDV Conseil' },
    { value: 'rdv3', label: '📅 RDV Signature' },
    { value: 'email', label: '✉️ Email' },
    { value: 'sms', label: '💬 SMS' },
    { value: 'whatsapp', label: '💬 WhatsApp' },
    { value: 'linkedin', label: '💼 LinkedIn' },
    { value: 'interpro', label: '🤝 Interpro' },
    { value: 'autre', label: '📝 Autre' },
  ]

  function handleQuickTypeClick(type: QuickType) {
    setQuickType(type)
    setFormData((prev) => ({ ...prev, type: quickTypeToApi[type] }))
  }

  function handleAllTypeSelect(value: string) {
    setFormData((prev) => ({ ...prev, type: value }))
    setQuickType(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.type) {
      toast.error('Veuillez sélectionner un type d\'interaction')
      return
    }

    setIsSaving(true)

    try {
      const payload: any = {
        prospect_id: prospectId,
        type: formData.type,
        occurred_at: new Date(formData.occurred_at).toISOString(),
        notes: formData.notes || undefined,
      }

      if (formData.duration_min) {
        payload.duration_min = parseInt(formData.duration_min, 10)
      }

      const res = await fetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur lors de l\'enregistrement')
      }

      toast.success('Interaction enregistrée')
      onOpenChange(false)
      onSuccess()

      // Reset form
      setQuickType(null)
      setShowAllTypes(false)
      setFormData({
        type: '',
        occurred_at: new Date().toISOString().slice(0, 16),
        duration_min: '',
        notes: '',
      })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Erreur inconnue'
      )
    } finally {
      setIsSaving(false)
    }
  }

  const showDurationField = formData.type === 'appel' || formData.type.startsWith('rdv')

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(10, 14, 34, 0.85)',
            backdropFilter: 'blur(4px)',
            zIndex: 50,
          }}
        />
        <Dialog.Content
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 520,
            background: C.surface1,
            border: `1px solid ${C.line}`,
            borderRadius: 12,
            padding: 20,
            zIndex: 51,
            maxHeight: '90vh',
            overflowY: 'auto',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: 24, marginRight: 8 }}>➕</span>
              <Dialog.Title
                style={{
                  fontSize: 14,
                  fontFamily: 'Oswald',
                  fontWeight: 600,
                  color: C.textHi,
                  margin: 0,
                }}
              >
                Ajouter une interaction
              </Dialog.Title>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: 16,
                color: C.textLo,
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>

          {/* Prospect name */}
          <div
            style={{
              fontSize: 11,
              color: C.gold,
              marginBottom: 16,
              fontWeight: 600,
            }}
          >
            {prospectName}
          </div>

          <form onSubmit={handleSubmit}>
            {/* Quick type buttons */}
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  fontSize: 8,
                  fontFamily: 'JetBrains Mono',
                  color: C.textLo,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  display: 'block',
                  marginBottom: 8,
                }}
              >
                Type d'interaction *
              </label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <button
                  type="button"
                  onClick={() => handleQuickTypeClick('note')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    fontSize: 10,
                    fontWeight: 600,
                    background: quickType === 'note' ? C.cyan : C.surface2,
                    color: quickType === 'note' ? C.bgDeep : C.textMid,
                    border: `1px solid ${quickType === 'note' ? C.cyan : C.line}`,
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  📝 Note
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickTypeClick('call')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    fontSize: 10,
                    fontWeight: 600,
                    background: quickType === 'call' ? C.cyan : C.surface2,
                    color: quickType === 'call' ? C.bgDeep : C.textMid,
                    border: `1px solid ${quickType === 'call' ? C.cyan : C.line}`,
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  📞 Appel
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickTypeClick('meeting')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    fontSize: 10,
                    fontWeight: 600,
                    background: quickType === 'meeting' ? C.cyan : C.surface2,
                    color: quickType === 'meeting' ? C.bgDeep : C.textMid,
                    border: `1px solid ${quickType === 'meeting' ? C.cyan : C.line}`,
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  📅 Rendez-vous
                </button>
              </div>

              {/* Toggle all types */}
              <button
                type="button"
                onClick={() => setShowAllTypes(!showAllTypes)}
                style={{
                  fontSize: 9,
                  color: C.cyan,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                {showAllTypes ? 'Masquer' : 'Autres types...'}
              </button>

              {/* All types dropdown */}
              {showAllTypes && (
                <select
                  value={formData.type}
                  onChange={(e) => handleAllTypeSelect(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: 10,
                    background: C.surface2,
                    color: C.textHi,
                    border: `1px solid ${C.line}`,
                    borderRadius: 6,
                    marginTop: 8,
                  }}
                >
                  <option value="">Sélectionner un type</option>
                  {allTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Date/Time */}
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  fontSize: 8,
                  fontFamily: 'JetBrains Mono',
                  color: C.textLo,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  display: 'block',
                  marginBottom: 8,
                }}
              >
                Date et heure *
              </label>
              <input
                type="datetime-local"
                value={formData.occurred_at}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, occurred_at: e.target.value }))
                }
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: 10,
                  background: C.surface2,
                  color: C.textHi,
                  border: `1px solid ${C.line}`,
                  borderRadius: 6,
                }}
              />
            </div>

            {/* Duration (conditional) */}
            {showDurationField && (
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    fontSize: 8,
                    fontFamily: 'JetBrains Mono',
                    color: C.textLo,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    display: 'block',
                    marginBottom: 8,
                  }}
                >
                  Durée (minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.duration_min}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, duration_min: e.target.value }))
                  }
                  placeholder="Ex: 30"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: 10,
                    background: C.surface2,
                    color: C.textHi,
                    border: `1px solid ${C.line}`,
                    borderRadius: 6,
                  }}
                />
              </div>
            )}

            {/* Notes */}
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  fontSize: 8,
                  fontFamily: 'JetBrains Mono',
                  color: C.textLo,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  display: 'block',
                  marginBottom: 8,
                }}
              >
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows={4}
                placeholder="Détails de l'interaction..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: 10,
                  background: C.surface2,
                  color: C.textHi,
                  border: `1px solid ${C.line}`,
                  borderRadius: 6,
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Actions */}
            <div
              style={{
                display: 'flex',
                gap: 10,
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
                style={{
                  background: C.surface2,
                  color: C.textMid,
                  border: `1px solid ${C.line}`,
                  padding: '8px 16px',
                  borderRadius: 6,
                  fontSize: 10,
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  opacity: isSaving ? 0.5 : 1,
                }}
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSaving || !formData.type}
                style={{
                  background: C.green,
                  color: C.bgDeep,
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 6,
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: isSaving || !formData.type ? 'not-allowed' : 'pointer',
                  opacity: isSaving || !formData.type ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {isSaving && <span>⏳</span>}
                Enregistrer
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
