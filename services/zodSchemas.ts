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

/** 可见信息层 - 玩家可以看到的信息 */
export const visibleInfoSchema = z.object({
  description: z.string().describe("Visual or public description."),
  notes: z.string().optional().describe("Player or public notes."),
});

/** 隐藏信息层 - 只有 GM/AI 知道的真相 */
export const hiddenInfoSchema = z.object({
  truth: z.string().describe("The hidden truth or real nature."),
  secrets: z.array(z.string()).optional().describe("Hidden secrets."),
});

// ============================================================================
// 物品相关 Schemas
// ============================================================================

/** 物品可见层 */
export const inventoryItemVisibleSchema = z.object({
  description: z.string().describe("Visual description of the item."),
  notes: z.string().optional().describe("Player's notes about the item."),
});

/** 物品隐藏层 */
export const inventoryItemHiddenSchema = z.object({
  truth: z.string().describe("True nature/power of the item."),
  secrets: z
    .array(z.string())
    .optional()
    .describe("Hidden secrets about the item."),
});

/** 完整物品 Schema */
export const inventoryItemSchema = z.object({
  id: z.string().optional().describe("Format: inv:N"),
  name: z.string().describe("Name of the item."),
  visible: inventoryItemVisibleSchema,
  hidden: inventoryItemHiddenSchema.optional(),
  lore: z.string().optional().describe("Brief lore or history of the item."),
  icon: z.string().optional().describe("Icon identifier for the item."),
  unlocked: z
    .boolean()
    .optional()
    .describe(
      "AI DECISION: Set true when hidden truth discovered (examination, analysis, witnessing power). Default false.",
    ),
  highlight: z
    .boolean()
    .optional()
    .describe("True when updated in current turn (for UI)."),
  createdAt: z.number().optional(),
  lastModified: z.number().optional(),
  lastAccess: z.number().optional(),
});

// ============================================================================
// NPC/关系相关 Schemas
// ============================================================================

/** 关系可见层 */
export const relationshipVisibleSchema = z.object({
  name: z.string().describe("Name/Title the player knows them by."),
  description: z
    .string()
    .describe("Public perception - how others view this NPC."),
  appearance: z.string().optional().describe("Physical appearance details."),
  relationshipType: z
    .string()
    .describe(
      "Relationship status from player's perspective (e.g. Friend, Rival, Enemy, Mentor, Lover).",
    ),
  currentImpression: z
    .string()
    .optional()
    .describe("The NPC's current state from the protagonist's perspective."),
  personality: z
    .string()
    .optional()
    .describe("Public perception of personality - what people SAY about them."),
  affinity: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe(
      "Affinity score 0-100. <30=hostile, 30-70=neutral, >70=friendly.",
    ),
  affinityKnown: z
    .boolean()
    .optional()
    .describe("Whether the player knows the affinity level."),
});

/** 关系隐藏层 */
export const relationshipHiddenSchema = z.object({
  trueName: z
    .string()
    .optional()
    .describe("The character's real name (if different)."),
  realPersonality: z
    .string()
    .describe("True personality - what they REALLY are like."),
  realMotives: z.string().describe("True underlying motives and goals."),
  secrets: z.array(z.string()).optional().describe("Character's secrets."),
  trueAffinity: z.number().int().optional().describe("True affinity score."),
  relationshipType: z
    .string()
    .describe(
      "Relationship status from NPC's perspective (e.g. Tool, Prey, Master, Secret Lover).",
    ),
  status: z
    .string()
    .describe(
      "Current state/condition of the NPC (e.g. 'plotting', 'injured', 'waiting', 'traveling').",
    ),
});

/** 完整关系 Schema */
export const relationshipSchema = z.object({
  id: z.string().optional().describe("Format: npc:N"),
  known: z
    .boolean()
    .optional()
    .describe("Whether the player knows this character."),
  currentLocation: z
    .string()
    .optional()
    .describe("The NPC's current location ID (e.g., 'loc:1')."),
  visible: relationshipVisibleSchema,
  hidden: relationshipHiddenSchema,
  notes: z
    .string()
    .optional()
    .describe("NPC's observations of player's displayed knowledge/behavior."),
  unlocked: z
    .boolean()
    .optional()
    .describe(
      "AI DECISION (STRICT): ONLY set true via mind-reading, telepathy, or psychic tech.",
    ),
  highlight: z.boolean().optional(),
  createdAt: z.number().optional(),
  lastModified: z.number().optional(),
  lastAccess: z.number().optional(),
});

// ============================================================================
// 地点相关 Schemas
// ============================================================================

/** 地点可见层 */
export const locationVisibleSchema = z.object({
  description: z.string().describe("Visual description of the location."),
  knownFeatures: z
    .array(z.string())
    .describe("Known features of the location."),
});

