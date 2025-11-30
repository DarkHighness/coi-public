import {
  getRoleInstruction,
  getWorldConsistencyRule,
  getCulturalAdaptationInstruction,
} from "./common";

// --- Outline Prompt ---

export const getHiddenLayerRequirements = (): string => `
<hidden_layer_quality_requirements>
  **CRITICAL: HIDDEN LAYER MUST BE DETAILED AND SUBSTANTIVE**

  The hidden layer is NOT just a brief note. It must contain RICH, ACTIONABLE details that create meaningful secrets and plot hooks.

  <field_requirements>
    <requirement field="hidden.truth (items)">
      NOT just "It's magical" or "Cursed item".
      MUST include: Origin story, specific powers/effects, activation conditions, side effects, who created it and why, connection to larger plot.
      Example: "Forged by the exiled blacksmith Lin Feng using his own blood, this blade absorbs the wielder's negative emotions. Each kill strengthens its hunger. The spirit of Lin Feng's murdered wife resides within, seeking revenge against the Crimson Lotus Sect who ordered her death."
    </requirement>

    <requirement field="hidden.realMotives (NPCs)">
      NOT just "Secretly evil" or "Has ulterior motives".
      MUST include: Specific goals, backstory driving the motivation, what they're willing to sacrifice, timeline of their plan, who else is involved.
      Example: "Seeks to gather all five elemental tokens before the lunar eclipse to open the Void Gate where his imprisoned master awaits. Has been manipulating both the protagonist and the local lord for three years. Will sacrifice his own disciples if necessary. Reports to the Shadow Council through encrypted letters hidden in merchant caravans."
    </requirement>

    <requirement field="hidden.trueCause (conditions)">
      NOT just "Poisoned" or "Magical curse".
      MUST include: Source/origin, mechanism of action, progression stages, cure requirements, who/what is responsible, potential consequences if untreated.
      Example: "Soul Fragment Erosion caused by incomplete reincarnation ritual. The protagonist's soul is missing a piece that was stolen by the mysterious cultivator who interrupted their birth. Progresses through 5 stages: (1) occasional memory gaps, (2) emotional instability, (3) physical weakness, (4) spiritual power leakage, (5) complete soul dissolution. Only recoverable by finding the soul fragment before stage 4."
    </requirement>

    <requirement field="hidden.secrets (general)">
      NOT just vague hints.
      MUST include: Specific information that would change the player's understanding, actionable details, connections to other hidden elements.
    </requirement>

    <requirement field="hidden.trueDescription (events/quests)">
      NOT just "Not what it seems".
      MUST include: What ACTUALLY happened, who was REALLY involved, what the true consequences are, how this connects to the larger plot.
    </requirement>

    <requirement field="hidden.hiddenEffects (skills)">
      NOT just "Has secret power".
      MUST include: Specific hidden mechanics, drawbacks, awakening conditions, lore origin, potential for evolution.
    </requirement>
  </field_requirements>

  <minimum_standards>
    - Each hidden field should be at least 2-3 sentences with SPECIFIC details
    - Hidden information should create PLOT HOOKS that can be discovered later
    - Secrets should be INTERCONNECTED across different entities (NPCs, items, locations, events)
    - Include SPECIFIC names, dates, numbers, and conditions where appropriate
    - Hidden motives should explain the "why" behind visible behaviors
    - Every major secret should connect to at least one other secret in the outline
    - **CRITICAL: DEFAULT 'unlocked: false' FOR ALL SECRETS**:
      • Only set 'unlocked: true' if this secret is DEEPLY INTERNALIZED as part of the protagonist's PERSONAL BACKSTORY
      • Examples of valid unlocked: true cases:
        - Protagonist's own childhood trauma they remember
        - Family secrets they witnessed directly
        - Personal skills/conditions they're aware of
      • Examples where unlocked MUST be false:
        - NPC's true motives (even trusted mentor) ❌
        - Item's hidden properties (unless protagonist forged it themselves) ❌
        - Location secrets (unless protagonist has been there before) ❌
        - World secrets/conspiracies (discover during gameplay) ❌
        - Quest true objectives (reveal through story) ❌
      • **DEFAULT MINDSET**: Assume unlocked: false unless you have STRONG REASON for true
      • **GOAL**: Create mystery and discovery opportunities for gameplay
  </minimum_standards>

  <bad_examples>
    ❌ "hidden.truth: Magical properties unknown to the owner"
    ❌ "hidden.realMotives: Has secret plans"
    ❌ "hidden.trueCause: Mysterious illness"
    ❌ "hidden.secrets: ['Something dark in their past']"
  </bad_examples>

  <good_examples>
    ✅ "hidden.truth: This jade pendant was carved from the heart-stone of the Mountain Spirit Xuan Wu 300 years ago. It contains a fragment of the spirit's consciousness that awakens during life-threatening danger, granting temporary invulnerability. However, each activation drains 10 years of the wearer's lifespan. The Celestial Court has been searching for this artifact to seal the remaining Mountain Spirits."

    ✅ "hidden.realMotives: Elder Zhang appears to mentor the protagonist, but is actually the seventh assassin of the Shadowless Guild. His target is not the protagonist but the protagonist's childhood friend who is the secret heir to the fallen Qin Dynasty. He plans to befriend the protagonist to get close to the target, then stage an 'accident' during the upcoming tournament. He reports to Master Crow via carrier pigeons released at midnight."

    ✅ "hidden.trueCause: The protagonist's recurring nightmares are caused by a soul-binding contract signed by their father before their birth, trading their future mental peace for temporary power to defeat a demon. The demon was sealed but not destroyed, and it can communicate through dreams. The nightmares intensify as the lunar calendar approaches the anniversary of the binding (7th month, 7th day). Can only be broken by finding the original contract scroll hidden in the Abandoned Temple of the North."
  </good_examples>
</hidden_layer_quality_requirements>
`;

