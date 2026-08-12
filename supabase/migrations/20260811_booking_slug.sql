-- Ted Scale With Ouss — Booking Slug
-- Migration 20260811: Ajouter booking_slug à user_settings pour URL publique

-- Ajouter colonne booking_slug (unique, généré automatiquement)
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS booking_slug text UNIQUE;

-- Créer index pour recherche rapide par slug
CREATE INDEX IF NOT EXISTS user_settings_booking_slug_idx ON user_settings(booking_slug);

-- Fonction pour générer un slug unique basé sur le nom de l'utilisateur
CREATE OR REPLACE FUNCTION generate_booking_slug()
RETURNS trigger AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  -- Si booking_slug est déjà défini, ne rien faire
  IF NEW.booking_slug IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Générer un slug de base à partir de l'user_id (8 premiers caractères)
  base_slug := substring(NEW.id::text, 1, 8);
  final_slug := base_slug;

  -- Vérifier l'unicité et ajouter un compteur si nécessaire
  WHILE EXISTS (SELECT 1 FROM user_settings WHERE booking_slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter::text;
  END LOOP;

  NEW.booking_slug := final_slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour générer booking_slug automatiquement à la création
DROP TRIGGER IF EXISTS generate_booking_slug_trigger ON user_settings;
CREATE TRIGGER generate_booking_slug_trigger
  BEFORE INSERT ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION generate_booking_slug();

-- Générer les slugs pour les utilisateurs existants qui n'en ont pas
UPDATE user_settings
SET booking_slug = substring(id::text, 1, 8)
WHERE booking_slug IS NULL;

-- S'assurer de l'unicité pour les utilisateurs existants
DO $$
DECLARE
  r RECORD;
  counter integer;
  new_slug text;
BEGIN
  FOR r IN
    SELECT id, booking_slug
    FROM user_settings
    WHERE booking_slug IN (
      SELECT booking_slug
      FROM user_settings
      GROUP BY booking_slug
      HAVING COUNT(*) > 1
    )
    ORDER BY created_at
  LOOP
    counter := 1;
    new_slug := r.booking_slug || '-' || counter::text;

    WHILE EXISTS (SELECT 1 FROM user_settings WHERE booking_slug = new_slug) LOOP
      counter := counter + 1;
      new_slug := r.booking_slug || '-' || counter::text;
    END LOOP;

    UPDATE user_settings SET booking_slug = new_slug WHERE id = r.id;
  END LOOP;
END $$;
