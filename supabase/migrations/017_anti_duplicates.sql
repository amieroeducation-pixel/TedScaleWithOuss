-- Migration 017: Anti-duplicate index on prospects + phone normalization function
-- Date: 2026-07-04

-- Index anti-doublons sur prospects (téléphone unique par utilisateur)
CREATE UNIQUE INDEX IF NOT EXISTS idx_prospects_phone_user
  ON prospects(phone, user_id) WHERE phone IS NOT NULL AND phone != '';

-- Function pour normaliser un numéro FR (06/07 → +336/+337)
CREATE OR REPLACE FUNCTION normalize_phone_fr(raw text)
RETURNS text AS $$
DECLARE
  cleaned text;
BEGIN
  cleaned := regexp_replace(raw, '[^0-9+]', '', 'g');
  IF cleaned LIKE '0%' AND length(cleaned) = 10 THEN
    RETURN '+33' || substring(cleaned from 2);
  ELSIF cleaned LIKE '+33%' AND length(cleaned) = 12 THEN
    RETURN cleaned;
  ELSIF cleaned LIKE '33%' AND length(cleaned) = 11 THEN
    RETURN '+' || cleaned;
  END IF;
  RETURN cleaned;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Populate phone_normalized for existing prospects
UPDATE prospects
SET phone_normalized = normalize_phone_fr(phone)
WHERE phone IS NOT NULL AND phone != '' AND phone_normalized IS NULL;
