import { expect, test } from "@playwright/test";
import { operatorTestCredentials } from "./helpers/operator";

test.describe("Unauthenticated operator console", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("protected pages redirect to /login", async ({ page, request }) => {
    for (const path of ["/", "/devices", "/map", "/provisioning", "/settings", "/guide", "/admin"] as const) {
      const probe = await request.get(path, { maxRedirects: 0 });
      const location = probe.headers()["location"] ?? "";
      expect(probe.status(), `${path} → ${probe.status()} ${location}`).toBeGreaterThanOrEqual(300);
      expect(probe.status()).toBeLessThan(400);
      expect(location).toContain("/login");
    }

    await page.goto("/devices");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByTestId("login-form")).toBeVisible();
    await expect(page.getByTestId("language-selector")).toBeVisible();
  });

  test("version.json stays public; untokenized devices stay readable in soft mode", async ({
    request,
  }) => {
    const health = await request.get("/api/health");
    expect(health.ok()).toBeTruthy();

    const version = await request.get("/api/version.json");
    expect(version.ok()).toBeTruthy();

    // Soft mode: unknown deviceId with no stored hash still allows policy.
    const policy = await request.get("/api/policy?deviceId=unauth-probe-legacy");
    expect(policy.ok()).toBeTruthy();
  });

  test("admin APIs reject anonymous callers", async ({ request }) => {
    const list = await request.get("/api/admin/devices");
    expect(list.status()).toBe(401);

    const publish = await request.put("/api/admin/app-version", {
      data: {
        versionCode: 1,
        versionName: "1.0.0",
        apkUrl: "https://mdmweb.sabuycall.net/apk/sabuy-mdm.apk",
      },
    });
    expect(publish.status()).toBe(401);
  });

  test("forgot-password and reset-password pages load with language switcher", async ({
    page,
  }) => {
    await page.goto("/forgot-password");
    await expect(page.getByTestId("forgot-password-page")).toBeVisible();
    await expect(page.getByTestId("forgot-password-form")).toBeVisible();
    await expect(page.getByTestId("language-selector")).toBeVisible();

    await page.goto("/reset-password");
    await expect(page.getByTestId("reset-password-page")).toBeVisible();
    await expect(page.getByTestId("language-selector")).toBeVisible();
  });
});

test.describe("Authenticated operator session", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("header shows operator email and sign-out returns to login", async ({ page }) => {
    const { email, password } = operatorTestCredentials();
    await page.goto("/login");
    await page.getByTestId("operator-email").fill(email);
    await page.getByTestId("operator-password").fill(password);
    await page.getByTestId("operator-login").click();
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 20_000 });
    await expect(page.getByTestId("operator-session")).toBeVisible();
    await expect(page.getByTestId("operator-email-display")).toContainText(email);
    await page.getByTestId("header-sign-out").click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByTestId("login-form")).toBeVisible();
  });
});
