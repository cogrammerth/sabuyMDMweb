"use client";

import Link from "next/link";
import { useTranslation } from "@/context/LanguageContext";
import type { MessageKey } from "@/lib/i18n";

type GuideBullet = {
  text: MessageKey;
  code?: MessageKey;
};

type GuideStep = {
  id: string;
  badge: MessageKey;
  title: MessageKey;
  summary: MessageKey;
  bullets: GuideBullet[];
  callout?: { tone: "tip" | "warn" | "info"; text: MessageKey };
  link?: { href: string; label: MessageKey };
};

const STEPS: GuideStep[] = [
  {
    id: "prepare",
    badge: "guide.step1Badge",
    title: "guide.step1Title",
    summary: "guide.step1Summary",
    bullets: [
      { text: "guide.step1Bullet1" },
      { text: "guide.step1Bullet2" },
    ],
    callout: { tone: "tip", text: "guide.step1Tip" },
  },
  {
    id: "qr-setup",
    badge: "guide.step2Badge",
    title: "guide.step2Title",
    summary: "guide.step2Summary",
    bullets: [
      { text: "guide.step2Bullet1", code: "guide.step2Code" },
      { text: "guide.step2Bullet2" },
    ],
    callout: { tone: "info", text: "guide.step2Tip" },
  },
  {
    id: "provision",
    badge: "guide.step3Badge",
    title: "guide.step3Title",
    summary: "guide.step3Summary",
    bullets: [
      { text: "guide.step3Bullet1" },
      { text: "guide.step3Bullet2" },
      { text: "guide.step3Bullet3" },
    ],
    link: { href: "/provisioning", label: "guide.step3Link" },
    callout: { tone: "tip", text: "guide.step3Tip" },
  },
  {
    id: "verify",
    badge: "guide.step4Badge",
    title: "guide.step4Title",
    summary: "guide.step4Summary",
    bullets: [
      { text: "guide.step4Bullet1" },
      { text: "guide.step4Bullet2" },
    ],
    link: { href: "/devices", label: "guide.step4Link" },
    callout: { tone: "info", text: "guide.step4Tip" },
  },
  {
    id: "troubleshoot",
    badge: "guide.step5Badge",
    title: "guide.step5Title",
    summary: "guide.step5Summary",
    bullets: [
      { text: "guide.step5Bullet1" },
      { text: "guide.step5Bullet2" },
    ],
    callout: { tone: "warn", text: "guide.step5Tip" },
  },
];

export default function UserGuide() {
  const { t } = useTranslation();

  return (
    <div className="user-guide" data-testid="user-guide">
      <section className="panel guide-hero">
        <div className="guide-hero-copy">
          <p className="guide-kicker" data-i18n="guide.kicker">
            {t("guide.kicker")}
          </p>
          <h2 data-i18n="guide.heroTitle">{t("guide.heroTitle")}</h2>
          <p className="hint" data-i18n="guide.heroBody">
            {t("guide.heroBody")}
          </p>
        </div>
        <ol className="guide-toc" aria-label={t("guide.tocLabel")}>
          {STEPS.map((step, index) => (
            <li key={step.id}>
              <a href={`#guide-${step.id}`} data-testid={`guide-toc-${index + 1}`}>
                <span className="guide-toc-num">{index + 1}</span>
                <span data-i18n={step.title}>{t(step.title)}</span>
              </a>
            </li>
          ))}
        </ol>
      </section>

      <ol className="guide-steps">
        {STEPS.map((step, index) => (
          <li
            key={step.id}
            id={`guide-${step.id}`}
            className="panel guide-step"
            data-testid={`guide-step-${index + 1}`}
          >
            <header className="guide-step-head">
              <span className="guide-step-badge" data-i18n={step.badge}>
                {t(step.badge)}
              </span>
              <h3 data-i18n={step.title}>{t(step.title)}</h3>
              <p className="hint" data-i18n={step.summary}>
                {t(step.summary)}
              </p>
            </header>

            <ul className="guide-bullets">
              {step.bullets.map((bullet) => (
                <li key={bullet.text}>
                  <span data-i18n={bullet.text}>{t(bullet.text)}</span>
                  {bullet.code ? (
                    <code className="guide-code" data-i18n={bullet.code}>
                      {t(bullet.code)}
                    </code>
                  ) : null}
                </li>
              ))}
            </ul>

            {step.link ? (
              <Link
                href={step.link.href}
                className="guide-step-link"
                data-i18n={step.link.label}
                data-testid={`guide-link-${step.id}`}
              >
                {t(step.link.label)}
              </Link>
            ) : null}

            {step.callout ? (
              <aside
                className={`guide-callout ${step.callout.tone}`}
                data-i18n={step.callout.text}
              >
                {t(step.callout.text)}
              </aside>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
