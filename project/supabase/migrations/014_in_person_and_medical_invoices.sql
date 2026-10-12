-- DigiHealth migration 014: in-person appointments and medical-aid invoices.
--
-- Both are hospital-level settings:
--   facilities.in_person_enabled            patients may book in-person visits here
--   facilities.medical_aid_billing_enabled  doctors here may issue medical-aid invoices
--
-- Invoices follow South African medical billing: line items carry a tariff code and an
-- ICD-10 code; the patient's medical aid and the doctor's HPCSA and practice number are
-- copied onto the invoice when it is issued, so later profile edits never change a bill
-- that was already sent. No money moves in the app; the status records what happened.

alter table public.facilities
  add column if not exists in_person_enabled boolean not null default false,
  add column if not exists medical_aid_billing_enabled boolean not null default false;

alter table public.practitioner_profiles
  add column if not exists practice_number text null;

do $$ begin
  create type public.medical_invoice_status as enum
    ('issued', 'submitted', 'paid', 'partially_paid', 'rejected', 'cancelled');
exception when duplicate_object then null;
end $$;

create sequence if not exists public.medical_invoice_number_seq;

create table if not exists public.medical_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique
    default ('INV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.medical_invoice_number_seq')::text, 6, '0')),
  facility_id uuid not null references public.facilities (id) on delete restrict,
  practitioner_id uuid not null references public.users (id) on delete restrict,
  patient_id uuid not null references public.users (id) on delete cascade,
  consultation_id uuid null references public.consultations (id) on delete set null,
  status public.medical_invoice_status not null default 'issued',
  service_date date not null,
  -- snapshot at issue
  patient_name text not null,
  patient_id_number text null,
  medical_aid_provider text null,
  medical_aid_plan text null,
  medical_aid_member_number text null,
  dependant_code text null,
  practitioner_name text not null,
  hpcsa_number text null,
  practice_number text null,
  facility_name text not null,
  notes text null,
  total numeric(12, 2) not null default 0,
  currency text not null default 'ZAR',
  issued_at timestamptz not null default now(),
  status_changed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists medical_invoices_patient_idx on public.medical_invoices (patient_id, issued_at desc);
create index if not exists medical_invoices_practitioner_idx on public.medical_invoices (practitioner_id, issued_at desc);
create index if not exists medical_invoices_facility_idx on public.medical_invoices (facility_id, issued_at desc);

drop trigger if exists medical_invoices_updated_at on public.medical_invoices;
create trigger medical_invoices_updated_at
  before update on public.medical_invoices
  for each row execute function public.set_updated_at();

alter table public.medical_invoices enable row level security;

create table if not exists public.medical_invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.medical_invoices (id) on delete cascade,
  position integer not null default 0,
  tariff_code text not null,
  icd10_code text not null,
  description text not null,
  quantity numeric(10, 2) not null default 1,
  unit_price numeric(12, 2) not null,
  amount numeric(12, 2) not null,
  created_at timestamptz not null default now()
);

create index if not exists medical_invoice_items_invoice_idx on public.medical_invoice_items (invoice_id, position);

alter table public.medical_invoice_items enable row level security;

-- No anon/authenticated policies: service role only, same convention as 001-013.
