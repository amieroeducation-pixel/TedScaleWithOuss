-- Migration 20260719 : Tables pour section Nurturing complète

-- Thèmes patrimoniaux (Retraite TNS, Immobilier, Défiscalisation, Prévoyance, Entreprise)
CREATE TABLE IF NOT EXISTS nurturing_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#e8c878',
  icon text NOT NULL DEFAULT '📊',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE nurturing_themes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users manage own nurturing_themes" ON nurturing_themes
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Messages pré-enregistrés nurturing (par canal + thème + tip PP)
CREATE TABLE IF NOT EXISTS nurturing_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email', 'whatsapp', 'linkedin', 'telephone', 'sms')),
  subject text,
  body text NOT NULL,
  tip text,
  tag text,
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE nurturing_messages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users manage own nurturing_messages" ON nurturing_messages
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Documents nurturing (bibliothèque documentaire)
CREATE TABLE IF NOT EXISTS nurturing_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  theme_id uuid REFERENCES nurturing_themes(id) ON DELETE SET NULL,
  format text NOT NULL DEFAULT 'pdf',
  url text,
  channels_compatible text[] DEFAULT '{email}',
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE nurturing_documents ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users manage own nurturing_documents" ON nurturing_documents
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Envois de documents (tracking quel doc envoyé à quel prospect)
CREATE TABLE IF NOT EXISTS nurturing_document_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  prospect_id uuid REFERENCES prospects(id) ON DELETE CASCADE NOT NULL,
  document_id uuid REFERENCES nurturing_documents(id) ON DELETE CASCADE NOT NULL,
  channel text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE nurturing_document_sends ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users manage own nurturing_document_sends" ON nurturing_document_sends
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Colonnes manquantes sur prospects pour le nurturing (si pas déjà présentes)
DO $$ BEGIN
  ALTER TABLE prospects ADD COLUMN IF NOT EXISTS preferred_channel text;
  ALTER TABLE prospects ADD COLUMN IF NOT EXISTS contact_frequency_days integer DEFAULT 14;
  ALTER TABLE prospects ADD COLUMN IF NOT EXISTS excluded_channels text[] DEFAULT '{}';
  ALTER TABLE prospects ADD COLUMN IF NOT EXISTS preferred_time_slot text;
EXCEPTION WHEN others THEN NULL;
END $$;
