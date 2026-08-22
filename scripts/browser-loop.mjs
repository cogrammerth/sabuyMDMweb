#!/usr/bin/env node
/**
 * Quality desk browser loop. Prints a trailing __AGENT_REPORT__ JSON blob
 * for the Lead Orchestrator. Prefer `npx playwright test` for CI; this
 * script is what the in-app tester specialist spawns.
 */
import { createRequire } from "module";

const BASE = process.env.AGENT_BASE_URL || "http://localhost:3000";
const started = Date.now();

function check(name, ok, detail) {
  return { name, ok, detail };
}

async function fetchFallback() {
  const checks = [];
  const consoleErrors = [];
  const snapshotDiffs = [];

  for (const path of ["/", "/admin", "/devices", "/map", "/provisioning", "/api/version.json", "/api/health"]) {
    try {
      const res = await fetch(`${BASE}${path}`);
      checks.push(check(`fetch:${path}`, res.ok, `${res.status}`));
    } catch (error) {
      checks.push(
        check(`fetch:${path}`, false, error instanceof Error ? error.message : "fail")
      );
    }
  }

  try {
    const html = await (await fetch(`${BASE}/admin`)).text();
    for (const id of ["device-table", "policy-toggles", "qr-generator", "agent-office"]) {
      checks.push(
        check(`testid:${id}`, html.includes(`data-testid="${id}"`), `looking for ${id}`)
      );
    }
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

  const checks = [];
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
    await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded", timeout: 20_000 });
    checks.push(check("admin-render", true, "loaded /admin"));

    for (const id of ["device-table", "policy-toggles", "qr-generator", "agent-office"]) {
      const loc = page.getByTestId(id);
      const visible = await loc.isVisible().catch(() => false);
      checks.push(check(`visible:${id}`, visible, visible ? "visible" : "missing"));
    }

    const camera = page.getByTestId("policy-switch-disableCamera");
    if (await camera.count()) {
      const before = await camera.getAttribute("aria-checked");
      await camera.click();
      const after = await camera.getAttribute("aria-checked");
      checks.push(
        check("policy-toggle", before !== after, `aria-checked ${before} → ${after}`)
      );
    }

    await page.getByTestId("qr-generate").click();
    const qr = page.getByTestId("qr-preview");
    checks.push(check("qr-preview", await qr.isVisible(), "QR preview after encode"));

    await page.goto(`${BASE}/map`, { waitUntil: "domcontentloaded", timeout: 20_000 });
    const fleetMap = page.getByTestId("fleet-map");
    checks.push(
      check("fleet-map", await fleetMap.isVisible().catch(() => false), "loaded /map")
    );

    const office = page.getByTestId("agent-office");
    const beforeShot = await office.screenshot();
    await page.waitForTimeout(400);
    const afterShot = await office.screenshot();
    if (beforeShot.length !== afterShot.length) {
      snapshotDiffs.push("office-widget pixel buffer changed between frames (animation ok)");
    }
    checks.push(
      check(
        "console-clean",
        consoleErrors.length === 0,
        consoleErrors.length ? consoleErrors.slice(0, 3).join(" | ") : "no console errors"
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
