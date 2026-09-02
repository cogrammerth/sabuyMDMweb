import type { MessageKey } from "@/lib/i18n";

export function authErrorKey(error: unknown): MessageKey {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";
  const message = error instanceof Error ? error.message : String(error ?? "");

  if (message === "SUPABASE_AUTH_NOT_CONFIGURED") return "auth.configMissing";
  if (code === "invalid_credentials" || /invalid login|invalid credentials/i.test(message)) {
    return "auth.invalidCredentials";
  }
  if (code === "email_not_confirmed" || /email not confirmed/i.test(message)) {
    return "auth.emailNotConfirmed";
  }
  if (
    code === "over_request_rate" ||
    code === "over_email_send_rate_limit" ||
    /rate limit|too many/i.test(message)
  ) {
    return "auth.tooManyRequests";
  }
  if (code === "weak_password" || /weak password|password should/i.test(message)) {
    return "auth.weakPassword";
  }
  if (/expired|invalid.*(link|otp|token)|same password/i.test(message)) {
    return "auth.invalidLink";
  }
  return "auth.failed";
}
