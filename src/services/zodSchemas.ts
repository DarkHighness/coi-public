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
import {
  PLACEHOLDER_DOMAINS,
  PLACEHOLDER_PATH_REGEX,
} from "./vfs/placeholders";

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
  description: z.string().describe("Observable appearance and features."),
  usage: z.string().nullish().describe("Known usage or function."),
  observation: z
    .string()
    .nullish()
    .describe("Actor's personal observations about the item."),
  sensory: z
    .object({
      texture: z.string().nullish().describe("Tactile feel."),
      weight: z.string().nullish().describe("Perceived weight."),
      smell: z.string().nullish().describe("Scent, if any."),
    })
    .nullish()
    .describe("Multi-sense impression."),
  condition: z
    .string()
    .nullish()
    .describe(
      "Physical wear state (e.g. 'rusty', 'pristine'). Target language.",
    ),
});

/** 物品隐藏层 */
export const inventoryItemHiddenSchema = z.object({
  truth: z.string().describe("True nature or hidden power."),
  secrets: z.array(z.string()).nullish().describe("Hidden secrets (GM-only)."),
});

/** 完整物品 Schema */
export const inventoryItemSchema = z.object({
  id: z
    .string()
    .describe("Unique item ID (e.g. 'rusty_sword', 'healing_potion_1')."),
  knownBy: knownBySchema.describe(
    "Existence visibility: which actors know this item exists.",
  ),
  name: z.string().describe("Item name."),
  visible: inventoryItemVisibleSchema,
  hidden: inventoryItemHiddenSchema.nullish(),
  lore: z.string().nullish().describe("Brief origin or history."),
  emotionalWeight: z
    .string()
    .nullish()
    .describe("Sentimental significance to its owner."),
  icon: z.string().nullish().describe("Single emoji icon."),
  unlocked: z
    .boolean()
    .nullish()
    .describe("AI DECISION: true when hidden truth discovered. Default false."),
  unlockReason: z
    .string()
    .nullish()
    .describe("REQUIRED when unlocked=true. Evidence for revelation."),
  highlight: z
    .boolean()
    .nullish()
    .describe("Updated this turn (UI-only). INVISIBLE to AI."),
  createdAt: z.number().nullish().describe("INVISIBLE to AI."),
  modifiedAt: versionedTimestampSchema
    .nullish()
    .describe("Version-aware modification timestamp."),
  lastAccess: accessTimestampSchema.nullish().describe("INVISIBLE to AI."),
  notes: z
    .string()
    .nullish()
    .describe(
      "AI self-notes for consistency and planning. Read before writing.",
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
  "office",
  "hospital",
  "courtroom",
  "studio",
  "nightclub",
  "cafe",
  "laboratory",
  "subway",
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

export const OUTLINE_PHASE0_SUGGESTED_ENV_THEME_VALUES = envThemeSchema.options;
export const OUTLINE_PHASE0_SUGGESTED_AMBIENCE_VALUES = ambienceSchema.options;

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
  description: z.string().describe("Observable scene description."),
  environment: z
    .string()
    .nullish()
    .describe("General environment/atmosphere in natural language."),
  ambience: z
    .string()
    .nullish()
    .describe("Audio landscape and mood in natural language."),
  weather: z
    .string()
    .nullish()
    .describe("Current weather conditions in natural language."),
  knownFeatures: z.array(z.string()).describe("Notable visible features."),
  resources: z
    .array(z.string())
    .nullish()
    .describe("Gatherable resources or items."),
  atmosphere: atmosphereSchema
    .nullish()
    .describe("UI atmosphere override (enum values only)."),
  sensory: z
    .object({
      smell: z.string().nullish(),
      sound: z.string().nullish(),
      lighting: z.string().nullish(),
      temperature: z.string().nullish(),
    })
    .nullish()
    .describe("Multi-sense impression."),
  interactables: z
    .array(z.string())
    .nullish()
    .describe("Visible interactive elements."),
});

/** 地点隐藏层 */
export const locationHiddenSchema = z.object({
  fullDescription: z
    .string()
    .describe("True nature of the location (GM-only)."),
  dangers: z.array(z.string()).nullish().describe("Hidden dangers or traps."),
  hiddenFeatures: z.array(z.string()).describe("Undiscovered features."),
  secrets: z.array(z.string()).describe("Location secrets (GM-only)."),
});

/** 完整地点 Schema */
export const locationSchema = z.object({
  id: z
    .string()
    .describe("Unique location ID (e.g. 'cave_entrance', 'royal_palace')."),
  knownBy: knownBySchema.describe("Actor IDs aware of this location."),
  name: z.string().describe("Location name."),
  visible: locationVisibleSchema,
  hidden: locationHiddenSchema.nullish(),
  lore: z.string().nullish().describe("Brief history or origin."),
  icon: z.string().nullish().describe("Single emoji icon."),
  createdAt: z.number().nullish().describe("INVISIBLE to AI."),
  modifiedAt: versionedTimestampSchema
    .nullish()
    .describe("Version-aware modification timestamp."),
  notes: z
    .string()
    .nullish()
    .describe(
      "AI self-notes for consistency and planning. Read before writing.",
    ),
});

/**
 * Outline authoring input for locations.
 * System/runtime fields are managed by engine and must not be model-authored.
 */
export const outlineLocationSchema = locationSchema
  .omit({
    createdAt: true,
    modifiedAt: true,
  })
  .strict();

/**
 * Derived UI model for Location (canonical definition + per-actor view fields).
 * NOTE: These fields MUST NOT be stored in `world/locations/*.json`.
 */
export const locationViewModelSchema = locationSchema.extend({
  // Per-actor view fields
  isVisited: z.boolean().nullish().describe("Per-actor view: visited flag."),
  unlocked: z
    .boolean()
    .nullish()
    .describe("Per-actor view: whether hidden truth is revealed."),
  unlockReason: z.string().nullish().describe("Per-actor view: unlock reason."),
  discoveredAt: z
    .number()
    .nullish()
    .describe("Per-actor view: discovered time."),
  highlight: z.boolean().nullish().describe("UI-only highlight flag."),
  lastAccess: accessTimestampSchema
    .nullish()
    .describe("UI-only last access timestamp."),
});

// ============================================================================
// 任务相关 Schemas
// ============================================================================

/** 任务可见层 */
export const questVisibleSchema = z.object({
  description: z.string().describe("Apparent objective as understood."),
  objectives: z.array(z.string()).describe("Visible task objectives."),
});

/** 任务隐藏层 */
export const questHiddenSchema = z.object({
  trueDescription: z
    .string()
    .nullish()
    .describe("Real purpose behind the quest (GM-only)."),
  trueObjectives: z
    .array(z.string())
    .nullish()
    .describe("Actual hidden objectives."),
  secretOutcome: z
    .string()
    .nullish()
    .describe("Outcome revealed only upon completion."),
  twist: z.string().nullish().describe("Hidden complication or moral dilemma."),
});

/** 任务类型 */
export const questTypeSchema = z.enum(["main", "side", "hidden"]);

/** 任务状态 */
export const questStatusSchema = z.enum(["active", "completed", "failed"]);

/** 完整任务 Schema */
export const questSchema = z.object({
  id: z.string().describe("Unique quest ID (e.g. 'find_missing_heir')."),
  knownBy: knownBySchema.describe("Actor IDs aware of this quest."),
  title: z.string().describe("Quest title."),
  type: questTypeSchema.describe("main, side, or hidden."),
  visible: questVisibleSchema,
  hidden: questHiddenSchema.nullish(),
  icon: z.string().nullish().describe("Single emoji icon."),
  createdAt: z.number().nullish().describe("INVISIBLE to AI."),
  modifiedAt: versionedTimestampSchema
    .nullish()
    .describe("Version-aware modification timestamp."),

  notes: z
    .string()
    .nullish()
    .describe(
      "AI self-notes for consistency and planning. Read before writing.",
    ),
});

/**
 * Derived UI model for Quest (canonical definition + per-actor view fields).
 * NOTE: These fields MUST NOT be stored in `world/quests/*.json`.
 */
export const questViewModelSchema = questSchema.extend({
  // Per-actor view fields
  status: questStatusSchema.nullish().default("active"),
  unlocked: z
    .boolean()
    .nullish()
    .describe("Per-actor view: whether hidden truth is revealed."),
  unlockReason: z.string().nullish().describe("Per-actor view: unlock reason."),
  highlight: z.boolean().nullish().describe("UI-only highlight flag."),
  lastAccess: accessTimestampSchema
    .nullish()
    .describe("UI-only last access timestamp."),
});

// ============================================================================
// 技能相关 Schemas
// ============================================================================

/** 技能可见层 */
export const skillVisibleSchema = z.object({
  description: z.string().describe("Known description of the skill."),
  knownEffects: z.array(z.string()).describe("Observable effects."),
});

/** 技能隐藏层 */
export const skillHiddenSchema = z.object({
  trueDescription: z.string().describe("True nature/power (GM-only)."),
  hiddenEffects: z.array(z.string()).describe("Undiscovered effects."),
  drawbacks: z
    .array(z.string())
    .nullish()
    .describe("Hidden costs or drawbacks."),
});

/** 完整技能 Schema */
export const skillSchema = z.object({
  id: z.string().describe("Unique skill ID (e.g. 'master_swordplay')."),
  knownBy: knownBySchema.describe("Actor IDs aware of this skill."),
  name: z.string().describe("Skill name."),
  level: z.string().describe("Proficiency level (e.g. Novice, Master)."),
  visible: skillVisibleSchema,
  hidden: skillHiddenSchema.nullish(),
  category: z.string().nullish().describe("Skill category."),
  unlocked: z
    .boolean()
    .nullish()
    .describe("AI DECISION: true when hidden nature understood."),
  unlockReason: z
    .string()
    .nullish()
    .describe("REQUIRED when unlocked=true. Evidence for revelation."),
  icon: z.string().nullish().describe("Single emoji icon."),
  highlight: z.boolean().nullish(),
  notes: z
    .string()
    .nullish()
    .describe(
      "AI self-notes for consistency and planning. Read before writing.",
    ),
});

// ============================================================================
// 状态条件相关 Schemas
// ============================================================================

/** 条件可见层 */
export const conditionVisibleSchema = z.object({
  description: z.string().describe("Observable symptoms or manifestation."),
  perceivedSeverity: z
    .string()
    .nullish()
    .describe("Apparent severity. Target language."),
});

/** 条件隐藏层 */
export const conditionHiddenSchema = z.object({
  trueCause: z.string().describe("Actual cause (GM-only)."),
  actualSeverity: z.string().nullish().describe("True severity level."),
  progression: z
    .string()
    .nullish()
    .describe("How the condition will evolve over time."),
  cure: z.string().nullish().describe("How to cure or remove it."),
});

/** 条件效果 */
export const conditionEffectsSchema = z.object({
  visible: z.array(z.string()).describe("Effects the actor can observe."),
  hidden: z.array(z.string()).describe("Effects only GM knows."),
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
    .describe("Unique condition ID (e.g. 'poisoned', 'blessed_by_goddess')."),
  knownBy: knownBySchema.describe("Actor IDs aware of this condition."),
  name: z.string().describe("Condition name."),
  type: conditionTypeSchema.describe("Category (wound, poison, buff, etc.)."),
  visible: conditionVisibleSchema,
  hidden: conditionHiddenSchema.nullish(),
  effects: conditionEffectsSchema,
  severity: z
    .string()
    .nullish()
    .describe("Severity level (e.g. Mild, Severe). Target language."),
  startTime: z.string().nullish().describe("When the condition started."),
  unlocked: z
    .boolean()
    .nullish()
    .describe("AI DECISION: true when true cause/cure revealed."),
  unlockReason: z
    .string()
    .nullish()
    .describe("REQUIRED when unlocked=true. Evidence for revelation."),
  icon: z.string().nullish().describe("Single emoji icon."),
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
  description: z.string().describe("What is commonly known."),
  details: z.string().nullish().describe("Additional context or specifics."),
});

/** 知识隐藏层 */
export const knowledgeHiddenSchema = z.object({
  fullTruth: z.string().describe("Complete truth (GM-only)."),
  misconceptions: z
    .array(z.string())
    .nullish()
    .describe("Common false beliefs about this topic."),
  toBeRevealed: z
    .array(z.string())
    .nullish()
    .describe("Information reserved for future revelation."),
});

/** 完整知识条目 Schema */
export const knowledgeEntrySchema = z.object({
  id: z.string().describe("Unique knowledge ID (e.g. 'ancient_prophecy')."),
  knownBy: knownBySchema.describe("Actor IDs aware of this knowledge."),
  title: z.string().describe("Knowledge entry title."),
  category: knowledgeCategorySchema.describe("Organizational category."),
  visible: knowledgeVisibleSchema,
  hidden: knowledgeHiddenSchema.nullish(),
  relatedTo: z.array(z.string()).nullish().describe("Related entity IDs."),
  icon: z.string().nullish().describe("Single emoji icon."),
  createdAt: z.number().nullish().describe("INVISIBLE to AI."),
  modifiedAt: versionedTimestampSchema
    .nullish()
    .describe("Version-aware modification timestamp."),
  notes: z
    .string()
    .nullish()
    .describe(
      "AI self-notes for consistency and planning. Read before writing.",
    ),
});

/**
 * Derived UI model for KnowledgeEntry (canonical definition + per-actor view fields).
 * NOTE: These fields MUST NOT be stored in `world/knowledge/*.json`.
 */
export const knowledgeEntryViewModelSchema = knowledgeEntrySchema.extend({
  // Per-actor view fields
  discoveredAt: z
    .string()
    .nullish()
    .describe("Per-actor view: discovered time."),
  unlocked: z
    .boolean()
    .nullish()
    .describe("Per-actor view: whether hidden truth is revealed."),
  unlockReason: z.string().nullish().describe("Per-actor view: unlock reason."),
  highlight: z.boolean().nullish().describe("UI-only highlight flag."),
  lastAccess: accessTimestampSchema
    .nullish()
    .describe("UI-only last access timestamp."),
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
  description: z.string().describe("Publicly known account of the event."),
  causedBy: z.string().nullish().describe("Known cause or instigator."),
});

/** 时间线事件隐藏层 */
export const timelineEventHiddenSchema = z.object({
  trueDescription: z.string().describe("What actually happened (GM-only)."),
  trueCausedBy: z.string().nullish().describe("Real instigator or cause."),
  consequences: z
    .array(z.string())
    .nullish()
    .describe("Hidden future implications."),
});

/** 完整时间线事件 Schema */
export const timelineEventSchema = z.object({
  id: z.string().describe("Unique event ID (e.g. 'great_flood_start')."),
  knownBy: knownBySchema.describe("Actor IDs aware of this event."),
  name: z.string().describe("Short memorable event name."),
  gameTime: z.string().describe("When the event occurred in game time."),
  category: timelineEventCategorySchema.describe("Event category."),
  visible: timelineEventVisibleSchema,
  hidden: timelineEventHiddenSchema.nullish(),
  involvedEntities: z
    .array(z.string())
    .nullish()
    .describe("IDs of involved entities."),
  chainId: z.string().nullish().describe("Link to a CausalChain."),
  icon: z.string().nullish().describe("Single emoji icon."),
  range: z
    .object({
      start: z.number(),
      end: z.number(),
    })
    .nullish(),
  createdAt: z.number().nullish().describe("INVISIBLE to AI."),
  modifiedAt: versionedTimestampSchema
    .nullish()
    .describe("Version-aware modification timestamp."),
  notes: z
    .string()
    .nullish()
    .describe(
      "AI self-notes for consistency and planning. Read before writing.",
    ),
});

/**
 * Derived UI model for TimelineEvent (canonical definition + per-actor view fields).
 * NOTE: These fields MUST NOT be stored in `world/timeline/*.json`.
 */
export const timelineEventViewModelSchema = timelineEventSchema.extend({
  // Per-actor view fields
  unlocked: z
    .boolean()
    .nullish()
    .describe("Per-actor view: whether hidden truth is revealed."),
  unlockReason: z.string().nullish().describe("Per-actor view: unlock reason."),
  highlight: z.boolean().nullish().describe("UI-only highlight flag."),
  lastAccess: accessTimestampSchema
    .nullish()
    .describe("UI-only last access timestamp."),
});

// ============================================================================
// 因果链 Schemas
// ============================================================================

/** 待触发的后果 */
export const pendingConsequenceSchema = z.object({
  id: z.string().describe("Unique tracking ID."),
  description: z.string().describe("What happens if triggered."),
  triggerCondition: z
    .string()
    .nullish()
    .describe("Narrative condition for triggering (not a turn counter)."),
  severity: z
    .string()
    .nullish()
    .describe("Urgency: 'imminent', 'delayed', or 'background'."),
  triggered: z.boolean().nullish().describe("True once fired."),
  triggeredAtTurn: z
    .number()
    .int()
    .nullish()
    .describe("Turn number when triggered (logging only)."),
  knownBy: knownBySchema.describe("Actor IDs aware of this consequence."),
});

/** 根本原因 */
export const rootCauseSchema = z.object({
  eventId: z.string().describe("ID of the originating event."),
  description: z.string().describe("What caused the chain."),
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
  knownBy: knownBySchema.describe("Actor IDs aware of this chain."),
  rootCause: rootCauseSchema,
  events: z
    .array(timelineEventSchema)
    .nullish()
    .describe("Events in this chain."),
  status: causalChainStatusSchema.describe("active, resolved, or interrupted."),
  pendingConsequences: z
    .array(pendingConsequenceSchema)
    .nullish()
    .describe("Future consequences awaiting trigger."),
});

// ============================================================================
// 阵营 Schemas
// ============================================================================

/** 阵营成员 */
export const factionMemberSchema = z.object({
  name: z.string().describe("Member name."),
  title: z.string().nullish().describe("Title or role."),
});

/** 阵营关系 */
export const factionRelationSchema = z.object({
  target: z
    .string()
    .describe("Target faction ID. Bracket alias [Name] if unresolved."),
  status: z.string().describe("Relationship status."),
});

/** 阵营可见层 */
export const factionVisibleSchema = z.object({
  agenda: z.string().describe("Public goals and reputation."),
  members: z
    .array(factionMemberSchema)
    .nullish()
    .describe("Publicly known members."),
  influence: z.string().nullish().describe("Perceived power level."),
  relations: z
    .array(factionRelationSchema)
    .nullish()
    .describe("Public alliances/rivalries."),
});

/** 阵营隐藏层 */
export const factionHiddenSchema = z.object({
  agenda: z.string().describe("Secret goals or corruption (GM-only)."),
  members: z
    .array(factionMemberSchema)
    .nullish()
    .describe("Secret members or shadow leaders."),
  influence: z.string().nullish().describe("True power level (GM-only)."),
  internalConflict: z
    .string()
    .nullish()
    .describe("Internal schisms or power struggles."),
  relations: z
    .array(factionRelationSchema)
    .nullish()
    .describe("Secret alliances/rivalries."),
});

/** 完整阵营 Schema */
export const factionSchema = z.object({
  id: z.string().describe("Unique faction ID (e.g. 'thieves_guild')."),
  knownBy: knownBySchema.describe("Actor IDs aware of this faction."),
  name: z.string().describe("Faction name."),
  visible: factionVisibleSchema,
  hidden: factionHiddenSchema,
  icon: z.string().nullish().describe("Single emoji icon."),
  notes: z
    .string()
    .nullish()
    .describe(
      "AI self-notes for consistency and planning. Read before writing.",
    ),
});

/**
 * Derived UI model for Faction (canonical definition + per-actor view fields).
 * NOTE: These fields MUST NOT be stored in `world/factions/*.json`.
 */
export const factionViewModelSchema = factionSchema.extend({
  // Per-actor view fields
  unlocked: z
    .boolean()
    .nullish()
    .describe("Per-actor view: whether hidden truth is revealed."),
  unlockReason: z.string().nullish().describe("Per-actor view: unlock reason."),
  highlight: z.boolean().nullish().describe("UI-only highlight flag."),
  lastAccess: accessTimestampSchema
    .nullish()
    .describe("UI-only last access timestamp."),
});

// ============================================================================
// Perspective Views (stored per-actor under `world/characters/<id>/views/**`)
// ============================================================================

/**
 * Base schema for per-actor entity views.
 *
 * IMPORTANT:
 * - These files store per-actor progress / discovery / revelation and UI state.
 * - Canonical entities (world truth) MUST NOT store these fields.
 */
export const actorEntityViewBaseSchema = z
  .object({
    entityId: z.string().describe("Canonical entity ID."),
    unlocked: z.boolean().nullish().describe("Hidden truth revealed?"),
    unlockReason: z.string().nullish().describe("REQUIRED when unlocked=true."),
    evidence: z
      .array(z.string())
      .nullish()
      .describe("Evidence supporting unlock or belief."),
    notes: z.string().nullish().describe("Per-actor notes."),
    highlight: z.boolean().nullish().describe("UI-only."),
    lastAccess: accessTimestampSchema.nullish().describe("UI-only."),
  })
  .strict();

const withUnlockReasonRequirement = <T extends z.ZodTypeAny>(
  schema: T,
): z.ZodEffects<T> =>
  schema.superRefine((value: unknown, ctx: z.RefinementCtx) => {
    if (typeof value !== "object" || value === null) {
      return;
    }
    const candidate = value as { unlocked?: unknown; unlockReason?: unknown };
    if (candidate.unlocked === true && !candidate.unlockReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "unlockReason is required when unlocked=true",
        path: ["unlockReason"],
      });
    }
  });

