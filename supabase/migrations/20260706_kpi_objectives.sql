-- Table objectifs KPI annuels avec intensités mensuelles
CREATE TABLE IF NOT EXISTS kpi_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  year integer NOT NULL,

  obj_appels_annuel integer DEFAULT 2400,
  obj_contacts_annuel integer DEFAULT 600,
  obj_rdv_pris_annuel integer DEFAULT 300,
  obj_rdv_faits_annuel integer DEFAULT 200,
  obj_propositions_annuel integer DEFAULT 100,
  obj_collecte_annuel bigint DEFAULT 100000000,

  month_intensity jsonb DEFAULT '[1,1,1,1,1,1,1,1,1,1,1,1]'::jsonb,
  weeks_per_month jsonb DEFAULT '[4,4,4,4,4,4,4,4,5,4,4,5]'::jsonb,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(user_id, year)
);

CREATE INDEX IF NOT EXISTS idx_kpi_objectives_user_year ON kpi_objectives(user_id, year);
