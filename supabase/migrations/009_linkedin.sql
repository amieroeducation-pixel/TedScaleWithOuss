-- supabase/migrations/20260516_linkedin.sql

ALTER TABLE playbook_prospects
  ADD COLUMN IF NOT EXISTS linkedin_profile_url TEXT;

-- RPC utilisée par le webhook pour incrémenter prospects_found
CREATE OR REPLACE FUNCTION increment_prospects_found(p_run_id UUID, p_count INT DEFAULT 1)
RETURNS VOID AS $$
  UPDATE playbook_runs
  SET prospects_found = prospects_found + p_count
  WHERE id = p_run_id;
$$ LANGUAGE SQL;
