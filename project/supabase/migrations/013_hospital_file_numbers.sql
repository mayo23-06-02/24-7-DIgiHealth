-- DigiHealth Postgres migration 013: hospital-issued file numbers and facility isolation.
--
-- A hospital hands the platform its patients and doctors; a platform admin loads them.
-- Each person is issued a file number by that hospital, and only people holding an active
-- file number at a hospital can be seen by it or book with it. A patient can hold files at
-- several hospitals and has a separate profile and set of records at each.
-- Schema only, no data.

create extension if not exists "pgcrypto";

-- ── facilities: file number prefix ───────────────────────────────────────────
alter table public.facilities
  add column if not exists file_number_prefix text null;

-- ── users: provenance + onboarding ───────────────────────────────────────────
alter table public.users
  add column if not exists provisioned_via text not null default 'self'
    check (provisioned_via in ('self', 'hospital_form', 'hospital_import')),
  add column if not exists provisioned_by uuid null references public.users (id) on delete set null,
  add column if not exists profile_completed_at timestamptz null;

-- ── practitioner_profiles: HPCSA number is not always known at import ────────
alter table public.practitioner_profiles alter column hpcsa_number drop not null;

-- ── facility_patients: the hospital-issued file ──────────────────────────────
do $$ begin
  create type public.facility_patient_status as enum ('pending', 'active', 'suspended', 'discharged');
exception when duplicate_object then null;
end $$;

create table if not exists public.facility_patients (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities (id) on delete cascade,
  patient_id uuid not null references public.users (id) on delete cascade,
  file_number text not null check (length(btrim(file_number)) > 0),
  status public.facility_patient_status not null default 'pending',
  verified_at timestamptz null,
  issued_by uuid null references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint facility_patients_facility_patient_uniq unique (facility_id, patient_id)
);
create unique index if not exists facility_patients_file_uniq
  on public.facility_patients (facility_id, lower(file_number));
create index if not exists facility_patients_patient_idx
  on public.facility_patients (patient_id, status);
create index if not exists facility_patients_facility_status_idx
  on public.facility_patients (facility_id, status);

drop trigger if exists facility_patients_updated_at on public.facility_patients;
create trigger facility_patients_updated_at
  before update on public.facility_patients
  for each row execute function public.set_updated_at();
alter table public.facility_patients enable row level security;