export const questObjectiveStateSchema = z
  .object({
    text: z.string(),
    state: z.enum(["open", "done", "blocked"]),
  })
  .strict();

export const questViewSchema = withUnlockReasonRequirement(
  actorEntityViewBaseSchema
    .extend({
      status: questStatusSchema.describe("Per-actor quest status."),
      objectiveState: z.array(questObjectiveStateSchema).nullish(),
      acceptedAtGameTime: z.string().nullish(),
      completedAtGameTime: z.string().nullish(),
    })
    .strict(),
);

export const knowledgeEntryViewSchema = withUnlockReasonRequirement(
  actorEntityViewBaseSchema
    .extend({
      discoveredAtGameTime: z.string().nullish(),
      beliefSummary: z
        .string()
        .nullish()
        .describe(
          "Per-actor current understanding (may be wrong but coherent).",
        ),
    })
    .strict(),
);

export const timelineEventViewSchema = withUnlockReasonRequirement(
  actorEntityViewBaseSchema
    .extend({
      rememberedAs: z
        .string()
        .nullish()
        .describe("Per-actor remembered narrative (may be biased)."),
      suspicions: z
        .array(z.string())
        .nullish()
        .describe("Per-actor suspicion links (entity ids only)."),
    })
    .strict(),
);

export const locationViewSchema = withUnlockReasonRequirement(
  actorEntityViewBaseSchema
    .extend({
      isVisited: z.boolean().nullish(),
      visitedCount: z.number().int().nonnegative().nullish(),
      discoveredAtGameTime: z.string().nullish(),
    })
    .strict(),
);

