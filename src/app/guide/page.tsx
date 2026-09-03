import AppShell from "@/components/layout/AppShell";
import UserGuide from "@/components/fleet/UserGuide";
import TranslatedHint from "@/components/i18n/TranslatedHint";

export const dynamic = "force-dynamic";

export default function GuidePage() {
  return (
    <AppShell titleKey="pages.guide" current="guide">
      <TranslatedHint k="hints.guide" />
      <UserGuide />
    </AppShell>
  );
}
