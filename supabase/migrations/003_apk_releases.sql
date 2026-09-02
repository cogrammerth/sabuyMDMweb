-- Sabuy MDM Web Hub — in-hub APK releases (device version + Storage bucket)

alter table public.devices
  add column if not exists current_app_version_code integer;

alter table public.app_versions
  add column if not exists package_name text,
  add column if not exists file_size_bytes bigint,
  add column if not exists sha256 text,
  add column if not exists storage_path text;

-- Public bucket so Device Owner UpdateWorker can download apkUrl over HTTPS.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dpc-releases',
  'dpc-releases',
  true,
  104857600,
  array[
    'application/vnd.android.package-archive',
    'application/octet-stream',
    'application/zip'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public read only. Writes stay on the service role (bypasses RLS).
drop policy if exists "Public read dpc-releases" on storage.objects;
create policy "Public read dpc-releases"
  on storage.objects
  for select
  using (bucket_id = 'dpc-releases');

notify pgrst, 'reload schema';
