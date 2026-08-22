-- Sabuy MDM Web Hub — Phase 1 schema
-- Run this in Supabase Dashboard → SQL Editor → New query → Run

-- Devices (Android MDM clients)
create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  device_id text not null unique,
  device_name text,
  model text,
  android_version text,
  battery_level integer,
  storage_free_mb integer,
  is_device_owner boolean not null default false,
  is_online boolean not null default false,
  last_heartbeat timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists devices_last_heartbeat_idx
  on public.devices (last_heartbeat desc);

-- Per-device enterprise policies
-- No FK to devices so PolicySyncWorker can auto-create before first heartbeat.
create table if not exists public.policies (
  device_id text primary key,
  disable_camera boolean not null default false,
  disable_factory_reset boolean not null default true,
  disable_safe_boot boolean not null default true,
  disable_usb_debugging boolean not null default false,
  kiosk_mode boolean not null default false,
  kiosk_package text not null default '',
  hidden_apps text[] not null default '{}',
  suspended_apps text[] not null default '{}',
  updated_at timestamptz not null default now()
);

-- GPS / location history from heartbeats
create table if not exists public.location_logs (
  id uuid primary key default gen_random_uuid(),
  device_id text not null references public.devices (device_id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  recorded_at timestamptz not null default now()
);

create index if not exists location_logs_device_id_recorded_at_idx
  on public.location_logs (device_id, recorded_at desc);

-- Service-role API uses the service key (bypasses RLS).
-- Enable RLS anyway so anon/authenticated cannot read raw tables by default.
alter table public.devices enable row level security;
alter table public.policies enable row level security;
alter table public.location_logs enable row level security;

notify pgrst, 'reload schema';
