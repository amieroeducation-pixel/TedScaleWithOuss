-- Migration 20260816_sequence_template_steps_not_null
-- Fix templates vides + contrainte NOT NULL

-- Fix templates vides existants
UPDATE sequence_template_steps
SET message_template = 'Message à compléter — template non configuré'
WHERE message_template IS NULL
   OR trim(message_template) = ''
   OR message_template = '...';

-- Contrainte NOT NULL
ALTER TABLE sequence_template_steps
ALTER COLUMN message_template SET NOT NULL;

-- Check longueur minimale
ALTER TABLE sequence_template_steps
ADD CONSTRAINT message_template_not_empty
  CHECK (length(trim(message_template)) >= 10);
