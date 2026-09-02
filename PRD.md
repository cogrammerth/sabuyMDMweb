# Product Requirements Document — Sabuy MDM Web Hub

> **Ground truth for AI sessions.** Prefer this file over `README.md` when implementing features. If code and this document disagree, treat **shipped code as reality** and update this PRD in the same change.

| Field | Value |
| --- | --- |
| Product | Sabuy MDM Web Hub |
| Version | 0.8.0 (in-hub APK releases + version compare) |
| Last updated | 2026-09-02 |
| Primary domain | `https://mdmweb.sabuycall.net` |
| Repo package | `sabuycall-mdm-web` |
| Audience | Android Device Owner (DPC) fleet + internal operators |

---

## 1. Executive Summary & Context

### 1.1 Purpose

Centralized **orchestration server** and **admin web console** for Android Device Owner (Device Policy Controller) client apps used by Sabuy Call. The hub:

1. Ingests device heartbeats (identity, health, optional GPS).
2. Serves per-device remote policy to `PolicySyncWorker`.
3. Publishes APK metadata so clients can silently auto-update.
4. Lets operators manage the fleet, generate Zero-Touch QR enrollments, and (Phase 4) view location history on a map.

This is **not** a Google Play EMM / Android Management API wrapper. It is a first-party control plane: our DPC talks only to this hub.

### 1.2 Tech stack

| Layer | Choice | Role |
| --- | --- | --- |
| App & API | Next.js 15 App Router + TypeScript + React 19 | Pages + Route Handlers |
| Database | Supabase (PostgreSQL) | Devices, policies, location logs |
| DNS / TLS / proxy | Cloudflare | `mdmweb.sabuycall.net` |
| Hosting | VPS (`next start` behind Cloudflare) | Node process |
| Styling (Phase 2+) | Tailwind CSS 4 | Admin UI |

### 1.3 In scope / out of scope

**In scope**

- Android **Device Owner** DPC clients only.
- Heartbeat, policy sync, APK version channel.
- Operator dashboard, remote policy editor, QR provisioning, geo map.

**Out of scope (unless a later PRD revision says otherwise)**

- iOS / Windows / ChromeOS.
- Work Profile (Profile Owner) mode.
- Google Android Management API / Play EMM.
- End-user self-service portal.
- Push command channel (lock / wipe / reboot) — deferred; policy pull + heartbeat is the Phase 1–2 control loop.
- Storing APK binaries in this git repo (host in Supabase Storage `dpc-releases` or at `apkUrl` instead).

### 1.4 Design principles

1. **Client-pull, not server-push.** Workers poll APIs. No FCM requirement in Phase 1–2.
2. **CamelCase JSON at the HTTP boundary; snake_case in Postgres.** Mapping lives in API routes / `src/types/mdm.ts`.
3. **Fail open for policy.** If policy auto-create fails, return hardcoded defaults so the device keeps running.
4. **Service-role DB access only from the server.** Never ship `SUPABASE_SERVICE_ROLE_KEY` to the browser.
5. **No FK from `policies` → `devices`.** `PolicySyncWorker` may run before the first heartbeat.

---

## 2. System Architecture & Component Interactions

```
┌─────────────────────┐
│  Android DPC Client │
│  HeartbeatWorker    │
│  PolicySyncWorker   │
│  UpdateWorker       │
└──────────┬──────────┘
           │ HTTPS
           ▼
┌─────────────────────┐
│     Cloudflare      │
│  DNS / Proxy / SSL  │
│  mdmweb.sabuycall.net
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────┐
│  App host — Next.js (`next start`) │
│  App Router pages (admin UI)    │
│  Route Handlers:                │
│    POST /api/heartbeat          │
│    GET  /api/policy             │
│    GET  /api/version.json       │
│    POST /api/admin/releases/upload │
│    PUT  /api/admin/app-version  │
│    GET  /api/admin/devices      │
│    PUT  /api/admin/devices/:id/policy
│    GET  /api/admin/locations/latest
│    GET  /api/admin/devices/:id/locations
│    GET  /api/health             │
└──────────┬──────────────────────┘
           │ service role (server only)
           ▼
┌─────────────────────┐
│  Supabase Postgres  │
│  devices            │
│  policies           │
│  location_logs      │
│  app_versions       │
└─────────────────────┘
           │
           ▼
┌─────────────────────┐
│  Supabase Storage   │
│  bucket dpc-releases│
└─────────────────────┘
```

### 2.1 Runtime data flow

| Worker | Direction | Endpoint | Persistence |
| --- | --- | --- | --- |
| `HeartbeatWorker` | Client → Hub | `POST /api/heartbeat` | Upsert `devices`; optional insert `location_logs` |
| `PolicySyncWorker` | Hub → Client | `GET /api/policy?deviceId=` | Read/insert `policies` |
| `UpdateWorker` | Hub → Client | `GET /api/version.json` | Active row from `app_versions` (file/constant fallback). Optional `?currentAppVersionCode=` adds `updateAvailable`. |

### 2.2 Source map (Phase 1)

