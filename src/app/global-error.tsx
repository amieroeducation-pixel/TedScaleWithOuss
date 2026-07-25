'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body style={{ background: '#0a0e22', color: '#d8e1ff', fontFamily: 'system-ui', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: '#e8c878', marginBottom: 16 }}>Une erreur est survenue</h2>
          <button
            onClick={() => reset()}
            style={{ padding: '10px 24px', background: '#1a2150', color: '#e8c878', border: '1px solid #3a4690', borderRadius: 8, cursor: 'pointer' }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  )
}
