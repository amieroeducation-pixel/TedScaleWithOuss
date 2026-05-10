-- Ted Scale With Ouss — CGP Dashboard Schema
-- Migration 001: Initial schema

-- Enable required extensions
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
  id uuid primary key default gen_random_uuid(),
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
  department varchar(3),

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
  id uuid primary key default gen_random_uuid(),
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
  id uuid primary key default gen_random_uuid(),
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
  id uuid primary key default gen_random_uuid(),
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
  id uuid primary key default gen_random_uuid(),
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
  id uuid primary key default gen_random_uuid(),
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
  id uuid primary key default gen_random_uuid(),
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
  id uuid primary key default gen_random_uuid(),
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
  id uuid primary key default gen_random_uuid(),
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
