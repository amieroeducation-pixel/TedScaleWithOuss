-- Migration 008: calling session dashboard

CREATE TABLE call_scripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  metier text NOT NULL,
  titre text NOT NULL,
  contenu text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE call_scripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own call_scripts" ON call_scripts
  FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_call_scripts_user_metier ON call_scripts(user_id, metier);

CREATE TABLE call_objections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  metier text NOT NULL,
  question text NOT NULL,
  reponse text NOT NULL,
  ordre int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE call_objections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own call_objections" ON call_objections
  FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_call_objections_user_metier ON call_objections(user_id, metier, ordre);

CREATE TABLE calling_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  titre text NOT NULL,
  metier text NOT NULL,
  ville text NOT NULL DEFAULT '',
  source text NOT NULL CHECK (source IN ('tns', 'chefs')),
  statut text NOT NULL DEFAULT 'active' CHECK (statut IN ('active', 'pausee', 'terminee')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE calling_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own calling_sessions" ON calling_sessions
  FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_calling_sessions_user ON calling_sessions(user_id, statut, created_at DESC);

CREATE TABLE calling_session_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES calling_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ordre int NOT NULL DEFAULT 0,
  siren text,
  nom text NOT NULL,
  entreprise text NOT NULL DEFAULT '',
  metier text NOT NULL DEFAULT '',
  ville text NOT NULL DEFAULT '',
  telephone text NOT NULL,
  email text,
  adresse text,
  source text NOT NULL DEFAULT '',
  statut_appel text NOT NULL DEFAULT 'a_appeler'
    CHECK (statut_appel IN ('a_appeler','contacte','pas_repondu','pas_interesse','chaud')),
  note text,
  rappel_date timestamptz,
  added_to_crm boolean NOT NULL DEFAULT false,
  called_at timestamptz,
  script_rating smallint CHECK (script_rating BETWEEN 1 AND 5),
  objections_rencontrees jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE calling_session_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own session_contacts" ON calling_session_contacts
  FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_session_contacts_session ON calling_session_contacts(session_id, ordre);