const getOutlineInstruction = (): string => `
<instruction>
  Create a structured TRPG story outline based on the provided theme.
  The outline must include a dual-layer reality (Visible vs. Hidden) for depth.
  IMPORTANT: Introduce RANDOMNESS and VARIATION. Do not use generic templates verbatim. Create unique twists, characters, and settings every time.
  CRITICAL: Hidden elements must remain THEMATICALLY CONSISTENT. Do not add supernatural/sci-fi elements unless the theme permits.
  NOTE: The 'hidden' layer is OPTIONAL for individual items, locations, and skills. Only include it if there is a secret to reveal.
</instruction>

${getHiddenLayerRequirements()}

<world_consistency_enforcement>
${getWorldConsistencyRule()}
</world_consistency_enforcement>
`;

export const getOutlinePrompt = (
  theme: string,
  language: string,
  customContext?: string,
  worldSetting?: string,
  backgroundTemplate?: string,
  themeExample?: string,
  isRestricted?: boolean,
  narrativeStyle?: string,
): string => {
  const worldSettingInstruction = worldSetting
    ? `\n<world_setting>\n${worldSetting}\n</world_setting>\n`
    : "";

  let outlinePrompt = `
${getRoleInstruction()}
${getOutlineInstruction()}

<input_context>
  <theme>${theme}</theme>
  ${customContext ? `<custom_context>${customContext}</custom_context>` : ""}
  ${worldSettingInstruction}
  ${narrativeStyle ? `<narrative_style>${narrativeStyle}</narrative_style>` : ""}
  ${backgroundTemplate ? `<background_template>Use this as reference${!isRestricted ? " (be creative, don't copy)" : " (follow closely)"}: "${backgroundTemplate}"</background_template>` : ""}
  ${themeExample ? `<example_for_reference>${!isRestricted ? "Use this for tone/style reference only. DO NOT copy plot/characters." : "CRITICAL: Study this example to understand the tone, complexity, and style expected. DO NOT copy it directly, but match its quality and depth:"}\n\n${themeExample}\n</example_for_reference>` : ""}
</input_context>

${
  !isRestricted
    ? `
<creative_freedom>
  <instruction>You are NOT bound by the example's plot. Create something NEW and UNEXPECTED.</instruction>
  <instruction>Ensure the story feels fresh and distinct from the template.</instruction>
</creative_freedom>
`
    : `
<restricted_mode>
  <instruction>CRITICAL: You MUST strictly adhere to the original work's plot, characters, and setting.</instruction>
  <instruction>Do NOT deviate from the established protagonist name, appearance, or background.</instruction>
  <instruction>Do NOT exercise creative freedom with the core narrative or world rules.</instruction>
  <instruction>Your goal is to faithfully recreate the experience of the original work.</instruction>
</restricted_mode>
`
}

${getCulturalAdaptationInstruction(language)}

<output_requirements>
  <critical>**OUTPUT MUST BE COMPACT JSON - NO NEWLINES, NO INDENTATION**</critical>
  <format>Minified/compact JSON only. Example: {"title":"...","premise":"..."}</format>
  <language>${language}</language>

  <field_requirements>
    **MANDATORY FIELDS (all required):**
    - title: Creative, evocative title that hints at the story's themes
    - initialTime: Starting time (e.g., "Year 2024, Day 1", "The 3rd Year of the Qing Dynasty")
    - premise: The inciting incident - what happened that pulls the protagonist into the story
    - mainGoal: { visible: apparent objective, hidden: true purpose or secret behind the goal }

    **WORLD BUILDING:**
    - worldSetting: { visible: public knowledge, hidden: secret truths, history: events shaping the present }
    - factions: 2-3 major power groups with DETAILED visible AND hidden agendas, members, and relations
    - locations: 1-2 starting locations with environment, features, and DETAILED hidden secrets
    - timeline: 3-5 significant past events (backstory) with visible AND hidden layers

    **CHARACTER:**
    - character: {
        name: (NOT generic names like "Traveler" - use culturally appropriate names),
        title: starting role/class,
        race: character race,
        attributes: 2-3 theme-specific stats (e.g., Health/Sanity for horror, Qi/Cultivation for xianxia),
        skills: 1-2 starting skills with DETAILED visible AND hidden descriptions,
        status: initial condition,
        appearance: DETAILED physical description (height, build, face, hair, clothing, distinguishing marks),
        profession: occupation or role,
        background: brief life story explaining motivations,
        conditions: any starting conditions with DETAILED visible AND hidden causes/effects,
        hiddenTraits: 1-2 latent traits that may awaken with DETAILED trigger conditions and effects
      }

    **STARTING STATE:**
    - quests: 1-2 initial quests (at least one main) with DETAILED visible AND hidden objectives
    - inventory: 1-3 starting items with DETAILED lore AND hidden properties if applicable
    - relationships: 1-2 starting NPCs with DETAILED visible AND hidden personalities, motives, and secrets
    - knowledge: Initial world knowledge the character possesses

    **ATMOSPHERE:**
    - initialAtmosphere: One of: cave, city, combat, desert, dungeon, forest, horror, market, mystical, ocean, quiet, rain, scifi, snow, storm, tavern
  </field_requirements>

  <quality_checklist>
    Before outputting, verify:
    □ Every hidden field has 2-3+ sentences with SPECIFIC details
    □ Secrets are INTERCONNECTED across entities
    □ Character appearance is DETAILED (not just "tall" or "mysterious")
    □ NPC hidden motives explain their visible behavior
    □ Item/skill hidden properties have specific mechanics/conditions
    □ Timeline events have both public perception AND hidden truth
    □ No vague placeholders like "unknown origin" or "mysterious past"
  </quality_checklist>

  <warning>DO NOT use pretty-printed JSON. Output MUST be a single line of compact JSON.</warning>
</output_requirements>
`;

  return outlinePrompt;
};

