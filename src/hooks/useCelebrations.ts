'use client'
import { useEffect, useCallback } from 'react'

export type GoalType =
  | 'appel_passe' | 'rdv_pris' | 'objectif_blocs' | 'objectif_journee'
  | 'r1' | 'r2' | 'r3' | 'signature' | 'session_terminee' | 'streak'
  | 'journee_parfaite' | 'objectif_mensuel'

export type GoalLevel = 'small' | 'medium' | 'big' | 'epic'

export function useCelebrations() {
  useEffect(() => {
    import('@/lib/celebrations').catch(() => {})
  }, [])

  const celebrate = useCallback((
    type: GoalType,
    text?: string,
    extra?: Record<string, unknown>,
  ) => {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new CustomEvent('celebrate:goal', { detail: { type, text, ...extra } }))
  }, [])

  return { celebrate }
}
