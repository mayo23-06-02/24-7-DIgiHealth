-- DigiHealth Postgres migration — Phase 1: users, role profiles, unified audit log
-- Run in Supabase SQL Editor (or via supabase db push)
--
-- Auth model note (see supabase/README.md): the app's auth stays MongoDB(-origin
-- data)+JWT during the migration, NOT Supabase Auth / auth.users. Every table here
-- carries a `mongo_id text unique` column so the one-time data-migration script can
-- map old Mongo ObjectIds to new Postgres uuids, and so a phase can be rolled back
-- by simply not cutting routes over — no data is deleted from Mongo by this file.
--
-- RLS is enabled (repo convention) but no anon/authenticated policies are defined:
-- all access goes through the Next.js API layer using the service-role client
-- (lib/supabase/server.ts's getSupabaseAdmin()), which bypasses RLS, matching
-- media_assets in 001_media_assets.sql. Authorization is enforced in route code,
-- not at the Postgres layer, for consistency with the rest of this codebase.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── Enums ────────────────────────────────────────────────────────────────────

do $$ begin
  create type public.user_role as enum (
    'patient', 'practitioner', 'hospital_admin', 'inspector', 'super_admin', 'mega_admin'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.user_status as enum ('active', 'suspended', 'pending_verification');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.gender as enum ('male', 'female', 'other');
exception when duplicate_object then null;
end $$;

-- ── users ────────────────────────────────────────────────────────────────────
-- Mirrors lib/models/User.ts. One row per account regardless of role; role-specific
-- fields live in the *_profiles tables below (matches lib/models/RoleProfiles.ts,
-- not the separate/duplicate lib/models/Patient.ts shape).

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  mongo_id text unique,
  email text not null unique,
  password_hash text null,
  role public.user_role not null,
  status public.user_status not null default 'active',
  first_name text not null,
  last_name text not null,
  sa_id text null unique,
  mobile text null,
  phone_e164 text null,
  mfa_enabled boolean not null default false,
  supabase_uid text null,
  email_verified boolean not null default true,
  email_verified_at timestamptz null,
  otp_code_hash text null,
  otp_expires_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists users_role_idx on public.users (role);
create index if not exists users_status_idx on public.users (status);
create index if not exists users_email_verified_idx on public.users (email_verified);
create unique index if not exists users_phone_e164_idx
  on public.users (phone_e164) where phone_e164 is not null;
create unique index if not exists users_supabase_uid_idx
  on public.users (supabase_uid) where supabase_uid is not null;

drop trigger if exists users_updated_at on public.users;
create trigger users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

alter table public.users enable row level security;

-- ── patient_profiles ─────────────────────────────────────────────────────────
-- Mirrors RoleProfiles.PatientProfile. 1:1 with users (role = 'patient').

create table if not exists public.patient_profiles (
  id uuid primary key default gen_random_uuid(),
  mongo_id text unique,
  user_id uuid not null unique references public.users (id) on delete cascade,
  date_of_birth date null,
  gender public.gender null,
  emergency_contact_name text null,
  emergency_contact_phone text null,
  emergency_contact_relationship text null,
  medical_aid_provider text null,
  medical_aid_plan_name text null,
  medical_aid_member_number text null,
  subscription_tier text not null default 'free',
  popia_consent_date timestamptz null,
  profile_photo text null,
  medical_documents text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists patient_profiles_updated_at on public.patient_profiles;
create trigger patient_profiles_updated_at
  before update on public.patient_profiles
  for each row execute function public.set_updated_at();

alter table public.patient_profiles enable row level security;

-- Patient <-> Practitioner relationship arrays (favoritePractitionerIds, myDoctorIds,
-- assignedPatientIds on the Mongo side) become one join table, written inside a real
-- transaction from application code — fixes the un-transacted bidirectional-array-write
-- gap found in app/api/bookings/[id]/route.ts and app/api/patient/my-doctors/link/route.ts.

do $$ begin
  create type public.patient_practitioner_link_type as enum ('favorite', 'my_doctor', 'assigned');
exception when duplicate_object then null;
end $$;

create table if not exists public.patient_practitioner_links (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.users (id) on delete cascade,
  practitioner_id uuid not null references public.users (id) on delete cascade,
  link_type public.patient_practitioner_link_type not null,
  created_at timestamptz not null default now(),
  unique (patient_id, practitioner_id, link_type)
);

create index if not exists patient_practitioner_links_patient_idx
  on public.patient_practitioner_links (patient_id, link_type);
create index if not exists patient_practitioner_links_practitioner_idx
  on public.patient_practitioner_links (practitioner_id, link_type);

alter table public.patient_practitioner_links enable row level security;

-- ── practitioner_profiles ────────────────────────────────────────────────────
-- Mirrors RoleProfiles.PractitionerProfile. bank_account_* columns are sensitive —
-- flagged for an RLS/column-security follow-up once the app-layer cutover is stable;
-- left as plain columns for now to match the rest of this table's access pattern.

create table if not exists public.practitioner_profiles (
  id uuid primary key default gen_random_uuid(),
  mongo_id text unique,
  user_id uuid not null unique references public.users (id) on delete cascade,
  specialisation text null,
  bio text null,
  hpcsa_number text not null unique,
  experience_years integer null,
  languages text[] not null default '{}',
  accepted_medical_aids text[] not null default '{}',
  achievements text[] not null default '{}',
  rating numeric(3, 2) not null default 0,
  review_count integer not null default 0,
  is_online boolean not null default false,
  profile_photo text null,
  hpcsa_certificate text null,
  bank_account_holder text null,
  bank_name text null,
  bank_account_number text null,
  bank_branch_code text null,
  tax_number text null,
  address_street text null,
  address_city text null,
  address_province text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists practitioner_profiles_updated_at on public.practitioner_profiles;
create trigger practitioner_profiles_updated_at
  before update on public.practitioner_profiles
  for each row execute function public.set_updated_at();

alter table public.practitioner_profiles enable row level security;

create table if not exists public.practitioner_facilities (
  practitioner_id uuid not null references public.users (id) on delete cascade,
  facility_id uuid not null, -- references public.facilities(id), added in the facility-domain migration
  primary key (practitioner_id, facility_id)
);

alter table public.practitioner_facilities enable row level security;

-- ── hospital_admin_profiles ──────────────────────────────────────────────────
-- Mirrors RoleProfiles.HospitalAdminProfile. facility_id is left as a bare uuid
-- (no FK yet) until the facility-domain migration adds public.facilities.

create table if not exists public.hospital_admin_profiles (
  id uuid primary key default gen_random_uuid(),
  mongo_id text unique,
  user_id uuid not null unique references public.users (id) on delete cascade,
  facility_id uuid null,
  department text null,
  permissions text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists hospital_admin_profiles_updated_at on public.hospital_admin_profiles;
create trigger hospital_admin_profiles_updated_at
  before update on public.hospital_admin_profiles
  for each row execute function public.set_updated_at();

alter table public.hospital_admin_profiles enable row level security;

-- ── audit_logs ───────────────────────────────────────────────────────────────
-- Unifies the three colliding Mongo AuditLog shapes (lib/models/AuditLog.ts,
-- TelehealthCore.ts's AuditLog, Billing.ts's BillingAuditLog) into one table.

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  mongo_id text unique,
  actor_id uuid null references public.users (id) on delete set null,
  actor_role text null,
  actor_email text null,
  action text not null,
  target_type text null,
  target_id text null,
  metadata jsonb not null default '{}'::jsonb,
  ip text null,
  user_agent text null,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_actor_created_idx
  on public.audit_logs (actor_id, created_at desc);
create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_action_idx on public.audit_logs (action);
create index if not exists audit_logs_target_idx on public.audit_logs (target_type, target_id);

alter table public.audit_logs enable row level security;

-- No anon/authenticated policies on any table above — service role (Next.js API,
-- lib/supabase/server.ts's getSupabaseAdmin()) bypasses RLS and is the only writer,
-- same convention as media_assets in 001_media_assets.sql.
