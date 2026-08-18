-- Ted Scale With Ouss — Booking Settings
-- Migration 20260816: Ajouter colonnes configuration booking dans user_settings

-- Ajouter colonnes de configuration
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS booking_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS booking_duration_default integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS booking_days_available integer[] NOT NULL DEFAULT ARRAY[1,2,3,4,5],
  ADD COLUMN IF NOT EXISTS booking_hours_start integer NOT NULL DEFAULT 9,
  ADD COLUMN IF NOT EXISTS booking_hours_end integer NOT NULL DEFAULT 18,
  ADD COLUMN IF NOT EXISTS booking_buffer_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS booking_intro_message text;

-- Ajouter contraintes de validation
ALTER TABLE user_settings
  ADD CONSTRAINT IF NOT EXISTS booking_duration_valid CHECK (booking_duration_default BETWEEN 15 AND 240),
  ADD CONSTRAINT IF NOT EXISTS booking_hours_start_valid CHECK (booking_hours_start >= 0 AND booking_hours_start < 24),
  ADD CONSTRAINT IF NOT EXISTS booking_hours_end_valid CHECK (booking_hours_end > 0 AND booking_hours_end <= 24),
  ADD CONSTRAINT IF NOT EXISTS booking_hours_range_valid CHECK (booking_hours_end > booking_hours_start),
  ADD CONSTRAINT IF NOT EXISTS booking_buffer_valid CHECK (booking_buffer_minutes >= 0 AND booking_buffer_minutes <= 60);

-- Commentaires pour documentation
COMMENT ON COLUMN user_settings.booking_enabled IS 'Activer/désactiver la prise de RDV publique';
COMMENT ON COLUMN user_settings.booking_duration_default IS 'Durée par défaut des RDV en minutes (15-240)';
COMMENT ON COLUMN user_settings.booking_days_available IS 'Jours disponibles pour booking (1=lun, 7=dim)';
COMMENT ON COLUMN user_settings.booking_hours_start IS 'Heure début disponibilité (0-23)';
COMMENT ON COLUMN user_settings.booking_hours_end IS 'Heure fin disponibilité (1-24)';
COMMENT ON COLUMN user_settings.booking_buffer_minutes IS 'Temps de pause entre RDV en minutes (0-60)';
COMMENT ON COLUMN user_settings.booking_intro_message IS 'Message personnalisé affiché sur page booking publique';

-- Vérification finale
DO $$
BEGIN
  -- Tester qu'on peut bien insérer/update avec ces colonnes
  RAISE NOTICE 'Migration 20260816_booking_settings appliquée avec succès';
END $$;
