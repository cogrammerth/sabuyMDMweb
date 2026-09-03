-- Sabuy MDM Web Hub — per-device API tokens (hash only; plaintext in QR / rotate once)

alter table public.devices
  add column if not exists device_token_hash text,
  add column if not exists device_token_issued_at timestamptz;

create unique index if not exists devices_device_token_hash_uidx
  on public.devices (device_token_hash)
  where device_token_hash is not null;

comment on column public.devices.device_token_hash is
  'SHA-256 hex of the device bearer token (optional pepper via DEVICE_TOKEN_PEPPER). Never store plaintext.';
comment on column public.devices.device_token_issued_at is
  'When the current device_token_hash was issued (QR provision or operator rotate).';

notify pgrst, 'reload schema';
