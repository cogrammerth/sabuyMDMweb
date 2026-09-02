"use client";

import Link from "next/link";
import StatusBadge from "@/components/ui/StatusBadge";
import { useTranslation } from "@/context/LanguageContext";
import { formatRelativeTime } from "@/lib/i18n";
import type { FleetDevice, FleetSummary } from "@/types/mdm";

export default function ExecutiveDashboard({
  devices,
  summary,
  pending,
  health,
}: {
  devices: FleetDevice[];
  summary: FleetSummary;
  pending: number;
  health: "healthy" | "unhealthy";
}) {
  const { t } = useTranslation();
  const recent = devices.slice(0, 8);

  const metrics = [
    {
      id: "total",
      labelKey: "metrics.totalDevices" as const,
      value: summary.total,
      tone: "neutral",
    },
    {
      id: "online",
      labelKey: "metrics.online" as const,
      value: summary.online,
      tone: "ok",
    },
    {
      id: "offline",
      labelKey: "metrics.offline" as const,
      value: summary.offline,
      tone: "warn",
    },
    {
      id: "pending",
      labelKey: "metrics.pending" as const,
      value: pending,
      tone: "sync",
    },
    {
      id: "health",
      labelKey: "metrics.systemHealth" as const,
      value: health === "healthy" ? t("metrics.healthy") : t("metrics.unhealthy"),
      tone: health === "healthy" ? "ok" : "warn",
    },
  ];

  return (
    <div className="exec-dash" data-testid="exec-dashboard">
      <p className="hint" data-i18n="brand.homeTagline">
        {t("brand.homeTagline")}
      </p>
      <section className="fleet-cards exec-metrics" data-testid="fleet-summary">
        {metrics.map((card) => (
          <article
            key={card.id}
            className={`summary-card tone-${card.tone}`}
            data-testid={`summary-${card.id}`}
          >
            <p data-i18n={card.labelKey}>{t(card.labelKey)}</p>
            <strong>{card.value}</strong>
          </article>
        ))}
      </section>

      <section className="quick-actions" data-testid="quick-actions">
        <h2 data-i18n="dash.quickActions">{t("dash.quickActions")}</h2>
        <div className="quick-grid">
          <Link href="/provisioning" className="quick-card">
            <strong data-i18n="dash.enroll">{t("dash.enroll")}</strong>
            <span data-i18n="dash.enrollHint">{t("dash.enrollHint")}</span>
          </Link>
          <Link href="/map" className="quick-card">
            <strong data-i18n="dash.inspectMap">{t("dash.inspectMap")}</strong>
            <span data-i18n="dash.inspectMapHint">{t("dash.inspectMapHint")}</span>
          </Link>
          <Link href="/settings" className="quick-card">
            <strong data-i18n="dash.publishApk">{t("dash.publishApk")}</strong>
            <span data-i18n="dash.publishApkHint">{t("dash.publishApkHint")}</span>
          </Link>
        </div>
      </section>

      <section className="panel" data-testid="recent-activity">
        <header className="panel-head">
          <h2 data-i18n="dash.recentActivity">{t("dash.recentActivity")}</h2>
        </header>
        {recent.length === 0 ? (
          <p className="empty" data-i18n="dash.recentEmpty">
            {t("dash.recentEmpty")}
          </p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th data-i18n="metrics.healthStatus">{t("metrics.healthStatus")}</th>
                  <th data-i18n="fleet.colName">{t("fleet.colName")}</th>
                  <th data-i18n="fleet.colDeviceId">{t("fleet.colDeviceId")}</th>
                  <th data-i18n="fleet.colHeartbeat">{t("fleet.colHeartbeat")}</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((device) => (
                  <tr key={device.deviceId}>
                    <td>
                      <StatusBadge
                        online={device.isOnline}
                        lastHeartbeat={device.lastHeartbeat}
                      />
                    </td>
                    <td>
                      {device.deviceName?.trim() ? device.deviceName : "—"}
                    </td>
                    <td>
                      <code>{device.deviceId}</code>
                    </td>
                    <td>
                      {formatRelativeTime(device.lastHeartbeat, t)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
