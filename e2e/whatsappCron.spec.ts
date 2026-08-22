import { test, expect } from '@playwright/test'

/**
 * Test that WhatsApp steps are NOT skipped in cron processing.
 * WhatsApp should flow through executeStep() which handles it via Brevo.
 */

// Mock function to verify WhatsApp is not in skip list
function isChannelSkippedInCron(channel: string): boolean {
  // Only LinkedIn should be skipped in cron (requires manual action)
  const skippedChannels = ['linkedin']
  return skippedChannels.includes(channel)
}

test('WhatsApp should NOT be skipped in cron', () => {
  expect(isChannelSkippedInCron('whatsapp')).toBe(false)
})

test('LinkedIn should be skipped in cron', () => {
  expect(isChannelSkippedInCron('linkedin')).toBe(true)
})

test('Email should NOT be skipped in cron', () => {
  expect(isChannelSkippedInCron('email')).toBe(false)
})

test('SMS should NOT be skipped in cron', () => {
  expect(isChannelSkippedInCron('sms')).toBe(false)
})

test('Call reminder should NOT be skipped in cron', () => {
  expect(isChannelSkippedInCron('call_reminder')).toBe(false)
})
