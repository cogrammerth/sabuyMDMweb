import Link from "next/link";

export default function OperatorNav({
  current,
}: {
  current: "fleet" | "map" | "console" | "api" | "provisioning" | "settings";
}) {
  return (
    <nav className="admin-nav">
      <Link href="/devices" aria-current={current === "fleet" ? "page" : undefined}>
        Fleet
      </Link>
      <Link href="/map" aria-current={current === "map" ? "page" : undefined}>
        Map
      </Link>
      <Link
        href="/provisioning"
        aria-current={current === "provisioning" ? "page" : undefined}
      >
        Provisioning
      </Link>
      <Link
        href="/settings"
        aria-current={current === "settings" ? "page" : undefined}
      >
        Settings
      </Link>
      <Link href="/admin" aria-current={current === "console" ? "page" : undefined}>
        Console
      </Link>
      <Link href="/" aria-current={current === "api" ? "page" : undefined}>
        API
      </Link>
    </nav>
  );
}
