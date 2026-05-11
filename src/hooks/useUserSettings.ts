'use client'
import { useEffect, useState, useCallback } from 'react'

export type UserSettings = {
  ca_monthly_target: number
  ca_annual_target: number
  client_health_threshold_days: number
  closing_target_pct: number
  calls_per_day_target: number
  rdv_per_week_target: number
  blocks_per_day_target: number
  message_templates: Record<string, Record<string, string>>
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
