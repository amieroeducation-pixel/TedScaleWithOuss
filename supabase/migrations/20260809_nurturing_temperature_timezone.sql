-- Migration 20260809 : Température forcée + Timezone
-- Ajoute les champs forced_temperature et timezone aux prospects

-- 1. Colonne forced_temperature (nullable) pour override manuel
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS forced_temperature text
  CHECK (forced_temperature IN ('hot', 'warm', 'cold', 'dead'));

-- 2. Colonne timezone (default Paris)
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'Europe/Paris';

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_prospects_forced_temp
  ON prospects(forced_temperature) WHERE forced_temperature IS NOT NULL;
