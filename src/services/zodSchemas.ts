/**
 * ============================================================================
 * Zod Schemas - 统一的类型定义和验证
 * ============================================================================
 *
 * 使用 Zod 统一管理所有 AI 生成内容的类型定义，包括：
 * - 直接编译到各 Provider 格式（Gemini/OpenAI/OpenRouter）
 * - TypeScript 类型推导
 * - 运行时验证
 *
 * 避免在多处重复定义相同的类型结构
 */

import { z } from "zod";
import {
  zodToGemini,
  zodToOpenAIResponseFormat,
  zodToOpenAISchema,
} from "./zodCompiler";

// ============================================================================
// 基础类型 Schemas
// ============================================================================

/**
 * 版本化时间戳 Schema
 * 用于准确比较实体修改顺序，替代 Date.now() 的 lastModified
 *
 * 比较规则：
 * 1. 先比较 forkId，较大的表示较新的分支
 * 2. forkId 相同时，比较 turnNumber，较大的表示较新
 */
export const versionedTimestampSchema = z.object({
  forkId: z.number().int().describe("Fork ID when modified."),
  turnNumber: z.number().int().describe("Turn number when modified."),
});

/**
 * 访问时间戳 Schema
 * 用于记录实体最后被访问的时间，支持跨分支比较
 *
 * 比较规则：
 * 1. 先比较 forkId
 * 2. forkId 相同时比较 turnNumber
 * 3. turnNumber 相同时比较 timestamp
 */
export const accessTimestampSchema = z.object({
  forkId: z.number().int().describe("Fork ID when accessed."),
  turnNumber: z.number().int().describe("Turn number when accessed."),
  timestamp: z.number().describe("Epoch timestamp for fine-grained ordering."),
});

/** 可见信息层 - 玩家可以看到的信息 */
export const visibleInfoSchema = z.object({
  description: z.string().describe("Visual or public description."),
  notes: z.string().nullish().describe("Player or public notes."),
});

/** 隐藏信息层 - 只有 GM/AI 知道的真相 */
export const hiddenInfoSchema = z.object({
  truth: z.string().describe("The hidden truth or real nature."),
  secrets: z.array(z.string()).nullish().describe("Hidden secrets."),
});

/**
 * knownBy - 统一“存在性”可见性控制
 *
 * 列出哪些角色（Actor IDs）知道该实体/关系“存在”。
 * 注意：knownBy != unlocked
 * - knownBy: existence (who knows it exists)
 * - unlocked: revelation (whether hidden truth is revealed to the player)
 */
export const knownBySchema = z
  .array(z.string())
  .describe("Actor IDs who know this entity/relationship exists.");

// ============================================================================
// 物品相关 Schemas
// ============================================================================

/** 物品可见层 */
export const inventoryItemVisibleSchema = z.object({
  description: z.string().describe("Visual description of the item."),
  usage: z.string().nullish().describe("How to use the item."),
  observation: z
    .string()
    .nullish()
    .describe("Player's personal notes or observations about the item."),
  sensory: z
    .object({
      texture: z.string().nullish().describe("Tactile feel of the item."),
      weight: z.string().nullish().describe("Perceived weight."),
      smell: z.string().nullish().describe("Scent of the item."),
    })
    .nullish()
    .describe("Sensory details."),
  condition: z
    .string()
    .nullish()
    .describe(
      "Physical state/wear (e.g. 'rusty', 'pristine'). Must be in target language.",
    ),
});

/** 物品隐藏层 */
export const inventoryItemHiddenSchema = z.object({
  truth: z.string().describe("True nature/power of the item."),
  secrets: z
    .array(z.string())
    .nullish()
    .describe("Hidden secrets about the item."),
});

/** 完整物品 Schema */
export const inventoryItemSchema = z.object({
  id: z
    .string()
    .describe(
      "REQUIRED. AI-generated unique ID (any unique string). Examples: 'rusty_sword', 'healing_potion_1'.",
    ),
  knownBy: knownBySchema.describe(
    "Existence visibility: which actors know this item exists.",
  ),
  name: z.string().describe("Name of the item."),
  visible: inventoryItemVisibleSchema,
  hidden: inventoryItemHiddenSchema.nullish(),
  lore: z.string().nullish().describe("Brief lore or history of the item."),
  emotionalWeight: z
    .string()
    .nullish()
    .describe(
      "Sentimental significance: Why does this item matter emotionally? A burden, a memory, a gift?",
    ),
  icon: z.string().nullish().describe("A single emoji representing this item."),
  unlocked: z
    .boolean()
    .nullish()
    .describe(
      "AI DECISION: Set true when hidden truth discovered (examination, analysis, witnessing power). Default false.",
    ),
  unlockReason: z
    .string()
    .nullish()
    .describe(
      "REQUIRED when unlocked=true. Justification for why the hidden truth was revealed.",
    ),
  highlight: z
    .boolean()
    .nullish()
    .describe("True when updated in current turn (for UI). INVISIBLE to AI."),
  createdAt: z
    .number()
    .nullish()
    .describe("Creation timestamp. INVISIBLE to AI."),
  modifiedAt: versionedTimestampSchema
    .nullish()
    .describe("Version-aware modification timestamp {forkId, turnNumber}."),
  lastAccess: accessTimestampSchema
    .nullish()
    .describe(
      "Last access timestamp {forkId, turnNumber, timestamp}. INVISIBLE to AI.",
    ),
  notes: z
    .string()
    .nullish()
    .describe(
      "Writer's notes for consistency, key details, and prompts. AI must ALWAYS query this before writing.",
    ),
});

// ============================================================================
// 地点相关 Schemas
// ============================================================================

/** 视觉主题枚举 */
export const envThemeSchema = z.enum([
  "fantasy",
  "scifi",
  "cyberpunk",
  "horror",
  "mystery",
  "romance",
  "royal",
  "wuxia",
  "demonic",
  "ethereal",
  "modern",
  "gold",
  "villain",
  "sepia",
  "rose",
  "war",
  "sunset",
  "cold",
  "violet",
  "nature",
  "artdeco",
  "intrigue",
  "wasteland",
  "patriotic",
  "cyan",
  "silver",
  "obsidian",
  "obsessive",
  "emerald",
  "ocean",
  "combat",
  "danger",
  "glamour",
  "rgb",
  "stone",
  "heartbreak",
  "interstellar",
  "gothic",
  "academy",
  "apocalypse",
  "steampunk",
  "liminal",
  "foundation",
  "abyssal",
]);

/** 音频氛围枚举 */
export const ambienceSchema = z.enum([
  "cave",
  "city",
  "combat",
  "desert",
  "dungeon",
  "forest",
  "horror",
  "market",
  "mystical",
  "ocean",
  "quiet",
  "rain",
  "scifi",
  "snow",
  "storm",
  "tavern",
  "mountain",
  "swamp",
  "village",
  "temple",
  "castle",
  "ruins",
  "underwater",
  "space",
  "beach",
  "school",
]);

/** 天气特效枚举 */
export const weatherEffectSchema = z.enum([
  "none",
  "rain",
  "snow",
  "fog",
  "embers",
  "flicker",
  "sunny",
  "clear",
  "partly_cloudy",
  "cloudy",
  "overcast",
  "drizzle",
  "heavy_rain",
  "thunderstorm",
  "light_snow",
  "heavy_snow",
  "blizzard",
  "mist",
  "haze",
  "windy",
  "gale",
  "dust_storm",
  "sandstorm",
]);

/** 氛围对象 - 包含视觉主题、音频氛围和天气特效 */
export const atmosphereSchema = z.object({
  envTheme: envThemeSchema.describe(
    "Visual theme (colors/fonts). Must be one of the envTheme enum values.",
  ),
  ambience: ambienceSchema.describe(
    "Audio background/environment. Must be one of the ambience enum values.",
  ),
  weather: weatherEffectSchema
    .nullish()
    .describe("Specific visual weather effect to render."),
});

/** 地点可见层 */
export const locationVisibleSchema = z.object({
  description: z.string().describe("Visual description of the location."),
  environment: z
    .string()
    .nullish()
    .describe(
      "Natural language description of the general environment/atmosphere (e.g., 'A dense, foggy forest with towering obsidian trees').",
    ),
  ambience: z
    .string()
    .nullish()
    .describe(
      "Natural language description of the audio background and mood (e.g., 'The constant drip of water and distant, echoing whispers').",
    ),
  weather: z
    .string()
    .nullish()
    .describe(
      "Natural language description of current weather conditions (e.g., 'A light, shimmering rain that glows in the dark').",
    ),
  knownFeatures: z
    .array(z.string())
    .describe("Known features of the location."),
  resources: z
    .array(z.string())
    .nullish()
    .describe("Gatherable resources or items."),
  atmosphere: atmosphereSchema
    .nullish()
    .describe(
      "System UI atmosphere override (Enums only). AI: MUST ensure consistency with environment/ambience/weather descriptions.",
    ),
  sensory: z
    .object({
      smell: z.string().nullish(),
      sound: z.string().nullish(),
      lighting: z.string().nullish(),
      temperature: z.string().nullish(),
    })
    .nullish()
    .describe("Sensory details of the location."),
  interactables: z
    .array(z.string())
    .nullish()
    .describe("Visible interactive elements."),
});

/** 地点隐藏层 */
export const locationHiddenSchema = z.object({
  fullDescription: z.string().describe("True nature of the location."),
  dangers: z.array(z.string()).nullish().describe("Hidden dangers or traps."),
  hiddenFeatures: z
    .array(z.string())
    .describe("Hidden features not yet discovered."),
  secrets: z.array(z.string()).describe("Location secrets."),
});