| Path | Responsibility |
| --- | --- |
| `src/app/api/heartbeat/route.ts` | Heartbeat ingest |
| `src/app/api/policy/route.ts` | Policy fetch + auto-create |
| `src/app/api/version.json/route.ts` | APK metadata |
| `src/app/api/admin/devices/**` | Operator fleet list, device detail, policy PUT, location history |
| `src/app/api/admin/locations/latest/route.ts` | Latest GPS pin per device |
| `src/app/api/health/route.ts` | Host / Cloudflare liveness + DB ping |
| `src/lib/locations.ts` | Latest/history location queries (camelCase) |
| `src/app/page.tsx` | Executive operator dashboard (metrics, quick actions, recent activity) |
| `src/app/map/page.tsx` | Fleet Leaflet map (dynamic import, SSR-off) |
| `src/lib/devices.ts` | Fleet list/get; `isOnline` from `last_heartbeat` |
| `src/lib/policies.ts` | Policy map, kiosk validation, upsert |
| `src/lib/online.ts` | 15-minute online window |
| `src/lib/operator-auth.ts` | Shared `OPERATOR_PASSWORD` cookie/bearer gate |
| `src/lib/supabase.ts` | Server-only admin client singleton |
| `src/types/mdm.ts` | Shared types + `Database` schema |
| `supabase/migrations/001_mdm_phase1.sql` | Canonical schema |
| `.env.example` | Required env var names |
| `src/app/devices/page.tsx` | Fleet dashboard |
| `src/app/devices/[deviceId]/page.tsx` | Device policy editor |
| `src/app/api/admin/releases/**` | In-hub APK upload to Storage `dpc-releases` + release list |
| `src/lib/apk-parse.ts` | APK metadata via `app-info-parser` |
| `src/lib/releases.ts` | Storage upload + publish to `app_versions` |
| `src/lib/provisioning.ts` | APK checksum + Enterprise extras + QR data URL |
| `src/app/provisioning/page.tsx` | Operator Zero-Touch QR console |
| `src/lib/agents/**` | Multi-agent pipeline state, orchestrator, specialists |
| `src/context/LanguageContext.tsx` | Operator language provider + `useTranslation` |
| `src/locales/en.json`, `src/locales/th.json` | English / Thai dictionaries |
| `src/components/i18n/**` | Language dropdown + translated page copy |
| `src/components/agents/AgentOfficeView.tsx` | Kunio-kun pixel office widget |
| `e2e/**`, `scripts/browser-loop.mjs` | Playwright / localhost QA loop |
| `AGENTS.md`, `.cursor/rules/**` | Specialist desk boundaries |

---

## 3. Complete API Specifications

**Base URL:** `https://mdmweb.sabuycall.net`

**Conventions**

- JSON request/response, UTF-8.
- Error shape (when `success: false`): `{ "success": false, "error": "<message>" }`.
- Policy success responses are a **flat camelCase object** (no `{ success, data }` wrapper) so the Android client can deserialize directly.
- `version.json` is likewise a flat object.
- Heartbeat success: `{ "success": true, "timestamp": <epoch_ms>, "updateAvailable": <bool>, "latestVersionCode": <number> }`.
- **Phase 1 APIs are unauthenticated.** Treat the public URL as a trusted fleet channel until a later revision adds a device token / HMAC.
- **Admin APIs require the operator gate.** `OPERATOR_PASSWORD` issues an httpOnly session cookie (or `Authorization: Bearer`). In local development, if the password is unset the gate stays open so Playwright can run. Production refuses admin routes until the password is set.

---

### 3.1 `POST /api/heartbeat`

Ingests payload from Android `HeartbeatWorker`. Upserts `devices` on `device_id`. If valid GPS is present, inserts `location_logs`.

**Request**

```http
POST /api/heartbeat
Content-Type: application/json
```

```json
{
  "deviceId": "string (required, non-empty)",
  "model": "string",
  "androidVersion": "string",
  "batteryLevel": 0,
  "storageFreeMb": 0,
  "latitude": 13.7563,
  "longitude": 100.5018,
  "currentAppVersionCode": 12
}
```

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `deviceId` | string | **Yes** | Stable hardware/app ID. Unique in `devices.device_id`. |
| `model` | string | No | Stored as `null` if missing/non-string. |
| `androidVersion` | string | No | e.g. `"14"`. |
| `batteryLevel` | number | No | Finite number only; otherwise `null`. |
| `storageFreeMb` | number | No | Finite number only; otherwise `null`. |
| `latitude` | number | No | Must be finite and in `[-90, 90]`. |
| `longitude` | number | No | Must be finite and in `[-180, 180]`. |
| `currentAppVersionCode` | number | No | Integer ≥ 0. Stored as `devices.current_app_version_code`. Ignored if missing/invalid so older clients keep working. |

Location is recorded **only if both** `latitude` and `longitude` are valid numbers. Invalid GPS is ignored; heartbeat still succeeds.

**Server side-effects**

- `devices` upsert (`onConflict: device_id`): sets `is_online = true`, `last_heartbeat = now()`. If `currentAppVersionCode` is a valid integer, also sets `current_app_version_code`.
- Compares the reported code to the active `app_versions.version_code` and returns `updateAvailable` / `latestVersionCode`.
- Does **not** currently set `device_name` or `is_device_owner` (columns exist for Phase 2).
- There is **no** background job yet that flips `is_online` to `false` after a timeout.

