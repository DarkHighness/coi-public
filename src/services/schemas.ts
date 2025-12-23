/**
 * ============================================================================
 * Schemas - Zod Schema 导出
 * ============================================================================
 *
 * 本文件从 zodSchemas.ts 导出 Zod schemas 和相关类型
 * 所有 Schema 定义集中在 zodSchemas.ts 中使用 Zod 管理
 *
 * 向后兼容：继续导出原有的 schema 名称
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
  finishTurnSchema,
  forceUpdateSchema,
  // Schema builders (for conditional RAG fields)
  buildFinishTurnSchema,
  buildForceUpdateSchema,
  // 分阶段 Outline Schemas
  outlinePhase0Schema,
  outlinePhase1Schema,
  outlinePhase2Schema,
  outlinePhase3Schema,
  outlinePhase4Schema,
  outlinePhase5Schema,
  outlinePhase6Schema,
  outlinePhase7Schema,
  outlinePhase8Schema,
  outlinePhase9Schema,
  outlinePhase10Schema,
} from "./zodSchemas";

// ============================================================================
// 从 zodSchemas.ts 重新导出类型 (向后兼容)
// ============================================================================

export type {
  InventoryItem,
  NPC,
  Location,
  Quest,
  Skill,
  Condition,
  KnowledgeEntry,
  TimelineEvent,
  CausalChain,
  Faction,
  CharacterAttribute,
  HiddenTrait,
  CharacterStatus,
  StoryOutline,
  StorySummary,
  GameResponse,
  Atmosphere,
  EnvTheme,
  Ambience,
  FinishTurnResponse,
  ForceUpdateResponse,
  // 分阶段 Outline 类型
  OutlinePhase0,
  OutlinePhase1,
  OutlinePhase2,
  OutlinePhase3,
  OutlinePhase4,
  OutlinePhase5,
  OutlinePhase6,
  OutlinePhase7,
  OutlinePhase8,
  OutlinePhase9,
  OutlinePhase10,
} from "./zodSchemas";

// PartialStoryOutline is now defined in types.ts for GameState integration
export type { PartialStoryOutline } from "../types";