// ============================================================================
// Phased Story Outline Generation - Multi-turn Conversation Structure
// ============================================================================
//
// Design Philosophy:
// - Use English for all prompts to ensure consistency
// - Structure as natural multi-turn conversation for prefix caching
// - Base system instruction is shared across all phases (cached)
// - Each phase builds on previous results in conversation history
//
// Conversation Flow:
// [System] Base Outline Instruction (STATIC - cached)
// [User] Phase 1 Request + Theme Context
// [Assistant] Phase 1 Result (JSON)
// [User] Phase 2 Request (references Phase 1)
// [Assistant] Phase 2 Result (JSON)
// ... and so on

/** Phase information for UI display */
export interface OutlinePhaseInfo {
  phase: 1 | 2 | 3 | 4 | 5;
  nameKey: string; // i18n key
  descriptionKey: string; // i18n key
}

/** Phase metadata for UI (uses i18n keys) */
export const OUTLINE_PHASES: OutlinePhaseInfo[] = [
  {
    phase: 1,
    nameKey: "initializing.outline.phase.1.name",
    descriptionKey: "initializing.outline.phase.1.desc",
  },
  {
    phase: 2,
    nameKey: "initializing.outline.phase.2.name",
    descriptionKey: "initializing.outline.phase.2.desc",
  },
  {
    phase: 3,
    nameKey: "initializing.outline.phase.3.name",
    descriptionKey: "initializing.outline.phase.3.desc",
  },
  {
    phase: 4,
    nameKey: "initializing.outline.phase.4.name",
    descriptionKey: "initializing.outline.phase.4.desc",
  },
  {
    phase: 5,
    nameKey: "initializing.outline.phase.5.name",
    descriptionKey: "initializing.outline.phase.5.desc",
  },
];

