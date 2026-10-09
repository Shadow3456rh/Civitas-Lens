-- ============================================================================
-- Migration 00003: Create Core Tables
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
