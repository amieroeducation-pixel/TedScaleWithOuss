-- Migration 010: user tasks

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  priority int NOT NULL DEFAULT 2 CHECK (priority BETWEEN 1 AND 4),
  col text NOT NULL DEFAULT 'todo' CHECK (col IN ('todo','inprogress','waiting','blocked','done')),
  estimated_time text NOT NULL DEFAULT '',
  badge text NOT NULL DEFAULT '',
  urgency text NOT NULL DEFAULT 'normal' CHECK (urgency IN ('urgent','normal')),
  this_week boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users manage own tasks" ON tasks
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id, col, created_at DESC);
