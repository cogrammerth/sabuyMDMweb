/**
 * Applies 002_app_versions.sql when SUPABASE_DB_URL (or DATABASE_URL) is set.
 * Usage: node scripts/apply-app-versions-migration.mjs
 */
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadEnvFile(name) {
  try {
    const raw = readFileSync(path.join(root, name), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const value = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    /* optional */
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.warn(
    "[migration] SUPABASE_DB_URL not set — skip DDL. Run supabase/migrations/002_app_versions.sql in the SQL editor."
  );
  process.exit(0);
}

const sql = readFileSync(
  path.join(root, "supabase/migrations/002_app_versions.sql"),
  "utf8"
);

const { default: pg } = await import("pg");
const client = new pg.Client({ connectionString: dbUrl });
await client.connect();
try {
  await client.query(sql);
  console.log("[migration] app_versions table ensured.");
} finally {
  await client.end();
}
