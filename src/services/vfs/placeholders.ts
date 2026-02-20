export const PLACEHOLDER_DOMAINS = [
  "characters",
  "locations",
  "quests",
  "knowledge",
  "factions",
  "timeline",
  "causal_chains",
  "items",
  "skills",
  "conditions",
  "traits",
  "misc",
] as const;

export type PlaceholderDomain = (typeof PLACEHOLDER_DOMAINS)[number];

export const PLACEHOLDER_DOMAIN_SET = new Set<string>(PLACEHOLDER_DOMAINS);

const PLACEHOLDER_DOMAIN_PATTERN = PLACEHOLDER_DOMAINS.join("|");

export const PLACEHOLDER_PATH_REGEX = new RegExp(
  `^world/placeholders/(${PLACEHOLDER_DOMAIN_PATTERN})/([^/]+)\\.md$`,
);

export const PLACEHOLDER_PATH_PREFIX = "world/placeholders";

export const isPlaceholderDomain = (
  value: string,
): value is PlaceholderDomain => PLACEHOLDER_DOMAIN_SET.has(value);

export const buildPlaceholderDraftPath = (
  domain: PlaceholderDomain,
  id: string,
): string => `${PLACEHOLDER_PATH_PREFIX}/${domain}/${id}.md`;

export const inferPlaceholderDomainFromEntityId = (
  id: string,
): PlaceholderDomain => {
  if (id.startsWith("char:")) return "characters";
  if (id.startsWith("npc:")) return "characters";
  if (id.startsWith("loc:")) return "locations";
  if (id.startsWith("quest:")) return "quests";
  if (id.startsWith("know:")) return "knowledge";
  if (id.startsWith("fac:")) return "factions";
  if (id.startsWith("faction:")) return "factions";
  if (id.startsWith("evt:")) return "timeline";
  if (id.startsWith("chain:")) return "causal_chains";
  if (id.startsWith("item:")) return "items";
  if (id.startsWith("inv:")) return "items";
  if (id.startsWith("skill:")) return "skills";
  if (id.startsWith("cond:")) return "conditions";
  if (id.startsWith("trait:")) return "traits";
  return "misc";
};

const normalizePlaceholderId = (value: string): string =>
  value
    .trim()
    .replace(/^\/+/, "")
    .replace(/\.md$/i, "")
    .split("/")
    .filter(Boolean)
    .pop() || "";

export const normalizePlaceholderDraftPath = (
  rawPath: unknown,
  fallbackId: string,
): string => {
  const fallbackNormalized = normalizePlaceholderId(fallbackId) || "ph:unknown";
  const fallback = buildPlaceholderDraftPath("misc", fallbackNormalized);

  if (typeof rawPath !== "string") {
    return fallback;
  }

  const trimmed = rawPath.trim();
  if (!trimmed) {
    return fallback;
  }

  const canonical = trimmed.replace(/^\/+/, "");
  const fullMatch = PLACEHOLDER_PATH_REGEX.exec(canonical);
  if (fullMatch) {
    const domain = fullMatch[1];
    const id = fullMatch[2];
    if (isPlaceholderDomain(domain) && id) {
      return buildPlaceholderDraftPath(domain, id);
    }
  }

  const maybeDomainMatch = canonical.match(/^world\/placeholders\/([^/]+)\/.+/);
  const candidateDomain = maybeDomainMatch?.[1] ?? "";
  const normalizedId = normalizePlaceholderId(canonical);
  if (!normalizedId) {
    return fallback;
  }
  const domain = isPlaceholderDomain(candidateDomain)
    ? candidateDomain
    : inferPlaceholderDomainFromEntityId(normalizedId);
  return buildPlaceholderDraftPath(domain, normalizedId);
};
