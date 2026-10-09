-- ##########################################################################
--  CIVITAS LENS — COMBINED SUPABASE MIGRATION
--  Run this single file in the Supabase SQL Editor to set up the entire
--  database schema, indexes, functions, views, RLS policies, storage, and
--  seed trigger in one go.
-- ##########################################################################


-- ============================================================================
-- 1. ENABLE REQUIRED EXTENSIONS
-- ============================================================================
-- PostGIS adds geography/geometry types and spatial functions (ST_DWithin,
-- ST_Distance, ST_MakePoint, etc.) needed for observation→incident correlation.
-- ============================================================================

create extension if not exists "postgis" with schema "extensions";

-- uuid-ossp for gen_random_uuid() fallback (Supabase usually has this, but
-- declaring it explicitly ensures portability).
create extension if not exists "uuid-ossp" with schema "extensions";


-- ============================================================================
-- 2. CREATE CUSTOM ENUM TYPES
-- ============================================================================
-- Enums enforce valid values at the database level, complementing Zod
-- validation in the application layer.
-- ============================================================================

-- User roles: citizen (default public), analyst (internal), admin (full control)
create type public.user_role as enum ('citizen', 'analyst', 'admin');

-- Observation modality: text and image now; audio reserved for future use
create type public.observation_modality as enum ('text', 'image', 'audio');

-- Incident severity scale (matches Badge component variants)
create type public.incident_severity as enum ('low', 'medium', 'high', 'critical');

-- Incident lifecycle status (matches Badge status variants)
create type public.incident_status as enum (
  'new', 'under_review', 'active', 'resolved', 'archived'
);

-- Observation processing pipeline state
create type public.processing_status as enum (
  'pending', 'processed', 'needs_review', 'failed'
);

-- Timeline event types for the incident_events audit log
create type public.event_type as enum (
  'created',
  'observation_added',
  'status_changed',
  'summary_updated',
  'severity_changed'
);


-- ============================================================================
-- 3. CREATE CORE TABLES
-- ============================================================================
-- Tables follow the project's data model: observations are submitted by
-- citizens, correlated into incidents by AI + backend validation, with full
-- audit trails via incident_events and link_decisions.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- profiles: extends auth.users with application-specific role
-- ---------------------------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       public.user_role not null default 'citizen',
  created_at timestamptz      not null default now()
);

comment on table public.profiles is
  'Application profile for each authenticated user. Role determines RLS access.';

-- ---------------------------------------------------------------------------
-- incidents: correlated, validated clusters of observations
-- ---------------------------------------------------------------------------
create table public.incidents (
  id                uuid primary key default gen_random_uuid(),
  title             text                   not null,
  category          text                   not null,
  severity          public.incident_severity not null default 'low',
  status            public.incident_status   not null default 'new',
  summary           text,
  -- PostGIS geography point (SRID 4326 = WGS 84, the GPS standard)
  centroid          geography(Point, 4326),
  first_seen_at     timestamptz            not null default now(),
  last_seen_at      timestamptz            not null default now(),
  observation_count integer                not null default 0,
  created_at        timestamptz            not null default now()
);

comment on table public.incidents is
  'Validated incident clusters. The backend is the sole writer; AI proposes, backend decides.';

-- ---------------------------------------------------------------------------
-- observations: raw citizen reports (always preserved as evidence)
-- ---------------------------------------------------------------------------
create table public.observations (
  id                uuid primary key default gen_random_uuid(),
  -- nullable: observations start unlinked, then get merged into an incident
  incident_id       uuid references public.incidents(id) on delete set null,
  -- nullable: anonymous submissions allowed (rate-limited in app layer)
  reporter_id       uuid references public.profiles(id) on delete set null,
  modality          public.observation_modality not null default 'text',
  raw_text          text                        not null,
  image_path        text,                       -- Storage bucket path
  audio_path        text,                       -- reserved for future audio support
  -- PostGIS geography point (SRID 4326)
  location          geography(Point, 4326)      not null,
  location_label    text,                       -- human-readable place name
  observed_at       timestamptz                 not null default now(),
  category          text,                       -- AI-extracted or user-selected
  severity          public.incident_severity,   -- AI-assessed
  summary           text,                       -- AI-generated summary
  location_context  text,                       -- AI-generated location context
  key_entities      jsonb       default '[]'::jsonb,  -- AI-extracted entities
  processing_status public.processing_status not null default 'pending',
  ai_raw            jsonb,                      -- raw LLM response for debugging
  created_at        timestamptz             not null default now()
);

