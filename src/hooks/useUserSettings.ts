'use client'
import { useEffect, useState, useCallback } from 'react'

export type UserSettings = {
  // Existing fields
  ca_monthly_target: number
  ca_annual_target: number
  client_health_threshold_days: number
  closing_target_pct: number
  calls_per_day_target: number
  rdv_per_week_target: number
  blocks_per_day_target: number
  message_templates: Record<string, Record<string, string>>
  // JSONB complex objects
  daily_targets?: { contacts: number; calls: number; rdv1: number; rdv2: number }
  monthly_intensity?: Record<string, number>
  scoring_grids?: { professions: Array<{label: string; val: number}>; zones: Array<{label: string; val: number}> }
  completed_videos?: string[]
  // General tab fields
  coach_instructions?: string
  objectives_count?: number
  bloc_duration_minutes?: number
  blocs_per_day_normal?: number
  blocs_per_day_max?: number
  sequence_delay_email?: number
  sequence_delay_sms?: number
  sequence_delay_whatsapp?: number
  sequence_steps_max?: number
  sequence_stop_days?: number
  // KPI tab fields
  rdv_r1_annual?: number
  rdv_r2_annual?: number
  rdv_monthly_distribution?: Record<string, { r1: number; r2: number }>
  interpro_daily_target?: number
  commerce_minutes_daily?: number
  sport_weekly_target?: number
  collecte_annual?: number
  // Notifications
  notification_channels?: { push: boolean; email: boolean; sms: boolean; telegram: boolean }
  notification_email?: string
  notification_phone?: string
  notification_telegram_bot?: string
  notification_telegram_chat?: string
  notification_events?: Record<string, boolean>
  notification_rdv_hours?: number
  // Affichage
  visible_sections?: Record<string, boolean>
  mobile_sections?: Record<string, boolean>
  mobile_font_size?: 'small' | 'medium' | 'large'
  mobile_compact?: boolean
  mobile_bottom_menu?: boolean
}

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(({ data }: { data: UserSettings }) => {
        setSettings(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const save = useCallback(async (partial: Partial<UserSettings>) => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partial),
      })
      const { data, error } = await res.json() as { data: UserSettings | null; error: string | null }
      if (error) throw new Error(error)
      setSettings(prev => prev ? { ...prev, ...data } : data)
      return data
    } finally {
      setSaving(false)
    }
  }, [])

  return { settings, loading, saving, save }
}