**Responses**

| Status | Body | When |
| --- | --- | --- |
| 200 | `{ "success": true, "timestamp": 1710000000000, "updateAvailable": false, "latestVersionCode": 15 }` | Upsert (and optional location insert) OK |
| 400 | `{ "success": false, "error": "Invalid JSON body" }` | Body is not JSON |
| 400 | `{ "success": false, "error": "deviceId is required" }` | Missing/blank `deviceId` |
| 500 | `{ "success": false, "error": "Failed to update device heartbeat" }` | Devices upsert failed |
| 500 | `{ "success": false, "error": "Failed to record location" }` | Location insert failed (device row already upserted) |
| 500 | `{ "success": false, "error": "Internal server error" }` | Unexpected exception |

---

### 3.2 `GET /api/policy`

Serves remote policy to Android `PolicySyncWorker`. Auto-creates a default enterprise row if none exists.

**Request**

```http
GET /api/policy?deviceId=<id>
```

| Query | Required | Notes |
| --- | --- | --- |
| `deviceId` | **Yes** | Trimmed. 400 if missing/blank. |

**Success body (200)** — camelCase, no wrapper:

```json
{
  "disableCamera": false,
  "disableFactoryReset": true,
  "disableSafeBoot": true,
  "disableUsbDebugging": false,
  "kioskMode": false,
  "kioskPackage": "",
  "hiddenApps": [],
  "suspendedApps": []
}
```

**Default enterprise policy** (also the insert used on first sync):

| Key | Default | Intent |
| --- | --- | --- |
| `disableCamera` | `false` | Camera allowed unless operator tightens |
| `disableFactoryReset` | `true` | Block factory reset on managed devices |
| `disableSafeBoot` | `true` | Block safe-mode bypass |
| `disableUsbDebugging` | `false` | ADB allowed until operator tightens |
| `kioskMode` | `false` | Lock-task off by default |
| `kioskPackage` | `""` | Required when kiosk is enabled |
| `hiddenApps` | `[]` | Package names to hide |
| `suspendedApps` | `[]` | Package names to suspend |

**Behavior**

1. If a `policies` row exists → return mapped fields.
2. Else insert defaults (including `updated_at`).
3. Unique-violation race (`23505`) → re-read and return that row.
4. Insert failure (other) → still **200 + defaults** so the device is not bricked.

**Error responses**

| Status | Body | When |
| --- | --- | --- |
| 400 | `{ "success": false, "error": "deviceId query parameter is required" }` | Missing `deviceId` |
| 500 | `{ "success": false, "error": "Failed to fetch policy" }` | Select failed |
| 500 | `{ "success": false, "error": "Internal server error" }` | Unexpected exception |

There is **no** public `PUT /api/policy`. Operators save through `PUT /api/admin/devices/:deviceId/policy`.

---

### 3.3 `GET /api/version.json`

Returns APK metadata for background auto-updates (`UpdateWorker`).

**Request**

```http
GET /api/version.json
GET /api/version.json?currentAppVersionCode=12
```

**Success body (200)**

```json
{
  "versionCode": 1,
  "versionName": "1.0.0",
  "apkUrl": "https://mdmweb.sabuycall.net/apk/sabuy-mdm.apk",
  "isMandatory": false
}
```

| Field | Type | Meaning |
| --- | --- | --- |
| `versionCode` | number | Android `versionCode`. Client updates if remote > local. |
| `versionName` | string | Display version. |
| `apkUrl` | string | HTTPS URL of the APK. |
| `isMandatory` | boolean | If true, client should block usage until updated. |
| `updateAvailable` | boolean | Present only when `currentAppVersionCode` is supplied. `true` when remote `versionCode` is greater. |

**Headers:** `Cache-Control: no-store, max-age=0` so workers never cache a stale APK pointer.

**Current implementation:** `GET /api/version.json` reads the active `app_versions` row (`is_active = true`). If the table is missing or empty, it falls back to `data/app-version-active.json` then `DEFAULT_VERSION_INFO`. Operators publish by uploading an APK (`POST /api/admin/releases/upload`) or by URL (`PUT /api/admin/app-version`). Optional query `currentAppVersionCode` adds `updateAvailable`.

**Error:** unexpected exceptions still return **200 + fallback constants** so UpdateWorker is not bricked. `500 { "success": false }` is not used on this route.

---

### 3.4 Admin fleet APIs (Phase 2)

All `/api/admin/*` routes require the operator gate (`OPERATOR_PASSWORD` session cookie or Bearer token). Device-facing routes stay on `/api/heartbeat`, `/api/policy`, `/api/version.json`.

JSON at the HTTP boundary is **camelCase**. `isOnline` is **computed** from `last_heartbeat` (within 15 minutes) and is not read from the `is_online` column.

#### `GET /api/admin/devices`

```json
{
  "success": true,
  "devices": [
    {
      "deviceId": "string",
      "deviceName": null,
      "model": "Pixel 8",
      "androidVersion": "14",
      "batteryLevel": 80,
      "storageFreeMb": 4096,
      "isDeviceOwner": false,
      "isOnline": true,
      "lastHeartbeat": "2026-08-22T04:00:00.000Z",
      "currentAppVersionCode": 12,
      "createdAt": "2026-08-22T04:00:00.000Z"
    }
  ],
  "summary": { "total": 1, "online": 1, "offline": 0, "lowBattery": 0 }
}
```

