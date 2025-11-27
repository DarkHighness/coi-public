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
  translationSchema,
  atmosphereSchema,
  envThemeSchema,
  ambienceSchema,
} from "./zodSchemas";

// ============================================================================
// 导出预编译的 Provider Schemas
// ============================================================================

export {
  GEMINI_SCHEMAS,
  OPENAI_RESPONSE_FORMATS,
  OPENAI_SCHEMAS,
} from "./zodSchemas";

// ============================================================================
// 从 zodSchemas.ts 重新导出类型 (向后兼容)
// ============================================================================

export type {
  InventoryItem,
  Relationship,
  Location,
  Quest,
  Skill,
  Condition,
  KnowledgeEntry,
  TimelineEvent,
  CausalChain,
  Faction,
  CharacterStatus,
  StoryOutline,
  StorySummary,
  GameResponse,
  Atmosphere,
  EnvTheme,
  Ambience,
} from "./zodSchemas";
