"use client";

import { useTranslation } from "@/context/LanguageContext";

export default function MissingDeviceId() {
  const { t } = useTranslation();
  return (
    <p className="warn" data-i18n="device.missingId">
      {t("device.missingId")}
    </p>
  );
}
