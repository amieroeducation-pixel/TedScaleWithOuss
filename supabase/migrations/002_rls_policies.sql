-- Migration 002: Row Level Security policies
-- Every table is isolated by user_id = auth.uid()

-- ============================================================
-- Enable RLS on all tables
-- ============================================================

alter table prospects enable row level security;
alter table interactions enable row level security;
alter table clients enable row level security;
alter table financial_products enable row level security;
alter table contracts enable row level security;
alter table revenue_objectives enable row level security;
alter table pipeline_events enable row level security;
alter table scraping_jobs enable row level security;
alter table scraping_results enable row level security;
alter table user_settings enable row level security;

-- ============================================================
-- PROSPECTS policies
-- ============================================================

create policy "prospects: users can manage their own"
  on prospects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- INTERACTIONS policies
-- ============================================================

create policy "interactions: users can manage their own"
  on interactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- CLIENTS policies
-- ============================================================

create policy "clients: users can manage their own"
  on clients for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- FINANCIAL PRODUCTS policies
-- ============================================================

create policy "financial_products: users can manage their own"
  on financial_products for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- CONTRACTS policies
-- ============================================================

create policy "contracts: users can manage their own"
  on contracts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- REVENUE OBJECTIVES policies
-- ============================================================

create policy "revenue_objectives: users can manage their own"
  on revenue_objectives for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- PIPELINE EVENTS policies
-- ============================================================

create policy "pipeline_events: users can manage their own"
  on pipeline_events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- SCRAPING JOBS policies
-- ============================================================

create policy "scraping_jobs: users can manage their own"
  on scraping_jobs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- SCRAPING RESULTS policies
-- ============================================================

create policy "scraping_results: users can manage their own"
  on scraping_results for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- USER SETTINGS policies
-- ============================================================

create policy "user_settings: users can manage their own"
  on user_settings for all
  using (auth.uid() = id)
  with check (auth.uid() = id);
