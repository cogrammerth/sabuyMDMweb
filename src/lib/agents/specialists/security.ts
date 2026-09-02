import { readFileSync } from "fs";
import path from "path";
import type { CheckResult, TaskResult } from "../types";

function check(name: string, ok: boolean, detail: string): CheckResult {
  return { name, ok, detail };
}

function readRepo(rel: string): string | null {
  try {
    return readFileSync(path.join(process.cwd(), rel), "utf8");
  } catch {
    return null;
  }
}

function origin(): string {
  return process.env.AGENT_BASE_URL ?? "http://localhost:3000";
}

const DEFAULTS: Record<string, boolean> = {
  disableCamera: false,
  disableFactoryReset: true,
  disableSafeBoot: true,
  disableUsbDebugging: false,
  kioskMode: false,
};

export async function runSecurityAuditor(goal: string): Promise<TaskResult> {
  const checks: CheckResult[] = [];
  const migration = readRepo("supabase/migrations/001_mdm_phase1.sql") ?? "";
  const appVersionMigration = readRepo("supabase/migrations/002_app_versions.sql") ?? "";
  const apkReleaseMigration = readRepo("supabase/migrations/003_apk_releases.sql") ?? "";
  const adminAppVersion = readRepo("src/app/api/admin/app-version/route.ts") ?? "";
  const adminReleaseUpload = readRepo("src/app/api/admin/releases/upload/route.ts") ?? "";
  const adminDeviceDetail = readRepo("src/app/api/admin/devices/[deviceId]/route.ts") ?? "";
  const appVersions = readRepo("src/lib/app-versions.ts") ?? "";
  const supabase = readRepo("src/lib/supabase.ts") ?? "";
  const policyRoute = readRepo("src/app/api/policy/route.ts") ?? "";
  const envExample = readRepo(".env.example") ?? "";
  const policiesHelper = readRepo("src/lib/policies.ts") ?? "";
  const adminPolicy = readRepo(
    "src/app/api/admin/devices/[deviceId]/policy/route.ts"
  ) ?? "";
  const operatorAuth = readRepo("src/lib/operator-auth.ts") ?? "";
  const devicesHelper = readRepo("src/lib/devices.ts") ?? "";
  const fleetPage = readRepo("src/app/devices/page.tsx") ?? "";
  const policyEditor = readRepo("src/components/fleet/PolicyEditor.tsx") ?? "";
  const latestLocations = readRepo(
    "src/app/api/admin/locations/latest/route.ts"
  ) ?? "";
  const deviceLocations = readRepo(
    "src/app/api/admin/devices/[deviceId]/locations/route.ts"
  ) ?? "";
  const health = readRepo("src/app/api/health/route.ts") ?? "";
  const middleware = readRepo("src/middleware.ts") ?? "";
  const nextConfig = readRepo("next.config.ts") ?? "";
  const fleetMap = readRepo("src/components/maps/FleetMapCanvas.tsx") ?? "";
  const historyMap = readRepo("src/components/maps/DeviceHistoryCanvas.tsx") ?? "";
  const locationsHelper = readRepo("src/lib/locations.ts") ?? "";

  checks.push(
    check(
      "rls-devices",
      /alter table public\.devices enable row level security/i.test(migration),
      "RLS enabled on devices"
    )
  );
  checks.push(
    check(
      "rls-policies",
      /alter table public\.policies enable row level security/i.test(migration),
      "RLS enabled on policies"
    )
  );
  checks.push(
    check(
      "rls-location",
      /alter table public\.location_logs enable row level security/i.test(migration),
      "RLS enabled on location_logs"
    )
  );
  checks.push(
    check(
      "rls-app-versions",
      /alter table public\.app_versions enable row level security/i.test(appVersionMigration),
      "RLS enabled on app_versions"
    )
  );
  checks.push(
    check(
      "no-anon-grants",
      !/grant\s+(select|all).*to\s+(anon|authenticated)/i.test(migration),
      "No GRANT to anon/authenticated in Phase 1 migration"
    )
  );
  checks.push(
    check(
      "service-role-not-public-prefixed",
      !supabase.includes("NEXT_PUBLIC_SUPABASE_SERVICE") &&
        envExample.includes("SUPABASE_SERVICE_ROLE_KEY") &&
        envExample.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY") &&
        !envExample.includes("NEXT_PUBLIC_SUPABASE_SERVICE"),
      "Service role key is not a NEXT_PUBLIC_ binding; anon key is public"
    )
  );
  checks.push(
    check(
      "service-role-helpers-server-only",
      devicesHelper.includes("getSupabaseAdmin") &&
        policiesHelper.includes("getSupabaseAdmin") &&
        !fleetPage.includes("createClient") &&
        !policyEditor.includes("SUPABASE_SERVICE_ROLE_KEY") &&
        !policyEditor.includes("getSupabaseAdmin"),
      "Service-role client stays in server helpers, not fleet UI"
    )
  );
  checks.push(
    check(
      "kiosk-write-invariant",
      policiesHelper.includes("kioskPackage is required when kioskMode is true") &&
        adminPolicy.includes("upsertPolicy"),
      "Admin policy PUT enforces kioskPackage when kioskMode is true"
    )
  );
  checks.push(
    check(
      "operator-gate",
      operatorAuth.includes("getUser") &&
        operatorAuth.includes("requireOperatorJson") &&
        !operatorAuth.includes("OPERATOR_PASSWORD"),
      "Admin writes require a Supabase Auth session (getUser)"
    )
  );

  checks.push(
    check(
      "location-latest-gated",
      latestLocations.includes("requireOperatorJson"),
      "GET /api/admin/locations/latest requires the operator gate"
    )
  );
  checks.push(
    check(
      "location-history-gated",
      deviceLocations.includes("requireOperatorJson"),
      "GET /api/admin/devices/:id/locations requires the operator gate"
    )
  );
  checks.push(
    check(
      "map-page-middleware",
      middleware.includes("/api/admin") &&
        middleware.includes("/login") &&
        middleware.includes("/api/heartbeat") &&
        middleware.includes("getUser"),
      "Middleware refreshes Supabase sessions and keeps device APIs public"
    )
  );
  checks.push(
    check(
      "protected-redirect-login",
      middleware.includes('new URL("/login"') &&
        middleware.includes("NextResponse.redirect") &&
        middleware.includes('login.searchParams.set("next"'),
      "Unauthenticated UI requests redirect to /login with next="
    )
  );
  checks.push(
    check(
      "app-version-gated",
      adminAppVersion.includes("requireOperatorJson"),
      "PUT /api/admin/app-version requires the operator gate"
    )
  );
  checks.push(
    check(
      "apk-upload-gated",
      adminReleaseUpload.includes("requireOperatorJson") &&
        adminReleaseUpload.includes("uploadApkRelease"),
      "POST /api/admin/releases/upload requires the operator gate"
    )
  );
  checks.push(
    check(
      "dpc-releases-public-read",
      apkReleaseMigration.includes("dpc-releases") &&
        /for select/i.test(apkReleaseMigration) &&
        !/grant\s+(insert|all).*to\s+(anon|authenticated)/i.test(apkReleaseMigration),
      "dpc-releases is public-read; anon is not granted write"
    )
  );
  checks.push(
    check(
      "apk-not-in-repo",
      !apkReleaseMigration.includes("fixtures/") &&
        adminReleaseUpload.includes("uploadApkRelease"),
      "APK binaries are stored in Supabase Storage, not git"
    )
  );
  checks.push(
    check(
      "device-patch-gated",
      adminDeviceDetail.includes("requireOperatorJson") &&
        adminDeviceDetail.includes("export async function PATCH"),
      "PATCH /api/admin/devices/:id requires the operator gate"
    )
  );
  checks.push(
    check(
      "version-fallback",
      appVersions.includes("DEFAULT_VERSION_INFO") &&
        appVersions.includes("readFileVersion"),
      "version.json keeps hardcoded/file fallback when app_versions is empty or missing"
    )
  );
  checks.push(
    check(
      "map-no-service-role",
      !fleetMap.includes("getSupabaseAdmin") &&
        !fleetMap.includes("SUPABASE_SERVICE_ROLE_KEY") &&
        !historyMap.includes("getSupabaseAdmin") &&
        !historyMap.includes("SUPABASE_SERVICE_ROLE_KEY") &&
        !fleetMap.includes("NEXT_PUBLIC_SUPABASE") &&
        !historyMap.includes("NEXT_PUBLIC_SUPABASE") &&
        locationsHelper.includes("getSupabaseAdmin"),
      "Map canvases fetch operator APIs; service-role stays server-side"
    )
  );
  checks.push(
    check(
      "health-no-secret-leak",
      health.includes("healthy") &&
        health.includes("getSupabaseAdmin") &&
        !health.includes("serviceRoleKey") &&
        !health.includes("SUPABASE_SERVICE_ROLE_KEY") &&
        !health.includes("error.message"),
      "Health probe checks DB without returning keys or error details"
    )
  );
  checks.push(
    check(
      "security-headers",
      nextConfig.includes("X-Content-Type-Options") &&
        nextConfig.includes("X-Frame-Options") &&
        nextConfig.includes("nosniff") &&
        nextConfig.includes("poweredByHeader: false"),
      "next.config.ts sets security headers and hides X-Powered-By"
    )
  );

  const probeId = "qa-office-probe";
  try {
    const res = await fetch(
      `${origin()}/api/policy?deviceId=${encodeURIComponent(probeId)}`,
      { cache: "no-store" }
    );
    const body = (await res.json()) as Record<string, unknown>;
    checks.push(check("policy-live", res.ok, `Live policy GET → ${res.status}`));

    for (const [key, expected] of Object.entries(DEFAULTS)) {
      checks.push(
        check(
          `default-${key}`,
          body[key] === expected,
          `${key} default is ${String(expected)} (got ${String(body[key])})`
        )
      );
    }

    const kioskOn = body.kioskMode === true;
    const pkg = typeof body.kioskPackage === "string" ? body.kioskPackage : "";
    checks.push(
      check(
        "kiosk-package-invariant",
        !(kioskOn && pkg.trim() === ""),
        kioskOn
          ? "kioskMode true requires a launchable kioskPackage"
          : "kioskMode off — empty package is valid"
      )
    );
    checks.push(
      check(
        "safe-boot-blocked",
        body.disableSafeBoot === true,
        "Safe-mode bypass is blocked by default"
      )
    );
    checks.push(
      check(
        "factory-reset-blocked",
        body.disableFactoryReset === true,
        "Factory reset is blocked by default"
      )
    );
  } catch (error) {
    checks.push(
      check(
        "policy-live",
        false,
        `Policy probe failed (${error instanceof Error ? error.message : "unknown"})`
      )
    );
  }

  try {
    const reject = await fetch(
      `${origin()}/api/admin/devices/${encodeURIComponent("qa-kiosk-probe")}/policy`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kioskMode: true, kioskPackage: "  " }),
      }
    );
    const rejectBody = (await reject.json()) as { error?: string };
    checks.push(
      check(
        "kiosk-put-unauth",
        reject.status === 401,
        `Unauthenticated kiosk PUT → ${reject.status}`
      )
    );
    checks.push(
      check(
        "kiosk-put-rejected",
        reject.status === 401 ||
          (reject.status === 400 &&
            typeof rejectBody.error === "string" &&
            /kioskPackage/i.test(rejectBody.error)),
        `PUT kiosk without package → ${reject.status}`
      )
    );
  } catch (error) {
    checks.push(
      check(
        "kiosk-put-rejected",
        false,
        `Kiosk PUT probe failed (${error instanceof Error ? error.message : "unknown"})`
      )
    );
  }

  checks.push(
    check(
      "fail-open-policy",
      policyRoute.includes("Still return defaults") ||
        policyRoute.includes("device can continue operating"),
      "Policy insert failure still returns hardcoded defaults (fail open)"
    )
  );

  const qrPageHint = readRepo("src/components/fleet/QrGenerator.tsx") ?? "";
  const provisioningLib = readRepo("src/lib/provisioning.ts") ?? "";
  const provisioningRoute =
    readRepo("src/app/api/admin/provisioning/qr/route.ts") ?? "";

  checks.push(
    check(
      "zt-extras-shape",
      provisioningLib.includes("PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME") &&
        provisioningLib.includes("PROVISIONING_DEVICE_ADMIN_PACKAGE_CHECKSUM") &&
        provisioningLib.includes("sha256Base64Url"),
      "Zero-Touch extras include component name and computed APK checksum"
    )
  );
  checks.push(
    check(
      "zt-no-placeholder-checksum",
      !qrPageHint.includes("<sha256-of-apk>") &&
        provisioningLib.includes("resolveApkChecksum") &&
        provisioningLib.includes("sha256Base64Url"),
      "UI does not ship a hand-typed checksum; server computes it"
    )
  );
  checks.push(
    check(
      "zt-admin-gated",
      provisioningRoute.includes("requireOperatorJson"),
      "Provisioning QR route requires operator gate"
    )
  );

  try {
    const qr = await fetch(`${origin()}/api/admin/provisioning/qr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: "qa-zt-probe" }),
    });
    checks.push(
      check(
        "zt-qr-unauth",
        qr.status === 401,
        `Unauthenticated POST /api/admin/provisioning/qr → ${qr.status}`
      )
    );
  } catch (error) {
    checks.push(
      check(
        "zt-qr-live",
        false,
        `Provisioning QR probe failed (${error instanceof Error ? error.message : "unknown"})`
      )
    );
  }

  try {
    const healthRes = await fetch(`${origin()}/api/health`, { cache: "no-store" });
    const healthText = await healthRes.text();
    const healthBody = JSON.parse(healthText) as {
      status?: string;
      database?: string;
    };
    checks.push(
      check(
        "health-live",
        healthRes.ok && healthBody.status === "healthy",
        `GET /api/health → ${healthRes.status}`
      )
    );
    checks.push(
      check(
        "health-body-no-secrets",
        !/service_role|SUPABASE_|eyJ[A-Za-z0-9_-]{20,}/i.test(healthText),
        "Health JSON does not include service-role material"
      )
    );
  } catch (error) {
    checks.push(
      check(
        "health-live",
        false,
        `Health probe failed (${error instanceof Error ? error.message : "unknown"})`
      )
    );
  }

  try {
    const latest = await fetch(`${origin()}/api/admin/locations/latest`, {
      cache: "no-store",
    });
    checks.push(
      check(
        "locations-latest-unauth",
        latest.status === 401,
        `Unauthenticated GET /api/admin/locations/latest → ${latest.status}`
      )
    );
  } catch (error) {
    checks.push(
      check(
        "locations-latest-live",
        false,
        `Latest locations probe failed (${error instanceof Error ? error.message : "unknown"})`
      )
    );
  }

  const failed = checks.filter((item) => !item.ok).length;
  return {
    summary:
      failed === 0
        ? `DPC/RLS posture holds for "${goal}".`
        : `Security found ${failed} finding(s).`,
    checks,
  };
}
