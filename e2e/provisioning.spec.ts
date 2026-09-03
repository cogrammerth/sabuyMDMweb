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
        expect.stringContaining("/"),
      "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION":
        expect.stringMatching(/^https:\/\//),
      "android.app.extra.PROVISIONING_LEAVE_ALL_SYSTEM_APPS_ENABLED": true,
      "android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE": {
        serverUrl: expect.any(String),
        deviceId: "qa-zt-store-01",
      },
    });
    expect(
      body.extras["android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_CHECKSUM"]
    ).toBe(body.checksum);
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
    await expect(page.getByTestId("qr-preview")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("qr-extras")).toContainText(
      "PROVISIONING_DEVICE_ADMIN_PACKAGE_CHECKSUM"
    );
    await expect(page.getByTestId("qr-extras")).not.toContainText(
      "<sha256-of-apk>"
    );
    await expect(page.getByTestId("qr-download")).toBeEnabled();
    await expect(page.getByTestId("qr-print")).toBeEnabled();

    await page.getByTestId("qr-device-id").fill("field-unit-7");
    await page.getByTestId("qr-generate").click();
    await expect(page.getByTestId("qr-extras")).toContainText("field-unit-7");

    expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
  });
});
