-- DigiHealth Postgres migration 010: close the gaps between lib/models/* (Mongo)
-- and migrations 001-009, so Postgres can be the only database.
--
-- Conventions match 001-009: RLS enabled, no anon/authenticated policies (access is
-- via the service-role client), `set_updated_at()` triggers, uuid primary keys.
-- New tables carry no `mongo_id` column: there is no data to map from Mongo.
--
-- `patientKey` / `guardianKey` / `memberKey` string fields in the Mongo models only
-- existed because Postgres-native uuids could not be stored in ObjectId fields. Here
-- every owner is a real uuid FK to users(id), so those fields are not ported.

create extension if not exists "pgcrypto";

-- ── users: password reset ────────────────────────────────────────────────────

alter table public.users
  add column if not exists reset_token_hash text null,
  add column if not exists reset_token_expires_at timestamptz null;

create index if not exists users_reset_token_hash_idx
  on public.users (reset_token_hash) where reset_token_hash is not null;

-- ── reminder-email bookkeeping (cron /api/cron/reminders) ────────────────────

alter table public.consultations
  add column if not exists reminder_email_sent_at timestamptz null;

create index if not exists consultations_reminder_idx
  on public.consultations (status, scheduled_start_time)
  where reminder_email_sent_at is null;

alter table public.messages
  add column if not exists reminder_email_sent_at timestamptz null;

create index if not exists messages_reminder_idx
  on public.messages (receiver_id, created_at)
  where is_read = false and reminder_email_sent_at is null;

-- ── calls: participants, ender, one live call per session ────────────────────

alter table public.calls
  add column if not exists participant_user_ids uuid[] not null default '{}',
  add column if not exists ended_by uuid null references public.users (id) on delete set null;

-- Ad-hoc calls (consultation_id null) collapse to one live row per conversation;
-- scheduled-session calls get one live row per (conversation, consultation).
create unique index if not exists active_call_per_conversation_session
  on public.calls (conversation_id, coalesce(consultation_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where status = 'active';

create unique index if not exists active_call_per_consultation
  on public.calls (consultation_id)
  where status = 'active' and consultation_id is not null;

-- ── family_links ─────────────────────────────────────────────────────────────

do $$ begin
  create type public.family_relationship as enum ('child', 'spouse', 'parent', 'other');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.family_link_status as enum ('pending', 'active', 'revoked');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.family_linked_via as enum ('guardian_created', 'email_invite');
exception when duplicate_object then null;
end $$;

create table if not exists public.family_links (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid not null references public.users (id) on delete cascade,
  member_id uuid null references public.users (id) on delete cascade,
  invite_email text null,
  invite_name text null,
  relationship public.family_relationship not null,
  is_minor boolean not null default false,
  status public.family_link_status not null default 'pending',
  linked_via public.family_linked_via not null,
  invite_token text null,
  invite_expires_at timestamptz null,
  accepted_at timestamptz null,
  guardian_consent_at timestamptz null,
  revoked_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint family_links_invite_email_lower check (invite_email is null or invite_email = lower(invite_email))
);

create index if not exists family_links_guardian_status_idx
  on public.family_links (guardian_id, status);
create index if not exists family_links_member_status_idx
  on public.family_links (member_id, status) where member_id is not null;
create unique index if not exists family_links_guardian_member_uniq
  on public.family_links (guardian_id, member_id) where member_id is not null;
create index if not exists family_links_guardian_invite_email_idx
  on public.family_links (guardian_id, invite_email) where invite_email is not null;
create unique index if not exists family_links_invite_token_uniq
  on public.family_links (invite_token) where invite_token is not null;

drop trigger if exists family_links_updated_at on public.family_links;
create trigger family_links_updated_at
  before update on public.family_links
  for each row execute function public.set_updated_at();

alter table public.family_links enable row level security;

-- ── platform_invites ─────────────────────────────────────────────────────────

do $$ begin
  create type public.invite_status as enum ('pending', 'accepted', 'cancelled', 'expired');
exception when duplicate_object then null;
end $$;

create table if not exists public.platform_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email)),
  role text not null check (role in ('patient', 'practitioner', 'hospital_admin')),
  invited_by uuid not null references public.users (id) on delete cascade,
  token text not null unique,
  status public.invite_status not null default 'pending',
  expires_at timestamptz not null,
  accepted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists platform_invites_email_idx on public.platform_invites (email);

drop trigger if exists platform_invites_updated_at on public.platform_invites;
create trigger platform_invites_updated_at
  before update on public.platform_invites
  for each row execute function public.set_updated_at();

alter table public.platform_invites enable row level security;

-- ── staff_approval_requests ──────────────────────────────────────────────────

do $$ begin
  create type public.staff_approval_status as enum
    ('pending', 'approved', 'rejected', 'cancelled', 'expired');
exception when duplicate_object then null;
end $$;

create table if not exists public.staff_approval_requests (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.users (id) on delete cascade,
  facility_id uuid not null references public.facilities (id) on delete cascade,
  requested_by uuid not null references public.users (id) on delete cascade,
  token text not null unique,
  status public.staff_approval_status not null default 'pending',
  department text not null,
  shift_start text not null default '08:00',
  shift_end text not null default '16:00',
  hourly_rate numeric(10, 2) not null default 0,
  expires_at timestamptz not null,
  responded_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists staff_approval_requests_doctor_facility_status_idx
  on public.staff_approval_requests (doctor_id, facility_id, status);

drop trigger if exists staff_approval_requests_updated_at on public.staff_approval_requests;
create trigger staff_approval_requests_updated_at
  before update on public.staff_approval_requests
  for each row execute function public.set_updated_at();

alter table public.staff_approval_requests enable row level security;

-- ── hospital_transactions ────────────────────────────────────────────────────

do $$ begin
  create type public.hospital_transaction_type as enum ('service_booking', 'procedure', 'pharmacy');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.hospital_transaction_status as enum ('paid', 'pending', 'refunded');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.hospital_payment_method as enum ('cash', 'card', 'medical_aid');
exception when duplicate_object then null;
end $$;

create table if not exists public.hospital_transactions (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities (id) on delete cascade,
  patient_id uuid not null references public.users (id) on delete cascade,
  amount numeric(12, 2) not null,
  type public.hospital_transaction_type not null,
  status public.hospital_transaction_status not null default 'pending',
  payment_method public.hospital_payment_method not null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hospital_transactions_facility_idx
  on public.hospital_transactions (facility_id, occurred_at desc);
create index if not exists hospital_transactions_patient_idx
  on public.hospital_transactions (patient_id, occurred_at desc);

drop trigger if exists hospital_transactions_updated_at on public.hospital_transactions;
create trigger hospital_transactions_updated_at
  before update on public.hospital_transactions
  for each row execute function public.set_updated_at();

alter table public.hospital_transactions enable row level security;

-- ── ai_chat_logs ─────────────────────────────────────────────────────────────

create table if not exists public.ai_chat_logs (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid not null references public.users (id) on delete cascade,
  messages jsonb not null default '[]'::jsonb,  -- [{role, content, at}]
  model_used text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_chat_logs_practitioner_created_idx
  on public.ai_chat_logs (practitioner_id, created_at desc);

drop trigger if exists ai_chat_logs_updated_at on public.ai_chat_logs;
create trigger ai_chat_logs_updated_at
  before update on public.ai_chat_logs
  for each row execute function public.set_updated_at();

alter table public.ai_chat_logs enable row level security;

-- ── medical_documents ────────────────────────────────────────────────────────

create table if not exists public.medical_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  uploaded_by uuid null references public.users (id) on delete set null,
  type text null,
  file_url text null,       -- media proxy URL or legacy CDN URL (was cloudinaryUrl)
  public_id text null,
  media_id text null,
  mime_type text null,
  status text null,
  verified_at timestamptz null,
  note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists medical_documents_user_idx
  on public.medical_documents (user_id, created_at desc);

drop trigger if exists medical_documents_updated_at on public.medical_documents;
create trigger medical_documents_updated_at
  before update on public.medical_documents
  for each row execute function public.set_updated_at();

alter table public.medical_documents enable row level security;

-- No anon/authenticated policies — service role only, same convention as 001-009.