export const factionViewSchema = withUnlockReasonRequirement(
  actorEntityViewBaseSchema
    .extend({
      standing: z.number().int().min(-100).max(100).nullish(),
      standingTag: z.string().nullish(),
    })
    .strict(),
);

export const causalChainViewSchema = withUnlockReasonRequirement(
  actorEntityViewBaseSchema
    .extend({
      investigationNotes: z.string().nullish(),
      linkedEventIds: z.array(z.string()).nullish(),
    })
    .strict(),
);

/** 隐藏特质 */
export const hiddenTraitSchema = z.object({
  id: z.string().describe("Unique trait ID (e.g. 'fear_of_darkness')."),
  knownBy: knownBySchema.describe("Actor IDs aware of this trait."),
  name: z.string().describe("Trait name."),
  description: z.string().describe("What the trait represents."),
  effects: z.array(z.string()).describe("Effects when triggered."),
  triggerConditions: z
    .array(z.string())
    .nullish()
    .describe("Conditions that activate the trait."),
  unlocked: z.boolean().describe("True when triggered and revealed to actor."),
  unlockReason: z
    .string()
    .nullish()
    .describe("REQUIRED when unlocked=true. Evidence for revelation."),
  icon: z.string().nullish().describe("Single emoji icon."),
  highlight: z.boolean().nullish(),
});

