-- Migration 016: Add missing columns to daily_kpis and user_settings
-- Date: 2026-07-02

-- Add blocks column to daily_kpis
ALTER TABLE daily_kpis ADD COLUMN IF NOT EXISTS blocks integer NOT NULL DEFAULT 0;

-- Add Google Calendar token columns to user_settings
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS google_calendar_access_token text;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS google_calendar_refresh_token text;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS google_calendar_token_expiry bigint;
