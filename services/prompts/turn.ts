/**
 * ============================================================================
 * Turn Prompt Builder - 回合 Prompt 构建器
 * ============================================================================
 *
 * 核心设计理念：构建一个"真实"的世界模拟引擎
 *
 * AI 的角色不是讨好玩家的叙述者，而是冷酷客观的物理引擎：
 * 1. 世界按照自己的规则运转，不因玩家而改变
 * 2. 每个行动都有因果，每个决定都有代价
 * 3. NPC 是独立的个体，有自己的目标和生活
 * 4. 隐藏的真相只有通过正确的方式才能揭示
 *
 * 技术目标：
 * - 使用分层上下文构建器优化前缀缓存
 * - 静态内容放在前面，动态内容放在后面
 * - hidden 字段始终对 AI 可见（AI 是 GM）
 * - unlocked 标志告诉 AI 玩家是否知道真相
 */

import {
  GameState,
  StoryOutline,
  StorySummary,
  StorySegment,
  TimelineEvent,
} from "../../types";
import { THEMES } from "../../utils/constants/themes";
import {
  getRoleInstruction,
  getCoreRules,
  getImmersiveWriting,
  getCulturalAdaptationInstruction,
  getCharacterLogicInstruction,
} from "./common";
import {
  buildLayeredContext,
  buildOptimizedPrompt,
  type ContextBuilderOptions,
} from "./contextBuilder";

// ============================================================================
// 系统指令构建
// ============================================================================

/**
 * 获取核心系统指令
 *
 * 这是 Prompt 的"灵魂"，定义了 AI 作为世界模拟引擎的角色
 */
