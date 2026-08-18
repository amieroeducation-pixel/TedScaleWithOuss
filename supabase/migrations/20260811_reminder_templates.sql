-- Ted Scale With Ouss — Rappels SMS automatiques
-- Migration 20260811: Table reminder_templates pour templates SMS configurables

-- ============================================================
-- TABLE REMINDER_TEMPLATES
-- ============================================================

create table reminder_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,

  -- Type de template (correspond au reminder_type)
  template_type reminder_type not null,

  -- Contenu du template (avec variables Handlebars)
  -- Variables disponibles: {nom}, {date}, {heure}, {lieu}
  content text not null,

  -- Metadata
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Un seul template de chaque type par user
  constraint reminder_templates_unique unique (user_id, template_type)
);

-- ============================================================
-- INDEXES
-- ============================================================

create index reminder_templates_user_id_idx on reminder_templates(user_id);

-- ============================================================
-- RLS POLICIES
-- ============================================================

alter table reminder_templates enable row level security;

-- Users can manage their own templates
create policy "Users can view their own templates"
  on reminder_templates for select
  using (auth.uid() = user_id);

create policy "Users can insert their own templates"
  on reminder_templates for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own templates"
  on reminder_templates for update
  using (auth.uid() = user_id);

create policy "Users can delete their own templates"
  on reminder_templates for delete
  using (auth.uid() = user_id);

-- ============================================================
-- TRIGGER: updated_at
-- ============================================================

create or replace function update_reminder_templates_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger reminder_templates_updated_at
  before update on reminder_templates
  for each row
  execute function update_reminder_templates_updated_at();

-- ============================================================
-- SEED: Templates par défaut
-- ============================================================

-- Note: Ces templates seront insérés automatiquement lors de la première utilisation
-- via l'API si l'utilisateur n'en a pas encore créé
