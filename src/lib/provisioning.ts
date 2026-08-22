import { createHash } from "crypto";
import { readFile } from "fs/promises";
import path from "path";
import QRCode from "qrcode";
import type {
  ProvisioningChecksumSource,
  ProvisioningExtras,
} from "@/types/mdm";

export type { ProvisioningExtras, ProvisioningChecksumSource };

/** Default DPC component until Android repo freezes the final package. */
export const DEFAULT_DPC_COMPONENT =
  "net.sabuycall.mdm/.DeviceAdminReceiver";

export const DEFAULT_SERVER_URL = "https://mdmweb.sabuycall.net";
export const DEFAULT_APK_URL =
  "https://mdmweb.sabuycall.net/apk/sabuy-mdm.apk";

export type ChecksumSource = ProvisioningChecksumSource;

export interface ProvisioningConfig {
  componentName: string;
  apkUrl: string;
  serverUrl: string;
  leaveAllSystemAppsEnabled: boolean;
}

export interface ProvisioningQrResult {
  extras: ProvisioningExtras;
  payload: string;
  checksum: string;
  checksumSource: ChecksumSource;
  qrDataUrl: string;
}

export function getProvisioningConfig(): ProvisioningConfig {
  return {
    componentName:
      process.env.DPC_COMPONENT_NAME?.trim() || DEFAULT_DPC_COMPONENT,
    apkUrl: process.env.DPC_APK_URL?.trim() || DEFAULT_APK_URL,
    serverUrl: process.env.MDM_SERVER_URL?.trim() || DEFAULT_SERVER_URL,
    leaveAllSystemAppsEnabled: true,
  };
}

/** Android Enterprise expects SHA-256 of the APK as base64url without padding. */
export function sha256Base64Url(bytes: Buffer): string {
  return createHash("sha256")
    .update(bytes)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function checksumFromLocalFile(
  filePath: string
): Promise<{ checksum: string; source: ChecksumSource }> {
  const absolute = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);
  const bytes = await readFile(absolute);
  return { checksum: sha256Base64Url(bytes), source: "local-file" };
}

async function checksumFromRemoteApk(
  apkUrl: string
): Promise<{ checksum: string; source: ChecksumSource }> {
  const res = await fetch(apkUrl, {
    cache: "no-store",
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`Failed to download APK for checksum (${res.status})`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.byteLength === 0) {
    throw new Error("Downloaded APK is empty");
  }
  return { checksum: sha256Base64Url(buffer), source: "remote-apk" };
}

/**
 * Prefer a real APK byte source. Env override is last resort for CI / stub APKs.
 * Never invent a placeholder checksum string in the QR payload.
 */
export async function resolveApkChecksum(
  apkUrl: string
): Promise<{ checksum: string; source: ChecksumSource }> {
  const localPath =
    process.env.DPC_APK_LOCAL_PATH?.trim() ||
    (process.env.NODE_ENV !== "production"
      ? "fixtures/provisioning-apk-stub.bin"
      : "");

  if (localPath) {
    try {
      return await checksumFromLocalFile(localPath);
    } catch (error) {
      console.warn("[provisioning] local APK checksum failed:", error);
    }
  }

  try {
    return await checksumFromRemoteApk(apkUrl);
  } catch (error) {
    console.warn("[provisioning] remote APK checksum failed:", error);
  }

  const envChecksum = process.env.DPC_APK_CHECKSUM?.trim();
  if (envChecksum && envChecksum !== "<sha256-of-apk>") {
    return { checksum: envChecksum, source: "env-override" };
  }

  throw new Error(
    "Unable to resolve APK checksum. Host the APK, set DPC_APK_LOCAL_PATH, or set DPC_APK_CHECKSUM."
  );
}

export function buildProvisioningExtras(input: {
  config: ProvisioningConfig;
  checksum: string;
  deviceId?: string;
  leaveAllSystemAppsEnabled?: boolean;
}): ProvisioningExtras {
  const deviceId = (input.deviceId ?? "").trim();
  return {
    "android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME":
      input.config.componentName,
    "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION":
      input.config.apkUrl,
    "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_CHECKSUM":
      input.checksum,
    "android.app.extra.PROVISIONING_LEAVE_ALL_SYSTEM_APPS_ENABLED":
      input.leaveAllSystemAppsEnabled ??
      input.config.leaveAllSystemAppsEnabled,
    "android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE": {
      serverUrl: input.config.serverUrl,
      deviceId,
    },
  };
}

export function validateExtrasShape(extras: ProvisioningExtras): string | null {
  const component =
    extras["android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME"]?.trim();
  const apkUrl =
    extras[
      "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION"
    ]?.trim();
  const checksum =
    extras[
      "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_CHECKSUM"
    ]?.trim();

  if (!component || !component.includes("/")) {
    return "PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME must be package/.Receiver";
  }
  if (!apkUrl || !/^https:\/\//i.test(apkUrl)) {
    return "PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION must be an https URL";
  }
  if (!checksum || checksum === "<sha256-of-apk>") {
    return "PROVISIONING_DEVICE_ADMIN_PACKAGE_CHECKSUM must be a real SHA-256 (base64url)";
  }
  return null;
}

export async function createProvisioningQr(options?: {
  deviceId?: string;
  leaveAllSystemAppsEnabled?: boolean;
}): Promise<ProvisioningQrResult> {
  const config = getProvisioningConfig();
  const { checksum, source } = await resolveApkChecksum(config.apkUrl);
  const extras = buildProvisioningExtras({
    config,
    checksum,
    deviceId: options?.deviceId,
    leaveAllSystemAppsEnabled: options?.leaveAllSystemAppsEnabled,
  });

  const shapeError = validateExtrasShape(extras);
  if (shapeError) {
    throw new Error(shapeError);
  }

  const payload = JSON.stringify(extras);
  const qrDataUrl = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 512,
    color: {
      dark: "#140c08",
      light: "#f6eed8",
    },
  });

  return {
    extras,
    payload,
    checksum,
    checksumSource: source,
    qrDataUrl,
  };
}
