"use client";

import type { FleetSummary } from "@/types/mdm";
import { useTranslation } from "@/context/LanguageContext";

export default function FleetSummary({ summary }: { summary: FleetSummary }) {
  const { t } = useTranslation();
  const cards = [
    { id: "total", labelKey: "metrics.totalDevices" as const, value: summary.total },
    { id: "online", labelKey: "metrics.online" as const, value: summary.online },
    { id: "offline", labelKey: "metrics.offline" as const, value: summary.offline },
    {
      id: "low-battery",
      labelKey: "metrics.lowBattery" as const,
      value: summary.lowBattery,
    },
  ];

  return (
    <section className="fleet-cards" data-testid="fleet-summary">
      {cards.map((card) => (
        <article
          key={card.id}
          className="summary-card"
          data-testid={`summary-${card.id}`}
        >
          <p data-i18n={card.labelKey}>{t(card.labelKey)}</p>
          <strong>{card.value}</strong>
        </article>
      ))}
    </section>
  );
}
