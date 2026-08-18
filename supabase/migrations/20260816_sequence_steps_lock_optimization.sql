-- Migration 20260816_sequence_steps_lock_optimization
-- Fonction RPC pour SELECT avec FOR UPDATE SKIP LOCKED

CREATE OR REPLACE FUNCTION get_due_steps_locked(p_limit int DEFAULT 50)
RETURNS TABLE (
  id uuid,
  instance_id uuid,
  template_step_id uuid,
  step_order int,
  channel sequence_channel,
  scheduled_at timestamptz,
  executed_at timestamptz,
  status step_status,
  error_message text,
  message_sent text,
  instance_user_id uuid,
  instance_prospect_id uuid,
  instance_status sequence_status,
  instance_template_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.instance_id,
    s.template_step_id,
    s.step_order,
    s.channel,
    s.scheduled_at,
    s.executed_at,
    s.status,
    s.error_message,
    s.message_sent,
    i.user_id as instance_user_id,
    i.prospect_id as instance_prospect_id,
    i.status as instance_status,
    i.template_id as instance_template_id
  FROM sequence_instance_steps s
  INNER JOIN sequence_instances i ON i.id = s.instance_id
  WHERE s.scheduled_at <= now()
    AND s.status = 'pending'
    AND i.status = 'active'
  ORDER BY s.scheduled_at ASC
  LIMIT p_limit
  FOR UPDATE OF s SKIP LOCKED;
END;
$$;

-- Grant execute to service_role
GRANT EXECUTE ON FUNCTION get_due_steps_locked(int) TO service_role;
GRANT EXECUTE ON FUNCTION get_due_steps_locked(int) TO authenticated;

-- Index pour optimiser la fonction
CREATE INDEX IF NOT EXISTS idx_sequence_instance_steps_due_pending
  ON sequence_instance_steps(scheduled_at ASC)
  WHERE status = 'pending';
