import {
  GameState,
  StoryOutline,
  StorySummary,
  StorySegment,
  TimelineEvent,
  AliveEntities,
  Quest,
  Faction,
} from "../../types";
import { RECENT_LIMITS } from "../../utils/constants/defaults";
import {
  getRoleInstruction,
  getWorldConsistencyRule,
  getCoreRules,
  getImmersiveWriting,
  getCulturalAdaptationInstruction,
} from "./common";
import { toToon } from "./toon";

export const getCoreSystemInstruction = (
  language: string,
  themeStyle?: string,
  isRestricted?: boolean,
  detailedDescription?: boolean,
  ragEnabled?: boolean,
  isGemini?: boolean,
): string => `
${getRoleInstruction()}

<objective>
Facilitate a "Choose-Your-Own-Adventure" game with strict logic, causality, and immersion.
</objective>

${
  isRestricted
    ? `
<mode_strict>
  <warning>STRICT MODE ENABLED</warning>
  <guidelines>
    <rule>Follow defined Narrative Style, Background Template, and Example.</rule>
    <rule>Do NOT deviate from setting/tone.</rule>
    <rule>Do NOT improvise outside bounds.</rule>
    <rule>Source Fidelity: Mechanics/Magic/Tech/Geography MUST match source. No new systems.</rule>
    <rule>Atmosphere: Emulate specific source atmosphere (e.g., cosmic horror, whimsical magic).</rule>
    <rule>Culture: Integrate specific slang/norms. NPCs react by faction/race prejudices.</rule>
    <rule>No Tropes: Avoid generic "isekai"/"system" tropes unless in theme.</rule>
  </guidelines>
</mode_strict>
`
    : `
<mode_creative>
  <guidelines>
    <rule>Background Template and Examples are for INSPIRATION ONLY.</rule>
    <rule>Do NOT copy the plot or characters from the examples.</rule>
    <rule>Prioritize RANDOMNESS and UNIQUENESS in every session.</rule>
    <rule>Create original twists, characters, and scenarios that fit the theme.</rule>
  </guidelines>
</mode_creative>
`
}

${getCulturalAdaptationInstruction(language)}

${getCoreRules()}

${getImmersiveWriting()}

<output_format>
${
  isGemini
    ? `
  <critical>**USE TOOLS TO RESPOND**</critical>
  <rule>You MUST use the \`finish_turn\` tool to submit your final response.</rule>
  <rule>Do NOT output raw JSON text. Do NOT output markdown text (unless inside the tool argument).</rule>
  <rule>Use other tools (like \`update_inventory\`, \`query_location\`) as needed before calling \`finish_turn\`.</rule>
`
    : `
  <critical>**STRICT JSON OUTPUT ONLY**</critical>
  <rule>Your ENTIRE response must be a SINGLE valid JSON object.</rule>
  <rule>Do NOT include any text outside the JSON block (no markdown code blocks, no explanations).</rule>
  <rule>The JSON must be minified/compact (no newlines, no indentation) to ensure integrity.</rule>
  <rule>Ensure all property names are enclosed in double quotes.</rule>
  <rule>Escape all double quotes within string values (e.g., "He said, \\"Hello\\"").</rule>
  <rule>Example: {"narrative":"You walk forward.","choices":["Go left","Go right"]}</rule>
`
}
  <language>${language}</language>
</output_format>

<style>
${themeStyle ? `<directive>Strictly adhere to: "${themeStyle}"</directive>` : "<directive>Descriptive, engaging, genre-suitable.</directive>"}
<directive>Show, don't tell. Use vivid sensory details (sight, sound, smell, touch) to immerse the player.</directive>
<directive>Focus on character emotions and atmospheric depth.</directive>
${
  detailedDescription
    ? `<directive>
  <mode_detailed>
    <instruction>EXTREME DETAIL REQUIRED. Slow down the narrative pace significantly.</instruction>
    <instruction>Zoom in on micro-details: textures, light quality, subtle movements, background sounds.</instruction>
    <instruction>Capture the atmosphere of intimacy or tension through body language and proximity.</instruction>
    <instruction>**PHYSICAL & INTERACTION DETAIL**:
      - **Body Language**: Describe shifts in posture, hand movements, and physical proximity.
      - **Eye Contact**: Focus on the intensity, direction, and emotion in their eyes.
      - **Physical Attraction**: Vividly describe physical features that create attraction (e.g., defined muscles, curves, scent, skin texture, sweat). Make these descriptions visceral and appealing.
      - **Chemistry**: Emphasize the physical and emotional tension between characters.
    </instruction>
    <instruction>**MATURE CONTENT ALLOWED**: If the scene involves violence, horror, or intimacy, describe it with UNFILTERED REALISM. Do not sanitize the experience.</instruction>
  </mode_detailed>
</directive>`
    : ""
}