/**
 * Base System Instruction for Outline Generation
 * This is placed in system role and cached across all phases.
 */
export const getOutlineSystemInstruction = (
  language: string,
  isRestricted?: boolean,
  narrativeStyle?: string,
  backgroundTemplate?: string,
  example?: string,
  worldSetting?: string,
): string => `
${getRoleInstruction()}

<objective>
You are creating a structured TRPG story outline in multiple phases.
Each phase generates a specific part of the complete outline.
Maintain consistency across all phases - each phase builds on previous results.
</objective>

<theme_context>
  ${worldSetting ? `<world_setting>${worldSetting}</world_setting>` : ""}
  ${narrativeStyle ? `<narrative_style>${narrativeStyle}</narrative_style>` : ""}
  ${
    backgroundTemplate
      ? `<background_template>Use this as reference${!isRestricted ? " (be creative, don't copy)" : " (follow closely)"}: "${backgroundTemplate}"</background_template>`
      : ""
  }
  ${
    example
      ? `<example_for_reference>${!isRestricted ? "Use this for tone/style reference only. DO NOT copy plot/characters." : "CRITICAL: Study this example to understand the tone, complexity, and style expected. DO NOT copy it directly, but match its quality and depth:"}\n\n${example}\n</example_for_reference>`
      : ""
  }
</theme_context>

<dual_layer_reality>
Every entity in this world has TWO layers:
- **Visible**: What the player perceives (subjective, potentially flawed)
- **Hidden**: The objective truth (GM knowledge, secrets)

This creates depth, mystery, and opportunities for dramatic reveals.
</dual_layer_reality>

${getHiddenLayerRequirements()}

${getWorldConsistencyRule()}

${getCulturalAdaptationInstruction(language)}

${
  !isRestricted
    ? `
<creative_mode>
- You are NOT bound by examples. Create something NEW and UNEXPECTED.
- Introduce RANDOMNESS and VARIATION in every generation.
- Ensure the story feels fresh and distinct.
</creative_mode>
`
    : `
<restricted_mode>
- Follow the provided templates and examples closely.
- Maintain strict fidelity to the source material.
- Do not introduce elements outside the established setting.
</restricted_mode>
`
}

<output_format>
**CRITICAL: Output MUST be compact JSON - NO newlines, NO indentation.**
Format: Single line of minified JSON.
Language for content: ${language}
</output_format>
`;

/**
 * Phase 1: World Foundation
 * First user message in the conversation
 */
export const getOutlinePhase1Prompt = (
  theme: string,
  language: string,
  customContext?: string,
): string => {
  return `
[PHASE 1 OF 5: WORLD FOUNDATION]

Create the foundational world framework for this story.

<theme>${theme}</theme>
<language>${language}</language>
${customContext ? `<custom_context>${customContext}</custom_context>` : ""}

Generate these fields:

1. **title**: Creative, evocative title hinting at themes
2. **initialTime**: Starting time (e.g., "Year 2024, Day 1", "Third Year of the Qing Dynasty")
3. **premise**: The inciting incident (2-3 paragraphs, detailed and engaging)
4. **worldSetting**:
   - visible: Public knowledge about the world
   - hidden: Secret truths (detailed, specific)
   - history: Major events shaping the present
5. **mainGoal**:
   - visible: The apparent objective
   - hidden: True purpose or secret behind the goal

**IMPORTANT: Output ONLY valid JSON. No prose, no explanations, no markdown.**
Output compact JSON with these exact fields.
`;
};

