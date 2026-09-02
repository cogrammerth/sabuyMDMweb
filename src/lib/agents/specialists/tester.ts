import { spawn } from "child_process";
import path from "path";
import type { CheckResult, TaskResult } from "../types";

function check(name: string, ok: boolean, detail: string): CheckResult {
  return { name, ok, detail };
}

function origin(): string {
  return process.env.AGENT_BASE_URL ?? "http://localhost:3000";
}

export interface BrowserLoopReport {
  passed: boolean;
  checks: CheckResult[];
  consoleErrors: string[];
  snapshotDiffs: string[];
  durationMs: number;
}

function parseReport(stdout: string): BrowserLoopReport | null {
  const marker = stdout.lastIndexOf("__AGENT_REPORT__");
  if (marker === -1) return null;
  const json = stdout.slice(marker + "__AGENT_REPORT__".length).trim();
  try {
    return JSON.parse(json) as BrowserLoopReport;
  } catch {
    return null;
  }
}

function runNodeScript(
  scriptRel: string,
  extraEnv: Record<string, string>
): Promise<{
  code: number;
  stdout: string;
  stderr: string;
}> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(process.cwd(), scriptRel)], {
      cwd: process.cwd(),
      env: { ...process.env, ...extraEnv },
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    const timer = setTimeout(() => {
      child.kill();
    }, 90_000);
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

const SMOKE_DEVICE_ID = "test-device-01";

type FleetRow = {
  deviceId?: string;
  model?: string | null;
  batteryLevel?: number | null;
  isOnline?: boolean;
};

type LocationPin = {
  deviceId?: string;
  latitude?: number;
  longitude?: number;
};

async function fetchJson(
  url: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; body: Record<string, unknown> }> {
  const res = await fetch(url, { cache: "no-store", ...init });
  let body: Record<string, unknown> = {};
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }
  return { ok: res.ok, status: res.status, body };
}

