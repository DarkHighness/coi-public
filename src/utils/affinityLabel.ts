import type { TFunction } from "i18next";

const AFFINITY_KEY_BY_TOKEN: Record<string, string> = {
  hostile: "hostile",
  antagonistic: "hostile",
  enemy: "hostile",
  neutral: "neutral",
  indifferent: "neutral",
  friendly: "friendly",
  amicable: "friendly",
  warm: "friendly",
  wary: "wary",
  suspicious: "wary",
  distrustful: "wary",
  "guarded trust": "guardedTrust",
  guarded_trust: "guardedTrust",
  devoted: "devoted",
  loyal: "devoted",
  affectionate: "devoted",
};

const normalizeAffinityToken = (value: string): string =>
  value.trim().toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ");

/**
 * Localize canonical English affinity tags while preserving arbitrary prose.
 * If value is not a known tag token, return it unchanged.
 */
export const localizeAffinityLabel = (
  affinity: string,
  t: TFunction,
): string => {
  const normalized = normalizeAffinityToken(affinity);
  const key = AFFINITY_KEY_BY_TOKEN[normalized];
  if (!key) {
    return affinity;
  }
  return t(`affinityLevels.${key}`, {
    defaultValue: affinity,
  });
};