// ============================================================================
// Actor / Relationship / Placeholder Schemas (VFS source-of-truth)
// ============================================================================

export const actorKindSchema = z.enum(["player", "npc"]);

export const entityRefSchema = z.object({
  kind: z.enum(["character", "placeholder"]).describe("Reference target kind."),
  id: z
    .string()
    .describe(
      "Target ID. If canonical ID is unknown this turn, use temporary bracket alias [Display Name].",
    ),
});

const relationBaseSchema = z.object({
  id: z.string().describe("Unique relation ID scoped to the owning actor."),
  to: entityRefSchema.describe("Directed edge target."),
  knownBy: knownBySchema.describe(
    "Existence visibility: which actors know this relationship exists.",
  ),
  unlocked: z
    .boolean()
    .nullish()
    .describe(
      "AI DECISION: Set true only when the actor has definitive proof of the hidden truth (e.g., confession, mind-reading, hard evidence). Default false.",
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
        .describe("Objective, evidence-based impression (no mind-reading)."),
      evidence: z
        .array(z.string())
        .nullish()
        .describe("Concrete observations supporting the impression."),
    })
    .strict()
    .describe("Actor-visible perception."),
  // Perception MUST NOT include affinity numbers; hidden layer is omitted by design.
});

export const relationAttitudeSchema = relationBaseSchema.extend({
  kind: z.literal("attitude"),
  visible: z
    .object({
      signals: z
        .array(z.string())
        .nullish()
        .describe("Observable surface cues (tone, distance, actions)."),
      reputationTag: z
        .string()
        .nullish()
        .describe("Coarse surface tag (e.g. friendly/wary/hostile)."),
      claimedIntent: z
        .string()
        .nullish()
        .describe("What the NPC claims publicly (may be false)."),
    })
    .strict()
    .describe("Actor-visible surface signals."),
  hidden: z
    .object({
      affinity: z
        .string()
        .nullish()
        .describe(
          "TRUE affinity text label (GM-only, never expose), e.g. 'wary', 'guarded trust', 'devoted'.",
        ),
      impression: z
        .string()
        .nullish()
        .describe("NPC's true impression of the target."),
      observation: z
        .string()
        .nullish()
        .describe("NPC's observations of target's behavior."),
      ambivalence: z
        .string()
        .nullish()
        .describe("Conflicting feelings (hate AND love reasons)."),
      transactionalBenefit: z
        .string()
        .nullish()
        .describe("Objective gain from the relationship."),
      motives: z.string().nullish().describe("True motives driving behavior."),
      currentThought: z
        .string()
        .nullish()
        .describe("Inner monologue (GM-only)."),
    })
    .strict()
    .nullish()
    .describe("GM-only true attitude."),
});

