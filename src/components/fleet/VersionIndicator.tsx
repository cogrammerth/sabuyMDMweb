"use client";

import { useTranslation } from "@/context/LanguageContext";

export type VersionStatus = "current" | "outdated" | "unknown";

export function versionStatus(
  currentCode: number | null | undefined,
  latestCode: number
): VersionStatus {
  if (currentCode === null || currentCode === undefined) return "unknown";
  return currentCode >= latestCode ? "current" : "outdated";
}

export default function VersionIndicator({
  currentCode,
  latestCode,
  testId,
}: {
  currentCode: number | null | undefined;
  latestCode: number;
  testId?: string;
}) {
  const { t } = useTranslation();
  const status = versionStatus(currentCode, latestCode);
  const label =
    status === "unknown"
      ? t("fleet.versionUnknown")
      : t("fleet.versionLabel", { code: currentCode ?? 0 });
  const tone =
    status === "current" ? "on" : status === "outdated" ? "wait" : "off";
  const caption =
    status === "current"
      ? t("fleet.versionCurrent")
      : status === "outdated"
        ? t("fleet.versionOutdated")
        : t("fleet.versionUnknown");

  return (
    <span
      className={`status-badge ${tone} version-badge`}
      data-version={status}
      data-testid={testId}
      title={caption}
    >
      {status === "current" ? "🟢" : status === "outdated" ? "🟡" : "⚪"} {label}
    </span>
  );
}
