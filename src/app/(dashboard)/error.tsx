'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#d8e1ff' }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ color: '#e8c878', marginBottom: 16 }}>Erreur de chargement</h2>
        <p style={{ color: '#8ea0d9', marginBottom: 16 }}>{error.message}</p>
        <button
          onClick={() => reset()}
          style={{ padding: '10px 24px', background: '#1a2150', color: '#e8c878', border: '1px solid #3a4690', borderRadius: 8, cursor: 'pointer' }}
        >
          Réessayer
        </button>
      </div>
    </div>
  )
}