export const relationEdgeSchema = z.discriminatedUnion("kind", [
  relationPerceptionSchema,
  relationAttitudeSchema,
]);

const REQUIRED_VISIBLE_PLACEHOLDER_VALUES = new Set([
  "",
  "unknown",
  "loading...",
  "initializing...",
  "pending",
  "未知",
  "加载中",
  "初始化中",
  "待定",
]);

const isMissingRequiredVisibleField = (value: unknown): boolean => {
  if (typeof value !== "string") {
    return true;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return true;
  }
  return REQUIRED_VISIBLE_PLACEHOLDER_VALUES.has(trimmed.toLowerCase());
};

export const actorVisibleSchema = z.object({
  name: z.string().describe("Known name."),
  title: z.string().nullish().describe("Surface title or role."),
  age: z.string().nullish().describe("Apparent age."),
  gender: z.string().nullish().describe("Presented gender."),
  profession: z.string().nullish().describe("Surface profession."),
  background: z.string().nullish().describe("Public background."),
  race: z.string().nullish().describe("Surface race/species (no gender)."),
  description: z
    .string()
    .nullish()
    .describe("Public perception or reputation."),
  appearance: z.string().nullish().describe("Observable appearance."),
  status: z.string().nullish().describe("What they appear to be doing."),
  roleTag: z.string().nullish().describe("Role tag (e.g. Merchant, Guard)."),
  voice: z.string().nullish(),
  mannerism: z.string().nullish(),
  mood: z.string().nullish(),
});

export const actorHiddenSchema = z.object({
  trueName: z.string().nullish().describe("True name (GM-only)."),
  race: z.string().nullish().describe("True race/species (GM-only)."),
  gender: z.string().nullish().describe("True gender identity (GM-only)."),
  realPersonality: z.string().nullish().describe("True personality (GM-only)."),
  realMotives: z.string().nullish().describe("True motives (GM-only)."),
  routine: z.string().nullish().describe("Daily routine (GM-only)."),
  currentThought: z.string().nullish().describe("Inner monologue (GM-only)."),
  secrets: z.array(z.string()).nullish().describe("Hidden secrets (GM-only)."),
  status: z
    .string()
    .nullish()
    .describe("What they are actually doing (GM-only)."),
});

export const actorProfileSchema = z.object({
  id: z
    .string()
    .describe("Unique actor ID. Player='char:player'. NPC IDs must be stable."),
  kind: actorKindSchema.describe("player or npc."),
  currentLocation: z
    .string()
    .describe("Current location ID. Bracket alias [Name] if unresolved."),
  knownBy: knownBySchema.describe("Actor IDs aware of this character."),
  visible: actorVisibleSchema,
  hidden: actorHiddenSchema.nullish(),
  relations: z
    .array(relationEdgeSchema)
    .default([])
    .describe("Directed relationships from this actor."),
  unlocked: z
    .boolean()
    .nullish()
    .describe("AI DECISION: true when actor may see hidden fields."),
  unlockReason: z.string().nullish().describe("REQUIRED when unlocked=true."),
  icon: z.string().nullish().describe("Single emoji icon."),
  highlight: z.boolean().nullish().describe("INVISIBLE to AI."),
  createdAt: z.number().nullish().describe("INVISIBLE to AI."),
  modifiedAt: versionedTimestampSchema
    .nullish()
    .describe("Version-aware modification timestamp."),
  lastAccess: accessTimestampSchema.nullish().describe("INVISIBLE to AI."),
  notes: z
    .string()
    .nullish()
    .describe(
      "AI self-notes for consistency and planning. Read before writing.",
    ),
});

