import { NextRequest, NextResponse } from "next/server";
import { ApkParseError } from "@/lib/apk-parse";
import { AppVersionValidationError } from "@/lib/app-versions";
import { requireOperatorJson } from "@/lib/operator-auth";
import { ReleaseUploadError, uploadApkRelease } from "@/lib/releases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function asBoolean(value: FormDataEntryValue | null): boolean {
  if (typeof value !== "string") return false;
  return value === "true" || value === "1" || value === "on";
}

export async function POST(request: NextRequest) {
  const denied = await requireOperatorJson(request);
  if (denied) return denied;

  try {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid multipart body" },
        { status: 400 }
      );
    }

    const entry = form.get("apk") ?? form.get("file");
    if (!(entry instanceof File)) {
      return NextResponse.json(
        { success: false, error: "apk file is required" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await entry.arrayBuffer());
    const record = await uploadApkRelease({
      buffer,
      fileName: entry.name || "upload.apk",
      isMandatory: asBoolean(form.get("isMandatory")),
    });

    return NextResponse.json({ success: true, version: record });
  } catch (error) {
    if (error instanceof ApkParseError || error instanceof AppVersionValidationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    if (error instanceof ReleaseUploadError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 503 }
      );
    }
    console.error("[admin/releases/upload] failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload APK release" },
      { status: 500 }
    );
  }
}
