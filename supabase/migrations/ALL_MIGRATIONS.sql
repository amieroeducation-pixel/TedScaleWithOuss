-- Ted Scale With Ouss — CGP Dashboard Schema
-- Migration 001: Initial schema

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ============================================================
-- ENUMS
-- ============================================================

create type pipeline_stage as enum (
  'a_contacter',
  'rdv1',
  'rdv2',
  'rdv3',
  'converti',
  'perdu'
);

create type prospect_status as enum (
  'non_contacte',
  'en_cours',
  'converti',
  'perdu'
);

create type prospect_source as enum (
  'tns',
  'chefs_entreprise',
  'particuliers',
  'recommandation',
  'linkedin',
  'autre'
);

create type interaction_type as enum (
  'appel',
  'rdv1',
  'rdv2',
  'rdv3',
  'email',
  'whatsapp',
  'linkedin',
  'autre'
);

create type product_type as enum (
  'PER',
  'AV',
  'SCPI',
  'PEA',
  'prev_retraite',
  'prev_prevoyance',
  'immobilier',
  'autre'
);

create type commission_status as enum (
  'attendue',
  'percue',
  'annulee'
);

create type scraping_status as enum (
  'pending',
  'running',
  'done',
  'error'
);

-- ============================================================
-- PROSPECTS
-- ============================================================

create table prospects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,

  -- Identity
  full_name text not null,
  email text,
  phone text,
  phone_normalized text, -- E.164 format for dedup
  profession text,
  company text,
  address text,
  city text,
  department text(3),

  -- Pipeline
  pipeline_stage pipeline_stage not null default 'a_contacter',
  status prospect_status not null default 'non_contacte',
  source prospect_source not null default 'autre',

  -- Scoring
  lead_score integer check (lead_score >= 0 and lead_score <= 100),

  -- Timing
  last_contact_at timestamptz,
  next_action_date date,

  -- Metadata
  tags text[] default '{}',
  notes text,
  linkedin_url text,

  -- Timestamps
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_prospects_user_id on prospects(user_id);
create index idx_prospects_stage on prospects(pipeline_stage);
create index idx_prospects_next_action on prospects(next_action_date);
create index idx_prospects_phone_normalized on prospects(phone_normalized);

-- ============================================================
-- INTERACTIONS
-- ============================================================

create table interactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  prospect_id uuid references prospects(id) on delete cascade not null,

  type interaction_type not null,
  is_honored boolean default true,
  occurred_at timestamptz not null default now(),
  calendar_event_id text, -- Google Calendar event ID
  duration_min integer,
  notes text,

  created_at timestamptz default now() not null
);

create index idx_interactions_prospect_id on interactions(prospect_id);
create index idx_interactions_user_id on interactions(user_id);
create index idx_interactions_occurred_at on interactions(occurred_at desc);

-- ============================================================
-- CLIENTS
-- ============================================================

create table clients (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  prospect_id uuid references prospects(id) on delete cascade unique not null,

  total_aum numeric(12,2) default 0, -- Assets Under Management in EUR
  last_interaction_at timestamptz,
  alert_threshold_days integer default 90,

  notes text,

  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_clients_user_id on clients(user_id);
create index idx_clients_last_interaction on clients(last_interaction_at);

-- ============================================================
-- FINANCIAL PRODUCTS
-- ============================================================

create table financial_products (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,

  name text not null,
  type product_type not null,
  provider text,

  created_at timestamptz default now() not null
);

create index idx_financial_products_user_id on financial_products(user_id);

-- ============================================================
-- CONTRACTS
-- ============================================================

create table contracts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  client_id uuid references clients(id) on delete cascade not null,
  product_id uuid references financial_products(id) on delete set null,

  commission_amount numeric(10,2) not null default 0,
  commission_status commission_status not null default 'attendue',
  commission_date date,
  signed_at date not null default current_date,

  notes text,

  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_contracts_user_id on contracts(user_id);
create index idx_contracts_client_id on contracts(client_id);
create index idx_contracts_commission_date on contracts(commission_date);

-- ============================================================
-- REVENUE OBJECTIVES
-- ============================================================

create table revenue_objectives (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,

  year integer not null,
  month integer check (month >= 1 and month <= 12), -- null = annual objective
  amount numeric(12,2) not null,
  product_type product_type, -- null = global objective

  created_at timestamptz default now() not null,

  unique(user_id, year, month, product_type)
);

create index idx_revenue_objectives_user_id on revenue_objectives(user_id);

-- ============================================================
-- PIPELINE EVENTS
-- ============================================================

create table pipeline_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  prospect_id uuid references prospects(id) on delete cascade not null,

  from_stage pipeline_stage,
  to_stage pipeline_stage not null,
  occurred_at timestamptz default now() not null,

  notes text
);

