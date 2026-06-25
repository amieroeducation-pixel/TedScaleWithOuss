const LAST_SECTION_KEY = 'last_active_section'

const VALID_SECTIONS = ['/today', '/dashboard', '/crm', '/global']

export function saveLastSection(path: string): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(LAST_SECTION_KEY, path) } catch { /* ignore */ }
}

export function getLastSection(): string {
  if (typeof window === 'undefined') return '/today'
  try {
    const stored = localStorage.getItem(LAST_SECTION_KEY)
    if (stored && VALID_SECTIONS.includes(stored)) return stored
  } catch { /* ignore */ }
  return '/today'
}
