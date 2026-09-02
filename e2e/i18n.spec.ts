import { expect, test, type Page } from "@playwright/test";
import en from "../src/locales/en.json";
import th from "../src/locales/th.json";

const CONSOLE_ROUTES = ["/", "/devices", "/map", "/provisioning", "/settings"] as const;
const AUTH_ROUTES = ["/login", "/forgot-password"] as const;

function flattenKeys(obj: unknown, prefix = ""): string[] {
  if (typeof obj === "string") return prefix ? [prefix] : [];
  if (obj === null || typeof obj !== "object") return [];
  return Object.entries(obj as Record<string, unknown>).flatMap(([key, value]) =>
    flattenKeys(value, prefix ? `${prefix}.${key}` : key)
  );
}

function isBenignConsole(text: string): boolean {
  return /openstreetmap|leaflet|Failed to load resource|net::ERR_|chrome-extension|hydration-mismatch|didn't match the client properties|caret-color/i.test(
    text
  );
}

async function chooseLocale(page: Page, locale: "th" | "en") {
  const urlBefore = page.url();
  await page.getByTestId("language-selector-button").click();
  await expect(page.getByTestId("language-menu")).toBeVisible();
  await page.getByTestId(`language-option-${locale}`).click();
  await expect(page.getByTestId("language-menu")).toHaveCount(0);
  expect(page.url()).toBe(urlBefore);
}

async function assertNoMissingKeys(page: Page) {
  const nodes = page.locator("[data-i18n]");
  const count = await nodes.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i += 1) {
    const node = nodes.nth(i);
    const key = await node.getAttribute("data-i18n");
    const text = ((await node.innerText()) ?? "").trim();
    expect(text, `empty translation for ${key}`).not.toBe("");
    expect(text, `raw key leaked for ${key}`).not.toBe(key);
    expect(text.toLowerCase(), `undefined at ${key}`).not.toContain("undefined");
  }
}

async function assertNoHorizontalOverflow(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(
    scrollWidth,
    `horizontal overflow (${scrollWidth} > ${clientWidth})`
  ).toBeLessThanOrEqual(clientWidth + 1);
}

