import { readFileSync } from "fs";
import path from "path";
import type { CheckResult, TaskResult } from "../types";

function readRepo(rel: string): string | null {
  try {
    return readFileSync(path.join(process.cwd(), rel), "utf8");
  } catch {
    return null;
  }
}

function check(name: string, ok: boolean, detail: string): CheckResult {
  return { name, ok, detail };
}

export async function runBackendArchitect(goal: string): Promise<TaskResult> {
  const heartbeat = readRepo("src/app/api/heartbeat/route.ts");
  const policy = readRepo("src/app/api/policy/route.ts");
  const version = readRepo("src/app/api/version.json/route.ts");
  const appVersions = readRepo("src/lib/app-versions.ts");
  const appVersionMigration = readRepo("supabase/migrations/002_app_versions.sql");
  const apkReleaseMigration = readRepo("supabase/migrations/003_apk_releases.sql");
  const adminAppVersion = readRepo("src/app/api/admin/app-version/route.ts");
  const adminReleases = readRepo("src/app/api/admin/releases/route.ts");
  const adminReleaseUpload = readRepo("src/app/api/admin/releases/upload/route.ts");
  const apkParse = readRepo("src/lib/apk-parse.ts");
  const releasesHelper = readRepo("src/lib/releases.ts");
  const adminDeviceDetail = readRepo("src/app/api/admin/devices/[deviceId]/route.ts");
  const types = readRepo("src/types/mdm.ts");
  const supabase = readRepo("src/lib/supabase.ts");
  const migration = readRepo("supabase/migrations/001_mdm_phase1.sql");
  const devicesHelper = readRepo("src/lib/devices.ts");
  const policiesHelper = readRepo("src/lib/policies.ts");
  const onlineHelper = readRepo("src/lib/online.ts");
  const adminPolicy = readRepo(
    "src/app/api/admin/devices/[deviceId]/policy/route.ts"
  );
  const adminDevices = readRepo("src/app/api/admin/devices/route.ts");
  const provisioning = readRepo("src/lib/provisioning.ts");
  const provisioningQr = readRepo(
    "src/app/api/admin/provisioning/qr/route.ts"
  );
  const latestLocations = readRepo(
    "src/app/api/admin/locations/latest/route.ts"
  );
  const deviceLocations = readRepo(
    "src/app/api/admin/devices/[deviceId]/locations/route.ts"
  );
  const operatorAuth = readRepo("src/lib/operator-auth.ts");
  const middleware = readRepo("src/middleware.ts");
  const health = readRepo("src/app/api/health/route.ts");
  const locationsHelper = readRepo("src/lib/locations.ts");

  const policiesBlock =
    migration?.match(/create table if not exists public\.policies\s*\([\s\S]*?\);/i)?.[0] ??
    "";

  const checks: CheckResult[] = [
    check(
      "heartbeat-route",
      Boolean(heartbeat?.includes("export async function POST")),
      heartbeat ? "POST /api/heartbeat handler present" : "Missing heartbeat route"
    ),
    check(
      "policy-route",
      Boolean(policy?.includes("export async function GET") && policy.includes("deviceId")),
      policy ? "GET /api/policy?deviceId= present" : "Missing policy route"
    ),
    check(
      "version-route",
      Boolean(
        version?.includes("getActiveVersionInfo") ||
          (version?.includes("versionCode") && version.includes("apkUrl"))
      ),
      version
        ? "version.json reads active app_versions with fallback"
        : "Missing version.json route"
    ),
    check(
      "app-versions-migration",
      Boolean(
        appVersionMigration?.includes("create table if not exists public.app_versions") &&
          appVersionMigration.includes("is_active")
      ),
      "app_versions migration defines active release rows"
    ),
    check(
      "heartbeat-version-compare",
      Boolean(
        heartbeat?.includes("currentAppVersionCode") &&
          heartbeat.includes("updateAvailable") &&
          heartbeat.includes("latestVersionCode")
      ),
      "POST /api/heartbeat stores currentAppVersionCode and compares to the active release"
    ),
    check(
      "version-update-available",
      Boolean(
        version?.includes("currentAppVersionCode") && version.includes("updateAvailable")
      ),
      "GET /api/version.json compares currentAppVersionCode when supplied"
    ),
    check(
      "admin-app-version-put",
      Boolean(
        adminAppVersion?.includes("export async function PUT") &&
          adminAppVersion.includes("publishAppVersion") &&
          adminAppVersion.includes("requireOperatorJson")
      ),
      "PUT /api/admin/app-version publishes APK metadata"
    ),
    check(
      "apk-release-upload",
      Boolean(
        adminReleaseUpload?.includes("export async function POST") &&
          adminReleaseUpload.includes("uploadApkRelease") &&
          adminReleaseUpload.includes("requireOperatorJson") &&
          apkParse?.includes("app-info-parser") &&
          releasesHelper?.includes("dpc-releases")
      ),
      "POST /api/admin/releases/upload parses APK and stores it in dpc-releases"
    ),
    check(
      "apk-release-list",
      Boolean(
        adminReleases?.includes("export async function GET") &&
          adminReleases.includes("listAppVersions") &&
          adminReleases.includes("requireOperatorJson")
      ),
      "GET /api/admin/releases lists stored app_versions"
    ),
    check(
      "apk-release-migration",
      Boolean(
        apkReleaseMigration?.includes("dpc-releases") &&
          apkReleaseMigration.includes("current_app_version_code")
      ),
      "003_apk_releases.sql adds device version column and public dpc-releases bucket"
    ),
    check(
      "version-compare-helper",
      Boolean(appVersions?.includes("resolveUpdateAvailable")),
      "app-versions helper compares client versionCode to the active channel"
    ),
    check(
      "admin-device-patch",
      Boolean(
        adminDeviceDetail?.includes("export async function PATCH") &&
          adminDeviceDetail.includes("updateDeviceName")
      ),
      "PATCH /api/admin/devices/[deviceId] updates device_name"
    ),
    check(
      "camelcase-policy-response",
      Boolean(types?.includes("disableCamera") && types.includes("kioskMode")),
      "PolicyResponse stays camelCase at the HTTP boundary"
    ),
    check(
      "service-role-server-only",
      Boolean(supabase?.includes("SUPABASE_SERVICE_ROLE_KEY") && supabase.includes("never expose")),
      "Admin client documents server-only service role usage"
    ),
    check(
      "no-fk-policies-to-devices",
      Boolean(policiesBlock) && !/references/i.test(policiesBlock),
      "policies.device_id has no FK to devices (PolicySyncWorker-before-heartbeat)"
    ),
    check(
      "location-fk-after-device",
      Boolean(migration?.includes("references public.devices (device_id)")),
      "location_logs FK to devices.device_id is present"
    ),
    check(
      "devices-helper",
      Boolean(devicesHelper?.includes("toFleetDevice") && devicesHelper.includes("isDeviceOnline")),
      "src/lib/devices.ts maps fleet rows and computes online from last_heartbeat"
    ),
    check(
      "online-window-15m",
      Boolean(onlineHelper?.includes("15 * 60 * 1000")),
      "Online window is 15 minutes from last_heartbeat"
    ),
    check(
      "policies-helper",
      Boolean(
        policiesHelper?.includes("validatePolicyWrite") &&
          policiesHelper.includes("upsertPolicy") &&
          policiesHelper.includes("kioskPackage is required when kioskMode is true")
      ),
      "src/lib/policies.ts validates locktask and upserts camelCase writes"
    ),
    check(
      "admin-devices-get",
      Boolean(adminDevices?.includes("export async function GET")),
      "GET /api/admin/devices is present"
    ),
    check(
      "admin-policy-put",
      Boolean(adminPolicy?.includes("export async function PUT") && adminPolicy.includes("upsertPolicy")),
      "PUT /api/admin/devices/[deviceId]/policy is present"
    ),
    check(
      "provisioning-checksum",
      Boolean(
        provisioning?.includes("sha256Base64Url") &&
          provisioning.includes("resolveApkChecksum") &&
          provisioning.includes("createProvisioningQr")
      ),
      "Provisioning checksum is computed from APK bytes (base64url SHA-256)"
    ),
    check(
      "provisioning-qr-route",
      Boolean(
        provisioningQr?.includes("export async function POST") &&
          provisioningQr.includes("createProvisioningQr")
      ),
      "POST /api/admin/provisioning/qr is present"
    ),
    check(
      "latest-locations-route",
      Boolean(
        latestLocations?.includes("export async function GET") &&
          latestLocations.includes("requireOperatorJson") &&
          latestLocations.includes("listLatestLocations")
      ),
      "GET /api/admin/locations/latest is operator-gated"
    ),
    check(
      "device-locations-route",
      Boolean(
        deviceLocations?.includes("export async function GET") &&
          deviceLocations.includes("requireOperatorJson") &&
          deviceLocations.includes("listDeviceLocations")
      ),
      "GET /api/admin/devices/[deviceId]/locations is operator-gated"
    ),
    check(
      "health-route",
      Boolean(
        health?.includes("status") &&
          health.includes("healthy") &&
          health.includes("getSupabaseAdmin") &&
          !health.includes("SUPABASE_SERVICE_ROLE_KEY")
      ),
      "GET /api/health reports healthy + DB check without leaking keys"
    ),
    check(
      "locations-helper-camelcase",
      Boolean(
        locationsHelper?.includes("recordedAt") &&
          locationsHelper.includes("deviceId") &&
          types?.includes("DeviceLatestLocation")
      ),
      "Location helpers map snake_case rows to camelCase HTTP"
    ),
    check(
      "supabase-auth-session",
      Boolean(
        operatorAuth?.includes("getUser") &&
          operatorAuth.includes("requireOperatorJson") &&
          !operatorAuth.includes("OPERATOR_PASSWORD") &&
          middleware?.includes("updateSession") &&
          middleware.includes("/api/heartbeat")
      ),
      "Operator APIs use Supabase Auth sessions; device routes use soft/hard X-Device-Token"
    ),
    check(
      "device-token-auth",
      Boolean(
        readRepo("src/lib/device-auth.ts")?.includes("requireDeviceJson") &&
          heartbeat?.includes("requireDeviceJson") &&
          policy?.includes("requireDeviceJson")
      ),
      "Heartbeat and policy call requireDeviceJson for X-Device-Token"
    ),
  ];

  const failed = checks.filter((item) => !item.ok).length;
  return {
    summary:
      failed === 0
        ? `API/DPC contracts look sound for "${goal}".`
        : `Backend found ${failed} contract gap(s).`,
    checks,
    artifacts: {
      routes: [
        "/api/heartbeat",
        "/api/policy",
        "/api/version.json",
        "/api/admin/devices",
        "/api/admin/devices/:deviceId/policy",
        "/api/admin/devices/:deviceId/token",
        "/api/admin/provisioning/qr",
        "/api/admin/locations/latest",
        "/api/admin/devices/:deviceId/locations",
        "/api/admin/app-version",
        "/api/admin/releases",
        "/api/admin/releases/upload",
        "/api/health",
      ],
    },
  };
}
