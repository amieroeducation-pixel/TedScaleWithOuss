-- Migration 20260720 : Backend nurturing complet
-- prospect_themes pivot + nurturing_sequence_instance_id + RLS

-- 1. Table pivot prospect ↔ themes
CREATE TABLE IF NOT EXISTS prospect_themes (
  prospect_id uuid REFERENCES prospects(id) ON DELETE CASCADE,
  theme_id uuid REFERENCES nurturing_themes(id) ON DELETE CASCADE,
  PRIMARY KEY (prospect_id, theme_id)
);

ALTER TABLE prospect_themes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users manage own prospect_themes" ON prospect_themes
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM prospects WHERE prospects.id = prospect_themes.prospect_id AND prospects.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Colonne FK vers sequence_instances sur prospects
DO $$ BEGIN
  ALTER TABLE prospects ADD COLUMN IF NOT EXISTS nurturing_sequence_instance_id uuid REFERENCES sequence_instances(id) ON DELETE SET NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

-- 3. Index pour performance cron temperature
CREATE INDEX IF NOT EXISTS idx_interactions_prospect_occurred
  ON interactions(prospect_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_prospect_themes_prospect
  ON prospect_themes(prospect_id);

CREATE INDEX IF NOT EXISTS idx_prospect_themes_theme
  ON prospect_themes(theme_id);
