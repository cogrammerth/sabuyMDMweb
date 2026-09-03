import { mkdirSync } from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { test as setup, expect } from "@playwright/test";
import {
  ensureOperatorUser,
  operatorTestCredentials,
} from "./helpers/operator";

const AUTH_FILE = path.join(__dirname, ".auth/operator.json");
const BASE = process.env.AGENT_BASE_URL || "http://localhost:3000";
const MAX_CHUNK_SIZE = 3180;

function projectRefFromUrl(url: string): string {
  const host = new URL(url).hostname;
  return host.split(".")[0] ?? "supabase";
}

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function createAuthCookies(name: string, rawValue: string) {
  const encoded = `base64-${toBase64Url(rawValue)}`;
  const uriEncoded = encodeURIComponent(encoded);
  if (uriEncoded.length <= MAX_CHUNK_SIZE) {
    return [{ name, value: encoded }];
  }
  const chunks: Array<{ name: string; value: string }> = [];
  let remaining = uriEncoded;
  let index = 0;
  while (remaining.length > 0) {
    let head = remaining.slice(0, MAX_CHUNK_SIZE);
    const lastEscape = head.lastIndexOf("%");
    if (lastEscape > MAX_CHUNK_SIZE - 3) {
      head = head.slice(0, lastEscape);
    }
    chunks.push({ name: `${name}.${index}`, value: decodeURIComponent(head) });
    remaining = remaining.slice(head.length);
    index += 1;
  }
  return chunks;
}

setup("authenticate operator", async ({ page, browser }) => {
  mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  await ensureOperatorUser();
  const { email, password } = operatorTestCredentials();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  const supabase = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.session) {
    throw new Error(`Operator sign-in failed: ${error?.message ?? "no session"}`);
  }

  const cookieName = `sb-${projectRefFromUrl(url)}-auth-token`;
  const cookieParts = createAuthCookies(
    cookieName,
    JSON.stringify(data.session)
  );
  await page.context().addCookies(
    cookieParts.map((part) => ({
      name: part.name,
      value: part.value,
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax" as const,
    }))
  );

  await page.goto(`${BASE}/devices`);
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 15_000 });
  await expect(page.getByTestId("operator-session")).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByTestId("operator-email-display")).toContainText(email);

  await page.context().storageState({ path: AUTH_FILE });

  const verify = await browser.newContext({ storageState: AUTH_FILE });
  try {
    const probe = await verify.newPage();
    await probe.goto(`${BASE}/devices`);
    await expect(probe).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 15_000 });
    await expect(probe.getByTestId("operator-session")).toBeVisible({
      timeout: 15_000,
    });
  } finally {
    await verify.close();
  }
});
