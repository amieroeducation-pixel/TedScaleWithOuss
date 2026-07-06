-- Migration: Ajout foreign key prospect_id dans table relances
-- Date: 2026-07-07
-- Description: Lie relances à prospects pour traçabilité complète

-- Ajout colonne prospect_id avec foreign key
ALTER TABLE relances 
ADD COLUMN prospect_id UUID REFERENCES prospects(id) ON DELETE SET NULL;

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_relances_prospect_id ON relances(prospect_id);

-- Commentaire
COMMENT ON COLUMN relances.prospect_id IS 'Lien vers prospects table pour traçabilité';