Low battery in the summary is `batteryLevel < 20`.

#### `GET /api/admin/devices/:deviceId`

```json
{
  "success": true,
  "device": { "deviceId": "…" },
  "policy": { "disableCamera": false, "kioskMode": false, "kioskPackage": "", "hiddenApps": [], "suspendedApps": [] }
}
```

`device` may be `null` if PolicySyncWorker ran before the first heartbeat. `policy` is defaults when no row exists (GET does not auto-insert).

#### `PUT /api/admin/devices/:deviceId/policy`

Operator policy save. Upserts `policies` and bumps `updated_at`. **No FK to devices** — saving policy for an unseen device is allowed.

**Request** (camelCase)

```json
{
  "disableCamera": false,
  "disableFactoryReset": true,
  "disableSafeBoot": true,
  "disableUsbDebugging": false,
  "kioskMode": false,
  "kioskPackage": "",
  "hiddenApps": [],
  "suspendedApps": []
}
```

| Status | Body | When |
| --- | --- | --- |
| 200 | `{ "success": true, "policy": { …PolicyResponse } }` | Upsert OK |
| 400 | `{ "success": false, "error": "kioskPackage is required when kioskMode is true" }` | Locktask on with empty package |
| 401 | `{ "success": false, "error": "Operator authentication required" }` | Gate configured and no session |
| 503 | `{ "success": false, "error": "Operator gate is not configured …" }` | Production without `OPERATOR_PASSWORD` |

### 3.5 Zero-Touch provisioning APIs (Phase 3)

#### `GET /api/admin/provisioning/config`

Returns DPC component / APK URL / server URL plus the resolved APK checksum and its source (`local-file` | `remote-apk` | `env-override`).

#### `POST /api/admin/provisioning/qr`

Builds Android Enterprise extras, computes SHA-256 (base64url, no padding) of the published APK, and returns a PNG data URL.

**Request**

```json
{
  "deviceId": "optional-preassigned-id",
  "leaveAllSystemAppsEnabled": true
}
```

**Success**

```json
{
  "success": true,
  "checksum": "<base64url-sha256>",
  "checksumSource": "local-file",
  "payload": "{…}",
  "qrDataUrl": "data:image/png;base64,…",
  "extras": { "android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME": "…" }
}
```

Checksum resolution order: `DPC_APK_LOCAL_PATH` (or local stub in non-production) → download `DPC_APK_URL` → `DPC_APK_CHECKSUM` env override. Placeholder `<sha256-of-apk>` is never emitted.

### 3.6 Location APIs (Phase 4)

All `/api/admin/*` location routes use the operator gate. JSON is camelCase.

#### `GET /api/admin/locations/latest`

Most recent `location_logs` row per `device_id`, joined with fleet metadata. `isOnline` is computed from `last_heartbeat` (15-minute window).

```json
{
  "success": true,
  "locations": [
    {
      "deviceId": "string",
      "deviceName": null,
      "model": "Pixel 8",
      "batteryLevel": 80,
      "isOnline": true,
      "lastHeartbeat": "2026-08-22T12:00:00.000Z",
      "latitude": 13.7563,
      "longitude": 100.5018,
      "recordedAt": "2026-08-22T12:00:00.000Z"
    }
  ]
}
```

Devices with no GPS rows are omitted (no pin to draw).

#### `GET /api/admin/devices/:deviceId/locations`

Historical breadcrumbs ordered by `recorded_at` **ASC** (oldest first) so the UI can draw a polyline. Newest 500 rows are kept.

```json
{
  "success": true,
  "deviceId": "string",
  "locations": [
    { "id": "uuid", "latitude": 13.7563, "longitude": 100.5018, "recordedAt": "2026-08-22T12:00:00.000Z" }
  ]
}
```

### 3.7 `GET /api/health`

Public liveness probe (no operator auth). Does not return connection strings, keys, or driver error text.

| Status | Body | When |
| --- | --- | --- |
| 200 | `{ "status": "healthy", "database": "connected", "checkedAt": "<iso>" }` | Process up and service-role SELECT against `devices` succeeded |
| 503 | `{ "status": "unhealthy", "database": "error", "checkedAt": "<iso>" }` | Env missing or database unreachable |

**Headers:** `Cache-Control: no-store, max-age=0`. Railway `railway.json` healthcheck path is `/api/health`.

### 3.8 App release + device rename (production readiness)

#### `GET /api/admin/app-version`

Operator-gated. Returns `{ success, active, fallback }` where `active` is the current `app_versions` row (or file-fallback record) and `fallback` is `DEFAULT_VERSION_INFO` when no row exists.

#### `PUT /api/admin/app-version`

Operator-gated publish. Deactivates the previous active row, upserts on `version_code`, and writes the file fallback.

**Request**

```json
{
  "versionCode": 2,
  "versionName": "1.1.0",
  "apkUrl": "https://mdmweb.sabuycall.net/apk/sabuy-mdm.apk",
  "isMandatory": false
}
```

`apkUrl` must be HTTPS (http is allowed only for localhost). `versionCode` must be a positive integer.

