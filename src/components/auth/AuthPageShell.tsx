"use client";

import OperatorHeader from "@/components/fleet/OperatorHeader";
import TranslatedHint from "@/components/i18n/TranslatedHint";
import type { MessageKey } from "@/lib/i18n";

export default function AuthPageShell({
  titleKey,
  hintKey,
  testId,
  children,
}: {
  titleKey: MessageKey;
  hintKey?: MessageKey;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <div className="admin-shell auth-shell" data-testid={testId}>
      <OperatorHeader titleKey={titleKey} showNav={false} showSession={false} />
      <div className="auth-stage">
        {hintKey ? <TranslatedHint k={hintKey} /> : null}
        {children}
      </div>
    </div>
  );
}
