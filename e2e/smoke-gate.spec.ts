import { expect, test, type Page } from "@playwright/test";
import { loginAsOperator } from "./helpers/login";

const DEVICE_ID = "test-device-01";
const GPS = { latitude: 13.7563, longitude: 100.5018 };

function isBenignConsole(text: string): boolean {
  return /openstreetmap|leaflet|Failed to load resource|net::ERR_|chrome-extension|hydration-mismatch|didn't match the client properties|caret-color/i.test(
    text
  );
}

function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => {
    errors.push(String(err));
  });
  return errors;
}

test.describe("Mandatory automated smoke gate", () => {
  test("1. health check is 200 healthy with DB connected", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status(), await res.text()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("healthy");
    expect(body.database).toBe("connected");
    expect(body.checkedAt).toBeTruthy();
  });

  test("2. version.json and policy handshake return valid payloads", async ({
    request,
  }) => {
    const version = await request.get("/api/version.json");
    expect(version.ok(), await version.text()).toBeTruthy();
    const versionBody = await version.json();
    expect(versionBody).toMatchObject({
      versionCode: expect.any(Number),
      versionName: expect.any(String),
      apkUrl: expect.any(String),
      isMandatory: expect.any(Boolean),
    });
    expect(version.headers()["cache-control"] ?? "").toMatch(/no-store/i);

    const policy = await request.get(`/api/policy?deviceId=${DEVICE_ID}`);
    expect(policy.ok(), await policy.text()).toBeTruthy();
    const policyBody = await policy.json();
    expect(policyBody).toMatchObject({
      disableCamera: expect.any(Boolean),
      disableFactoryReset: expect.any(Boolean),
      disableSafeBoot: expect.any(Boolean),
      disableUsbDebugging: expect.any(Boolean),
      kioskMode: expect.any(Boolean),
      kioskPackage: expect.any(String),
      hiddenApps: expect.any(Array),
      suspendedApps: expect.any(Array),
    });
  });

  test("3. heartbeat with GPS/battery returns 200 and upserts fleet + location", async ({
    page,
    request,
  }) => {
    const heartbeat = await request.post("/api/heartbeat", {
      data: {
        deviceId: DEVICE_ID,
        model: "Pixel Smoke",
        androidVersion: "14",
        batteryLevel: 87,
        storageFreeMb: 2048,
        latitude: GPS.latitude,
        longitude: GPS.longitude,
      },
    });
    expect(heartbeat.status(), await heartbeat.text()).toBe(200);
    const heartbeatBody = await heartbeat.json();
    expect(heartbeatBody.success).toBe(true);
    expect(typeof heartbeatBody.timestamp).toBe("number");
    expect(typeof heartbeatBody.updateAvailable).toBe("boolean");
    expect(typeof heartbeatBody.latestVersionCode).toBe("number");

    await loginAsOperator(page);
    await page.goto("/devices");
    await expect(page.getByTestId("operator-session")).toBeVisible();
    const fleet = await page.request.get("/api/admin/devices");
    expect(fleet.ok(), await fleet.text()).toBeTruthy();
    const fleetBody = await fleet.json();
    const row = fleetBody.devices.find(
      (device: { deviceId: string }) => device.deviceId === DEVICE_ID
    );
    expect(row).toBeTruthy();
    expect(row.model).toBe("Pixel Smoke");
    expect(row.batteryLevel).toBe(87);
    expect(row.isOnline).toBe(true);

    const latest = await page.request.get("/api/admin/locations/latest");
    expect(latest.ok(), await latest.text()).toBeTruthy();
    const latestBody = await latest.json();
    const pin = latestBody.locations.find(
      (item: { deviceId: string }) => item.deviceId === DEVICE_ID
    );
    expect(pin).toMatchObject({
      deviceId: DEVICE_ID,
      latitude: GPS.latitude,
      longitude: GPS.longitude,
    });
  });

  test.describe("unauthenticated UI gate", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("4a. login page renders email/password with language switcher", async ({ page }) => {
      const consoleErrors = collectPageErrors(page);
      await page.goto("/login");
      await expect(page.getByTestId("login-page")).toBeVisible();
      await expect(page.getByTestId("login-form")).toBeVisible();
      await expect(page.getByTestId("operator-email")).toBeVisible();
      await expect(page.getByTestId("operator-password")).toBeVisible();
      await expect(page.getByTestId("forgot-password-link")).toBeVisible();
      await expect(page.getByTestId("language-selector")).toBeVisible();
      const unexpected = consoleErrors.filter((text) => !isBenignConsole(text));
      expect(unexpected, unexpected.join("\n")).toEqual([]);
    });
  });

  test("4b. authenticated operator pages load without 500s or uncaught console errors", async ({
    page,
  }) => {
    const consoleErrors = collectPageErrors(page);
    await loginAsOperator(page);

    for (const path of ["/devices", "/map", "/provisioning", "/settings"] as const) {
      await page.goto(path);
      await expect(page.getByTestId("page-title")).toBeVisible();
      expect(page.url()).toMatch(new RegExp(`${path.replace("/", "\\/")}`));
      await expect(page.getByTestId("operator-session")).toBeVisible();
    }

    const unexpected = consoleErrors.filter((text) => !isBenignConsole(text));
    expect(unexpected, unexpected.join("\n")).toEqual([]);
  });

  test("5. fleet search/filter and Zero-Touch QR render without runtime exceptions", async ({
    page,
    request,
  }) => {
    const consoleErrors = collectPageErrors(page);

    const heartbeat = await request.post("/api/heartbeat", {
      data: {
        deviceId: DEVICE_ID,
        model: "Pixel Smoke",
        androidVersion: "14",
        batteryLevel: 87,
        storageFreeMb: 2048,
        latitude: GPS.latitude,
        longitude: GPS.longitude,
      },
    });
    expect(heartbeat.ok(), await heartbeat.text()).toBeTruthy();

    await loginAsOperator(page);
    await page.goto("/devices");
    await expect(page.getByTestId("operator-session")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("device-table")).toBeVisible();
    await page.getByTestId("device-search").fill(DEVICE_ID);
    await expect(page.getByTestId(`device-row-${DEVICE_ID}`)).toBeVisible();
    await expect(page.getByTestId(`device-version-${DEVICE_ID}`)).toBeVisible();
    await page.getByTestId("device-filter").selectOption("online");
    await expect(page.getByTestId(`device-row-${DEVICE_ID}`)).toBeVisible();

    await page.goto("/provisioning");
    await expect(page.getByTestId("qr-generator")).toBeVisible();
    // Use a dedicated enroll id so minting a token does not lock DEVICE_ID for other smoke steps.
    await page.getByTestId("qr-device-id").fill("smoke-zt-enroll-01");
    await page.getByTestId("qr-generate").click();
    await expect(page.getByTestId("qr-preview")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("qr-preview").locator("img")).toBeVisible();
    await expect(page.getByTestId("qr-extras")).toContainText("deviceToken");

    const unexpected = consoleErrors.filter((text) => !isBenignConsole(text));
    expect(unexpected, unexpected.join("\n")).toEqual([]);
  });
});
