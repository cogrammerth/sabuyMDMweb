import { expect, test } from "@playwright/test";
import { loginAsOperator } from "./helpers/login";

const DEVICE_ID = "qa-apk-release-device";
const STALE_CODE = 2;
const LATEST_CODE = 9_001_088;
const LATEST_NAME = "9.0.1-apk-channel";
const LATEST_URL = "https://mdmweb.sabuycall.net/apk/sabuy-mdm-apk-channel.apk";

test.describe("In-hub APK releases", () => {
  test("upload rejects a non-APK payload without touching storage", async ({
    page,
  }) => {
    await loginAsOperator(page);
    const missing = await page.request.post("/api/admin/releases/upload");
    expect(missing.status()).toBe(400);
    const missingBody = await missing.json();
    expect(missingBody.success).toBe(false);

    const fake = await page.request.post("/api/admin/releases/upload", {
      multipart: {
        apk: {
          name: "fake.apk",
          mimeType: "application/vnd.android.package-archive",
          buffer: Buffer.from("not-a-zip"),
        },
      },
    });
    expect(fake.status()).toBe(400);
    const fakeBody = await fake.json();
    expect(fakeBody.success).toBe(false);
    expect(String(fakeBody.error)).toMatch(/apk|valid/i);
  });

  test("heartbeat and version.json compare currentAppVersionCode to the active channel", async ({
    page,
    request,
  }) => {
    await loginAsOperator(page);
    const publish = await page.request.put("/api/admin/app-version", {
      data: {
        versionCode: LATEST_CODE,
        versionName: LATEST_NAME,
        apkUrl: LATEST_URL,
        isMandatory: false,
      },
    });
    expect(publish.ok(), await publish.text()).toBeTruthy();

    const staleHeartbeat = await request.post("/api/heartbeat", {
      data: {
        deviceId: DEVICE_ID,
        model: "Pixel Release QA",
        androidVersion: "14",
        batteryLevel: 64,
        storageFreeMb: 2048,
        currentAppVersionCode: STALE_CODE,
      },
    });
    expect(staleHeartbeat.ok(), await staleHeartbeat.text()).toBeTruthy();
    const staleBody = await staleHeartbeat.json();
    expect(staleBody.success).toBe(true);
    expect(staleBody.updateAvailable).toBe(true);
    expect(staleBody.latestVersionCode).toBe(LATEST_CODE);

    const currentHeartbeat = await request.post("/api/heartbeat", {
      data: {
        deviceId: DEVICE_ID,
        currentAppVersionCode: LATEST_CODE,
      },
    });
    expect(currentHeartbeat.ok(), await currentHeartbeat.text()).toBeTruthy();
    const currentBody = await currentHeartbeat.json();
    expect(currentBody.updateAvailable).toBe(false);

    const version = await request.get(
      `/api/version.json?currentAppVersionCode=${STALE_CODE}`
    );
    expect(version.ok()).toBeTruthy();
    const versionBody = await version.json();
    expect(versionBody).toMatchObject({
      versionCode: LATEST_CODE,
      versionName: LATEST_NAME,
      apkUrl: LATEST_URL,
      updateAvailable: true,
    });

    const fleet = await page.request.get("/api/admin/devices");
    expect(fleet.ok()).toBeTruthy();
    const fleetBody = await fleet.json();
    const row = fleetBody.devices.find(
      (device: { deviceId: string }) => device.deviceId === DEVICE_ID
    );
    expect(row).toBeTruthy();
    expect(row).toHaveProperty("currentAppVersionCode");
    if (row.currentAppVersionCode !== null) {
      expect(row.currentAppVersionCode).toBe(LATEST_CODE);
    }
  });

  test("settings shows the upload zone and devices show a version indicator", async ({
    page,
    request,
  }) => {
    await request.post("/api/heartbeat", {
      data: {
        deviceId: DEVICE_ID,
        model: "Pixel Release QA",
        androidVersion: "14",
        batteryLevel: 64,
        currentAppVersionCode: STALE_CODE,
      },
    });

    await loginAsOperator(page);
    await page.goto("/settings");
    await expect(page.getByTestId("app-release-editor")).toBeVisible();
    await expect(page.getByTestId("apk-upload-zone")).toBeVisible();
    await expect(page.getByTestId("release-list")).toBeVisible();

    await page.goto("/devices");
    await page.getByTestId("device-search").fill(DEVICE_ID);
    await expect(page.getByTestId(`device-row-${DEVICE_ID}`)).toBeVisible();
    await expect(page.getByTestId(`device-version-${DEVICE_ID}`)).toBeVisible();
  });
});
