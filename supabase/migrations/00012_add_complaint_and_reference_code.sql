-- ============================================================================
-- Migration 00012: Add Citizen Complaint Fields and Reference Code
-- ============================================================================
-- Adds citizen-provided complaint details:
-- - user_category: user-selected category chip
-- - user_urgency: 'low' | 'medium' | 'high'
-- - reporter_name: optional citizen contact name
-- - reporter_contact: optional citizen phone or email
-- - reference_code: unique human-friendly code (e.g. CL-2026-000123)
-- - ensures raw_text has a minimum length constraint for new reports
-- ============================================================================

-- 1. Add citizen complaint columns to observations table
alter table public.observations
  add column if not exists user_category text,
  add column if not exists user_urgency text check (user_urgency in ('low', 'medium', 'high')),
  add column if not exists reporter_name text,
  add column if not exists reporter_contact text,
  add column if not exists reference_code text unique;

-- 2. Sequence for auto-generating reference code numbers
create sequence if not exists public.observation_ref_seq start with 100001;

-- 3. Trigger function to auto-assign reference_code on insert if not provided
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

-- 4. Backfill reference_code for any existing observations
do $$
declare
  rec record;
  counter integer := 100001;
begin
  for rec in select id, created_at from public.observations where reference_code is null order by created_at asc loop
    update public.observations
    set reference_code = 'CL-' || to_char(rec.created_at, 'YYYY') || '-' || lpad(counter::text, 6, '0')
    where id = rec.id;
    counter := counter + 1;
  end loop;
end $$;

-- 5. Backfill any empty raw_text before adding constraints
update public.observations
set raw_text = 'Citizen observation evidence recorded.'
where raw_text is null or trim(raw_text) = '';

-- 6. Ensure raw_text is NOT NULL
alter table public.observations
  alter column raw_text set not null;

-- 7. Add check constraint for minimum length on new rows (kept unvalidated for historical data)
alter table public.observations
  drop constraint if exists check_raw_text_min_length;

alter table public.observations
  add constraint check_raw_text_min_length check (length(trim(raw_text)) >= 10) not valid;

-- 8. Add index for fast lookup by reference_code (for public tracking)
create index if not exists idx_observations_reference_code
  on public.observations (reference_code);

-- 9. Comments
comment on column public.observations.user_category is 'User-selected category chip from reporting form';
comment on column public.observations.user_urgency is 'User-stated urgency level: low, medium, or high';
comment on column public.observations.reporter_name is 'Optional citizen reporter name (staff visible only)';
comment on column public.observations.reporter_contact is 'Optional citizen phone or email for updates (staff visible only)';
comment on column public.observations.reference_code is 'Unique public tracking reference code (e.g. CL-2026-000123)';
