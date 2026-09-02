"use client";

import { useEffect } from "react";
import { useTranslation } from "@/context/LanguageContext";

export default function Modal({
  title,
  children,
  onClose,
  testId,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  testId?: string;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-testid={testId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-head">
          <h3>{title}</h3>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label={t("actions.close")}
          >
            ×
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