async function fetchSmoke(base: string): Promise<CheckResult[]> {
  const checks: CheckResult[] = [];

  try {
    const health = await fetchJson(`${base}/api/health`);
    checks.push(
      check(
        "health",
        health.ok &&
          health.body.status === "healthy" &&
          health.body.database === "connected",
        `GET /api/health → ${health.status} status=${String(health.body.status)} db=${String(health.body.database)}`
      )
    );
  } catch (error) {
    checks.push(
      check(
        "health",
        false,
        error instanceof Error ? error.message : "health unreachable"
      )
    );
  }

  try {
    const version = await fetchJson(`${base}/api/version.json`);
    checks.push(
      check(
        "version-json",
        version.ok &&
          typeof version.body.versionCode === "number" &&
          typeof version.body.versionName === "string" &&
          typeof version.body.apkUrl === "string" &&
          typeof version.body.isMandatory === "boolean",
        `GET /api/version.json → ${version.status}`
      )
    );
  } catch (error) {
    checks.push(
      check(
        "version-json",
        false,
        error instanceof Error ? error.message : "version.json unreachable"
      )
    );
  }

  try {
    const policy = await fetchJson(
      `${base}/api/policy?deviceId=${encodeURIComponent(SMOKE_DEVICE_ID)}`
    );
    checks.push(
      check(
        "policy-handshake",
        policy.ok &&
          typeof policy.body.disableSafeBoot === "boolean" &&
          typeof policy.body.kioskMode === "boolean" &&
          Array.isArray(policy.body.hiddenApps),
        `GET /api/policy?deviceId=${SMOKE_DEVICE_ID} → ${policy.status}`
      )
    );
  } catch (error) {
    checks.push(
      check(
        "policy-handshake",
        false,
        error instanceof Error ? error.message : "policy unreachable"
      )
    );
  }

  try {
    const heartbeat = await fetchJson(`${base}/api/heartbeat`, {
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
        heartbeat.ok &&
          heartbeat.body.success === true &&
          typeof heartbeat.body.timestamp === "number" &&
          typeof heartbeat.body.updateAvailable === "boolean" &&
          typeof heartbeat.body.latestVersionCode === "number",
        `POST /api/heartbeat → ${heartbeat.status}`
      )
    );

    const devices = await fetchJson(`${base}/api/admin/devices`);
    const rows = Array.isArray(devices.body.devices)
      ? (devices.body.devices as FleetRow[])
      : [];
    const row = rows.find((device) => device.deviceId === SMOKE_DEVICE_ID);
    checks.push(
      check(
        "heartbeat-upsert",
        Boolean(
          row &&
            row.model === "Pixel Smoke" &&
            row.batteryLevel === 87 &&
            row.isOnline === true
        ),
        row
          ? `devices upsert visible for ${SMOKE_DEVICE_ID}`
          : `device ${SMOKE_DEVICE_ID} missing from fleet list`
      )
    );

    const latest = await fetchJson(`${base}/api/admin/locations/latest`);
    const pins = Array.isArray(latest.body.locations)
      ? (latest.body.locations as LocationPin[])
      : [];
    const pin = pins.find((item) => item.deviceId === SMOKE_DEVICE_ID);
    checks.push(
      check(
        "heartbeat-gps",
        Boolean(pin && pin.latitude === 13.7563 && pin.longitude === 100.5018),
        pin
          ? `GPS pin recorded for ${SMOKE_DEVICE_ID}`
          : `no location_logs pin for ${SMOKE_DEVICE_ID}`
      )
    );
  } catch (error) {
    checks.push(
      check(
        "heartbeat-ingest",
        false,
        error instanceof Error ? error.message : "heartbeat unreachable"
      )
    );
  }

  try {
    const upload = await fetch(`${base}/api/admin/releases/upload`, {
      method: "POST",
      cache: "no-store",
    });
    const uploadBody = (await upload.json()) as { success?: boolean; error?: string };
    checks.push(
      check(
        "apk-upload-rejects-empty",
        upload.status === 400 && uploadBody.success === false,
        `POST /api/admin/releases/upload without APK → ${upload.status}`
      )
    );
  } catch (error) {
    checks.push(
      check(
        "apk-upload-rejects-empty",
        false,
        error instanceof Error ? error.message : "release upload unreachable"
      )
    );
  }

  try {
    const home = await fetch(`${base}`, { cache: "no-store" });
    checks.push(check("home", home.ok, `GET / → ${home.status}`));
  } catch (error) {
    checks.push(
      check("home", false, error instanceof Error ? error.message : "home unreachable")
    );
  }

  try {
    const login = await fetch(`${base}/login`, { cache: "no-store" });
    const html = await login.text();
    checks.push(
      check(
        "login-page",
        login.ok &&
          (html.includes('data-testid="login-page"') ||
            html.includes('data-testid="login-form"') ||
            html.includes("operator-password")),
        `GET /login → ${login.status}`
      )
    );
  } catch (error) {
    checks.push(
      check(
        "login-page",
        false,
        error instanceof Error ? error.message : "login unreachable"
      )
    );
  }

  for (const path of ["/devices", "/map", "/provisioning", "/settings"] as const) {
    const name =
      path === "/devices"
        ? "fleet-page"
        : path === "/map"
          ? "map-page"
          : path === "/settings"
            ? "settings-page"
            : "provisioning-page";
    try {
      const res = await fetch(`${base}${path}`, {
        cache: "no-store",
        redirect: "manual",
      });
      const redirected =
        res.status >= 300 &&
        res.status < 400 &&
        (res.headers.get("location") ?? "").includes("/login");
      checks.push(
        check(
          name,
          res.ok || redirected,
          redirected
            ? `GET ${path} redirected to /login (${res.status})`
            : `GET ${path} → ${res.status}`
        )
      );
    } catch (error) {
      checks.push(
        check(
          name,
          false,
          error instanceof Error ? error.message : `${path} unreachable`
        )
      );
    }
  }

  return checks;
}

/**
 * Quality desk: always fetch-smoke the hub; optionally spawn the Playwright
 * loop when ALLOW_AGENT_BROWSER=1 (local / CI with browsers installed).
 */
export async function runBrowserTester(goal: string): Promise<TaskResult> {
  const base = origin();
  const smoke = await fetchSmoke(base);
  const consoleErrors: string[] = [];
  const snapshotDiffs: string[] = [];
  const checks = [...smoke];

  const allowBrowser =
    process.env.ALLOW_AGENT_BROWSER === "1" ||
    process.env.ALLOW_AGENT_BROWSER === "true";

  if (allowBrowser) {
    const ran = await runNodeScript("scripts/browser-loop.mjs", {
      AGENT_BASE_URL: base,
    });
    const report = parseReport(ran.stdout);
    if (report) {
      checks.push(...report.checks);
      consoleErrors.push(...report.consoleErrors);
      snapshotDiffs.push(...report.snapshotDiffs);
      checks.push(
        check(
          "playwright-loop",
          report.passed && ran.code === 0,
          `Browser loop ${report.passed ? "passed" : "failed"} in ${report.durationMs}ms`
        )
      );
    } else {
      checks.push(
        check(
          "playwright-loop",
          false,
          ran.stderr.slice(0, 500) ||
            "Browser loop produced no report (install Playwright browsers?)"
        )
      );
    }
  } else {
    checks.push(
      check(
        "playwright-loop",
        true,
        "Skipped live Chromium (set ALLOW_AGENT_BROWSER=1 to enable). Fetch smoke still ran."
      )
    );
  }

  const failed = checks.filter((item) => !item.ok).length;
  return {
    summary:
      failed === 0
        ? `QA loop clean for "${goal}".`
        : `QA found ${failed} failure(s) — orchestrator should not sign off.`,
    checks,
    consoleErrors,
    snapshotDiffs,
  };
}