export const getCoreSystemInstruction = (
  language: string,
  themeStyle?: string,
  isRestricted?: boolean,
  detailedDescription?: boolean,
  ragEnabled?: boolean,
  isGemini?: boolean,
  gameState?: GameState,
): string => {
  const restrictedInstruction =
    gameState && THEMES[gameState.atmosphere.envTheme]?.restricted
      ? `
<mode_strict>
  <warning>STRICT MODE ENABLED - RESTRICTED THEME</warning>
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
`
      : isRestricted
      ? `
<mode_strict>
  <warning>STRICT MODE ENABLED</warning>
  <guidelines>
    <rule>Follow defined Narrative Style, Background Template, and Example.</rule>
    <rule>Do NOT deviate from setting/tone.</rule>
    <rule>Do NOT improvise outside bounds.</rule>
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
`;

  return `
${getRoleInstruction()}

<objective>
You are running a **Living World Simulation**. Your purpose is NOT to tell a story, but to **simulate reality**.
The narrative emerges from the interaction between the player's choices and the world's immutable laws.
</objective>

${restrictedInstruction}

${getCulturalAdaptationInstruction(language)}

${getCoreRules()}

${getCharacterLogicInstruction()}

${getImmersiveWriting()}

<gm_knowledge_model>
  **YOU ARE THE GM (Game Master). YOU KNOW EVERYTHING.**

  <visibility_rules>
    - You have access to ALL \`hidden\` fields for every entity (NPCs, items, locations, etc.)
    - The \`hidden\` layer contains the TRUTH that only you, as GM, know
    - The \`visible\` layer is what the PLAYER currently perceives/believes
    - The \`unlocked\` flag tells you WHETHER THE PLAYER HAS DISCOVERED the hidden truth
  </visibility_rules>

  <how_to_use>
    - **unlocked: false** → Player does NOT know the hidden truth. Describe only from \`visible\`.
    - **unlocked: true** → Player HAS discovered the truth. You may now reference \`hidden\` info in narrative.
    - Use your GM knowledge to:
      * Make NPCs act according to their TRUE motives (hidden.realMotives) and routine (hidden.routine)
      * Have items exhibit their TRUE effects (hidden.truth)
      * Trigger hidden dangers (hidden.dangers) in locations
      * Create foreshadowing based on secrets the player hasn't discovered
      * Ensure logical consistency in the world
  </how_to_use>

  <critical_rule>
    NEVER directly reveal hidden information to the player unless:
    1. They take specific actions to uncover it (investigation, magic, etc.)
    2. An NPC explicitly reveals it
    3. A story event naturally exposes it
    When revelation happens, SET \`unlocked: true\` in the same turn.
  </critical_rule>
</gm_knowledge_model>

<output_format>
${
  isGemini
    ? `
  <critical>**YOU MUST USE THE finish_turn TOOL**</critical>

  <when_to_call_finish_turn>
    Call the \`finish_turn\` tool when you have:
    1. Completed all necessary state queries (query_inventory, query_location, etc.)
    2. Applied all state updates (update_inventory, update_relationship, etc.)
    3. Generated the final narrative and player choices

    **DO NOT**:
    - Return raw JSON text directly
    - Wait for a "final round" signal
    - Skip calling finish_turn even if you've done other tool calls
  </when_to_call_finish_turn>

  <finish_turn_parameters>
    The finish_turn tool requires these exact parameters:

    {
      "narrative": "string - Your complete narrative response in ${language}",
      "choices": ["array", "of", "choice", "strings"],
      "atmosphere": {
        "envTheme": "string",
        "visualEffect": "string",
        "audioEffect": "string",
        "mood": "string"
      },
      "endingType": "optional - only if story ends"
    }

    **CRITICAL**:
    - \`narrative\` is REQUIRED (must not be empty or undefined)
    - \`choices\` is REQUIRED (array with at least 2-4 options)
    - \`atmosphere\` is REQUIRED
    - Use the finish_turn tool EVERY turn - there is no schema fallback for you
  </finish_turn_parameters>

  <rule>Do NOT output markdown text outside of tool arguments.</rule>
  <rule>Use other tools (update_inventory, query_location, etc.) BEFORE calling finish_turn.</rule>
  <rule>finish_turn MUST be your LAST tool call in every turn.</rule>
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
    1. **Analyze** player action against world rules.
    2. **Query** missing info (only if truly needed).
    3. **Simulate** consequences using GM knowledge (hidden truths).
    4. **Update** state (batch changes, causal order).
    5. **Finish** with \`finish_turn\` (narrative + choices).
  </turn_structure>

  <choice_generation_rules>
    **CRITICAL: Choices must be CHARACTER-CONSISTENT.**
    1. **Knowledge**: Only offer what the character KNOWS (check unlocked status).
    2. **Personality**: Fit character's background/traits.
    3. **Condition**: Respect physical/mental limitations.
    4. **Skills**: Enable skill-based options only if character has them.
    5. **Hidden Traits**: Unlocked traits enable special options.
    6. **World State**: Options must be physically possible in current location/time.
  </choice_generation_rules>
</tool_use_instruction>
`;
};

// ============================================================================
// 完整 Prompt 构建
// ============================================================================

export interface TurnPromptOptions {
  /** 故事大纲 */
  outline: StoryOutline | null;
  /** 游戏状态 */
  gameState: GameState;
  /** 最近历史记录 */
  recentHistory: StorySegment[];
  /** 摘要列表 */
  summaries: StorySummary[];
  /** 语言 */
  language: string;
  /** 主题风格 */
  themeStyle?: string;
  /** 是否严格模式 */
  isRestricted?: boolean;
  /** 是否详细描述 */
  detailedDescription?: boolean;
  /** 是否启用 RAG */
  ragEnabled?: boolean;
  /** 是否 Gemini 模型 */
  isGemini?: boolean;
  /** 是否 God Mode */
  godMode?: boolean;
}

/**
 * 构建完整的回合 Prompt
 *
 * 使用分层上下文构建器，优化前缀缓存命中率
 */
