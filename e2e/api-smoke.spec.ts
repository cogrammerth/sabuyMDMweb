import { expect, test } from "@playwright/test";
import { loginAsOperator } from "./helpers/login";

test.describe("Device-facing APIs", () => {
  test("version.json is a flat camelCase object", async ({ request }) => {
    const res = await request.get("/api/version.json");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toMatchObject({
      versionCode: expect.any(Number),
      versionName: expect.any(String),
      apkUrl: expect.any(String),
      isMandatory: expect.any(Boolean),
    });
    expect(res.headers()["cache-control"] ?? "").toMatch(/no-store/i);
  });

  test("policy requires deviceId", async ({ request }) => {
    const res = await request.get("/api/policy");
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test("agent state endpoint is readable", async ({ page }) => {
    await loginAsOperator(page);
    const res = await page.request.get("/api/agents/state");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("task_queue");
    expect(body).toHaveProperty("handoff_log");
    expect(body).toHaveProperty("current_agent");
  });

  test("health endpoint is healthy with a database check", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe("healthy");
    expect(body.database).toBe("connected");
  });

  test("admin devices list is camelCase and computes isOnline", async ({ page }) => {
    await loginAsOperator(page);
    const res = await page.request.get("/api/admin/devices");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.devices)).toBeTruthy();
    expect(body.summary).toMatchObject({
      total: expect.any(Number),
      online: expect.any(Number),
      offline: expect.any(Number),
      lowBattery: expect.any(Number),
    });
    if (body.devices.length > 0) {
      expect(body.devices[0]).toHaveProperty("deviceId");
      expect(body.devices[0]).toHaveProperty("isOnline");
      expect(body.devices[0]).toHaveProperty("lastHeartbeat");
    }
  });
});