/** 完整地点 Schema */
export const locationSchema = z.object({
  id: z
    .string()
    .describe(
      "REQUIRED. AI-generated unique ID (any unique string). Examples: 'cave_entrance', 'royal_palace'.",
    ),
  knownBy: knownBySchema.describe(
    "Existence visibility: which actors know this location exists.",
  ),
  name: z.string().describe("Location name."),
  visible: locationVisibleSchema,
  hidden: locationHiddenSchema.nullish(),
  lore: z.string().nullish().describe("Location history or lore."),
  isVisited: z.boolean().nullish().describe("INVISIBLE to AI."),
  unlocked: z
    .boolean()
    .nullish()
    .describe(
      "AI DECISION: Set true when story context reveals location's secrets.",
    ),
  unlockReason: z
    .string()
    .nullish()
    .describe(
      "REQUIRED when unlocked=true. Evidence for why location secrets were revealed.",
    ),
  icon: z
    .string()
    .nullish()
    .describe("A single emoji representing this location."),
  highlight: z.boolean().nullish().describe("INVISIBLE to AI."),
  createdAt: z.number().nullish().describe("INVISIBLE to AI."),
  discoveredAt: z.number().nullish(),
  modifiedAt: versionedTimestampSchema
    .nullish()
    .describe("Version-aware modification timestamp."),
  lastAccess: accessTimestampSchema
    .nullish()
    .describe("Last access timestamp. INVISIBLE to AI."),
  notes: z
    .string()
    .nullish()
    .describe(
      "Writer's notes for consistency, key details, and prompts. AI must ALWAYS query this before writing.",
    ),
});

// ============================================================================
// 任务相关 Schemas
// ============================================================================

/** 任务可见层 */
export const questVisibleSchema = z.object({
  description: z.string().describe("The apparent objective."),
  objectives: z.array(z.string()).describe("Visible quest objectives."),
});

/** 任务隐藏层 */
export const questHiddenSchema = z.object({
  trueDescription: z
    .string()
    .nullish()
    .describe("The hidden truth or real purpose."),
  trueObjectives: z
    .array(z.string())
    .nullish()
    .describe("True hidden objectives."),
  secretOutcome: z
    .string()
    .nullish()
    .describe("Secret outcome if quest is completed."),
  twist: z
    .string()
    .nullish()
    .describe(
      "Hidden complication or moral dilemma. The quest is never what it seems.",
    ),
});

/** 任务类型 */
export const questTypeSchema = z.enum(["main", "side", "hidden"]);

/** 任务状态 */
export const questStatusSchema = z.enum(["active", "completed", "failed"]);

/** 完整任务 Schema */
export const questSchema = z.object({
  id: z
    .string()
    .describe(
      "REQUIRED. AI-generated unique ID (any unique string). Examples: 'find_missing_heir', 'defeat_dragon'.",
    ),
  knownBy: knownBySchema.describe(
    "Existence visibility: which actors know this quest exists.",
  ),
  title: z.string().describe("Quest title."),
  type: questTypeSchema.describe("Quest type: main, side, or hidden."),
  status: questStatusSchema.nullish().default("active"),
  visible: questVisibleSchema,
  hidden: questHiddenSchema.nullish(),
  unlocked: z
    .boolean()
    .nullish()
    .describe("AI DECISION: Set true when quest's hidden purpose is revealed."),
  unlockReason: z
    .string()
    .nullish()
    .describe(
      "REQUIRED when unlocked=true. Evidence for why quest's hidden purpose was revealed.",
    ),
  icon: z
    .string()
    .nullish()
    .describe("A single emoji representing this quest."),
  highlight: z.boolean().nullish().describe("INVISIBLE to AI."),
  createdAt: z.number().nullish().describe("INVISIBLE to AI."),
  modifiedAt: versionedTimestampSchema
    .nullish()
    .describe("Version-aware modification timestamp."),
  lastAccess: accessTimestampSchema
    .nullish()
    .describe("Last access timestamp. INVISIBLE to AI."),

  notes: z
    .string()
    .nullish()
    .describe(
      "Writer's notes for consistency, key details, and prompts. AI must ALWAYS query this before writing.",
    ),
});

// ============================================================================
// 技能相关 Schemas
// ============================================================================

/** 技能可见层 */
export const skillVisibleSchema = z.object({
  description: z.string().describe("Publicly known description."),
  knownEffects: z.array(z.string()).describe("Known effects of the skill."),
});

/** 技能隐藏层 */
export const skillHiddenSchema = z.object({
  trueDescription: z.string().describe("True nature/power of the skill."),
  hiddenEffects: z
    .array(z.string())
    .describe("Hidden effects not yet discovered."),
  drawbacks: z
    .array(z.string())
    .nullish()
    .describe("Hidden drawbacks or costs."),
});

/** 完整技能 Schema */
export const skillSchema = z.object({
  id: z
    .string()
    .describe(
      "REQUIRED. AI-generated unique ID (any unique string). Examples: 'master_swordplay', 'arcane_knowledge'.",
    ),
  knownBy: knownBySchema.describe(
    "Existence visibility: which actors know this skill exists.",
  ),
  name: z.string().describe("Skill name."),
  level: z.string().describe("Skill level (e.g. Novice, Master)."),
  visible: skillVisibleSchema,
  hidden: skillHiddenSchema.nullish(),
  category: z.string().nullish().describe("Skill category."),
  unlocked: z
    .boolean()
    .nullish()
    .describe(
      "AI DECISION: Set true when skill's hidden nature is understood.",
    ),
  unlockReason: z
    .string()
    .nullish()
    .describe(
      "REQUIRED when unlocked=true. Evidence for why skill's hidden nature was understood.",
    ),
  icon: z
    .string()
    .nullish()
    .describe("A single emoji representing this skill."),
  highlight: z.boolean().nullish(),
  notes: z
    .string()
    .nullish()
    .describe(
      "Writer's notes for consistency, key details, and prompts. AI must ALWAYS query this before writing.",
    ),
});

// ============================================================================
// 状态条件相关 Schemas
// ============================================================================

/** 条件可见层 */
export const conditionVisibleSchema = z.object({
  description: z.string().describe("Visible description of the condition."),
  perceivedSeverity: z
    .string()
    .nullish()
    .describe("How severe it appears to be. Must be in target language."),
});

/** 条件隐藏层 */
export const conditionHiddenSchema = z.object({
  trueCause: z.string().describe("The true cause of this condition."),
  actualSeverity: z.string().nullish().describe("Actual severity level."),
  progression: z
    .string()
    .nullish()
    .describe("How the condition will progress."),
  cure: z.string().nullish().describe("How to cure or remove this condition."),
});

/** 条件效果 */
export const conditionEffectsSchema = z.object({
  visible: z.array(z.string()).describe("Effects the player can see."),
  hidden: z.array(z.string()).describe("Hidden effects only GM knows."),
});

/** 条件类型 */
/** 条件类型 - 用于UI图标和效果判断 */
export const conditionTypeSchema = z.enum([
  "normal",
  "wound",
  "poison",
  "buff",
  "debuff",
  "mental",
  "curse",
  "stun",
  "unconscious",
  "tired",
  "dead",
]);

/** 完整条件 Schema */
export const conditionSchema = z.object({
  id: z
    .string()
    .describe(
      "REQUIRED. AI-generated unique ID (any unique string). Examples: 'poisoned', 'blessed_by_goddess'.",
    ),
  knownBy: knownBySchema.describe(
    "Existence visibility: which actors know this condition exists.",
  ),
  name: z.string().describe("Condition name."),
  type: conditionTypeSchema.describe(
    "Condition type (e.g. wound, poison, buff, debuff, etc.).",
  ),
  visible: conditionVisibleSchema,
  hidden: conditionHiddenSchema.nullish(),
  effects: conditionEffectsSchema,
  severity: z
    .string()
    .nullish()
    .describe("Severity level (e.g. Mild, Severe). Must in target language."),
  startTime: z.string().nullish().describe("When the condition started."),
  unlocked: z
    .boolean()
    .nullish()
    .describe("AI DECISION: Set true when true cause/cure revealed."),
  unlockReason: z
    .string()
    .nullish()
    .describe(
      "REQUIRED when unlocked=true. Evidence for why true cause/cure was revealed.",
    ),
  icon: z
    .string()
    .nullish()
    .describe("A single emoji representing this condition."),
  highlight: z.boolean().nullish(),
});

// ============================================================================
// 知识条目 Schemas
// ============================================================================

/** 知识类别 */
export const knowledgeCategorySchema = z.enum([
  "landscape",
  "history",
  "item",
  "legend",
  "faction",
  "culture",
  "magic",
  "technology",
  "other",
]);

/** 知识可见层 */
export const knowledgeVisibleSchema = z.object({
  description: z.string().describe("What is commonly known about this topic."),
  details: z.string().nullish().describe("Additional details or context."),
});

/** 知识隐藏层 */
export const knowledgeHiddenSchema = z.object({
  fullTruth: z.string().describe("The complete truth (GM knowledge)."),
  misconceptions: z
    .array(z.string())
    .nullish()
    .describe("Common misconceptions."),
  toBeRevealed: z
    .array(z.string())
    .nullish()
    .describe("Info to be revealed later."),
});

