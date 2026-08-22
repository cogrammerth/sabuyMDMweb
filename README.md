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

## Operator console

`http://localhost:3000/admin` — fleet table, policy preview, QR extras, and the Nekketsu agent office.

```bash
npm run test:e2e
npx playwright install chromium
ALLOW_AGENT_BROWSER=1 npm run test:browser-loop
```

Dispatch a floor run: `POST /api/agents/dispatch` with `{ "goal": "health check" }`.

Operator auth is **not** wired yet — do not expose `/admin` on the public fleet origin.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/heartbeat` | Device heartbeat upsert + optional location log |
| `GET` | `/api/policy?deviceId=` | Policy sync (auto-creates default enterprise policy) |
| `GET` | `/api/version.json` | APK version metadata for silent updates |
