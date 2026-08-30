"use client";

import { useTranslation } from "@/context/LanguageContext";
import type { MessageKey } from "@/lib/i18n";

export default function TranslatedHint({
  k,
  children,
}: {
  k: MessageKey;
  children?: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <p className="hint" role="note" data-i18n={k}>
      {t(k)}
      {children}
    </p>
  );
}
