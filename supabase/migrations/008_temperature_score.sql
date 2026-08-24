-- Add temperature_score column to prospects table
-- This column stores the cumulative temperature score:
-- +1 per interaction (email, sms, whatsapp, linkedin, appel)
-- +3 per RDV (rdv1, rdv2, rdv3)
-- -1 per complete week of silence since first contact

ALTER TABLE prospects ADD COLUMN IF NOT EXISTS temperature_score INTEGER DEFAULT 0;

-- Create index for querying by temperature score
CREATE INDEX IF NOT EXISTS idx_prospects_temperature_score ON prospects(temperature_score);