/** 地点隐藏层 */
export const locationHiddenSchema = z.object({
  fullDescription: z.string().describe("True nature of the location."),
  hiddenFeatures: z
    .array(z.string())
    .describe("Hidden features not yet discovered."),
  secrets: z.array(z.string()).describe("Location secrets."),
});

/** 完整地点 Schema */
export const locationSchema = z.object({
  id: z.string().optional().describe("Format: loc:N"),
  name: z.string().describe("Name of the location."),
  visible: locationVisibleSchema,
  hidden: locationHiddenSchema.optional(),
  environment: z.string().optional().describe("Atmosphere/Environment tag."),
  lore: z.string().optional().describe("Location history or lore."),
  isVisited: z
    .boolean()
    .optional()
    .describe("Whether the location has been visited."),
  unlocked: z
    .boolean()
    .optional()
    .describe(
      "AI DECISION: Set true when story context reveals location's secrets.",
    ),
  highlight: z.boolean().optional(),
  createdAt: z.number().optional(),
  discoveredAt: z.number().optional(),
  lastAccess: z.number().optional(),
  notes: z.string().optional(),
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
    .optional()
    .describe("The hidden truth or real purpose."),
  trueObjectives: z
    .array(z.string())
    .optional()
    .describe("True hidden objectives."),
  secretOutcome: z
    .string()
    .optional()
    .describe("Secret outcome if quest is completed."),
});

/** 任务类型 */
export const questTypeSchema = z.enum(["main", "side", "hidden"]);

/** 任务状态 */
export const questStatusSchema = z.enum(["active", "completed", "failed"]);

/** 完整任务 Schema */
export const questSchema = z.object({
  id: z.string().optional().describe("Format: quest:N"),
  title: z.string().describe("Quest title."),
  type: questTypeSchema.describe("Quest type: main, side, or hidden."),
  status: questStatusSchema.optional().default("active"),
  visible: questVisibleSchema,
  hidden: questHiddenSchema.optional(),
  unlocked: z
    .boolean()
    .optional()
    .describe("AI DECISION: Set true when quest's hidden purpose is revealed."),
  highlight: z.boolean().optional(),
  createdAt: z.number().optional(),
  lastModified: z.number().optional(),
  lastAccess: z.number().optional(),
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
    .optional()
    .describe("Hidden drawbacks or costs."),
});

/** 完整技能 Schema */
export const skillSchema = z.object({
  id: z.string().optional().describe("Format: skill:N"),
  name: z.string().describe("Skill name."),
  level: z.string().describe("Skill level (e.g. Novice, Master, 1-100)."),
  visible: skillVisibleSchema,
  hidden: skillHiddenSchema.optional(),
  category: z.string().optional().describe("Skill category."),
  experience: z.number().optional(),
  unlocked: z
    .boolean()
    .optional()
    .describe(
      "AI DECISION: Set true when skill's hidden nature is understood.",
    ),
  highlight: z.boolean().optional(),
});

// ============================================================================
// 状态条件相关 Schemas
// ============================================================================

/** 条件可见层 */
export const conditionVisibleSchema = z.object({
  description: z.string().describe("Visible description of the condition."),
  perceivedSeverity: z
    .string()
    .optional()
    .describe("How severe it appears to be."),
});

/** 条件隐藏层 */
export const conditionHiddenSchema = z.object({
  trueCause: z.string().describe("The true cause of this condition."),
  actualSeverity: z
    .number()
    .int()
    .optional()
    .describe("Actual severity level."),
  progression: z
    .string()
    .optional()
    .describe("How the condition will progress."),
  cure: z.string().optional().describe("How to cure or remove this condition."),
});

/** 条件效果 */
export const conditionEffectsSchema = z.object({
  visible: z.array(z.string()).describe("Effects the player can see."),
  hidden: z.array(z.string()).describe("Hidden effects only GM knows."),
});

/** 条件类型 */
export const conditionTypeSchema = z.enum(["buff", "debuff", "neutral"]);

/** 完整条件 Schema */
export const conditionSchema = z.object({
  id: z.string().optional().describe("Format: cond:N"),
  name: z.string().describe("Condition name."),
  type: conditionTypeSchema.describe(
    "Condition type: buff, debuff, or neutral.",
  ),
  visible: conditionVisibleSchema,
  hidden: conditionHiddenSchema.optional(),
  effects: conditionEffectsSchema,
  duration: z.number().int().optional().describe("Duration in turns."),
  startTime: z.number().optional(),
  unlocked: z
    .boolean()
    .optional()
    .describe("AI DECISION: Set true when true cause/cure revealed."),
  highlight: z.boolean().optional(),
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
  details: z.string().optional().describe("Additional details or context."),
});

