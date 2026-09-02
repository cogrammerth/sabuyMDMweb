import AuthPageShell from "@/components/auth/AuthPageShell";
import ForgotPasswordForm from "./ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <AuthPageShell
      titleKey="auth.forgotTitle"
      hintKey="auth.forgotHint"
      testId="forgot-password-page"
    >
      <ForgotPasswordForm />
    </AuthPageShell>
  );
}
