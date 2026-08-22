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
        Phase 1 — Backend API &amp; Database Engine
      </p>
      <ul style={{ marginTop: "1.5rem", lineHeight: 1.8, opacity: 0.85 }}>
        <li>
          <code>POST /api/heartbeat</code>
        </li>
        <li>
          <code>GET /api/policy?deviceId=…</code>
        </li>
        <li>
          <code>GET /api/version.json</code>
        </li>
      </ul>
    </main>
  );
}
