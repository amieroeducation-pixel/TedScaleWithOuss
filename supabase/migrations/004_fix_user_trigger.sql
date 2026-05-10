-- Migration 004: Fix user settings trigger (bypass RLS during signup)

-- Drop and recreate trigger function with explicit search_path
-- security definer + search_path = public ensures RLS is bypassed
create or replace function create_user_settings_on_signup()
returns trigger as $$
begin
  insert into public.user_settings (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Also allow service role to bypass RLS on user_settings
-- (needed for admin user creation via API)
create policy "user_settings: service_role bypass"
  on user_settings for all
  to service_role
  using (true)
  with check (true);
