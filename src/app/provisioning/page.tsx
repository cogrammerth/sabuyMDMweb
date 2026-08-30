import OperatorHeader from "@/components/fleet/OperatorHeader";
import ProvisioningGuide from "@/components/fleet/ProvisioningGuide";
import QrGenerator from "@/components/fleet/QrGenerator";
import TranslatedHint from "@/components/i18n/TranslatedHint";

export const dynamic = "force-dynamic";

export default function ProvisioningPage() {
  return (
    <div className="admin-shell">
      <OperatorHeader titleKey="pages.provisioning" current="provisioning" />
      <TranslatedHint k="hints.provisioning" />
      <div className="provisioning-layout">
        <QrGenerator />
        <ProvisioningGuide />
      </div>
    </div>
  );
}
