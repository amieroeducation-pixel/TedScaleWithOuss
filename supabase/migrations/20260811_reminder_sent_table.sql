-- Ted Scale With Ouss — Rappels SMS automatiques
-- Migration 20260811: Table reminder_sent pour tracking des rappels envoyés

-- ============================================================
-- ENUM
-- ============================================================

create type reminder_type as enum (
  '24h',      -- Rappel 24h avant le RDV
  '1h'        -- Rappel 1h avant le RDV
);

-- ============================================================
-- TABLE REMINDER_SENT
-- ============================================================

create table reminder_sent (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,

  -- Type de rappel envoyé
  reminder_type reminder_type not null,

  -- Metadata
  sent_at timestamptz not null default now(),

  -- Résultat de l'envoi
  success boolean not null default true,
  error_message text,

  -- Anti-doublon : un seul rappel de chaque type par booking
  constraint reminder_sent_unique unique (booking_id, reminder_type)
);

-- ============================================================
-- INDEXES
-- ============================================================

create index reminder_sent_booking_id_idx on reminder_sent(booking_id);
create index reminder_sent_user_id_idx on reminder_sent(user_id);
create index reminder_sent_sent_at_idx on reminder_sent(sent_at);

-- ============================================================
-- RLS POLICIES
-- ============================================================

alter table reminder_sent enable row level security;

-- Users can read their own reminders
create policy "Users can view their own reminders"
  on reminder_sent for select
  using (auth.uid() = user_id);

-- Service role can insert reminders (cron job)
create policy "Service role can insert reminders"
  on reminder_sent for insert
  with check (true);

-- ============================================================
-- FONCTION: Vérifier si rappel déjà envoyé
-- ============================================================

create or replace function is_reminder_sent(
  p_booking_id uuid,
  p_reminder_type reminder_type
)
returns boolean as $$
declare
  reminder_count integer;
begin
  select count(*)
  into reminder_count
  from reminder_sent
  where booking_id = p_booking_id
    and reminder_type = p_reminder_type;

  return reminder_count > 0;
end;
$$ language plpgsql security definer;