/** 知识隐藏层 */
export const knowledgeHiddenSchema = z.object({
  fullTruth: z.string().describe("The complete truth (GM knowledge)."),
  misconceptions: z
    .array(z.string())
    .optional()
    .describe("Common misconceptions."),
  toBeRevealed: z
    .array(z.string())
    .optional()
    .describe("Info to be revealed later."),
});

/** 完整知识条目 Schema */
export const knowledgeEntrySchema = z.object({
  id: z.string().optional().describe("Format: know:N"),
  title: z.string().describe("Title of the knowledge entry."),
  category: knowledgeCategorySchema.describe("Category for organization."),
  visible: knowledgeVisibleSchema,
  hidden: knowledgeHiddenSchema.optional(),
  discoveredAt: z
    .string()
    .optional()
    .describe("When this knowledge was discovered."),
  relatedTo: z.array(z.string()).optional().describe("Related entity IDs."),
  unlocked: z
    .boolean()
    .optional()
    .describe("AI DECISION: Set true when full truth discovered."),
  highlight: z.boolean().optional(),
  createdAt: z.number().optional(),
  lastModified: z.number().optional(),
  lastAccess: z.number().optional(),
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
    .optional()
    .describe("Publicly known cause or instigator."),
});

/** 时间线事件隐藏层 */
export const timelineEventHiddenSchema = z.object({
  trueDescription: z
    .string()
    .describe("The true nature of the event (GM knowledge)."),
  trueCausedBy: z.string().optional().describe("The real instigator or cause."),
  consequences: z
    .array(z.string())
    .optional()
    .describe("Hidden consequences or future implications."),
});

/** 完整时间线事件 Schema */
export const timelineEventSchema = z.object({
  id: z.string().describe("Unique ID for the event. Format: evt:N"),
  gameTime: z.string().describe("When the event happened in game time."),
  category: timelineEventCategorySchema.describe("Category of the event."),
  visible: timelineEventVisibleSchema,
  hidden: timelineEventHiddenSchema.optional(),
  involvedEntities: z
    .array(z.string())
    .optional()
    .describe("IDs of involved entities."),
  chainId: z.string().optional().describe("Link to a CausalChain."),
  unlocked: z
    .boolean()
    .optional()
    .describe(
      "AI DECISION: Set true when event's true cause/consequences uncovered.",
    ),
  known: z
    .boolean()
    .optional()
    .describe("Set to true if the player witnessed or heard about this event."),
  lastAccess: z.number().optional(),
  highlight: z.boolean().optional(),
});

// ============================================================================
// 因果链 Schemas
// ============================================================================

/** 待触发的后果 */
export const pendingConsequenceSchema = z.object({
  id: z.string().describe("Unique ID for tracking."),
  description: z.string().describe("What could happen if triggered."),
  readyAfterTurn: z
    .number()
    .int()
    .describe("The consequence CAN'T trigger UNTIL after this turn number."),
  createdAtTurn: z
    .number()
    .int()
    .optional()
    .describe("Turn when this consequence was created."),
  conditions: z
    .array(z.string())
    .optional()
    .describe("Narrative conditions you'll check when deciding to trigger."),
  triggered: z
    .boolean()
    .optional()
    .describe("True once consequence has been triggered."),
  triggeredAtTurn: z.number().int().optional().describe("Turn when triggered."),
  known: z
    .boolean()
    .optional()
    .describe(
      "Will the player know when this happens? Default false for hidden consequences.",
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
  rootCause: rootCauseSchema,
  events: z
    .array(timelineEventSchema)
    .optional()
    .describe("Events in this chain."),
  status: causalChainStatusSchema.describe("Current status of the chain."),
  pendingConsequences: z
    .array(pendingConsequenceSchema)
    .optional()
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
  title: z.string().optional().describe("Optional title or role."),
});

/** 阵营关系 */
export const factionRelationSchema = z.object({
  target: z.string().describe("Target faction name."),
  status: z.string().describe("Relationship status."),
});

/** 阵营可见层 */
export const factionVisibleSchema = z.object({
  agenda: z.string().describe("Public agenda/reputation."),
  members: z
    .array(factionMemberSchema)
    .optional()
    .describe("Publicly known members."),
  influence: z.string().optional().describe("Perceived influence description."),
  relations: z
    .array(factionRelationSchema)
    .optional()
    .describe("Public alliances/rivalries."),
});

/** 阵营隐藏层 */
export const factionHiddenSchema = z.object({
  agenda: z.string().describe("Secret agenda/corruption."),
  members: z
    .array(factionMemberSchema)
    .optional()
    .describe("Secret members/leaders."),
  influence: z.string().optional().describe("True influence description."),
  relations: z
    .array(factionRelationSchema)
    .optional()
    .describe("Secret alliances/rivalries."),
});

/** 完整阵营 Schema */
export const factionSchema = z.object({
  id: z.string().optional().describe("Format: fac:N"),
  name: z.string().describe("Faction name."),
  visible: factionVisibleSchema,
  hidden: factionHiddenSchema,
  unlocked: z
    .boolean()
    .optional()
    .describe("True when secret agenda is revealed."),
  highlight: z.boolean().optional(),
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
});

/** 隐藏特质 */
export const hiddenTraitSchema = z.object({
  id: z.string().optional().describe("Format: trait:N"),
  name: z.string().describe("Trait name."),
  description: z.string().describe("Description of the trait."),
  effects: z.array(z.string()).describe("Effects when triggered."),
  triggerConditions: z
    .array(z.string())
    .optional()
    .describe("Conditions to trigger the trait."),
  unlocked: z
    .boolean()
    .describe(
      "Set to true when the triggerConditions are met and the trait is revealed to the player.",
    ),
  highlight: z.boolean().optional(),
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
    .optional()
    .describe("Hidden personality traits."),
  appearance: z.string().describe("Detailed physical appearance."),
  profession: z
    .string()
    .optional()
    .describe("Character's occupation or class."),
  background: z
    .string()
    .optional()
    .describe("Brief life story and background."),
  race: z.string().optional().describe("The character's race."),
});

// ============================================================================
// 世界设定 Schemas
// ============================================================================

/** 世界设定 */
export const worldSettingSchema = z.object({
  visible: z.string().describe("Common knowledge about the world."),
  hidden: z.string().optional().describe("Secret truths about the world."),
  history: z.string().describe("Ancient events that shape the present."),
});

/** 主要目标 */
export const mainGoalSchema = z.object({
  visible: z.string().describe("The apparent main motivation or task."),
  hidden: z
    .string()
    .optional()
    .describe("The hidden event logic or true nature."),
});

// ============================================================================
// 故事大纲 Schema
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
]);