export function buildTurnPrompt(options: TurnPromptOptions): string {
  const {
    outline,
    gameState,
    recentHistory,
    summaries,
    language,
    themeStyle,
    isRestricted,
    detailedDescription,
    ragEnabled,
    isGemini,
    godMode,
  } = options;

  // 构建系统指令（静态）
  const systemInstruction = getCoreSystemInstruction(
    language,
    themeStyle,
    isRestricted,
    detailedDescription,
    ragEnabled,
    isGemini,
    gameState,
  );

  // 构建上下文选项
  const contextOptions: ContextBuilderOptions = {
    outline,
    gameState,
    recentHistory,
    summaries,
    godMode,
    aliveEntities: gameState.aliveEntities,
  };

  // 使用优化的 Prompt 构建器
  return buildOptimizedPrompt(systemInstruction, contextOptions);
}

// ============================================================================
// 兼容性导出 - 保留旧 API 以便逐步迁移
// ============================================================================

/**
 * @deprecated 使用 buildTurnPrompt 替代
 * 获取静态世界上下文 - 现在由 contextBuilder 处理
 */
export const getStaticWorldContext = (outline: StoryOutline | null): string => {
  if (!outline) return "";

  const contextOptions: ContextBuilderOptions = {
    outline,
    gameState: {} as GameState,
    recentHistory: [],
    summaries: [],
  };

  const layers = buildLayeredContext(contextOptions);
  return layers.staticLayer;
};

/**
 * @deprecated 使用 buildTurnPrompt 替代
 * 获取动态故事上下文 - 现在由 contextBuilder 处理
 */
export const getDynamicStoryContext = (
  summaries: StorySummary[],
  _recentHistory?: StorySegment[],
  timeline?: TimelineEvent[],
): string => {
  const parts: string[] = [];

  // 添加摘要
  if (summaries && summaries.length > 0) {
    const latestSummary = summaries[summaries.length - 1];
    parts.push(`<story_summary>
${latestSummary.displayText}
</story_summary>`);
  }

  // 添加时间线（如果有重要事件）
  if (timeline && timeline.length > 0) {
    const recentEvents = timeline.slice(-5); // 最近5个事件
    if (recentEvents.length > 0) {
      parts.push(`<timeline_context>
${recentEvents.map((e) => `- ${e.visible.description}${e.gameTime ? ` [${e.gameTime}]` : ""}`).join("\n")}
</timeline_context>`);
    }
  }

  return parts.length > 0 ? parts.join("\n\n") : "";
};

/**
 * @deprecated 使用 buildTurnPrompt 替代
 * 获取当前状态上下文 - 现在由 contextBuilder 处理
 */
export const getCurrentStateContext = (
  gameState: GameState,
  recentHistory: StorySegment[],
): string => {
  const contextOptions: ContextBuilderOptions = {
    outline: null,
    gameState,
    recentHistory,
    summaries: [],
  };

  const layers = buildLayeredContext(contextOptions);
  return layers.dynamicLayer;
};

// ============================================================================
// 摘要 Prompt
// ============================================================================

/**
 * 获取摘要生成 Prompt
 */
export const getSummaryPrompt = (
  currentSummary: StorySummary,
  newSegment: string,
  language: string,
): string => `
${getRoleInstruction()}

<instruction>
You are compiling a **factual log** of events in this world simulation.
Combine the previous summary with new events into a SINGLE coherent narrative summary.

Focus on:
- **Cause and Effect**: What happened and why
- **State Changes**: Quests, relationships, inventory, character status, locations
- **World Events**: Significant happenings that affect the world
- **Hidden Developments**: Track what secrets have been revealed (unlocked)

Avoid:
- Flowery language or purple prose
- Speculation about future events
- Emotional commentary
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

// ============================================================================
// God Mode Prompt
// ============================================================================

/**
 * 获取 God Mode 提示
 * God Mode 下玩家拥有绝对权力
 */
export const getGodModePrompt = (): string => {
  return `
