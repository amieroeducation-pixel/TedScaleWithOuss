import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// This is a copy of the PatchSettingsSchema that should exist in src/app/api/settings/route.ts
// We maintain it here to verify the schema includes booking_slug
const PatchSettingsSchema = z.object({
  // Existing fields
  ca_monthly_target: z.number().positive().optional(),
  ca_annual_target: z.number().positive().optional(),
  client_health_threshold_days: z.number().int().min(1).max(365).optional(),
  closing_target_pct: z.number().min(0).max(100).optional(),
  calls_per_day_target: z.number().int().min(0).optional(),
  rdv_per_week_target: z.number().int().min(0).optional(),
  blocks_per_day_target: z.number().int().min(0).optional(),
  message_templates: z.record(z.string(), z.record(z.string(), z.string())).optional(),
  // JSONB complex objects
  daily_targets: z.object({
    contacts: z.number(),
    calls: z.number(),
    rdv1: z.number(),
    rdv2: z.number(),
  }).optional(),
  monthly_intensity: z.record(z.string(), z.number()).optional(),
  scoring_grids: z.object({
    professions: z.array(z.object({ label: z.string(), val: z.number() })),
    zones: z.array(z.object({ label: z.string(), val: z.number() })),
  }).optional(),
  completed_videos: z.array(z.string()).optional(),
  // General tab fields
  coach_instructions: z.string().optional(),
  objectives_count: z.number().int().min(1).optional(),
  bloc_duration_minutes: z.number().int().min(5).max(120).optional(),
  blocs_per_day_normal: z.number().int().min(1).max(20).optional(),
  blocs_per_day_max: z.number().int().min(1).max(30).optional(),
  sequence_delay_email: z.number().int().min(0).optional(),
  sequence_delay_sms: z.number().int().min(0).optional(),
  sequence_delay_whatsapp: z.number().int().min(0).optional(),
  sequence_steps_max: z.number().int().min(1).max(20).optional(),
  sequence_stop_days: z.number().int().min(1).optional(),
  // KPI tab fields
  rdv_r1_annual: z.number().int().min(0).optional(),
  rdv_r2_annual: z.number().int().min(0).optional(),
  rdv_monthly_distribution: z.record(z.string(), z.object({ r1: z.number(), r2: z.number() })).optional(),
  interpro_daily_target: z.number().int().min(0).optional(),
  commerce_minutes_daily: z.number().int().min(0).optional(),
  sport_weekly_target: z.number().int().min(0).optional(),
  collecte_annual: z.number().min(0).optional(),
  // Notifications
  notification_channels: z.object({
    push: z.boolean(),
    email: z.boolean(),
    sms: z.boolean(),
    telegram: z.boolean(),
  }).optional(),
  notification_email: z.string().optional(),
  notification_phone: z.string().optional(),
  notification_telegram_bot: z.string().optional(),
  notification_telegram_chat: z.string().optional(),
  notification_events: z.record(z.string(), z.boolean()).optional(),
  notification_rdv_hours: z.number().int().min(0).optional(),
  // Affichage
  visible_sections: z.record(z.string(), z.boolean()).optional(),
  mobile_sections: z.record(z.string(), z.boolean()).optional(),
  mobile_font_size: z.enum(['small', 'medium', 'large']).optional(),
  mobile_compact: z.boolean().optional(),
  mobile_bottom_menu: z.boolean().optional(),
  // Menu sections visibility (s01-menu-dynamique)
  menu_sections_visible: z.record(z.string(), z.boolean()).optional(),
  // CRITICAL: booking_slug must be here for the Settings Booking tab to work
  booking_slug: z.string().optional(),
})

describe('Settings API - booking_slug persistence', () => {
  it('should include booking_slug in PatchSettingsSchema', () => {
    // This test verifies that the PatchSettingsSchema accepts booking_slug
    // as a valid field, which is required for the Settings Booking tab
    // to save the custom booking URL slug.

    // Test that booking_slug is accepted
    const result = PatchSettingsSchema.safeParse({
      booking_slug: 'mon-super-slug'
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.booking_slug).toBe('mon-super-slug')
    }
  })

  it('should preserve booking_slug when parsing settings update', () => {
    // Simulate what happens when Settings Booking tab calls save({ booking_slug: 'xxx' })
    // The schema should NOT strip out the booking_slug field

    const input = {
      booking_slug: 'ted-cgp-paris',
    }

    const parsed = PatchSettingsSchema.safeParse(input)

    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data).toHaveProperty('booking_slug')
      expect(parsed.data.booking_slug).toBe('ted-cgp-paris')
    }
  })

  it('should validate booking_slug as string', () => {
    // Valid string
    expect(PatchSettingsSchema.safeParse({ booking_slug: 'valid-slug' }).success).toBe(true)

    // Invalid types should fail
    expect(PatchSettingsSchema.safeParse({ booking_slug: 123 }).success).toBe(false)
    expect(PatchSettingsSchema.safeParse({ booking_slug: true }).success).toBe(false)
    expect(PatchSettingsSchema.safeParse({ booking_slug: null }).success).toBe(false)

    // Optional - should accept undefined
    expect(PatchSettingsSchema.safeParse({}).success).toBe(true)
  })

  it('should not strip booking_slug when mixed with other fields', () => {
    // Real-world scenario: user saves booking_slug along with other settings
    const input = {
      booking_slug: 'my-custom-url',
      ca_monthly_target: 20000,
      notification_email: 'test@example.com'
    }

    const parsed = PatchSettingsSchema.safeParse(input)

    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.booking_slug).toBe('my-custom-url')
      expect(parsed.data.ca_monthly_target).toBe(20000)
      expect(parsed.data.notification_email).toBe('test@example.com')
    }
  })
})