-- ── facility_patient_profiles: what ONE hospital knows about the patient ─────
create table if not exists public.facility_patient_profiles (
  id uuid primary key default gen_random_uuid(),
  facility_patient_id uuid not null unique references public.facility_patients (id) on delete cascade,
  medical_aid_provider text null,
  medical_aid_plan_name text null,
  medical_aid_member_number text null,
  emergency_contact_name text null,
  emergency_contact_phone text null,
  emergency_contact_relationship text null,
  referring_doctor text null,
  notes text null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists facility_patient_profiles_updated_at on public.facility_patient_profiles;
create trigger facility_patient_profiles_updated_at
  before update on public.facility_patient_profiles
  for each row execute function public.set_updated_at();
alter table public.facility_patient_profiles enable row level security;

-- ── staff: doctors/nurses hold a hospital file number and status too ─────────
do $$ begin
  create type public.staff_status as enum ('pending', 'active', 'suspended', 'left');
exception when duplicate_object then null;
end $$;

alter table public.staff
  add column if not exists file_number text null,
  add column if not exists status public.staff_status not null default 'active';

create unique index if not exists staff_facility_user_uniq
  on public.staff (facility_id, user_id) where user_id is not null;
create unique index if not exists staff_facility_file_uniq
  on public.staff (facility_id, lower(file_number)) where file_number is not null;

-- ── per-hospital clinical records ────────────────────────────────────────────
-- facility_id says which hospital created/owns the row. NULL = entered by the patient
-- themselves (visible to the patient and to practitioners they are linked to).
alter table public.anthropometrics        add column if not exists facility_id uuid null references public.facilities (id) on delete set null;
alter table public.prescriptions          add column if not exists facility_id uuid null references public.facilities (id) on delete set null;
alter table public.lab_results            add column if not exists facility_id uuid null references public.facilities (id) on delete set null;
alter table public.immunizations          add column if not exists facility_id uuid null references public.facilities (id) on delete set null;
alter table public.medical_documents      add column if not exists facility_id uuid null references public.facilities (id) on delete set null;
alter table public.risk_scores            add column if not exists facility_id uuid null references public.facilities (id) on delete set null;
alter table public.clinical_decision_support add column if not exists facility_id uuid null references public.facilities (id) on delete set null;
alter table public.attached_records       add column if not exists facility_id uuid null references public.facilities (id) on delete set null;
alter table public.conversations          add column if not exists facility_id uuid null references public.facilities (id) on delete set null;
alter table public.medical_context        add column if not exists facility_id uuid null references public.facilities (id) on delete set null;

create index if not exists anthropometrics_facility_idx   on public.anthropometrics (patient_id, facility_id);
create index if not exists prescriptions_facility_idx     on public.prescriptions (patient_id, facility_id);
create index if not exists lab_results_facility_idx       on public.lab_results (patient_id, facility_id);
create index if not exists immunizations_facility_idx     on public.immunizations (patient_id, facility_id);
create index if not exists medical_documents_facility_idx on public.medical_documents (user_id, facility_id);
create index if not exists risk_scores_facility_idx       on public.risk_scores (patient_id, facility_id);
create index if not exists consultations_facility_idx     on public.consultations (facility_id, scheduled_start_time desc);
create index if not exists conversations_facility_idx     on public.conversations (facility_id);

-- medical_context: one row per patient per hospital (plus one patient-owned row)
alter table public.medical_context drop constraint if exists medical_context_patient_id_key;
create unique index if not exists medical_context_patient_owned_uniq
  on public.medical_context (patient_id) where facility_id is null;
create unique index if not exists medical_context_patient_facility_uniq
  on public.medical_context (patient_id, facility_id) where facility_id is not null;

-- ── set-password tokens (onboarding emails) ─────────────────────────────────
create table if not exists public.set_password_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  token_hash text not null unique,       -- SHA-256 of the emailed token
  purpose text not null default 'set_password' check (purpose in ('set_password')),
  expires_at timestamptz not null,
  used_at timestamptz null,
  created_at timestamptz not null default now()
);
create index if not exists set_password_tokens_user_idx on public.set_password_tokens (user_id);
alter table public.set_password_tokens enable row level security;

-- ── bulk import jobs ────────────────────────────────────────────────────────
do $$ begin
  create type public.import_kind as enum ('patients', 'doctors');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.import_row_status as enum ('pending', 'created', 'linked', 'skipped', 'failed');
exception when duplicate_object then null;
end $$;

create table if not exists public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities (id) on delete cascade,
  kind public.import_kind not null,
  uploaded_by uuid null references public.users (id) on delete set null,
  file_name text null,
  total_rows integer not null default 0,
  created_count integer not null default 0,
  linked_count integer not null default 0,
  skipped_count integer not null default 0,
  failed_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists import_jobs_facility_idx on public.import_jobs (facility_id, created_at desc);
drop trigger if exists import_jobs_updated_at on public.import_jobs;
create trigger import_jobs_updated_at before update on public.import_jobs
  for each row execute function public.set_updated_at();
alter table public.import_jobs enable row level security;

create table if not exists public.import_job_rows (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.import_jobs (id) on delete cascade,
  row_number integer not null,
  raw jsonb not null default '{}'::jsonb,
  status public.import_row_status not null,
  error text null,
  user_id uuid null references public.users (id) on delete set null,
  file_number text null,
  created_at timestamptz not null default now()
);
create index if not exists import_job_rows_job_idx on public.import_job_rows (job_id, row_number);
alter table public.import_job_rows enable row level security;

-- No anon/authenticated policies — service role only, same convention as 001-012.