/** 氛围对象 - 包含视觉主题和音频氛围 */
export const atmosphereSchema = z.object({
  envTheme: envThemeSchema.describe(
    "The visual theme/color palette for UI rendering.",
  ),
  ambience: ambienceSchema.describe(
    "The audio ambience/environment for sound effects and music.",
  ),
});

/** 故事大纲 Schema (完整版 - 用于类型定义和最终验证) */
export const storyOutlineSchema = z.object({
  title: z.string().describe("A creative title for the adventure."),
  initialTime: z
    .string()
    .describe(
      "The starting time of the story (e.g., 'Year 2024', 'Day 1', 'The 3rd Era').",
    ),
  premise: z.string().describe("The inciting incident and setting setup."),
  mainGoal: mainGoalSchema.describe("The primary driving force of the story."),
  quests: z
    .array(questSchema)
    .describe("Initial quests (at least one main quest is required)."),
  worldSetting: worldSettingSchema.describe("Dual-layer world setting."),
  factions: z
    .array(factionSchema.omit({ id: true }))
    .describe("Major power groups or factions."),
  locations: z
    .array(locationSchema.omit({ id: true, isVisited: true, createdAt: true }))
    .describe("Initial locations with full details."),
  knowledge: z
    .array(knowledgeEntrySchema.omit({ id: true }))
    .optional()
    .describe("Initial knowledge entries about the world."),
  timeline: z
    .array(timelineEventSchema)
    .optional()
    .describe("Initial timeline events representing the backstory."),
  character: characterStatusSchema.describe(
    "The initialized character profile.",
  ),
  inventory: z
    .array(inventoryItemSchema.omit({ id: true }))
    .optional()
    .describe("Initial items in the inventory (1-3 items)."),
  relationships: z
    .array(relationshipSchema.omit({ id: true }))
    .optional()
    .describe("Initial relationships (1-2 NPCs)."),
  initialAtmosphere: atmosphereSchema.describe(
    "Initial atmosphere settings with visual theme and audio ambience.",
  ),
  // Unlocked flags - set by AI when player discovers hidden info
  worldSettingUnlocked: z
    .boolean()
    .optional()
    .describe("True when worldSetting.hidden is revealed."),
  mainGoalUnlocked: z
    .boolean()
    .optional()
    .describe("True when mainGoal.hidden is revealed."),
});

// ============================================================================
// 分阶段故事大纲 Schemas (用于规避 Gemini schema 状态限制)
// ============================================================================

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
  worldSetting: worldSettingSchema.describe(
    "Dual-layer world setting with visible and hidden truths.",
  ),
  mainGoal: mainGoalSchema.describe("The primary driving force of the story."),
});

