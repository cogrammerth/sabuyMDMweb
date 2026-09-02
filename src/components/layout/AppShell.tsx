"use client";

import Link from "next/link";
import LanguageSelector from "@/components/i18n/LanguageSelector";
import OperatorNav, {
  type OperatorNavCurrent,
} from "@/components/fleet/OperatorNav";
import { useTranslation } from "@/context/LanguageContext";
import type { MessageKey } from "@/lib/i18n";

export default function AppShell({
  titleKey,
  current,
  children,
  contentClassName,
}: {
  titleKey: MessageKey;
  current: OperatorNavCurrent;
  children: React.ReactNode;
  contentClassName?: string;
}) {
  const { t } = useTranslation();

  return (
    <div className="app-frame">
      <aside className="app-sidebar">
        <Link href="/" className="side-brand">
          <span className="side-mark">S</span>
          <span>
            <strong data-i18n="brand.title">{t("brand.title")}</strong>
            <em data-i18n="brand.kicker">{t("brand.kicker")}</em>
          </span>
        </Link>
        <OperatorNav current={current} />
      </aside>
      <div className="app-main">
        <header className="app-topbar">
          <div className="admin-brand">
            <p className="office-kicker" data-i18n="brand.kicker">
              {t("brand.kicker")}
            </p>
            <h1 data-i18n={titleKey} data-testid="page-title">
              {t(titleKey)}
            </h1>
          </div>
          <LanguageSelector />
        </header>
        <div className={contentClassName ? `app-content ${contentClassName}` : "app-content"}>
          {children}
        </div>
      </div>
    </div>
  );
}