/** 完整知识条目 Schema */
export const knowledgeEntrySchema = z.object({
  id: z
    .string()
    .describe(
      "REQUIRED. AI-generated unique ID (any unique string). Examples: 'ancient_prophecy', 'local_folklore'.",
    ),
  knownBy: knownBySchema.describe(
    "Existence visibility: which actors know this knowledge entry exists.",
  ),
  title: z.string().describe("Title of the knowledge entry."),
  category: knowledgeCategorySchema.describe("Category for organization."),
  visible: knowledgeVisibleSchema,
  hidden: knowledgeHiddenSchema.nullish(),
  discoveredAt: z
    .string()
    .nullish()
    .describe("When this knowledge was discovered."),
  relatedTo: z.array(z.string()).nullish().describe("Related entity IDs."),
  unlocked: z
    .boolean()
    .nullish()
    .describe("AI DECISION: Set true when full truth discovered."),
  unlockReason: z
    .string()
    .nullish()
    .describe(
      "REQUIRED when unlocked=true. Evidence for why full truth was discovered.",
    ),
  icon: z
    .string()
    .nullish()
    .describe("A single emoji representing this knowledge entry."),
  highlight: z.boolean().nullish().describe("INVISIBLE to AI."),
  createdAt: z.number().nullish().describe("INVISIBLE to AI."),
  modifiedAt: versionedTimestampSchema
    .nullish()
    .describe("Version-aware modification timestamp."),
  lastAccess: accessTimestampSchema
    .nullish()
    .describe("Last access timestamp. INVISIBLE to AI."),
  notes: z
    .string()
    .nullish()
    .describe(
      "Writer's notes for consistency, key details, and prompts. AI must ALWAYS query this before writing.",
    ),
});

// ============================================================================
// 时间线事件 Schemas
// ============================================================================

/** 时间线事件类别 */
export const timelineEventCategorySchema = z.enum([
  "player_action",
  "npc_action",
  "world_event",
  "consequence",
]);

/** 时间线事件可见层 */
export const timelineEventVisibleSchema = z.object({
  description: z.string().describe("Publicly known description of the event."),
  causedBy: z
    .string()
    .nullish()
    .describe("Publicly known cause or instigator."),
});

/** 时间线事件隐藏层 */
export const timelineEventHiddenSchema = z.object({
  trueDescription: z
    .string()
    .describe("The true nature of the event (GM knowledge)."),
  trueCausedBy: z.string().nullish().describe("The real instigator or cause."),
  consequences: z
    .array(z.string())
    .nullish()
    .describe("Hidden consequences or future implications."),
});

/** 完整时间线事件 Schema */
export const timelineEventSchema = z.object({
  id: z.string().describe("Unique ID for the event. Format: evt:N"),
  knownBy: knownBySchema.describe(
    "Existence visibility: which actors know this timeline event exists.",
  ),
  name: z
    .string()
    .describe(
      "Short, memorable name for the event (e.g. 'The Great Fire', 'First Encounter'). Used for display and reference.",
    ),
  gameTime: z.string().describe("When the event happened in game time."),
  category: timelineEventCategorySchema.describe("Category of the event."),
  visible: timelineEventVisibleSchema,
  hidden: timelineEventHiddenSchema.nullish(),
  involvedEntities: z
    .array(z.string())
    .nullish()
    .describe("IDs of involved entities."),
  chainId: z.string().nullish().describe("Link to a CausalChain."),
  unlocked: z
    .boolean()
    .nullish()
    .describe(
      "AI DECISION: Set true when event's true cause/consequences uncovered.",
    ),
  unlockReason: z
    .string()
    .nullish()
    .describe(
      "REQUIRED when unlocked=true. Evidence for why event's true cause/consequences were uncovered.",
    ),
  icon: z
    .string()
    .nullish()
    .describe("A single emoji representing this event."),
  lastAccess: accessTimestampSchema
    .nullish()
    .describe("Last access timestamp. INVISIBLE to AI."),
  range: z
    .object({
      start: z.number(),
      end: z.number(),
    })
    .nullish(),
  highlight: z.boolean().nullish(),
  notes: z
    .string()
    .nullish()
    .describe(
      "Writer's notes for consistency, key details, and prompts. AI must ALWAYS query this before writing.",
    ),
});

// ============================================================================
// 因果链 Schemas
// ============================================================================

/** 待触发的后果 */
export const pendingConsequenceSchema = z.object({
  id: z.string().describe("Unique ID for tracking."),
  description: z.string().describe("What could happen if triggered."),
  triggerCondition: z
    .string()
    .nullish()
    .describe(
      "WHEN to trigger this consequence. Use narrative conditions (e.g., 'when the player is alone at night', 'during the next combat', 'when player returns to the tavern', 'after player learns the secret'). AI judges when condition is met and fires the consequence. NOT a turn counter.",
    ),
  severity: z
    .string()
    .nullish()
    .describe(
      "How severe/urgent is this consequence? Options: 'imminent' (trigger ASAP when condition met), 'delayed' (can wait for dramatic moment), 'background' (ambient pressure, no rush).",
    ),
  triggered: z
    .boolean()
    .nullish()
    .describe("True once consequence has been triggered."),
  triggeredAtTurn: z
    .number()
    .int()
    .nullish()
    .describe(
      "Turn number when triggered (for logging, not for triggering logic).",
    ),
  knownBy: knownBySchema.describe(
    "Existence visibility: which actors know this consequence exists (e.g., only GM/NPCs until revealed).",
  ),
});

/** 根本原因 */
export const rootCauseSchema = z.object({
  eventId: z.string().describe("ID of the root cause event."),
  description: z.string().describe("Description of the root cause."),
});

/** 因果链状态 */
export const causalChainStatusSchema = z.enum([
  "active",
  "resolved",
  "interrupted",
]);

/** 完整因果链 Schema */
export const causalChainSchema = z.object({
  chainId: z.string().describe("Format: chain:N"),
  knownBy: knownBySchema.describe(
    "Existence visibility: which actors know this causal chain exists.",
  ),
  rootCause: rootCauseSchema,
  events: z
    .array(timelineEventSchema)
    .nullish()
    .describe("Events in this chain."),
  status: causalChainStatusSchema.describe("Current status of the chain."),
  pendingConsequences: z
    .array(pendingConsequenceSchema)
    .nullish()
    .describe(
      "Future consequences. AI decides when to trigger them based on story.",
    ),
});

// ============================================================================
// 阵营 Schemas
// ============================================================================

/** 阵营成员 */
export const factionMemberSchema = z.object({
  name: z.string().describe("Name of the member."),
  title: z.string().nullish().describe("Optional title or role."),
});

/** 阵营关系 */
export const factionRelationSchema = z.object({
  target: z.string().describe("Target faction name."),
  status: z.string().describe("NPC status."),
});

/** 阵营可见层 */
export const factionVisibleSchema = z.object({
  agenda: z.string().describe("Public agenda/reputation."),
  members: z
    .array(factionMemberSchema)
    .nullish()
    .describe("Publicly known members."),
  influence: z.string().nullish().describe("Perceived influence description."),
  relations: z
    .array(factionRelationSchema)
    .nullish()
    .describe("Public alliances/rivalries."),
});

/** 阵营隐藏层 */
export const factionHiddenSchema = z.object({
  agenda: z.string().describe("Secret agenda/corruption."),
  members: z
    .array(factionMemberSchema)
    .nullish()
    .describe("Secret members/leaders."),
  influence: z.string().nullish().describe("True influence description."),
  internalConflict: z
    .string()
    .nullish()
    .describe(
      "Schisms, rivalries, or rotting foundations within the faction. No group is monolithic.",
    ),
  relations: z
    .array(factionRelationSchema)
    .nullish()
    .describe("Secret alliances/rivalries."),
});

/** 完整阵营 Schema */
export const factionSchema = z.object({
  id: z
    .string()
    .describe(
      "REQUIRED. AI-generated unique ID (any unique string). Examples: 'thieves_guild', 'royal_court', 'fac_3'.",
    ),
  knownBy: knownBySchema.describe(
    "Existence visibility: which actors know this faction exists.",
  ),
  name: z.string().describe("Faction name."),
  visible: factionVisibleSchema,
  hidden: factionHiddenSchema,
  unlocked: z
    .boolean()
    .nullish()
    .describe("True when secret agenda is revealed."),
  unlockReason: z
    .string()
    .nullish()
    .describe(
      "REQUIRED when unlocked=true. Evidence for why faction's secret agenda was revealed.",
    ),
  icon: z
    .string()
    .nullish()
    .describe("A single emoji representing this faction."),
  highlight: z.boolean().nullish(),
  notes: z
    .string()
    .nullish()
    .describe(
      "Writer's notes for consistency, key details, and prompts. AI must ALWAYS query this before writing.",
    ),
});

// ============================================================================
// 角色属性 Schemas
// ============================================================================

/** 角色属性颜色 */
export const attributeColorSchema = z.enum([
  "red",
  "blue",
  "green",
  "yellow",
  "purple",
  "gray",
]);

/** 角色属性 */
export const characterAttributeSchema = z.object({
  label: z
    .string()
    .describe("Name of attribute (e.g. Health, Sanity, Credits)."),
  value: z.number().int().describe("Current value."),
  maxValue: z.number().int().describe("Maximum value."),
  color: attributeColorSchema.describe("Visual color hint."),
  icon: z
    .string()
    .nullish()
    .describe("A single emoji representing this attribute."),
});

/** 隐藏特质 */
export const hiddenTraitSchema = z.object({
  id: z
    .string()
    .describe(
      "REQUIRED. AI-generated unique ID (any unique string). Examples: 'fear_of_darkness', 'hidden_nobility', 'trait_1'.",
    ),
  knownBy: knownBySchema.describe(
    "Existence visibility: which actors know this trait exists.",
  ),
  name: z.string().describe("Trait name."),
  description: z.string().describe("Description of the trait."),
  effects: z.array(z.string()).describe("Effects when triggered."),
  triggerConditions: z
    .array(z.string())
    .nullish()
    .describe("Conditions to trigger the trait."),
  unlocked: z
    .boolean()
    .describe(
      "Set to true when the triggerConditions are met and the trait is revealed to the player.",
    ),
  unlockReason: z
    .string()
    .nullish()
    .describe(
      "REQUIRED when unlocked=true. Evidence for why the hidden trait was revealed.",
    ),
  icon: z
    .string()
    .nullish()
    .describe("A single emoji representing this trait."),
  highlight: z.boolean().nullish(),
});

