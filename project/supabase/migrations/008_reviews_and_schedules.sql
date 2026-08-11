-- DigiHealth Postgres migration — Phase 8b: reviews + practitioner schedules
-- Run in Supabase SQL Editor after 007_content.sql
--
-- Two tables missed in the original domain migrations: `reviews` (unifies
-- lib/models/ReviewsDocs.ts's Review with PractitionerProfile.reviews[],
-- the embedded array duplicate) and `practitioner_schedules` (from
-- lib/models/Scheduling.ts). Same conventions as every prior migration.

create extension if not exists "pgcrypto";

-- ── reviews ──────────────────────────────────────────────────────────────────

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  mongo_id text unique,
  consultation_id uuid null references public.consultations (id) on delete set null,
  patient_id uuid not null references public.users (id) on delete cascade,
  practitioner_id uuid not null references public.users (id) on delete cascade,
  rating numeric(2, 1) not null,
  comment text null,
  categories jsonb not null default '{}'::jsonb,
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reviews_practitioner_idx on public.reviews (practitioner_id, created_at desc);
create index if not exists reviews_patient_idx on public.reviews (patient_id);

drop trigger if exists reviews_updated_at on public.reviews;
create trigger reviews_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

alter table public.reviews enable row level security;

-- ── practitioner_schedules + slots ───────────────────────────────────────────

create table if not exists public.practitioner_schedules (
  id uuid primary key default gen_random_uuid(),
  mongo_id text unique,
  practitioner_id uuid not null references public.users (id) on delete cascade,
  schedule_date date not null,
  recurring_day_of_week smallint null,
  recurring_start_hour smallint null,
  recurring_end_hour smallint null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists practitioner_schedules_practitioner_date_idx
  on public.practitioner_schedules (practitioner_id, schedule_date);

drop trigger if exists practitioner_schedules_updated_at on public.practitioner_schedules;
create trigger practitioner_schedules_updated_at
  before update on public.practitioner_schedules
  for each row execute function public.set_updated_at();

alter table public.practitioner_schedules enable row level security;

create table if not exists public.practitioner_schedule_slots (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.practitioner_schedules (id) on delete cascade,
  start_time text not null,
  end_time text not null,
  status text not null default 'available'
);

create index if not exists practitioner_schedule_slots_schedule_idx
  on public.practitioner_schedule_slots (schedule_id);

alter table public.practitioner_schedule_slots enable row level security;

-- No anon/authenticated policies — service role only, same convention as
-- every prior migration.
