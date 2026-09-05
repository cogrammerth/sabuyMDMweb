import { readFile } from "fs/promises";
import path from "path";
import QRCode from "qrcode";
import { getActiveVersionInfo } from "@/lib/app-versions";
import {
  ApkSignatureError,
  signatureChecksumFromApk,
} from "@/lib/apk-signature";
import { issueDeviceToken } from "@/lib/device-auth";
import type {
  ProvisioningChecksumSource,
  ProvisioningExtras,
} from "@/types/mdm";

export type { ProvisioningExtras, ProvisioningChecksumSource };

/** DPC package + DeviceAdminReceiver (Android component name). */
export const DEFAULT_DPC_PACKAGE = "com.sabuycall.sabuymdm";
export const DEFAULT_DPC_COMPONENT =
  "com.sabuycall.sabuymdm/.receiver.SabuyDeviceAdminReceiver";

export const DEFAULT_SERVER_URL = "https://mdmweb.sabuycall.net";

/**
 * Last-resort download URL only. Prefer the active `app_versions.apk_url`
 * (Supabase Storage public object) via getActiveVersionInfo().
 */
export const DEFAULT_APK_URL =
  "https://mdmweb.sabuycall.net/apk/sabuy-mdm.apk";

export type ChecksumSource = ProvisioningChecksumSource;

