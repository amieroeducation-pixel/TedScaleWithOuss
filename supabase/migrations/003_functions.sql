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
group by
  c.user_id,
  date_trunc('month', c.commission_date)::date,
  extract(year from c.commission_date)::integer,
  extract(month from c.commission_date)::integer,
  ro.amount;

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