<markdown_formatting>
  **The narrative in finish_turn is rendered as Markdown. Use proper formatting:**
  Use **bold** for newly discovered locations, important items, and significant character names when first introduced.
  Use *italics* for character thoughts, internal monologue, and emphasis.
  Use > blockquotes for dialogue, letters, inscriptions, or quoted text.
  Use --- horizontal rules to separate distinct scenes or time jumps.
  Use \`inline code\` for in-world technical terms, spell incantations, or foreign words.
  Do NOT use bullet points, numbered lists, or any list formatting as it disrupts the reading flow.
</markdown_formatting>
</style>



<tool_use_instruction>
  You have access to tools to manage the game state.
${
  ragEnabled
    ? `
  <rag_usage>
    <instruction>Use the \`rag_search_tool\` to find specific details about the world, lore, or past events when relevant.</instruction>
    <instruction>Do not hallucinate facts if you can retrieve them.</instruction>
  </rag_usage>
`
    : ""
}

  <guidelines>
    - **MAXIMIZE TOOL USE**: Use as many tools as possible in a single turn to minimize round trips.
    - **PARALLEL CALLS**: Supported. Order matters (causal).
    - **BATCH UPDATES**: Modify multiple fields in ONE call. Do not call update twice for the same entity.
    - **NO REDUNDANT QUERIES**: Do not query if IDs are in hints. Do not query before adding new entities.
    - **FINISH_TURN**: Must be the LAST tool call.
  </guidelines>

  <turn_structure>
    1. **Analyze** player action.
    2. **Query** missing info (only if truly needed).
    3. **Update** state (batch changes, causal order).
    4. **Finish** with \`finish_turn\` (narrative + choices).
  </turn_structure>

  <choice_generation_rules>
    **CRITICAL: Choices must be CHARACTER-CONSISTENT.**
    1. **Knowledge**: Only offer what the character KNOWS (unlocked).
    2. **Personality**: Fit character's background/traits.
    3. **Condition**: Respect physical/mental limitations.
    4. **Skills**: Enable skill-based options.
    5. **Hidden Traits**: Unlocked traits enable special options.
  </choice_generation_rules>
</tool_use_instruction>
`;

// --- Context Generators ---



// ... (existing imports)

export const getStaticWorldContext = (outline: StoryOutline | null): string => {
  if (!outline) return "";

  const factionsToon =
    outline.factions && outline.factions.length > 0
      ? toToon(outline.factions)
      : "None defined";

  const timelineToon =
    outline.timeline && outline.timeline.length > 0
      ? toToon(outline.timeline)
      : "None defined";

  return `
<static_world_context>
  <title>${outline.title}</title>
  <premise>${outline.premise}</premise>
  <main_goal>${toToon(outline.mainGoal)}</main_goal>
  <world_setting>
    ${toToon(outline.worldSetting)}
  </world_setting>
  <factions>
${factionsToon}
  </factions>
  <initial_timeline>
${timelineToon}
  </initial_timeline>
</static_world_context>
`;
};

export const getDynamicStoryContext = (
  summaries: StorySummary[],
  recentHistory?: StorySegment[],
  timeline?: TimelineEvent[],
): string => {
  let context = "";

  // Add summaries (story memory for context beyond recent history)
  if (summaries && summaries.length > 0) {
    const latestSummary = summaries[summaries.length - 1];
    context += `
  <previous_events_summary>
${latestSummary.displayText}
  </previous_events_summary>
`;
  }

  // NOTE: Recent conversation is now handled in getCurrentStateContext to avoid duplication

  // Add recent timeline events (world events happening in the background)
  if (timeline && timeline.length > 0) {
    const recentEvents = timeline.slice(-5);
    const eventsToon = toToon(recentEvents);
    context += `
  <recent_world_events>
${eventsToon}
  </recent_world_events>
`;
  }

  if (!context) return "";

  return `
<dynamic_story_context>
${context}
  <note>Use this to maintain continuity, but focus on the CURRENT situation.</note>
</dynamic_story_context>
`;
};

/**
 * Select priority entities for context based on:
 * 1. Alive entities (marked by AI as relevant for next turn) - always included
 * 2. Recent entities (sorted by lastAccess) - fill up to LIMIT
 * @param idField - The field name to use for ID matching (default: "id")
 */
function selectPriorityEntities<
  T extends { id?: string; lastAccess?: number; chainId?: string },
