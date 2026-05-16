-- supabase/migrations/20260516_playbooks.sql

CREATE TABLE IF NOT EXISTS playbook_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  prospects_found INTEGER DEFAULT 0,
  prospects_validated INTEGER DEFAULT 0,
  error TEXT
);

CREATE TABLE IF NOT EXISTS playbook_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES playbook_runs(id) ON DELETE CASCADE,
  playbook_id TEXT NOT NULL,
  signal_type TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  company_name TEXT,
  siren TEXT,
  dirigeant_name TEXT,
  secteur TEXT,
  localisation TEXT,
  ca_estime BIGINT,
  signal_data JSONB,
  message_j0_a TEXT,
  message_j0_b TEXT,
  message_j0_c TEXT,
  selected_variant TEXT DEFAULT 'a' CHECK (selected_variant IN ('a', 'b', 'c')),
  status TEXT DEFAULT 'pending',
  prospect_id UUID,
  sequence_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  validated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS telegram_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id TEXT NOT NULL,
  notifications_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sequence_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_slug TEXT NOT NULL,
  step TEXT NOT NULL,
  variant TEXT NOT NULL,
  content TEXT NOT NULL,
  performance_data JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  suggested_replacement TEXT,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE prospects ADD COLUMN IF NOT EXISTS signal_type TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS playbook_id TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS playbook_prospect_id UUID;

CREATE INDEX idx_playbook_prospects_run ON playbook_prospects(run_id);
CREATE INDEX idx_playbook_prospects_status ON playbook_prospects(status);
CREATE INDEX idx_playbook_runs_playbook ON playbook_runs(playbook_id);

-- Fonction pour incrémenter le compteur de prospects validés
CREATE OR REPLACE FUNCTION increment_validated(run_id UUID, count INT)
RETURNS VOID AS $$
  UPDATE playbook_runs
  SET prospects_validated = prospects_validated + count
  WHERE id = run_id;
$$ LANGUAGE SQL;
