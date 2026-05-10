---
phase: 02-sequences-multicanales
plan: 02A
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/migrations/005_sequences.sql
autonomous: false
requirements: [SEQ-02, SEQ-03, SEQ-04, SEQ-05, SEQ-06, SEQ-07, SEQ-08, SEQ-09, SEQ-10]
tags: [database, migration, supabase, sequences, schema]

must_haves:
  truths:
    - "Les 4 nouvelles tables (sequence_templates, sequence_template_steps, sequence_instances, sequence_instance_steps) existent en BDD"
    - "L'enum interaction_type contient désormais la valeur 'sms'"
    - "Un template de séquence de démo (3 étapes) est seedé pour le user actif"
    - "RLS est activée sur les 4 nouvelles tables avec policies user_id-scoped"
    - "L'utilisateur peut SELECT/INSERT sur ses propres sequence_instances depuis le client Supabase authentifié"
  artifacts:
    - path: "supabase/migrations/005_sequences.sql"
      provides: "Schéma DB séquences + enums + RLS + seed démo"
      contains: "create table sequence_templates"
  key_links:
    - from: "sequence_template_steps.template_id"
      to: "sequence_templates.id"
      via: "FK on delete cascade"
      pattern: "references sequence_templates\\(id\\) on delete cascade"
    - from: "sequence_instance_steps.instance_id"
      to: "sequence_instances.id"
      via: "FK on delete cascade"
      pattern: "references sequence_instances\\(id\\) on delete cascade"
---

## Phase Goal

**As a** CGP utilisant le dashboard, **I want to** disposer en BDD de la structure complète permettant de définir, lancer et tracer des séquences multicanales sur mes prospects, **so that** je puisse construire au-dessus le moteur applicatif et l'UI sans avoir à modifier le schéma plus tard.

<objective>
Créer la migration Supabase 005 qui livre l'intégralité du socle DB nécessaire au moteur de séquences : 3 enums (sequence_channel, sequence_status, step_status), 4 tables avec FK + index, étendre l'enum interaction_type avec 'sms', activer RLS user_id-scoped sur les 4 tables, et seed d'un template de démo.

Purpose: Sans ces tables, aucune des couches suivantes (lib, API, UI) ne peut fonctionner. C'est le bloc fondateur de la Phase 2. L'extension d'enum 'sms' DOIT être dans cette migration AVANT toute insertion d'interaction SMS (Pitfall 1 du RESEARCH).
Output: Une migration SQL appliquée sur Supabase, vérifiable via `supabase db push` puis `\d sequence_templates` dans psql.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/02-sequences-multicanales/02-RESEARCH.md
@supabase/migrations/001_init_schema.sql
@supabase/migrations/002_rls_policies.sql

<interfaces>
<!-- Enums et tables existants à respecter -->

Depuis 001_init_schema.sql :
```sql
create type pipeline_stage as enum ('a_contacter', 'rdv1', 'rdv2', 'rdv3', 'converti', 'perdu');
create type interaction_type as enum ('appel', 'rdv1', 'rdv2', 'rdv3', 'email', 'whatsapp', 'linkedin', 'autre');
-- Table prospects (id uuid, user_id uuid)
-- Table interactions (id, user_id, prospect_id, type interaction_type, ...)
```

