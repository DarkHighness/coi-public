export type SoulScope = "global" | "current";

export const SOUL_TEMPLATE_VERSION = "v3";
export const CURRENT_SOUL_LOGICAL_PATH = "world/soul.md";
export const GLOBAL_SOUL_LOGICAL_PATH = "world/global/soul.md";
export const GLOBAL_SOUL_CANONICAL_PATH = "shared/config/runtime/soul.md";

const scopeLabel = (scope: SoulScope): string =>
  scope === "global" ? "Global" : "This Save";

const isoStamp = (updatedAt: number): string =>
  new Date(updatedAt).toISOString();

const TOOL_USAGE_HINTS_HEADING = "## Tool Usage Hints";

const toolUsageHintsTemplateBlock = (): string[] => [
  TOOL_USAGE_HINTS_HEADING,
  "<!-- AI self-repair log. Written by Story Teller AI for future turns. -->",
  "<!-- Format: `- [ERROR_CODE] root cause -> successful fix` -->",
  "<!-- Rules: one bullet per distinct failure; deduplicate; keep ≤20 entries, prune oldest when full. -->",
  "",
];

const ensureToolUsageHintsSection = (content: string): string => {
  if (content.includes(TOOL_USAGE_HINTS_HEADING)) {
    return content;
  }

  const lines = [content.trimEnd(), "", ...toolUsageHintsTemplateBlock()];
  return lines.join("\n").trimEnd() + "\n";
};

// ── Section builders ────────────────────────────────────────────────

const headerBlock = (scope: SoulScope, updatedAt: number): string[] => [
  `# Player Soul (${scopeLabel(scope)})`,
  "",
  `- Scope: ${scopeLabel(scope)}`,
  "- Author: Story Teller AI (writing to its own future turns)",
  "- Audience: Story Teller AI only — never surface raw content to the player",
  `- Version: ${SOUL_TEMPLATE_VERSION}`,
  `- Last Updated: ${isoStamp(updatedAt)}`,
  "",
];

/**
 * Global soul: meta-player traits that persist across all saves.
 * Current soul: story-specific observations about *this* playthrough.
 */
const coreTendenciesBlock = (scope: SoulScope): string[] => {
  if (scope === "global") {
    return [
      "## Core Tendencies",
      "<!-- Cross-save personality: traits stable across stories. -->",
      "<!-- Update only when multi-turn evidence supports a pattern. -->",
      "",
      "### Moral Compass",
      "<!-- mercy vs justice · pragmatism vs idealism · deontological vs consequentialist -->",
      "",
      "### Risk Appetite",
      "<!-- cautious / calculated / impulsive · how it shifts after setbacks or wins -->",
      "",
      "### Decision Style",
      "<!-- deliberate planner / intuitive leaper / information-gatherer · speed vs depth -->",
      "",
      "### Emotional Engagement",
      "<!-- deep roleplay vs mechanical optimization · dialogue savoring vs skipping -->",
      "",
    ];
  }
  return [
    "## Core Tendencies",
    "<!-- Story-specific patterns: how the player is approaching *this* journey. -->",
    "<!-- May diverge from global traits — record what you see, not what you expect. -->",
    "",
    "### Protagonist Relationship",
    "<!-- How does the player relate to their character? Self-insert / actor / strategist? -->",
    "",
    "### Story Goals",
    "<!-- What does the player seem to want from this run? Exploration / power / narrative / lore? -->",
    "",
    "### Emerging Patterns",
    "<!-- Moral choices, alliance preferences, recurring strategies specific to this world. -->",
    "",
  ];
};

const stylePreferencesBlock = (scope: SoulScope): string[] => {
  if (scope === "global") {
    return [
      "## Style Preferences",
      "<!-- Narrative voice the player responds to best across saves. -->",
      "",
      "### Pacing",
      "<!-- slow-burn / brisk / variable · preferred scene-to-action ratio -->",
      "",
      "### Prose Register",
      "<!-- poetic / cinematic / terse / tactical · preferred descriptive density -->",
      "",
      "### Tone",
      "<!-- dark / whimsical / grounded / epic · humor tolerance and type -->",
      "",
    ];
  }
  return [
    "## Style Preferences",
    "<!-- Voice tuning for *this* story — override global when they conflict. -->",
    "",
    "### Pacing & Density",
    "<!-- Current preferred tempo. Note if it has changed over the run. -->",
    "",
    "### Tone & Register",
    "<!-- Tone that fits *this* world and protagonist. -->",
    "",
  ];
};