// ============================================================================
// Actor / Relationship / Placeholder Schemas (VFS source-of-truth)
// ============================================================================

export const actorKindSchema = z.enum(["player", "npc"]);

export const entityRefSchema = z.object({
  kind: z.enum(["character", "placeholder"]).describe("Reference target kind."),
  id: z.string().describe("Target ID."),
});

export const relationKindSchema = z.enum(["perception", "attitude"]);

const relationBaseSchema = z.object({
  id: z
    .string()
    .describe(
      "REQUIRED. AI-generated unique relation ID scoped to the owning actor (any unique string).",
    ),
  to: entityRefSchema.describe("Directed edge target."),
  knownBy: knownBySchema.describe(
    "Existence visibility: which actors know this relationship exists.",
  ),
  unlocked: z
    .boolean()
    .nullish()
    .describe(
      "AI DECISION: Set true only when the player has definitive proof of the hidden truth (e.g., confession, mind-reading, hard evidence). Default false.",
    ),
  unlockReason: z
    .string()
    .nullish()
    .describe(
      "REQUIRED when unlocked=true. Evidence for why the hidden truth was revealed.",
    ),
});

export const relationPerceptionSchema = relationBaseSchema.extend({
  kind: z.literal("perception"),
  visible: z
    .object({
      description: z
        .string()
        .describe(
          "Objective, observable impression (NO protagonist mind-reading). Must be evidence-based.",
        ),
      evidence: z
        .array(z.string())
        .nullish()
        .describe("Concrete observations supporting the impression."),
    })
    .strict()
    .describe("Player-visible perception record."),
  // Perception MUST NOT include affinity numbers; hidden layer is omitted by design.
});

export const relationAttitudeSchema = relationBaseSchema.extend({
  kind: z.literal("attitude"),
  visible: z
    .object({
      signals: z
        .array(z.string())
        .nullish()
        .describe(
          "Observable surface signals the protagonist can notice (tone, distance, actions). No numeric affinity.",
        ),
      reputationTag: z
        .string()
        .nullish()
        .describe(
          "Coarse-grained surface tag like '友好/疏远/警惕' (optional).",
        ),
      claimedIntent: z
        .string()
        .nullish()
        .describe("What the NPC claims or performs publicly (may be false)."),
    })
    .strict()
    .describe("Player-visible surface attitude signals."),
  hidden: z
    .object({
      affinity: z
        .number()
        .int()
        .min(0)
        .max(100)
        .nullish()
        .describe(
          "TRUE affinity score (0-100). MUST be in hidden by default; do not mirror to visible.",
        ),
      impression: z
        .string()
        .nullish()
        .describe("NPC's true impression of the target."),
      observation: z
        .string()
        .nullish()
        .describe("NPC's observations of the protagonist's behavior/knowledge."),
      ambivalence: z
        .string()
        .nullish()
        .describe("Why they might hate AND love the target."),
      transactionalBenefit: z
        .string()
        .nullish()
        .describe("What do they objectively gain from the relationship?"),
      motives: z
        .string()
        .nullish()
        .describe("True motives driving their behavior."),
      currentThought: z
        .string()
        .nullish()
        .describe("Inner monologue (GM truth)."),
    })
    .strict()
    .nullish()
    .describe("GM-only true attitude."),
});

export const relationEdgeSchema = z.discriminatedUnion("kind", [
  relationPerceptionSchema,
  relationAttitudeSchema,
]);

export const actorVisibleSchema = z.object({
  name: z.string().describe("Name the protagonist knows."),
  title: z.string().nullish().describe("Surface title/role (player-facing)."),
  age: z.string().nullish().describe("Apparent age (player-facing)."),
  profession: z.string().nullish().describe("Surface profession/role."),
  background: z.string().nullish().describe("Surface background (player-facing)."),
  race: z
    .string()
    .nullish()
    .describe(
      "Race/species + gender combined when relevant (player-facing).",
    ),
  attributes: z
    .array(characterAttributeSchema)
    .nullish()
    .describe("Player-facing attributes/stats (optional)."),
  description: z
    .string()
    .nullish()
    .describe("Public perception / observable description."),
  appearance: z.string().nullish().describe("Observable appearance details."),
  status: z
    .string()
    .nullish()
    .describe("What the protagonist believes they are doing (surface)."),
  roleTag: z
    .string()
    .nullish()
    .describe("Role tag (e.g. Merchant, Rival, Guard Captain)."),
  voice: z.string().nullish(),
  mannerism: z.string().nullish(),
  mood: z.string().nullish(),
});

export const actorHiddenSchema = z.object({
  trueName: z.string().nullish().describe("True name (GM truth)."),
  realPersonality: z.string().nullish().describe("True personality (GM truth)."),
  realMotives: z.string().nullish().describe("True motives (GM truth)."),
  routine: z.string().nullish().describe("Daily routine (GM truth)."),
  currentThought: z.string().nullish().describe("Inner monologue (GM truth)."),
  secrets: z.array(z.string()).nullish().describe("Secrets (GM truth)."),
  status: z
    .string()
    .nullish()
    .describe("What they are ACTUALLY doing right now (GM truth)."),
});

export const actorProfileSchema = z.object({
  id: z
    .string()
    .describe(
      "REQUIRED. Unique actor ID. Player must be 'char:player'. NPC IDs should be stable.",
    ),
  kind: actorKindSchema.describe("Actor kind: player or npc."),
  currentLocation: z.string().describe("Current location ID."),
  knownBy: knownBySchema.describe(
    "Existence visibility: which actors know this character exists.",
  ),
  visible: actorVisibleSchema,
  hidden: actorHiddenSchema.nullish(),
  relations: z
    .array(relationEdgeSchema)
    .default([])
    .describe("Directed relationships originating from this actor."),
  unlocked: z
    .boolean()
    .nullish()
    .describe(
      "AI DECISION: Set true only when the player's view is allowed to see hidden fields for this actor.",
    ),
  unlockReason: z
    .string()
    .nullish()
    .describe("REQUIRED when unlocked=true."),
  icon: z.string().nullish().describe("A single emoji representing this actor."),
  highlight: z.boolean().nullish().describe("INVISIBLE to AI."),
  createdAt: z.number().nullish().describe("INVISIBLE to AI."),
  modifiedAt: versionedTimestampSchema
    .nullish()
    .describe("Version-aware modification timestamp."),
  lastAccess: accessTimestampSchema
    .nullish()
    .describe("Last access timestamp. INVISIBLE to AI."),
  notes: z
    .string()
    .nullish()
    .describe(
      "Writer's notes for consistency, key details, and prompts. AI must ALWAYS query this before writing.",
    ),
});

export const placeholderSchema = z.object({
  id: z
    .string()
    .describe("REQUIRED. Unique placeholder ID (any unique string)."),
  label: z
    .string()
    .describe("A short label the protagonist can reference (surface name)."),
  knownBy: knownBySchema.describe(
    "Existence visibility: which actors know this placeholder exists.",
  ),
  visible: z.object({
    description: z
      .string()
      .describe("Player-visible description (objective, evidence-based)."),
  }),
  hidden: z
    .object({
      truth: z.string().nullish().describe("GM-only truth."),
      hooks: z.array(z.string()).nullish().describe("GM-only narrative hooks."),
    })
    .nullish(),
  resolvedCharacterId: z
    .string()
    .nullish()
    .describe("If resolved into a concrete character, store actor ID here."),
  unlocked: z.boolean().nullish().describe("AI DECISION: revelation flag."),
  unlockReason: z.string().nullish().describe("REQUIRED when unlocked=true."),
});

/** 角色档案（不包含 skills/conditions/hiddenTraits；它们以分文件形式存储） */
export const characterProfileSchema = z.object({
  name: z.string().describe("Name of the protagonist."),
  title: z.string().describe("Starting Class/Role/Title."),
  status: z.string().nullish().describe("Initial condition (e.g. Healthy, Amnesiac)."),
  attributes: z.array(characterAttributeSchema).default([]).describe("Character attributes."),
  appearance: z.string().nullish().describe("Detailed physical appearance."),
  age: z.string().nullish().describe("Character's age (e.g. '25', 'Unknown', 'Ancient')."),
  profession: z.string().nullish().describe("Character's occupation or class."),
  background: z.string().nullish().describe("Brief life story and background."),
  race: z
    .string()
    .nullish()
    .describe(
      "The character's race AND gender combined (e.g. 'Human Male', 'Female Elf', 'Male Dwarf', 'Female Orc'). CRITICAL: Include gender to ensure consistent pronoun usage throughout the narrative.",
    ),
  psychology: z
    .object({
      coreTrauma: z.string().describe("Past failure/trauma driving them."),
      copingMechanism: z.string().describe("How they deal with pain."),
      internalContradiction: z.string().describe("Want vs Need conflict."),
    })
    .nullish()
    .describe("Psychological depth profile."),
  currentLocation: z
    .string()
    .nullish()
    .describe("The protagonist's current location name."),
});

/** 完整角色状态 Schema */
export const characterStatusSchema = z.object({
  name: z.string().describe("Name of the protagonist."),
  title: z.string().describe("Starting Class/Role/Title."),
  status: z.string().describe("Initial condition (e.g. Healthy, Amnesiac)."),
  attributes: z
    .array(characterAttributeSchema)
    .describe("Character attributes."),
  skills: z.array(skillSchema).describe("Character skills."),
  conditions: z.array(conditionSchema).describe("Active conditions."),
  hiddenTraits: z
    .array(hiddenTraitSchema)
    .nullish()
    .describe("Hidden personality traits."),
  appearance: z.string().describe("Detailed physical appearance."),
  age: z
    .string()
    .describe("Character's age (e.g. '25', 'Unknown', 'Ancient')."),
  profession: z.string().describe("Character's occupation or class."),
  background: z.string().describe("Brief life story and background."),
  race: z
    .string()
    .describe(
      "The character's race AND gender combined (e.g. 'Human Male', 'Female Elf', 'Male Dwarf', 'Female Orc'). CRITICAL: Include gender to ensure consistent pronoun usage throughout the narrative.",
    ),
  psychology: z
    .object({
      coreTrauma: z.string().describe("Past failure/trauma driving them."),
      copingMechanism: z.string().describe("How they deal with pain."),
      internalContradiction: z.string().describe("Want vs Need conflict."),
    })
    .nullish()
    .describe("Psychological depth profile."),
  currentLocation: z
    .string()
    .describe("The protagonist's current location name."),
});

