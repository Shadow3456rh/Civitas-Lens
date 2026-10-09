-- ============================================================================
-- Migration 00007: Create View for Public Incident Data
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