export const placeholderSchema = z.object({
  id: z
    .string()
    .describe("Unique placeholder ID (e.g. 'ph_mysterious_artifact')."),
  label: z
    .string()
    .describe("A short label the actor can reference (surface name)."),
  knownBy: knownBySchema.describe(
    "Existence visibility: which actors know this placeholder exists.",
  ),
  visible: z.object({
    description: z
      .string()
      .describe("Actor-visible description (objective, evidence-based)."),
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

export const placeholderDraftFileSchema = z.object({
  path: z
    .string()
    .regex(PLACEHOLDER_PATH_REGEX)
    .describe(
      `REQUIRED. VFS markdown draft path under world/placeholders/<domain>/<id>.md (domains: ${PLACEHOLDER_DOMAINS.join(", ")}).`,
    ),
  markdown: z
    .string()
    .min(1)
    .describe(
      "REQUIRED. Placeholder draft markdown content. Include at minimum `- id:` and a Notes section.",
    ),
});

/** 角色档案（不包含 skills/conditions/hiddenTraits；它们以分文件形式存储） */
export const characterProfileSchema = z.object({
  name: z.string().describe("Name of the protagonist."),
  title: z.string().describe("Starting Class/Role/Title."),
  status: z
    .string()
    .nullish()
    .describe("Initial condition (e.g. Healthy, Amnesiac)."),
  appearance: z.string().nullish().describe("Detailed physical appearance."),
  age: z
    .string()
    .nullish()
    .describe("Character's age (e.g. '25', 'Unknown', 'Ancient')."),
  gender: z
    .string()
    .nullish()
    .describe(
      "Character's visible gender presentation (e.g. 'Male', 'Female', 'Unspecified').",
    ),
  profession: z.string().nullish().describe("Character's occupation or class."),
  background: z.string().nullish().describe("Brief life story and background."),
  race: z
    .string()
    .nullish()
    .describe("The character's race/species only (do not include gender)."),
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
    .describe(
      "The protagonist's current location ID (location.id). If unresolved, temporary bracket alias [Location Name] is allowed.",
    ),
});

/** 完整角色状态 Schema */
export const characterStatusSchema = z.object({
  name: z.string().describe("Name of the protagonist."),
  title: z.string().describe("Starting Class/Role/Title."),
  status: z.string().describe("Initial condition (e.g. Healthy, Amnesiac)."),
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
  gender: z
    .string()
    .describe(
      "Character's visible gender presentation (e.g. 'Male', 'Female', 'Unspecified').",
    ),
  profession: z.string().describe("Character's occupation or class."),
  background: z.string().describe("Brief life story and background."),
  race: z
    .string()
    .describe("The character's race/species only (do not include gender)."),
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
    .describe(
      "The protagonist's current location ID (location.id). If unresolved, temporary bracket alias [Location Name] is allowed.",
    ),
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
    .describe("Known rules (magic, physics, society)."),
});

/** 世界设定隐藏层 */
export const worldSettingHiddenSchema = z.object({
  hiddenRules: z.string().nullish().describe("Secret rules unknown to most."),
  secrets: z.array(z.string()).nullish().describe("World-level hidden truths."),
});

/** 世界设定 */
export const worldSettingSchema = z.object({
  visible: worldSettingVisibleSchema.describe("Publicly known world info."),
  hidden: worldSettingHiddenSchema.describe("Secret truths (GM-only)."),
  history: z.string().describe("Formative past events."),
});

/** 主要目标可见层 */
export const mainGoalVisibleSchema = z.object({
  description: z.string().describe("Apparent main motivation."),
  conditions: z.string().describe("Known conditions for success."),
});

/** 主要目标隐藏层 */
export const mainGoalHiddenSchema = z.object({
  trueDescription: z.string().describe("Hidden true purpose (GM-only)."),
  trueConditions: z.string().describe("Secret conditions for the real goal."),
});

/** 主要目标 */
export const mainGoalSchema = z.object({
  visible: mainGoalVisibleSchema.describe("Apparent goal."),
  hidden: mainGoalHiddenSchema.describe("Hidden true nature (GM-only)."),
});

// ============================================================================
// World Info (Canonical + per-actor view for unlock flags)
// ============================================================================

/**
 * Canonical world information (world truth / GM truth).
 * Stored at: `world/world_info.json`
 *
 * IMPORTANT: This file MUST NOT contain per-actor fields like `unlocked` or `highlight`.
 */
export const worldInfoSchema = z
  .object({
    title: z.string().describe("Adventure title."),
    premise: z.string().describe("The inciting incident and setting setup."),
    narrativeScale: z
      .enum(["epic", "intimate", "balanced"])
      .nullish()
      .describe("Narrative scale decision captured at outline time."),
    worldSetting: worldSettingSchema.describe("Dual-layer world setting."),
    mainGoal: mainGoalSchema.describe("Dual-layer main goal."),
  })
  .strict();

/**
 * Per-actor unlock state for world info (player-facing revelation controls).
 * Stored at: `world/characters/<actorId>/views/world_info.json`
 */
export const worldInfoViewSchema = z
  .object({
    worldSettingUnlocked: z
      .boolean()
      .nullish()
      .describe("Per-actor: whether worldSetting.hidden is revealed."),
    worldSettingUnlockReason: z
      .string()
      .nullish()
      .describe("REQUIRED when worldSettingUnlocked=true."),
    mainGoalUnlocked: z
      .boolean()
      .nullish()
      .describe("Per-actor: whether mainGoal.hidden is revealed."),
    mainGoalUnlockReason: z
      .string()
      .nullish()
      .describe("REQUIRED when mainGoalUnlocked=true."),
    highlight: z.boolean().nullish().describe("UI-only highlight flag."),
    lastAccess: accessTimestampSchema
      .nullish()
      .describe("UI-only last access timestamp."),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.worldSettingUnlocked && !value.worldSettingUnlockReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "worldSettingUnlockReason is required when worldSettingUnlocked=true",
        path: ["worldSettingUnlockReason"],
      });
    }
    if (value.mainGoalUnlocked && !value.mainGoalUnlockReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "mainGoalUnlockReason is required when mainGoalUnlocked=true",
        path: ["mainGoalUnlockReason"],
      });
    }
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
  traits: z.array(hiddenTraitSchema).default([]).describe("Actor traits."),
  inventory: z
    .array(inventoryItemSchema)
    .default([])
    .describe("Actor inventory items (instances)."),
});

const requiredConcretePlayerString = (fieldPath: string) =>
  z
    .string()
    .trim()
    .min(1)
    .refine((value) => !isMissingRequiredVisibleField(value), {
      message: `${fieldPath} is REQUIRED and must be a concrete value (not Unknown/placeholder)`,
    });

export const strictPlayerVisibleSchema = actorVisibleSchema.extend({
  name: requiredConcretePlayerString("player.profile.visible.name"),
  title: requiredConcretePlayerString("player.profile.visible.title"),
  age: requiredConcretePlayerString("player.profile.visible.age"),
  gender: requiredConcretePlayerString("player.profile.visible.gender"),
  profession: requiredConcretePlayerString("player.profile.visible.profession"),
  background: requiredConcretePlayerString("player.profile.visible.background"),
  race: requiredConcretePlayerString("player.profile.visible.race"),
  appearance: requiredConcretePlayerString("player.profile.visible.appearance"),
  status: requiredConcretePlayerString("player.profile.visible.status"),
});

export const strictPlayerProfileSchema = actorProfileSchema.extend({
  id: z.literal("char:player"),
  kind: z.literal("player"),
  currentLocation: requiredConcretePlayerString(
    "player.profile.currentLocation",
  ),
  visible: strictPlayerVisibleSchema,
});

export const strictPlayerBundleSchema = actorBundleSchema.extend({
  profile: strictPlayerProfileSchema,
  skills: z
    .array(skillSchema)
    .describe("Player skills (required; can be empty)."),
  conditions: z
    .array(conditionSchema)
    .describe("Player conditions (required; can be empty)."),
  traits: z
    .array(hiddenTraitSchema)
    .default([])
    .describe("Player hidden traits (optional; defaults to empty)."),
  inventory: z
    .array(inventoryItemSchema)
    .default([])
    .describe("Player inventory items (optional; defaults to empty)."),
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
  player: strictPlayerBundleSchema.describe("The player actor bundle."),
  npcs: z.array(actorBundleSchema).describe("Initial NPC actor bundles (1-2)."),
  placeholders: z
    .array(placeholderDraftFileSchema)
    .default([])
    .describe("Unresolved placeholder draft markdown files."),

  // World entities
  quests: z
    .array(questSchema)
    .describe("Initial quests (at least one main quest is required)."),
  factions: z.array(factionSchema).describe("Major power groups or factions."),
  locations: z
    .array(locationSchema)
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
        .describe("Initial choices for the protagonist."),
      atmosphere: atmosphereSchema.nullish().describe("Override atmosphere."),
      imagePrompt: z
        .string()
        .nullish()
        .describe("Optional opening scene image prompt in story language."),
    })
    .nullish()
    .describe("Opening narrative generated in Phase 9."),
});

