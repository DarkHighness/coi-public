/**
 * ============================================================================
 * Core Atom: Creative vs Restricted Mode
 * ============================================================================
 *
 * 创意模式 vs 受限模式的切换。
 * 用于 StoryOutline 控制 AI 的创作自由度。
 */

import type { Atom } from "../types";

export type CreativeModeInput = {
  isRestricted: boolean;
  isRestrictedTheme?: boolean;
};

/**
 * 创意模式 vs 受限模式
 */
export const creativeModeVsRestricted: Atom<CreativeModeInput> = ({
  isRestricted,
  isRestrictedTheme,
}) => {
  // IP 受限主题 (Priority 1)
  if (isRestrictedTheme) {
    return `
<mode_strict>
  <warning>CRITICAL: STRICT MODE ENABLED - RESTRICTED THEME</warning>
  <guidelines>
    <rule>CRITICAL: This is a RESTRICTED THEME based on an existing IP. You must respect the original plot, history, and character personalities.</rule>
    <rule>AGENCY & CONVERGENCE: The player has freedom to influence the story within the gaps of the canon. However, major "Convergence Points" (e.g., key historical events, major character deaths, critical plot turns) MUST occur as established in the source material.</rule>
    <rule>FLEXIBILITY: Allow the player to change *how* events happen or *minor* outcomes, but ensure the *major* consequences align with the canon timeline.</rule>
    <rule>If the player attempts to prevent a Convergence Point, make it difficult or have the universe "correct" itself, unless their action is overwhelmingly significant and logical.</rule>
    <rule>Source Fidelity: Mechanics/Magic/Tech/Geography MUST match source. No new systems.</rule>
    <rule>Atmosphere: Emulate specific source atmosphere (e.g., cosmic horror, whimsical magic).</rule>
    <rule>Culture: Integrate specific slang/norms. NPCs react by faction/race prejudices.</rule>
  </guidelines>
</mode_strict>
`;
  }

  // 普通严格模式 (Priority 2)
  if (isRestricted) {
    return `
<mode_strict>
  <warning>STRICT MODE ENABLED</warning>
  <guidelines>
    <rule>Follow defined Narrative Style, Background Template, and Example.</rule>
    <rule>Do NOT deviate from setting/tone.</rule>
    <rule>Do NOT improvise outside bounds.</rule>
    <rule>No Tropes: Avoid generic "isekai"/"system" tropes unless in theme.</rule>
  </guidelines>
</mode_strict>
`;
  }

  // 创意模式（默认）
  return `
<mode_creative>
  <guidelines>
    <rule>Background Template and Examples are for INSPIRATION ONLY.</rule>
    <rule>Do NOT copy the plot or characters from the examples.</rule>
    <rule>Prioritize RANDOMNESS and UNIQUENESS in every session.</rule>
    <rule>Create original twists, characters, and scenarios that fit the theme.</rule>
  </guidelines>
</mode_creative>

<mode_switching_protocol>
  **IF mode changes mid-story (e.g., user changes settings):**

  <creative_to_strict>
    When switching from CREATIVE → STRICT:
    - Do NOT retcon established story elements
    - NEW content must follow strict rules, but EXISTING content is grandfathered
    - Gradually steer narrative toward stricter tone without jarring transitions
  </creative_to_strict>

  <strict_to_creative>
    When switching from STRICT → CREATIVE:
    - You may now introduce more original elements
    - Still respect the story's established continuity
    - Use new freedom for NEW developments, not to contradict past events
  </strict_to_creative>

  <general_rule>
    **CONTINUITY > MODE**: Never break story continuity just because mode changed.
    Mode affects FUTURE content, not past content.
  </general_rule>
</mode_switching_protocol>
`;
};

export default creativeModeVsRestricted;