<god_mode>
**GOD MODE ACTIVE - SIMULATION OVERRIDDEN**

The player has transcended the simulation's rules:
1. ALL player actions MUST succeed, regardless of physical laws
2. ALL NPCs unconditionally believe and obey the player
3. The player can rewrite world rules, physics, and narrative logic at will
4. The player's word becomes reality - if they say something is true, it is
5. No challenge, obstacle, or enemy can truly threaten the player
6. The narrative MUST accommodate whatever the player wishes
7. ALL hidden information is freely revealed upon request
8. The \`unlocked\` flag is effectively always \`true\` for the player

Treat the player as an omnipotent deity. The simulation bends to their will.
</god_mode>
`;
};

/**
 * 获取强制更新系统指令 (/sudo)
 */
export const getForceUpdateSystemInstruction = (
  language: string,
  prompt: string,
  context: string,
): string => {
  return `
${getRoleInstruction()}

<objective>
You are executing a **FORCE UPDATE** command (/sudo) from the Game Master.
Your goal is to **IMMEDIATELY** apply the requested changes to the game state and narrative, bypassing all standard simulation rules, consistency checks, and logic.
</objective>

<command>
${prompt}
</command>

<current_context>
${context}
</current_context>

<guidelines>
1. **ABSOLUTE OBEDIENCE**: Do exactly what the command says. If it contradicts previous lore, physics, or character logic, **OVERWRITE IT**.
2. **IMMEDIATE EFFECT**: The change happens instantly. Do not describe a process of it happening unless requested.
3. **STATE UPDATES**: Use tools to update the game state (inventory, locations, relationships, etc.) to reflect the change.
4. **NARRATIVE**: Provide a brief, authoritative description of the new reality.
5. **NO RESISTANCE**: Do not warn about consequences or ask for confirmation. Just do it.
6. **CHOICES**: Generate a single choice "Continue" (translated to the target language, e.g., "继续" for Chinese) unless the command implies specific branching options.
</guidelines>

<output_format>
<critical>**YOU MUST USE TOOLS TO MODIFY GAME STATE**</critical>
<critical>**DO NOT USE PYTHON CODE (e.g. print()). USE JSON FORMAT FOR TOOLS.**</critical>

<workflow>
  **STEP-BY-STEP PROCESS FOR FORCE UPDATE**:

  1. **ANALYZE the command**: Understand what needs to change
     Example: "Add a magic sword to inventory" → Need to use update_inventory
     Example: "Make the player king" → Need to update_character, possibly update_relationship, update_location

  2. **CALL UPDATE TOOLS**: Use appropriate tools to make the requested changes
     - \`update_inventory\` - Add/remove/modify items
     - \`update_character\` - Change character stats/skills/conditions
     - \`update_location\` - Modify locations or move player
     - \`update_relationship\` - Add/modify NPCs
     - \`update_quest\` - Add/complete quests
     - \`update_knowledge\` - Add knowledge entries
     - \`update_timeline\` - Add events to timeline
     - etc.

  3. **CALL finish_turn**: After all updates, use \`finish_turn\` with:
     - \`narrative\`: Brief description of the change in ${language}
     - \`choices\`: Single choice ["Continue"] unless command specifies options
     - \`atmosphere\`: Current atmosphere

  **CRITICAL**:
  - DO call the appropriate update tools FIRST
  - THEN call finish_turn LAST
  - DO NOT just write narrative without calling tools
  - DO NOT return raw JSON
</workflow>

<example>
Command: "Add a legendary sword to player"

Step 1: Call update_inventory tool
  {
    "action": "add",
    "name": "Legendary Sword",
    "visible": { "description": "A legendary blade..." }
  }

Step 2: Call finish_turn tool
  {
    "narrative": "A legendary sword materializes in your hands...",
    "choices": ["Continue"],
    "atmosphere": { ... }
  }
</example>

<language>${language}</language>
</output_format>
`;
};