comment on table public.observations is
  'Raw citizen observations. Original evidence is never mutated. AI enriches the extracted fields.';

-- ---------------------------------------------------------------------------
-- incident_events: audit timeline for each incident
-- ---------------------------------------------------------------------------
create table public.incident_events (
  id             uuid primary key default gen_random_uuid(),
  incident_id    uuid               not null references public.incidents(id) on delete cascade,
  observation_id uuid               references public.observations(id) on delete set null,
  type           public.event_type  not null,
  note           text,
  created_at     timestamptz        not null default now()
);

comment on table public.incident_events is
  'Immutable timeline of everything that happened to an incident. Powers the audit trail UI.';

-- ---------------------------------------------------------------------------
-- link_decisions: AI + backend correlation audit log (explainability)
-- ---------------------------------------------------------------------------
create table public.link_decisions (
  id                    uuid primary key default gen_random_uuid(),
  observation_id        uuid    not null references public.observations(id) on delete cascade,
  candidate_incident_id uuid    not null references public.incidents(id) on delete cascade,
  -- What the LLM decided
  gemma_related         boolean not null,
  gemma_reason          text,
  -- What the backend validation decided
  passed_validation     boolean not null,
  distance_m            double precision,  -- ST_Distance result in metres
  time_diff_min         double precision,  -- time gap in minutes
  created_at            timestamptz not null default now()
);

comment on table public.link_decisions is
  'Every AI correlation proposal + backend validation result. Full explainability for each merge/reject.';


-- ============================================================================
-- 4. CREATE INDEXES
-- ============================================================================
-- GIST indexes on geography columns enable fast spatial queries (ST_DWithin).
-- B-tree indexes on status/category/last_seen_at speed up dashboard filters.
-- ============================================================================

-- Spatial indexes (GIST) on geography columns for ST_DWithin / ST_Distance
create index idx_incidents_centroid
  on public.incidents using gist (centroid);

create index idx_observations_location
  on public.observations using gist (location);

-- B-tree indexes for common dashboard/filter queries
create index idx_incidents_status
  on public.incidents (status);

create index idx_incidents_category
  on public.incidents (category);

create index idx_incidents_last_seen_at
  on public.incidents (last_seen_at desc);

create index idx_incidents_severity
  on public.incidents (severity);

-- Observation lookup indexes
create index idx_observations_incident_id
  on public.observations (incident_id);

create index idx_observations_processing_status
  on public.observations (processing_status);

create index idx_observations_observed_at
  on public.observations (observed_at desc);

create index idx_observations_reporter_id
  on public.observations (reporter_id);

-- Event timeline queries
create index idx_incident_events_incident_id
  on public.incident_events (incident_id, created_at desc);

-- Link decision audit queries
create index idx_link_decisions_observation_id
  on public.link_decisions (observation_id);

create index idx_link_decisions_candidate_incident_id
  on public.link_decisions (candidate_incident_id);


-- ============================================================================
-- 5. CREATE STORAGE BUCKET
-- ============================================================================
-- Private "evidence" bucket for observation images (and future audio).
-- Files are accessed through signed URLs generated server-side only.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evidence',
  'evidence',
  false,              -- private: no public access, signed URLs only
  5242880,            -- 5 MB max per file
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'audio/mpeg',     -- reserved for future audio support
    'audio/wav',      -- reserved for future audio support
    'audio/webm'      -- reserved for future audio support
  ]
);


-- ============================================================================
-- 6. CREATE SQL FUNCTIONS
-- ============================================================================
-- find_candidate_incidents: the core spatial+temporal query that retrieves
-- nearby recent incidents for AI correlation. Called by the server-side
-- observation processing pipeline.
-- ============================================================================

create or replace function public.find_candidate_incidents(
  lat          double precision,    -- observation latitude
  lng          double precision,    -- observation longitude
  radius_m     double precision,    -- search radius in metres
  since        timestamptz,         -- only incidents active after this time
  cat          text                 -- category to match (exact match)
)
returns table (
  id                uuid,
  title             text,
  category          text,
  severity          public.incident_severity,
  status            public.incident_status,
  summary           text,
  centroid          geography(Point, 4326),
  first_seen_at     timestamptz,
  last_seen_at      timestamptz,
  observation_count integer,
  distance_m        double precision
)
language sql
stable                         -- does not modify data; safe for read replicas
security definer               -- runs with table owner privileges (bypasses RLS)
set search_path = public       -- explicit search_path for security
as $$
  select
    i.id,
    i.title,
    i.category,
    i.severity,
    i.status,
    i.summary,
    i.centroid,
    i.first_seen_at,
    i.last_seen_at,
    i.observation_count,
    -- Distance in metres from the observation point to the incident centroid
    ST_Distance(
      i.centroid,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) as distance_m
  from public.incidents i
  where
    -- Spatial filter: incident centroid within radius_m of the observation
    ST_DWithin(
      i.centroid,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      radius_m
    )
    -- Temporal filter: incident was active after the given timestamp
    and i.last_seen_at >= since
    -- Category filter: exact match
    and i.category = cat
    -- Only consider open incidents (not resolved/archived)
    and i.status not in ('resolved', 'archived')
  order by distance_m asc
  limit 5;