Pattern RLS établi (depuis 002_rls_policies.sql) :
```sql
alter table {table} enable row level security;
create policy "Users can view their own {resource}" on {table}
  for select using (auth.uid() = user_id);
create policy "Users can insert their own {resource}" on {table}
  for insert with check (auth.uid() = user_id);
create policy "Users can update their own {resource}" on {table}
  for update using (auth.uid() = user_id);
create policy "Users can delete their own {resource}" on {table}
  for delete using (auth.uid() = user_id);
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Créer la migration 005_sequences.sql avec enums + 4 tables + extension interaction_type</name>
  <read_first>
    - supabase/migrations/001_init_schema.sql (pour respecter style/conventions)
    - supabase/migrations/002_rls_policies.sql (pour pattern RLS)
    - .planning/phases/02-sequences-multicanales/02-RESEARCH.md (Pattern 1 : Schéma DB)
  </read_first>
  <files>supabase/migrations/005_sequences.sql</files>
  <action>
Créer le fichier `supabase/migrations/005_sequences.sql` avec, dans cet ordre EXACT :

1. Header de commentaire indiquant `-- Migration 005 : Sequences multicanales (Phase 2)`

2. **Étendre enum interaction_type AVANT toute autre opération** (Pitfall 1 RESEARCH) :
```sql
ALTER TYPE interaction_type ADD VALUE IF NOT EXISTS 'sms';
COMMIT;
```
Note : `ADD VALUE` doit être commité avant utilisation — laisser le COMMIT explicite.

3. Créer les 3 nouveaux enums :
```sql
create type sequence_channel as enum ('whatsapp', 'email', 'sms', 'call_reminder', 'linkedin');
create type sequence_status as enum ('active', 'paused', 'completed', 'cancelled');
create type step_status as enum ('pending', 'sent', 'failed', 'skipped');
```

4. Créer la table `sequence_templates` (champs exacts du Pattern 1 RESEARCH) :
```sql
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
```

5. Créer la table `sequence_template_steps` :
```sql
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
```

6. Créer la table `sequence_instances` :
```sql
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
```

7. Créer la table `sequence_instance_steps` :
```sql
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
```

NE PAS inclure le seed dans cette tâche — c'est la Task 2 (afin de pouvoir vérifier que la création des tables est correcte avant l'insert).
  </action>
  <verify>
    <automated>node -e "const fs=require('fs');const s=fs.readFileSync('supabase/migrations/005_sequences.sql','utf8');const need=['ADD VALUE IF NOT EXISTS \\'sms\\'','create type sequence_channel','create type sequence_status','create type step_status','create table sequence_templates','create table sequence_template_steps','create table sequence_instances','create table sequence_instance_steps','idx_sequence_instances_active','idx_sequence_instance_steps_due'];const m=need.filter(n=>!s.includes(n));if(m.length){console.error('MISSING:',m);process.exit(1)}console.log('OK')"</automated>
  </verify>
  <acceptance_criteria>
    - Le fichier `supabase/migrations/005_sequences.sql` existe
    - Il contient `ALTER TYPE interaction_type ADD VALUE IF NOT EXISTS 'sms'`
    - Il contient les 3 `create type` (sequence_channel, sequence_status, step_status)
    - Il contient les 4 `create table` exacts
    - Il contient les 6 index nommés `idx_sequence_*`
    - Il contient `unique (template_id, step_order)` sur sequence_template_steps
    - Aucune table ne référence `auth.uid()` dans une colonne (uniquement dans les RLS de Task 2)
  </acceptance_criteria>
  <done>Migration créée avec schéma + enums + index, sans encore RLS ni seed.</done>
</task>

<task type="auto">
  <name>Task 2: Ajouter RLS policies + seed template démo dans la migration 005</name>
  <read_first>
    - supabase/migrations/005_sequences.sql (créé en Task 1)
    - supabase/migrations/002_rls_policies.sql (pattern RLS exact)
  </read_first>
  <files>supabase/migrations/005_sequences.sql</files>
  <action>
APPEND (ne pas réécrire) à la fin de `supabase/migrations/005_sequences.sql` :

1. **Activer RLS et créer policies pour les 4 tables.** Pour les tables possédant `user_id` directement (`sequence_templates`, `sequence_instances`), policies basées sur `auth.uid() = user_id`. Pour les tables enfants (`sequence_template_steps`, `sequence_instance_steps`), policies basées sur l'EXISTS du parent.

```sql
-- RLS sequence_templates
alter table sequence_templates enable row level security;
create policy "Users can view their own sequence_templates" on sequence_templates
  for select using (auth.uid() = user_id);
create policy "Users can insert their own sequence_templates" on sequence_templates
  for insert with check (auth.uid() = user_id);
create policy "Users can update their own sequence_templates" on sequence_templates
  for update using (auth.uid() = user_id);
create policy "Users can delete their own sequence_templates" on sequence_templates
  for delete using (auth.uid() = user_id);

-- RLS sequence_template_steps (via parent)
alter table sequence_template_steps enable row level security;
create policy "Users can view their own sequence_template_steps" on sequence_template_steps
  for select using (exists (
    select 1 from sequence_templates t
    where t.id = sequence_template_steps.template_id and t.user_id = auth.uid()
  ));
