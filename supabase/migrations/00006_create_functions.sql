-- ============================================================================
-- Migration 00006: Create SQL Functions
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