export interface ProvisioningConfig {
  componentName: string;
  packageName: string;
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

function packageFromComponent(componentName: string): string {
  const pkg = componentName.split("/")[0]?.trim() ?? "";
  return pkg;
}

export function getProvisioningConfigSync(
  apkUrl = DEFAULT_APK_URL
): ProvisioningConfig {
  const componentName =
    process.env.DPC_COMPONENT_NAME?.trim() || DEFAULT_DPC_COMPONENT;
  const packageName =
    process.env.DPC_PACKAGE_NAME?.trim() ||
    packageFromComponent(componentName) ||
    DEFAULT_DPC_PACKAGE;
  return {
    componentName,
    packageName,
    apkUrl: process.env.DPC_APK_URL?.trim() || apkUrl,
    serverUrl: process.env.MDM_SERVER_URL?.trim() || DEFAULT_SERVER_URL,
    leaveAllSystemAppsEnabled: true,
  };
}

/** @deprecated Prefer getProvisioningConfig() which resolves the active APK URL. */
export function getProvisioningConfig(): ProvisioningConfig {
  return getProvisioningConfigSync();
}

/**
 * Resolve the APK HTTPS URL for Zero-Touch download.
 * Order: DPC_APK_URL (if it looks like a real APK host path) → active app_versions
 * (Supabase public URL) → default.
 */
export async function resolveProvisioningApkUrl(): Promise<string> {
  const fromEnv = process.env.DPC_APK_URL?.trim();
  if (fromEnv && /^https:\/\//i.test(fromEnv)) {
    // Prefer env when it clearly points at an .apk object. Hub paths that used to
    // serve Next HTML (e.g. /apk/*.apk without a static file) fall through.
    if (/\.apk(\?|#|$)/i.test(fromEnv) || /\/storage\/v1\/object\//i.test(fromEnv)) {
      try {
        const head = await fetch(fromEnv, {
          method: "HEAD",
          cache: "no-store",
          redirect: "follow",
        });
        const contentType = (head.headers.get("content-type") ?? "").toLowerCase();
        if (head.ok && !contentType.includes("text/html")) {
          return fromEnv;
        }
        console.warn(
          `[provisioning] DPC_APK_URL is not a downloadable APK (${head.status} ${contentType}); trying active release`
        );
      } catch (error) {
        console.warn("[provisioning] DPC_APK_URL probe failed:", error);
      }
    }
  }

  try {
    const active = await getActiveVersionInfo();
    const url = active.apkUrl?.trim();
    if (url && /^https:\/\//i.test(url)) return url;
  } catch (error) {
    console.warn("[provisioning] active APK URL lookup failed:", error);
  }

  if (fromEnv && /^https:\/\//i.test(fromEnv)) return fromEnv;
  return DEFAULT_APK_URL;
}

export async function resolveProvisioningConfig(): Promise<ProvisioningConfig> {
  const apkUrl = await resolveProvisioningApkUrl();
  return getProvisioningConfigSync(apkUrl);
}

async function signatureFromLocalFile(
  filePath: string
): Promise<{ checksum: string; source: ChecksumSource }> {
  const absolute = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);
  const bytes = await readFile(absolute);
  return {
    checksum: signatureChecksumFromApk(bytes),
    source: "local-file",
  };
}

async function signatureFromRemoteApk(
  apkUrl: string
): Promise<{ checksum: string; source: ChecksumSource }> {
  const res = await fetch(apkUrl, {
    cache: "no-store",
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`Failed to download APK for signature checksum (${res.status})`);
  }
  const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
  if (contentType.includes("text/html")) {
    throw new Error(
      `APK URL returned HTML instead of an APK (${apkUrl}). Publish a release or set DPC_APK_URL to a public .apk.`
    );
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.byteLength === 0) {
    throw new Error("Downloaded APK is empty");
  }
  if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw new Error("Downloaded bytes are not a ZIP/APK");
  }
  return {
    checksum: signatureChecksumFromApk(buffer),
    source: "remote-apk",
  };
}

/**
 * Resolve Android Enterprise SIGNATURE_CHECKSUM (signing-cert digest).
 * Never hashes the whole APK file. Never invents a placeholder.
 *
 * Order: DPC_SIGNATURE_CHECKSUM → explicit DPC_APK_LOCAL_PATH → download apkUrl.
 * (Legacy DPC_APK_CHECKSUM is accepted only as an explicit override alias.)
 */
export async function resolveSignatureChecksum(
  apkUrl: string
): Promise<{ checksum: string; source: ChecksumSource }> {
  const envChecksum =
    process.env.DPC_SIGNATURE_CHECKSUM?.trim() ||
    process.env.DPC_APK_CHECKSUM?.trim();
  if (envChecksum && envChecksum !== "<sha256-of-apk>") {
    return { checksum: envChecksum, source: "env-override" };
  }

  const localPath = process.env.DPC_APK_LOCAL_PATH?.trim();
  // Do not auto-use fixtures/provisioning-apk-stub.bin — that is a file-hash stub,
  // not a signed APK, and would produce a meaningless "signature" checksum.
  if (localPath && !localPath.includes("provisioning-apk-stub")) {
    try {
      return await signatureFromLocalFile(localPath);
    } catch (error) {
      console.warn("[provisioning] local APK signature checksum failed:", error);
    }
  }

  try {
    return await signatureFromRemoteApk(apkUrl);
  } catch (error) {
    console.warn("[provisioning] remote APK signature checksum failed:", error);
  }

  throw new Error(
    "Unable to resolve APK signing-certificate checksum. Publish a signed APK (active release), set DPC_APK_URL / DPC_APK_LOCAL_PATH, or set DPC_SIGNATURE_CHECKSUM."
  );
}

/** @deprecated Use resolveSignatureChecksum — kept for older imports/tests. */
export async function resolveApkChecksum(
  apkUrl: string
): Promise<{ checksum: string; source: ChecksumSource }> {
  return resolveSignatureChecksum(apkUrl);
}

export function buildProvisioningExtras(input: {
  config: ProvisioningConfig;
  checksum: string;
  deviceId?: string;
  deviceToken?: string;
  leaveAllSystemAppsEnabled?: boolean;
}): ProvisioningExtras {
  const deviceId = (input.deviceId ?? "").trim();
  const deviceToken = (input.deviceToken ?? "").trim();
  const adminExtras: ProvisioningExtras["android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE"] =
    {
      serverUrl: input.config.serverUrl,
      deviceId,
    };
  if (deviceToken) {
    adminExtras.deviceToken = deviceToken;
  }
  return {
    "android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME":
      input.config.componentName,
    "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_NAME":
      input.config.packageName,
    "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION":
      input.config.apkUrl,
    "android.app.extra.PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM":
      input.checksum,
    "android.app.extra.PROVISIONING_LEAVE_ALL_SYSTEM_APPS_ENABLED":
      input.leaveAllSystemAppsEnabled ??
      input.config.leaveAllSystemAppsEnabled,
    "android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE": adminExtras,
  };
}

export function validateExtrasShape(extras: ProvisioningExtras): string | null {
  const component =
    extras["android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME"]?.trim();
  const packageName =
    extras["android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_NAME"]?.trim();
  const apkUrl =
    extras[
      "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION"
    ]?.trim();
  const checksum =
    extras[
      "android.app.extra.PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM"
    ]?.trim();

  if (!component || !component.includes("/")) {
    return "PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME must be package/.Receiver";
  }
  if (!packageName) {
    return "PROVISIONING_DEVICE_ADMIN_PACKAGE_NAME is required";
  }
  if (packageName !== component.split("/")[0]) {
    return "PROVISIONING_DEVICE_ADMIN_PACKAGE_NAME must match the component package";
  }
  if (!apkUrl || !/^https:\/\//i.test(apkUrl)) {
    return "PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION must be an https URL";
  }
  if (!checksum || checksum === "<sha256-of-apk>") {
    return "PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM must be a real signing-cert SHA-256 (base64url)";
  }
  return null;
}

export async function createProvisioningQr(options?: {
  deviceId?: string;
  leaveAllSystemAppsEnabled?: boolean;
}): Promise<ProvisioningQrResult> {
  const config = await resolveProvisioningConfig();
  const { checksum, source } = await resolveSignatureChecksum(config.apkUrl);
  const deviceId = (options?.deviceId ?? "").trim();
  const deviceToken = deviceId ? await issueDeviceToken(deviceId) : undefined;
  const extras = buildProvisioningExtras({
    config,
    checksum,
    deviceId,
    deviceToken,
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

export { ApkSignatureError };
