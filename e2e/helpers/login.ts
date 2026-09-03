import { expect, type Page } from "@playwright/test";
import { operatorTestCredentials } from "./operator";

/**
 * Ensure the page context is signed in.
 * Prefers an existing storageState session; falls back to UI login once.
 */
export async function loginAsOperator(page: Page): Promise<void> {
  const { email, password } = operatorTestCredentials();

  await page.goto("/devices");
  if (!page.url().includes("/login")) {
    await expect(page.getByTestId("operator-session")).toBeVisible({
      timeout: 10_000,
    });
    return;
  }

  await expect(page.getByTestId("login-form")).toBeVisible();
  await page.getByTestId("operator-email").fill(email);
  await page.getByTestId("operator-password").fill(password);
  await page.getByTestId("operator-login").click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 20_000 });
  await expect(page.getByTestId("operator-session")).toBeVisible({
    timeout: 15_000,
  });
}