create policy "Users can insert their own sequence_template_steps" on sequence_template_steps
  for insert with check (exists (
    select 1 from sequence_templates t
    where t.id = sequence_template_steps.template_id and t.user_id = auth.uid()
  ));
create policy "Users can update their own sequence_template_steps" on sequence_template_steps
  for update using (exists (
    select 1 from sequence_templates t
    where t.id = sequence_template_steps.template_id and t.user_id = auth.uid()
  ));
create policy "Users can delete their own sequence_template_steps" on sequence_template_steps
  for delete using (exists (
    select 1 from sequence_templates t
    where t.id = sequence_template_steps.template_id and t.user_id = auth.uid()
  ));

-- RLS sequence_instances
alter table sequence_instances enable row level security;
create policy "Users can view their own sequence_instances" on sequence_instances
  for select using (auth.uid() = user_id);
create policy "Users can insert their own sequence_instances" on sequence_instances
  for insert with check (auth.uid() = user_id);
create policy "Users can update their own sequence_instances" on sequence_instances
  for update using (auth.uid() = user_id);
create policy "Users can delete their own sequence_instances" on sequence_instances
  for delete using (auth.uid() = user_id);

-- RLS sequence_instance_steps (via parent)
alter table sequence_instance_steps enable row level security;
create policy "Users can view their own sequence_instance_steps" on sequence_instance_steps
  for select using (exists (
    select 1 from sequence_instances i
    where i.id = sequence_instance_steps.instance_id and i.user_id = auth.uid()
  ));
create policy "Users can insert their own sequence_instance_steps" on sequence_instance_steps
  for insert with check (exists (
    select 1 from sequence_instances i
    where i.id = sequence_instance_steps.instance_id and i.user_id = auth.uid()
  ));
create policy "Users can update their own sequence_instance_steps" on sequence_instance_steps
  for update using (exists (
    select 1 from sequence_instances i
    where i.id = sequence_instance_steps.instance_id and i.user_id = auth.uid()
  ));
```

2. **Seed du template de démonstration** pour le user `amiero.education@gmail.com`.

```sql
-- Seed : template de démo "Suivi standard prospect"
do $$
declare
  v_user_id uuid;
  v_template_id uuid;
begin
  select id into v_user_id from auth.users where email = 'amiero.education@gmail.com' limit 1;
  if v_user_id is null then
    raise notice 'User amiero.education@gmail.com introuvable — seed ignoré';
    return;
  end if;

  insert into sequence_templates (user_id, name, pipeline_stage, auto_trigger)
  values (v_user_id, 'Suivi standard prospect', null, false)
  returning id into v_template_id;

  insert into sequence_template_steps (template_id, step_order, channel, delay_days, message_template) values
    (v_template_id, 1, 'whatsapp', 0, 'Bonjour {{prenom}}, suite à notre échange je vous joins ma carte. Je reste disponible.'),
    (v_template_id, 2, 'email', 2, 'Bonjour {{nom}},\n\nJe me permets de revenir vers vous suite à notre premier contact. Souhaitez-vous fixer un RDV pour approfondir ?\n\nBien cordialement,\nTed'),
    (v_template_id, 3, 'call_reminder', 5, 'Rappeler {{nom}} ({{telephone}}) — relance J+5');