// ============================================================================
// 世界设定 Schemas
// ============================================================================

/** 世界设定可见层 */
export const worldSettingVisibleSchema = z.object({
  description: z.string().describe("Common knowledge about the world."),
  rules: z
    .string()
    .nullish()
    .describe("Known rules or laws of the world (magic, physics, society)."),
});

/** 世界设定隐藏层 */
export const worldSettingHiddenSchema = z.object({
  hiddenRules: z
    .string()
    .nullish()
    .describe("Secret rules or laws unknown to most."),
  secrets: z
    .array(z.string())
    .nullish()
    .describe("World-level secrets and hidden truths."),
});

/** 世界设定 */
export const worldSettingSchema = z.object({
  visible: worldSettingVisibleSchema.describe(
    "Publicly known world information.",
  ),
  hidden: worldSettingHiddenSchema.describe("Secret truths about the world."),
  history: z.string().describe("Ancient events that shape the present."),
});

/** 主要目标可见层 */
export const mainGoalVisibleSchema = z.object({
  description: z.string().describe("The apparent main motivation or task."),
  conditions: z.string().describe("Known conditions for achieving the goal."),
});

/** 主要目标隐藏层 */
export const mainGoalHiddenSchema = z.object({
  trueDescription: z
    .string()
    .describe("The hidden true nature or purpose of the goal."),
  trueConditions: z.string().describe("Secret conditions for the true goal."),
});

/** 主要目标 */
export const mainGoalSchema = z.object({
  visible: mainGoalVisibleSchema.describe("The apparent goal."),
  hidden: mainGoalHiddenSchema.describe(
    "The hidden event logic or true nature.",
  ),
});

// ============================================================================
// 故事大纲 Schema
// ============================================================================

/** 故事大纲 Schema (完整版 - 用于类型定义和最终验证) */
export const actorBundleSchema = z.object({
  profile: actorProfileSchema.describe(
    "Actor profile (dual-layer: visible vs hidden).",
  ),
  skills: z.array(skillSchema).default([]).describe("Actor skills."),
  conditions: z
    .array(conditionSchema)
    .default([])
    .describe("Actor conditions/buffs."),
  traits: z
    .array(hiddenTraitSchema)
    .default([])
    .describe("Actor traits."),
  inventory: z
    .array(inventoryItemSchema)
    .default([])
    .describe("Actor inventory items (instances)."),
});

/** 故事大纲 Schema (Actor-first; no legacy NPC/inventory globals) */
export const storyOutlineSchema = z.object({
  title: z.string().describe("A creative title for the adventure."),
  initialTime: z
    .string()
    .describe(
      "The starting time of the story (e.g., 'Year 2024', 'Day 1', 'The 3rd Era').",
    ),
  premise: z.string().describe("The inciting incident and setting setup."),
  narrativeScale: z
    .enum(["epic", "intimate", "balanced"])
    .nullish()
    .describe(
      "The scale of the narrative. 'epic' for world-ending stakes, 'intimate' for personal focus, 'balanced' for middle ground.",
    ),
  mainGoal: mainGoalSchema.describe("The primary driving force of the story."),
  worldSetting: worldSettingSchema.describe("Dual-layer world setting."),

  // Actors (player + NPCs)
  player: actorBundleSchema.describe("The player actor bundle."),
  npcs: z.array(actorBundleSchema).describe("Initial NPC actor bundles (1-2)."),
  placeholders: z
    .array(placeholderSchema)
    .default([])
    .describe("Unspawned referenced entities (placeholders)."),

  // World entities
  quests: z
    .array(questSchema)
    .describe("Initial quests (at least one main quest is required)."),
  factions: z.array(factionSchema).describe("Major power groups or factions."),
  locations: z
    .array(locationSchema.omit({ isVisited: true, createdAt: true }))
    .describe("Initial locations with full details."),
  knowledge: z
    .array(knowledgeEntrySchema)
    .describe("Initial knowledge entries about the world."),
  timeline: z
    .array(timelineEventSchema)
    .describe("Initial timeline events representing the backstory."),
  initialAtmosphere: atmosphereSchema.describe(
    "Initial atmosphere settings with visual theme and audio ambience.",
  ),

  // Phase 9: Opening Narrative
  openingNarrative: z
    .object({
      narrative: z.string().describe("The opening story text."),
      choices: z
        .array(
          z.object({
            text: z.string().describe("Choice text."),
            consequence: z
              .string()
              .nullish()
              .describe("Brief consequence hint."),
          }),
        )
        .describe("Initial choices for the player."),
      atmosphere: atmosphereSchema.nullish().describe("Override atmosphere."),
    })
    .nullish()
    .describe("Opening narrative generated in Phase 9."),

  // Unlocked flags - set by AI when player discovers hidden info
  worldSettingUnlocked: z
    .boolean()
    .nullish()
    .describe("True when worldSetting.hidden is revealed."),
  mainGoalUnlocked: z
    .boolean()
    .nullish()
    .describe("True when mainGoal.hidden is revealed."),
});

// ============================================================================
// 分阶段故事大纲 Schemas (用于规避 Gemini schema 状态限制)
// ============================================================================

/**
 * Phase 0: 图片解析 (仅当用户上传图片时使用)
 * 分析用户上传的图片，生成与主题结构一致的世界背景数据
 * 输出将用于增强 Phase 1 的世界观构建
 */
export const outlinePhase0Schema = z.object({
  // 核心世界观描述 - 与 themes.json 的 worldSetting 对应
  worldSetting: z
    .string()
    .describe(
      "A rich description of the world suggested by the image (3-5 sentences). Include: geography, era/technology level, social structure, and any magical/supernatural elements. This should read like a theme's worldSetting.",
    ),

  // 叙事风格 - 与 themes.json 的 narrativeStyle 对应
  narrativeStyle: z
    .string()
    .describe(
      "The narrative tone and style suggested by the image (2-3 sentences). Example: 'Dark and atmospheric. Focus on cosmic horror and the insignificance of humanity. Describe environments with oppressive detail.'",
    ),

  // 背景模板 - 与 themes.json 的 backgroundTemplate 对应
  backgroundTemplate: z
    .string()
    .describe(
      "A story background template with [placeholders] inspired by the image (2-3 sentences). Example: 'In the ruins of [Ancient Kingdom], you are a [Role] seeking [Goal]. The [Threat] looms on the horizon.'",
    ),

  // 建议的故事标题
  suggestedTitle: z
    .string()
    .describe(
      "A creative, evocative title for the adventure inspired by the image. Should hint at the themes and atmosphere.",
    ),

  // 开场场景描述 - 将作为 Phase 9 的参考
  openingSceneDescription: z
    .string()
    .describe(
      "A vivid description of the opening scene based on the image (2-3 sentences). This will inform the opening narrative in Phase 9.",
    ),

  // 主要视觉元素
  visualElements: z
    .array(z.string())
    .describe(
      "Key visual elements from the image that should appear in the story (e.g., 'crumbling Gothic cathedral', 'blood-red moon', 'figure in tattered robes').",
    ),

  // 建议的环境主题
  suggestedEnvTheme: z
    .enum([
      "fantasy",
      "scifi",
      "cyberpunk",
      "horror",
      "mystery",
      "romance",
      "royal",
      "wuxia",
      "demonic",
      "ethereal",
      "modern",
      "gold",
      "villain",
      "sepia",
      "rose",
      "war",
      "sunset",
      "cold",
      "violet",
      "nature",
      "artdeco",
      "intrigue",
      "wasteland",
      "patriotic",
      "cyan",
      "silver",
      "obsidian",
    ])
    .describe("The visual theme most appropriate for the image."),

  // 建议的音频氛围
  suggestedAmbience: z
    .enum([
      "cave",
      "city",
      "combat",
      "desert",
      "dungeon",
      "forest",
      "horror",
      "market",
      "mystical",
      "ocean",
      "quiet",
      "rain",
      "scifi",
      "snow",
      "storm",
      "tavern",
      "mountain",
      "night",
      "temple",
      "festival",
      "space",
      "river",
      "hell",
    ])
    .describe("The audio ambience most appropriate for the image."),

  // 主角在场景中的角色提示
  protagonistHint: z
    .string()
    .nullish()
    .describe(
      "If a character is visible in the image, describe their apparent role, situation, or state. This will inform Phase 2.",
    ),

  // 时间设定提示
  timePeriodHint: z
    .string()
    .nullish()
    .describe(
      "The time period or era suggested by the image (e.g., 'Ancient medieval', 'Post-apocalyptic future', 'Year 3024').",
    ),
});

/**
 * Phase 1: 世界基础设定
 * 包含故事的基本框架：标题、前提、世界观、时间、主要目标
 */
export const outlinePhase1Schema = z.object({
  title: z.string().describe("A creative title for the adventure."),
  initialTime: z
    .string()
    .describe(
      "The starting time of the story (e.g., 'Year 2024', 'Day 1', 'The 3rd Era').",
    ),
  premise: z
    .string()
    .describe("The inciting incident and setting setup (2-3 paragraphs)."),
  narrativeScale: z
    .enum(["epic", "intimate", "balanced"])
    .describe(
      "The scale of the narrative. 'epic' for world-ending stakes and grand conflicts, 'intimate' for personal/relationship focus and daily life, 'balanced' for personal stakes with wider implications.",
    ),
  worldSetting: worldSettingSchema.describe(
    "Dual-layer world setting with visible and hidden truths.",
  ),
  mainGoal: mainGoalSchema.describe("The primary driving force of the story."),
});

