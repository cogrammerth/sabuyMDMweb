/**
 * Seed (or skip) the Supabase Auth operator user via the Admin API.
 *
 * Usage:
 *   npm run seed:operator
 *
 * Required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPERATOR_PASSWORD
 * Optional: OPERATOR_EMAIL (default admin@sabuycall.net)
 */
import { existsSync, readFileSync } from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_OPERATOR_EMAIL = "admin@sabuycall.net";

function applyEnvFile(filePath: string): void {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

applyEnvFile(path.join(process.cwd(), ".env.local"));
applyEnvFile(path.join(process.cwd(), ".env"));

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value || value.startsWith("your-supabase")) {
    throw new Error(`Missing or invalid ${name}. Set it in .env.local.`);
  }
  return value;
}

function isAlreadyExistsError(message: string): boolean {
  return /already (been )?registered|already exists|duplicate|user already/i.test(
    message
  );
}

/** Avoid `ReturnType<typeof createClient>` — supabase-js default generics diverge from the inferred client. */
function createAdminClient(url: string, serviceRoleKey: string) {
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function findUserByEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string
) {
  const normalized = email.toLowerCase();
  let page = 1;
  const perPage = 200;

  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(`Failed to list Auth users: ${error.message}`);
    }
    const match = data.users.find(
      (user) => user.email?.toLowerCase() === normalized
    );
    if (match) return match;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function main(): Promise<void> {
  const url = required("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = required("SUPABASE_SERVICE_ROLE_KEY");
  const email =
    process.env.OPERATOR_EMAIL?.trim() || DEFAULT_OPERATOR_EMAIL;
  const password = process.env.OPERATOR_PASSWORD?.trim();

  if (!password) {
    throw new Error(
      "Set OPERATOR_PASSWORD in .env.local (no default — choose a strong password)."
    );
  }

  const admin = createAdminClient(url, serviceRoleKey);

  const existing = await findUserByEmail(admin, email);
  if (existing) {
    console.log("Operator user already exists, skipping creation.");
    console.log(`  id:    ${existing.id}`);
    console.log(`  email: ${existing.email ?? email}`);
    return;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: "operator" },
  });

  if (error) {
    if (isAlreadyExistsError(error.message)) {
      console.log("Operator user already exists, skipping creation.");
      return;
    }
    throw new Error(`Failed to create operator user: ${error.message}`);
  }

  const user = data.user;
  if (!user) {
    throw new Error("createUser succeeded but returned no user payload.");
  }

  console.log("Operator user created.");
  console.log(`  id:    ${user.id}`);
  console.log(`  email: ${user.email ?? email}`);
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "seed-operator failed"
  );
  process.exit(1);
});