test.describe("Bilingual i18n engine", () => {
  test("en and th dictionaries expose the same keys", () => {
    expect(flattenKeys(th).sort()).toEqual(flattenKeys(en).sort());
    expect(flattenKeys(en)).toEqual(
      expect.arrayContaining([
        "nav.dashboard",
        "nav.fleet",
        "nav.map",
        "nav.zeroTouch",
        "nav.appReleases",
        "nav.office",
        "nav.logout",
        "auth.email",
        "auth.forgotPassword",
        "auth.signOut",
        "metrics.totalDevices",
        "metrics.online",
        "metrics.offline",
        "metrics.healthStatus",
        "metrics.battery",
        "provisioning.step1Title",
        "provisioning.step2Title",
        "provisioning.step3Title",
        "actions.rename",
        "actions.lock",
        "actions.wipe",
        "actions.policyEditor",
        "actions.save",
        "actions.cancel",
      ])
    );
  });

  test("toggling language updates chrome instantly across routes without reload", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => consoleErrors.push(String(err)));

    await page.addInitScript(() => {
      window.localStorage.setItem("sabuy-mdm-locale", "en");
    });

    for (const route of CONSOLE_ROUTES) {
      await page.goto(route);
      if (page.url().includes("/login")) {
        throw new Error(`Expected authenticated session for ${route}, landed on ${page.url()}`);
      }

      await expect(page.getByTestId("language-selector")).toBeVisible();
      await expect(page.getByTestId("language-selector-button")).toContainText(
        "English"
      );

      const loads: string[] = [];
      const onLoad = () => loads.push(page.url());
      page.on("load", onLoad);

      await chooseLocale(page, "th");
      await expect(page.getByTestId("language-selector-button")).toContainText(
        "ภาษาไทย"
      );
      expect(loads, `${route} reloaded on TH toggle`).toEqual([]);
      await expect
        .poll(async () => page.evaluate(() => document.documentElement.lang))
        .toBe("th");
      await assertNoMissingKeys(page);
      await assertNoHorizontalOverflow(page);

      if (route === "/") {
        await expect(page.getByTestId("page-title")).toHaveText("ภาพรวมระบบ");
        await expect(page.getByTestId("exec-dashboard")).toBeVisible();
        await expect(page.getByTestId("quick-actions")).toBeVisible();
        await expect(page.locator("body")).not.toContainText("POST /api/heartbeat");
      }
      if (route === "/devices") {
        await expect(page.getByTestId("page-title")).toHaveText("จัดการอุปกรณ์");
        await expect(page.getByTestId("summary-total")).toContainText(
          "อุปกรณ์ทั้งหมด"
        );
      }
      if (route === "/provisioning") {
        await expect(page.getByTestId("enroll-step-1")).toContainText(
          "ล้างเครื่องและเตรียม"
        );
        await expect(page.getByTestId("enroll-step-2")).toContainText(
          "เปิดสแกนเนอร์ QR"
        );
        await expect(page.getByTestId("enroll-step-3")).toContainText(
          "สแกนและตั้งค่า"
        );
      }
      if (route === "/") {
        await expect(page.locator("[data-i18n='brand.title']")).toBeVisible();
      }

      await chooseLocale(page, "en");
      await expect(page.getByTestId("language-selector-button")).toContainText(
        "English"
      );
      expect(loads, `${route} reloaded on EN toggle`).toEqual([]);
      await expect
        .poll(async () => page.evaluate(() => document.documentElement.lang))
        .toBe("en");
      await assertNoMissingKeys(page);
      await assertNoHorizontalOverflow(page);

      if (route === "/") {
        await expect(page.getByTestId("page-title")).toHaveText("Dashboard");
        await expect(page.getByTestId("exec-dashboard")).toBeVisible();
      }
      if (route === "/devices") {
        await expect(page.getByTestId("page-title")).toHaveText("Fleet Management");
        await expect(page.getByTestId("summary-total")).toContainText(
          "Total devices"
        );
      }
      if (route === "/provisioning") {
        await expect(page.getByTestId("enroll-step-1")).toContainText(
          "Wipe & Prepare"
        );
      }

      page.off("load", onLoad);
    }

    const unexpected = consoleErrors.filter((text) => !isBenignConsole(text));
    expect(unexpected, unexpected.join("\n")).toEqual([]);
  });

  test.describe("auth pages", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("language switcher works on login and forgot-password", async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem("sabuy-mdm-locale", "en");
      });

      for (const route of AUTH_ROUTES) {
        await page.goto(route);
        await expect(page.getByTestId("language-selector")).toBeVisible();
        await expect(page.getByTestId("language-selector-button")).toContainText(
          "English"
        );
        await chooseLocale(page, "th");
        await expect(page.getByTestId("language-selector-button")).toContainText(
          "ภาษาไทย"
        );
        if (route === "/login") {
          await expect(page.getByTestId("page-title")).toHaveText("เข้าสู่ระบบ");
        }
        if (route === "/forgot-password") {
          await expect(page.getByTestId("page-title")).toHaveText("รีเซ็ตรหัสผ่าน");
        }
        await assertNoMissingKeys(page);
        await chooseLocale(page, "en");
        if (route === "/login") {
          await expect(page.getByTestId("page-title")).toHaveText("Sign in");
        }
        if (route === "/forgot-password") {
          await expect(page.getByTestId("page-title")).toHaveText("Reset password");
        }
      }
    });
  });

  test("Thai copy does not overflow the header at mobile width", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      window.localStorage.setItem("sabuy-mdm-locale", "th");
    });
    await page.goto("/devices");
    await expect(page.getByTestId("language-selector")).toBeVisible();
    await expect(page.getByTestId("operator-nav")).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await assertNoMissingKeys(page);
  });
});
