/**
 * ============================================================================
 * Entity Design Atom: Character (Protagonist) Design Context
 * ============================================================================
 *
 * Character 设计上下文 - 用于 StoryOutline Phase 2。
 * 定义创建主角时的设计哲学和质量要求。
 */

import type { Atom } from "../types";

export type CharacterDesignInput = {
  protagonistFeature?: string;
};

/**
 * 主角设计上下文 - 完整版
 */
export const characterDesign: Atom<CharacterDesignInput> = ({
  protagonistFeature,
}) => `
<game_system_context>
**CHARACTER DESIGN FOR REALITY RENDERING ENGINE:**

The protagonist will be TESTED by this world. Design flaws that CREATE problems, not just inconvenience.

${
  protagonistFeature
    ? `
<protagonist_constraint>
**USER SELECTION APPLIES**: The user has explicitly selected the protagonist role/archetype: "**${protagonistFeature}**".
- You MUST design the character to fit this "${protagonistFeature}" role.
- **character.title** MUST match or be a variation of this role.
- **character.profession** MUST reflect this role.
- **character.attributes** and **character.skills** MUST be appropriate for a "${protagonistFeature}".
</protagonist_constraint>
`
    : ""
}

**MORAL ALIGNMENT IS FLEXIBLE**:
- The protagonist can be a **Saint**, a **Sinner**, or a **Monster**.
- **Pure Evil is Valid**: Characters who enjoy pain, seek power at any cost, or lack empathy are valid.
- **No Forced Redemption**: Do not force a "good turns evil" or "evil turns good" arc unless it earns it.

**RESILIENCE TIERS** (stored in psychology):
- Tier 0-1 (Civilian): Breaks easily under stress, panics at violence
- Tier 2-3 (Warrior/Veteran): Can endure torture for multiple turns
- Tier 4-5 (Fanatic/Superhuman): Near-unbreakable, interprets pain as validation

**PSYCHOLOGY FIELD EXAMPLES:**
✅ GOOD coreTrauma: "Watched his sister drown while he stood frozen. Now freezes in any water-related danger."
✅ DARK coreTrauma: "Realized at age 10 that hurting others made him feel powerful. Has been chasing that high ever since."
❌ BAD coreTrauma: "Had a sad childhood."

✅ GOOD copingMechanism: "Obsessively counts things when stressed—coins, steps, breaths—until the panic subsides."
✅ DARK copingMechanism: "When humiliated, fantasizes about detailed torture of the offender to regain a sense of control."
❌ BAD copingMechanism: "Gets angry sometimes."

✅ GOOD internalContradiction: "WANTS revenge on the cult that killed his family. NEEDS to let go of hatred before it destroys him."
❌ BAD internalContradiction: "Wants to be good but sometimes does bad things."

**MUNDANE FLAWS (REQUIRED):**
Give the protagonist at least ONE petty, human weakness:
- Physical: chronic back pain, bad eyesight, snores loudly, allergic to common food
- Social: terrible liar, can't hold liquor, gambles compulsively, overshares when nervous
- Practical: always late, loses things, can't cook, bad with money

**APPEARANCE REQUIREMENTS:**
- **NARRATIVE DESCRIPTION REQUIRED** (NOT a list of features).
- **CRITICAL**: Do NOT just list "Height: 180cm, Hair: Black". Tell the STORY behind the body.
  * Explain WHY they have this build (e.g., "lean from years of hunger", "calloused from sword practice")
  * Describe how their history is visible on their person

**FLAWED & REAL PROTOCOL**:
- **Mundane Needs**: Add a "petty" motivation. Not just "save the world", but also "pay off gambling debt" or "cure chronic back pain".
- **Bad Habits**: Give them a vice. Smoking, biting nails, oversleeping, arrogance.
- **Not a Supermodel**: Unless narratively required, avoid "perfect" beauty. Give them asymmetries, signs of aging, or plain features.

**CHARACTER ARC SETUP**:
- **Want vs Need**: The visible goal (want) should conflict with their true growth requirement (need).
- **Fatal Flaw**: This flaw should CAUSE their problems, not just be an inconvenience. It must be tested.
- **Growth Potential**: By story's end, the protagonist should be able to overcome their flaw—but only through suffering.
- **The Lie They Believe**: What false worldview do they hold? The story will challenge it.
</game_system_context>
`;

/**
 * 主角设计上下文 - 精简版
 */
export const characterDesignLite: Atom<CharacterDesignInput> = ({
  protagonistFeature,
}) => `
<game_system_context>
**CHARACTER DESIGN**: Protagonist will be TESTED.
${protagonistFeature ? `- MUST fit "${protagonistFeature}" role` : ""}
- Moral alignment is flexible (saint, sinner, or monster)
- Psychology: coreTrauma, copingMechanism, internalContradiction
- Mundane flaws (petty human weaknesses)
- Narrative appearance (story behind the body)
- Want vs Need, Fatal Flaw, The Lie They Believe
</game_system_context>
`;

export default characterDesign;
