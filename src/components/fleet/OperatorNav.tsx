"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/context/LanguageContext";
import { signOutOperator } from "@/lib/operator-session";

export type OperatorNavCurrent =
  | "dashboard"
  | "fleet"
  | "map"
  | "provisioning"
  | "settings"
  | "office"
  | "guide";

const LINKS: Array<{
  href: string;
  current: OperatorNavCurrent;
  key:
    | "nav.dashboard"
    | "nav.fleet"
    | "nav.map"
    | "nav.zeroTouch"
    | "nav.appReleases"
    | "nav.office"
    | "nav.guide";
  icon: "grid" | "devices" | "map" | "qr" | "release" | "office" | "guide";
}> = [
  { href: "/", current: "dashboard", key: "nav.dashboard", icon: "grid" },
  { href: "/devices", current: "fleet", key: "nav.fleet", icon: "devices" },
  { href: "/map", current: "map", key: "nav.map", icon: "map" },
  { href: "/provisioning", current: "provisioning", key: "nav.zeroTouch", icon: "qr" },
  { href: "/settings", current: "settings", key: "nav.appReleases", icon: "release" },
  { href: "/admin", current: "office", key: "nav.office", icon: "office" },
  { href: "/guide", current: "guide", key: "nav.guide", icon: "guide" },
];

function NavIcon({ name }: { name: (typeof LINKS)[number]["icon"] }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "grid":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "devices":
      return (
        <svg {...common}>
          <rect x="7" y="2" width="10" height="20" rx="2" />
          <path d="M11 18h2" />
        </svg>
      );
    case "map":
      return (
        <svg {...common}>
          <path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11z" />
          <circle cx="12" cy="10" r="2.2" />
        </svg>
      );
    case "qr":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <path d="M14 14h3v3h-3zM20 14v7M14 20h4" />
        </svg>
      );
    case "release":
      return (
        <svg {...common}>
          <path d="M12 3v12" />
          <path d="M8 11l4 4 4-4" />
          <path d="M5 19h14" />
        </svg>
      );
    case "guide":
      return (
        <svg {...common}>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          <path d="M8 7h8M8 11h6" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="8" cy="10" r="2.4" />
          <circle cx="16" cy="10" r="2.4" />
          <path d="M4 18c.8-2.2 2.6-3.4 4.8-3.4h0c1.4 0 2.5.5 3.2 1.3.7-.8 1.8-1.3 3.2-1.3h0c2.2 0 4 1.2 4.8 3.4" />
        </svg>
      );
  }
}

export default function OperatorNav({
  current,
}: {
  current: OperatorNavCurrent;
}) {
  const { t } = useTranslation();
  const router = useRouter();

  async function logout() {
    await signOutOperator();
    router.replace("/login");
    router.refresh();
  }

  return (
    <nav className="side-nav" data-testid="operator-nav">
      {LINKS.map((link) => (
        <Link
          key={link.key}
          href={link.href}
          className="side-link"
          aria-current={current === link.current ? "page" : undefined}
          data-i18n={link.key}
        >
          <NavIcon name={link.icon} />
          <span>{t(link.key)}</span>
        </Link>
      ))}
      <button
        type="button"
        className="side-link side-logout"
        data-testid="nav-logout"
        data-i18n="nav.logout"
        onClick={() => void logout()}
      >
        <span>{t("nav.logout")}</span>
      </button>
    </nav>
  );
}
