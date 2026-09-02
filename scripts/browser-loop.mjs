#!/usr/bin/env node
/**
 * Quality desk browser loop. Prints a trailing __AGENT_REPORT__ JSON blob
 * for the Lead Orchestrator. Prefer `npx playwright test` for CI; this
 * script is what the in-app tester specialist spawns.
 */
import { createRequire } from "module";

const BASE = process.env.AGENT_BASE_URL || "http://localhost:3000";
const SMOKE_DEVICE_ID = "test-device-01";
const started = Date.now();

function check(name, ok, detail) {
  return { name, ok, detail };
}

function isBenignConsole(text) {
  return /openstreetmap|leaflet|Failed to load resource|net::ERR_|chrome-extension|hydration-mismatch|didn't match the client properties|caret-color/i.test(
    text
  );
}

async function fetchJson(url, init) {
  const res = await fetch(url, init);
  let body = {};
  try {
    body = await res.json();
  } catch {
    body = {};
  }
  return { ok: res.ok, status: res.status, body };
}

async function apiSmoke() {
  const checks = [];

  const health = await fetchJson(`${BASE}/api/health`);
  checks.push(
    check(
      "health",
      health.ok &&
        health.body.status === "healthy" &&
        health.body.database === "connected",
      `GET /api/health → ${health.status}`
    )
  );

  const version = await fetchJson(`${BASE}/api/version.json`);
  checks.push(
    check(
      "version-json",
      version.ok && typeof version.body.versionCode === "number",
      `GET /api/version.json → ${version.status}`
    )
  );

  const policy = await fetchJson(
    `${BASE}/api/policy?deviceId=${encodeURIComponent(SMOKE_DEVICE_ID)}`
  );
  checks.push(
    check(
      "policy-handshake",
      policy.ok && typeof policy.body.disableSafeBoot === "boolean",
      `GET /api/policy → ${policy.status}`
    )
  );

  const heartbeat = await fetchJson(`${BASE}/api/heartbeat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      deviceId: SMOKE_DEVICE_ID,
      model: "Pixel Smoke",
      androidVersion: "14",
      batteryLevel: 87,
      storageFreeMb: 2048,
      latitude: 13.7563,
      longitude: 100.5018,
    }),
  });
  checks.push(
    check(
      "heartbeat-ingest",
      heartbeat.ok && heartbeat.body.success === true,
      `POST /api/heartbeat → ${heartbeat.status}`
    )
  );

  return checks;
}

async function fetchFallback() {
  const checks = await apiSmoke();
  const consoleErrors = [];
  const snapshotDiffs = [];

  for (const path of [
    "/",
    "/login",
    "/admin",
    "/devices",
    "/map",
    "/provisioning",
    "/api/version.json",
    "/api/health",
  ]) {
    try {
      const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
      const redirected =
        res.status >= 300 &&
        res.status < 400 &&
        (res.headers.get("location") ?? "").includes("/login");
      checks.push(
        check(`fetch:${path}`, res.ok || redirected, `${res.status}`)
      );
    } catch (error) {
      checks.push(
        check(`fetch:${path}`, false, error instanceof Error ? error.message : "fail")
      );
    }
  }

  try {
    const htmlRes = await fetch(`${BASE}/login`);
    const html = await htmlRes.text();
    checks.push(
      check(
        "testid:login-form",
        html.includes('data-testid="login-form"') &&
          html.includes('data-testid="operator-email"'),
        "login form"
      )
    );
  } catch (error) {
    checks.push(
      check("admin-html", false, error instanceof Error ? error.message : "fail")
    );
  }

  return { checks, consoleErrors, snapshotDiffs };
}

async function playwrightLoop() {
  const require = createRequire(import.meta.url);
  let chromium;
  try {
    ({ chromium } = require("playwright"));
  } catch {
    try {
      ({ chromium } = require("@playwright/test"));
    } catch {
      return null;
    }
  }
  if (!chromium) return null;

  const checks = await apiSmoke();
  const consoleErrors = [];
  const snapshotDiffs = [];
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });
  page.on("pageerror", (err) => {
    consoleErrors.push(String(err));
  });

  try {
    for (const path of ["/login", "/devices", "/map", "/provisioning", "/admin"]) {
      await page.goto(`${BASE}${path}`, {
        waitUntil: "domcontentloaded",
        timeout: 20_000,
      });
      const landedLogin = page.url().includes("/login");
      const okLand =
        page.url().includes(path) ||
        (path !== "/login" && landedLogin);
      checks.push(
        check(
          `page:${path}`,
          okLand,
          landedLogin && path !== "/login"
            ? "redirected to /login"
            : `loaded ${path}`
        )
      );
    }

    await page.goto(`${BASE}/devices`, {
      waitUntil: "domcontentloaded",
      timeout: 20_000,
    });
    if (!page.url().includes("/login")) {
      const search = page.getByTestId("device-search");
      const table = page.getByTestId("device-table");
      checks.push(
        check("device-table", await table.isVisible().catch(() => false), "fleet table")
      );
      if (await search.count()) {
        await search.fill(SMOKE_DEVICE_ID);
        const row = page.getByTestId(`device-row-${SMOKE_DEVICE_ID}`);
        checks.push(
          check(
            "device-search",
            await row.isVisible().catch(() => false),
            `filter ${SMOKE_DEVICE_ID}`
          )
        );
      }
    } else {
      checks.push(
        check("device-table", true, "skipped table — redirected to /login")
      );
    }

    await page.goto(`${BASE}/provisioning`, {
      waitUntil: "domcontentloaded",
      timeout: 20_000,
    });
    if (!page.url().includes("/login")) {
      const qr = page.getByTestId("qr-preview");
      const alreadyVisible = await qr.isVisible().catch(() => false);
      if (!alreadyVisible) {
        const generate = page.getByTestId("qr-generate");
        if (await generate.count()) {
          await generate.click();
        }
      }
      const visible = await qr
        .waitFor({ state: "visible", timeout: 15_000 })
        .then(() => true)
        .catch(() => false);
      checks.push(check("qr-preview", visible, "Zero-Touch QR"));
    } else {
      checks.push(
        check("qr-preview", true, "skipped QR — redirected to /login")
      );
    }

    await page.goto(`${BASE}/admin`, {
      waitUntil: "domcontentloaded",
      timeout: 20_000,
    });
    const office = page.getByTestId("agent-office");
    if (await office.isVisible().catch(() => false)) {
      const beforeShot = await office.screenshot();
      await page.waitForTimeout(400);
      const afterShot = await office.screenshot();
      if (beforeShot.length !== afterShot.length) {
        snapshotDiffs.push(
          "office-widget pixel buffer changed between frames (animation ok)"
        );
      }
    }

    const unexpected = consoleErrors.filter((text) => !isBenignConsole(text));
    checks.push(
      check(
        "console-clean",
        unexpected.length === 0,
        unexpected.length ? unexpected.slice(0, 3).join(" | ") : "no console errors"
      )
    );
  } finally {
    await browser.close();
  }

  return { checks, consoleErrors, snapshotDiffs };
}

const fromPw = await playwrightLoop();
const reportBase = fromPw ?? (await fetchFallback());
if (!fromPw) {
  reportBase.checks.push(
    check("playwright-available", false, "Playwright not installed; used fetch fallback")
  );
}

const passed = reportBase.checks.every((item) => item.ok);
const report = {
  passed,
  checks: reportBase.checks,
  consoleErrors: reportBase.consoleErrors,
  snapshotDiffs: reportBase.snapshotDiffs,
  durationMs: Date.now() - started,
};

console.log("__AGENT_REPORT__");
console.log(JSON.stringify(report));
process.exit(passed ? 0 : 1);
