-- ============================================================================
-- Migration 00002: Create Custom Enum Types
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
