-- ============================================================================
-- Migration 00010: Add Capture Metadata and Make Raw Text Optional
-- ============================================================================
-- Adds GPS accuracy, capture source, location source, and capture timestamp
-- to the observations table for the one-tap camera reporting flow.
-- Allows photo-first observations where raw_text is optional.
-- ============================================================================

-- 1. Make raw_text nullable (at least one of image_path or raw_text required)
alter table public.observations
  alter column raw_text drop not null;

-- 2. Add capture metadata columns
alter table public.observations
  add column if not exists location_accuracy_m numeric,
  add column if not exists capture_source text check (capture_source in ('live_camera', 'gallery_upload')),
  add column if not exists location_source text check (location_source in ('gps', 'manual_pin')),
  add column if not exists captured_at timestamptz;

-- Comments
comment on column public.observations.location_accuracy_m is
  'GPS accuracy radius in metres reported by device at the moment of capture';

comment on column public.observations.capture_source is
  'Whether the photo was captured live in-app or uploaded from photo gallery';

comment on column public.observations.location_source is
  'Whether location was locked via hardware GPS or placed manually on map';

comment on column public.observations.captured_at is
  'Exact timestamp when photo shutter was pressed or upload occurred';
