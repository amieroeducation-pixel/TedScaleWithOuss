import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ted Scale With Ouss — CGP Dashboard',
  description: 'Dashboard de gestion patrimoniale pour Conseiller en Gestion de Patrimoine indépendant',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body style={{ background: '#0a0a0a', minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  )
}