/**
 * Phase 2: 主角角色
 * 完整的角色信息，包括属性、技能、状态、外貌等
 */
export const outlinePhase2Schema = z.object({
  character: characterStatusSchema.describe(
    "The fully initialized protagonist profile.",
  ),
});

/**
 * Phase 3: 世界实体 - 地点与阵营
 * 初始地点和主要势力
 */
export const outlinePhase3Schema = z.object({
  locations: z
    .array(locationSchema.omit({ id: true, isVisited: true, createdAt: true }))
    .describe("1-2 initial locations with detailed visible and hidden layers."),
  factions: z
    .array(factionSchema.omit({ id: true }))
    .describe("2-3 major power groups with visible and hidden agendas."),
});

/**
 * Phase 4: 关系与物品
 * NPC关系和初始物品
 */
export const outlinePhase4Schema = z.object({
  relationships: z
    .array(relationshipSchema.omit({ id: true }))
    .describe(
      "1-2 initial NPCs with full visible and hidden relationship details.",
    ),
  inventory: z
    .array(inventoryItemSchema.omit({ id: true }))
    .describe("1-3 starting items with detailed lore and hidden properties."),
});

/**
 * Phase 5: 任务、知识与氛围
 * 任务、世界知识、时间线事件和初始氛围
 */
export const outlinePhase5Schema = z.object({
  quests: z
    .array(questSchema)
    .describe(
      "1-2 initial quests (at least one main quest). Include visible and hidden objectives.",
    ),
  knowledge: z
    .array(knowledgeEntrySchema.omit({ id: true }))
    .describe("2-3 initial knowledge entries about the world."),
  timeline: z
    .array(timelineEventSchema)
    .describe("3-5 backstory timeline events with visible and hidden layers."),
  initialAtmosphere: atmosphereSchema.describe(
    "Initial atmosphere with visual theme (envTheme) and audio ambience.",
  ),
});

