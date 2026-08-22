# Sabuy MDM Web Hub

Phase 1 — Backend API & Database Engine for Android MDM devices.

**Deployment:** https://mdmweb.sabuycall.net

## Stack

- Next.js App Router
- TypeScript
- Supabase (PostgreSQL)

## Setup

1. Copy environment variables:

```bash
cp .env.example .env.local
```

2. Set real values in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

3. Install and run:

```bash
npm install
npm run dev
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/heartbeat` | Device heartbeat upsert + optional location log |
| `GET` | `/api/policy?deviceId=` | Policy sync (auto-creates default enterprise policy) |
| `GET` | `/api/version.json` | APK version metadata for silent updates |