$$;

comment on function public.find_candidate_incidents is
  'Finds up to 5 nearby open incidents matching category, within radius_m metres and since a given time. Used by the server-side correlation pipeline.';


-- ============================================================================
-- 7. CREATE VIEW FOR PUBLIC INCIDENT DATA
-- ============================================================================
-- public_incidents exposes only non-sensitive incident fields to anonymous
-- users. Internal fields (AI summaries, raw data) are excluded.
-- ============================================================================

create or replace view public.public_incidents as
  select
    i.id,
    i.title,
    i.category,
    i.severity,
    i.status,
    -- Summary is considered public (it's an AI-generated plain-language overview)
    i.summary,
    -- Expose centroid as lat/lng for map display
    ST_Y(i.centroid::geometry) as latitude,
    ST_X(i.centroid::geometry) as longitude,
    i.first_seen_at,
    i.last_seen_at,
    i.observation_count,
    i.created_at
  from public.incidents i
  where
    -- Only show incidents that are public-facing (not archived)
    i.status != 'archived';

comment on view public.public_incidents is
  'Read-only view of incidents with only non-sensitive fields. Accessible to anonymous users for the public dashboard.';


-- ============================================================================
-- 8. ENABLE RLS & CREATE POLICIES
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

-- Profile insert happens via a trigger on auth.users (see below), or by admin
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


-- ============================================================================
-- 9. AUTO-CREATE PROFILE ON AUTH SIGNUP + SEED PLACEHOLDER
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


-- ============================================================================
-- 10. ADD CAPTURE METADATA & OPTIONAL RAW TEXT
-- ============================================================================
alter table public.observations
  alter column raw_text drop not null;

alter table public.observations
  add column if not exists location_accuracy_m numeric,
  add column if not exists capture_source text check (capture_source in ('live_camera', 'gallery_upload')),
  add column if not exists location_source text check (location_source in ('gps', 'manual_pin')),
  add column if not exists captured_at timestamptz;

comment on column public.observations.location_accuracy_m is
  'GPS accuracy radius in metres reported by device at the moment of capture';
comment on column public.observations.capture_source is
  'Whether the photo was captured live in-app or uploaded from photo gallery';
comment on column public.observations.location_source is
  'Whether location was locked via hardware GPS or placed manually on map';
comment on column public.observations.captured_at is
  'Exact timestamp when photo shutter was pressed or upload occurred';

-- ============================================================================
-- 11. AUTH USER PROFILE TRIGGER & PROMOTION HELPER
-- ============================================================================
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

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

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


-- ============================================================================
-- Migration 00012: Add Citizen Complaint Fields and Reference Code
-- ============================================================================
alter table public.observations
  add column if not exists user_category text,
  add column if not exists user_urgency text check (user_urgency in ('low', 'medium', 'high')),
  add column if not exists reporter_name text,
  add column if not exists reporter_contact text,
  add column if not exists reference_code text unique;

create sequence if not exists public.observation_ref_seq start with 100001;

create or replace function public.generate_observation_ref_code()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.reference_code is null or new.reference_code = '' then
    new.reference_code := 'CL-' || to_char(coalesce(new.created_at, now()), 'YYYY') || '-' || lpad(nextval('public.observation_ref_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trigger_generate_observation_ref_code on public.observations;
create trigger trigger_generate_observation_ref_code
  before insert on public.observations
  for each row
  execute function public.generate_observation_ref_code();

update public.observations
set raw_text = 'Citizen observation evidence recorded.'
where raw_text is null or trim(raw_text) = '';

alter table public.observations
  alter column raw_text set not null;

alter table public.observations
  drop constraint if exists check_raw_text_min_length;

alter table public.observations
  add constraint check_raw_text_min_length check (length(trim(raw_text)) >= 10) not valid;

create index if not exists idx_observations_reference_code
  on public.observations (reference_code);

-- ##########################################################################
--  END OF COMBINED MIGRATION
-- ##########################################################################


