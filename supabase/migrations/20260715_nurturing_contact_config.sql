-- Per-contact nurturing configuration
CREATE TABLE IF NOT EXISTS nurturing_contact_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prospect_id uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  preferred_channel text,
  contact_frequency_days integer DEFAULT 14,
  excluded_channels text[] DEFAULT '{}',
  notes text DEFAULT '',
  preferred_time_slot text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, prospect_id)
);

ALTER TABLE nurturing_contact_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own contact configs" ON nurturing_contact_config
  FOR ALL USING (auth.uid() = user_id);
