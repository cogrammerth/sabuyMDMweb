"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "@/context/LanguageContext";
import type { Locale } from "@/lib/i18n";

const OPTIONS: Array<{ locale: Locale; flag: string; labelKey: "lang.thai" | "lang.english" }> =
  [
    { locale: "th", flag: "🇹🇭", labelKey: "lang.thai" },
    { locale: "en", flag: "🇬🇧", labelKey: "lang.english" },
  ];

export default function LanguageSelector() {
  const { locale, setLocale, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = OPTIONS.find((option) => option.locale === locale) ?? OPTIONS[0];

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function choose(next: Locale) {
    setLocale(next);
    setOpen(false);
  }

  return (
    <div className="lang-dropdown" ref={rootRef} data-testid="language-selector">
      <button
        type="button"
        className="lang-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("lang.label")}
        data-testid="language-selector-button"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span data-i18n="lang.active">
          {active.flag} {t(active.labelKey)}
        </span>
        <span className="lang-caret" aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <ul
          className="lang-menu"
          role="listbox"
          aria-label={t("lang.label")}
          data-testid="language-menu"
        >
          {OPTIONS.map((option) => (
            <li key={option.locale}>
              <button
                type="button"
                role="option"
                className={
                  option.locale === locale ? "lang-option on" : "lang-option"
                }
                aria-selected={option.locale === locale}
                data-testid={`language-option-${option.locale}`}
                onClick={() => choose(option.locale)}
              >
                {option.flag} {t(option.labelKey)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
