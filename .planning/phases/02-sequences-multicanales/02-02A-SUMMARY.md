---
phase: 02-sequences-multicanales
plan: 02A
subsystem: database
tags: [database, migration, supabase, sequences, schema, rls]
dependency_graph:
  requires: [001_init_schema.sql, 002_rls_policies.sql]
  provides: [sequence_templates, sequence_template_steps, sequence_instances, sequence_instance_steps, sequence_channel enum, sequence_status enum, step_status enum]
  affects: [interaction_type enum extended with sms]
tech_stack:
  added: [sequence_channel, sequence_status, step_status enums]
  patterns: [RLS user_id-scoped, RLS via EXISTS parent join for child tables, conditional indexes with WHERE clause]
key_files:
  created:
    - supabase/migrations/005_sequences.sql
  modified: []
decisions:
  - "RLS on child tables (sequence_template_steps, sequence_instance_steps) implemented via EXISTS join to parent table rather than direct user_id column — consistent with relational model"
  - "interaction_type enum extended with 'sms' before any new type definitions to satisfy ADD VALUE transaction requirement"
  - "sequence_instance_steps DELETE policy omitted intentionally — deletion cascades via parent sequence_instances"
metrics:
  duration: "138 seconds"
  completed_date: "2026-05-10"
  tasks_completed: 2
  tasks_total: 3
  files_modified: 1
---

# Phase 02 Plan 02A: Sequences Schema Migration Summary

## One-liner

SQL migration 005 delivering complete multichannel sequences schema: 3 enums, 4 tables with FK+indexes, RLS user-scoped policies, and a 3-step demo template seed for the CGP user.

## What Was Built

Migration `supabase/migrations/005_sequences.sql` containing:

1. **Enum extension** — `interaction_type` extended with `'sms'` value (with explicit `COMMIT` before new type definitions to satisfy PostgreSQL ADD VALUE transaction constraint)

2. **3 new enums:**
   - `sequence_channel`: whatsapp, email, sms, call_reminder, linkedin
   - `sequence_status`: active, paused, completed, cancelled
   - `step_status`: pending, sent, failed, skipped

3. **4 new tables:**
   - `sequence_templates` — template definitions owned by user_id
   - `sequence_template_steps` — ordered steps with channel/delay/message per template
   - `sequence_instances` — runtime instances linking user+prospect+template with status tracking
   - `sequence_instance_steps` — runtime step execution with scheduling and status

4. **8 indexes** including 2 partial/conditional:
   - `idx_sequence_templates_stage WHERE auto_trigger = true`
   - `idx_sequence_instances_active WHERE status = 'active'`
   - `idx_sequence_instance_steps_due WHERE status = 'pending'`

5. **15 RLS policies** across 4 tables:
   - Direct `user_id = auth.uid()` for sequence_templates and sequence_instances
   - EXISTS-join to parent for sequence_template_steps and sequence_instance_steps

6. **Demo seed** — Template "Suivi standard prospect" for `amiero.education@gmail.com`:
   - Step 1: WhatsApp J+0 — introduction message
   - Step 2: Email J+2 — follow-up
   - Step 3: Call reminder J+5 — relance call

## Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Enums + 4 tables + extension interaction_type | 6b6c7935 | supabase/migrations/005_sequences.sql (created) |
| 2 | RLS policies + demo seed | 0d3699f6 | supabase/migrations/005_sequences.sql (extended) |

## Pending: Task 3 (checkpoint:human-verify)

Task 3 requires applying the migration on Supabase via `supabase db push` and verifying:
- 4 tables visible in `\dt sequence_*`
- Demo seed: 1 template + 3 steps for the user
- RLS active on all 4 tables (`relrowsecurity = true`)
- `interaction_type` enum contains 'sms'

**This checkpoint must be completed manually before proceeding to plans 02B+.**

## Deviations from Plan

None — plan executed exactly as written. The SQL content was provided verbatim in the plan tasks.

## Self-Check

- [x] `supabase/migrations/005_sequences.sql` exists with 193 lines
- [x] Both commits verified: 6b6c7935, 0d3699f6
- [x] Node verification script passed for both tasks
- [x] 15 create policy statements (plan required >= 14)
- [x] 4 enable row level security statements
- [x] Demo seed block present with 'Suivi standard prospect' template

## Self-Check: PASSED
