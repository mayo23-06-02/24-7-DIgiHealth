-- DigiHealth Postgres migration — Phase 7: chat/realtime persistence
-- Run in Supabase SQL Editor after 005_billing.sql
--
-- Ably (lib/ablyClient.ts + friends) handles realtime delivery and is fully
-- decoupled from the DB — no migration work needed there, only the
-- persistence layer (these tables) moves. server.ts (standalone Socket.IO)
-- is confirmed dead in production, excluded from scope.

create extension if not exists "pgcrypto";

do $$ begin
  create type public.conversation_status as enum ('active', 'ended', 'pending');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.call_type as enum ('video', 'voice');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.call_status as enum ('requested', 'active', 'ended', 'missed', 'declined');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.message_type as enum (
    'text', 'image', 'file', 'audio', 'quick_phrase', 'record_attachment', 'call_log'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.attached_record_type as enum (
    'lab_result', 'prescription', 'imaging', 'soap_note', 'other'
  );
exception when duplicate_object then null;
end $$;

-- ── conversations ────────────────────────────────────────────────────────────

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  mongo_id text unique,
  consultation_id uuid null unique references public.consultations (id) on delete set null,
  patient_id uuid not null references public.users (id) on delete cascade,
  practitioner_id uuid not null references public.users (id) on delete cascade,
  status public.conversation_status not null default 'active',
  minutes_allocated integer not null,
  minutes_used integer not null default 0,
  minutes_requested integer not null default 0,
  minutes_approved integer not null default 0,
  started_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_patient_idx on public.conversations (patient_id);
create index if not exists conversations_practitioner_idx on public.conversations (practitioner_id);

drop trigger if exists conversations_updated_at on public.conversations;
create trigger conversations_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

alter table public.conversations enable row level security;

-- Now that conversations/messages exist, backfill the deferred FKs left as
-- bare uuid in 004_clinical.sql.
alter table public.prescriptions
  add constraint prescriptions_conversation_fk
  foreign key (conversation_id) references public.conversations (id) on delete set null;

-- ── calls ────────────────────────────────────────────────────────────────────

create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  mongo_id text unique,
  consultation_id uuid null references public.consultations (id) on delete set null,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  initiated_by uuid not null references public.users (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz null,
  duration_seconds integer not null default 0,
  type public.call_type not null,
  status public.call_status not null default 'active',
  livekit_room_name text null,
  livekit_room_url text null,
  created_at timestamptz not null default now()
);

create index if not exists calls_conversation_idx on public.calls (conversation_id, started_at desc);

alter table public.calls enable row level security;

-- ── attached_records ─────────────────────────────────────────────────────────

create table if not exists public.attached_records (
  id uuid primary key default gen_random_uuid(),
  mongo_id text unique,
  consultation_id uuid null references public.consultations (id) on delete set null,
  conversation_id uuid null references public.conversations (id) on delete set null,
  patient_id uuid not null references public.users (id) on delete cascade,
  practitioner_id uuid null references public.users (id) on delete set null,
  type public.attached_record_type not null,
  title text not null,
  description text null,
  file_url text not null,
  file_mime text not null,
  file_size bigint not null,
  media_id text null,
  uploaded_at timestamptz not null default now(),
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists attached_records_patient_idx on public.attached_records (patient_id, uploaded_at desc);

drop trigger if exists attached_records_updated_at on public.attached_records;
create trigger attached_records_updated_at
  before update on public.attached_records
  for each row execute function public.set_updated_at();

alter table public.attached_records enable row level security;

-- ── messages ─────────────────────────────────────────────────────────────────
-- clientId idempotency (used by the Ably send path) preserved as a unique
-- constraint scoped to (client_id, conversation_id), same as the Mongo
-- compound unique+sparse index.

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  mongo_id text unique,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.users (id) on delete cascade,
  receiver_id uuid not null references public.users (id) on delete cascade,
  content text null,
  type public.message_type not null default 'text',
  file_url text null,
  file_mime text null,
  media_id text null,
  record_id uuid null references public.attached_records (id) on delete set null,
  client_id text null,
  is_read boolean not null default false,
  read_at timestamptz null,
  delivered_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists messages_client_conversation_idx
  on public.messages (client_id, conversation_id) where client_id is not null;
create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at desc);

drop trigger if exists messages_updated_at on public.messages;
create trigger messages_updated_at
  before update on public.messages
  for each row execute function public.set_updated_at();

alter table public.messages enable row level security;

-- Now that messages exists, backfill the deferred FK left as bare uuid in
-- 004_clinical.sql.
alter table public.prescriptions
  add constraint prescriptions_message_fk
  foreign key (message_id) references public.messages (id) on delete set null;

-- No anon/authenticated policies — service role only, same convention as
-- every prior migration.