const interactionPatternsBlock = (scope: SoulScope): string[] => {
  if (scope === "global") {
    return [
      "## Interaction Patterns",
      "<!-- How the player engages with the game world across saves. -->",
      "",
      "### Social Orientation",
      "<!-- ally-seeking / lone wolf / manipulative · trust calibration speed -->",
      "",
      "### Exploration vs Progress",
      "<!-- completionist / mainline rusher / lore seeker · curiosity depth -->",
      "",
      "### Conflict Resolution",
      "<!-- violence / negotiation / avoidance / deception · fallback when primary fails -->",
      "",
    ];
  }
  return [
    "## Interaction Patterns",
    "<!-- How the player interacts with *this* story's world and NPCs. -->",
    "",
    "### NPC Relationships",
    "<!-- Who do they trust, use, protect, ignore? Transactional or caring? -->",
    "",
    "### World Engagement",
    "<!-- Exploration depth · lore interest · environmental interaction habits -->",
    "",
  ];
};

const evidenceLogBlock = (): string[] => [
  "## Evidence Log",
  "<!-- Concrete observations backing the claims above. -->",
  "<!-- Format: `- turn {forkId}/{turnNumber}: {observation}` -->",
  "<!-- Keep recent 15-20 entries. When pruning, distill old entries into Core Tendencies / Style / Interaction. -->",
  "- Initialized soul profile — no player data yet.",
  "",
];

const guidanceBlock = (scope: SoulScope): string[] => {
  const common = [
    "## Guidance For AI",
    "<!-- Actionable directives for your future self. Keep rules concrete and testable. -->",
    "",
    "### Writing Rules",
    "<!-- Do / Don't rules derived from evidence. E.g. 'Avoid purple prose — player skips it.' -->",
    "",
    "### Active Hypotheses",
    "<!-- Predictions to test. Format: `- HYPOTHESIS: {claim} — EVIDENCE: {what would confirm/refute}` -->",
    "<!-- Confirm or falsify within 3-5 turns; graduate confirmed hypotheses to Core Tendencies. -->",
    "",
    "### Anti-Patterns",
    "<!-- Assumptions that turned out wrong. Record to avoid repeating. -->",
    "",
  ];

  if (scope === "global") {
    return [
      ...common,
      "### Cross-Save Reminders",
      "<!-- Lessons that apply regardless of story setting. -->",
      "",
    ];
  }
  return [
    ...common,
    "### Story-Specific Notes",
    "<!-- Reminders tied to *this* world, protagonist, or plot. -->",
    "",
  ];
};

const evolutionRulesBlock = (): string[] => [
  "## Evolution Protocol",
  "<!-- HOW and WHEN to update this file. Read before every write. -->",
  "",
  "1. **Never delete contradictions** — real people are contradictory; record both sides.",
  "2. **Evidence before assertion** — add to Evidence Log first, then update trait sections.",
  "3. **Hypothesize, don't declare** — new patterns go to Active Hypotheses until confirmed across 3+ turns.",
  "4. **Prune, don't hoard** — when Evidence Log exceeds ~20 entries, distill old ones into trait sections and remove.",
  "5. **One update per trigger** — avoid rewriting the whole file. Surgical edits preserve history.",
  "6. **Scope discipline** — global file: cross-save truths only. Current file: this-story truths only.",
  "7. **Falsify actively** — each turn, check one hypothesis. If refuted, move to Anti-Patterns with evidence.",
  "",
];

// ── Main builder ────────────────────────────────────────────────────

export const buildSoulMarkdown = (
  scope: SoulScope,
  options?: {
    updatedAt?: number;
  },
): string => {
  const updatedAt = options?.updatedAt ?? Date.now();

  return [
    ...headerBlock(scope, updatedAt),
    ...coreTendenciesBlock(scope),
    ...stylePreferencesBlock(scope),
    ...interactionPatternsBlock(scope),
    ...toolUsageHintsTemplateBlock(),
    ...evidenceLogBlock(),
    ...guidanceBlock(scope),
    ...evolutionRulesBlock(),
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
