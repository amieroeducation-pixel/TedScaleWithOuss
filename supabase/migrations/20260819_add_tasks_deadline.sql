-- Migration: Add deadline column to tasks table

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deadline date;

CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(user_id, deadline) WHERE deadline IS NOT NULL;
