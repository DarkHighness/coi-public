/**
 * ============================================================================
 * Core Atom: Hidden Layer Quality Requirements
 * ============================================================================
 *
 * Hidden 层的质量要求标准。
 * 用于 StoryOutline 确保生成的 hidden 内容有足够深度。
 */

import type { Atom } from "../types";

/**
 * Hidden 层质量要求 - 无参数
 */
export const hiddenLayerQuality: Atom<void> = () => `
<hidden_layer_quality_requirements>
  **CRITICAL: HIDDEN LAYER = The "Soul" of the entity.**

  Every hidden field must explain: **ORIGIN** (history), **MECHANISM** (how it works), **CONSEQUENCE** (why it matters).

  <field_requirements>
    <requirement field="hidden.truth (items)">
      MUST include: Origin (who/when/where created), Method (how made), History (events witnessed), Current State (why here).
    </requirement>
    <requirement field="hidden.realMotives (NPCs)">
      MUST include: Root Cause (trauma/event), Specific Goals (concrete objectives), Sacrifice (what they'd give up), Timeline (planning duration).
    </requirement>
    <requirement field="hidden.trueCause (conditions)">
      MUST include: Source/origin, mechanism, progression stages, cure requirements, responsible party, untreated consequences.
    </requirement>
    <requirement field="hidden.secrets (general)">
      MUST include: Specific information changing player understanding, actionable details, connections to other hidden elements.
    </requirement>
    <requirement field="hidden.hiddenEffects (skills)">
      MUST include: Hidden mechanics, drawbacks, awakening conditions, lore origin, evolution potential.
    </requirement>
  </field_requirements>

  <minimum_standards>
    - **NO "BRIEF" NOTES**: Every hidden field = rich paragraph (3+ sentences).
    - **HISTORY IS MANDATORY**: Nothing exists without a past.
    - **CAUSALITY IS KING**: Explain WHY things are the way they are.
    - **SPECIFICITY**: Use names, dates, numbers, specific locations.
    - **INTERCONNECTION**: Connect secrets to other entities.
    - **UNLOCKED IS SYSTEM-CONTROLLED**: Do NOT set 'unlocked' field. All entities start locked; unlocking happens through gameplay via unlock_entity tool.
  </minimum_standards>

  <quality_check>
    ❌ REJECT: "Magical properties unknown" / "Has secret plans" / "Mysterious illness"
    ✅ REQUIRE: Named origins, specific mechanics, causal chains, concrete details
  </quality_check>
</hidden_layer_quality_requirements>
`;

export default hiddenLayerQuality;
