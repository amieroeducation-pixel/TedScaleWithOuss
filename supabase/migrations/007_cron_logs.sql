-- Migration 007: table cron_logs pour historique executions automatisations
CREATE TABLE cron_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'error', 'skipped')),
  details jsonb DEFAULT '{}',
  executed_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_cron_logs_user ON cron_logs(user_id);
CREATE INDEX idx_cron_logs_job ON cron_logs(job_name, executed_at DESC);

ALTER TABLE cron_logs ENABLE ROW LEVEL SECURITY;

-- Lecture: chaque user voit ses propres logs (page /automatisations)
CREATE POLICY "Users can view their own cron_logs" ON cron_logs
  FOR SELECT USING (auth.uid() = user_id);
-- INSERT via service_role (bypass RLS) depuis les routes cron -- pas de policy INSERT
