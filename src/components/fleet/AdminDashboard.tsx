import AgentOfficeView from "@/components/agents/AgentOfficeView";
import DeviceTable, { type DeviceRow } from "@/components/fleet/DeviceTable";
import AppShell from "@/components/layout/AppShell";
import PolicyToggles from "@/components/fleet/PolicyToggles";
import QrGenerator from "@/components/fleet/QrGenerator";
import TranslatedHint from "@/components/i18n/TranslatedHint";

export default function AdminDashboard({
  devices,
  latestVersionCode = 1,
}: {
  devices: DeviceRow[];
  latestVersionCode?: number;
}) {
  return (
    <AppShell titleKey="pages.office" current="office">
      <TranslatedHint k="hints.console" />
      <AgentOfficeView />
      <div className="admin-grid">
        <DeviceTable
          devices={devices}
          showConfigure
          latestVersionCode={latestVersionCode}
        />
        <div className="stack">
          <PolicyToggles />
          <QrGenerator />
        </div>
      </div>
    </AppShell>
  );
}
