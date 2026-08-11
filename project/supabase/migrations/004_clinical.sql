-- DigiHealth Postgres migration — Phase 5: consultations + clinical records
-- Run in Supabase SQL Editor after 003_facility_staff.sql
--
-- Same conventions as prior migrations. consultation_id/message_id columns
-- referencing the not-yet-migrated chat domain are left as bare uuid (no FK)
-- until 006_chat.sql adds those tables and the FK constraints.

create extension if not exists "pgcrypto";

do $$ begin
  create type public.consultation_type as enum ('video', 'chat', 'in_person');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.consultation_status as enum (
    'requested', 'pending', 'scheduled', 'in_progress', 'completed', 'cancelled', 'missed'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.risk_color as enum ('green', 'gray', 'orange', 'red');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.consultation_source as enum (
    'patient_self_serve', 'practitioner_schedule', 'hospital_desk', 'system'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.allergy_severity as enum ('mild', 'moderate', 'severe');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.lab_parameter_status as enum ('normal', 'high', 'low');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.prescription_status as enum ('active', 'completed', 'discontinued');
exception when duplicate_object then null;
end $$;

-- ── consultations ────────────────────────────────────────────────────────────

create table if not exists public.consultations (
  id uuid primary key default gen_random_uuid(),
  mongo_id text unique,
  patient_id uuid not null references public.users (id) on delete cascade,
  practitioner_id uuid not null references public.users (id) on delete cascade,
  facility_id uuid null references public.facilities (id) on delete set null,
  type public.consultation_type not null,
  status public.consultation_status not null default 'requested',
  scheduled_start_time timestamptz not null,
  scheduled_end_time timestamptz not null,
  chief_complaint text null,
  clinical_risk_score integer null,
  clinical_risk_color public.risk_color null,
  clinical_risk_factors text[] not null default '{}',
  soap_subjective text null,
  soap_objective text null,
  soap_assessment text null,
  soap_plan text null,
  soap_signed_at timestamptz null,
  call_minutes_used integer not null default 0,
  source public.consultation_source null,
  requested_to uuid null references public.users (id) on delete set null,
  reschedule_proposed_start timestamptz null,
  reschedule_proposed_end timestamptz null,
  reschedule_proposed_by uuid null references public.users (id) on delete set null,
  reschedule_proposed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists consultations_patient_idx
  on public.consultations (patient_id, scheduled_start_time desc);
create index if not exists consultations_practitioner_idx
  on public.consultations (practitioner_id, scheduled_start_time desc);

drop trigger if exists consultations_updated_at on public.consultations;
create trigger consultations_updated_at
  before update on public.consultations
  for each row execute function public.set_updated_at();

alter table public.consultations enable row level security;

-- ── anthropometrics ──────────────────────────────────────────────────────────

create table if not exists public.anthropometrics (
  id uuid primary key default gen_random_uuid(),
  mongo_id text unique,
  patient_id uuid not null references public.users (id) on delete cascade,
  date_recorded timestamptz not null default now(),
  height_cm numeric(5, 1) null,
  weight_kg numeric(5, 1) null,
  bmi numeric(4, 1) null,
  blood_type text null,
  systolic_bp integer null,
  diastolic_bp integer null,
  heart_rate_bpm integer null,
  spo2 integer null,
  temperature_celsius numeric(3, 1) null,
  created_at timestamptz not null default now()
);

create index if not exists anthropometrics_patient_idx
  on public.anthropometrics (patient_id, date_recorded desc);

alter table public.anthropometrics enable row level security;

-- ── medical_context + patient_allergies ──────────────────────────────────────
-- allergies[] normalized into its own table (was an embedded array in Mongo).

create table if not exists public.medical_context (
  id uuid primary key default gen_random_uuid(),
  mongo_id text unique,
  patient_id uuid not null unique references public.users (id) on delete cascade,
  chronic_conditions text[] not null default '{}',
  current_medications text[] not null default '{}',
  family_history text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists medical_context_updated_at on public.medical_context;
create trigger medical_context_updated_at
  before update on public.medical_context
  for each row execute function public.set_updated_at();

alter table public.medical_context enable row level security;

create table if not exists public.patient_allergies (
  id uuid primary key default gen_random_uuid(),
  medical_context_id uuid not null references public.medical_context (id) on delete cascade,
  allergen text not null,
  severity public.allergy_severity not null,
  reaction text null,
  source text null,
  created_at timestamptz not null default now()
);

create index if not exists patient_allergies_context_idx
  on public.patient_allergies (medical_context_id);

alter table public.patient_allergies enable row level security;

-- ── prescriptions ────────────────────────────────────────────────────────────

create table if not exists public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  mongo_id text unique,
  patient_id uuid not null references public.users (id) on delete cascade,
  practitioner_id uuid not null references public.users (id) on delete cascade,
  medication_name text not null,
  dosage text null,
  instructions text null,
  status public.prescription_status not null default 'active',
  prescribed_date timestamptz not null default now(),
  refills_remaining integer not null default 0,
  document_url text null,
  document_mime text null,
  document_name text null,
  media_id text null,
  conversation_id uuid null, -- FK added in 006_chat.sql
  message_id uuid null,      -- FK added in 006_chat.sql
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prescriptions_patient_idx
  on public.prescriptions (patient_id, prescribed_date desc);

drop trigger if exists prescriptions_updated_at on public.prescriptions;
create trigger prescriptions_updated_at
  before update on public.prescriptions
  for each row execute function public.set_updated_at();

alter table public.prescriptions enable row level security;

-- ── lab_results + lab_result_parameters ──────────────────────────────────────

create table if not exists public.lab_results (
  id uuid primary key default gen_random_uuid(),
  mongo_id text unique,
  patient_id uuid not null references public.users (id) on delete cascade,
  ordered_by uuid null references public.users (id) on delete set null,
  test_name text not null,
  date_reported timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists lab_results_patient_idx on public.lab_results (patient_id, date_reported desc);

alter table public.lab_results enable row level security;

create table if not exists public.lab_result_parameters (
  id uuid primary key default gen_random_uuid(),
  lab_result_id uuid not null references public.lab_results (id) on delete cascade,
  name text not null,
  value text null,
  unit text null,
  reference_range text null,
  status public.lab_parameter_status null,
  created_at timestamptz not null default now()
);

create index if not exists lab_result_parameters_result_idx
  on public.lab_result_parameters (lab_result_id);

alter table public.lab_result_parameters enable row level security;

-- ── immunizations ────────────────────────────────────────────────────────────

create table if not exists public.immunizations (
  id uuid primary key default gen_random_uuid(),
  mongo_id text unique,
  patient_id uuid not null references public.users (id) on delete cascade,
  vaccine_name text not null,
  date_administered timestamptz not null default now(),
  dosage text null,
  batch_number text null,
  administered_by text null,
  next_due_date timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists immunizations_patient_idx on public.immunizations (patient_id, date_administered desc);

alter table public.immunizations enable row level security;

-- ── risk_scores ──────────────────────────────────────────────────────────────

create table if not exists public.risk_scores (
  id uuid primary key default gen_random_uuid(),
  mongo_id text unique,
  patient_id uuid not null references public.users (id) on delete cascade,
  practitioner_id uuid not null references public.users (id) on delete cascade,
  consultation_id uuid null references public.consultations (id) on delete set null,
  score integer not null check (score >= 0 and score <= 100),
  color public.risk_color not null,
  factors text[] not null default '{}',
  condition text null,
  notes text null,
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists risk_scores_patient_idx on public.risk_scores (patient_id, calculated_at desc);
create index if not exists risk_scores_practitioner_idx on public.risk_scores (practitioner_id);

drop trigger if exists risk_scores_updated_at on public.risk_scores;
create trigger risk_scores_updated_at
  before update on public.risk_scores
  for each row execute function public.set_updated_at();

alter table public.risk_scores enable row level security;

-- ── ai_triage_sessions / clinical_decision_support ───────────────────────────
-- aiResponse / drugInteractions were Schema.Types.Mixed in Mongo -> jsonb here.

create table if not exists public.ai_triage_sessions (
  id uuid primary key default gen_random_uuid(),
  mongo_id text unique,
  patient_id uuid null references public.users (id) on delete set null,
  symptoms text null,
  parsed_symptoms text[] not null default '{}',
  ai_response jsonb not null default '{}'::jsonb,
  recommendation text null,
  urgency_score numeric null,
  consultation_id uuid null references public.consultations (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_triage_sessions enable row level security;

create table if not exists public.clinical_decision_support (
  id uuid primary key default gen_random_uuid(),
  mongo_id text unique,
  practitioner_id uuid null references public.users (id) on delete set null,
  patient_id uuid null references public.users (id) on delete set null,
  consultation_id uuid not null references public.consultations (id) on delete cascade,
  risk_score numeric null,
  suggested_diagnoses text[] not null default '{}',
  recommended_tests text[] not null default '{}',
  drug_interactions jsonb not null default '[]'::jsonb,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists clinical_decision_support_consultation_idx
  on public.clinical_decision_support (consultation_id);

alter table public.clinical_decision_support enable row level security;

-- No anon/authenticated policies on any table above — service role only,
-- same convention as every prior migration in this project.
