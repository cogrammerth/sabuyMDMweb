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

async function fetchSmoke(base: string): Promise<CheckResult[]> {
  const checks: CheckResult[] = [];

  try {
    const version = await fetch(`${base}/api/version.json`, { cache: "no-store" });
    const body = (await version.json()) as { versionCode?: number };
    checks.push(
      check(
        "version-json",
        version.ok && typeof body.versionCode === "number",
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
    const policy = await fetch(`${base}/api/policy?deviceId=qa-smoke`, {
      cache: "no-store",
    });
    checks.push(check("policy-get", policy.ok, `GET /api/policy → ${policy.status}`));
  } catch (error) {
    checks.push(
      check(
        "policy-get",
        false,
        error instanceof Error ? error.message : "policy unreachable"
      )
    );
  }

  try {
    const home = await fetch(base, { cache: "no-store" });
    checks.push(check("home", home.ok, `GET / → ${home.status}`));
  } catch (error) {
    checks.push(
      check("home", false, error instanceof Error ? error.message : "home unreachable")
    );
  }

  try {
    const fleet = await fetch(`${base}/devices`, { cache: "no-store" });
    checks.push(check("fleet-page", fleet.ok, `GET /devices → ${fleet.status}`));
  } catch (error) {
    checks.push(
      check(
        "fleet-page",
        false,
        error instanceof Error ? error.message : "fleet unreachable"
      )
    );
  }

  try {
    const provisioning = await fetch(`${base}/provisioning`, { cache: "no-store" });
    checks.push(
      check(
        "provisioning-page",
        provisioning.ok,
        `GET /provisioning → ${provisioning.status}`
      )
    );
  } catch (error) {
    checks.push(
      check(
        "provisioning-page",
        false,
        error instanceof Error ? error.message : "provisioning unreachable"
      )
    );
  }

  try {
    const mapPage = await fetch(`${base}/map`, { cache: "no-store" });
    checks.push(check("map-page", mapPage.ok, `GET /map → ${mapPage.status}`));
  } catch (error) {
    checks.push(
      check(
        "map-page",
        false,
        error instanceof Error ? error.message : "map unreachable"
      )
    );
  }

  try {
    const health = await fetch(`${base}/api/health`, { cache: "no-store" });
    const body = (await health.json()) as { status?: string };
    checks.push(
      check(
        "health",
        health.ok && body.status === "healthy",
        `GET /api/health → ${health.status}`
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
