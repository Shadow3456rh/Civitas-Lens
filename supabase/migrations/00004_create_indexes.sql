-- ============================================================================
-- Migration 00004: Create Indexes
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
