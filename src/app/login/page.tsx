import { Suspense } from "react";
import AuthPageShell from "@/components/auth/AuthPageShell";
import LoginForm from "./LoginForm";
import LoginFallback from "./LoginFallback";

export default function LoginPage() {
  return (
    <AuthPageShell titleKey="login.title" hintKey="login.hint" testId="login-page">
      <Suspense fallback={<LoginFallback />}>
        <LoginForm />
      </Suspense>
    </AuthPageShell>
  );
}