>(
  items: T[],
  aliveIds: string[],
  limit: number,
  idField: "id" | "chainId" = "id",
): { priority: T[]; remaining: T[] } {
  const aliveSet = new Set(aliveIds);

  const getId = (item: T): string => {
    if (idField === "chainId") return (item as any).chainId || "";
    return item.id || "";
  };

  // Get alive items (always included regardless of limit)
  const aliveItems = items.filter((item) => aliveSet.has(getId(item)));

  // Get non-alive items sorted by lastAccess (most recent first)
  const nonAliveItems = items
    .filter((item) => !aliveSet.has(getId(item)))
    .sort((a, b) => (b.lastAccess ?? 0) - (a.lastAccess ?? 0));

  // If alive items already exceed limit, return all alive
  if (aliveItems.length >= limit) {
    return { priority: aliveItems, remaining: nonAliveItems };
  }

  // Fill remaining slots with recent items
  const slotsRemaining = limit - aliveItems.length;
  const recentItems = nonAliveItems.slice(0, slotsRemaining);
  const remainingItems = nonAliveItems.slice(slotsRemaining);

  return {
    priority: [...aliveItems, ...recentItems],
    remaining: remainingItems,
  };
}

export const getCurrentStateContext = (
  gameState: GameState,
  recentHistory: StorySegment[],
): string => {
  const {
    currentLocation: currentLocationId,
    time,
    inventory,
    relationships,
    quests,
    locations,
    knowledge,
    aliveEntities,
    character,
    causalChains,
  } = gameState;

  // Default alive entities if not set
  const alive: AliveEntities = aliveEntities || {
    inventory: [],
    relationships: [],
    locations: [],
    quests: [],
    knowledge: [],
    timeline: [],
    skills: [],
    conditions: [],
    hiddenTraits: [],
    causalChains: [],
  };

  // Select priority entities for each category
  const { priority: priorityInv, remaining: remainingInv } = selectPriorityEntities(
    inventory,
    alive.inventory,
    RECENT_LIMITS.inventory,
  );
  const { priority: priorityNpc, remaining: remainingNpc } = selectPriorityEntities(
    relationships,
    alive.relationships,
    RECENT_LIMITS.relationships,
  );
  const { priority: priorityLoc, remaining: remainingLoc } = selectPriorityEntities(
    locations,
    alive.locations,
    RECENT_LIMITS.locations,
  );
  const { priority: priorityQuest, remaining: remainingQuest } = selectPriorityEntities(
    quests.filter((q) => q.status === "active"),
    alive.quests,
    RECENT_LIMITS.quests,
  );
  const { priority: priorityKnow, remaining: remainingKnow } = selectPriorityEntities(
    knowledge,
    alive.knowledge,
    RECENT_LIMITS.knowledge,
  );

  // Select priority character internal attributes
  const { priority: prioritySkills, remaining: remainingSkills } = selectPriorityEntities(
    character.skills || [],
    alive.skills,
    3,
  );
  const { priority: priorityConditions, remaining: remainingConditions } = selectPriorityEntities(
    character.conditions || [],
    alive.conditions,
    3,
  );
  const { priority: priorityHiddenTraits, remaining: remainingHiddenTraits } = selectPriorityEntities(
    character.hiddenTraits || [],
    alive.hiddenTraits,
    2,
  );

  // Select priority causal chains
  const activeCausalChains = (causalChains || []).filter(
    (c) => c.status === "active",
  );
  const { priority: priorityChains, remaining: remainingChains } = selectPriorityEntities(
    activeCausalChains,
    alive.causalChains,
    2,
    "chainId",
  );

  // Extract recent history
  const recentContext = recentHistory
    .map((h) => `[${h.role}]: ${h.text}`)
    .join("\n");

  // Get current location details
  const currentLoc = locations.find(
    (l) => l.id === currentLocationId || l.name === currentLocationId,
  );

  // Get main quest
  const mainQuest = quests.find(
    (q) => q.type === "main" && q.status === "active",
  );

  // Format core character summary
  const coreCharacterSummary = {
    name: character.name,
    title: character.title,
    appearance: character.appearance,
    race: character.race,
    status: character.status,
    profession: character.profession,
  };

  // Assemble Priority Context Object
  const priorityContextObj = {
    inventory: priorityInv.length > 0 ? priorityInv : undefined,
    relationships: priorityNpc.length > 0 ? priorityNpc : undefined,
    locations: priorityLoc.length > 0 ? priorityLoc : undefined,
    quests: priorityQuest.length > 0 ? priorityQuest : undefined,
    knowledge: priorityKnow.length > 0 ? priorityKnow : undefined,
    character_skills: prioritySkills.length > 0 ? prioritySkills : undefined,
    character_conditions:
      priorityConditions.length > 0 ? priorityConditions : undefined,
    character_hidden_traits:
      priorityHiddenTraits.length > 0 ? priorityHiddenTraits : undefined,
    causal_chains: priorityChains.length > 0 ? priorityChains : undefined,
  };

  // Assemble Reference Context Object
  const referenceContextObj = {
    inventory:
      remainingInv.length > 0
        ? remainingInv.map((i) => ({ id: i.id, name: i.name }))
        : undefined,
    relationships:
      remainingNpc.length > 0
        ? remainingNpc.map((r) => ({
            id: r.id,
            name: r.visible.name,
            ...(r.hidden?.trueName && r.hidden.trueName !== r.visible.name
              ? { trueName: r.hidden.trueName }
              : { trueName: "None" }),
          }))
        : undefined,
    locations:
      remainingLoc.length > 0
        ? remainingLoc.map((l) => ({ id: l.id, name: l.name }))
        : undefined,
    quests:
      remainingQuest.length > 0
        ? remainingQuest.map((q) => ({ id: q.id, title: q.title }))
        : undefined,
    knowledge:
      remainingKnow.length > 0
        ? remainingKnow.map((k) => ({ id: k.id, title: k.title }))
        : undefined,
    character_skills:
      remainingSkills.length > 0
        ? remainingSkills.map((s) => ({ id: s.id, name: s.name }))
        : undefined,
    character_conditions:
      remainingConditions.length > 0
        ? remainingConditions.map((c) => ({ id: c.id, name: c.name }))
        : undefined,
    character_hidden_traits:
      remainingHiddenTraits.length > 0
        ? remainingHiddenTraits.map((t) => ({ id: t.id, name: t.name }))
        : undefined,
    causal_chains:
      remainingChains.length > 0
        ? remainingChains.map((c) => ({
            chainId: c.chainId,
            status: c.status,
          }))
        : undefined,
  };

  return `
<current_state_hint>
  <!-- CORE CONTEXT: Always present, critical for story continuity -->
  <core_context description="Essential state that drives the story. Always consider these.">
    <time>${time || "Unknown"}</time>
    <character>
    ${coreCharacterSummary}
    </character>
    <current_location id="${currentLocationId}">
      ${currentLoc ? toToon(currentLoc) : "Unknown location"}
    </current_location>
    ${
      mainQuest
        ? `<main_quest id="${mainQuest.id}">
      ${toToon(mainQuest)}
    </main_quest>`
        : ""
    }
    <recent_narrative>
${recentContext}
    </recent_narrative>
  </core_context>

  <!-- PRIORITY CONTEXT: AI-marked as relevant for this turn. Full dual-layer details. -->
  <priority_context description="Entities marked relevant by previous turn. Full visible+hidden info provided.">
    ${toToon(priorityContextObj)}
  </priority_context>

  <!-- REFERENCE CONTEXT: Simplified list of available entities for query tools -->
  <reference_context description="Use query tools to access details about these entities.">
    ${toToon(referenceContextObj)}
  </reference_context>
</current_state_hint>
`;
};