/** 分阶段 Schema 类型定义 */
export type OutlinePhase1 = z.infer<typeof outlinePhase1Schema>;
export type OutlinePhase2 = z.infer<typeof outlinePhase2Schema>;
export type OutlinePhase3 = z.infer<typeof outlinePhase3Schema>;
export type OutlinePhase4 = z.infer<typeof outlinePhase4Schema>;
export type OutlinePhase5 = z.infer<typeof outlinePhase5Schema>;

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
  id: z.number().int().optional(),
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
    .optional(),
  nodeRange: z
    .object({
      fromIndex: z.number().int(),
      toIndex: z.number().int(),
    })
    .optional(),
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
    .array(z.string())
    .min(2)
    .max(4)
    .describe("2-4 options for the player's next action."),
  imagePrompt: z
    .string()
    .optional()
    .describe(
      "A detailed prompt for generating an image of the current scene.",
    ),
  generateImage: z
    .boolean()
    .optional()
    .describe("Whether to generate an image for this turn."),
  atmosphere: atmosphereSchema
    .optional()
    .describe(
      "The current atmosphere settings (visual theme and audio ambience).",
    ),
  narrativeTone: z
    .string()
    .optional()
    .describe(
      "The tone of the narrative (e.g. 'suspenseful', 'cheerful', 'melancholy').",
    ),
  inventoryActions: z
    .array(
      z.object({
        action: z.enum(["add", "remove", "update"]),
        id: z.string().optional(),
        name: z.string(),
        visible: inventoryItemVisibleSchema.optional(),
        hidden: inventoryItemHiddenSchema.optional(),
        lore: z.string().optional(),
        unlocked: z.boolean().optional(),
      }),
    )
    .optional()
    .describe("Updates to inventory."),
  relationshipActions: z
    .array(
      z.object({
        action: z.enum(["add", "update", "remove"]),
        id: z.string().optional(),
        known: z.boolean().optional(),
        visible: relationshipVisibleSchema.partial().optional(),
        hidden: relationshipHiddenSchema.partial().optional(),
        notes: z.string().optional(),
        unlocked: z.boolean().optional(),
      }),
    )
    .optional()
    .describe("Updates to relationships."),
  locationActions: z
    .array(
      z.object({
        type: z.enum(["current", "known"]),
        action: z.enum(["update", "add"]),
        id: z.string().optional(),
        name: z.string(),
        visible: locationVisibleSchema.partial().optional(),
        hidden: locationHiddenSchema.partial().optional(),
        lore: z.string().optional(),
        environment: z.string().optional(),
        notes: z.string().optional(),
        unlocked: z.boolean().optional(),
      }),
    )
    .optional()
    .describe("Updates to locations."),
  questActions: z
    .array(
      z.object({
        action: z.enum(["add", "update", "complete", "fail"]),
        id: z.string(),
        title: z.string().optional(),
        type: questTypeSchema.optional(),
        visible: questVisibleSchema.partial().optional(),
        hidden: questHiddenSchema.partial().optional(),
        unlocked: z.boolean().optional(),
      }),
    )
    .optional()
    .describe("Updates to quests."),
  knowledgeActions: z
    .array(
      z.object({
        action: z.enum(["add", "update"]),
        id: z.string().optional(),
        title: z.string().optional(),
        category: knowledgeCategorySchema.optional(),
        visible: knowledgeVisibleSchema.partial().optional(),
        hidden: knowledgeHiddenSchema.partial().optional(),
        discoveredAt: z.string().optional(),
        relatedTo: z.array(z.string()).optional(),
        unlocked: z.boolean().optional(),
      }),
    )
    .optional()
    .describe("Updates to knowledge."),
  factionActions: z
    .array(
      z.object({
        action: z.enum(["update"]),
        id: z.string(),
        name: z.string(),
        visible: z.string().optional(),
        hidden: z.string().optional(),
      }),
    )
    .optional()
    .describe("Background actions taken by factions this turn."),
  characterUpdates: z
    .object({
      attributes: z
        .array(
          z.object({
            action: z.enum(["add", "update", "remove"]),
            name: z.string(),
            value: z.number().int().optional(),
            maxValue: z.number().int().optional(),
            color: attributeColorSchema.optional(),
          }),
        )
        .optional(),
      skills: z
        .array(
          z.object({
            action: z.enum(["add", "update", "remove"]),
            name: z.string(),
            level: z.string().optional(),
            visible: skillVisibleSchema.partial().optional(),
            hidden: skillHiddenSchema.partial().optional(),
            category: z.string().optional(),
            unlocked: z.boolean().optional(),
          }),
        )
        .optional(),
      conditions: z
        .array(
          z.object({
            action: z.enum(["add", "update", "remove"]),
            id: z.string().optional(),
            name: z.string(),
            type: conditionTypeSchema.optional(),
            visible: conditionVisibleSchema.partial().optional(),
            hidden: conditionHiddenSchema.partial().optional(),
            effects: conditionEffectsSchema.partial().optional(),
            duration: z.number().int().optional(),
            unlocked: z.boolean().optional(),
          }),
        )
        .optional(),
      hiddenTraits: z
        .array(
          z.object({
            action: z.enum(["add", "update", "remove"]),
            id: z.string().optional(),
            name: z.string(),
            description: z.string().optional(),
            effects: z.array(z.string()).optional(),
            triggerConditions: z.array(z.string()).optional(),
            unlocked: z.boolean().optional(),
          }),
        )
        .optional(),
      profile: z
        .object({
          status: z.string().optional(),
          appearance: z.string().optional(),
          profession: z.string().optional(),
          background: z.string().optional(),
          race: z.string().optional(),
        })
        .optional(),
    })
    .optional()
    .describe("Updates to character stats, skills, and profile."),
  timelineEvents: z
    .array(
      z.object({
        category: z.enum(["npc_action", "world_event", "consequence"]),
        visible: timelineEventVisibleSchema,
        hidden: timelineEventHiddenSchema.optional(),
        involvedEntities: z.array(z.string()).optional(),
        chainId: z.string().optional(),
        newChain: z
          .object({
            description: z.string(),
          })
          .optional(),
        projectedConsequences: z
          .array(
            z.object({
              description: z.string(),
              delayTurns: z.number().int(),
              probability: z.number().min(0).max(1),
            }),
          )
          .optional(),
        known: z.boolean().optional(),
      }),
    )
    .optional()
    .describe("New timeline events."),
  timeUpdate: z
    .string()
    .optional()
    .describe("The new time string if time has passed."),
  worldInfoUpdates: z
    .array(
      z.object({
        unlockWorldSetting: z.boolean().optional(),
        unlockMainGoal: z.boolean().optional(),
        reason: z.string(),
      }),
    )
    .optional()
    .describe("Track when world-level secrets are unlocked."),
  aliveEntities: z
    .object({
      inventory: z.array(z.string()).optional(),
      relationships: z.array(z.string()).optional(),
      locations: z.array(z.string()).optional(),
      quests: z.array(z.string()).optional(),
      knowledge: z.array(z.string()).optional(),
      timeline: z.array(z.string()).optional(),
      skills: z.array(z.string()).optional(),
      conditions: z.array(z.string()).optional(),
      hiddenTraits: z.array(z.string()).optional(),
      causalChains: z.array(z.string()).optional(),
    })
    .optional()
    .describe("IDs of entities relevant for next turn context."),
  ragQueries: z
    .array(z.string())
    .optional()
    .describe("Semantic search queries for next turn context."),
  ragCurrentForkOnly: z
    .boolean()
    .optional()
    .describe(
      "If true, next turn's RAG queries will only search within the current timeline branch.",
    ),
  ragBeforeCurrentTurn: z
    .boolean()
    .optional()
    .describe(
      "If true, next turn's RAG queries will only search content from before the current turn.",
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
    .optional()
    .describe("Story continuation status."),
  forceEnd: z
    .boolean()
    .optional()
    .describe("If true, game ends permanently (no continue option)."),
  // Note: finalState is NOT included in AI schema - it's system-populated after processing
});