### 3.10 In-hub APK upload (Supabase Storage)

Operator-gated. Parses the APK with `app-info-parser`, uploads bytes to bucket `dpc-releases`, and publishes the active `app_versions` row.

#### `GET /api/admin/releases`

Returns `{ success, active, releases, fallback }` — the active channel plus stored rows ordered by `versionCode` descending.

#### `POST /api/admin/releases/upload`

`multipart/form-data`:

| Field | Required | Notes |
| --- | --- | --- |
| `apk` (or `file`) | **Yes** | `.apk` file, ZIP magic, max 80MB |
| `isMandatory` | No | `"true"` / `"1"` / `"on"` |

**Success:** `{ "success": true, "version": { …AppVersionRecord } }`

| Status | When |
| --- | --- |
| 400 | Missing file, not an APK, or parser could not read `versionCode` / `versionName` |
| 401 | Operator gate required |
| 503 | Storage bucket `dpc-releases` missing or upload failed |

The public object URL becomes `apkUrl`. `versionCode` / `versionName` / `package` come from the APK, not from operator-typed fields.

#### `PATCH /api/admin/devices/:deviceId`

Operator-gated rename. Body `{ "deviceName": "Store Front Tablet" }` or `null` to clear. Updates `devices.device_name`.

### 3.9 Planned APIs (not implemented)

| Method | Path | Phase | Purpose |
| --- | --- | --- | --- |
| — | device token / HMAC on heartbeat + policy | later | Stop anonymous fleet spam |

---

## 4. Database Schema Definitions

Canonical SQL: `supabase/migrations/001_mdm_phase1.sql`.

RLS is **enabled** on all tables with **no anon/authenticated policies**. The Next.js server uses the **service role** key (bypasses RLS). Direct PostgREST access with the anon key must not return rows.

---

### 4.1 `public.devices`

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| `id` | uuid | PK, `gen_random_uuid()` | Internal row id |
| `device_id` | text | NOT NULL, UNIQUE | Client-supplied ID |
| `device_name` | text | nullable | Phase 2 operator label |
| `model` | text | nullable | From heartbeat |
| `android_version` | text | nullable | From heartbeat |
| `battery_level` | integer | nullable | From heartbeat |
| `storage_free_mb` | integer | nullable | From heartbeat |
| `is_device_owner` | boolean | NOT NULL, default `false` | Not set by heartbeat yet |
| `is_online` | boolean | NOT NULL, default `false` | Set `true` on heartbeat |
| `last_heartbeat` | timestamptz | nullable | Set on heartbeat |
| `current_app_version_code` | integer | nullable | From heartbeat `currentAppVersionCode` (`003_apk_releases.sql`) |
| `created_at` | timestamptz | NOT NULL, default `now()` | |

**Index:** `devices_last_heartbeat_idx` on `last_heartbeat DESC`.

---

### 4.2 `public.policies`

Per-device enterprise policy. **No FK to `devices`** so policy can exist before first heartbeat.

| Column | Type | Constraints | Default |
| --- | --- | --- | --- |
| `device_id` | text | PK | — |
| `disable_camera` | boolean | NOT NULL | `false` |
| `disable_factory_reset` | boolean | NOT NULL | `true` |
| `disable_safe_boot` | boolean | NOT NULL | `true` |
| `disable_usb_debugging` | boolean | NOT NULL | `false` |
| `kiosk_mode` | boolean | NOT NULL | `false` |
| `kiosk_package` | text | NOT NULL | `''` |
| `hidden_apps` | text[] | NOT NULL | `'{}'` |
| `suspended_apps` | text[] | NOT NULL | `'{}'` |
| `updated_at` | timestamptz | NOT NULL | `now()` |

---

### 4.3 `public.location_logs`

| Column | Type | Constraints |
| --- | --- | --- |
| `id` | uuid | PK, `gen_random_uuid()` |
| `device_id` | text | NOT NULL, FK → `devices(device_id)` ON DELETE CASCADE |
| `latitude` | double precision | NOT NULL |
| `longitude` | double precision | NOT NULL |
| `recorded_at` | timestamptz | NOT NULL, default `now()` |

**Index:** `location_logs_device_id_recorded_at_idx` on `(device_id, recorded_at DESC)`.

Because of the FK, a heartbeat **must** upsert `devices` before inserting location (current route order is correct).

---

### 4.4 `public.app_versions`

Canonical SQL: `supabase/migrations/002_app_versions.sql` plus extras in `003_apk_releases.sql`. RLS enabled, no anon grants. Served by `GET /api/version.json`; written by `PUT /api/admin/app-version` and `POST /api/admin/releases/upload`.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | PK |
| `version_code` | integer | NOT NULL, unique |
| `version_name` | text | NOT NULL |
| `apk_url` | text | NOT NULL |
| `is_mandatory` | boolean | NOT NULL, default `false` |
| `is_active` | boolean | Operator-published channel; `GET /api/version.json` reads the active row |
| `released_at` | timestamptz | default `now()` |
| `package_name` | text | From APK parser (`003`) |
| `file_size_bytes` | bigint | Uploaded byte length (`003`) |
| `sha256` | text | Hex SHA-256 of the APK (`003`) |
| `storage_path` | text | Object path in bucket `dpc-releases` (`003`) |