create index idx_pipeline_events_user_id on pipeline_events(user_id);
create index idx_pipeline_events_prospect_id on pipeline_events(prospect_id);
create index idx_pipeline_events_occurred_at on pipeline_events(occurred_at desc);

-- ============================================================
-- SCRAPING JOBS
-- ============================================================

create table scraping_jobs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,

  source text not null default 'google_places',
  professions text[] not null default '{}',
  departments text[] not null default '{}',

  status scraping_status not null default 'pending',
  progress_pct integer default 0 check (progress_pct >= 0 and progress_pct <= 100),
  results_count integer default 0,
  error_message text,

  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now() not null
);

create index idx_scraping_jobs_user_id on scraping_jobs(user_id);

-- ============================================================
-- SCRAPING RESULTS
-- ============================================================

create table scraping_results (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  job_id uuid references scraping_jobs(id) on delete cascade not null,

  raw_data jsonb not null,

  -- Deduplication
  is_duplicate boolean default false,
  duplicate_score float check (duplicate_score >= 0 and duplicate_score <= 1),
  duplicate_of uuid references prospects(id) on delete set null,

  imported_as uuid references prospects(id) on delete set null,

  created_at timestamptz default now() not null
);

create index idx_scraping_results_job_id on scraping_results(job_id);
create index idx_scraping_results_user_id on scraping_results(user_id);

-- ============================================================
-- USER SETTINGS
-- ============================================================

create table user_settings (
  id uuid primary key references auth.users(id) on delete cascade,

  -- Integration tokens (stored encrypted in production)
  google_refresh_token text,
  google_calendar_id text,
  brevo_api_key text,
  brevo_list_id text,
  whatsapp_phone_number_id text,
  whatsapp_access_token text,

  -- CGP Targets
  closing_target_pct numeric(5,2) default 40.0,
  calls_per_day_target integer default 20,
  rdv_per_week_target integer default 5,
  blocks_per_day_target integer default 6,
  ca_monthly_target numeric(12,2) default 15000,
  ca_annual_target numeric(12,2) default 180000,

  -- Alert thresholds
  client_health_threshold_days integer default 90,

  -- Message templates (jsonb for flexibility)
  message_templates jsonb default '{}',

  updated_at timestamptz default now() not null
);
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
-- Migration 003: Views, functions, and triggers

-- ============================================================
-- AUTO-UPDATED updated_at TRIGGER
-- ============================================================

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger prospects_updated_at
  before update on prospects
  for each row execute function set_updated_at();

create trigger clients_updated_at
  before update on clients
  for each row execute function set_updated_at();

create trigger contracts_updated_at
  before update on contracts
  for each row execute function set_updated_at();

create trigger user_settings_updated_at
  before update on user_settings
  for each row execute function set_updated_at();

-- ============================================================
-- SYNC CLIENT LAST INTERACTION
-- ============================================================

create or replace function sync_client_last_interaction()
returns trigger as $$
begin
  update clients
  set last_interaction_at = new.occurred_at
  where prospect_id = new.prospect_id
    and (last_interaction_at is null or new.occurred_at > last_interaction_at);
  return new;
end;
$$ language plpgsql security definer;

create trigger interactions_sync_client
  after insert on interactions
  for each row execute function sync_client_last_interaction();

-- ============================================================
-- VIEW: Monthly Revenue vs Objectives
-- ============================================================

create or replace view v_monthly_revenue as
select
  c.user_id,
  date_trunc('month', c.commission_date)::date as month,
  extract(year from c.commission_date)::integer as year,
  extract(month from c.commission_date)::integer as month_num,
  sum(c.commission_amount) as revenue,
  ro.amount as objective,
  case
    when ro.amount > 0 then round((sum(c.commission_amount) / ro.amount * 100)::numeric, 1)
    else null
  end as pct_of_objective
