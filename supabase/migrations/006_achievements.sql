-- Migration 006 : Achievements & Artefacts (Phase 4)

-- ============================================================
-- TABLE achievements
-- ============================================================

create table achievements (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete cascade not null,
  achievement_key  text not null,
  achievement_type text not null check (achievement_type in ('ca_monthly', 'clients_milestone')),
  label            text not null,
  value            numeric,
  target           numeric,
  achieved_at      timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  unique (user_id, achievement_key)
);

create index idx_achievements_user_id on achievements(user_id);
create index idx_achievements_achieved_at on achievements(achieved_at desc);

-- ============================================================
-- RLS : achievements
-- ============================================================

alter table achievements enable row level security;
create policy "Users can view their own achievements" on achievements
  for select using (auth.uid() = user_id);
create policy "Users can insert their own achievements" on achievements
  for insert with check (auth.uid() = user_id);
