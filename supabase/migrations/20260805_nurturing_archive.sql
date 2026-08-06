-- Migration: Add nurturing_archived column to prospects
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS nurturing_archived boolean DEFAULT false;

-- Index for filtering non-archived nurturing contacts
CREATE INDEX IF NOT EXISTS idx_prospects_nurturing_archived
  ON prospects(nurturing_archived)
  WHERE nurturing_category IS NOT NULL;
