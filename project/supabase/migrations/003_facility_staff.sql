-- DigiHealth Postgres migration — Phase 4: facilities, staff, hospital appointments
-- Run in Supabase SQL Editor after 002_users_and_profiles.sql
--
-- Same conventions as 001/002: RLS enabled with no anon/authenticated policies,
-- service-role-only access via lib/supabase/server.ts's getSupabaseAdmin(),
-- mongo_id on every table for the backfill script + rollback safety.

create extension if not exists "pgcrypto";

do $$ begin
  create type public.facility_type as enum ('Public', 'Private', 'NGO');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.staff_role as enum ('doctor', 'nurse', 'admin', 'technician');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.staff_invite_status as enum ('pending', 'accepted', 'cancelled', 'expired');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.hospital_appointment_type as enum ('consultation', 'procedure', 'lab');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.hospital_appointment_status as enum (
    'scheduled', 'in_progress', 'completed', 'cancelled'
  );
exception when duplicate_object then null;
end $$;

-- ── facilities ───────────────────────────────────────────────────────────────
-- Mirrors lib/models/Facility.ts. `location` uses plain lat/lng columns —
-- the Mongo 2dsphere index on this field is stored but never actually
-- queried anywhere in the app (confirmed during research), so no PostGIS
-- geography type is needed; add one later only if proximity search becomes
-- a real feature.

create table if not exists public.facilities (
  id uuid primary key default gen_random_uuid(),
  mongo_id text unique,
  name text not null,
  facility_type public.facility_type null,
  address_street text null,
  address_city text null,
  address_province text null,
  location_lat double precision null,
  location_lng double precision null,
  contact_phone text null,
  contact_emergency_phone text null,
  contact_email text null,
  bed_total integer not null default 0,
  bed_general_available integer not null default 0,
  bed_icu_available integer not null default 0,
  current_wait_time_mins integer not null default 0,
  is_open boolean not null default true,
  specialties text[] not null default '{}',
  emergency_services boolean not null default false,
  logo text null,
  wallpaper text null,
  reg_certificate text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists facilities_city_idx on public.facilities (address_city);
create index if not exists facilities_is_open_idx on public.facilities (is_open);

drop trigger if exists facilities_updated_at on public.facilities;
create trigger facilities_updated_at
  before update on public.facilities
  for each row execute function public.set_updated_at();

alter table public.facilities enable row level security;

-- Backfill the facility_id FKs left as bare uuid columns in 002.
alter table public.hospital_admin_profiles
  add constraint hospital_admin_profiles_facility_fk
  foreign key (facility_id) references public.facilities (id) on delete set null;

alter table public.practitioner_facilities
  add constraint practitioner_facilities_facility_fk
  foreign key (facility_id) references public.facilities (id) on delete cascade;

-- ── staff ────────────────────────────────────────────────────────────────────

create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  mongo_id text unique,
  user_id uuid null references public.users (id) on delete set null,
  facility_id uuid not null references public.facilities (id) on delete cascade,
  role public.staff_role not null,
  department text not null,
  shift_start text null,
  shift_end text null,
  shift_days smallint[] not null default '{}',
  is_on_duty boolean not null default false,
  hourly_rate numeric(10, 2) not null,
  qualifications text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists staff_facility_idx on public.staff (facility_id);
create index if not exists staff_user_idx on public.staff (user_id);

drop trigger if exists staff_updated_at on public.staff;
create trigger staff_updated_at
  before update on public.staff
  for each row execute function public.set_updated_at();

alter table public.staff enable row level security;

-- ── staff_invites ────────────────────────────────────────────────────────────

create table if not exists public.staff_invites (
  id uuid primary key default gen_random_uuid(),
  mongo_id text unique,
  email text not null,
  facility_id uuid not null references public.facilities (id) on delete cascade,
  invited_by uuid not null references public.users (id) on delete cascade,
  token text not null unique,
  status public.staff_invite_status not null default 'pending',
  shift_start text not null default '08:00',
  shift_end text not null default '16:00',
  hourly_rate numeric(10, 2) not null default 0,
  expires_at timestamptz not null,
  accepted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists staff_invites_email_facility_status_idx
  on public.staff_invites (email, facility_id, status);

drop trigger if exists staff_invites_updated_at on public.staff_invites;
create trigger staff_invites_updated_at
  before update on public.staff_invites
  for each row execute function public.set_updated_at();

alter table public.staff_invites enable row level security;

-- ── hospital_appointments ────────────────────────────────────────────────────

create table if not exists public.hospital_appointments (
  id uuid primary key default gen_random_uuid(),
  mongo_id text unique,
  facility_id uuid not null references public.facilities (id) on delete cascade,
  patient_id uuid not null references public.users (id) on delete cascade,
  practitioner_id uuid not null references public.users (id) on delete cascade,
  type public.hospital_appointment_type not null,
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  status public.hospital_appointment_status not null default 'scheduled',
  room text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hospital_appointments_facility_idx
  on public.hospital_appointments (facility_id, scheduled_start desc);
create index if not exists hospital_appointments_patient_idx
  on public.hospital_appointments (patient_id, scheduled_start desc);
create index if not exists hospital_appointments_practitioner_idx
  on public.hospital_appointments (practitioner_id, scheduled_start desc);

drop trigger if exists hospital_appointments_updated_at on public.hospital_appointments;
create trigger hospital_appointments_updated_at
  before update on public.hospital_appointments
  for each row execute function public.set_updated_at();

alter table public.hospital_appointments enable row level security;

-- ── bed_occupancy ────────────────────────────────────────────────────────────

create table if not exists public.bed_occupancy (
  id uuid primary key default gen_random_uuid(),
  mongo_id text unique,
  facility_id uuid not null references public.facilities (id) on delete cascade,
  total_beds integer not null,
  occupied_beds integer not null,
  icu_occupied integer not null default 0,
  emergency_occupied integer not null default 0,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bed_occupancy_facility_time_idx
  on public.bed_occupancy (facility_id, recorded_at desc);

drop trigger if exists bed_occupancy_updated_at on public.bed_occupancy;
create trigger bed_occupancy_updated_at
  before update on public.bed_occupancy
  for each row execute function public.set_updated_at();

alter table public.bed_occupancy enable row level security;

-- No anon/authenticated policies on any table above — same convention as
-- 001/002, service role only.
