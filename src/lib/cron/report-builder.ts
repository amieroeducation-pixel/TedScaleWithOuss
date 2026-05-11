/**
 * Construction du HTML pour le rapport hebdomadaire CGP.
 * Inline CSS uniquement -- pas de classes Tailwind (email compatibility).
 * Couleurs dark/gold coherentes avec le projet.
 */
export function buildWeeklyReportHtml(data: {
  caWeek: number
  caMonth: number
  caObjective: number
  healthAlerts: Array<{ full_name: string; days_without_contact: number; severity: string }>
  relancesDues: number
  rdvSemaine: number
  weekLabel: string
}): string {
  const pct = data.caObjective > 0
    ? Math.round((data.caMonth / data.caObjective) * 100)
    : 0
  const pctColor = pct >= 100 ? '#4ade80' : pct >= 70 ? '#c9a84c' : '#ef4444'

  const alertsHtml = data.healthAlerts.length === 0
    ? '<p style="color:#4ade80;font-size:13px;margin:4px 0;">Aucune alerte -- Tout est OK</p>'
    : data.healthAlerts.slice(0, 10).map(a => `
        <div style="padding:8px 0;border-bottom:1px solid #1a1a1a;display:flex;gap:12px;align-items:center;">
          <span style="font-size:11px;font-weight:700;color:${a.severity === 'critical' ? '#ef4444' : '#f59e0b'};min-width:60px;">
            ${a.severity === 'critical' ? 'CRITIQUE' : 'ALERTE'}
          </span>
          <span style="color:#e5e5e5;font-size:12px;flex:1;">${a.full_name}</span>
          <span style="color:#999;font-size:11px;">${a.days_without_contact}j sans contact</span>
        </div>`).join('')

  return `<!DOCTYPE html>
<html lang="fr">
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#e5e5e5;padding:24px;">
  <h1 style="color:#c9a84c;font-size:22px;margin-bottom:4px;">Rapport Hebdomadaire -- Ted CGP</h1>
  <p style="color:#666;font-size:12px;margin-top:0;margin-bottom:20px;">${data.weekLabel}</p>

  <div style="background:#111;border:1px solid #222;border-radius:8px;padding:16px;margin-bottom:16px;">
    <h2 style="color:#c9a84c;font-size:14px;margin-top:0;margin-bottom:12px;">CA Mois en cours</h2>
    <p style="font-size:26px;font-weight:700;color:${pctColor};margin:0 0 8px;">
      ${data.caMonth.toLocaleString('fr-FR')} EUR
    </p>
    <p style="color:#999;font-size:12px;margin:0 0 4px;">
      Objectif : ${data.caObjective.toLocaleString('fr-FR')} EUR
      -- <strong style="color:${pctColor};">${pct}%</strong> atteint
    </p>
    <p style="color:#999;font-size:12px;margin:0;">
      CA cette semaine : <strong style="color:#e5e5e5;">${data.caWeek.toLocaleString('fr-FR')} EUR</strong>
    </p>
  </div>

  <div style="background:#111;border:1px solid #222;border-radius:8px;padding:16px;margin-bottom:16px;">
    <h2 style="color:#c9a84c;font-size:14px;margin-top:0;margin-bottom:12px;">Alertes Clients</h2>
    ${alertsHtml}
  </div>

  <div style="background:#111;border:1px solid #222;border-radius:8px;padding:16px;">
    <h2 style="color:#c9a84c;font-size:14px;margin-top:0;margin-bottom:8px;">Cette semaine</h2>
    <p style="color:#e5e5e5;font-size:13px;margin:4px 0;">
      ${data.relancesDues} relance(s) dues cette semaine
    </p>
    <p style="color:#e5e5e5;font-size:13px;margin:4px 0;">
      ${data.rdvSemaine} RDV planifie(s) cette semaine
    </p>
  </div>

  <p style="color:#333;font-size:10px;margin-top:24px;text-align:center;">
    Ted Scale With Ouss -- Rapport automatique chaque lundi 8h
  </p>
</body>
</html>`
}
