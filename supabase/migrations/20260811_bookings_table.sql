-- Ted Scale With Ouss — Booking System
-- Migration 20260811: Table bookings pour prise de rendez-vous publique

-- ============================================================
-- ENUM
-- ============================================================

create type booking_status as enum (
  'pending',      -- En attente de confirmation
  'confirmed',    -- Confirmé (événement créé dans Google Calendar)
  'cancelled',    -- Annulé
  'completed'     -- Terminé (après la date du RDV)
);

-- ============================================================
-- TABLE BOOKINGS
-- ============================================================

create table bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,

  -- Contact info
  contact_name text not null,
  contact_email text not null,
  contact_phone text,
  message text,

  -- Scheduling
  scheduled_at timestamptz not null,
  duration_minutes integer not null default 30,

  -- Status
  status booking_status not null default 'pending',

  -- Google Calendar integration
  google_event_id text, -- ID de l'événement créé dans Google Calendar

  -- Metadata
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  confirmed_at timestamptz,
  cancelled_at timestamptz,

  -- Indexes
  constraint bookings_scheduled_at_check check (scheduled_at > now())
);

-- ============================================================
-- INDEXES
-- ============================================================

create index bookings_user_id_idx on bookings(user_id);
create index bookings_scheduled_at_idx on bookings(scheduled_at);
create index bookings_status_idx on bookings(status);
create index bookings_contact_email_idx on bookings(contact_email);

-- ============================================================
-- RLS POLICIES
-- ============================================================

alter table bookings enable row level security;

-- Users can read their own bookings
create policy "Users can view their own bookings"
  on bookings for select
  using (auth.uid() = user_id);

-- Users can insert bookings (needed for public booking page via API)
create policy "Users can create bookings"
  on bookings for insert
  with check (auth.uid() = user_id);

-- Users can update their own bookings
create policy "Users can update their own bookings"
  on bookings for update
  using (auth.uid() = user_id);

-- ============================================================
-- TRIGGER: updated_at
-- ============================================================

create or replace function update_bookings_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger bookings_updated_at
  before update on bookings
  for each row
  execute function update_bookings_updated_at();

-- ============================================================
-- FONCTION: Vérifier disponibilité créneau
-- ============================================================

create or replace function is_slot_available(
  p_user_id uuid,
  p_scheduled_at timestamptz,
  p_duration_minutes integer default 30
)
returns boolean as $$
declare
  conflict_count integer;
begin
  -- Vérifier si un booking existe déjà qui chevauche ce créneau
  select count(*)
  into conflict_count
  from bookings
  where user_id = p_user_id
    and status in ('pending', 'confirmed')
    and (
      -- Le nouveau créneau commence pendant un booking existant
      (p_scheduled_at >= scheduled_at and p_scheduled_at < scheduled_at + (duration_minutes || ' minutes')::interval)
      or
      -- Le nouveau créneau se termine pendant un booking existant
      (p_scheduled_at + (p_duration_minutes || ' minutes')::interval > scheduled_at
       and p_scheduled_at + (p_duration_minutes || ' minutes')::interval <= scheduled_at + (duration_minutes || ' minutes')::interval)
      or
      -- Le nouveau créneau englobe complètement un booking existant
      (p_scheduled_at <= scheduled_at and p_scheduled_at + (p_duration_minutes || ' minutes')::interval >= scheduled_at + (duration_minutes || ' minutes')::interval)
    );

  return conflict_count = 0;
end;
$$ language plpgsql security definer;
