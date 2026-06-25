'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getLastSection } from '@/lib/navigation-state'

export default function DashboardRoot() {
  const router = useRouter()

  useEffect(() => {
    const lastSection = getLastSection()
    router.replace(lastSection)
  }, [router])

  return null
}
