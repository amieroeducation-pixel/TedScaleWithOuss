-- Ted Scale With Ouss — Rappels SMS : lieu du cabinet configurable
-- Migration 20260903: Ajouter cabinet_location dans user_settings

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS cabinet_location text DEFAULT 'Mon cabinet';

COMMENT ON COLUMN user_settings.cabinet_location IS 'Lieu du cabinet affiché dans les rappels SMS (variable {{lieu}})';
