/**
 * ============================================================================
 * Schemas - Zod Schema 导出
 * ============================================================================
 *
 * 本文件从 zodSchemas.ts 导出 Zod schemas 和相关类型
 * 所有 Schema 定义集中在 zodSchemas.ts 中使用 Zod 管理
 */

// ============================================================================
// 导出 Zod Schemas
// ============================================================================

export {
  storyOutlineSchema,
  storySummarySchema,
  gameResponseSchema,
  atmosphereSchema,
  envThemeSchema,
  ambienceSchema,
  forceUpdateSchema,
  turnAssistantSchema,
  // Actor/relationship schemas
  actorProfileSchema,
  placeholderSchema,
  placeholderDraftFileSchema,
  relationEdgeSchema,
  actorBundleSchema,
  // Schema builders
  buildTurnAssistantSchema,
  buildForceUpdateSchema,
  // 分阶段 Outline Schemas
  outlineImageSeedSchema,
  outlineMasterPlanSchema,
  outlinePlaceholderRegistrySchema,
  outlineWorldFoundationSchema,
  outlinePlayerActorSchema,
  outlineLocationsSchema,
  outlineFactionsSchema,
  outlineNpcsRelationshipsSchema,
  outlineQuestsSchema,
  outlineKnowledgeSchema,
  outlineTimelineSchema,
  outlineAtmosphereSchema,
  outlineOpeningNarrativeSchema,
} from "./zodSchemas";

// ============================================================================
// 从 zodSchemas.ts 重新导出类型
// ============================================================================

export type {
  InventoryItem,
  NPC,
  ActorProfile,
  Placeholder,
  PlaceholderDraftFile,
  RelationEdge,
  ActorBundle,
  Location,
  Quest,
  Skill,
  Condition,
  KnowledgeEntry,
  TimelineEvent,
  CausalChain,
  Faction,
  HiddenTrait,
  CharacterStatus,
  StoryOutline,
  StorySummary,
  GameResponse,
  Atmosphere,
  EnvTheme,
  Ambience,
  TurnAssistantResponse,
  ForceUpdateResponse,
  // 分阶段 Outline 类型
  OutlineImageSeed,
  OutlineMasterPlan,
  OutlinePlaceholderRegistry,
  OutlineWorldFoundation,
  OutlinePlayerActor,
  OutlineLocations,
  OutlineFactions,
  OutlineNpcsRelationships,
  OutlineQuests,
  OutlineKnowledge,
  OutlineTimeline,
  OutlineAtmosphere,
  OutlineOpeningNarrative,
} from "./zodSchemas";

// PartialStoryOutline is now defined in types.ts for GameState integration
export type { PartialStoryOutline } from "../types";
