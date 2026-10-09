-- ============================================================================
-- Migration 00011: Auth User Profile Auto-Creation & Admin Promotion Helper
-- ============================================================================
-- 1. Triggers automatic creation of a profiles row with role='citizen'
--    whenever a user signs up via Supabase Auth.
-- 2. Provides helper function to easily promote accounts to admin or analyst.
-- ============================================================================

-- Ensure profile creation function exists and is idempotent
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'citizen')
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Drop trigger if exists and recreate
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

comment on function public.handle_new_user is
  'Automatically creates a profiles record with role=citizen upon user signup.';

-- Helper function: promote user account to admin or analyst by email
create or replace function public.promote_user_to_role(
  target_email text,
  target_role public.user_role default 'admin'
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from auth.users where email = target_email;

  if v_user_id is null then
    return 'Error: No user found with email ' || target_email;
  end if;

  insert into public.profiles (id, role)
  values (v_user_id, target_role)
  on conflict (id) do update set role = target_role;

  return 'Success: User ' || target_email || ' is now ' || target_role || '.';
end;
$$;

comment on function public.promote_user_to_role is
  'Convenience function to promote an auth user to analyst or admin by email address.';
