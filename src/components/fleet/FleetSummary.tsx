import type { FleetSummary } from "@/types/mdm";

export default function FleetSummary({ summary }: { summary: FleetSummary }) {
  const cards = [
    { id: "total", label: "Total devices", value: summary.total },
    { id: "online", label: "Online", value: summary.online },
    { id: "offline", label: "Offline", value: summary.offline },
    { id: "low-battery", label: "Low battery (<20%)", value: summary.lowBattery },
  ] as const;

  return (
    <section className="fleet-cards" data-testid="fleet-summary">
      {cards.map((card) => (
        <article
          key={card.id}
          className="summary-card"
          data-testid={`summary-${card.id}`}
        >
          <p>{card.label}</p>
          <strong>{card.value}</strong>
        </article>
      ))}
    </section>
  );
}
