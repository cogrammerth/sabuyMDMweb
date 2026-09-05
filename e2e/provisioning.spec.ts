import { expect, test } from "@playwright/test";
import { loginAsOperator } from "./helpers/login";

test.describe("Phase 3 Zero-Touch provisioning", () => {
  test("POST /api/admin/provisioning/qr returns real extras and a data-URL QR", async ({
    page,
  }) => {
    await loginAsOperator(page);
    const res = await page.request.post("/api/admin/provisioning/qr", {
      data: { deviceId: "qa-zt-store-01", leaveAllSystemAppsEnabled: true },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.checksumSource).toBeTruthy();
    expect(body.checksum).toBeTruthy();
    expect(body.checksum).not.toBe("<sha256-of-apk>");
    expect(body.qrDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(body.extras).toMatchObject({
      "android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME":
        "com.sabuycall.sabuymdm/com.sabuycall.sabuymdm.receiver.SabuyDeviceAdminReceiver",
      "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_NAME":
        "com.sabuycall.sabuymdm",
      "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION":
        expect.stringMatching(/^https:\/\//),
      "android.app.extra.PROVISIONING_LEAVE_ALL_SYSTEM_APPS_ENABLED": true,
      "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_ALLOW_TEST_KEYS":
        true,
      "android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE": {
        serverUrl: expect.any(String),
        deviceId: "qa-zt-store-01",
        deviceToken: expect.any(String),
      },
    });
    expect(
      body.extras[
        "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_ALLOW_TEST_KEYS"
      ]
    ).toBe(true);
    expect(
      typeof body.extras[
        "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_ALLOW_TEST_KEYS"
      ]
    ).toBe("boolean");
    expect(
      typeof body.extras[
        "android.app.extra.PROVISIONING_LEAVE_ALL_SYSTEM_APPS_ENABLED"
      ]
    ).toBe("boolean");
    expect(
      body.extras["android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE"].deviceToken
        .length
    ).toBeGreaterThan(20);
    expect(
      body.extras[
        "android.app.extra.PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM"
      ]
    ).toBe(body.checksum);
    expect(body.extras).not.toHaveProperty(
      "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_CHECKSUM"
    );
    // Prefer Supabase Storage public URL when DPC_APK_URL is unset.
    expect(
      body.extras[
        "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION"
      ]
    ).toMatch(/supabase\.co\/storage\/v1\/object\/public\/dpc-releases\//);

    const denied = await page.request.get("/api/policy?deviceId=qa-zt-store-01");
    expect(denied.status()).toBe(401);
    const allowed = await page.request.get("/api/policy?deviceId=qa-zt-store-01", {
      headers: {
        "X-Device-Token":
          body.extras["android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE"]
            .deviceToken,
      },
    });
    expect(allowed.ok(), await allowed.text()).toBeTruthy();
  });

  test("provisioning page renders QR preview without console errors", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => consoleErrors.push(String(err)));

    await loginAsOperator(page);
    await page.goto("/provisioning");
    await expect(page.getByTestId("qr-generator")).toBeVisible();

    // Initial encode can race session refresh under parallel load — retry once.
    const preview = page.getByTestId("qr-preview");
    if (!(await preview.isVisible().catch(() => false))) {
      await page.getByTestId("qr-generate").click();
    }
    await expect(preview).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("qr-extras")).toContainText(
      "PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM"
    );
    await expect(page.getByTestId("qr-extras")).not.toContainText(
      "PROVISIONING_DEVICE_ADMIN_PACKAGE_CHECKSUM"
    );
    await expect(page.getByTestId("qr-extras")).toContainText(
      "com.sabuycall.sabuymdm"
    );
    await expect(page.getByTestId("qr-extras")).toContainText(
      "SabuyDeviceAdminReceiver"
    );
    await expect(page.getByTestId("qr-extras")).not.toContainText(
      "<sha256-of-apk>"
    );
    await expect(page.getByTestId("qr-download")).toBeEnabled();
    await expect(page.getByTestId("qr-print")).toBeEnabled();

    await page.getByTestId("qr-device-id").fill("field-unit-7");
    await page.getByTestId("qr-generate").click();
    await expect(page.getByTestId("qr-extras")).toContainText("field-unit-7");
    await expect(page.getByTestId("qr-extras")).toContainText("deviceToken");

    expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
  });
});
