'use client'

import { useState } from 'react'
import { C } from '@/lib/theme'

type ProspectFields = {
  full_name: string
  phone: string
  email: string
  profession: string
  city: string
  company: string
}

type Props = {
  prospectId: string
  initial: ProspectFields
  onSaved: (updated: ProspectFields) => void
  onCancel: () => void
}

export default function ProspectEditForm({ prospectId, initial, onSaved, onCancel }: Props) {
  const [form, setForm] = useState<ProspectFields>({ ...initial })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/prospects/${prospectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.full_name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          profession: form.profession.trim(),
          city: form.city.trim(),
          company: form.company.trim(),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Erreur lors de la sauvegarde')
        return
      }
      onSaved(form)
    } catch {
      setError('Connexion impossible')
    } finally {
      setSaving(false)
    }
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: 'JetBrains Mono,monospace',
    fontSize: 8,
    color: C.textLo,
    display: 'block',
    marginBottom: 4,
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '6px 8px',
    background: C.surface2,
    border: `1px solid ${C.gold}40`,
    borderRadius: 5,
    color: C.textHi,
    fontSize: 10,
    fontFamily: 'JetBrains Mono,monospace',
    boxSizing: 'border-box',
    outline: 'none',
  }

  const fields: { key: keyof ProspectFields; label: string; placeholder: string }[] = [
    { key: 'full_name', label: 'Nom complet', placeholder: 'Dr. Prénom Nom' },
    { key: 'phone', label: 'Téléphone', placeholder: '06 12 34 56 78' },
    { key: 'email', label: 'Email', placeholder: 'contact@cabinet.fr' },
    { key: 'profession', label: 'Profession', placeholder: 'Kinésithérapeute' },
    { key: 'company', label: 'Entreprise', placeholder: 'Cabinet XYZ' },
    { key: 'city', label: 'Ville', placeholder: 'Paris 15e' },
  ]

  return (
    <div style={{
      padding: '14px 20px',
      borderBottom: `1px solid ${C.line}`,
      background: `${C.surface2}80`,
    }}>
      <div style={{
        fontSize: 9,
        color: C.textLo,
        marginBottom: 10,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: 1,
      }}>
        Modifier la fiche
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        {fields.map(f => (
          <div key={f.key} style={f.key === 'full_name' ? { gridColumn: '1 / -1' } : undefined}>
            <label style={labelStyle}>{f.label}</label>
            <input
              value={form[f.key]}
              onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              style={inputStyle}
            />
          </div>
        ))}
      </div>

      {error && (
        <div style={{ fontSize: 9, color: C.warn, marginBottom: 8, fontFamily: 'JetBrains Mono,monospace' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            padding: '7px 0',
            borderRadius: 6,
            background: C.surface1,
            border: `1px solid ${C.line}`,
            color: C.textLo,
            fontSize: 10,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Annuler
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !form.full_name.trim()}
          style={{
            flex: 2,
            padding: '7px 0',
            borderRadius: 6,
            background: `${C.gold}15`,
            border: `1px solid ${C.gold}66`,
            color: C.gold,
            fontSize: 10,
            fontWeight: 700,
            cursor: saving || !form.full_name.trim() ? 'not-allowed' : 'pointer',
            opacity: saving || !form.full_name.trim() ? 0.6 : 1,
          }}
        >
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>
    </div>
  )
}
