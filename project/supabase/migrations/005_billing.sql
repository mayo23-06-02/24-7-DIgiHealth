-- DigiHealth Postgres migration — Phase 6: billing
-- Run in Supabase SQL Editor after 004_clinical.sql
--
-- BillingAuditLog (from lib/models/Billing.ts) is NOT a separate table here —
-- per the migration plan it folds into the unified public.audit_logs table
-- created in 002_users_and_profiles.sql (which already reconciles the three
-- colliding Mongo AuditLog shapes). The ad-hoc inline "Billing" model in
-- app/api/practitioner/billing/route.ts also has no separate table — it
-- reconciles into payment_transactions during backfill.
--
-- bank_account_* columns (payout_requests) are sensitive, same note as
-- practitioner_profiles in 002 — flagged for an RLS/column-security follow-up,
-- left as plain columns for now to match this table's access pattern.

create extension if not exists "pgcrypto";

do $$ begin
  create type public.payment_provider as enum ('medical_aid', 'card', 'eft', 'cash', 'wallet');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.payment_status as enum ('pending', 'completed', 'failed', 'refunded');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.payment_category as enum (
    'service_booking', 'subscription', 'procedure', 'pharmacy', 'lab'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.subscription_tier as enum ('free', 'pro', 'family');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.subscription_status as enum ('active', 'trial', 'cancelled', 'past_due');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.payout_status as enum ('pending', 'approved', 'paid', 'rejected');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.payment_method_type as enum ('card', 'medical_aid', 'eft');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.revenue_period as enum ('daily', 'monthly', 'yearly');
exception when duplicate_object then null;
end $$;

-- ── payment_transactions ─────────────────────────────────────────────────────

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  mongo_id text unique,
  patient_id uuid null references public.users (id) on delete set null,
  practitioner_id uuid null references public.users (id) on delete set null,
  facility_id uuid null references public.facilities (id) on delete set null,
  consultation_id uuid null references public.consultations (id) on delete set null,
  amount numeric(12, 2) not null,
  currency text not null default 'ZAR',
  provider public.payment_provider null,
  status public.payment_status not null default 'pending',
  description text null,
  category public.payment_category null,
  provider_transaction_id text null,
  receipt_url text null,
  medical_aid_claim_ref text null,
  platform_fee_amount numeric(12, 2) null,
  practitioner_earnings numeric(12, 2) null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_transactions_patient_idx
  on public.payment_transactions (patient_id, occurred_at desc);
create index if not exists payment_transactions_practitioner_idx
  on public.payment_transactions (practitioner_id, occurred_at desc);
create index if not exists payment_transactions_facility_idx
  on public.payment_transactions (facility_id, occurred_at desc);
create index if not exists payment_transactions_status_idx
  on public.payment_transactions (status, occurred_at desc);

drop trigger if exists payment_transactions_updated_at on public.payment_transactions;
create trigger payment_transactions_updated_at
  before update on public.payment_transactions
  for each row execute function public.set_updated_at();

alter table public.payment_transactions enable row level security;

-- ── subscriptions ────────────────────────────────────────────────────────────

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  mongo_id text unique,
  patient_id uuid not null references public.users (id) on delete cascade,
  tier public.subscription_tier not null default 'free',
  status public.subscription_status null,
  start_date timestamptz null,
  next_billing_date timestamptz null,
  payment_method_id text null,
  auto_renew boolean not null default true,
  price numeric(10, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_patient_idx on public.subscriptions (patient_id);

drop trigger if exists subscriptions_updated_at on public.subscriptions;
create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

alter table public.subscriptions enable row level security;

-- ── payout_requests ──────────────────────────────────────────────────────────

create table if not exists public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  mongo_id text unique,
  practitioner_id uuid not null references public.users (id) on delete cascade,
  facility_id uuid null references public.facilities (id) on delete set null,
  amount numeric(12, 2) not null,
  currency text not null default 'ZAR',
  status public.payout_status not null default 'pending',
  requested_at timestamptz not null default now(),
  processed_at timestamptz null,
  bank_account_holder text null,
  bank_name text null,
  bank_account_number text null,
  bank_branch_code text null,
  period_from timestamptz null,
  period_to timestamptz null,
  consultation_count integer not null default 0,
  platform_fee_deducted numeric(12, 2) not null default 0,
  notes text null,
  approved_by uuid null references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payout_requests_practitioner_idx
  on public.payout_requests (practitioner_id, requested_at desc);
create index if not exists payout_requests_status_idx on public.payout_requests (status);

drop trigger if exists payout_requests_updated_at on public.payout_requests;
create trigger payout_requests_updated_at
  before update on public.payout_requests
  for each row execute function public.set_updated_at();

alter table public.payout_requests enable row level security;

-- ── payment_methods ──────────────────────────────────────────────────────────
-- Single polymorphic table (card/medical_aid/eft/insurance shapes via
-- nullable columns), matching the Mongo shape rather than 4 separate tables.

create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  mongo_id text unique,
  patient_id uuid not null references public.users (id) on delete cascade,
  type public.payment_method_type not null,
  is_default boolean not null default false,
  card_brand text null,
  card_last4 text null,
  card_expiry_month integer null,
  card_expiry_year integer null,
  medical_aid_provider text null,
  medical_aid_number text null,
  bank_name text null,
  bank_account_number text null,
  bank_branch_code text null,
  insurance_provider text null,
  insurance_policy_number text null,
  insurance_coverage_type text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_methods_patient_idx on public.payment_methods (patient_id);

drop trigger if exists payment_methods_updated_at on public.payment_methods;
create trigger payment_methods_updated_at
  before update on public.payment_methods
  for each row execute function public.set_updated_at();

alter table public.payment_methods enable row level security;

-- ── platform_fee_config ──────────────────────────────────────────────────────
-- Functionally single-row in Mongo (app-level convention, no schema
-- enforcement) — kept as a normal table with an app-enforced single row,
-- same treatment as public.system_config in 007_content.sql.

create table if not exists public.platform_fee_config (
  id uuid primary key default gen_random_uuid(),
  mongo_id text unique,
  platform_fee_percent numeric(5, 2) not null default 15,
  subscription_fee_percent numeric(5, 2) not null default 10,
  updated_by uuid null references public.users (id) on delete set null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists platform_fee_config_updated_at on public.platform_fee_config;
create trigger platform_fee_config_updated_at
  before update on public.platform_fee_config
  for each row execute function public.set_updated_at();

alter table public.platform_fee_config enable row level security;

-- ── hospital_revenue + hospital_revenue_by_department ────────────────────────

create table if not exists public.hospital_revenue (
  id uuid primary key default gen_random_uuid(),
  mongo_id text unique,
  facility_id uuid not null references public.facilities (id) on delete cascade,
  period public.revenue_period not null,
  revenue_date date not null,
  total_revenue numeric(14, 2) not null default 0,
  pending_payouts numeric(14, 2) not null default 0,
  completed_payouts numeric(14, 2) not null default 0,
  net_revenue numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hospital_revenue_facility_idx
  on public.hospital_revenue (facility_id, revenue_date desc);

drop trigger if exists hospital_revenue_updated_at on public.hospital_revenue;
create trigger hospital_revenue_updated_at
  before update on public.hospital_revenue
  for each row execute function public.set_updated_at();

alter table public.hospital_revenue enable row level security;

create table if not exists public.hospital_revenue_by_department (
  id uuid primary key default gen_random_uuid(),
  hospital_revenue_id uuid not null references public.hospital_revenue (id) on delete cascade,
  department text not null,
  revenue numeric(14, 2) not null default 0,
  transaction_count integer not null default 0
);

create index if not exists hospital_revenue_by_department_revenue_idx
  on public.hospital_revenue_by_department (hospital_revenue_id);

alter table public.hospital_revenue_by_department enable row level security;

-- No anon/authenticated policies — service role only, same convention as
-- every prior migration.
