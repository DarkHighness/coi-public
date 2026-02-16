export type SoulScope = "global" | "current";

export const SOUL_TEMPLATE_VERSION = "v2";
export const CURRENT_SOUL_LOGICAL_PATH = "world/soul.md";
export const GLOBAL_SOUL_LOGICAL_PATH = "world/global/soul.md";
export const GLOBAL_SOUL_CANONICAL_PATH = "shared/config/runtime/soul.md";

const scopeLabel = (scope: SoulScope): string =>
  scope === "global" ? "Global" : "This Save";

const isoStamp = (updatedAt: number): string => new Date(updatedAt).toISOString();

const toEvidenceBlock = (): string => "- Initialized soul profile skeleton.";

const TOOL_USAGE_HINTS_HEADING = "## Tool Usage Hints";

const toolUsageHintsTemplateBlock = (): string[] => [
  TOOL_USAGE_HINTS_HEADING,
  "- AI self-repair notes only: this section is written by Story Teller AI for future Story Teller AI turns.",
  "- When a tool call fails and a later retry succeeds, append one concise bullet: `[error code] cause -> fix`.",
  "- Keep hints specific, short, and deduplicated.",
  "",
];

const ensureToolUsageHintsSection = (content: string): string => {
  if (content.includes(TOOL_USAGE_HINTS_HEADING)) {
    return content;
  }

  const lines = [
    content.trimEnd(),
    "",
    ...toolUsageHintsTemplateBlock(),
  ];
  return lines.join("\n").trimEnd() + "\n";
};

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
    "- Author: Story Teller AI (this AI instance writing to its future self)",
    "- Audience: Story Teller AI only (never player-facing raw content)",
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
    ...toolUsageHintsTemplateBlock(),
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
    return ensureToolUsageHintsSection(content);
  }
  return buildSoulMarkdown(scope, options);
};
