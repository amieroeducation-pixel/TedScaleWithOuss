-- Migration 20260816_sequence_execution_logs
-- Table logs détaillés des envois séquences

CREATE TABLE sequence_execution_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sequence_instance_id uuid REFERENCES sequence_instances(id) ON DELETE CASCADE NOT NULL,
  step_id uuid REFERENCES sequence_instance_steps(id) ON DELETE CASCADE NOT NULL,
  prospect_id uuid REFERENCES prospects(id) ON DELETE CASCADE NOT NULL,
  channel sequence_channel NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'failed', 'retrying')),
  http_status_code int,
  error_message text,
  message_sent text,
  retry_count int DEFAULT 0 NOT NULL,
  sent_at timestamptz DEFAULT now() NOT NULL
);

-- Index pour queries fréquentes
CREATE INDEX idx_sequence_execution_logs_user_time
  ON sequence_execution_logs(user_id, sent_at DESC);

CREATE INDEX idx_sequence_execution_logs_instance
  ON sequence_execution_logs(sequence_instance_id);

CREATE INDEX idx_sequence_execution_logs_step
  ON sequence_execution_logs(step_id);

CREATE INDEX idx_sequence_execution_logs_status_time
  ON sequence_execution_logs(status, sent_at DESC)
  WHERE status IN ('failed', 'retrying');

-- RLS
ALTER TABLE sequence_execution_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own execution logs"
  ON sequence_execution_logs
  FOR SELECT USING (auth.uid() = user_id);

-- INSERT via service_role (bypass RLS) depuis executor.ts
