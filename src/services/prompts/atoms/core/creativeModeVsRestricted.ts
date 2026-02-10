/**
 * ============================================================================
 * Core Atom: Creative vs Restricted Mode
 * ============================================================================
 *
 * Switching between Creative Mode and Restricted Mode.
 * Used for StoryOutline to control AI creative freedom.
 */

import type { Atom } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";


export type CreativeModeInput = {
  isRestricted: boolean;
  isRestrictedTheme?: boolean;
};

export const creativeModeVsRestrictedPrimer: Atom<CreativeModeInput> = defineAtom({ atomId: "atoms/core/creativeModeVsRestricted#creativeModeVsRestrictedPrimer", source: "atoms/core/creativeModeVsRestricted.ts", exportName: "creativeModeVsRestrictedPrimer" }, ({
  isRestricted,
  isRestrictedTheme,
}) => {
  if (isRestrictedTheme) {
    return `
<mode_primer>
  - Strict restricted-IP mode: preserve canon convergence points and source mechanics.
  - Allow agency in route and local outcomes, but keep major historical anchors consistent.
</mode_primer>
`;
  }

  if (isRestricted) {
    return `
<mode_primer>
  - Strict mode: stay within established setting/tone and avoid out-of-bound improvisation.
  - Keep continuity and avoid generic trope injection unless explicitly in-theme.
</mode_primer>
`;
  }

  return `
<mode_primer>
  - Creative mode: prioritize originality while preserving established continuity.
  - Mode changes affect future content only; do not retcon previously established facts.
</mode_primer>
`;
});

/**
 * Creative Mode vs Restricted Mode
 */
export const creativeModeVsRestricted: Atom<CreativeModeInput> = defineAtom({ atomId: "atoms/core/creativeModeVsRestricted#creativeModeVsRestricted", source: "atoms/core/creativeModeVsRestricted.ts", exportName: "creativeModeVsRestricted" }, ({
  isRestricted,
  isRestrictedTheme,
}) => {
  // IP Restricted Theme (Priority 1)
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

  // Normal Strict Mode (Priority 2)
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

  // Creative Mode (Default)
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
});

export default creativeModeVsRestricted;
