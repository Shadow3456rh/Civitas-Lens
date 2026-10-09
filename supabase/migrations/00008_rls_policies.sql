-- ============================================================================
-- Migration 00008: Enable RLS & Create Policies
-- ============================================================================
-- Design philosophy:
--   • Anonymous users (anon) can INSERT observations (submission is public).
--   • Users can only read their OWN observations (not others').
--   • Analysts and admins can read/update everything.
--   • Public reads incidents only through the public_incidents view.
--   • The backend (service_role) bypasses RLS entirely for pipeline writes.
--
-- IMPORTANT: Supabase service_role key bypasses RLS. All backend writes
-- (incident creation, observation updates, merging) use service_role.
-- ============================================================================

-- Helper function: check if the current user has analyst or admin role
create or replace function public.is_privileged_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('analyst', 'admin')
  );
$$;

comment on function public.is_privileged_user is
  'Returns true if the authenticated user is an analyst or admin. Used in RLS policies.';


-- ========================
-- PROFILES
-- ========================
alter table public.profiles enable row level security;

-- Users can read their own profile
create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

-- Analysts/admins can read all profiles
create policy "profiles_select_privileged"
  on public.profiles for select
  using (public.is_privileged_user());

-- Users can update their own profile (but not change role — enforced by app)
create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid());

-- Admins can update any profile (role changes)
create policy "profiles_update_admin"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Profile insert happens via a trigger on auth.users (see seed), or by admin
create policy "profiles_insert_self"
  on public.profiles for insert
  with check (id = auth.uid());


-- ========================
-- OBSERVATIONS
-- ========================
alter table public.observations enable row level security;

-- Anyone (including anon/unauthenticated) can INSERT observations.
-- This is the core citizen submission flow. Rate limiting is handled
-- in the application layer (API route middleware).
create policy "observations_insert_anon"
  on public.observations for insert
  to anon, authenticated
  with check (true);

-- Authenticated users can read ONLY their own observations.
-- This prevents citizens from browsing other people's raw reports.
create policy "observations_select_own"
  on public.observations for select
  to authenticated
  using (reporter_id = auth.uid());

-- Analysts/admins can read ALL observations for triage and review.
create policy "observations_select_privileged"
  on public.observations for select
  to authenticated
  using (public.is_privileged_user());

-- Analysts/admins can update observations (e.g. change processing_status,
-- link to incident). Regular users cannot modify submitted observations.
create policy "observations_update_privileged"
  on public.observations for update
  to authenticated
  using (public.is_privileged_user());


-- ========================
-- INCIDENTS
-- ========================
alter table public.incidents enable row level security;

-- Public can read incidents (the view public_incidents filters fields,
-- but the underlying table also needs a SELECT policy for the view to work).
-- We allow all authenticated users to read incidents.
create policy "incidents_select_authenticated"
  on public.incidents for select
  to authenticated
  using (true);

-- Anonymous users can read incidents (needed for public_incidents view).
create policy "incidents_select_anon"
  on public.incidents for select
  to anon
  using (true);

-- Only analysts/admins can insert incidents (backend uses service_role,
-- but this policy covers direct authenticated access).
create policy "incidents_insert_privileged"
  on public.incidents for insert
  to authenticated
  with check (public.is_privileged_user());

-- Only analysts/admins can update incidents.
create policy "incidents_update_privileged"
  on public.incidents for update
  to authenticated
  using (public.is_privileged_user());


-- ========================
-- INCIDENT_EVENTS
-- ========================
alter table public.incident_events enable row level security;

-- Analysts/admins can read the full audit timeline.
create policy "incident_events_select_privileged"
  on public.incident_events for select
  to authenticated
  using (public.is_privileged_user());

-- Authenticated users can read events for incidents they have observations in.
-- This lets citizens see the timeline of incidents they contributed to.
create policy "incident_events_select_contributor"
  on public.incident_events for select
  to authenticated
  using (
    exists (
      select 1 from public.observations o
      where o.incident_id = incident_events.incident_id
        and o.reporter_id = auth.uid()
    )
  );

-- Only privileged users (or service_role) can insert events.
create policy "incident_events_insert_privileged"
  on public.incident_events for insert
  to authenticated
  with check (public.is_privileged_user());


-- ========================
-- LINK_DECISIONS
-- ========================
alter table public.link_decisions enable row level security;

-- Only analysts/admins can view link decisions (audit/explainability data).
create policy "link_decisions_select_privileged"
  on public.link_decisions for select
  to authenticated
  using (public.is_privileged_user());

-- Only privileged users (or service_role) can insert link decisions.
create policy "link_decisions_insert_privileged"
  on public.link_decisions for insert
  to authenticated
  with check (public.is_privileged_user());


-- ========================
-- STORAGE: evidence bucket policies
-- ========================

-- Authenticated users can upload to the evidence bucket.
-- Path convention: evidence/{user_id}/{observation_id}/{filename}
create policy "evidence_insert_authenticated"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'evidence');

-- Anonymous users can also upload (for anon observation submissions)
create policy "evidence_insert_anon"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'evidence');

-- Analysts/admins can read all evidence files
create policy "evidence_select_privileged"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'evidence'
    and public.is_privileged_user()
  );

-- Users can read their own uploaded evidence
create policy "evidence_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