/**
 * Phase 2: 主角角色
 * 完整的角色信息
 */
export const outlinePhase2Schema = z.object({
  player: actorBundleSchema.describe(
    "The player actor bundle (profile + skills/conditions/traits + inventory). Player id MUST be 'char:player'.",
  ),
});

/**
 * Phase 3: 地点
 * 初始地点
 */
export const outlinePhase3Schema = z.object({
  locations: z
    .array(locationSchema.omit({ isVisited: true, createdAt: true }))
    .describe(
      "1-2 initial locations with detailed visible and hidden layers. Each MUST have a unique 'id' field.",
    ),
});

/**
 * Phase 4: 阵营
 * 主要势力
 */
export const outlinePhase4Schema = z.object({
  factions: z
    .array(factionSchema)
    .describe(
      "2-3 major power groups with visible and hidden agendas. Each MUST have a unique 'id' field.",
    ),
});

/**
 * Phase 5: 关系 (NPC)
 * NPC关系
 */
export const outlinePhase5Schema = z.object({
  npcs: z
    .array(actorBundleSchema)
    .describe(
      "1-2 initial NPC actor bundles. Each profile.kind MUST be 'npc'. Each profile MUST include relations (NPC->player attitude, and optionally NPC<->NPC).",
    ),
  placeholders: z
    .array(placeholderSchema)
    .default([])
    .describe(
      "Optional placeholders referenced by relations (unspawned entities).",
    ),
  playerPerceptions: z
    .array(relationPerceptionSchema)
    .default([])
    .describe(
      "Player->NPC perception edges (objective, evidence-based). These will be merged into player.profile.relations.",
    ),
});

/**
 * Phase 6: 任务
 * 初始任务
 */
export const outlinePhase6Schema = z.object({
  quests: z
    .array(questSchema)
    .describe(
      "1-2 initial quests (at least one main quest). Include visible and hidden objectives.",
    ),
});

/**
 * Phase 7: 知识
 * 世界知识
 */
export const outlinePhase7Schema = z.object({
  knowledge: z
    .array(knowledgeEntrySchema)
    .describe(
      "2-3 initial knowledge entries about the world. Each MUST have a unique 'id' field.",
    ),
});

/**
 * Phase 8: 时间线与氛围
 * 时间线事件和初始氛围
 */
export const outlinePhase8Schema = z.object({
  timeline: z
    .array(timelineEventSchema)
    .describe("3-5 backstory timeline events with visible and hidden layers."),
  initialAtmosphere: atmosphereSchema.describe(
    "Initial atmosphere with visual theme (envTheme) and audio ambience.",
  ),
});

/**
 * Phase 9: Opening Narrative
 * The initial story segment that establishes the scene
 */
export const outlinePhase9Schema = z.object({
  openingNarrative: z.object({
    narrative: z
      .string()
      .describe(
        "The opening story text (2-4 paragraphs). Establish the scene vividly. Use second person perspective.",
      ),
    choices: z
      .array(
        z.object({
          text: z.string().describe("Choice text for this action option."),
          consequence: z
            .string()
            .nullish()
            .describe("Brief hint about likely consequence. Can be omitted."),
        }),
      )
      .min(2)
      .max(4)
      .describe("2-4 initial choices for the player's first action."),
    atmosphere: atmosphereSchema
      .nullish()
      .describe("Override initial atmosphere if the opening scene differs."),
  }),
});

/** 分阶段 Schema 类型定义 */
export type OutlinePhase0 = z.infer<typeof outlinePhase0Schema>;
export type OutlinePhase1 = z.infer<typeof outlinePhase1Schema>;
export type OutlinePhase2 = z.infer<typeof outlinePhase2Schema>;
export type OutlinePhase3 = z.infer<typeof outlinePhase3Schema>;
export type OutlinePhase4 = z.infer<typeof outlinePhase4Schema>;
export type OutlinePhase5 = z.infer<typeof outlinePhase5Schema>;
export type OutlinePhase6 = z.infer<typeof outlinePhase6Schema>;
export type OutlinePhase7 = z.infer<typeof outlinePhase7Schema>;
export type OutlinePhase8 = z.infer<typeof outlinePhase8Schema>;
export type OutlinePhase9 = z.infer<typeof outlinePhase9Schema>;

// Note: PartialStoryOutline is now defined in types.ts to support GameState integration
// The phase types above are re-exported for type-safe phase result handling

// ============================================================================
// 摘要 Schemas
// ============================================================================

/** 摘要可见层 */
export const summaryVisibleSchema = z.object({
  narrative: z.string().describe("Narrative summary from player perspective."),
  majorEvents: z
    .array(z.string())
    .describe("List of major events player witnessed."),
  characterDevelopment: z
    .string()
    .describe("Character development from player's view."),
  worldState: z.string().describe("World state as player understands it."),
});

/** 摘要隐藏层 */
export const summaryHiddenSchema = z.object({
  truthNarrative: z
    .string()
    .describe("Objective truth narrative of what really happened."),
  hiddenPlots: z
    .array(z.string())
    .describe("Hidden plots developing in the background."),
  npcActions: z
    .array(z.string())
    .describe("NPC actions player didn't witness."),
  worldTruth: z.string().describe("Real state of the world."),
  unrevealed: z
    .array(z.string())
    .describe("Secrets not yet revealed to player."),
});

/** 故事摘要 Schema */
export const storySummarySchema = z.object({
  id: z.number().int().nullish(),
  displayText: z
    .string()
    .describe(
      "Concise 2-3 sentence summary for UI display (visible layer only). MUST be in the language of the story.",
    ),
  visible: summaryVisibleSchema,
  hidden: summaryHiddenSchema,
  timeRange: z
    .object({
      from: z.string(),
      to: z.string(),
    })
    .nullish(),
  nodeRange: z
    .object({
      fromIndex: z.number().int(),
      toIndex: z.number().int(),
    })
    .nullish(),
});

// ============================================================================
// 游戏响应 Schema (AI 回合输出)
// ============================================================================

