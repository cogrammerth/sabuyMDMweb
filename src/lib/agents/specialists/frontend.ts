import type { CheckResult, TaskResult } from "../types";

function check(name: string, ok: boolean, detail: string): CheckResult {
  return { name, ok, detail };
}

function origin(): string {
  return process.env.AGENT_BASE_URL ?? "http://localhost:3000";
}

export async function runFrontendEngineer(goal: string): Promise<TaskResult> {
  const checks: CheckResult[] = [];
  const base = origin();

  try {
    const login = await fetch(`${base}/login`, { cache: "no-store" });
    const loginHtml = await login.text();
    checks.push(check("login-200", login.ok, `GET /login → ${login.status}`));
    checks.push(
      check(
        "login-form",
        loginHtml.includes('data-testid="login-form"') ||
          loginHtml.includes('data-testid="operator-password"'),
        "Operator login form present"
      )
    );
  } catch (error) {
    checks.push(
      check(
        "login-reachable",
        false,
        `Could not fetch ${base}/login (${error instanceof Error ? error.message : "unknown"})`
      )
    );
  }

  try {
    const res = await fetch(`${base}/admin`, { cache: "no-store" });
    const html = await res.text();
    checks.push(
      check("admin-200", res.ok, `GET /admin → ${res.status}`)
    );
    checks.push(
      check(
        "device-table",
        html.includes('data-testid="device-table"'),
        "Device table testid present"
      )
    );
    checks.push(
      check(
        "policy-toggles",
        html.includes('data-testid="policy-toggles"'),
        "Policy toggle board present"
      )
    );
    checks.push(
      check(
        "qr-generator",
        html.includes('data-testid="qr-generator"'),
        "QR generator present"
      )
    );
    checks.push(
      check(
        "agent-office",
        html.includes('data-testid="agent-office"'),
        "Kunio-kun office widget present"
      )
    );
  } catch (error) {
    checks.push(
      check(
        "admin-reachable",
        false,
        `Could not fetch ${base}/admin (${error instanceof Error ? error.message : "unknown"})`
      )
    );
  }

  try {
    const res = await fetch(`${base}/settings`, { cache: "no-store" });
    const html = await res.text();
    checks.push(check("settings-200", res.ok, `GET /settings → ${res.status}`));
    checks.push(
      check(
        "app-release-editor",
        html.includes('data-testid="app-release-editor"'),
        "App release management card present"
      )
    );
  } catch (error) {
    checks.push(
      check(
        "settings-reachable",
        false,
        `Could not fetch ${base}/settings (${error instanceof Error ? error.message : "unknown"})`
      )
    );
  }

  try {
    await fetch(`${base}/api/heartbeat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId: "qa-frontend-name-probe",
        model: "Probe",
        androidVersion: "14",
        batteryLevel: 50,
        storageFreeMb: 1024,
      }),
    }).catch(() => undefined);

    const res = await fetch(`${base}/devices`, { cache: "no-store" });
    const html = await res.text();
    checks.push(check("fleet-200", res.ok, `GET /devices → ${res.status}`));
    checks.push(
      check(
        "fleet-summary",
        html.includes('data-testid="fleet-summary"'),
        "Fleet summary cards present"
      )
    );
    checks.push(
      check(
        "fleet-search",
        html.includes('data-testid="device-search"'),
        "Device search present"
      )
    );
    checks.push(
      check(
        "fleet-table",
        html.includes('data-testid="device-table"'),
        "Fleet device table present"
      )
    );
    checks.push(
      check(
        "device-name-edit",
        html.includes("device-name-edit-trigger-"),
        "Inline device name editor present on fleet table"
      )
    );
  } catch (error) {
    checks.push(
      check(
        "fleet-reachable",
        false,
        `Could not fetch ${base}/devices (${error instanceof Error ? error.message : "unknown"})`
      )
    );
  }

  try {
    const res = await fetch(`${base}/provisioning`, { cache: "no-store" });
    const html = await res.text();
    checks.push(
      check("provisioning-200", res.ok, `GET /provisioning → ${res.status}`)
    );
    checks.push(
      check(
        "provisioning-qr",
        html.includes('data-testid="qr-generator"'),
        "Provisioning QR surface present"
      )
    );
  } catch (error) {
    checks.push(
      check(
        "provisioning-reachable",
        false,
        `Could not fetch ${base}/provisioning (${error instanceof Error ? error.message : "unknown"})`
      )
    );
  }

  try {
    const res = await fetch(`${base}/map`, { cache: "no-store" });
    const html = await res.text();
    checks.push(check("map-200", res.ok, `GET /map → ${res.status}`));
    checks.push(
      check(
        "fleet-map",
        html.includes('data-testid="fleet-map"'),
        "Fleet map container present"
      )
    );
    checks.push(
      check(
        "map-ssr-safe",
        html.includes("fleet-map") && !html.includes("window is not defined"),
        "Map page HTML does not throw window-is-not-defined"
      )
    );
  } catch (error) {
    checks.push(
      check(
        "map-reachable",
        false,
        `Could not fetch ${base}/map (${error instanceof Error ? error.message : "unknown"})`
      )
    );
  }

  const failed = checks.filter((item) => !item.ok).length;
  return {
    summary:
      failed === 0
        ? `Admin surfaces render for "${goal}".`
        : `Frontend found ${failed} missing surface(s).`,
    checks,
  };
}
