import AppShell from "@/components/layout/AppShell";
import ProvisioningGuide from "@/components/fleet/ProvisioningGuide";
import QrGenerator from "@/components/fleet/QrGenerator";
import TranslatedHint from "@/components/i18n/TranslatedHint";

export const dynamic = "force-dynamic";

export default function ProvisioningPage() {
  return (
    <AppShell titleKey="pages.provisioning" current="provisioning">
      <TranslatedHint k="hints.provisioning" />
      <div className="provisioning-layout">
        <QrGenerator />
        <ProvisioningGuide />
      </div>
    </AppShell>
  );
}
