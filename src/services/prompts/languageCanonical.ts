export type LanguageFamily = "zh" | "en" | "other";

export interface CanonicalLanguageResult {
  code: string;
  family: LanguageFamily;
}

const zhTraditionalHints = [
  "zh-tw",
  "zh-hant",
  "chinese (traditional)",
  "traditional chinese",
];

const zhSimplifiedHints = [
  "zh-cn",
  "zh-hans",
  "chinese (simplified)",
  "simplified chinese",
  "chinese",
  "zh",
];

const enHints = ["en", "en-us", "en-gb", "english"];

const looksLikeLanguageTag = (value: string): boolean =>
  /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(value);

const toBcp47Like = (value: string): string => {
  const parts = value
    .split("-")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return "en";

  return parts
    .map((part, index) => {
      if (index === 0) return part.toLowerCase();
      if (part.length === 2) return part.toUpperCase();
      if (part.length === 4) {
        return part[0].toUpperCase() + part.slice(1).toLowerCase();
      }
      return part.toLowerCase();
    })
    .join("-");
};

export function canonicalizeLanguage(input: string): CanonicalLanguageResult {
  const raw = (input ?? "").trim();
  const normalized = raw.toLowerCase();

  if (!raw) {
    return { code: "en", family: "en" };
  }

  if (zhTraditionalHints.some((hint) => normalized.includes(hint))) {
    return { code: "zh-TW", family: "zh" };
  }

  if (zhSimplifiedHints.some((hint) => normalized.includes(hint))) {
    return { code: "zh-CN", family: "zh" };
  }

  if (enHints.some((hint) => normalized.includes(hint))) {
    return { code: "en", family: "en" };
  }

  if (looksLikeLanguageTag(raw)) {
    return { code: toBcp47Like(raw), family: "other" };
  }

  return { code: "en", family: "en" };
}
