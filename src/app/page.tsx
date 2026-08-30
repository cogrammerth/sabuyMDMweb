"use client";

import Link from "next/link";
import LanguageSelector from "@/components/i18n/LanguageSelector";
import { useTranslation } from "@/context/LanguageContext";

export default function Home() {
  const { t } = useTranslation();

  return (
    <main className="home-shell">
      <div className="home-lang">
        <LanguageSelector />
      </div>
      <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 600 }} data-i18n="brand.title">
        {t("brand.title")}
      </h1>
      <p style={{ margin: 0, opacity: 0.7 }} data-i18n="brand.homeTagline">
        {t("brand.homeTagline")}
      </p>
      <p style={{ margin: "0.5rem 0 0", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <Link href="/devices" style={{ color: "#6ee7a0" }} data-i18n="home.fleetDashboard">
          {t("home.fleetDashboard")}
        </Link>
        <Link href="/map" style={{ color: "#7ee0a8" }} data-i18n="home.fleetMap">
          {t("home.fleetMap")}
        </Link>
        <Link href="/provisioning" style={{ color: "#6ec8e7" }} data-i18n="home.zeroTouch">
          {t("home.zeroTouch")}
        </Link>
        <Link href="/admin" style={{ color: "#ffd36a" }} data-i18n="home.agentOffice">
          {t("home.agentOffice")}
        </Link>
      </p>
      <ul style={{ marginTop: "1.5rem", lineHeight: 1.8, opacity: 0.85 }}>
        <li>
          <code>POST /api/heartbeat</code>
        </li>
        <li>
          <code>GET /api/policy?deviceId=…</code>
        </li>
        <li>
          <code>PUT /api/admin/devices/:id/policy</code>
        </li>
        <li>
          <code>POST /api/admin/provisioning/qr</code>
        </li>
        <li>
          <code>GET /api/admin/locations/latest</code>
        </li>
        <li>
          <code>GET /api/health</code>
        </li>
        <li>
          <code>GET /api/version.json</code>
        </li>
        <li>
          <code>POST /api/agents/dispatch</code>
        </li>
      </ul>
    </main>
  );
}
