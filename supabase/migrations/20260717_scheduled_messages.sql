-- Migration 20260717 : Messages planifiés nurturing

CREATE TABLE IF NOT EXISTS scheduled_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  prospect_id uuid REFERENCES prospects(id) ON DELETE CASCADE NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email', 'whatsapp', 'linkedin', 'telephone', 'sms', 'courrier')),
  message text NOT NULL,
  subject text,
  document_url text,
  phone text,
  email text,
  prospect_name text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  sent_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled', 'ready_to_send')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_messages_user_pending
  ON scheduled_messages(user_id, scheduled_at)
  WHERE status = 'pending';

ALTER TABLE scheduled_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users manage own scheduled_messages" ON scheduled_messages
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