// ============================================================================
// 分阶段故事大纲 Schemas (用于规避 Gemini schema 状态限制)
// ============================================================================

/**
 * Phase 0: 图片解析 (仅当用户上传图片时使用)
 * 分析用户上传的图片，生成与主题结构一致的世界背景数据
 * 输出将用于增强 Phase 1 的世界观构建
 */
export const outlineImageSeedSchema = z.object({
  // 核心世界观描述 - 与 themes.json 的 worldSetting 对应
  worldSetting: z
    .string()
    .describe(
      "World description from image: geography, era, social structure, supernatural elements (3-5 sentences).",
    ),

  // 叙事风格 - 与 themes.json 的 narrativeStyle 对应
  narrativeStyle: z
    .string()
    .describe(
      "Narrative tone and style inferred from the image (2-3 sentences).",
    ),

  // 背景模板 - 与 themes.json 的 backgroundTemplate 对应
  backgroundTemplate: z
    .string()
    .describe(
      "Story background template with [placeholders] inspired by the image (2-3 sentences).",
    ),

  // 建议的故事标题
  suggestedTitle: z
    .string()
    .describe("Evocative adventure title hinting at themes and atmosphere."),

  // 开场场景描述 - 将作为 Phase 9 的参考
  openingSceneDescription: z
    .string()
    .describe("Vivid opening scene based on the image (2-3 sentences)."),

  // 主要视觉元素
  visualElements: z
    .array(z.string())
    .describe(
      "Key visual elements to carry into the story (e.g. 'crumbling cathedral', 'blood-red moon').",
    ),

  // 建议的环境主题
  suggestedEnvTheme: z
    .enum(OUTLINE_PHASE0_SUGGESTED_ENV_THEME_VALUES)
    .describe("The visual theme most appropriate for the image."),

  // 建议的音频氛围
  suggestedAmbience: z
    .enum(OUTLINE_PHASE0_SUGGESTED_AMBIENCE_VALUES)
    .describe("The audio ambience most appropriate for the image."),

  // 主角在场景中的角色提示
  protagonistHint: z
    .string()
    .nullish()
    .describe(
      "Apparent role/situation of any visible character. Informs Phase 2.",
    ),

  // 时间设定提示
  timePeriodHint: z
    .string()
    .nullish()
    .describe(
      "Era or time period suggested by the image (e.g. 'Ancient medieval', 'Post-apocalyptic').",
    ),
});

/**
 * Phase 1: 故事总纲（可演进）
 * 生成完整剧情大纲 markdown（指导性，不是硬约束）
 */
export const outlineMasterPlanSchema = z.object({
  storyPlanMarkdown: z
    .string()
    .describe(
      "A complete, detailed Markdown story plan (plan.md style) that preserves long-range continuity while allowing player-driven divergence.",
    ),
  planningMetadata: z
    .object({
      structureVersion: z
        .literal("v3")
        .describe("Story plan structure version."),
      branchStrategy: z
        .enum(["guided", "adaptive", "player-led"])
        .describe("Branch handling strategy when player choices diverge."),
      endingFlexibility: z
        .enum(["low", "medium", "high"])
        .describe("How far the ending may shift based on player behavior."),
      recoveryPolicy: z
        .object({
          allowNaturalRecovery: z
            .boolean()
            .describe(
              "Allow non-forced narrative recovery back to existing arcs.",
            ),
          allowOutlineRevision: z
            .boolean()
            .describe(
              "Allow revising plan.md when player intent changes trajectory.",
            ),
          forbidDeusExMachina: z
            .boolean()
            .describe("Forbid deus-ex-machina corrections.")
            .default(true),
        })
        .describe("Core policy for handling outline divergence in runtime."),
    })
    .describe("Machine-readable governance metadata for the story plan."),
});

/**
 * Placeholder Registry: 占位实体草稿
 * 用于承载未来可激活实体线索（软覆盖，允许空数组）
 */
export const outlinePlaceholderRegistrySchema = z.object({
  placeholders: z
    .array(placeholderDraftFileSchema)
    .default([])
    .describe(
      "Optional placeholder draft markdown files for deferred entities (soft coverage, may be empty).",
    ),
});

/**
 * Phase 2: 世界基础设定
 * 包含故事的基本框架：标题、前提、世界观、时间、主要目标
 */
export const outlineWorldFoundationSchema = z.object({
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
 * Phase 3: 主角角色
 * 完整的角色信息
 */
export const outlinePlayerActorSchema = z.object({
  player: strictPlayerBundleSchema.describe(
    "The player actor bundle (profile + skills/conditions/traits + inventory). Player id MUST be 'char:player'.",
  ),
});

/**
 * Phase 4: 地点
 * 初始地点
 */
export const outlineLocationsSchema = z.object({
  locations: z
    .array(outlineLocationSchema)
    .describe(
      "1-2 initial locations with detailed visible and hidden layers. Each MUST have a unique 'id' field.",
    ),
});

/**
 * Phase 5: 阵营
 * 主要势力
 */
export const outlineFactionsSchema = z.object({
  factions: z
    .array(factionSchema)
    .describe(
      "2-3 major power groups with visible and hidden agendas. Each MUST have a unique 'id' field.",
    ),
});

/**
 * Phase 6: 关系 (NPC)
 * NPC关系
 */
export const outlineNpcsRelationshipsSchema = z.object({
  npcs: z
    .array(actorBundleSchema)
    .describe(
      "1-2 initial NPC actor bundles. Each profile.kind MUST be 'npc'. Each profile MUST include relations (NPC->player attitude, and optionally NPC<->NPC).",
    ),
  playerPerceptions: z
    .array(relationPerceptionSchema)
    .default([])
    .describe(
      "Player->NPC perception edges (objective, evidence-based). These will be merged into player.profile.relations.",
    ),
});

/**
 * Phase 7: 任务
 * 初始任务图
 */
export const outlineQuestsSchema = z.object({
  quests: z
    .array(questSchema)
    .describe(
      "1-2 initial quests (at least one main quest). Include visible and hidden objectives.",
    ),
});

/**
 * Phase 8: 知识
 * 初始知识图
 */
export const outlineKnowledgeSchema = z.object({
  knowledge: z
    .array(knowledgeEntrySchema)
    .describe(
      "2-3 initial knowledge entries about the world. Each MUST have a unique 'id' field.",
    ),
});

/**
 * Phase 9: 时间线
 * 时间线事件
 */
export const outlineTimelineSchema = z.object({
  timeline: z
    .array(timelineEventSchema)
    .describe("3-5 backstory timeline events with visible and hidden layers."),
});

/**
 * Phase 10: 氛围
 * 初始氛围
 */
export const outlineAtmosphereSchema = z.object({
  initialAtmosphere: atmosphereSchema.describe(
    "Initial atmosphere with visual theme (envTheme) and audio ambience.",
  ),
});

/**
 * Phase 9: Opening Narrative
 * The initial story segment that establishes the scene
 */
export const outlineOpeningNarrativeSchema = z.object({
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
      .describe("2-4 initial choices for the protagonist's first action."),
    atmosphere: atmosphereSchema
      .nullish()
      .describe("Override initial atmosphere if the opening scene differs."),
    imagePrompt: z
      .string()
      .nullish()
      .describe("Optional opening scene image prompt in story language."),
  }),
});

