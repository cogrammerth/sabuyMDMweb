import { expect, test } from "@playwright/test";
import { loginAsOperator } from "./helpers/login";

const DEVICE_ID = "qa-prod-readiness-device";
const RELEASE_CODE = 9_001_022;
const RELEASE_NAME = "9.0.1-prod-readiness";
const RELEASE_URL = "https://mdmweb.sabuycall.net/apk/sabuy-mdm-prod-readiness.apk";
const FRIENDLY_NAME = "QA Store Front Tablet";

test.describe("Production readiness — fleet control", () => {
  test.beforeAll(async ({ request }) => {
    const heartbeat = await request.post("/api/heartbeat", {
      data: {
        deviceId: DEVICE_ID,
        model: "Pixel 8 QA",
        androidVersion: "14",
        batteryLevel: 55,
        storageFreeMb: 8192,
      },
    });
    expect(heartbeat.ok(), await heartbeat.text()).toBeTruthy();
  });

  test("device friendly name persists via PATCH and shows in fleet table", async ({
    page,
  }) => {
    await loginAsOperator(page);
    const patch = await page.request.patch(`/api/admin/devices/${DEVICE_ID}`, {
      data: { deviceName: FRIENDLY_NAME },
    });
    expect(patch.ok(), await patch.text()).toBeTruthy();
    const patchBody = await patch.json();
    expect(patchBody.success).toBe(true);
    expect(patchBody.device.deviceName).toBe(FRIENDLY_NAME);

    const list = await page.request.get("/api/admin/devices");
    expect(list.ok()).toBeTruthy();
    const listBody = await list.json();
    const row = listBody.devices.find(
      (device: { deviceId: string }) => device.deviceId === DEVICE_ID
    );
    expect(row?.deviceName).toBe(FRIENDLY_NAME);

    await page.goto("/devices");
    await page.getByTestId("device-search").fill(DEVICE_ID);
    await expect(page.getByTestId(`device-name-${DEVICE_ID}`)).toHaveText(
      FRIENDLY_NAME
    );

    await page.getByTestId(`device-name-edit-trigger-${DEVICE_ID}`).click();
    await page.getByTestId(`device-name-input-${DEVICE_ID}`).fill("Renamed In UI");
    await page.getByTestId(`device-name-save-${DEVICE_ID}`).click();
    await expect(page.getByTestId(`device-name-${DEVICE_ID}`)).toHaveText(
      "Renamed In UI"
    );

    const verify = await page.request.get("/api/admin/devices");
    const verifyBody = await verify.json();
    const updated = verifyBody.devices.find(
      (device: { deviceId: string }) => device.deviceId === DEVICE_ID
    );
    expect(updated?.deviceName).toBe("Renamed In UI");
  });

  test("publishing APK metadata updates GET /api/version.json", async ({
    page,
    request,
  }) => {
    await loginAsOperator(page);
    const publish = await page.request.put("/api/admin/app-version", {
      data: {
        versionCode: RELEASE_CODE,
        versionName: RELEASE_NAME,
        apkUrl: RELEASE_URL,
        isMandatory: true,
      },
    });
    expect(publish.ok(), await publish.text()).toBeTruthy();
    const publishBody = await publish.json();
    expect(publishBody.success).toBe(true);
    expect(publishBody.version.versionCode).toBe(RELEASE_CODE);

    const version = await request.get("/api/version.json");
    expect(version.ok()).toBeTruthy();
    const body = await version.json();
    expect(body).toMatchObject({
      versionCode: RELEASE_CODE,
      versionName: RELEASE_NAME,
      apkUrl: RELEASE_URL,
      isMandatory: true,
    });

    await page.goto("/settings");
    await expect(page.getByTestId("app-release-editor")).toBeVisible();
    await expect(page.getByTestId("app-release-current")).toContainText(RELEASE_NAME);
  });

  test.describe("unauthenticated admin writes", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("admin write endpoints reject unauthenticated callers", async ({
      request,
    }) => {
      const res = await request.put("/api/admin/app-version", {
        headers: { Authorization: "Bearer wrong-token" },
        data: {
          versionCode: 1,
          versionName: "1.0.0",
          apkUrl: "https://mdmweb.sabuycall.net/apk/sabuy-mdm.apk",
        },
      });
      expect(res.status()).toBe(401);
    });
  });
});
