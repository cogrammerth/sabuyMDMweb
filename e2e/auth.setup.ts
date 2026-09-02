import { mkdirSync } from "fs";
import path from "path";
import { test as setup, expect } from "@playwright/test";
import {
  ensureOperatorUser,
  operatorTestCredentials,
} from "./helpers/operator";

const AUTH_FILE = path.join(__dirname, ".auth/operator.json");

setup("authenticate operator", async ({ page }) => {
  mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  await ensureOperatorUser();
  const { email, password } = operatorTestCredentials();

  await page.goto("/login");
  await expect(page.getByTestId("login-form")).toBeVisible();
  await page.getByTestId("operator-email").fill(email);
  await page.getByTestId("operator-password").fill(password);
  await page.getByTestId("operator-login").click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 20_000 });
  await page.context().storageState({ path: AUTH_FILE });
});
