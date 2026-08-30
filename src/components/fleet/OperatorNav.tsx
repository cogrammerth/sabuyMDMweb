"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/context/LanguageContext";

export type OperatorNavCurrent =
  | "fleet"
  | "map"
  | "console"
  | "api"
  | "provisioning"
  | "settings";

const LINKS: Array<{
  href: string;
  current: OperatorNavCurrent;
  key:
    | "nav.fleet"
    | "nav.map"
    | "nav.zeroTouch"
    | "nav.appReleases"
    | "nav.settings"
    | "nav.console"
    | "nav.api";
}> = [
  { href: "/devices", current: "fleet", key: "nav.fleet" },
  { href: "/map", current: "map", key: "nav.map" },
  { href: "/provisioning", current: "provisioning", key: "nav.zeroTouch" },
  { href: "/settings", current: "settings", key: "nav.appReleases" },
  { href: "/settings", current: "settings", key: "nav.settings" },
  { href: "/admin", current: "console", key: "nav.console" },
  { href: "/", current: "api", key: "nav.api" },
];

export default function OperatorNav({
  current,
}: {
  current: OperatorNavCurrent;
}) {
  const { t } = useTranslation();
  const router = useRouter();

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* still leave the session UI */
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <nav className="admin-nav" data-testid="operator-nav">
      {LINKS.map((link) => (
        <Link
          key={link.key}
          href={link.href}
          aria-current={current === link.current ? "page" : undefined}
          data-i18n={link.key}
        >
          {t(link.key)}
        </Link>
      ))}
      <button
        type="button"
        className="nav-logout"
        data-testid="nav-logout"
        data-i18n="nav.logout"
        onClick={() => void logout()}
      >
        {t("nav.logout")}
      </button>
    </nav>
  );
}
