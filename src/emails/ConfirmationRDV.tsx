import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Button,
  Hr,
} from '@react-email/components'

interface ConfirmationRDVProps {
  prenom: string
  date: string
  heure: string
  lieu?: string
  calendarLink?: string
}

/**
 * Template email de confirmation de RDV
 * Envoyé après booking via page publique /booking/[slug]
 */
export function ConfirmationRDV({
  prenom,
  date,
  heure,
  lieu,
  calendarLink,
}: ConfirmationRDVProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f4f4f4', padding: '20px' }}>
        <Container style={{ backgroundColor: '#ffffff', padding: '30px', borderRadius: '8px', maxWidth: '600px' }}>
          <Text style={{ fontSize: '24px', fontWeight: 'bold', color: '#0a0e22', marginBottom: '20px' }}>
            Rendez-vous confirmé
          </Text>

          <Text style={{ fontSize: '16px', color: '#333', marginBottom: '10px' }}>
            Bonjour {prenom},
          </Text>

          <Text style={{ fontSize: '16px', color: '#333', marginBottom: '20px' }}>
            Votre rendez-vous avec Ted CGP est confirmé :
          </Text>

          <Container style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '4px', marginBottom: '20px' }}>
            <Text style={{ fontSize: '18px', fontWeight: 'bold', color: '#0a0e22', marginBottom: '10px' }}>
              📅 {date}
            </Text>
            <Text style={{ fontSize: '18px', fontWeight: 'bold', color: '#0a0e22', marginBottom: '10px' }}>
              🕐 {heure}
            </Text>
            {lieu && (
              <Text style={{ fontSize: '18px', fontWeight: 'bold', color: '#0a0e22' }}>
                📍 {lieu}
              </Text>
            )}
          </Container>

          {calendarLink && (
            <Button
              href={calendarLink}
              style={{
                backgroundColor: '#e8c878',
                color: '#0a0e22',
                padding: '12px 24px',
                borderRadius: '4px',
                textDecoration: 'none',
                fontSize: '16px',
                fontWeight: 'bold',
                display: 'inline-block',
                marginBottom: '20px',
              }}
            >
              Ajouter à mon calendrier
            </Button>
          )}

          <Hr style={{ borderColor: '#e0e0e0', marginTop: '30px', marginBottom: '30px' }} />

          <Text style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
            Vous recevrez un rappel par SMS 24h avant le rendez-vous.
          </Text>

          <Text style={{ fontSize: '14px', color: '#666' }}>
            En cas d'empêchement, merci de me contacter au plus tôt.
          </Text>

          <Text style={{ fontSize: '14px', color: '#999', marginTop: '30px' }}>
            Ted CGP — Conseiller en Gestion de Patrimoine
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default ConfirmationRDV