from contracts c
left join revenue_objectives ro
  on ro.user_id = c.user_id
  and ro.year = extract(year from c.commission_date)
  and ro.month = extract(month from c.commission_date)
  and ro.product_type is null
where c.commission_status = 'percue'
  and c.commission_date is not null
group by c.user_id, date_trunc('month', c.commission_date)::date, ro.amount;

-- ============================================================
-- VIEW: Pipeline Conversion Rates
-- ============================================================

create or replace view v_pipeline_conversion as
with stage_counts as (
  select
    user_id,
    pipeline_stage,
    count(*) as total
  from prospects
  group by user_id, pipeline_stage
),
stage_order as (
  select
    user_id,
    pipeline_stage,
    total,
    row_number() over (partition by user_id order by
      case pipeline_stage
        when 'a_contacter' then 1
        when 'rdv1' then 2
        when 'rdv2' then 3
        when 'rdv3' then 4
        when 'converti' then 5
        when 'perdu' then 6
      end
    ) as stage_rank,
    lag(total) over (partition by user_id order by
      case pipeline_stage
        when 'a_contacter' then 1
        when 'rdv1' then 2
        when 'rdv2' then 3
        when 'rdv3' then 4
        when 'converti' then 5
        when 'perdu' then 6
      end
    ) as prev_total
  from stage_counts
)
select
  user_id,
  pipeline_stage,
  total,
  case
    when prev_total > 0 then round((total::numeric / prev_total * 100), 1)
    else null
  end as conversion_rate_pct
from stage_order;

-- ============================================================
-- FUNCTION: Get Client Health Alerts
-- ============================================================

create or replace function get_client_health_alerts(p_user_id uuid)
returns table (
  client_id uuid,
  prospect_id uuid,
  full_name text,
  last_interaction_at timestamptz,
  days_without_contact integer,
  alert_threshold_days integer,
  total_aum numeric
) as $$
begin
  return query
  select
    cl.id as client_id,
    p.id as prospect_id,
    p.full_name,
    cl.last_interaction_at,
    extract(day from now() - cl.last_interaction_at)::integer as days_without_contact,
    cl.alert_threshold_days,
    cl.total_aum
  from clients cl
  join prospects p on p.id = cl.prospect_id
  where cl.user_id = p_user_id
    and (
      cl.last_interaction_at is null
      or extract(day from now() - cl.last_interaction_at) >= cl.alert_threshold_days
    )
  order by days_without_contact desc nulls first;
end;
$$ language plpgsql security definer;

-- ============================================================
-- FUNCTION: Find Duplicate Prospects (fuzzy dedup)
-- ============================================================

create or replace function find_duplicate_prospects(
  p_user_id uuid,
  p_full_name text,
  p_phone text default null,
  p_email text default null
)
returns table (
  prospect_id uuid,
  full_name text,
  phone text,
  email text,
  similarity_score float
) as $$
begin
  return query
  select
    p.id as prospect_id,
    p.full_name,
    p.phone,
    p.email,
    greatest(
      similarity(lower(p.full_name), lower(p_full_name)),
      case when p_phone is not null and p.phone_normalized = p_phone then 1.0 else 0.0 end,
      case when p_email is not null and lower(p.email) = lower(p_email) then 1.0 else 0.0 end
    ) as similarity_score
  from prospects p
  where p.user_id = p_user_id
    and (
      similarity(lower(p.full_name), lower(p_full_name)) > 0.5
      or (p_phone is not null and p.phone_normalized = p_phone)
      or (p_email is not null and lower(p.email) = lower(p_email))
    )
  order by similarity_score desc
  limit 5;
end;
$$ language plpgsql security definer;

-- ============================================================
-- AUTO-CREATE USER SETTINGS on signup
-- ============================================================

create or replace function create_user_settings_on_signup()
returns trigger as $$
begin
  insert into user_settings (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function create_user_settings_on_signup();

-- ============================================================
-- Migration 016: Missing columns (daily_kpis + user_settings)
-- ============================================================

ALTER TABLE daily_kpis ADD COLUMN IF NOT EXISTS blocks integer NOT NULL DEFAULT 0;

ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS google_calendar_access_token text;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS google_calendar_refresh_token text;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS google_calendar_token_expiry bigint;
