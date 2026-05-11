'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import type { Achievement } from '@/types/achievements'

export function AchievementsProvider() {
  const checked = useRef(false)

  useEffect(() => {
    // Une seule vérification par session — useRef persiste entre re-renders
    if (checked.current) return
    checked.current = true

    fetch('/api/achievements/check', { method: 'POST' })
      .then(r => r.json())
      .then(({ data }) => {
        const newAchievements: Achievement[] = data?.newAchievements ?? []
        if (!newAchievements.length) return

        // Toast Sonner pour chaque badge débloqué (ACH-01, ACH-03)
        newAchievements.forEach((a) => {
          toast.success(`Badge debloque : ${a.label}`, {
            duration: 6000,
            description: a.achievement_type === 'ca_monthly'
              ? `CA : ${a.value?.toLocaleString('fr-FR')} € / objectif ${a.target?.toLocaleString('fr-FR')} €`
              : `${a.value} clients dans votre portefeuille`,
          })
        })

        // Délai court pour laisser celebrations.js s'initialiser (strategy lazyOnload)
        // ACH-02 : dispatch l'événement celebrate:all
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('celebrate:all', {
              detail: { text: 'OBJECTIF !' }
            }))
          }
        }, 800)
      })
      .catch(() => {
        // Silencieux — ne pas bloquer le dashboard si la table n'existe pas encore
      })
  }, [])

  return null
}
