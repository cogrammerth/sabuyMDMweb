import AgentOfficeView from "@/components/agents/AgentOfficeView";
import DeviceTable, { type DeviceRow } from "@/components/fleet/DeviceTable";
import OperatorHeader from "@/components/fleet/OperatorHeader";
import PolicyToggles from "@/components/fleet/PolicyToggles";
import QrGenerator from "@/components/fleet/QrGenerator";
import TranslatedHint from "@/components/i18n/TranslatedHint";

export default function AdminDashboard({ devices }: { devices: DeviceRow[] }) {
  return (
    <div className="admin-shell">
      <OperatorHeader titleKey="pages.console" current="console" />
      <TranslatedHint k="hints.console" />
      <AgentOfficeView />
      <div className="admin-grid">
        <DeviceTable devices={devices} showConfigure />
        <div className="stack">
          <PolicyToggles />
          <QrGenerator />
        </div>
      </div>
    </div>
  );
}
