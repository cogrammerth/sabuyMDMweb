import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { getSupabaseAdmin } from "@/lib/supabase";
import type {
  AppVersionRecord,
  AppVersionWriteInput,
  VersionInfo,
} from "@/types/mdm";

export const DEFAULT_VERSION_INFO: VersionInfo = {
  versionCode: 1,
  versionName: "1.0.0",
  apkUrl: "https://mdmweb.sabuycall.net/apk/sabuy-mdm.apk",
  isMandatory: false,
};

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_VERSION = path.join(DATA_DIR, "app-version-active.json");

type AppVersionRow = {
  id: string;
  version_code: number;
  version_name: string;
  apk_url: string;
  is_mandatory: boolean;
  is_active: boolean;
  released_at: string;
};

function isMissingTableError(error: { code?: string; message?: string }): boolean {
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    Boolean(error.message?.includes("app_versions"))
  );
}

function toVersionInfo(row: Pick<AppVersionRow, "version_code" | "version_name" | "apk_url" | "is_mandatory">): VersionInfo {
  return {
    versionCode: row.version_code,
    versionName: row.version_name,
    apkUrl: row.apk_url,
    isMandatory: row.is_mandatory,
  };
}

function toRecord(row: AppVersionRow): AppVersionRecord {
  return {
    id: row.id,
    versionCode: row.version_code,
    versionName: row.version_name,
    apkUrl: row.apk_url,
    isMandatory: row.is_mandatory,
    isActive: row.is_active,
    releasedAt: row.released_at,
  };
}

function readFileVersion(): VersionInfo | null {
  try {
    const raw = readFileSync(FILE_VERSION, "utf8");
    const parsed = JSON.parse(raw) as VersionInfo;
    if (
      typeof parsed.versionCode !== "number" ||
      typeof parsed.versionName !== "string" ||
      typeof parsed.apkUrl !== "string" ||
      typeof parsed.isMandatory !== "boolean"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function fileToRecord(info: VersionInfo): AppVersionRecord {
  return {
    id: "file-fallback",
    versionCode: info.versionCode,
    versionName: info.versionName,
    apkUrl: info.apkUrl,
    isMandatory: info.isMandatory,
    isActive: true,
    releasedAt: new Date().toISOString(),
  };
}

function writeFileVersion(info: VersionInfo): AppVersionRecord {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(FILE_VERSION, JSON.stringify(info, null, 2), "utf8");
  return fileToRecord(info);
}

export async function getActiveVersionInfo(): Promise<VersionInfo> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("app_versions")
      .select("version_code, version_name, apk_url, is_mandatory")
      .eq("is_active", true)
      .order("released_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error)) {
        return readFileVersion() ?? DEFAULT_VERSION_INFO;
      }
      console.error("[app-versions] get active failed:", error);
      return readFileVersion() ?? DEFAULT_VERSION_INFO;
    }

    if (!data) {
      return readFileVersion() ?? DEFAULT_VERSION_INFO;
    }
    return toVersionInfo(data as AppVersionRow);
  } catch (error) {
    console.error("[app-versions] get active unexpected:", error);
    return readFileVersion() ?? DEFAULT_VERSION_INFO;
  }
}

export async function getActiveAppVersion(): Promise<AppVersionRecord | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("app_versions")
      .select("*")
      .eq("is_active", true)
      .order("released_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error)) {
        const file = readFileVersion();
        return file ? fileToRecord(file) : null;
      }
      console.error("[app-versions] get record failed:", error);
      throw new Error("Failed to fetch app version");
    }

    if (!data) {
      const file = readFileVersion();
      return file ? fileToRecord(file) : null;
    }
    return toRecord(data as AppVersionRow);
  } catch (error) {
    if (error instanceof Error && error.message === "Failed to fetch app version") {
      throw error;
    }
    console.error("[app-versions] get record unexpected:", error);
    throw new Error("Failed to fetch app version");
  }
}

export class AppVersionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppVersionValidationError";
  }
}

function validateWriteInput(input: AppVersionWriteInput): VersionInfo {
  const versionCode = Number(input.versionCode);
  if (!Number.isInteger(versionCode) || versionCode < 1) {
    throw new AppVersionValidationError("versionCode must be a positive integer");
  }

  const versionName = String(input.versionName ?? "").trim();
  if (!versionName) {
    throw new AppVersionValidationError("versionName is required");
  }

  const apkUrl = String(input.apkUrl ?? "").trim();
  if (!apkUrl) {
    throw new AppVersionValidationError("apkUrl is required");
  }
  if (!/^https:\/\/.+/i.test(apkUrl)) {
    throw new AppVersionValidationError("apkUrl must be an HTTPS URL");
  }

  return {
    versionCode,
    versionName,
    apkUrl,
    isMandatory: Boolean(input.isMandatory),
  };
}

export async function publishAppVersion(
  input: AppVersionWriteInput
): Promise<AppVersionRecord> {
  const payload = validateWriteInput(input);
  const supabase = getSupabaseAdmin();

  const { error: deactivateError } = await supabase
    .from("app_versions")
    .update({ is_active: false })
    .eq("is_active", true);

  if (deactivateError && !isMissingTableError(deactivateError)) {
    console.error("[app-versions] deactivate failed:", deactivateError);
    throw new Error("Failed to publish app version");
  }

  if (deactivateError && isMissingTableError(deactivateError)) {
    return writeFileVersion(payload);
  }

  const { data, error } = await supabase
    .from("app_versions")
    .upsert(
      {
        version_code: payload.versionCode,
        version_name: payload.versionName,
        apk_url: payload.apkUrl,
        is_mandatory: payload.isMandatory,
        is_active: true,
        released_at: new Date().toISOString(),
      },
      { onConflict: "version_code" }
    )
    .select("*")
    .single();

  if (error) {
    if (isMissingTableError(error)) {
      return writeFileVersion(payload);
    }
    console.error("[app-versions] publish failed:", error);
    throw new Error("Failed to publish app version");
  }

  writeFileVersion(payload);
  return toRecord(data as AppVersionRow);
}
