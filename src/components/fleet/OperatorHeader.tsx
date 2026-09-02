"use client";

import LanguageSelector from "@/components/i18n/LanguageSelector";
import OperatorNav, {
  type OperatorNavCurrent,
} from "@/components/fleet/OperatorNav";
import OperatorSessionMenu from "@/components/auth/OperatorSessionMenu";
import { useTranslation } from "@/context/LanguageContext";
import type { MessageKey } from "@/lib/i18n";

export default function OperatorHeader({
  titleKey,
  current,
  showNav = true,
  showSession = true,
}: {
  titleKey: MessageKey;
  current?: OperatorNavCurrent;
  showNav?: boolean;
  showSession?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <header className="admin-top">
      <div className="admin-brand">
        <p className="office-kicker" data-i18n="brand.kicker">
          {t("brand.kicker")}
        </p>
        <h1 data-i18n={titleKey} data-testid="page-title">
          {t(titleKey)}
        </h1>
      </div>
      <div className="admin-top-tools">
        {showNav && current ? <OperatorNav current={current} /> : null}
        {showSession ? <OperatorSessionMenu /> : null}
        <LanguageSelector />
      </div>
    </header>
  );
}
