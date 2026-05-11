export type AchievementType = 'ca_monthly' | 'clients_milestone'

export interface Achievement {
  id: string
  user_id: string
  achievement_key: string
  achievement_type: AchievementType
  label: string
  value: number | null
  target: number | null
  achieved_at: string
  created_at: string
}

export const CLIENT_MILESTONES = [10, 25, 50] as const

export const MONTH_LABELS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
] as const
