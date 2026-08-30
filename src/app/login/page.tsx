import { Suspense } from "react";
import OperatorHeader from "@/components/fleet/OperatorHeader";
import TranslatedHint from "@/components/i18n/TranslatedHint";
import LoginForm from "./LoginForm";
import LoginFallback from "./LoginFallback";

export default function LoginPage() {
  return (
    <div className="admin-shell" data-testid="login-page">
      <OperatorHeader titleKey="login.title" showNav={false} />
      <TranslatedHint k="login.hint" />
      <Suspense fallback={<LoginFallback />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