// ============================================================================
// finish_turn Schema (独立的回合结束响应 Schema)
// ============================================================================

/**
 * finish_turn 响应 Schema
 * 用于验证模型通过 finish_turn 工具调用或直接返回的回合结束响应
 */
export const finishTurnSchema = z.object({
  narrative: z.string().describe(
    `The final story text to present to the player as **Markdown formatted text**. Write in a vivid, engaging style. Show, don't tell. Focus on sensory details and character emotions.

**MARKDOWN FORMATTING RULES:**
Use **bold** for newly discovered locations, important items, and significant character names when first introduced.
Use *italics* for character thoughts, internal monologue, and emphasis.
Use > blockquotes for dialogue, letters, inscriptions, or quoted text.
Use --- horizontal rules to separate distinct scenes or time jumps.
Use \`inline code\` for in-world technical terms, spell incantations, or foreign words.
Do NOT use bullet points, numbered lists, or any list formatting as it disrupts the reading flow.`,
  ),
  choices: z
    .array(z.string())
    .min(2)
    .max(4)
    .describe(
      `2-4 options for the player's next action. CRITICAL: Choices MUST be consistent with the player character's:
1. **Knowledge/Cognition**: Only offer choices based on what the character KNOWS.
2. **Personality/Background**: Choices should reflect the character's personality.
3. **Current Conditions**: If the character is injured/exhausted, choices should reflect limitations.
4. **Skills & Abilities**: Offer choices that utilize the character's skills.
5. **Hidden Traits**: If a hidden trait is unlocked, it may unlock new choice types.`,
    ),
  imagePrompt: z
    .string()
    .optional()
    .describe("Optional prompt for generating an image of the current scene."),
  generateImage: z
    .boolean()
    .optional()
    .describe("Whether to generate an image for this turn."),
  atmosphere: atmosphereSchema
    .optional()
    .describe(
      "Atmosphere settings with envTheme (visual) and ambience (audio) for this scene.",
    ),
  narrativeTone: z
    .string()
    .optional()
    .describe(
      "The tone of the narrative (e.g., 'suspenseful', 'cheerful', 'melancholy').",
    ),
  aliveEntities: z
    .object({
      inventory: z
        .array(z.string())
        .optional()
        .describe("Item IDs (inv:N) relevant for next turn."),
      relationships: z
        .array(z.string())
        .optional()
        .describe("NPC IDs (npc:N) relevant for next turn."),
      locations: z
        .array(z.string())
        .optional()
        .describe("Location IDs (loc:N) relevant for next turn."),
      quests: z
        .array(z.string())
        .optional()
        .describe("Quest IDs (quest:N) relevant for next turn."),
      knowledge: z
        .array(z.string())
        .optional()
        .describe("Knowledge IDs (know:N) relevant for next turn."),
      timeline: z
        .array(z.string())
        .optional()
        .describe("Event IDs (evt:N) relevant for next turn."),
      skills: z
        .array(z.string())
        .optional()
        .describe("Character skill IDs relevant for next turn."),
      conditions: z
        .array(z.string())
        .optional()
        .describe("Character condition IDs relevant for next turn."),
      hiddenTraits: z
        .array(z.string())
        .optional()
        .describe("Character hidden trait IDs relevant for next turn."),
      causalChains: z
        .array(z.string())
        .optional()
        .describe(
          "CausalChain chainIds with pending consequences that may trigger soon.",
        ),
    })
    .optional()
    .describe(
      "IDs of entities that are DIRECTLY RELEVANT to the next turn and should be pre-loaded in context.",
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
    .describe(
      `Story continuation status. MUST be set every turn:
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
    .optional()
    .describe(
      `Only relevant when 'ending' is set. Determines if the game ends permanently:
- true: Game is OVER. Player cannot continue from this point.
- false/omit: Player can choose to continue despite the ending.`,
    ),
  ragQueries: z
    .array(z.string())
    .optional()
    .describe(
      `Semantic search queries to pre-fetch relevant context for the NEXT turn.`,
    ),
  ragCurrentForkOnly: z
    .boolean()
    .optional()
    .describe(
      "If true, next turn's RAG queries will only search within the current timeline branch.",
    ),
  ragBeforeCurrentTurn: z
    .boolean()
    .optional()
    .describe(
      "If true, next turn's RAG queries will only search content from before the current turn.",
    ),
});

/** finish_turn 响应类型 */
export type FinishTurnResponse = z.infer<typeof finishTurnSchema>;

// ============================================================================
// 翻译 Schema
// ============================================================================

export const translationSchema = z.object({
  segments: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      choices: z.array(z.string()),
    }),
  ),
  inventory: z.array(z.string()).optional(),
  character: z
    .object({
      name: z.string().optional(),
      title: z.string().optional(),
      appearance: z.string().optional(),
      profession: z.string().optional(),
      background: z.string().optional(),
      race: z.string().optional(),
    })
    .optional(),
  relationships: z
    .array(
      z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        relationshipType: z.string().optional(),
      }),
    )
    .optional(),
});

// ============================================================================
// 类型导出
// ============================================================================

export type InventoryItem = z.infer<typeof inventoryItemSchema>;
export type Relationship = z.infer<typeof relationshipSchema>;
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
export type CharacterStatus = z.infer<typeof characterStatusSchema>;
export type StoryOutline = z.infer<typeof storyOutlineSchema>;
export type StorySummary = z.infer<typeof storySummarySchema>;
export type GameResponse = z.infer<typeof gameResponseSchema>;
export type Atmosphere = z.infer<typeof atmosphereSchema>;
export type EnvTheme = z.infer<typeof envThemeSchema>;
export type Ambience = z.infer<typeof ambienceSchema>;

// ============================================================================
// Provider Schema 编译器
// ============================================================================

/** 预编译的 Gemini Schemas */
export const GEMINI_SCHEMAS = {
  storyOutline: zodToGemini(storyOutlineSchema),
  storySummary: zodToGemini(storySummarySchema),
  gameResponse: zodToGemini(gameResponseSchema),
  translation: zodToGemini(translationSchema),
  finishTurn: zodToGemini(finishTurnSchema),
  // 分阶段 Outline Schemas
  outlinePhase1: zodToGemini(outlinePhase1Schema),
  outlinePhase2: zodToGemini(outlinePhase2Schema),
  outlinePhase3: zodToGemini(outlinePhase3Schema),
  outlinePhase4: zodToGemini(outlinePhase4Schema),
  outlinePhase5: zodToGemini(outlinePhase5Schema),
} as const;

/** 预编译的 OpenAI Response Formats */
export const OPENAI_RESPONSE_FORMATS = {
  storyOutline: zodToOpenAIResponseFormat(storyOutlineSchema, "story_outline"),
  storySummary: zodToOpenAIResponseFormat(storySummarySchema, "story_summary"),
  gameResponse: zodToOpenAIResponseFormat(gameResponseSchema, "game_response"),
  translation: zodToOpenAIResponseFormat(translationSchema, "translation"),
  finishTurn: zodToOpenAIResponseFormat(finishTurnSchema, "finish_turn"),
  // 分阶段 Outline Response Formats
  outlinePhase1: zodToOpenAIResponseFormat(
    outlinePhase1Schema,
    "outline_phase1",
  ),
  outlinePhase2: zodToOpenAIResponseFormat(
    outlinePhase2Schema,
    "outline_phase2",
  ),
  outlinePhase3: zodToOpenAIResponseFormat(
    outlinePhase3Schema,
    "outline_phase3",
  ),
  outlinePhase4: zodToOpenAIResponseFormat(
    outlinePhase4Schema,
    "outline_phase4",
  ),
  outlinePhase5: zodToOpenAIResponseFormat(
    outlinePhase5Schema,
    "outline_phase5",
  ),
} as const;

/** 预编译的 OpenAI Schema 对象 (用于工具参数等) */
export const OPENAI_SCHEMAS = {
  storyOutline: zodToOpenAISchema(storyOutlineSchema),
  storySummary: zodToOpenAISchema(storySummarySchema),
  gameResponse: zodToOpenAISchema(gameResponseSchema),
  translation: zodToOpenAISchema(translationSchema),
  finishTurn: zodToOpenAISchema(finishTurnSchema),
  // 分阶段 Outline Schemas
  outlinePhase1: zodToOpenAISchema(outlinePhase1Schema),
  outlinePhase2: zodToOpenAISchema(outlinePhase2Schema),
  outlinePhase3: zodToOpenAISchema(outlinePhase3Schema),
  outlinePhase4: zodToOpenAISchema(outlinePhase4Schema),
  outlinePhase5: zodToOpenAISchema(outlinePhase5Schema),
} as const;

// ============================================================================
// 重新导出编译器函数
// ============================================================================

export {
  zodToGemini,
  zodToOpenAIResponseFormat,
  zodToOpenAISchema,
} from "./zodCompiler";
