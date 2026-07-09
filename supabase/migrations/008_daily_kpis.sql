-- supabase/migrations/008_daily_kpis.sql
CREATE TABLE IF NOT EXISTS daily_kpis (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date          date        NOT NULL,
  contacts      integer     NOT NULL DEFAULT 0,
  calls         integer     NOT NULL DEFAULT 0,
  rdv1          integer     NOT NULL DEFAULT 0,
  rdv2          integer     NOT NULL DEFAULT 0,
  blocks        integer     NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

ALTER TABLE daily_kpis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_kpis_self"
  ON daily_kpis FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
