import Link from "next/link";

export default function Home() {
  return (
    <main
      style={{
        display: "flex",
        minHeight: "100vh",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.75rem",
        padding: "2rem",
      }}
    >
      <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 600 }}>
        Sabuy MDM Web Hub
      </h1>
      <p style={{ margin: 0, opacity: 0.7 }}>
        Phase 4 — fleet map, location history, health checks
      </p>
      <p style={{ margin: "0.5rem 0 0", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <Link href="/devices" style={{ color: "#6ee7a0" }}>
          Fleet dashboard
        </Link>
        <Link href="/map" style={{ color: "#7ee0a8" }}>
          Fleet map
        </Link>
        <Link href="/provisioning" style={{ color: "#6ec8e7" }}>
          Zero-Touch QR
        </Link>
        <Link href="/admin" style={{ color: "#ffd36a" }}>
          Agent office
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
