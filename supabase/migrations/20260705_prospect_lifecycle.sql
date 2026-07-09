-- Lifecycle & engagement columns
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS temperature text
  DEFAULT 'cold' CHECK (temperature IN ('hot', 'warm', 'cold', 'dead'));

ALTER TABLE prospects ADD COLUMN IF NOT EXISTS temperature_updated_at timestamptz;

ALTER TABLE prospects ADD COLUMN IF NOT EXISTS engagement_score numeric(5,2)
  DEFAULT 0 CHECK (engagement_score >= 0 AND engagement_score <= 100);

ALTER TABLE prospects ADD COLUMN IF NOT EXISTS last_engagement_at timestamptz;

ALTER TABLE prospects ADD COLUMN IF NOT EXISTS total_touchpoints integer DEFAULT 0;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS responded_touchpoints integer DEFAULT 0;

-- Capital event columns (tontine prioritization)
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS capital_event_type text
  CHECK (capital_event_type IN ('cession', 'heritage', 'vente_immo', 'dividendes', 'pee_deblocage', 'autre'));

ALTER TABLE prospects ADD COLUMN IF NOT EXISTS capital_amount_detected numeric(12,2);
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS capital_event_date date;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS urgency_window_days integer;

-- Index for TODAY page sorting
CREATE INDEX IF NOT EXISTS idx_prospects_today_priority
  ON prospects(user_id, next_action_date, temperature, urgency_window_days)
  WHERE pipeline_stage NOT IN ('converti', 'perdu');

-- Index for temperature filtering
CREATE INDEX IF NOT EXISTS idx_prospects_temperature
  ON prospects(user_id, temperature)
  WHERE pipeline_stage NOT IN ('converti', 'perdu');
