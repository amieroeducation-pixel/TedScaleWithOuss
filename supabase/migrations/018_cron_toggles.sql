-- Ajouter colonne cron_toggles à user_settings pour persister l'état on/off des automatisations
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS cron_toggles jsonb DEFAULT '{}';

COMMENT ON COLUMN user_settings.cron_toggles IS 'État on/off des crons par job_name. Ex: {"weekly-report": true, "rdv-reminder": false}';