**Storage:** public bucket `dpc-releases` (public read, service-role write). APK binaries are **not** stored in git.

---

## 5. Four-Phase Implementation Roadmap & Status Tracker

| Phase | Name | Status | Goal |
| --- | --- | --- | --- |
| **1** | Backend API & Database Engine | **Completed** | Heartbeat, policy, version channel, schema, RLS |
| **2** | Fleet Dashboard & Remote Policy UI | **Completed** | Operator console: list devices, edit policy, mark online |
| **3** | Zero-Touch QR Provisioning Generator | **Completed** | Encode DPC extras into a scannable QR for factory reset / new devices |
| **4** | Geo-Tracking Maps & Railway Production Hardening | **Completed** | Map view of `location_logs`; healthcheck; security headers |
| **6** | In-hub APK releases | **Completed** | Upload APK to `dpc-releases`, parse metadata, compare device version codes |

Domain `https://mdmweb.sabuycall.net` may already front a Railway service. Phase 4 is **hardening** (env, health checks, APK hosting, online-timeout job), not “first deploy ever.”

---

### Phase 1 — Backend API & Database Engine — **Completed**

**Done**

- [x] Next.js App Router + TypeScript project
- [x] Supabase admin client (`src/lib/supabase.ts`)
- [x] `devices`, `policies`, `location_logs` + RLS
- [x] `POST /api/heartbeat`
- [x] `GET /api/policy?deviceId=`
- [x] `GET /api/version.json` (active `app_versions` row with file/constant fallback)
- [x] Executive dashboard on `/` (metrics, quick actions, recent activity)
- [x] `/admin` console shell (fleet table, policy toggles, QR preview, agent office)

**Not in Phase 1 (known gaps)**

- Device/API authentication (heartbeat / policy still open)
- `is_online` column is advisory; dashboards compute from `last_heartbeat`
- Heartbeat fields for `is_device_owner`

---

### Phase 2 — Fleet Dashboard & Remote Policy UI — **Completed**

**Shipped**

- [x] Shared operator gate (`OPERATOR_PASSWORD` cookie / Bearer). Production 503 if unset; local gate open when unset.
- [x] Fleet dashboard `/devices`: summary cards, search/filter, battery bar, relative heartbeat, Configure.
- [x] Device policy editor `/devices/[deviceId]`: camera / factory reset / safe boot / USB debugging / kiosk + package, hidden/suspended app lists, toast on save.
- [x] `PUT /api/admin/devices/:deviceId/policy` upserts `policies` and bumps `updated_at`.
- [x] `isOnline` computed from `last_heartbeat` within **15 minutes** (not the `is_online` column).
- [x] Kiosk save rejected when `kioskMode` is true and `kioskPackage` is empty.

**Deferred**

- Supabase Auth (email) — the shared password gate is the Phase 2 decision.

**Acceptance (met)**

- Changing policy in UI is visible on the next `PolicySyncWorker` poll.
- Unauthenticated users cannot read or write `/api/admin/*` or `/devices` when `OPERATOR_PASSWORD` is set (production always requires it).
- `SUPABASE_SERVICE_ROLE_KEY` never appears in client bundles.

---

### Phase 3 — Zero-Touch QR Provisioning Generator — **Completed**

**Shipped**

- [x] `POST /api/admin/provisioning/qr` + `GET /api/admin/provisioning/config` (operator-gated)
- [x] `/provisioning` page with real QR (PNG data URL), download, print, copy JSON
- [x] Extras include component name, APK HTTPS URL, computed checksum, admin extras bundle
- [x] Optional pre-assigned `deviceId` in `PROVISIONING_ADMIN_EXTRAS_BUNDLE`
- [x] Checksum from local APK path / remote download / env override — never a typed placeholder

**Config**

| Env | Default |
| --- | --- |
| `DPC_COMPONENT_NAME` | `net.sabuycall.mdm/.DeviceAdminReceiver` |
| `DPC_APK_URL` | `https://mdmweb.sabuycall.net/apk/sabuy-mdm.apk` |
| `MDM_SERVER_URL` | `https://mdmweb.sabuycall.net` |
| `DPC_APK_LOCAL_PATH` | `fixtures/provisioning-apk-stub.bin` in non-production |
| `DPC_APK_CHECKSUM` | unset (last-resort override) |

Freeze the real DPC package/receiver in the Android repo, then set `DPC_COMPONENT_NAME` and host the APK so production hashes real bytes.

---

### Phase 4 — Geo-Tracking Maps & Production Hardening — **Completed**

**Shipped**

- [x] `GET /api/admin/locations/latest` — latest GPS per device + fleet metadata (operator-gated)
- [x] `GET /api/admin/devices/:deviceId/locations` — history ASC for polylines (operator-gated)
- [x] `GET /api/health` — `healthy` + database ping; Railway `healthcheckPath`
- [x] Fleet map `/map` — Leaflet (OSM), SSR-safe dynamic import, green/gray pins, popups
- [x] Device detail **Location history** tab — polyline breadcrumbs
- [x] Security headers in `next.config.ts`; `/map` on the operator middleware matcher
- [x] `railway.json` restart-on-failure + healthcheck `/api/health`

