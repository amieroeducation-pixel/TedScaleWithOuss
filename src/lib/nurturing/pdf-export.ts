import jsPDF from 'jspdf'

interface KPIData {
  taux_conversion: number
  temps_moyen_reponse: number
  score_global: number
  contacts_actifs: number
  relances_semaine: number
  taux_reponse: number
}

interface TopContact {
  name: string
  temperature: string
  touchpoints: number
  responses: number
}

interface ChannelStat {
  channel: string
  total: number
  replied: number
  rate: number
}

export async function generateNurturingPDF(
  kpis: KPIData | null,
  dateRange: { start: string | null; end: string | null },
  topContacts: TopContact[],
  channelStats: ChannelStat[]
) {
  const doc = new jsPDF()

  // Configuration
  const primaryColor: [number, number, number] = [232, 200, 120] // Gold
  const textColor: [number, number, number] = [220, 220, 220]
  const bgDark: [number, number, number] = [10, 14, 34]

  let yPos = 20

  // Header
  doc.setFillColor(...bgDark)
  doc.rect(0, 0, 210, 40, 'F')

  doc.setTextColor(...primaryColor)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('Dashboard Nurturing', 20, 20)

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text('Rapport Analytics', 20, 28)

  // Date de génération
  doc.setFontSize(9)
  doc.setTextColor(180, 180, 180)
  const today = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
  doc.text(`Généré le ${today}`, 20, 35)

  // Période filtrée
  if (dateRange.start || dateRange.end) {
    const startStr = dateRange.start
      ? new Date(dateRange.start).toLocaleDateString('fr-FR')
      : 'début'
    const endStr = dateRange.end
      ? new Date(dateRange.end).toLocaleDateString('fr-FR')
      : 'aujourd\'hui'
    doc.text(`Période : ${startStr} → ${endStr}`, 120, 35)
  }

  yPos = 50

  // Section KPIs
  doc.setFontSize(16)
  doc.setTextColor(...primaryColor)
  doc.setFont('helvetica', 'bold')
  doc.text('Indicateurs Clés de Performance', 20, yPos)
  yPos += 10

  if (kpis) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...textColor)

    const kpiItems = [
      { label: 'Taux de conversion', value: `${kpis.taux_conversion.toFixed(1)}%`, color: [76, 175, 80] as [number, number, number] },
      { label: 'Temps moyen de réponse', value: `${kpis.temps_moyen_reponse.toFixed(1)} jours`, color: [78, 205, 196] as [number, number, number] },
      { label: 'Score global pression', value: `${kpis.score_global.toFixed(1)}/10`, color: [255, 152, 0] as [number, number, number] },
      { label: 'Contacts actifs', value: `${kpis.contacts_actifs}`, color: [103, 168, 58] as [number, number, number] },
      { label: 'Relances cette semaine', value: `${kpis.relances_semaine}`, color: [232, 200, 120] as [number, number, number] },
      { label: 'Taux de réponse global', value: `${kpis.taux_reponse.toFixed(1)}%`, color: [106, 163, 217] as [number, number, number] },
    ]

    kpiItems.forEach((kpi, i) => {
      const xPos = 20 + (i % 2) * 90
      const yOffset = Math.floor(i / 2) * 20

      // Box
      doc.setFillColor(20, 24, 44)
      doc.roundedRect(xPos, yPos + yOffset, 80, 15, 2, 2, 'F')

      // Label
      doc.setTextColor(180, 180, 180)
      doc.setFontSize(8)
      doc.text(kpi.label, xPos + 3, yPos + yOffset + 5)

      // Value
      doc.setTextColor(...kpi.color)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text(kpi.value, xPos + 3, yPos + yOffset + 12)
      doc.setFont('helvetica', 'normal')
    })

    yPos += 65
  } else {
    doc.setTextColor(180, 180, 180)
    doc.text('Aucune donnée KPI disponible', 20, yPos)
    yPos += 20
  }

  // Section Top Contacts
  doc.setFontSize(16)
  doc.setTextColor(...primaryColor)
  doc.setFont('helvetica', 'bold')
  doc.text('Top 5 Contacts les Plus Actifs', 20, yPos)
  yPos += 10

  if (topContacts.length > 0) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')

    // Header tableau
    doc.setFillColor(20, 24, 44)
    doc.rect(20, yPos, 170, 8, 'F')
    doc.setTextColor(...primaryColor)
    doc.text('Nom', 23, yPos + 5)
    doc.text('Température', 80, yPos + 5)
    doc.text('Touchpoints', 120, yPos + 5)
    doc.text('Réponses', 155, yPos + 5)
    yPos += 8

    // Rows
    doc.setTextColor(...textColor)
    topContacts.slice(0, 5).forEach((contact, i) => {
      const bgColor = i % 2 === 0 ? [15, 19, 34] : [10, 14, 29]
      doc.setFillColor(...(bgColor as [number, number, number]))
      doc.rect(20, yPos, 170, 7, 'F')

      doc.text(contact.name.slice(0, 25), 23, yPos + 5)

      // Température avec emoji
      const tempEmoji = contact.temperature === 'hot' ? '🔥' :
                        contact.temperature === 'warm' ? '⚡' :
                        contact.temperature === 'cold' ? '❄️' : '💀'
      doc.text(`${tempEmoji} ${contact.temperature}`, 80, yPos + 5)

      doc.text(`${contact.touchpoints}`, 125, yPos + 5)
      doc.text(`${contact.responses}`, 160, yPos + 5)
      yPos += 7
    })
    yPos += 5
  } else {
    doc.setTextColor(180, 180, 180)
    doc.text('Aucun contact actif', 20, yPos)
    yPos += 15
  }

  // Section Performance Canaux
  if (yPos > 250) {
    doc.addPage()
    yPos = 20
  }

  doc.setFontSize(16)
  doc.setTextColor(...primaryColor)
  doc.setFont('helvetica', 'bold')
  doc.text('Performance par Canal', 20, yPos)
  yPos += 10

  if (channelStats.length > 0) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')

    // Header
    doc.setFillColor(20, 24, 44)
    doc.rect(20, yPos, 170, 8, 'F')
    doc.setTextColor(...primaryColor)
    doc.text('Canal', 23, yPos + 5)
    doc.text('Total interactions', 80, yPos + 5)
    doc.text('Réponses', 130, yPos + 5)
    doc.text('Taux', 165, yPos + 5)
    yPos += 8

    // Rows
    doc.setTextColor(...textColor)
    channelStats.forEach((stat, i) => {
      const bgColor = i % 2 === 0 ? [15, 19, 34] : [10, 14, 29]
      doc.setFillColor(...(bgColor as [number, number, number]))
      doc.rect(20, yPos, 170, 7, 'F')

      const channelLabel = stat.channel === 'appel' ? '📞 Appel' :
                           stat.channel === 'email' ? '✉️ Email' :
                           stat.channel === 'whatsapp' ? '💬 WhatsApp' :
                           stat.channel === 'linkedin' ? '🔗 LinkedIn' :
                           stat.channel === 'sms' ? '📱 SMS' : stat.channel

      doc.text(channelLabel, 23, yPos + 5)
      doc.text(`${stat.total}`, 95, yPos + 5)
      doc.text(`${stat.replied}`, 140, yPos + 5)

      // Taux coloré selon performance
      const rateColor: [number, number, number] = stat.rate >= 50 ? [76, 175, 80] :
                       stat.rate >= 30 ? [255, 152, 0] : [255, 100, 112]
      doc.setTextColor(...rateColor)
      doc.text(`${stat.rate.toFixed(1)}%`, 168, yPos + 5)
      doc.setTextColor(...textColor)

      yPos += 7
    })
    yPos += 10
  } else {
    doc.setTextColor(180, 180, 180)
    doc.text('Aucune donnée canal disponible', 20, yPos)
    yPos += 15
  }

  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFillColor(...bgDark)
    doc.rect(0, 280, 210, 17, 'F')
    doc.setTextColor(180, 180, 180)
    doc.setFontSize(8)
    doc.text('© Ted - CGP Indépendant IDF', 20, 290)
    doc.text(`Page ${i} / ${pageCount}`, 180, 290)
  }

  // Télécharger
  const filename = `rapport-nurturing-${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(filename)
}
