"use client";

import { useTranslation } from "@/context/LanguageContext";

export default function LoginFallback() {
  const { t } = useTranslation();
  return (
    <p className="hint" data-i18n="login.loading">
      {t("login.loading")}
    </p>
  );
}
