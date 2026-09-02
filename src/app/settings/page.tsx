import AppShell from "@/components/layout/AppShell";
import AppReleaseEditor from "@/components/fleet/AppReleaseEditor";
import TranslatedHint from "@/components/i18n/TranslatedHint";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <AppShell titleKey="pages.settings" current="settings">
      <TranslatedHint k="hints.settings" />
      <AppReleaseEditor />
    </AppShell>
  );
}