**Still optional / later**

- Retention job for old `location_logs`.
- Device token on heartbeat/policy to stop anonymous fleet spam.

---

### Production readiness — **Completed**

**Shipped**

- [x] `app_versions` table + RLS (`002_app_versions.sql`)
- [x] `GET /api/version.json` reads the active row (file/constant fallback)
- [x] `PUT /api/admin/app-version` + `/settings` release editor
- [x] `PATCH /api/admin/devices/:id` + inline fleet name editor
- [x] Mandatory smoke gate: `e2e/smoke-gate.spec.ts` + in-app tester fetch smoke (health, handshake, heartbeat GPS, UI/auth, QR)

**Acceptance (met)**

- Publishing APK metadata updates the next `UpdateWorker` poll without a hub redeploy.
- Friendly `device_name` is editable from `/devices` and persisted.
- QA desk cannot sign off unless health, policy/version handshake, heartbeat upsert, UI loads, and Zero-Touch QR are green.

---

### In-hub APK releases — **Completed**

**Shipped**

- [x] `app-info-parser` parses uploaded APK `versionCode` / `versionName` / package
- [x] `POST /api/admin/releases/upload` stores the binary in Supabase bucket `dpc-releases` and upserts `app_versions`
- [x] `GET /api/admin/releases` lists stored channels; `/settings` has a drop zone + active-release list
- [x] Heartbeat stores `currentAppVersionCode` and returns `updateAvailable` / `latestVersionCode`
- [x] `GET /api/version.json?currentAppVersionCode=` adds `updateAvailable`
- [x] `/devices` (and device identity) show up-to-date / outdated / unknown version badges
- [x] Migration `003_apk_releases.sql` (device version column, extra release metadata, public bucket)

**Acceptance (met)**

- Operators can publish a new DPC APK from the hub without hosting the file in git.
- Devices that report a lower `currentAppVersionCode` are flagged as outdated on the fleet table.
- `UpdateWorker` still consumes the same flat `version.json` object; `updateAvailable` is additive.

---

### Bilingual i18n (Thai / English) — **Completed**

**Shipped**

- [x] `LanguageProvider` + `useTranslation` (`src/context/LanguageContext.tsx`)
- [x] Dictionaries `src/locales/th.json` / `src/locales/en.json` (navbar, metrics, 3-step QR enroll, device actions)
- [x] Header language dropdown (`🇹🇭 ภาษาไทย` / `🇬🇧 English`); choice persisted in `localStorage` (`sabuy-mdm-locale`), default `th` with browser auto-detect
- [x] Operator chrome on `/`, `/login`, `/devices`, `/map`, `/provisioning`, `/settings` uses `t('key')`
- [x] Playwright i18n smoke: `e2e/i18n.spec.ts` (instant toggle, no missing keys, no Thai overflow)

**Acceptance (met)**

- Toggling language updates visible copy without a full page reload.
- Missing keys fall back to English; both dictionaries share the same key set.
- Thai labels wrap in the global header; pages must not grow a horizontal scrollbar.

---

## 6. Environment & Secrets

| Variable | Where | Public? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` / Railway | Yes (URL only) |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` / Railway | **No — server only** |
| `OPERATOR_PASSWORD` | `.env.local` / Railway | **No — operator gate** |
| `DPC_COMPONENT_NAME` | `.env.local` / Railway | No (server config) |
| `DPC_APK_URL` | `.env.local` / Railway | No (server config) |
| `MDM_SERVER_URL` | `.env.local` / Railway | No (server config) |
| `DPC_APK_LOCAL_PATH` | `.env.local` / CI | No — path to APK bytes for checksum |
| `DPC_APK_CHECKSUM` | `.env.local` / Railway | No — last-resort override |

Do not commit `.env.local`. Do not put secrets in this PRD.

**Local setup**

```bash
cp .env.example .env.local
npm install
npm run dev
```

Apply `supabase/migrations/001_mdm_phase1.sql`, `002_app_versions.sql`, and `003_apk_releases.sql` in the Supabase SQL editor if tables or the `dpc-releases` bucket are missing.

---

## 7. Security & Privacy

| Topic | Current (Phase 2) | Target |
| --- | --- | --- |
| Device APIs | Open to anyone who knows the URL | Device token / HMAC on heartbeat + policy |
| Admin UI | Shared `OPERATOR_PASSWORD` gate on `/devices` and `/api/admin/*` | Optional upgrade to Supabase Auth / Cloudflare Access |
| Database | RLS on, no public policies; service role from API | Keep; never use service role in the browser |
| Location | Stored as lat/lng per heartbeat; operator-gated map APIs | Retention job still optional |
| PII | `device_id` + GPS | Treat as operational PII; no analytics dump to third parties |

---

## 8. Android Client Contract (hub assumptions)

The Android DPC is a **separate codebase**. This hub assumes:

| Worker | Interval (suggested) | Behavior |
| --- | --- | --- |
| `HeartbeatWorker` | 5–15 min | POST heartbeat; include GPS when available; send `currentAppVersionCode` |
| `PolicySyncWorker` | 5–15 min | GET policy; apply DevicePolicyManager restrictions |
| `UpdateWorker` | 6–24 h | GET version.json (optional `?currentAppVersionCode=`); if `versionCode` higher, download `apkUrl` and install (Device Owner silent install) |

