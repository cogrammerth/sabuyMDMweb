/**
 * Apply 004_device_tokens.sql via the Supabase SQL HTTP API is not available
 * with the service role. Operators should paste the migration in the SQL editor.
 *
 * This script only verifies whether device_token_hash is queryable.
 *
 *   npx tsx scripts/check-device-token-schema.ts
 */
import { existsSync, readFileSync } from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main(): Promise<void> {
  const { error } = await supabase
    .from("devices")
    .select("device_id, device_token_hash, device_token_issued_at")
    .limit(1);

  if (error) {
    console.error("Schema check FAILED:", error.message);
    console.error(
      "Apply supabase/migrations/004_device_tokens.sql in the Supabase SQL editor."
    );
    process.exit(1);
  }

  console.log("OK — device_token_hash columns are present.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
