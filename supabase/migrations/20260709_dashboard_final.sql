-- Migration 20260709: Dashboard finalisation — colonnes manquantes + tables
-- Date: 2026-07-09

-- Colonnes manquantes sur user_settings
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS scoring_grids jsonb DEFAULT '{}';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS daily_targets jsonb DEFAULT '{"contacts":10,"calls":20,"rdv1":5,"rdv2":3}';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS completed_videos text[] DEFAULT '{}';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS monthly_intensity jsonb DEFAULT '{}';

-- Flag "ne plus contacter" sur prospects
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS do_not_contact boolean NOT NULL DEFAULT false;

-- Lien calling_session_contacts → prospects
ALTER TABLE calling_session_contacts ADD COLUMN IF NOT EXISTS prospect_id uuid REFERENCES prospects(id);

-- Historique recherches
CREATE TABLE IF NOT EXISTS search_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  search_type text NOT NULL DEFAULT 'tns',
  metier text NOT NULL,
  ville text NOT NULL DEFAULT '',
  departement text NOT NULL DEFAULT '',
  results_count integer NOT NULL DEFAULT 0,
  searched_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id);
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own search_history" ON search_history FOR ALL USING (auth.uid() = user_id);

-- Cache insights IA
CREATE TABLE IF NOT EXISTS daily_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  content text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);
ALTER TABLE daily_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own daily_insights" ON daily_insights FOR ALL USING (auth.uid() = user_id);
