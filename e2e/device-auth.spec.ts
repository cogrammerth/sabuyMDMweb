import { expect, test } from "@playwright/test";
import { DEVICE_TOKEN_HEADER } from "./helpers/device-token";
import { loginAsOperator } from "./helpers/login";

test.describe("Device token auth", () => {
  test("minted token is required on policy/heartbeat; version.json stays public", async ({
    page,
    request,
  }) => {
    const deviceId = `qa-token-${Date.now()}`;

    await loginAsOperator(page);
    const qr = await page.request.post("/api/admin/provisioning/qr", {
      data: { deviceId, leaveAllSystemAppsEnabled: true },
    });
    expect(qr.ok(), await qr.text()).toBeTruthy();
    const qrBody = await qr.json();
    const deviceToken =
      qrBody.extras?.["android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE"]
        ?.deviceToken;
    expect(typeof deviceToken).toBe("string");
    expect(deviceToken.length).toBeGreaterThan(20);

    const version = await request.get("/api/version.json");
    expect(version.ok()).toBeTruthy();

    const deniedPolicy = await request.get(
      `/api/policy?deviceId=${encodeURIComponent(deviceId)}`
    );
    expect(deniedPolicy.status()).toBe(401);

    const deniedHeartbeat = await request.post("/api/heartbeat", {
      data: {
        deviceId,
        model: "Token Gate",
        androidVersion: "14",
        batteryLevel: 50,
        storageFreeMb: 1024,
      },
    });
    expect(deniedHeartbeat.status()).toBe(401);

    const okPolicy = await request.get(
      `/api/policy?deviceId=${encodeURIComponent(deviceId)}`,
      { headers: { [DEVICE_TOKEN_HEADER]: deviceToken } }
    );
    expect(okPolicy.ok(), await okPolicy.text()).toBeTruthy();

    const okHeartbeat = await request.post("/api/heartbeat", {
      headers: { [DEVICE_TOKEN_HEADER]: deviceToken },
      data: {
        deviceId,
        model: "Token Gate",
        androidVersion: "14",
        batteryLevel: 50,
        storageFreeMb: 1024,
      },
    });
    expect(okHeartbeat.ok(), await okHeartbeat.text()).toBeTruthy();

    // Re-assert session before admin rotate (parallel suites can race refresh tokens).
    await loginAsOperator(page);
    const rotate = await page.request.post(
      `/api/admin/devices/${encodeURIComponent(deviceId)}/token`
    );
    expect(rotate.ok(), await rotate.text()).toBeTruthy();
    const rotateBody = await rotate.json();
    expect(rotateBody.deviceToken).toBeTruthy();
    expect(rotateBody.deviceToken).not.toBe(deviceToken);

    const stale = await request.get(
      `/api/policy?deviceId=${encodeURIComponent(deviceId)}`,
      { headers: { [DEVICE_TOKEN_HEADER]: deviceToken } }
    );
    expect(stale.status()).toBe(401);

    const fresh = await request.get(
      `/api/policy?deviceId=${encodeURIComponent(deviceId)}`,
      { headers: { [DEVICE_TOKEN_HEADER]: rotateBody.deviceToken } }
    );
    expect(fresh.ok(), await fresh.text()).toBeTruthy();
  });
});
