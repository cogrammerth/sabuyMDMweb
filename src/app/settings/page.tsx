import OperatorHeader from "@/components/fleet/OperatorHeader";
import AppReleaseEditor from "@/components/fleet/AppReleaseEditor";
import TranslatedHint from "@/components/i18n/TranslatedHint";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <div className="admin-shell">
      <OperatorHeader titleKey="pages.settings" current="settings" />
      <TranslatedHint k="hints.settings" />
      <AppReleaseEditor />
    </div>
  );
}
