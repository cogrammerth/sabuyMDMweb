import { mkdtemp, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";

export const MAX_APK_BYTES = 80 * 1024 * 1024;
export const DPC_RELEASES_BUCKET = "dpc-releases";

export class ApkParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApkParseError";
  }
}

export type ApkMetadata = {
  versionCode: number;
  versionName: string;
  packageName: string;
};

function isZipBuffer(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b;
}

function toPositiveInt(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
}

export function assertApkUpload(fileName: string, buffer: Buffer): void {
  const name = fileName.trim().toLowerCase();
  if (!name.endsWith(".apk")) {
    throw new ApkParseError("File must be an .apk");
  }
  if (buffer.byteLength === 0) {
    throw new ApkParseError("APK file is empty");
  }
  if (buffer.byteLength > MAX_APK_BYTES) {
    throw new ApkParseError("APK exceeds the 80MB upload limit");
  }
  if (!isZipBuffer(buffer)) {
    throw new ApkParseError("File is not a valid APK archive");
  }
}

export async function parseApkBuffer(buffer: Buffer, fileName = "upload.apk"): Promise<ApkMetadata> {
  assertApkUpload(fileName, buffer);

  const dir = await mkdtemp(path.join(os.tmpdir(), "sabuy-apk-"));
  const filePath = path.join(dir, "upload.apk");
  try {
    await writeFile(filePath, buffer);
    const { default: AppInfoParser } = await import("app-info-parser");
    const parser = new AppInfoParser(filePath);
    const info = await parser.parse();
    const versionCode = toPositiveInt(info.versionCode);
    const versionName = String(info.versionName ?? "").trim();
    const packageName = String(info.package ?? "").trim();
    if (versionCode === null) {
      throw new ApkParseError("APK is missing a valid versionCode");
    }
    if (!versionName) {
      throw new ApkParseError("APK is missing versionName");
    }
    return {
      versionCode,
      versionName,
      packageName,
    };
  } catch (error) {
    if (error instanceof ApkParseError) throw error;
    const message = error instanceof Error ? error.message : "Failed to parse APK";
    throw new ApkParseError(message);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export function parseClientVersionCode(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isInteger(n) && n >= 0) return n;
  }
  return null;
}