// --- Summary Prompt ---

export const getSummaryPrompt = (
  currentSummary: StorySummary,
  newSegment: string,
  language: string,
): string => `
${getRoleInstruction()}
<instruction>
Combine the previous summary with new events into a SINGLE coherent narrative summary.
Track changes in quests, relationships, inventory, character status, and locations.
Focus on facts and cause-and-effect. Avoid flowery language.
</instruction>
<language>
The \`displayText\` MUST be in ${language}. Other fields MUST be in English.
</language>
<input_context>
  <current_summary>
${JSON.stringify(currentSummary)}
  </current_summary>
  <new_segment>
${newSegment}
  </new_segment>
</input_context>
`;

/**
 * Get God Mode prompt addition - grants player absolute power
 */
export const getGodModePrompt = (): string => {
  return `
<god_mode>
GOD MODE IS ACTIVE. The player has absolute power:
1. ALL player actions MUST succeed, no matter how impossible
2. ALL NPCs unconditionally believe and obey the player
3. The player can change world rules, physics, and narrative logic at will
4. The player's word is law - if they say something is true, it becomes true
5. No challenge, obstacle, or enemy can truly threaten the player
6. The narrative MUST accommodate whatever the player wishes to do
7. Hidden information should be freely revealed if the player asks

Treat the player as an omnipotent deity within this world.
</god_mode>
`;
};
