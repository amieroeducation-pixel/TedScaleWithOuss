-- Migration : Table message_drafts pour autosave brouillons
-- Date : 2026-08-09

CREATE TABLE IF NOT EXISTS message_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp', 'sms', 'linkedin', 'call')),
  message_text TEXT NOT NULL DEFAULT '',
  message_subject TEXT,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, prospect_id, channel)
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_message_drafts_user_prospect ON message_drafts(user_id, prospect_id);
CREATE INDEX IF NOT EXISTS idx_message_drafts_updated ON message_drafts(updated_at DESC);

-- RLS
ALTER TABLE message_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own drafts"
  ON message_drafts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_message_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER message_drafts_updated_at
  BEFORE UPDATE ON message_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_message_drafts_updated_at();

COMMENT ON TABLE message_drafts IS 'Brouillons de messages non envoyés (autosave 1000ms)';
