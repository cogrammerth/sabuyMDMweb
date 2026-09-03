import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { loginAsOperator } from "./login";

/** Ensure the browser session is signed in, then use its cookie jar for admin APIs. */
export async function authedPageRequest(page: Page): Promise<APIRequestContext> {
  await loginAsOperator(page);
  return page.request;
}

export async function expectAuthedOk(
  res: { ok: () => boolean; status: () => number; text: () => Promise<string> },
  label: string
) {
  expect(res.ok(), `${label} → ${res.status()} ${await res.text()}`).toBeTruthy();
}
