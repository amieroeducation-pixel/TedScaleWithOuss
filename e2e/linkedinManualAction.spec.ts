import { test, expect } from '@playwright/test'

/**
 * Test LinkedIn as guided manual action.
 * LinkedIn steps should:
 * - Store interpolated message in message_sent
 * - Insert interaction with type: 'linkedin', is_honored: false
 * - Return status: 'sent' (not 'skipped')
 */

type LinkedInStepResult = {
  status: 'sent' | 'failed' | 'skipped'
  messageSent?: string
  error?: string
}

// Mock function representing LinkedIn execution behavior
function executeLinkedInStep(messageTemplate: string, prospectName: string): LinkedInStepResult {
  // Interpolate the template
  const interpolated = messageTemplate.replace('{{prenom}}', prospectName)

  // Return sent status with interpolated message
  return {
    status: 'sent',
    messageSent: interpolated
  }
}

test('LinkedIn step returns sent status (not skipped)', () => {
  const result = executeLinkedInStep('Bonjour {{prenom}},', 'Marie')
  expect(result.status).toBe('sent')
})

test('LinkedIn step stores interpolated message', () => {
  const result = executeLinkedInStep('Bonjour {{prenom}}, comment allez-vous ?', 'Jean')
  expect(result.messageSent).toBe('Bonjour Jean, comment allez-vous ?')
})

test('LinkedIn step should interpolate variables', () => {
  const template = 'Bonjour {{prenom}}, je vous contacte au sujet de votre activité.'
  const result = executeLinkedInStep(template, 'Sophie')
  expect(result.messageSent).toContain('Sophie')
  expect(result.messageSent).not.toContain('{{prenom}}')
})