/** 游戏响应 Schema */
export const gameResponseSchema = z.object({
  narrative: z
    .string()
    .describe(
      "The main story segment text. Write in coherent, flowing paragraphs.",
    ),
  choices: z
    .array(
      z.object({
        text: z.string().describe("The text of the choice."),
        consequence: z
          .string()
          .nullish()
          .describe(
            "A brief hint about the likely consequence of this choice. Can be null or omitted if no hint is needed.",
          ),
      }),
    )
    .min(2)
    .max(4)
    .describe("2-4 options for the player's next action."),
  atmosphere: atmosphereSchema
    .nullish()
    .describe("Atmosphere settings (envTheme and ambience)."),
  narrativeTone: z
    .string()
    .nullish()
    .describe(
      "The tone of the narrative (e.g. 'suspenseful', 'cheerful', 'melancholy'). Can be null or omitted.",
    ),
  inventoryActions: z
    .array(
      z.object({
        action: z.enum(["add", "remove", "update"]),
        id: z
          .string()
          .nullish()
          .describe(
            "For 'add': REQUIRED, AI-generated unique ID. For 'update'/'remove': ID to identify the item (CANNOT change existing ID).",
          ),
        name: z.string(),
        visible: inventoryItemVisibleSchema.nullish(),
        hidden: inventoryItemHiddenSchema.nullish(),
        lore: z.string().nullish(),
        unlocked: z.boolean().nullish(),
        unlockReason: z.string().nullish(),
      }),
    )
    .nullish()
    .describe("Updates to inventory."),
  npcActions: z
    .array(
      z.object({
        action: z.enum(["add", "update", "remove"]),
        id: z
          .string()
          .nullish()
          .describe(
            "For 'add': REQUIRED, AI-generated unique ID. For 'update'/'remove': ID to identify the NPC (CANNOT change existing ID).",
          ),
        knownBy: knownBySchema.nullish().describe(
          "Existence visibility: which actors know this actor exists.",
        ),
        currentLocation: z.string().nullish().describe("Current location ID."),
        visible: actorVisibleSchema.partial().nullish(),
        hidden: actorHiddenSchema.partial().nullish(),
        relations: z.array(relationEdgeSchema).nullish(),
        notes: z.string().nullish(),
        unlocked: z.boolean().nullish(),
        unlockReason: z.string().nullish(),
      }),
    )
    .nullish()
    .describe("Updates to NPCs."),
  locationActions: z
    .array(
      z.object({
        type: z.enum(["current", "known"]),
        action: z.enum(["update", "add", "remove"]),
        id: z
          .string()
          .nullish()
          .describe(
            "For 'add': REQUIRED, AI-generated unique ID. For 'update'/'remove': ID to identify the location (CANNOT change existing ID).",
          ),
        name: z.string().nullish(),
        visible: locationVisibleSchema.partial().nullish(),
        hidden: locationHiddenSchema.partial().nullish(),
        lore: z.string().nullish(),
        notes: z.string().nullish(),
        unlocked: z.boolean().nullish(),
        unlockReason: z.string().nullish(),
      }),
    )
    .nullish()
    .describe("Updates to locations."),
  questActions: z
    .array(
      z.object({
        action: z.enum(["add", "update", "remove", "complete", "fail"]),
        id: z
          .string()
          .describe(
            "For 'add': REQUIRED, AI-generated unique ID. For other actions: ID to identify the quest (CANNOT change existing ID).",
          ),
        title: z.string().nullish(),
        type: questTypeSchema.nullish(),
        visible: questVisibleSchema.partial().nullish(),
        hidden: questHiddenSchema.partial().nullish(),
        unlocked: z.boolean().nullish(),
        unlockReason: z.string().nullish(),
      }),
    )
    .nullish()
    .describe("Updates to quests."),
  knowledgeActions: z
    .array(
      z.object({
        action: z.enum(["add", "update"]),
        id: z
          .string()
          .nullish()
          .describe(
            "For 'add': REQUIRED, AI-generated unique ID. For 'update': ID to identify the knowledge (CANNOT change existing ID).",
          ),
        title: z.string().nullish(),
        category: knowledgeCategorySchema.nullish(),
        visible: knowledgeVisibleSchema.partial().nullish(),
        hidden: knowledgeHiddenSchema.partial().nullish(),
        discoveredAt: z.string().nullish(),
        relatedTo: z.array(z.string()).nullish(),
        unlocked: z.boolean().nullish(),
        unlockReason: z.string().nullish(),
      }),
    )
    .nullish()
    .describe("Updates to knowledge."),
  factionActions: z
    .array(
      z.object({
        action: z.enum(["add", "update", "remove"]),
        id: z
          .string()
          .describe(
            "For 'add': REQUIRED, AI-generated unique ID. For 'update'/'remove': ID to identify the faction (CANNOT change existing ID).",
          ),
        name: z.string(),
        visible: z.string().nullish(),
        hidden: z.string().nullish(),
      }),
    )
    .nullish()
    .describe("Background actions taken by factions this turn."),
  characterUpdates: z
    .object({
      attributes: z
        .array(
          z.object({
            action: z.enum(["add", "update", "remove"]),
            name: z.string(),
            value: z.number().int().nullish(),
            maxValue: z.number().int().nullish(),
            color: attributeColorSchema.nullish(),
          }),
        )
        .nullish(),
      skills: z
        .array(
          z.object({
            action: z.enum(["add", "update", "remove"]),
            name: z.string(),
            level: z.string().nullish(),
            visible: skillVisibleSchema.partial().nullish(),
            hidden: skillHiddenSchema.partial().nullish(),
            category: z.string().nullish(),
            unlocked: z.boolean().nullish(),
            unlockReason: z.string().nullish(),
          }),
        )
        .nullish(),
      conditions: z
        .array(
          z.object({
            action: z.enum(["add", "update", "remove"]),
            id: z
              .string()
              .nullish()
              .describe(
                "For 'add': REQUIRED, AI-generated unique ID. For 'update'/'remove': ID to identify (CANNOT change).",
              ),
            name: z.string(),
            type: conditionTypeSchema.nullish(),
            visible: conditionVisibleSchema.partial().nullish(),
            hidden: conditionHiddenSchema.partial().nullish(),
            effects: conditionEffectsSchema.partial().nullish(),
            duration: z.number().int().nullish(),
            unlocked: z.boolean().nullish(),
            unlockReason: z.string().nullish(),
          }),
        )
        .nullish(),
      hiddenTraits: z
        .array(
          z.object({
            action: z.enum(["add", "update", "remove"]),
            id: z
              .string()
              .nullish()
              .describe(
                "For 'add': REQUIRED, AI-generated unique ID. For 'update'/'remove': ID to identify (CANNOT change).",
              ),
            name: z.string(),
            description: z.string().nullish(),
            effects: z.array(z.string()).nullish(),
            triggerConditions: z.array(z.string()).nullish(),
            unlocked: z.boolean().nullish(),
            unlockReason: z.string().nullish(),
          }),
        )
        .nullish(),
      profile: z
        .object({
          status: z.string().nullish(),
          appearance: z.string().nullish(),
          age: z.string().nullish(),
          profession: z.string().nullish(),
          background: z.string().nullish(),
          race: z.string().nullish(),
        })
        .nullish(),
    })
    .nullish()
    .describe("Updates to character stats, skills, and profile."),
  timelineEvents: z
    .array(
      z.object({
        category: z.enum(["npc_action", "world_event", "consequence"]),
        visible: timelineEventVisibleSchema,
        hidden: timelineEventHiddenSchema.nullish(),
        involvedEntities: z.array(z.string()).nullish(),
        chainId: z.string().nullish(),
        newChain: z
          .object({
            description: z.string(),
          })
          .nullish(),
        projectedConsequences: z
          .array(
            z.object({
              description: z.string(),
              delayTurns: z.number().int(),
              probability: z.number().min(0).max(1),
            }),
          )
          .nullish(),
        known: z.boolean().nullish(),
      }),
    )
    .nullish()
    .describe("New timeline events."),
  timeUpdate: z
    .string()
    .nullish()
    .describe(
      "The new time string if time has passed. Can be null or omitted.",
    ),
  worldInfoUpdates: z
    .array(
      z.object({
        unlockWorldSetting: z.boolean().nullish(),
        unlockMainGoal: z.boolean().nullish(),
        reason: z.string(),
      }),
    )
    .nullish()
    .describe("Track when world-level secrets are unlocked."),
  systemToasts: z
    .array(
      z.object({
        message: z.string(),
        type: z.enum(["info", "warning", "error", "success"]),
      }),
    )
    .nullish()
    .describe(
      "System notifications to display to the user (e.g. compression warnings).",
    ),
  ending: z
    .enum([
      "continue",
      "death",
      "victory",
      "true_ending",
      "bad_ending",
      "neutral_ending",
    ])
    .nullish()
    .describe("Story continuation status. IF NOT SET, DEFAULTS TO 'continue'."),
  forceEnd: z
    .boolean()
    .nullish()
    .describe("If true, game ends permanently (no continue option)."),
  // Note: finalState is NOT included in AI schema - it's system-populated after processing
});

// ============================================================================
// Turn Assistant Schema (VFS-backed turn file)
// ============================================================================

/**
 * Assistant section schema for a completed turn.
 *
 * Note: The runtime no longer uses a dedicated "finish" tool. Turns are finalized
 * by writing the VFS conversation files (index + turn file).
 */
export function buildTurnAssistantSchema() {
  const baseFields = {
    narrative: z.string().describe(
      `The final story text to present to the player as **Markdown formatted text**. Write in a vivid, engaging style. Show, don't tell. Focus on sensory details and character emotions.

**MARKDOWN FORMATTING RULES:**
Use **bold** for newly discovered locations, important items, and significant character names when first introduced.
Use *italics* for character thoughts, internal monologue, and emphasis.
Use > blockquotes for dialogue, letters, inscriptions, or quoted text.
Use --- horizontal rules to separate distinct scenes or time jumps.
Use \`inline code\` for in-world technical terms, spell incantations, or foreign words.
Do NOT use bullet points, numbered lists, or any list formatting as it disrupts the reading flow.

**⚠️ CRITICAL - NO GAME IDs IN NARRATIVE:**
NEVER include internal game IDs in the narrative text. The following are FORBIDDEN:
- Item IDs: "inv:1", "inv:42" → Use item NAMES instead
- Character IDs: "char:player", "char:merchant" → Use character NAMES instead
- Location IDs: "loc:1", "loc:7" → Use location NAMES instead
- Quest IDs: "quest:1" → Use quest TITLES instead
- Any format like "prefix:number"

❌ WRONG: "You pick up inv:3 and head to loc:2"
✅ CORRECT: "You pick up the **Ancient Sword** and head to the **Forgotten Temple**"

**⚠️ CRITICAL - ENTITY REFERENCE RULES:**
How to refer to entities in narrative depends on their type and unlock status:

**1. Items, Locations, Factions, NPCs (Concrete Entities):**
- When \`unlocked: false\`: Use \`visible.name\` (what the player perceives)
- When \`unlocked: true\`: Use \`hidden.trueName\` if it differs from visible name
- Example: "The merchant **Elias**" → after unlock → "**Elias**, or rather, the infamous spy **Shadowbane**"

**2. Knowledge, Quests, Timeline Events (Abstract/Memory Entities):**
Do NOT use direct titles. Instead, use explanatory narrative that naturally integrates the information:
- ❌ WRONG: "You recall the knowledge entry 'Ancient Dragon Lore'..."
- ✅ CORRECT: "You recall a passage from an old tome you read in your youth, describing the dragons' weakness to cold iron..."
- ✅ CORRECT: "A promise echoes in your mind—you swore to avenge your fallen mentor..."
- ✅ CORRECT: "You witnessed the burning of Riverdale with your own eyes, the screams still haunting your dreams..."
- ✅ CORRECT: "Rumors you heard in the tavern mentioned that the duke was secretly..."
Use varied phrasings: "You remember reading...", "Your oath compels you to...", "You witnessed...", "You heard that...", "A memory surfaces—...", "You learned from [NPC] that..."

**3. Character Attributes, Conditions, Skills (Player Status):**
Do NOT directly reference the name of these fields. Use descriptive, in-world sensations instead:
- ❌ WRONG: "Your 'Curse of Shadows' condition activates..."
- ✅ CORRECT: "A faint, dark mist coils around your form, barely perceptible yet undeniably there..."
- ❌ WRONG: "Your 'Strength' attribute is low..."
- ✅ CORRECT: "Your arms tremble with exhaustion, the weight of your pack suddenly unbearable..."
- ❌ WRONG: "You use your 'Lockpicking' skill..."
- ✅ CORRECT: "Your fingers, trained by years of practice, dance across the lock's tumblers..."

**EXCEPTION - Magic/Supernatural Abilities:**
In settings with magic, superpowers, or similar systems where "incantations", "calling out names", or "activation phrases" are part of the world's mechanics, you MAY directly reference skill/condition names when the character actively invokes them:
- ✅ ALLOWED: "You raise your hand and cry out: '**Fireball!**'" (if Fireball is a spell name)
- ✅ ALLOWED: "You channel your inner power and whisper '**Shadow Step**'..." (if it's a named technique)
- ❌ NOT ALLOWED: Passive effects should still use description, not name`,
    ),
    choices: z
      .array(
        z.object({
          text: z
            .string()
            .describe(
              "The text of the choice. MUST use natural language, NEVER include game IDs like inv:N, char:N, loc:N.",
            ),
          consequence: z
            .string()
            .nullish()
            .describe(
              "A brief hint about the likely consequence of this choice. Can be null or omitted if no hint is needed.",
            ),
        }),
      )
      .min(2)
      .max(4)
      .describe(
        `2-4 options for the player's next action. CRITICAL: Choices MUST be consistent with the player character's:
1. **Knowledge/Cognition**: Only offer choices based on what the character KNOWS.
2. **Personality/Background**: Choices should reflect the character's personality.
3. **Current Conditions**: If the character is injured/exhausted, choices should reflect limitations.
4. **Skills & Abilities**: Offer choices that utilize the character's skills.
5. **Hidden Traits**: If a hidden trait is unlocked, it may unlock new choice types.

**⚠️ NO GAME IDs**: Never include IDs like "inv:1", "char:someone", "loc:3" in choice text. Use natural names only.`,
      ),
    atmosphere: atmosphereSchema
      .nullish()
      .describe("Atmosphere settings (envTheme and ambience)."),
    narrativeTone: z
      .string()
      .nullish()
      .describe(
        "Narrative tone (e.g., 'suspenseful', 'cheerful', 'melancholy').",
      ),

    ending: z
      .enum([
        "continue",
        "death",
        "victory",
        "true_ending",
        "bad_ending",
        "neutral_ending",
      ])
      .nullish()
      .describe(
        `Story continuation status. IF NOT SET, DEFAULTS TO "continue":
- "continue": Story continues normally (USE THIS IN MOST CASES)
- "death": Player character dies or suffers irreversible fatal consequence
- "victory": Main quest goal achieved, story concludes positively
- "true_ending": Secret/best ending discovered
- "bad_ending": Story concludes with negative outcome
- "neutral_ending": Story concludes without clear win/loss

⚠️ CRITICAL RULES:
1. DEFAULT TO "continue" - Use this for 99% of turns.
2. NEVER use endings other than "continue" in the first 5 turns.
3. 'death' should ONLY occur after MULTIPLE clearly dangerous choices.`,
      ),
    forceEnd: z
      .boolean()
      .nullish()
      .describe(
        `Only relevant when 'ending' is set. Determines if the game ends permanently:
- true: Game is OVER. Player cannot continue from this point.
- false/omit: Player can choose to continue despite the ending.`,
      ),
  };

  return z.object(baseFields);
}

