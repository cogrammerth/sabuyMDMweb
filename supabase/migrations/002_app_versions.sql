-- Sabuy MDM Web Hub — app_versions for operator-published APK metadata

create table if not exists public.app_versions (
  id uuid primary key default gen_random_uuid(),
  version_code integer not null unique,
  version_name text not null,
  apk_url text not null,
  is_mandatory boolean not null default false,
  is_active boolean not null default false,
  released_at timestamptz not null default now()
);

create index if not exists app_versions_active_released_idx
  on public.app_versions (is_active, released_at desc);

alter table public.app_versions enable row level security;

notify pgrst, 'reload schema';
