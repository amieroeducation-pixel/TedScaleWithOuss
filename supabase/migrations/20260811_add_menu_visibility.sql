-- Migration 009 : Ajouter colonne menu_sections_visible pour sections sommeil

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS menu_sections_visible jsonb DEFAULT '{
  "principal": true,
  "clients": true,
  "acquisition": true,
  "outils": true,
  "pilotage": true
}'::jsonb;

COMMENT ON COLUMN user_settings.menu_sections_visible IS 'Visibilité sections menu latéral (toggle dans Settings)';
