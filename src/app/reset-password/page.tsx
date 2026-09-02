import AuthPageShell from "@/components/auth/AuthPageShell";
import ResetPasswordForm from "./ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <AuthPageShell
      titleKey="auth.resetTitle"
      hintKey="auth.resetHint"
      testId="reset-password-page"
    >
      <ResetPasswordForm />
    </AuthPageShell>
  );
}
