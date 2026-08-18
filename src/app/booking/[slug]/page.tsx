'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export const dynamic = 'force-dynamic'

const C = {
  bgDeep: '#0a0e22',
  bgMid: '#14193d',
  surface1: '#11163a',
  surface2: '#1a2150',
  surface3: '#252e68',
  line: '#3a4690',
  lineSoft: '#1a2150',
  textHi: '#ffffff',
  text: '#d8e1ff',
  textMid: '#8ea0d9',
  textLo: '#5a6ba8',
  textVlo: '#3a4885',
  cyan: '#ff6470',
  indigo: '#7a92e8',
  gold: '#e8c878',
  green: '#4ade80',
  ribbon: 'linear-gradient(90deg,#c84048 0%,#ff6470 25%,#f5e8c8 55%,#7a92e8 80%,#5c70b8 100%)',
}

type Slot = {
  start: string
  end: string
  available: boolean
}

type FormData = {
  contact_name: string
  contact_email: string
  contact_phone: string
  message: string
}

type FormErrors = Partial<Record<keyof FormData, string>>

export default function BookingPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    message: '',
  })
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  // Initialiser avec la date d'aujourd'hui
  useEffect(() => {
    const today = new Date()
    const dateStr = today.toISOString().split('T')[0]
    setSelectedDate(dateStr)
  }, [])

  // Charger les créneaux disponibles quand la date change
  useEffect(() => {
    if (!selectedDate) return

    setLoadingSlots(true)
    setSelectedSlot(null)

    fetch(`/api/booking/slots?slug=${slug}&date=${selectedDate}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data.slots) {
          setSlots(data.data.slots)
        } else {
          setSlots([])
        }
      })
      .catch(() => {
        setSlots([])
      })
      .finally(() => {
        setLoadingSlots(false)
      })
  }, [selectedDate, slug])

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Effacer l'erreur du champ modifié
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const validateForm = (): boolean => {
    const errors: FormErrors = {}

    if (!formData.contact_name.trim() || formData.contact_name.trim().length < 2) {
      errors.contact_name = 'Nom requis (minimum 2 caractères)'
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!formData.contact_email.trim() || !emailRegex.test(formData.contact_email)) {
      errors.contact_email = 'Email valide requis'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedSlot) {
      alert('Veuillez sélectionner un créneau')
      return
    }

    if (!validateForm()) {
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          contact_name: formData.contact_name,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone || undefined,
          message: formData.message || undefined,
          scheduled_at: selectedSlot.start,
          duration_minutes: 30,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setSuccess(true)
        // Scroll to top pour afficher le message de succès
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        alert(data.error || 'Erreur lors de la réservation')
      }
    } catch {
      alert('Erreur réseau, veuillez réessayer')
    } finally {
      setSubmitting(false)
    }
  }

  // Générer les dates des 30 prochains jours
  const generateAvailableDates = () => {
    const dates: string[] = []
    const today = new Date()

    for (let i = 0; i < 30; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      dates.push(date.toISOString().split('T')[0])
    }

    return dates
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00')
    return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  const formatTime = (isoStr: string) => {
    const date = new Date(isoStr)
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })
  }

  const availableDates = generateAvailableDates()

  if (success) {
    return (
      <>
        <style>{'@import url(\'https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap\')'}</style>
        <div
          style={{
            minHeight: '100vh',
            background: `linear-gradient(180deg,${C.bgDeep},${C.bgMid})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Inter,sans-serif',
            padding: '40px 20px',
          }}
        >
          <div
            style={{
              maxWidth: 600,
              background: C.surface1,
              borderRadius: 12,
              padding: 40,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                background: C.green,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                fontSize: 32,
              }}
            >
              ✓
            </div>
            <h1
              style={{
                fontFamily: 'Oswald,sans-serif',
                fontSize: 32,
                fontWeight: 700,
                color: C.textHi,
                marginBottom: 16,
              }}
            >
              Rendez-vous confirmé !
            </h1>
            <p style={{ fontSize: 16, color: C.text, marginBottom: 24, lineHeight: 1.6 }}>
              Votre rendez-vous a été enregistré avec succès.
              <br />
              Vous recevrez un email de confirmation à <strong>{formData.contact_email}</strong>.
            </p>
            <div
              style={{
                background: C.surface2,
                padding: 20,
                borderRadius: 8,
                marginBottom: 24,
              }}
            >
              <p style={{ fontSize: 14, color: C.textMid, marginBottom: 8 }}>Date et heure</p>
              <p style={{ fontSize: 18, fontWeight: 600, color: C.gold, margin: 0 }}>
                {formatDate(selectedDate)} à {selectedSlot && formatTime(selectedSlot.start)}
              </p>
            </div>
            <p style={{ fontSize: 14, color: C.textLo, marginBottom: 24 }}>
              Un lien de visioconférence vous sera envoyé 24h avant le rendez-vous.
            </p>
            <button
              onClick={() => router.push('/')}
              style={{
                background: C.indigo,
                color: C.textHi,
                border: 'none',
                borderRadius: 8,
                padding: '12px 32px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Retour à l&apos;accueil
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <style>{'@import url(\'https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap\')'}</style>
      <div
        style={{
          minHeight: '100vh',
          background: `linear-gradient(180deg,${C.bgDeep},${C.bgMid})`,
          fontFamily: 'Inter,sans-serif',
          padding: '40px 20px',
        }}
      >
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div
              style={{
                width: 4,
                height: 32,
                background: C.ribbon,
                borderRadius: 2,
                margin: '0 auto 16px',
              }}
            />
            <h1
              style={{
                fontFamily: 'Oswald,sans-serif',
                fontSize: 36,
                fontWeight: 700,
                color: C.textHi,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: 12,
              }}
            >
              Prenez rendez-vous
            </h1>
            <p style={{ fontSize: 16, color: C.textMid }}>
              Choisissez un créneau disponible et remplissez vos coordonnées
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 24,
            }}
          >
            {/* Sélection de la date */}
            <div
              style={{
                background: C.surface1,
                borderRadius: 12,
                padding: 24,
              }}
            >
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: C.gold,
                  marginBottom: 16,
                  fontFamily: 'Oswald,sans-serif',
                  letterSpacing: '0.05em',
                }}
              >
                1. Choisissez une date
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {availableDates.map((date) => (
                  <button
                    key={date}
                    onClick={() => setSelectedDate(date)}
                    style={{
                      background: selectedDate === date ? C.indigo : C.surface2,
                      color: selectedDate === date ? C.textHi : C.text,
                      border: selectedDate === date ? `2px solid ${C.gold}` : `1px solid ${C.line}`,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      fontWeight: selectedDate === date ? 600 : 400,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                    }}
                  >
                    {formatDate(date)}
                  </button>
                ))}
              </div>
            </div>

            {/* Sélection du créneau */}
            <div
              style={{
                background: C.surface1,
                borderRadius: 12,
                padding: 24,
              }}
            >
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: C.gold,
                  marginBottom: 16,
                  fontFamily: 'Oswald,sans-serif',
                  letterSpacing: '0.05em',
                }}
              >
                2. Choisissez un créneau
              </h2>
              {loadingSlots ? (
                <p style={{ color: C.textMid, fontSize: 14 }}>Chargement des créneaux...</p>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                    gap: 8,
                  }}
                >
                  {slots.filter((s) => s.available).length === 0 ? (
                    <p style={{ color: C.textMid, fontSize: 14, gridColumn: '1 / -1' }}>
                      Aucun créneau disponible pour cette date
                    </p>
                  ) : (
                    slots
                      .filter((s) => s.available)
                      .map((slot, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedSlot(slot)}
                          style={{
                            background:
                              selectedSlot?.start === slot.start ? C.green : C.surface2,
                            color:
                              selectedSlot?.start === slot.start ? C.bgDeep : C.text,
                            border:
                              selectedSlot?.start === slot.start
                                ? `2px solid ${C.gold}`
                                : `1px solid ${C.line}`,
                            borderRadius: 8,
                            padding: '10px 8px',
                            fontSize: 13,
                            fontWeight: selectedSlot?.start === slot.start ? 600 : 400,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                        >
                          {formatTime(slot.start)}
                        </button>
                      ))
                  )}
                </div>
              )}
            </div>

            {/* Formulaire */}
            <div
              style={{
                background: C.surface1,
                borderRadius: 12,
                padding: 24,
              }}
            >
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: C.gold,
                  marginBottom: 16,
                  fontFamily: 'Oswald,sans-serif',
                  letterSpacing: '0.05em',
                }}
              >
                3. Vos coordonnées
              </h2>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label
                    htmlFor="contact_name"
                    style={{ display: 'block', fontSize: 14, color: C.textMid, marginBottom: 6 }}
                  >
                    Nom complet *
                  </label>
                  <input
                    id="contact_name"
                    type="text"
                    value={formData.contact_name}
                    onChange={(e) => handleInputChange('contact_name', e.target.value)}
                    style={{
                      width: '100%',
                      background: C.surface2,
                      border: formErrors.contact_name ? `1px solid ${C.cyan}` : `1px solid ${C.line}`,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      color: C.textHi,
                      outline: 'none',
                    }}
                    placeholder="Jean Dupont"
                  />
                  {formErrors.contact_name && (
                    <p style={{ fontSize: 12, color: C.cyan, marginTop: 4 }}>
                      {formErrors.contact_name}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="contact_email"
                    style={{ display: 'block', fontSize: 14, color: C.textMid, marginBottom: 6 }}
                  >
                    Email *
                  </label>
                  <input
                    id="contact_email"
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => handleInputChange('contact_email', e.target.value)}
                    style={{
                      width: '100%',
                      background: C.surface2,
                      border: formErrors.contact_email ? `1px solid ${C.cyan}` : `1px solid ${C.line}`,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      color: C.textHi,
                      outline: 'none',
                    }}
                    placeholder="jean.dupont@email.com"
                  />
                  {formErrors.contact_email && (
                    <p style={{ fontSize: 12, color: C.cyan, marginTop: 4 }}>
                      {formErrors.contact_email}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="contact_phone"
                    style={{ display: 'block', fontSize: 14, color: C.textMid, marginBottom: 6 }}
                  >
                    Téléphone (optionnel)
                  </label>
                  <input
                    id="contact_phone"
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                    style={{
                      width: '100%',
                      background: C.surface2,
                      border: `1px solid ${C.line}`,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      color: C.textHi,
                      outline: 'none',
                    }}
                    placeholder="+33 6 12 34 56 78"
                  />
                </div>

                <div>
                  <label
                    htmlFor="message"
                    style={{ display: 'block', fontSize: 14, color: C.textMid, marginBottom: 6 }}
                  >
                    Message (optionnel)
                  </label>
                  <textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    rows={4}
                    style={{
                      width: '100%',
                      background: C.surface2,
                      border: `1px solid ${C.line}`,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      color: C.textHi,
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                    }}
                    placeholder="Sujet du rendez-vous, questions..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={!selectedSlot || submitting}
                  style={{
                    background: !selectedSlot || submitting ? C.surface3 : C.green,
                    color: !selectedSlot || submitting ? C.textLo : C.bgDeep,
                    border: 'none',
                    borderRadius: 8,
                    padding: '14px 24px',
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: !selectedSlot || submitting ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    marginTop: 8,
                  }}
                >
                  {submitting ? 'Confirmation en cours...' : 'Confirmer le rendez-vous'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
