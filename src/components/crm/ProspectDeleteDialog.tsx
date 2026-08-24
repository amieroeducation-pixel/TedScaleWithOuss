'use client'

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { toast } from 'sonner'
import { C } from '@/lib/theme'

interface ProspectDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prospect: {
    id: string
    full_name: string
  }
  interactionCount: number
  onDeleteSuccess: () => void
}

export default function ProspectDeleteDialog({
  open,
  onOpenChange,
  prospect,
  interactionCount,
  onDeleteSuccess,
}: ProspectDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    setIsDeleting(true)

    try {
      const res = await fetch(`/api/prospects/${prospect.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur lors de la suppression')
      }

      toast.success('Prospect supprimé')
      onOpenChange(false)
      onDeleteSuccess()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? `Impossible de supprimer : ${error.message}`
          : 'Erreur inconnue'
      )
      setIsDeleting(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(10, 14, 34, 0.85)',
            backdropFilter: 'blur(4px)',
            zIndex: 50,
          }}
        />
        <Dialog.Content
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 460,
            background: C.surface1,
            border: `1px solid ${C.line}`,
            borderRadius: 12,
            padding: 20,
            zIndex: 51,
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <span style={{ fontSize: 24, marginRight: 8 }}>🗑️</span>
            <Dialog.Title
              style={{
                fontSize: 14,
                fontFamily: 'Oswald',
                fontWeight: 600,
                color: C.textHi,
                margin: 0,
              }}
            >
              Supprimer ce prospect ?
            </Dialog.Title>
          </div>

          {/* Body */}
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: 13,
                color: C.gold,
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              {prospect.full_name}
            </div>
            <div
              style={{
                fontSize: 10,
                color: C.textMid,
                marginBottom: 6,
              }}
            >
              Cette action est irréversible. Toutes les interactions associées seront
              également supprimées.
            </div>
            {interactionCount > 0 && (
              <div
                style={{
                  fontSize: 9,
                  color: C.warn,
                }}
              >
                {interactionCount} interaction{interactionCount > 1 ? 's' : ''} sera
                {interactionCount > 1 ? 'ont' : ''} supprimée
                {interactionCount > 1 ? 's' : ''}
              </div>
            )}
          </div>

          {/* Actions */}
          <div
            style={{
              display: 'flex',
              gap: 10,
              justifyContent: 'flex-end',
            }}
          >
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isDeleting}
              style={{
                background: C.surface2,
                color: C.textMid,
                border: `1px solid ${C.line}`,
                padding: '8px 16px',
                borderRadius: 6,
                fontSize: 10,
                cursor: isDeleting ? 'not-allowed' : 'pointer',
                opacity: isDeleting ? 0.5 : 1,
              }}
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              style={{
                background: C.magenta,
                color: C.textHi,
                border: `1px solid ${C.cyan}`,
                padding: '8px 16px',
                borderRadius: 6,
                fontSize: 10,
                fontWeight: 700,
                cursor: isDeleting ? 'not-allowed' : 'pointer',
                opacity: isDeleting ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {isDeleting && <span>⏳</span>}
              Supprimer définitivement
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
