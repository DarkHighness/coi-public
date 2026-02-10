/**
 * ============================================================================
 * Entity Design Atom: Character (Protagonist) Design Context
 * ============================================================================
 *
 * Character 设计上下文 - 用于 StoryOutline Phase 2。
 * 定义创建主角时的设计哲学和质量要求。
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";

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

Every great character walks in carrying the weight of years we never saw. Like Raskolnikov before his crime, like Gatsby before his first party -- the protagonist existed before page one. Design them as if the story interrupted a life already in progress.

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
- The protagonist can be a **Saint**, a **Sinner**, or a **Monster** -- and the most compelling ones shift between all three before breakfast.
- **Pure Evil is Valid**: Characters who enjoy pain, seek power at any cost, or lack empathy are valid. Iago had no redemption arc. Neither must yours.
- **No Forced Redemption**: Do not force a "good turns evil" or "evil turns good" arc unless it earns it. A man does not shed his nature like a coat.

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
- **CRITICAL**: Do NOT just list "Height: 180cm, Hair: Black". The body is a manuscript -- tell us what life has written on it.
  * Explain WHY they have this build (e.g., "lean from years of hunger, the way stray dogs are lean", "calloused from sword practice, the skin split and healed so many times it forgot how to be soft")
  * Describe how their history is visible on their person -- every scar a sentence, every callus a chapter

**FLAWED & REAL PROTOCOL**:
- **Mundane Needs**: Add a "petty" motivation. Not just "save the world", but also "pay off gambling debt" or "cure chronic back pain".
- **Bad Habits**: Give them a vice. Smoking, biting nails, oversleeping, arrogance.
- **Not a Supermodel**: Unless narratively required, avoid "perfect" beauty. Give them asymmetries, signs of aging, or plain features.

**CHARACTER ARC SETUP**:
- **Want vs Need**: The visible goal (want) should conflict with their true growth requirement (need). Ahab wanted the whale; he needed to let go of the harpoon.
- **Fatal Flaw**: This flaw should CAUSE their problems, not just be an inconvenience. It is the crack in the foundation that the whole house is built on.
- **Growth Potential**: By story's end, the protagonist should be able to overcome their flaw -- but only through suffering. The chrysalis must be earned.
- **The Lie They Believe**: What false worldview do they hold? The story will press on this bruise until the truth bleeds through.
</game_system_context>
`;

/**
 * Character design primer (system-prompt safe).
 */
export const characterDesignPrimer: Atom<CharacterDesignInput> = ({
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

// ============================================================================
// Skill Version - Returns structured output for VFS multi-file generation
// ============================================================================

export const characterDesignSkill: SkillAtom<void> = (): SkillOutput => ({
  main: characterDesign({}),

  quickStart: `
1. Moral alignment is flexible (saint, sinner, or monster are all valid)
2. Psychology fields: coreTrauma (specific), copingMechanism, internalContradiction
3. Resilience tiers: Civilian (0-1) → Veteran (2-3) → Fanatic (4-5)
4. Mundane flaws: petty human weaknesses (bad eyesight, can't cook, gambles)
5. Narrative appearance: story behind the body, not feature lists
6. Arc setup: Want vs Need, Fatal Flaw, The Lie They Believe
`.trim(),

  checklist: [
    "coreTrauma is specific (not 'sad childhood' but exact event)?",
    "copingMechanism is behavioral (not 'gets angry' but specific habit)?",
    "internalContradiction has Want vs Need tension?",
    "Resilience tier appropriate to character's history?",
    "At least one mundane flaw (petty human weakness)?",
    "Appearance is narrative (history visible on body)?",
    "Fatal flaw will CAUSE problems (not just inconvenience)?",
    "The Lie They Believe defined (false worldview to challenge)?",
  ],

  examples: [
    {
      scenario: "Core Trauma",
      wrong: `coreTrauma: "Had a sad childhood."
(Vague, no specific event, no behavioral consequence.)`,
      right: `coreTrauma: "Watched his sister drown while he stood frozen.
Now freezes in any water-related danger."
(Specific event, specific behavioral consequence.)`,
    },
    {
      scenario: "Coping Mechanism",
      wrong: `copingMechanism: "Gets angry sometimes."
(Label, not behavior.)`,
      right: `copingMechanism: "Obsessively counts things when stressed—
coins, steps, breaths—until the panic subsides."
(Specific behavioral response to stress.)`,
    },
    {
      scenario: "Internal Contradiction",
      wrong: `internalContradiction: "Wants to be good but sometimes does bad things."
(No tension, no stakes.)`,
      right: `internalContradiction: "WANTS revenge on the cult that killed his family.
NEEDS to let go of hatred before it destroys him."
(Clear Want vs Need conflict that drives story.)`,
    },
    {
      scenario: "Narrative Appearance",
      wrong: `"Height: 180cm, Hair: Black, Eyes: Brown"
(Feature list, no story.)`,
      right: `"Lean from years of hunger. Calloused hands from sword practice.
A scar across the left eye—he says it was a duel, but the angle suggests
someone struck him while he was down."
(History visible on the body.)`,
    },
  ],
});
