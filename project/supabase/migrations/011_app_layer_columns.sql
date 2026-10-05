-- DigiHealth Postgres migration 011: columns the app data layer (lib/db) needs on
-- top of 001-010, plus atomic helpers. Schema only, no data.

-- ── users: preferences and trusted devices (previously schemaless Mongo fields)
alter table public.users
  add column if not exists notification_prefs jsonb null,
  add column if not exists trusted_devices jsonb not null default '[]'::jsonb;

-- ── clinical_decision_support ────────────────────────────────────────────────
alter table public.clinical_decision_support
  add column if not exists symptoms text null,
  add column if not exists risk_assessment text null,
  add column if not exists status text null,
  add column if not exists reviewed_at timestamptz null,
  add column if not exists model_used text null,
  add column if not exists updated_at timestamptz not null default now();

-- ── medical_context ──────────────────────────────────────────────────────────
alter table public.medical_context
  add column if not exists blood_type text null,
  add column if not exists activity_level text null;

-- ── patient_profiles (also backs the legacy Patient model) ───────────────────
alter table public.patient_profiles
  add column if not exists id_number text null,
  add column if not exists age_range text null,
  add column if not exists terms_accepted_at timestamptz null,
  add column if not exists next_of_kin jsonb not null default '[]'::jsonb,
  add column if not exists mobile_number text null,
  add column if not exists medical_history text[] not null default '{}',
  add column if not exists allergies text[] not null default '{}',
  add column if not exists current_medications text[] not null default '{}',
  add column if not exists blood_type text null;

-- ── practitioner_profiles ────────────────────────────────────────────────────
alter table public.practitioner_profiles
  add column if not exists embedded_reviews jsonb not null default '[]'::jsonb,
  add column if not exists consent_accepted_at timestamptz null,
  add column if not exists terms_accepted_at timestamptz null;

-- ── billing: payer (family plans) and payment-method address ────────────────
alter table public.payment_transactions
  add column if not exists payer_id uuid null references public.users (id) on delete set null;
alter table public.subscriptions
  add column if not exists payer_id uuid null references public.users (id) on delete set null;
alter table public.payment_methods
  add column if not exists holder_name text null,
  add column if not exists billing_address_line text null,
  add column if not exists billing_address_city text null,
  add column if not exists billing_address_postal_code text null;

-- ── clinical_decision_support: diagnoses are sub-documents, not text ────────
alter table public.clinical_decision_support drop column if exists suggested_diagnoses;
alter table public.clinical_decision_support
  add column suggested_diagnoses jsonb not null default '[]'::jsonb;

-- ── patient_events: the app stores a display date string and "HH:mm" time ───
alter table public.patient_events alter column event_at drop not null;
alter table public.patient_events
  add column if not exists event_date text null,
  add column if not exists event_time text not null default '09:00';

-- ── wellness (patient check-ins and daily scores) ───────────────────────────
create table if not exists public.wellness_checkins (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.users (id) on delete cascade,
  mood integer not null check (mood between 1 and 5),
  sleep_hours numeric not null check (sleep_hours between 0 and 24),
  steps integer not null check (steps >= 0),
  checkin_date timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists wellness_checkins_patient_idx
  on public.wellness_checkins (patient_id, checkin_date desc);
drop trigger if exists wellness_checkins_updated_at on public.wellness_checkins;
create trigger wellness_checkins_updated_at before update on public.wellness_checkins
  for each row execute function public.set_updated_at();
alter table public.wellness_checkins enable row level security;

create table if not exists public.wellness_scores (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.users (id) on delete cascade,
  score_date timestamptz not null,
  score integer not null check (score between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists wellness_scores_patient_idx
  on public.wellness_scores (patient_id, score_date desc);
drop trigger if exists wellness_scores_updated_at on public.wellness_scores;
create trigger wellness_scores_updated_at before update on public.wellness_scores
  for each row execute function public.set_updated_at();
alter table public.wellness_scores enable row level security;

-- ── billings (practitioner invoices shown on the practitioner billing page) ──
create table if not exists public.billings (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid null references public.users (id) on delete set null,
  practitioner_id uuid null references public.users (id) on delete set null,
  consultation_id uuid null references public.consultations (id) on delete set null,
  amount numeric(12, 2) null,
  type text null,
  status text null,
  payment_method text null,
  billed_at timestamptz not null default now(),
  invoice_number text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists billings_practitioner_idx
  on public.billings (practitioner_id, billed_at desc);
drop trigger if exists billings_updated_at on public.billings;
create trigger billings_updated_at before update on public.billings
  for each row execute function public.set_updated_at();
alter table public.billings enable row level security;

-- ── system_config is a singleton row ────────────────────────────────────────
create unique index if not exists system_config_singleton on public.system_config ((true));

-- ── enums: values the app uses that 001-009 did not define ───────────────────
alter type public.subscription_tier add value if not exists 'individual';
alter type public.subscription_tier add value if not exists 'family_plus';
alter type public.consultation_type add value if not exists 'voice';

-- ── atomic numeric increment (replaces Mongo $inc) ───────────────────────────
create or replace function public.dh_increment(
  p_table text, p_id uuid, p_column text, p_delta numeric
) returns void language plpgsql security invoker as $$
begin
  execute format(
    'update public.%I set %I = coalesce(%I, 0) + $1 where id = $2',
    p_table, p_column, p_column
  ) using p_delta, p_id;
end;
$$;

revoke all on function public.dh_increment(text, uuid, text, numeric) from public, anon, authenticated;
grant execute on function public.dh_increment(text, uuid, text, numeric) to service_role;
