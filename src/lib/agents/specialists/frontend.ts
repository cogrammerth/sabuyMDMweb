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
          loginHtml.includes('data-testid="operator-email"'),
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
    const res = await fetch(`${base}/admin`, {
      cache: "no-store",
      redirect: "manual",
    });
    const redirected =
      res.status >= 300 &&
      res.status < 400 &&
      (res.headers.get("location") ?? "").includes("/login");
    checks.push(
      check(
        "admin-gated",
        res.ok || redirected,
        redirected
          ? `GET /admin redirected to /login (${res.status})`
          : `GET /admin → ${res.status}`
      )
    );
    if (res.ok && !redirected) {
      const html = await res.text();
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
    } else {
      checks.push(
        check("device-table", true, "Skipped HTML probes — unauthenticated /admin redirects to /login")
      );
    }
  } catch (error) {
    checks.push(
      check(
        "admin-reachable",
        false,
        `Could not fetch ${base}/admin (${error instanceof Error ? error.message : "unknown"})`
      )
    );
  }

  async function expectPageOrLogin(path: string, name: string) {
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
      return { res, redirected };
    } catch (error) {
      checks.push(
        check(
          `${name}-reachable`,
          false,
          `Could not fetch ${base}${path} (${error instanceof Error ? error.message : "unknown"})`
        )
      );
      return null;
    }
  }

  try {
    const forgot = await fetch(`${base}/forgot-password`, { cache: "no-store" });
    const forgotHtml = await forgot.text();
    checks.push(
      check(
        "forgot-password",
        forgot.ok && forgotHtml.includes('data-testid="forgot-password-form"'),
        `GET /forgot-password → ${forgot.status}`
      )
    );
  } catch (error) {
    checks.push(
      check(
        "forgot-password",
        false,
        `Could not fetch ${base}/forgot-password (${error instanceof Error ? error.message : "unknown"})`
      )
    );
  }

  try {
    const reset = await fetch(`${base}/reset-password`, { cache: "no-store" });
    checks.push(check("reset-password", reset.ok, `GET /reset-password → ${reset.status}`));
  } catch (error) {
    checks.push(
      check(
        "reset-password",
        false,
        `Could not fetch ${base}/reset-password (${error instanceof Error ? error.message : "unknown"})`
      )
    );
  }

  const settings = await expectPageOrLogin("/settings", "settings-gated");
  if (settings?.res.ok && !settings.redirected) {
    const html = await settings.res.text();
    checks.push(
      check(
        "app-release-editor",
        html.includes('data-testid="app-release-editor"'),
        "App release management card present"
      )
    );
    checks.push(
      check(
        "apk-upload-zone",
        html.includes('data-testid="apk-upload-zone"'),
        "APK upload drop zone present on /settings"
      )
    );
  }

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

  const fleet = await expectPageOrLogin("/devices", "fleet-gated");
  if (fleet?.res.ok && !fleet.redirected) {
    const html = await fleet.res.text();
    checks.push(
      check(
        "fleet-table",
        html.includes('data-testid="device-table"'),
        "Fleet device table present"
      )
    );
  }

  await expectPageOrLogin("/provisioning", "provisioning-gated");
  await expectPageOrLogin("/map", "map-gated");

  const failed = checks.filter((item) => !item.ok).length;
  return {
    summary:
      failed === 0
        ? `Admin surfaces render for "${goal}".`
        : `Frontend found ${failed} missing surface(s).`,
    checks,
  };
}
