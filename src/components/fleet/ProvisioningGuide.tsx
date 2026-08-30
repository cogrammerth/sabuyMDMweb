"use client";

import { useTranslation } from "@/context/LanguageContext";

const STEPS = [
  { title: "provisioning.step1Title", body: "provisioning.step1Body" },
  { title: "provisioning.step2Title", body: "provisioning.step2Body" },
  { title: "provisioning.step3Title", body: "provisioning.step3Body" },
] as const;

export default function ProvisioningGuide() {
  const { t } = useTranslation();

  return (
    <section className="panel" data-testid="provisioning-guide">
      <header className="panel-head">
        <h2 data-i18n="provisioning.howToEnroll">{t("provisioning.howToEnroll")}</h2>
      </header>
      <ol className="steps enroll-steps">
        {STEPS.map((step, index) => (
          <li key={step.title} data-testid={`enroll-step-${index + 1}`}>
            <strong data-i18n={step.title}>{t(step.title)}</strong>
            <span data-i18n={step.body}>{t(step.body)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
