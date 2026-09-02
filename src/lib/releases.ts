import { createHash } from "crypto";
import {
  DPC_RELEASES_BUCKET,
  parseApkBuffer,
} from "@/lib/apk-parse";
import { publishAppVersion } from "@/lib/app-versions";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { AppVersionRecord } from "@/types/mdm";

export class ReleaseUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReleaseUploadError";
  }
}

function safeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64) || "release";
}

export async function uploadApkRelease(input: {
  buffer: Buffer;
  fileName: string;
  isMandatory: boolean;
}): Promise<AppVersionRecord> {
  const meta = await parseApkBuffer(input.buffer, input.fileName);
  const sha256 = createHash("sha256").update(input.buffer).digest("hex");
  const storagePath = `${meta.versionCode}/${safeSegment(meta.packageName || "dpc")}-${safeSegment(meta.versionName)}.apk`;

  const supabase = getSupabaseAdmin();
  const { error: uploadError } = await supabase.storage
    .from(DPC_RELEASES_BUCKET)
    .upload(storagePath, input.buffer, {
      contentType: "application/vnd.android.package-archive",
      upsert: true,
      cacheControl: "3600",
    });

  if (uploadError) {
    console.error("[releases] storage upload failed:", uploadError);
    throw new ReleaseUploadError(
      "Failed to upload APK to storage. Apply supabase/migrations/003_apk_releases.sql if the dpc-releases bucket is missing."
    );
  }

  const { data: publicData } = supabase.storage
    .from(DPC_RELEASES_BUCKET)
    .getPublicUrl(storagePath);

  const apkUrl = publicData.publicUrl;
  if (!apkUrl) {
    throw new ReleaseUploadError("Failed to resolve public APK URL");
  }

  return publishAppVersion({
    versionCode: meta.versionCode,
    versionName: meta.versionName,
    apkUrl,
    isMandatory: input.isMandatory,
    packageName: meta.packageName || null,
    fileSizeBytes: input.buffer.byteLength,
    sha256,
    storagePath,
  });
}
