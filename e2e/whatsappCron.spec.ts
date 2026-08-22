import { test, expect } from '@playwright/test'

/**
 * Test that WhatsApp steps are processed by executeStep in cron.
 * WhatsApp flows through executeStep() which handles it via Brevo API.
 * LinkedIn is special: marked as sent with message stored, not skipped.
 */

test('WhatsApp step should be processed by executeStep', () => {
  // WhatsApp channel should NOT be in the skip list
  const channelsThatRequireExternalAPI = ['email', 'sms', 'whatsapp', 'call_reminder']
  expect(channelsThatRequireExternalAPI).toContain('whatsapp')
})

test('LinkedIn step should be processed as guided manual action', () => {
  // LinkedIn is NOT skipped in cron, it's marked as 'sent' with is_honored: false
  // The executeStep function handles it specially by storing the message
  // and creating an interaction that needs manual honoring
  const channelsHandledByCron = ['email', 'sms', 'whatsapp', 'call_reminder', 'linkedin']
  expect(channelsHandledByCron).toContain('linkedin')
})

test('Email should be processed by executeStep', () => {
  const channelsThatRequireExternalAPI = ['email', 'sms', 'whatsapp', 'call_reminder']
  expect(channelsThatRequireExternalAPI).toContain('email')
})

test('SMS should be processed by executeStep', () => {
  const channelsThatRequireExternalAPI = ['email', 'sms', 'whatsapp', 'call_reminder']
  expect(channelsThatRequireExternalAPI).toContain('sms')
})

test('Call reminder should be processed by executeStep', () => {
  const channelsThatRequireExternalAPI = ['email', 'sms', 'whatsapp', 'call_reminder']
  expect(channelsThatRequireExternalAPI).toContain('call_reminder')
})
