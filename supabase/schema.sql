-- ============================================================================
-- Praja Sakti Group — Architect Scoring System
-- Supabase schema — Plan A2 (shared room, NO sign-in)
--
-- HOW TO USE
--   1. Open your Supabase project -> SQL Editor -> New query
--   2. Paste this entire file and click "Run".
--   3. Copy Project URL + anon public key into assets/config.js.
--   NOTE: No anonymous sign-in is required. Anonymous sign-ins may stay OFF.
--
-- SECURITY (read me)
--   This model opens the table to the public `anon` key so that every browser
--   can read and write the shared room WITHOUT logging in. Anyone who has the
--   site URL + anon key can read, edit, or wipe this room via the API. Keep the
--   URL semi-private and rely on the app's UI discouraging misuse. If you need
--   real per-assessor ownership, use the authenticated version instead.
-- ============================================================================

create extension if not exists pgcrypto;

-- Recreate cleanly (the previous schema used per-user ownership via auth.users).
drop table if exists public.praja_assessments cascade;

create table public.praja_assessments (
  id             uuid        primary key default gen_random_uuid(),
  room_id        text        not null,
  evaluator_name text        not null,
  payload        jsonb       not null default '{}'::jsonb,   -- { ranks: { cand: { sub: 1|2|3 } } }
  updated_at     timestamptz not null default now()
);

-- One profile per name (case/space-insensitive) per room.
create unique index if not exists praja_assessments_room_name_uidx
  on public.praja_assessments (room_id, lower(btrim(evaluator_name)));

create index if not exists praja_assessments_room_idx
  on public.praja_assessments (room_id);

-- ----------------------------------------------------------------------------
-- Row Level Security — open to the anon + authenticated roles (shared room)
-- ----------------------------------------------------------------------------
alter table public.praja_assessments enable row level security;

drop policy if exists "praja_all" on public.praja_assessments;
create policy "praja_all"
  on public.praja_assessments
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- ----------------------------------------------------------------------------
-- Realtime (live updates across all assessors' dashboards)
-- ----------------------------------------------------------------------------
alter publication supabase_realtime add table public.praja_assessments;
-- If this errors with "already member of publication", it is safe to ignore.
