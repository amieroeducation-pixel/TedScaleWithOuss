-- Migration 20260715 : Section Nurturing complète
-- Tables : nurturing_themes, nurturing_documents, nurturing_messages, prospect_themes, prospect_document_sends

-- ============================================================
-- TABLE nurturing_themes (thèmes/besoins : retraite, optimisation, etc.)
-- ============================================================

CREATE TABLE IF NOT EXISTS nurturing_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#e8c878',
  icon text NOT NULL DEFAULT '📁',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nurturing_themes_user ON nurturing_themes(user_id, sort_order);

ALTER TABLE nurturing_themes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users manage own nurturing_themes" ON nurturing_themes
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- TABLE nurturing_documents (bibliothèque documentaire)
-- ============================================================

CREATE TABLE IF NOT EXISTS nurturing_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  theme_id uuid REFERENCES nurturing_themes(id) ON DELETE SET NULL,
  format text NOT NULL DEFAULT 'pdf' CHECK (format IN ('pdf', 'image', 'lien', 'texte')),
  url text,
  channels_compatible text[] NOT NULL DEFAULT '{email,courrier}',
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nurturing_documents_user ON nurturing_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_nurturing_documents_theme ON nurturing_documents(theme_id);

ALTER TABLE nurturing_documents ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users manage own nurturing_documents" ON nurturing_documents
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- TABLE nurturing_messages (bibliothèque de messages pré-enregistrés)
-- ============================================================

CREATE TABLE IF NOT EXISTS nurturing_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email', 'whatsapp', 'linkedin', 'telephone', 'sms', 'courrier')),
  subject text,
  body text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nurturing_messages_user ON nurturing_messages(user_id, channel);

ALTER TABLE nurturing_messages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users manage own nurturing_messages" ON nurturing_messages
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- TABLE prospect_themes (liaison prospect ↔ thèmes)
-- ============================================================

CREATE TABLE IF NOT EXISTS prospect_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES prospects(id) ON DELETE CASCADE NOT NULL,
  theme_id uuid REFERENCES nurturing_themes(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(prospect_id, theme_id)
);

CREATE INDEX IF NOT EXISTS idx_prospect_themes_prospect ON prospect_themes(prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospect_themes_theme ON prospect_themes(theme_id);

ALTER TABLE prospect_themes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users manage own prospect_themes" ON prospect_themes
    FOR ALL USING (EXISTS (
      SELECT 1 FROM prospects p WHERE p.id = prospect_themes.prospect_id AND p.user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- TABLE prospect_document_sends (tracking docs envoyés par prospect)
-- ============================================================

CREATE TABLE IF NOT EXISTS prospect_document_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES prospects(id) ON DELETE CASCADE NOT NULL,
  document_id uuid REFERENCES nurturing_documents(id) ON DELETE CASCADE NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  channel text NOT NULL,
  UNIQUE(prospect_id, document_id, channel)
);

CREATE INDEX IF NOT EXISTS idx_prospect_doc_sends_prospect ON prospect_document_sends(prospect_id);

ALTER TABLE prospect_document_sends ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users manage own prospect_document_sends" ON prospect_document_sends
    FOR ALL USING (EXISTS (
      SELECT 1 FROM prospects p WHERE p.id = prospect_document_sends.prospect_id AND p.user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- COLONNES additionnelles sur prospects pour nurturing
-- ============================================================

ALTER TABLE prospects ADD COLUMN IF NOT EXISTS nurturing_category text
  CHECK (nurturing_category IN ('rdv_fait', 'prospect_froid', 'interpro'));

ALTER TABLE prospects ADD COLUMN IF NOT EXISTS pressure_score text
  DEFAULT 'normal' CHECK (pressure_score IN ('normal', 'elevee', 'a_stopper'));

ALTER TABLE prospects ADD COLUMN IF NOT EXISTS nb_relances_sans_reponse integer DEFAULT 0;

ALTER TABLE prospects ADD COLUMN IF NOT EXISTS next_action_channel text
  CHECK (next_action_channel IN ('telephone', 'email', 'whatsapp', 'linkedin', 'courrier', 'sms'));

-- ============================================================
-- COLONNES additionnelles sur interactions pour tracking "vu"
-- ============================================================

ALTER TABLE interactions ADD COLUMN IF NOT EXISTS seen_at timestamptz;
ALTER TABLE interactions ADD COLUMN IF NOT EXISTS responded_at timestamptz;
ALTER TABLE interactions ADD COLUMN IF NOT EXISTS message_id uuid REFERENCES nurturing_messages(id) ON DELETE SET NULL;
ALTER TABLE interactions ADD COLUMN IF NOT EXISTS document_id uuid REFERENCES nurturing_documents(id) ON DELETE SET NULL;

-- ============================================================
-- TABLE nurturing_settings (seuils configurables)
-- ============================================================

CREATE TABLE IF NOT EXISTS nurturing_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  cold_days_no_response integer NOT NULL DEFAULT 14,
  cold_relances_no_view integer NOT NULL DEFAULT 3,
  warm_days_since_response integer NOT NULL DEFAULT 7,
  hot_days_since_response integer NOT NULL DEFAULT 3,
  pressure_high_relances_7d integer NOT NULL DEFAULT 4,
  pressure_stop_no_view integer NOT NULL DEFAULT 5,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE nurturing_settings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users manage own nurturing_settings" ON nurturing_settings
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- SEED : thèmes par défaut
-- ============================================================

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'amiero.education@gmail.com' LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User introuvable — seed ignoré';
    RETURN;
  END IF;

  INSERT INTO nurturing_themes (user_id, name, color, icon, sort_order) VALUES
    (v_user_id, 'Retraite', '#7a92e8', '🏖️', 1),
    (v_user_id, 'Optimisation fiscale', '#e8c878', '💰', 2),
    (v_user_id, 'Valorisation patrimoine', '#4ade80', '📈', 3),
    (v_user_id, 'Transmission', '#b07aee', '🤝', 4),
    (v_user_id, 'Entreprise', '#d8884a', '🏢', 5)
  ON CONFLICT DO NOTHING;

  INSERT INTO nurturing_settings (user_id) VALUES (v_user_id) ON CONFLICT DO NOTHING;
END $$;
