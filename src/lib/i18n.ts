import en from "@/locales/en.json";
import th from "@/locales/th.json";

export const LOCALES = ["th", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "th";
export const LOCALE_STORAGE_KEY = "sabuy-mdm-locale";

export const dictionaries = { en, th } as const;

type Join<Prefix extends string, Key extends string> = Prefix extends ""
  ? Key
  : `${Prefix}.${Key}`;

type MessageKeyOf<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? Join<Prefix, K>
    : MessageKeyOf<T[K], Join<Prefix, K>>;
}[keyof T & string];

export type MessageKey = MessageKeyOf<typeof en>;

export type TranslateFn = (
  key: MessageKey,
  vars?: Record<string, string | number>
) => string;

export function isLocale(value: unknown): value is Locale {
  return value === "th" || value === "en";
}

export function detectLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    /* private mode / blocked storage */
  }
  return DEFAULT_LOCALE;
}

export function lookupMessage(dict: unknown, key: string): string | undefined {
  const parts = key.split(".");
  let current: unknown = dict;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

export function formatTemplate(
  template: string,
  vars?: Record<string, string | number>
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name)
      ? String(vars[name])
      : `{${name}}`
  );
}

export function formatRelativeTime(iso: string | null, t: TranslateFn): string {
  if (!iso) return "—";
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return "—";
  const delta = Date.now() - ts;
  const sec = Math.round(Math.abs(delta) / 1000);
  const past = delta >= 0;
  if (sec < 45) return past ? t("time.justNow") : t("time.soon");
  const min = Math.round(sec / 60);
  if (min < 60) {
    return past
      ? t("time.minutesPast", { n: min })
      : t("time.minutesFuture", { n: min });
  }
  const hr = Math.round(min / 60);
  if (hr < 24) {
    return past
      ? t("time.hoursPast", { n: hr })
      : t("time.hoursFuture", { n: hr });
  }
  const day = Math.round(hr / 24);
  return past
    ? t("time.daysPast", { n: day })
    : t("time.daysFuture", { n: day });
}

export function flattenKeys(
  obj: unknown,
  prefix = ""
): string[] {
  if (typeof obj === "string") return prefix ? [prefix] : [];
  if (obj === null || typeof obj !== "object") return [];
  return Object.entries(obj as Record<string, unknown>).flatMap(([key, value]) =>
    flattenKeys(value, prefix ? `${prefix}.${key}` : key)
  );
}
