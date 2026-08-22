import { expect, test } from "@playwright/test";

test.describe("Admin dashboard rendering", () => {
  test("device table, policy toggles, QR generator, and office widget render", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/admin");

    await expect(page.getByTestId("device-table")).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Device ID" })).toBeVisible();

    await expect(page.getByTestId("policy-toggles")).toBeVisible();
    const camera = page.getByTestId("policy-switch-disableCamera");
    const before = await camera.getAttribute("aria-checked");
    await camera.click();
    await expect(camera).toHaveAttribute(
      "aria-checked",
      before === "true" ? "false" : "true"
    );

    const kiosk = page.getByTestId("policy-switch-kioskMode");
    await kiosk.click();
    await expect(page.getByTestId("kiosk-invariant")).toBeVisible();

    await expect(page.getByTestId("qr-generator")).toBeVisible();
    await page.getByTestId("qr-generate").click();
    await expect(page.getByTestId("qr-preview")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("qr-extras")).toContainText(
      "PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME"
    );

    await expect(page.getByTestId("agent-office")).toBeVisible();
    await expect(page.getByTestId("office-speech")).toBeVisible();

    expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
  });
});
