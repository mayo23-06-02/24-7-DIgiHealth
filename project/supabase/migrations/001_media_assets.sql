-- DigiHealth unified media system
-- Run in Supabase SQL Editor (or via supabase db push)
-- Note: user_id is Mongo User._id (text), NOT auth.users — app uses JWT auth.

create extension if not exists "pgcrypto";

do $$ begin
  create type public.media_file_type as enum (
    'image', 'pdf', 'video', 'audio', 'document'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  conversation_id text null,
  related_type text null,
  related_id text null,
  file_name text not null,
  file_path text not null unique,
  public_url text null,
  mime_type text not null,
  file_size bigint not null check (file_size > 0),
  file_type public.media_file_type not null,
  is_public boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists media_assets_user_id_idx on public.media_assets (user_id);
create index if not exists media_assets_conversation_id_idx
  on public.media_assets (conversation_id) where conversation_id is not null;
create index if not exists media_assets_related_idx
  on public.media_assets (related_type, related_id) where related_id is not null;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists media_assets_updated_at on public.media_assets;
create trigger media_assets_updated_at
  before update on public.media_assets
  for each row execute function public.set_updated_at();

alter table public.media_assets enable row level security;
-- No policies for anon/authenticated → clients cannot touch table directly.
-- Service role (Next.js API) bypasses RLS.

-- Private media bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  false,
  52428800,
  array[
    'image/jpeg','image/png','image/webp','image/gif',
    'application/pdf',
    'video/mp4','video/webm',
    'audio/mpeg','audio/webm','audio/wav','audio/ogg','audio/mp4','audio/x-m4a',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage: no open public policies.
-- Uploads use createSignedUploadUrl (service role).
-- Downloads use createSignedUrl from Next.js API after JWT authz.
