-- Migration 20260725 : Colonnes manquantes pour section Nurturing

-- Colonnes prospects
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS nurturing_category text;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS nb_relances_sans_reponse integer DEFAULT 0;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS next_action_channel text;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS pressure_score text;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS sequence_active text;

-- Description sur sequence_templates (utilisée par l'UI nurturing)
ALTER TABLE sequence_templates ADD COLUMN IF NOT EXISTS description text;
