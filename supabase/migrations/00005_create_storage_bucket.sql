-- ============================================================================
-- Migration 00005: Create Storage Bucket
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
