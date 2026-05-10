-- Migration 005 : Sequences multicanales (Phase 2)

-- ============================================================
-- ÉTENDRE ENUM interaction_type AVEC 'sms'
-- Note : ADD VALUE doit être commité avant utilisation (Pitfall 1)
-- ============================================================

ALTER TYPE interaction_type ADD VALUE IF NOT EXISTS 'sms';
COMMIT;

-- ============================================================
-- NOUVEAUX ENUMS
-- ============================================================

create type sequence_channel as enum ('whatsapp', 'email', 'sms', 'call_reminder', 'linkedin');
create type sequence_status as enum ('active', 'paused', 'completed', 'cancelled');
create type step_status as enum ('pending', 'sent', 'failed', 'skipped');

-- ============================================================
-- TABLE sequence_templates
-- ============================================================

create table sequence_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  pipeline_stage pipeline_stage,
  auto_trigger boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_sequence_templates_user on sequence_templates(user_id);
create index idx_sequence_templates_stage on sequence_templates(pipeline_stage) where auto_trigger = true;

-- ============================================================
-- TABLE sequence_template_steps
-- ============================================================

create table sequence_template_steps (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references sequence_templates(id) on delete cascade not null,
  step_order integer not null,
  channel sequence_channel not null,
  delay_days integer not null default 0,
  message_template text,
  created_at timestamptz default now() not null,
  unique (template_id, step_order)
);

create index idx_sequence_template_steps_template on sequence_template_steps(template_id);

-- ============================================================
-- TABLE sequence_instances
-- ============================================================

create table sequence_instances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  prospect_id uuid references prospects(id) on delete cascade not null,
  template_id uuid references sequence_templates(id) on delete set null,
  status sequence_status not null default 'active',
  started_at timestamptz default now() not null,
  paused_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz default now() not null
);

create index idx_sequence_instances_user on sequence_instances(user_id);
create index idx_sequence_instances_prospect on sequence_instances(prospect_id);
create index idx_sequence_instances_active on sequence_instances(prospect_id, template_id) where status = 'active';

-- ============================================================
-- TABLE sequence_instance_steps
-- ============================================================

create table sequence_instance_steps (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid references sequence_instances(id) on delete cascade not null,
  template_step_id uuid references sequence_template_steps(id) on delete set null,
  step_order integer not null,
  channel sequence_channel not null,
  scheduled_at timestamptz not null,
  executed_at timestamptz,
  status step_status not null default 'pending',
  error_message text,
  message_sent text,
  created_at timestamptz default now() not null
);

create index idx_sequence_instance_steps_instance on sequence_instance_steps(instance_id);
create index idx_sequence_instance_steps_due on sequence_instance_steps(scheduled_at) where status = 'pending';