/**
 * Phase 2: Protagonist Character
 * Continues the conversation after Phase 1 result
 */
export const getOutlinePhase2Prompt = (): string => `
[PHASE 2 OF 5: PROTAGONIST CHARACTER]

Based on the world you just created, design the protagonist.

Generate these fields:

**character** object with:
- **name**: Culturally appropriate name (NOT generic like "Traveler" or "Wanderer")
- **title**: Starting role/class/position
- **race**: Character's race/species
- **status**: Initial condition (e.g., "Healthy", "Amnesiac", "Cursed")
- **profession**: Occupation or role in society
- **background**: Brief life story explaining motivations (connect to worldSetting)
- **appearance**: DETAILED physical description including:
  - Height and build (specific measurements if appropriate)
  - Face shape, eye color, hair style/color
  - Distinguishing marks, scars, tattoos
  - Clothing and accessories
- **attributes**: 2-3 theme-specific stats as array:
  - { label: "Health", value: 100, maxValue: 100, color: "red" }
  - For horror: add Sanity; For xianxia: add Qi/Cultivation; etc.
- **skills**: 1-2 starting skills, each with:
  - name, level (e.g., "Novice", "1")
  - visible: { description, knownEffects[] }
  - hidden: { trueDescription, hiddenEffects[], drawbacks[] } (DETAILED)
- **conditions**: Any starting conditions (can be empty array)
  - If present: name, type, visible/hidden layers
- **hiddenTraits**: 1-2 latent traits that may awaken:
  - name, description, effects[], triggerConditions[], unlocked: false

The character MUST fit naturally into the world from Phase 1.

**IMPORTANT: Output ONLY valid JSON. No prose, no explanations, no markdown.**
Output compact JSON with the "character" field only.
`;

/**
 * Phase 3: World Entities (Locations & Factions)
 * Continues after Phase 2 result
 */
export const getOutlinePhase3Prompt = (): string => `
[PHASE 3 OF 5: WORLD ENTITIES]

Now create the locations and factions for this world.

Generate these fields:

**locations** (1-2 initial locations):
Each location needs:
- **name**: Location name
- **environment**: Atmosphere tag (cave/city/forest/dungeon/etc.)
- **lore**: Location history (1-2 sentences)
- **visible**:
  - description: What players see (sensory details)
  - knownFeatures: Array of notable features
  - resources: Array of gatherable resources/items
- **hidden**:
  - fullDescription: True nature of the location
  - hiddenFeatures: Secret areas, passages, mechanisms
  - dangers: Hidden traps, monsters, or hazards
  - secrets: Array of location secrets (DETAILED)

**factions** (2-3 major power groups):
Each faction needs:
- **name**: Faction name
- **visible**:
  - agenda: Public goals and reputation
  - members: [{ name: "...", title: "..." }] - known members
  - influence: Perceived power description
  - relations: [{ target: "...", status: "..." }] - public alliances
- **hidden**:
  - agenda: Secret agenda and true goals (DETAILED)
  - members: Secret members, spies, defectors
  - influence: True power level
  - relations: Secret alliances or hidden rivalries

Connect locations and factions to the world from Phase 1 and character from Phase 2.

**IMPORTANT: Output ONLY valid JSON. No prose, no explanations, no markdown.**
Output compact JSON with "locations" and "factions" fields.
`;

/**
 * Phase 4: Relationships & Inventory
 * Continues after Phase 3 result
 */
