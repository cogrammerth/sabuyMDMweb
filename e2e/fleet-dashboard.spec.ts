import { expect, test } from "@playwright/test";
import { loginAsOperator } from "./helpers/login";

const DEVICE_ID = "qa-phase2-mock";

test.describe("Phase 2 fleet dashboard and policy editor", () => {
  test.describe.configure({ mode: "serial" });

  test("device table renders seeded data, policy form saves, upsert is visible to PolicySyncWorker", async ({
    page,
    request,
  }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => consoleErrors.push(String(err)));

    const heartbeat = await request.post("/api/heartbeat", {
      data: {
        deviceId: DEVICE_ID,
        model: "Pixel 8 QA",
        androidVersion: "14",
        batteryLevel: 12,
        storageFreeMb: 4096,
      },
    });
    expect(heartbeat.ok(), await heartbeat.text()).toBeTruthy();

    await loginAsOperator(page);
    await page.goto("/devices");
    await expect(page.getByTestId("fleet-summary")).toBeVisible();
    await expect(page.getByTestId("summary-total")).toBeVisible();
    await expect(page.getByTestId("summary-online")).toBeVisible();
    await expect(page.getByTestId("summary-offline")).toBeVisible();
    await expect(page.getByTestId("summary-low-battery")).toBeVisible();
    await expect(page.getByTestId("device-table")).toBeVisible();

    await page.getByTestId("device-search").fill(DEVICE_ID);
    await expect(page.getByTestId(`device-row-${DEVICE_ID}`)).toBeVisible();
    await expect(page.getByText("12%")).toBeVisible();

    await page.getByTestId(`configure-${DEVICE_ID}`).click();
    await expect(page).toHaveURL(new RegExp(`/devices/${DEVICE_ID}`));
    await expect(page.getByTestId("policy-toggles")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("device-identity")).toBeVisible();

    const camera = page.getByTestId("policy-switch-disableCamera");
    const cameraBefore = await camera.getAttribute("aria-checked");
    await camera.click();
    await expect(camera).toHaveAttribute(
      "aria-checked",
      cameraBefore === "true" ? "false" : "true"
    );

    await page.getByTestId("hidden-apps-input").fill("com.android.vending");
    await page.getByTestId("hidden-apps-add").click();
    await expect(page.getByTestId("hidden-apps").getByText("com.android.vending")).toBeVisible();

    await page.getByTestId("suspended-apps-input").fill("com.example.game");
    await page.getByTestId("suspended-apps-add").click();

    const kiosk = page.getByTestId("policy-switch-kioskMode");
    if ((await kiosk.getAttribute("aria-checked")) !== "true") {
      await kiosk.click();
    }
    await page.getByTestId("kiosk-package").fill("");
    await expect(page.getByTestId("kiosk-invariant")).toBeVisible();
    await expect(page.getByTestId("policy-save")).toBeDisabled();
    await page.getByTestId("kiosk-package").fill("net.sabuycall.app");
    await expect(page.getByTestId("kiosk-invariant")).toHaveCount(0);
    await kiosk.click();

    await page.getByTestId("policy-save").click();
    await expect(page.getByTestId("policy-toast")).toBeVisible();

    const policy = await request.get(`/api/policy?deviceId=${DEVICE_ID}`);
    expect(policy.ok()).toBeTruthy();
    const body = await policy.json();
    expect(body.disableCamera).toBe(cameraBefore !== "true");
    expect(body.hiddenApps).toContain("com.android.vending");
    expect(body.suspendedApps).toContain("com.example.game");
    expect(body.kioskMode).toBe(false);

    expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
  });

  test("admin policy PUT rejects kiosk mode without a package", async ({ page }) => {
    await loginAsOperator(page);
    const result = await page.evaluate(async (deviceId) => {
      const res = await fetch(`/api/admin/devices/${deviceId}/policy`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          kioskMode: true,
          kioskPackage: "",
          disableCamera: false,
          disableFactoryReset: true,
          disableSafeBoot: true,
          disableUsbDebugging: false,
          hiddenApps: [],
          suspendedApps: [],
        }),
      });
      return { status: res.status, body: await res.json() };
    }, DEVICE_ID);
    expect(result.status).toBe(400);
    expect(result.body.success).toBe(false);
    expect(String(result.body.error)).toMatch(/kioskPackage/i);
  });
});