`deviceId` must be stable across reboots (Android ID, or an ID written at provisioning time).

If `kioskMode` is true, `kioskPackage` must be a launchable package already installed (or installable via the DPC). Empty package + kiosk true is invalid; Phase 2 UI should prevent saving that combination.

---

## 9. Open Questions

Resolve before or during Phase 2:

1. **Operator auth:** **Decided — shared `OPERATOR_PASSWORD` gate** (cookie + Bearer). Supabase Auth / Cloudflare Access can replace it later.
2. **Online window:** **15 minutes**, computed from `last_heartbeat`.
3. **DPC identity:** default `net.sabuycall.mdm/.DeviceAdminReceiver` — freeze in Android repo and override `DPC_COMPONENT_NAME` when final.
4. **Heartbeat auth:** when to require a provisioning-time token?
5. **Multi-tenant:** one global fleet, or policies grouped by store/branch?
6. **APK hosting:** **Decided — Supabase Storage bucket `dpc-releases`** (public read for UpdateWorker). URL publish remains as a fallback.

---

## 10. Success Metrics (lightweight)

| Metric | Phase | Signal |
| --- | --- | --- |
| Heartbeat success rate | 1–2 | 2xx / total POSTs |
| Policy apply lag | 2 | Time from UI save to next successful GET |
| Enroll time | 3 | Scan QR → Device Owner ready |
| Location freshness | 4 | Median age of last `location_logs` row for “online” devices |

---

## 11. Multi-Agent Pipeline & Virtual Office

In-app workflow engine used by the operator console (and mirrored as Cursor desk rules). The **Lead Orchestrator** is the only desk that talks to the operator. Specialists return structured check reports; they do not invent scope.

| Desk | Codename | Runtime | Owns |
| --- | --- | --- | --- |
| Lead Orchestrator | Kunio | `src/lib/agents/orchestrator.ts`, `pipeline.ts` | Goal split, handoffs, sign-off |
| Backend & API | Riki | `specialists/backend.ts` | Routes, schema, DPC contracts |
| Frontend & UI | Misako | `specialists/frontend.ts` | `/admin` surfaces + testids |
| QA / Browser | Godai | `specialists/tester.ts` | Playwright / fetch smoke |
| Security / DPC | Tosa | `specialists/security.ts` | RLS, locktask, Safe Boot, ZT extras |

**State** (`src/lib/agents/state.ts`, persisted at `data/agent-state.json`):

- `current_agent`
- `task_queue`
- `handoff_log`
- `status`: `IDLE` \| `WORKING` \| `VALIDATING` \| `COMPLETED` \| `ERROR`

**HTTP**

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/agents/state` | Snapshot |
| `GET` | `/api/agents/events` | SSE stream of the same snapshot |
| `POST` | `/api/agents/dispatch` | `{ "goal": "..." }` — start a floor run |
| `POST` | `/api/agents/test` | Isolated QA loop |

Live Chromium (`scripts/browser-loop.mjs`) runs only when `ALLOW_AGENT_BROWSER=1` (local/CI with Playwright browsers). Fetch smoke always runs. A failing tester report **blocks** orchestrator sign-off.

**Mandatory smoke gate** (Godai, against `http://localhost:3000`):

1. `GET /api/health` → 200, `healthy`, DB `connected`
2. `GET /api/version.json` and `GET /api/policy?deviceId=test-device-01` return valid payloads
3. `POST /api/heartbeat` with mock GPS/battery (and optional `currentAppVersionCode`) → 200, upserts fleet + location, returns `updateAvailable`
4. `/login`, `/devices`, `/map`, `/provisioning`, `/settings` load without uncaught console errors or 500s; unauthenticated UI redirects to `/login` when the operator gate is required
5. Fleet table search/filter responds; Zero-Touch QR renders without runtime exceptions

Visualizer: `/admin` widget `data-testid="agent-office"` (Kunio-kun pixel desks, typing vs idle, paper-packet handoff, speech bubble).

---

## Changelog

| Date | Change |
| --- | --- |
| 2026-09-02 | In-hub APK releases: Storage `dpc-releases`, upload parser, heartbeat/version compare, fleet version badges |
| 2026-09-02 | Operator console UX: executive dashboard on `/`, sidebar app shell, status badges, rename modal; Thai default locale |
| 2026-08-30 | Bilingual i18n (Thai / English): `LanguageProvider`, locale dictionaries, header language dropdown, Playwright i18n smoke |
| 2026-08-26 | Production readiness: `app_versions`, device rename, `/settings`, mandatory smoke gate |
| 2026-08-22 | Phase 4: fleet Leaflet map, location history, `/api/health`, security headers |
| 2026-08-22 | Phase 3: Zero-Touch QR (`/provisioning`), computed APK checksum, download/print |
| 2026-08-22 | Phase 2: fleet dashboard, remote policy editor, admin PUT, 15-min online, operator gate |
| 2026-08-22 | Multi-agent pipeline, `/admin` console shell, Kunio-kun office, Playwright loop |
| 2026-08-22 | Initial PRD from Phase 1 code + four-phase roadmap |
)