/**
 * Default turn assistant schema
 */
export const turnAssistantSchema = buildTurnAssistantSchema();

/**
 * force_update 响应 Schema
 * RAG queries and entity preloading are now handled via dedicated tools, not force_update
 */
export function buildForceUpdateSchema() {
  const baseFields = {
    narrative: z.string()
      .describe(`The narrative description of the changes made to the world as **Markdown formatted text**. Write in a vivid, engaging style.

**MARKDOWN FORMATTING RULES:**
Use **bold** for newly discovered locations, important items, and significant character names when first introduced.
Use *italics* for character thoughts, internal monologue, and emphasis.
Use > blockquotes for dialogue, letters, inscriptions, or quoted text.
Use --- horizontal rules to separate distinct scenes or time jumps.
Use \`inline code\` for in-world technical terms, spell incantations, or foreign words.
Do NOT use bullet points, numbered lists, or any list formatting.

**⚠️ CRITICAL - NO GAME IDs IN NARRATIVE:**
NEVER include internal game IDs. The following are FORBIDDEN:
- Item IDs: "inv:1", "inv:42" → Use item NAMES instead
- Character IDs: "char:player", "char:merchant" → Use character NAMES instead
- Location IDs: "loc:1", "loc:7" → Use location NAMES instead
- Quest IDs: "quest:1" → Use quest TITLES instead

**⚠️ CRITICAL - ENTITY REFERENCE RULES:**
How to refer to entities in narrative depends on their type and unlock status:

**1. Items, Locations, Factions, NPCs (Concrete Entities):**
- When \`unlocked: false\`: Use \`visible.name\` (what the player perceives)
- When \`unlocked: true\`: Use \`hidden.trueName\` if it differs from visible name
- Example: "The merchant **Elias**" → after unlock → "**Elias**, or rather, the infamous spy **Shadowbane**"

**2. Knowledge, Quests, Timeline Events (Abstract/Memory Entities):**
Do NOT use direct titles. Instead, use explanatory narrative:
- ❌ WRONG: "You recall the knowledge entry 'Ancient Dragon Lore'..."
- ✅ CORRECT: "You recall a passage from an old tome you read in your youth..."
- ✅ CORRECT: "A promise echoes in your mind—you swore to..."
- ✅ CORRECT: "You witnessed the event with your own eyes..."
Use varied phrasings: "You remember reading...", "Your oath compels you to...", "You witnessed...", "You heard that...", "A memory surfaces—..."

**3. Character Attributes, Conditions, Skills (Player Status):**
Do NOT directly reference field names. Use descriptive sensations:
- ❌ WRONG: "Your 'Curse of Shadows' condition activates..."
- ✅ CORRECT: "A faint, dark mist coils around your form..."
- ❌ WRONG: "Your 'Strength' attribute is low..."
- ✅ CORRECT: "Your arms tremble with exhaustion..."

**EXCEPTION - Magic/Supernatural Abilities:**
In settings with magic/superpowers where "incantations" or "calling out names" are part of mechanics, you MAY reference skill/condition names when actively invoked:
- ✅ ALLOWED: "You cry out: '**Fireball!**'" (if Fireball is a spell name)
- ❌ NOT ALLOWED: Passive effects should still use description, not name`),
    stateUpdates: z
      .string()
      .nullish()
      .describe("A summary of the state updates applied (for logging)."),
    choices: z
      .array(
        z.object({
          text: z
            .string()
            .describe(
              "The text of the choice. MUST use natural language, NEVER include game IDs like inv:N, char:N, loc:N.",
            ),
          consequence: z
            .string()
            .nullish()
            .describe(
              "A brief hint about the likely consequence of this choice. Can be null or omitted if no hint is needed.",
            ),
        }),
      )
      .min(2)
      .max(4)
      .describe(
        "2-4 options for the player's next action after the force update.",
      ),
    atmosphere: atmosphereSchema
      .nullish()
      .describe(
        "Atmosphere settings with envTheme (visual) and ambience (audio) for this scene.",
      ),
    narrativeTone: z
      .string()
      .nullish()
      .describe(
        "The tone of the narrative (e.g., 'suspenseful', 'cheerful', 'melancholy').",
      ),
  };

  return z.object(baseFields);
}

/**
 * Default force_update schema
 */
export const forceUpdateSchema = buildForceUpdateSchema();

// ============================================================================
// Override Outline Schema (SUDO MODE ONLY)
// ============================================================================

/**
 * override_outline tool schema - allows modifying outline fields during forceUpdate
 * CRITICAL: This tool should ONLY be available when isSudoMode === true
 */
export const overrideOutlineSchema = z.object({
  worldSetting: worldSettingSchema
    .partial()
    .nullish()
    .describe(
      "Override the world setting with new values. Can partially update visible, hidden, or history fields.",
    ),
  narrativeStyle: z
    .string()
    .nullish()
    .describe(
      "Override the narrative writing style. This replaces the theme's narrativeStyle with a custom style description.",
    ),
});

export type OverrideOutlineParams = z.infer<typeof overrideOutlineSchema>;

// ============================================================================\n// Response Types\n// ============================================================================

export type TurnAssistantResponse = z.infer<typeof turnAssistantSchema>;
export type ForceUpdateResponse = z.infer<typeof forceUpdateSchema>;

// ============================================================================
// 类型导出
// ============================================================================

export type InventoryItem = z.infer<typeof inventoryItemSchema>;
export type ActorProfile = z.infer<typeof actorProfileSchema>;
// Back-compat alias: "NPC" is now an ActorProfile with kind="npc"
export type NPC = ActorProfile;
export type Placeholder = z.infer<typeof placeholderSchema>;
export type RelationEdge = z.infer<typeof relationEdgeSchema>;
export type ActorBundle = z.infer<typeof actorBundleSchema>;
export type Location = z.infer<typeof locationSchema>;
export type Quest = z.infer<typeof questSchema>;
export type Skill = z.infer<typeof skillSchema>;
export type Condition = z.infer<typeof conditionSchema>;
export type KnowledgeEntry = z.infer<typeof knowledgeEntrySchema>;
export type TimelineEvent = z.infer<typeof timelineEventSchema>;
export type CausalChain = z.infer<typeof causalChainSchema>;
export type Faction = z.infer<typeof factionSchema>;
export type CharacterAttribute = z.infer<typeof characterAttributeSchema>;
export type HiddenTrait = z.infer<typeof hiddenTraitSchema>;
export type CharacterProfile = z.infer<typeof characterProfileSchema>;
export type CharacterStatus = z.infer<typeof characterStatusSchema>;
export type StoryOutline = z.infer<typeof storyOutlineSchema>;
export type StorySummary = z.infer<typeof storySummarySchema>;
export type GameResponse = z.infer<typeof gameResponseSchema>;
export type Atmosphere = z.infer<typeof atmosphereSchema>;
export type EnvTheme = z.infer<typeof envThemeSchema>;
export type Ambience = z.infer<typeof ambienceSchema>;

// ============================================================================
// 重新导出编译器函数
// ============================================================================

export {
  zodToGemini,
  zodToOpenAIResponseFormat,
  zodToOpenAISchema,
} from "./zodCompiler";
