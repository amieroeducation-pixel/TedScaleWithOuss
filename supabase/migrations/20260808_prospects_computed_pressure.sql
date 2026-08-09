-- Add computed_pressure column to prospects table
-- This stores the pre-calculated pressure score (sum of PRESSURE_COEFS for interactions in the last 7 days)
-- Updated by the nurturing-temperature cron job

ALTER TABLE prospects ADD COLUMN IF NOT EXISTS computed_pressure numeric DEFAULT 0;