export const getOutlinePhase4Prompt = (): string => `
[PHASE 4 OF 5: RELATIONSHIPS & INVENTORY]

Create the initial NPCs and starting items.

Generate these fields:

**relationships** (1-2 initial NPCs):
Each NPC needs:
- **visible**:
  - name: Known name/title
  - description: Public perception
  - appearance: Physical description (DETAILED: height, clothing, features)
  - relationshipType: Player's view (friend, mentor, rival, etc.)
  - personality: What people SAY about them
  - dialogueStyle: How they speak (e.g., "Formal", "Slang", "Riddles")
  - affinity: 0-100 score
- **hidden**:
  - trueName: Real name (if different)
  - realPersonality: What they REALLY are like
  - realMotives: True underlying goals (DETAILED - specific plans)
  - routine: Daily schedule/activities
  - secrets: Array of character secrets
  - relationshipType: NPC's view of player (tool, prey, etc.)
  - status: Current condition (plotting, traveling, etc.)

**inventory** (1-3 starting items):
Each item needs:
- **name**: Item name
- **lore**: Brief history (who made it, what happened to it)
- **visible**:
  - description: Appearance and apparent use
  - usage: How to use the item
  - notes: Any player notes (optional)
- **hidden** (if item has secrets):
  - truth: True nature/power (DETAILED - origin, mechanics, side effects)
  - secrets: Array of item secrets

NPCs should connect to factions from Phase 3.
Items should connect to world lore.

**IMPORTANT: Output ONLY valid JSON. No prose, no explanations, no markdown.**
Output compact JSON with "relationships" and "inventory" fields.
`;

/**
 * Phase 5: Quests, Knowledge & Atmosphere
 * Final phase, continues after Phase 4 result
 */
export const getOutlinePhase5Prompt = (): string => `
[PHASE 5 OF 5: QUESTS, KNOWLEDGE & ATMOSPHERE]

Create the initial quests, world knowledge, timeline, and set the atmosphere.

Generate these fields:

**quests** (1-2 initial quests, at least one main):
Each quest needs:
- **id**: Format "quest:N" (e.g., "quest:1")
- **title**: Quest name
- **type**: "main" or "side"
- **status**: "active"
- **visible**:
  - description: Apparent objective
  - objectives: Array of visible goals
- **hidden**:
  - trueDescription: Real purpose (DETAILED)
  - trueObjectives: Actual goals
  - secretOutcome: What really happens if completed

**knowledge** (2-3 initial entries):
Each entry needs:
- **title**: Topic name
- **category**: landscape/history/item/legend/faction/culture/magic/technology/other
- **visible**:
  - description: Common knowledge
  - details: Additional context
- **hidden**:
  - fullTruth: Complete truth (DETAILED)
  - misconceptions: Common wrong beliefs
  - toBeRevealed: Info for later reveals

**timeline** (3-5 backstory events):
Each event needs:
- **id**: Format "evt:N"
- **gameTime**: When it happened (narrative time)
- **category**: player_action/npc_action/world_event/consequence
- **visible**:
  - description: Public account
  - causedBy: Publicly blamed/credited
- **hidden**:
  - trueDescription: What actually happened
  - trueCausedBy: Real instigator
  - consequences: Future implications

**initialAtmosphere**:
- **envTheme**: Visual theme
  Options: fantasy, scifi, cyberpunk, horror, mystery, romance, royal, wuxia, demonic, ethereal, modern, gold, villain, sepia, rose, war, sunset, cold, violet, nature, artdeco, intrigue, wasteland, patriotic, cyan, silver, obsidian
- **ambience**: Audio ambience
  Options: cave, city, combat, desert, dungeon, forest, horror, market, mystical, ocean, quiet, rain, scifi, snow, storm, tavern

Choose atmosphere based on the theme and world setting from Phase 1.

**IMPORTANT: Output ONLY valid JSON. No prose, no explanations, no markdown.**
Output compact JSON with "quests", "knowledge", "timeline", and "initialAtmosphere" fields.
`;

/**
 * Get acknowledgment message for assistant responses between phases.
 * This creates the natural conversation flow for prefix caching.
 */
export const getPhaseAcknowledgment = (phase: number): string => {
  switch (phase) {
    case 1:
      return "[Phase 1 complete. World foundation established. Ready for Phase 2: Protagonist Character.]";
    case 2:
      return "[Phase 2 complete. Protagonist created. Ready for Phase 3: World Entities.]";
    case 3:
      return "[Phase 3 complete. Locations and factions established. Ready for Phase 4: Relationships & Inventory.]";
    case 4:
      return "[Phase 4 complete. NPCs and items created. Ready for Phase 5: Quests, Knowledge & Atmosphere.]";
    case 5:
      return "[Phase 5 complete. Story outline generation finished.]";
    default:
      return "[Phase complete.]";
  }
};