/** 分阶段 Schema 类型定义 */
export type OutlineImageSeed = z.infer<typeof outlineImageSeedSchema>;
export type OutlineMasterPlan = z.infer<typeof outlineMasterPlanSchema>;
export type OutlinePlaceholderRegistry = z.infer<
  typeof outlinePlaceholderRegistrySchema
>;
export type OutlineWorldFoundation = z.infer<
  typeof outlineWorldFoundationSchema
>;
export type OutlinePlayerActor = z.infer<typeof outlinePlayerActorSchema>;
export type OutlineLocations = z.infer<typeof outlineLocationsSchema>;
export type OutlineFactions = z.infer<typeof outlineFactionsSchema>;
export type OutlineNpcsRelationships = z.infer<
  typeof outlineNpcsRelationshipsSchema
>;
export type OutlineQuests = z.infer<typeof outlineQuestsSchema>;
export type OutlineKnowledge = z.infer<typeof outlineKnowledgeSchema>;
export type OutlineTimeline = z.infer<typeof outlineTimelineSchema>;
export type OutlineAtmosphere = z.infer<typeof outlineAtmosphereSchema>;
export type OutlineOpeningNarrative = z.infer<
  typeof outlineOpeningNarrativeSchema
>;

// Note: PartialStoryOutline is now defined in types.ts to support GameState integration
// The phase types above are re-exported for type-safe phase result handling

// ============================================================================
// 摘要 Schemas
// ============================================================================

/** 摘要可见层 */
export const summaryVisibleSchema = z.object({
  narrative: z
    .string()
    .describe("Narrative summary from protagonist's perspective."),
  majorEvents: z
    .array(z.string())
    .describe("Major events the protagonist witnessed."),
  characterDevelopment: z
    .string()
    .describe("Character development from protagonist's view."),
  worldState: z.string().describe("World state as protagonist understands it."),
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
    .describe("NPC actions protagonist didn't witness."),
  worldTruth: z.string().describe("Real state of the world."),
  unrevealed: z
    .array(z.string())
    .describe("Secrets not yet revealed to protagonist."),
});

/** 故事摘要 Schema */
export const storySummarySchema = z.object({
  id: z.number().int().nullish(),
  createdAt: z
    .number()
    .int()
    .nullish()
    .describe("System timestamp (Date.now()) when this summary was created."),
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
  nextSessionReferencesMarkdown: z
    .string()
    .nullish()
    .describe(
      "Optional free-form markdown handoff for next-session warm start. Runtime parses path references best-effort (prefer useful current/skills/**/SKILL.md paths and minimal anchors).",
    ),
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
    .describe("2-4 options for the protagonist's next action."),
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
            "New unique ID on 'add'; existing ID on 'update'/'remove' (immutable).",
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
            "New unique ID on 'add'; existing ID on 'update'/'remove' (immutable).",
          ),
        knownBy: knownBySchema
          .nullish()
          .describe(
            "Existence visibility: which actors know this actor exists.",
          ),
        currentLocation: z
          .string()
          .nullish()
          .describe(
            "Current location ID. If unresolved, temporary bracket alias [Location Name] is allowed.",
          ),
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
            "New unique ID on 'add'; existing ID on 'update'/'remove' (immutable).",
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
            "New unique ID on 'add'; existing ID on other actions (immutable).",
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
            "New unique ID on 'add'; existing ID on 'update' (immutable).",
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
            "New unique ID on 'add'; existing ID on 'update'/'remove' (immutable).",
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
                "New unique ID on 'add'; existing ID on 'update'/'remove' (immutable).",
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
                "New unique ID on 'add'; existing ID on 'update'/'remove' (immutable).",
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
          gender: z.string().nullish(),
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

**3. Character Attributes, Conditions, Skills (Actor Status):**
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
        "2-4 options for the protagonist's next action after the force update.",
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
export type PlaceholderDraftFile = z.infer<typeof placeholderDraftFileSchema>;
export type RelationEdge = z.infer<typeof relationEdgeSchema>;
export type ActorBundle = z.infer<typeof actorBundleSchema>;
export type Location = z.infer<typeof locationSchema>;
export type LocationViewModel = z.infer<typeof locationViewModelSchema>;
export type Quest = z.infer<typeof questSchema>;
export type QuestViewModel = z.infer<typeof questViewModelSchema>;
export type Skill = z.infer<typeof skillSchema>;
export type Condition = z.infer<typeof conditionSchema>;
export type KnowledgeEntry = z.infer<typeof knowledgeEntrySchema>;
export type KnowledgeEntryViewModel = z.infer<
  typeof knowledgeEntryViewModelSchema
>;
export type TimelineEvent = z.infer<typeof timelineEventSchema>;
export type TimelineEventViewModel = z.infer<
  typeof timelineEventViewModelSchema
>;
export type CausalChain = z.infer<typeof causalChainSchema>;
export type Faction = z.infer<typeof factionSchema>;
export type FactionViewModel = z.infer<typeof factionViewModelSchema>;
export type WorldInfo = z.infer<typeof worldInfoSchema>;
export type WorldInfoView = z.infer<typeof worldInfoViewSchema>;
export type ActorEntityViewBase = z.infer<typeof actorEntityViewBaseSchema>;
export type QuestView = z.infer<typeof questViewSchema>;
export type KnowledgeEntryView = z.infer<typeof knowledgeEntryViewSchema>;
export type TimelineEventView = z.infer<typeof timelineEventViewSchema>;
export type LocationView = z.infer<typeof locationViewSchema>;
export type FactionView = z.infer<typeof factionViewSchema>;
export type CausalChainView = z.infer<typeof causalChainViewSchema>;
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
