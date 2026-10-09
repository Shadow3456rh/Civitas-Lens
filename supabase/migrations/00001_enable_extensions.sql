-- ============================================================================
-- Migration 00001: Enable Required Extensions
-- ============================================================================
-- PostGIS adds geography/geometry types and spatial functions (ST_DWithin,
-- ST_Distance, ST_MakePoint, etc.) needed for observation→incident correlation.
-- ============================================================================

create extension if not exists "postgis" with schema "extensions";

-- uuid-ossp for gen_random_uuid() fallback (Supabase usually has this, but
-- declaring it explicitly ensures portability).
create extension if not exists "uuid-ossp" with schema "extensions";
