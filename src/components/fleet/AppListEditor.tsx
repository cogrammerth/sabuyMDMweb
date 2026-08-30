"use client";

import { useState } from "react";
import { useTranslation } from "@/context/LanguageContext";

export default function AppListEditor({
  label,
  testId,
  packages,
  onChange,
  placeholder,
}: {
  label: string;
  testId: string;
  packages: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");

  function add() {
    const pkg = draft.trim();
    if (!pkg || packages.includes(pkg)) {
      setDraft("");
      return;
    }
    onChange([...packages, pkg]);
    setDraft("");
  }

  return (
    <div className="app-list" data-testid={testId}>
      <strong>{label}</strong>
      <ul>
        {packages.length === 0 ? (
          <li className="hint">{t("policy.none")}</li>
        ) : (
          packages.map((pkg) => (
            <li key={pkg}>
              <code>{pkg}</code>
              <button
                type="button"
                className="chip-remove"
                aria-label={`Remove ${pkg}`}
                onClick={() => onChange(packages.filter((item) => item !== pkg))}
              >
                ×
              </button>
            </li>
          ))
        )}
      </ul>
      <div className="app-add">
        <input
          data-testid={`${testId}-input`}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
        />
        <button
          type="button"
          className="primary"
          data-testid={`${testId}-add`}
          onClick={add}
        >
          {t("actions.add")}
        </button>
      </div>
    </div>
  );
}
