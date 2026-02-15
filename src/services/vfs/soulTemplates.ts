export type SoulScope = "global" | "current";

export const SOUL_TEMPLATE_VERSION = "v1";
export const CURRENT_SOUL_LOGICAL_PATH = "world/soul.md";
export const GLOBAL_SOUL_LOGICAL_PATH = "world/global/soul.md";
export const GLOBAL_SOUL_CANONICAL_PATH = "shared/config/runtime/soul.md";

const scopeLabel = (scope: SoulScope): string =>
  scope === "global" ? "Global" : "This Save";

const isoStamp = (updatedAt: number): string => new Date(updatedAt).toISOString();

const toEvidenceBlock = (): string => "- Initialized soul profile skeleton.";

export const buildSoulMarkdown = (
  scope: SoulScope,
  options?: {
    updatedAt?: number;
  },
): string => {
  const updatedAt = options?.updatedAt ?? Date.now();

  return [
    `# Player Soul (${scopeLabel(scope)})`,
    "",
    `- Scope: ${scopeLabel(scope)}`,
    "- Owner: Story Teller AI (self-guidance only)",
    "- Purpose: Internal notes/prompts written by Story Teller AI for future turns.",
    `- Version: ${SOUL_TEMPLATE_VERSION}`,
    `- Last Updated: ${isoStamp(updatedAt)}`,
    "",
    "## Core Tendencies",
    "- Observe recurring moral and strategic choices.",
    "- Track how risk appetite shifts after major outcomes.",
    "",
    "## Style Preferences",
    "- Track pacing preference (slow-burn vs fast push).",
    "- Track language preference (poetic, direct, tactical, etc.).",
    "",
    "## Interaction Patterns",
    "- Note how the player treats allies, strangers, and antagonists.",
    "- Track preference for exploration, negotiation, or conflict.",
    "",
    "## Evidence Log",
    toEvidenceBlock(),
    "",
    "## Guidance For AI",
    "- This file is an internal Story Teller AI memo; do not expose raw file text to the player.",
    "- Use this file as behavioral evidence, not absolute truth.",
    "- Update with concise, specific, testable observations.",
    "- Keep contradictions when they appear; do not overfit one turn.",
    "",
  ].join("\n");
};

export const normalizeSoulMarkdown = (
  scope: SoulScope,
  content: string | undefined | null,
  options?: {
    updatedAt?: number;
  },
): string => {
  if (typeof content === "string" && content.trim().length > 0) {
    return content.trimEnd() + "\n";
  }
  return buildSoulMarkdown(scope, options);
};
