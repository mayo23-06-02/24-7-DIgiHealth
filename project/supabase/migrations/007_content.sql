-- DigiHealth Postgres migration — Phase 8: content & misc
-- Run in Supabase SQL Editor after 006_chat.sql
--
-- Unifies the duplicate Notification model (TelehealthCore.ts vs
-- Communications.ts — same shape, redundant source of truth in Mongo) into
-- one table. HealthTip.date / PatientEvent.date+time were free-text strings
-- in Mongo (e.g. "Mon Apr 14 2026", not a real Date type) — the backfill
-- script parses these into real timestamptz columns here, not a type-only
-- change. SystemConfig's Mongo `_id: 'singleton'` string-PK convention
-- becomes a normal uuid-keyed table with exactly one row, enforced at the
-- application layer (same as platform_fee_config in 005_billing.sql).

create extension if not exists "pgcrypto";

do $$ begin
  create type public.health_tip_category as enum ('tip', 'news', 'blog');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.patient_event_type as enum ('note', 'reminder', 'appointment');
exception when duplicate_object then null;
end $$;

-- ── articles ─────────────────────────────────────────────────────────────────

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  mongo_id text unique,
  title text not null,
  slug text not null unique,
  excerpt text not null,
  content text not null,
  cover_image text not null,
  author text not null,
  published_at timestamptz not null default now(),
  read_time_minutes integer not null default 5,
  tags text[] not null default '{}',
  likes integer not null default 0,
  saves integer not null default 0,
  shares integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists articles_published_idx on public.articles (is_published, published_at desc);

drop trigger if exists articles_updated_at on public.articles;
create trigger articles_updated_at
  before update on public.articles
  for each row execute function public.set_updated_at();

alter table public.articles enable row level security;

-- ── health_tips ──────────────────────────────────────────────────────────────

create table if not exists public.health_tips (
  id uuid primary key default gen_random_uuid(),
  mongo_id text unique,
  title text not null,
  excerpt text not null,
  content text null,
  author text not null,
  published_date timestamptz not null,
  read_time text null,
  image text null,
  tag text null,
  category public.health_tip_category not null default 'tip',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists health_tips_category_idx on public.health_tips (category, published_date desc);

drop trigger if exists health_tips_updated_at on public.health_tips;
create trigger health_tips_updated_at
  before update on public.health_tips
  for each row execute function public.set_updated_at();

alter table public.health_tips enable row level security;

-- ── notifications ────────────────────────────────────────────────────────────

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  mongo_id text unique,
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  delivered_via text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_unread_idx
  on public.notifications (user_id) where is_read = false;

drop trigger if exists notifications_updated_at on public.notifications;
create trigger notifications_updated_at
  before update on public.notifications
  for each row execute function public.set_updated_at();

alter table public.notifications enable row level security;

-- ── offline_action_queue ─────────────────────────────────────────────────────

create table if not exists public.offline_action_queue (
  id uuid primary key default gen_random_uuid(),
  mongo_id text unique,
  user_id uuid not null references public.users (id) on delete cascade,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  retry_count integer not null default 0,
  last_attempt timestamptz null,
  synced_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists offline_action_queue_user_idx on public.offline_action_queue (user_id);
create index if not exists offline_action_queue_unsynced_idx
  on public.offline_action_queue (synced_at) where synced_at is null;

alter table public.offline_action_queue enable row level security;

-- ── system_config ────────────────────────────────────────────────────────────
-- App layer must guarantee a single row (fetch-or-create the first row by
-- created_at, same pattern GET /api/admin/settings already uses for the
-- Mongo singleton — just no longer keyed on a hardcoded '_id').

create table if not exists public.system_config (
  id uuid primary key default gen_random_uuid(),
  features jsonb not null default '{}'::jsonb,
  maintenance_mode boolean not null default false,
  popia_version text null,
  consultation_fee_default numeric(10, 2) not null default 0,
  emergency_numbers text[] not null default '{}',
  supported_languages text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists system_config_updated_at on public.system_config;
create trigger system_config_updated_at
  before update on public.system_config
  for each row execute function public.set_updated_at();

alter table public.system_config enable row level security;

-- ── body_annotations ─────────────────────────────────────────────────────────

create table if not exists public.body_annotations (
  id uuid primary key default gen_random_uuid(),
  mongo_id text unique,
  patient_id uuid not null references public.users (id) on delete cascade,
  description text not null,
  part text not null default 'Surface Mapping',
  point_x double precision not null,
  point_y double precision not null,
  point_z double precision not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists body_annotations_patient_idx on public.body_annotations (patient_id);

drop trigger if exists body_annotations_updated_at on public.body_annotations;
create trigger body_annotations_updated_at
  before update on public.body_annotations
  for each row execute function public.set_updated_at();

alter table public.body_annotations enable row level security;

-- ── patient_events ───────────────────────────────────────────────────────────
-- event_at is a real timestamptz (Mongo stored date+time as two separate
-- free-text strings like "Mon Apr 14 2026" / "09:00" — the backfill script
-- parses both into this single column).

create table if not exists public.patient_events (
  id uuid primary key default gen_random_uuid(),
  mongo_id text unique,
  patient_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  event_at timestamptz not null,
  type public.patient_event_type not null default 'reminder',
  notes text null,
  color text not null default 'primary',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists patient_events_patient_idx on public.patient_events (patient_id, event_at);

drop trigger if exists patient_events_updated_at on public.patient_events;
create trigger patient_events_updated_at
  before update on public.patient_events
  for each row execute function public.set_updated_at();

alter table public.patient_events enable row level security;

-- No anon/authenticated policies — service role only, same convention as
-- every prior migration.
