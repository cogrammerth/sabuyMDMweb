import { expect, test } from "@playwright/test";
import { loginAsOperator } from "./helpers/login";

function isBenignConsole(text: string): boolean {
  return /openstreetmap|leaflet|Failed to load resource|net::ERR_|chrome-extension|hydration-mismatch|didn't match the client properties|caret-color/i.test(
    text
  );
}

test.describe("User Guide page", () => {
  test("renders five Thai onboarding steps without overflow or console errors", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => consoleErrors.push(String(err)));

    await page.addInitScript(() => {
      window.localStorage.setItem("sabuy-mdm-locale", "th");
    });
    await loginAsOperator(page);
    await page.goto("/guide");

    await expect(page.getByTestId("page-title")).toHaveText("คู่มือการใช้งาน");
    await expect(page.getByTestId("user-guide")).toBeVisible();
    await expect(page.getByTestId("operator-nav").locator('[href="/guide"]')).toBeVisible();

    for (let i = 1; i <= 5; i += 1) {
      await expect(page.getByTestId(`guide-step-${i}`)).toBeVisible();
      await expect(page.getByTestId(`guide-toc-${i}`)).toBeVisible();
    }

    await expect(page.getByTestId("guide-step-1")).toContainText(
      "การเตรียมเครื่องก่อนลงทะเบียน"
    );
    await expect(page.getByTestId("guide-step-2")).toContainText("Zero-Touch");
    await expect(page.getByTestId("guide-step-3")).toContainText("Device Owner");
    await expect(page.getByTestId("guide-step-4")).toContainText("ออนไลน์");
    await expect(page.getByTestId("guide-step-5")).toContainText("Wi-Fi");

    await expect(page.getByTestId("guide-link-provision")).toHaveAttribute(
      "href",
      "/provisioning"
    );
    await expect(page.getByTestId("guide-link-verify")).toHaveAttribute(
      "href",
      "/devices"
    );

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/guide");
    await expect(page.getByTestId("user-guide")).toBeVisible();
    const mobile = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(mobile.scrollWidth).toBeLessThanOrEqual(mobile.clientWidth + 1);

    const unexpected = consoleErrors.filter((text) => !isBenignConsole(text));
    expect(unexpected, unexpected.join("\n")).toEqual([]);
  });
});