end $$;
```

3. Garder TOUT le contenu existant de la Task 1 — uniquement APPEND à la fin.
  </action>
  <verify>
    <automated>node -e "const fs=require('fs');const s=fs.readFileSync('supabase/migrations/005_sequences.sql','utf8');const need=['enable row level security','Users can view their own sequence_templates','Users can insert their own sequence_template_steps','Users can update their own sequence_instances','Users can view their own sequence_instance_steps','Suivi standard prospect','amiero.education@gmail.com','call_reminder'];const m=need.filter(n=>!s.includes(n));if(m.length){console.error('MISSING:',m);process.exit(1)}const policyCount=(s.match(/create policy/g)||[]).length;if(policyCount<14){console.error('POLICY COUNT',policyCount,'expected >=14');process.exit(1)}console.log('OK policies='+policyCount)"</automated>
  </verify>
  <acceptance_criteria>
    - Au moins 14 `create policy` présents (4 sur templates + 4 sur instances + 4 sur template_steps + 3 sur instance_steps — sans delete sur instance_steps car cascade via parent)
    - `enable row level security` apparaît 4 fois
    - Le bloc `do $$ ... end $$;` de seed est présent
    - Le template de démo nomme exactement 'Suivi standard prospect'
    - Le seed insère 3 steps (whatsapp J+0, email J+2, call_reminder J+5)
    - Le contenu de Task 1 reste intact (les 4 `create table` toujours présents)
  </acceptance_criteria>
  <done>Migration complète prête à être appliquée — schéma + RLS + seed.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Appliquer la migration 005 sur Supabase et vérifier</name>
  <what-built>
    Migration `005_sequences.sql` créée avec 4 tables, 3 nouveaux enums, extension de l'enum `interaction_type` avec 'sms', RLS user_id-scoped, et seed d'un template de démo.
  </what-built>
  <how-to-verify>
    1. Depuis le dossier projet, ouvrir un terminal PowerShell et exécuter :
       ```powershell
       supabase db push
       ```
       Attendu : `Applying migration 005_sequences.sql...` puis `Finished supabase db push.`

    2. Vérifier en SQL (Supabase Studio > SQL Editor ou `supabase db remote sql`) :
       ```sql
       select count(*) from sequence_templates where name = 'Suivi standard prospect';
       -- Attendu : 1

       select count(*) from sequence_template_steps;
       -- Attendu : 3 (les 3 étapes du seed)

       select unnest(enum_range(null::interaction_type));
       -- Attendu : doit contenir 'sms' dans la liste

       select unnest(enum_range(null::sequence_channel));
       -- Attendu : whatsapp, email, sms, call_reminder, linkedin
       ```

    3. Vérifier RLS active :
       ```sql
       select relname, relrowsecurity from pg_class
       where relname in ('sequence_templates','sequence_template_steps','sequence_instances','sequence_instance_steps');
       -- Attendu : 4 lignes, toutes avec relrowsecurity = true
       ```

    Si erreur "type sequence_channel already exists" : la migration a été partiellement appliquée — exécuter `drop type if exists sequence_channel cascade;` (et autres) puis re-pusher.

    Si erreur "auth.users not found" : utiliser le bon schéma — le `select id into v_user_id from auth.users` doit fonctionner directement (pas de schéma à préfixer).
  </how-to-verify>
  <resume-signal>Tape "approved" si migration appliquée et seed visible, ou décris l'erreur rencontrée.</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Client Supabase → BDD | Toute requête authentifiée doit être filtrée par RLS user_id |
| Migration SQL → BDD prod | Le seed insère des données rattachées au user CGP courant |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02A-01 | Information Disclosure | sequence_templates / instances | mitigate | RLS `auth.uid() = user_id` SELECT/INSERT/UPDATE/DELETE — défini en Task 2 |
| T-02A-02 | Elevation of Privilege | sequence_template_steps / instance_steps | mitigate | RLS via EXISTS sur table parente (joins user_id) — défini en Task 2 |
| T-02A-03 | Tampering | enum interaction_type | mitigate | `ADD VALUE IF NOT EXISTS` idempotent + COMMIT explicite avant utilisation |
| T-02A-04 | Denial of Service | sequence_instance_steps via cron | accept | Volume très faible (single user CGP) — pas de limites nécessaires Phase 2 |
</threat_model>

<verification>
- `supabase db push` ne renvoie pas d'erreur
- Les 4 tables sont visibles dans `\dt sequence_*`
- Le seed crée 1 template + 3 steps pour `amiero.education@gmail.com`
- RLS empêche un autre user de lire les templates (vérifié manuellement Phase 2 ultérieurement)
</verification>

<success_criteria>
- Migration 005_sequences.sql appliquée sur Supabase
- 4 tables existent avec FK + index conformes au RESEARCH Pattern 1
- enum `interaction_type` contient `'sms'`
- enum `sequence_channel` contient les 5 canaux
- 1 template de démo seedé pour le user actif
- RLS active sur les 4 tables (relrowsecurity = true)
</success_criteria>

<output>
After completion, create `.planning/phases/02-sequences-multicanales/02-02A-SUMMARY.md`
</output>
