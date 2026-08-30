"use client";

import Link from "next/link";
import { useTranslation } from "@/context/LanguageContext";

export default function BackToFleet() {
  const { t } = useTranslation();
  return (
    <p className="hint">
      <Link href="/devices" data-i18n="nav.backToFleet">
        {t("nav.backToFleet")}
      </Link>
    </p>
  );
}
