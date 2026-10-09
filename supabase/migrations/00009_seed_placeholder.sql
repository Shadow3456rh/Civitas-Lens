-- ============================================================================
-- Migration 00009: Auto-create Profile on Auth Signup + Seed Placeholder
-- ============================================================================
-- This trigger automatically creates a profile row when a new user signs up
-- through Supabase Auth. All users start as 'citizen'.
-- ============================================================================

-- Trigger function: create a profile row for every new auth.users row
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'citizen');
  return new;
end;
$$;

-- Wire the trigger to auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

comment on function public.handle_new_user is
  'Auto-creates a profiles row with role=citizen when a user signs up via Supabase Auth.';


-- ============================================================================
-- Seed Placeholder
-- ============================================================================
-- Uncomment and modify the block below to seed initial analyst/admin users.
-- You must first create these users via the Supabase Auth dashboard or API,
-- then update their profile role here.
--
-- Example:
-- update public.profiles
--   set role = 'admin'
--   where id = '00000000-0000-0000-0000-000000000001';
--
-- update public.profiles
--   set role = 'analyst'
--   where id = '00000000-0000-0000-0000-000000000002';
-- ============================================================================
