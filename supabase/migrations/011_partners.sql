CREATE TABLE IF NOT EXISTS partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  short_name text NOT NULL DEFAULT '',
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  badge int NOT NULL DEFAULT 0,
  pressure text NOT NULL DEFAULT 'low' CHECK (pressure IN ('low','medium','high','max')),
  days_since int NOT NULL DEFAULT 0,
  clients int NOT NULL DEFAULT 0,
  notes text[] NOT NULL DEFAULT '{}',
  action text NOT NULL DEFAULT '',
  mobile text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  linkedin text NOT NULL DEFAULT '',
  cabinet text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  fonction text NOT NULL DEFAULT '',
  img text NOT NULL DEFAULT '',
  orbital_top text,
  orbital_bottom text,
  orbital_left text,
  orbital_right text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users manage own partners" ON partners
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_partners_user ON partners(user_id, sort_order, created_at);
