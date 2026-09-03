import { expect, test } from "@playwright/test";
import { loginAsOperator } from "./helpers/login";

const DEVICE_ID = "qa-phase4-geo";
const POINTS = [
  { latitude: 13.7563, longitude: 100.5018 },
  { latitude: 13.7601, longitude: 100.5102 },
  { latitude: 13.7634, longitude: 100.5188 },
];

function isBenignConsole(text: string): boolean {
  return /openstreetmap|leaflet|Failed to load resource|net::ERR_|chrome-extension/i.test(
    text
  );
}

test.describe("Phase 4 geo map and health", () => {
  test.describe.configure({ mode: "serial" });

  test("healthcheck reports healthy and a database check", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok(), await res.text()).toBeTruthy();
    expect(res.headers()["cache-control"] ?? "").toMatch(/no-store/i);
    expect(res.headers()["x-content-type-options"] ?? "").toMatch(/nosniff/i);
    const body = await res.json();
    expect(body.status).toBe("healthy");
    expect(body.database).toBe("connected");
    expect(JSON.stringify(body)).not.toMatch(/service_role|SUPABASE_SERVICE_ROLE/i);
  });

  test("location APIs return camelCase latest pins and ASC history", async ({
    page,
    request,
  }) => {
    for (const point of POINTS) {
      const heartbeat = await request.post("/api/heartbeat", {
        data: {
          deviceId: DEVICE_ID,
          model: "Pixel 8 QA Map",
          androidVersion: "14",
          batteryLevel: 76,
          storageFreeMb: 2048,
          latitude: point.latitude,
          longitude: point.longitude,
        },
      });
      expect(heartbeat.ok(), await heartbeat.text()).toBeTruthy();
    }

    await loginAsOperator(page);
    const latest = await page.request.get("/api/admin/locations/latest");
    expect(latest.ok(), await latest.text()).toBeTruthy();
    const latestBody = await latest.json();
    expect(latestBody.success).toBe(true);
    expect(Array.isArray(latestBody.locations)).toBeTruthy();
    const pin = latestBody.locations.find(
      (row: { deviceId?: string }) => row.deviceId === DEVICE_ID
    );
    expect(pin).toBeTruthy();
    expect(pin).toMatchObject({
      deviceId: DEVICE_ID,
      model: "Pixel 8 QA Map",
      batteryLevel: 76,
      isOnline: true,
      latitude: POINTS[POINTS.length - 1].latitude,
      longitude: POINTS[POINTS.length - 1].longitude,
    });
    expect(pin).toHaveProperty("recordedAt");
    expect(pin).toHaveProperty("lastHeartbeat");
    expect(JSON.stringify(pin)).not.toMatch(/device_id|recorded_at|last_heartbeat/);

    const history = await page.request.get(
      `/api/admin/devices/${encodeURIComponent(DEVICE_ID)}/locations`
    );
    expect(history.ok(), await history.text()).toBeTruthy();
    const historyBody = await history.json();
    expect(historyBody.success).toBe(true);
    expect(historyBody.deviceId).toBe(DEVICE_ID);
    expect(historyBody.locations.length).toBeGreaterThanOrEqual(POINTS.length);
    const stamps = historyBody.locations.map((row: { recordedAt: string }) =>
      Date.parse(row.recordedAt)
    );
    const sorted = [...stamps].sort((a, b) => a - b);
    expect(stamps).toEqual(sorted);
    expect(historyBody.locations[0]).toHaveProperty("latitude");
    expect(historyBody.locations[0]).toHaveProperty("longitude");
    expect(historyBody.locations[0]).toHaveProperty("recordedAt");
  });

  test("fleet map renders the container and loads location data", async ({
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
        model: "Pixel 8 QA Map",
        androidVersion: "14",
        batteryLevel: 76,
        storageFreeMb: 2048,
        latitude: POINTS[0].latitude,
        longitude: POINTS[0].longitude,
      },
    });
    expect(heartbeat.ok(), await heartbeat.text()).toBeTruthy();

    await loginAsOperator(page);
    const latest = await page.request.get("/api/admin/locations/latest");
    expect(latest.ok()).toBeTruthy();
    const latestBody = await latest.json();
    expect(
      latestBody.locations.some(
        (row: { deviceId?: string }) => row.deviceId === DEVICE_ID
      )
    ).toBeTruthy();

    await page.goto("/map");
    await expect(page.getByTestId("fleet-map")).toBeVisible();
    await expect(page.locator(".leaflet-container")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("leaflet-map")).toBeVisible();

    const unexpected = consoleErrors.filter((text) => !isBenignConsole(text));
    expect(unexpected, unexpected.join("\n")).toEqual([]);
  });

  test("device page history tab renders a polyline map", async ({ page, request }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => consoleErrors.push(String(err)));

    for (const point of POINTS) {
      await request.post("/api/heartbeat", {
        data: {
          deviceId: DEVICE_ID,
          model: "Pixel 8 QA Map",
          androidVersion: "14",
          batteryLevel: 76,
          storageFreeMb: 2048,
          latitude: point.latitude,
          longitude: point.longitude,
        },
      });
    }

    await loginAsOperator(page);
    await page.goto(`/devices/${encodeURIComponent(DEVICE_ID)}`);
    await expect(page.getByTestId("device-tabs")).toBeVisible();
    await page.getByTestId("tab-history").click();
    await expect(page.getByTestId("device-history-map")).toBeVisible();
    await expect(page.locator(".leaflet-container")).toBeVisible({
      timeout: 15_000,
    });

    const unexpected = consoleErrors.filter((text) => !isBenignConsole(text));
    expect(unexpected, unexpected.join("\n")).toEqual([]);
  });
});
