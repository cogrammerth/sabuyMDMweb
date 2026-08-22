import OperatorNav from "@/components/fleet/OperatorNav";
import QrGenerator from "@/components/fleet/QrGenerator";

export const dynamic = "force-dynamic";

export default function ProvisioningPage() {
  return (
    <div className="admin-shell">
      <header className="admin-top">
        <div>
          <p className="office-kicker">SABUY CALL · DEVICE OWNER</p>
          <h1>Zero-Touch provisioning</h1>
        </div>
        <OperatorNav current="provisioning" />
      </header>
      <p className="hint" role="note">
        Scan the QR on a factory-reset device. Set{" "}
        <code>DPC_COMPONENT_NAME</code>, <code>DPC_APK_URL</code>, and host the
        APK so the checksum is computed from real bytes. Local/CI may use{" "}
        <code>fixtures/provisioning-apk-stub.bin</code>.
      </p>
      <div className="provisioning-layout">
        <QrGenerator />
        <section className="panel">
          <header className="panel-head">
            <h2>How to enroll</h2>
          </header>
          <ol className="steps">
            <li>Factory-reset the Android device.</li>
            <li>On the welcome screen, tap the same spot six times to open QR setup.</li>
            <li>Scan this QR (or print it for field techs).</li>
            <li>
              Device downloads the DPC APK, verifies the checksum, and becomes
              Device Owner.
            </li>
          </ol>
        </section>
      </div>
    </div>
  );
}
