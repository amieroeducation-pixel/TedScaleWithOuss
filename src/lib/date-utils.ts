const PARIS_FORMATTER = new Intl.DateTimeFormat('fr-CA', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function todayParis(): string {
  return PARIS_FORMATTER.format(new Date())
}
