import type { AtmosphereObject } from "./utils/constants/atmosphere";

// ============================================================================
// 版本化时间戳类型
// ============================================================================

/**
 * 版本化时间戳 - 用于准确比较实体修改顺序
 *
 * 设计理由：
 * - 分叉后，不同分支的 turnNumber 可能相同
 * - 使用 {forkId, turnNumber} 可以准确判断修改顺序
 * - 当前两者都无法判断时，使用 timestamp 作为 fallback
 *
 * 比较规则：
 * 1. 先比较 forkId，较大的表示较新的分支
 * 2. forkId 相同时，比较 turnNumber，较大的表示较新
 * 3. 都相同时，比较 timestamp
 */
export interface VersionedTimestamp {
  forkId: number;
  turnNumber: number;
  timestamp: number; // Date.now() 作为 fallback
}

/**
 * 访问时间戳 - 用于记录实体最后被访问的时间
 *
 * 比较规则：
 * 1. 先比较 forkId
 * 2. forkId 相同时比较 turnNumber
 * 3. turnNumber 相同时比较 timestamp
 */
export interface AccessTimestamp {
  forkId: number;
  turnNumber: number;
  timestamp: number;
}

/**
 * 比较两个版本化时间戳
 * @returns 负数表示 a 在 b 之前，正数表示 a 在 b 之后，0 表示相同
 */
export function compareVersionedTimestamp(
  a: VersionedTimestamp | undefined,
  b: VersionedTimestamp | undefined,
): number {
  // undefined 视为最早
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;

  // 先比较 forkId
  if (a.forkId !== b.forkId) {
    return a.forkId - b.forkId;
  }
  // 相同 forkId 时比较 turnNumber
  if (a.turnNumber !== b.turnNumber) {
    return a.turnNumber - b.turnNumber;
  }
  // 都相同时比较 timestamp
  return a.timestamp - b.timestamp;
}

/**
 * 比较两个访问时间戳
 * @returns 负数表示 a 在 b 之前，正数表示 a 在 b 之后，0 表示相同
 */
export function compareAccessTimestamp(
  a: AccessTimestamp | undefined,
  b: AccessTimestamp | undefined,
): number {
  // undefined 视为最早（最不活跃）
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;

  // 先比较 forkId
  if (a.forkId !== b.forkId) {
    return a.forkId - b.forkId;
  }
  // 相同 forkId 时比较 turnNumber
  if (a.turnNumber !== b.turnNumber) {
    return a.turnNumber - b.turnNumber;
  }
  // 都相同时比较 timestamp
  return a.timestamp - b.timestamp;
}

/**
 * 创建当前版本化时间戳
 */
export function createVersionedTimestamp(state: {
  forkId: number;
  turnNumber: number;
}): VersionedTimestamp {
  return {
    forkId: state.forkId,
    turnNumber: state.turnNumber,
    timestamp: Date.now(),
  };
}

/**
 * 从旧格式的 lastModified/lastAccess（Date.now()）迁移到版本化时间戳
 * 用于向后兼容
 */
export function migrateFromLegacyTimestamp(
  legacyTimestamp: number | VersionedTimestamp | undefined,
  defaultForkId: number = 0,
  defaultTurnNumber: number = 0,
): VersionedTimestamp {
  if (!legacyTimestamp) {
    return {
      forkId: defaultForkId,
      turnNumber: defaultTurnNumber,
      timestamp: Date.now(),
    };
  }
  if (typeof legacyTimestamp === "object" && "forkId" in legacyTimestamp) {
    // 已经是新格式，确保有 timestamp
    return {
      forkId: legacyTimestamp.forkId,
      turnNumber: legacyTimestamp.turnNumber,
      timestamp: legacyTimestamp.timestamp ?? Date.now(),
    };
  }
  // 旧格式是 Date.now()，保留作为 timestamp
  return {
    forkId: defaultForkId,
    turnNumber: defaultTurnNumber,
    timestamp:
      typeof legacyTimestamp === "number" ? legacyTimestamp : Date.now(),
  };
}

// ============================================================================
// 从 zodSchemas.ts 导入统一的类型
// ============================================================================
// 这些类型由 Zod schema 推导而来，确保 AI 生成验证和 TypeScript 类型的一致性
// zodSchemas.ts 中的 schema 允许某些字段 optional（因为 AI 可能不生成），
// 但在 GameState 中使用时这些字段会被系统填充

import type {
  InventoryItem as ZodInventoryItem,
  Relationship as ZodRelationship,
  Location as ZodLocation,
  Quest as ZodQuest,
  KnowledgeEntry as ZodKnowledgeEntry,
  TimelineEvent as ZodTimelineEvent,
  CausalChain as ZodCausalChain,
  Faction as ZodFaction,
  CharacterAttribute as ZodCharacterAttribute,
  HiddenTrait as ZodHiddenTrait,
  CharacterStatus as ZodCharacterStatus,
  StoryOutline as ZodStoryOutline,
  StorySummary as ZodStorySummary,
  GameResponse as ZodGameResponse,
  Atmosphere,
  EnvTheme,
  Ambience,
  Skill,
  Condition,
  OutlinePhase1,
  OutlinePhase2,
  OutlinePhase3,
  OutlinePhase4,
  OutlinePhase5,
} from "./services/zodSchemas";

// ============================================================================
// 应用层类型 - 使用 Required<> 确保必需字段
// ============================================================================
// AI 生成时某些字段可能是 optional，但存储到 GameState 后系统会填充它们
// 这里创建应用层类型，将关键字段标记为必需

/** 辅助类型：确保 id 和 createdAt 等系统字段是必需的 */
type WithRequiredId<T> = T & { id: string };

/**
 * 带版本化时间戳的类型
 * - modifiedAt: 版本化时间戳 {forkId, turnNumber}
 * - createdAt: 创建时的时间戳（保持 Date.now() 格式用于 UI 显示）
 * - lastModified: 保留用于向后兼容
 */
type WithVersionedTimestamps<T> = T & {
  createdAt: number;
  modifiedAt?: VersionedTimestamp;
  lastModified: number; // Keep for backward compatibility
};

/**
 * @deprecated 使用 WithVersionedTimestamps 替代
 * 保留用于向后兼容
 */
type WithRequiredTimestamps<T> = T & {
  createdAt: number;
  lastModified: number;
};

// 导出应用层类型（带必需的系统字段）
export type InventoryItem = WithRequiredId<
  WithVersionedTimestamps<ZodInventoryItem>
>;
export type Relationship = WithRequiredId<
  WithVersionedTimestamps<ZodRelationship>
>;
export type Location = WithRequiredId<ZodLocation> & {
  isVisited: boolean;
  createdAt: number;
  modifiedAt?: VersionedTimestamp;
};
export type Quest = WithRequiredId<WithVersionedTimestamps<ZodQuest>>;
export type KnowledgeEntry = WithRequiredId<
  WithVersionedTimestamps<ZodKnowledgeEntry>
>;
export type TimelineEvent = WithRequiredId<ZodTimelineEvent>;
export type CausalChain = ZodCausalChain; // chainId 是必需的，已在 schema 中定义
export type Faction = WithRequiredId<ZodFaction>;

// 以下类型直接使用 Zod 类型（不需要额外的必需字段）
export type CharacterAttribute = ZodCharacterAttribute;
export type HiddenTrait = ZodHiddenTrait;
export type CharacterStatus = ZodCharacterStatus;
export type StoryOutline = ZodStoryOutline;
export type StorySummary = ZodStorySummary;
// GameResponse extends ZodGameResponse with system-populated fields
export type GameResponse = ZodGameResponse & {
  finalState?: GameState; // System-populated after agentic loop processing
};
export type { Atmosphere, EnvTheme, Ambience, Skill, Condition };
export type {
  OutlinePhase1,
  OutlinePhase2,
  OutlinePhase3,
  OutlinePhase4,
  OutlinePhase5,
};

// 导出 Zod 原始类型（用于 AI 生成验证，字段可选）
export type {
  ZodInventoryItem,
  ZodRelationship,
  ZodLocation,
  ZodQuest,
  ZodKnowledgeEntry,
  ZodTimelineEvent,
  ZodFaction,
};

/**
 * ============================================================================
 * FIELD RESPONSIBILITY GUIDE
 * ============================================================================
 *
 * SYSTEM-MANAGED FIELDS (auto-generated, AI should NOT set):
 * - id: Auto-generated by system (inv:N, npc:N, loc:N, etc.)
 * - createdAt: Set when entity is created (Date.now())
 * - lastModified: Updated on any modification (Date.now())
 * - lastAccess: Updated when AI queries entity (turn number)
 * - isVisited: Set when player visits location
 * - discoveredAt: Set when location is first discovered
 *
 * AI-CONTROLLED FIELDS (AI decides value):
 * - visible.*: All visible layer content
 * - hidden.*: All hidden layer content (GM knowledge)
 * - unlocked: AI decides when hidden info is revealed (narrative judgment)
 * - known: Whether player knows this entity exists
 * - notes: NPC observations of player behavior
 * - highlight: Set true by AI when entity changes (cleared by UI after render)
 * - aliveEntities: AI marks entities needed for next turn
 *
 * MIXED FIELDS (AI sets initial, system may override):
 * - status: AI updates, but system may have constraints
 * - affinity: AI updates based on story, system validates range (0-100)
 * ============================================================================
 */

// Action Result type for handleAction return value
export interface StateChanges {
  // Detailed changes with names
  itemsAdded?: Array<{ name: string }>;
  itemsRemoved?: Array<{ name: string }>;
  npcsAdded?: Array<{ name: string }>;
  npcsRemoved?: Array<{ name: string }>;
  questsAdded?: Array<{ name: string }>;
  questsCompleted?: Array<{ name: string }>;
  locationsDiscovered?: Array<{ name: string }>;
  skillsGained?: Array<{ name: string }>;
  conditionsChanged?: Array<{ name: string }>;
}

export type ActionResult =
  | { success: true; stateChanges: StateChanges }
  | { success: false; error: string };

// Alive Entities: entities marked by AI as needed for next turn
export interface AliveEntities {
  inventory: string[]; // inv:N IDs
  relationships: string[]; // npc:N IDs
  locations: string[]; // loc:N IDs
  quests: string[]; // quest:N IDs
  knowledge: string[]; // know:N IDs
  timeline: string[]; // evt:N IDs
  // Character internal attributes (subset tracking)
  skills: string[]; // Character skill IDs relevant to next turn
  conditions: string[]; // Character condition IDs relevant to next turn
  hiddenTraits: string[]; // Character hidden trait IDs relevant to next turn
  causalChains: string[]; // CausalChain chainIds with pending consequences
}

export interface GameState {
  // Tree Structure: ID -> Segment
  nodes: Record<string, StorySegment>;
  activeNodeId: string | null; // The leaf node of the current path
  rootNodeId: string | null;
  currentFork: StorySegment[]; // The full segment list of the current fork

  inventory: InventoryItem[];
  relationships: Relationship[];
  quests: Quest[];
  character: CharacterStatus;
  knowledge: KnowledgeEntry[]; // Player's accumulated knowledge about the world
  factions: Faction[]; // Major power groups

  // Location System
  currentLocation: string;
  locations: Location[];

  // UI State (Persisted)
  uiState: UIState;

  // Meta
  outline: StoryOutline | null;
  summaries: StorySummary[]; // Array of summaries, where the last one is the most current
  lastSummarizedIndex: number; // Track how many nodes have been summarized to avoid re-summarizing

  isProcessing: boolean;
  isImageGenerating: boolean;
  generatingNodeId: string | null; // Track specifically which node is generating an image
  error: string | null;
  // Unified Atmosphere (controls visual theme, effects, and audio)
  atmosphere: AtmosphereObject; // The current atmosphere { envTheme, ambience }
  theme: string; // Static game genre (e.g. "Cyberpunk", "Wuxia")
  time: string; // In-game time tracking

  // Stats & Logs
  tokenUsage: TokenUsage;
  logs: LogEntry[];

  // Cached Veo Script
  veoScript?: string;

  // Initial Prompt (for retry)
  initialPrompt?: string;

  // New World System Fields
  nextIds: {
    item: number;
    npc: number;
    location: number;
    knowledge: number;
    quest: number;
    faction: number;
    timeline: number;
    causalChain: number;
    skill: number;
    condition: number;
    hiddenTrait: number;
  };
  timeline: TimelineEvent[];
  causalChains: CausalChain[];

  // Context Priority System: entities AI marked as relevant for next turn
  // Cleared at start of each turn, populated by AI via finish_turn
  aliveEntities: AliveEntities;
  // RAG Queries: semantic search queries for next turn context
  // Populated by AI via finish_turn, used at start of next turn
  ragQueries?: string[];
  // Current turn number (incremented on each player action)
  turnNumber: number;

  // Fork System: Track timeline branches for RAG filtering
  forkId: number; // Current fork ID (0 = original timeline, incremented on each fork)
  forkTree: ForkTree; // Tree structure tracking fork parent-child relationships

  // Developer Mode Flags
  godMode?: boolean; // God mode: bypass all restrictions and dangers
  unlockMode?: boolean; // Unlock mode: show all hidden info

  // Outline Generation State (for fault recovery)
  // This stores the conversation history during phased outline generation
  // Cleared once outline is fully generated
  outlineConversation?: OutlineConversationState;
}

/** State for resuming outline generation after failure */
export interface OutlineConversationState {
  theme: string;
  language: string;
  customContext?: string;
  systemInstruction: string;
  messages: Array<{ role: "user" | "model"; parts: { text: string }[] }>;
  partial: PartialStoryOutline;
  currentPhase: number; // 1-5, indicates which phase to resume from
}

/** Partial results from phased outline generation */
export interface PartialStoryOutline {
  phase1?: object;
  phase2?: object;
  phase3?: object;
  phase4?: object;
  phase5?: object;
}

// --- World System Interfaces ---

// Fork Tree: Track parent-child relationships between timeline forks
export interface ForkNode {
  id: number; // Fork ID
  parentId: number | null; // Parent fork ID (null for root/original timeline)
  createdAt: number; // Timestamp when fork was created
  createdAtTurn: number; // Turn number when fork was created
  sourceNodeId: string; // The story node ID from which this fork was created
}

export interface ForkTree {
  nodes: Record<number, ForkNode>; // forkId -> ForkNode
  nextForkId: number; // Counter for generating new fork IDs
}

export interface VisibleInfo {
  description: string;
  appearance?: string;
  notes?: string;
  [key: string]: any;
}

export interface HiddenInfo {
  truth: string;
  realPersonality?: string;
  secrets?: string[];
  realMotives?: string;
  hiddenAttributes?: Record<string, any>;
  [key: string]: any;
}

// TimelineEvent, CausalChain 从 zodSchemas.ts 导入

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cacheRead?: number;
  cacheWrite?: number;
}

// Individual tool call record
export interface ToolCallRecord {
  name: string;
  input: Record<string, any>;
  output: any;
  timestamp: number;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  provider: string;
  model: string;
  endpoint: string;
  // For agentic mode: array of tool calls in this turn
  toolCalls?: ToolCallRecord[];
  // Legacy fields for non-agentic mode
  request?: any;
  response?: any;
  // Parsed/structured result (for schema-based generation)
  parsedResult?: any;
  usage?: TokenUsage;
  generationDetails?: {
    dynamicContext?: string;
    ragContext?: string;
    ragQueries?: string[];
    systemPrompt?: string;
    userPrompt?: string;
    modelConfig?: any;
  };
}

// Faction, StoryOutline 从 zodSchemas.ts 导入

export interface SaveSlot {
  id: string;
  name: string;
  timestamp: number;
  theme: string;
  summary: string;
  previewImage?: string;
  // No need to store full state here, just metadata
}

// CharacterAttribute, CharacterSkill (as Skill), CharacterCondition (as Condition),
// HiddenTrait, CharacterStatus 从 zodSchemas.ts 导入

// 为兼容性保留别名
export type CharacterSkill = Skill;
export type CharacterCondition = Condition;

export interface ListState {
  pinnedIds: string[];
  customOrder: string[];
}

export interface UIState {
  inventory: ListState;
  locations: ListState;
  relationships: ListState;
  knowledge: ListState; // UI state for knowledge panel
  showSystemFooter?: boolean; // Persisted state for system footer
  sidebarCollapsed?: boolean; // Persisted state for left sidebar collapse
  timelineCollapsed?: boolean; // Persisted state for right timeline collapse
  embeddingExpanded?: boolean; // Persisted state for embedding panel expansion
}

// Relationship 从 zodSchemas.ts 导入

// Choice Interface for structured choices
export interface Choice {
  text: string;
  consequence?: string;
}

export interface StorySegment {
  id: string;
  parentId: string | null; // Pointer to parent for Tree Structure
  text: string;
  choices: (string | Choice)[]; // Support both string (legacy) and Choice object

  imagePrompt: string;
  imageUrl?: string;
  imageId?: string; // ID of the image in IndexedDB
  audioKey?: string; // Key for cached TTS audio in IndexedDB
  role: "user" | "model" | "system" | "command";
  timestamp: number;
  summarySnapshot?: StorySummary; // If this node triggered a summary, store it here
  usage?: TokenUsage;

  // Segment index
  segmentIdx: number; // The index of this segment in the history chain of the current fork

  // Fork-safe Summary State
  summaries?: StorySummary[]; // The total summary of the story up to this point (Dual-layer)
  summarizedIndex?: number; // The index in the history chain where the summary ends

  // Unified Atmosphere System (controls visual theme, effects, and audio)
  atmosphere?: AtmosphereObject; // The unified atmosphere { envTheme, ambience }

  narrativeTone?: string; // The tone of the narrative (e.g. "suspenseful", "cheerful")
  stateSnapshot?: GameStateSnapshot; // Snapshot of the game state at this point

  // Game Ending
  ending: EndingType; // Story continuation status - "continue" means story continues normally
  forceEnd?: boolean; // If true, game ends permanently (no continue); if false/undefined, player can continue
}

// Game Ending Types
export type EndingType =
  | "continue" // Story continues normally (default)
  | "death" // Player death / Game Over
  | "victory" // Main goal achieved
  | "true_ending" // Secret/True ending discovered
  | "bad_ending" // Bad outcome but not death
  | "neutral_ending"; // Story concluded without clear win/loss

/**
 * Context for generating a turn
 */
export interface TurnContext {
  recentHistory: StorySegment[];
  userAction: string;
  language: string;
  themeKey: string;
  tFunc: (key: string) => string;
  ragContext?: string;
  previousError?: string;
  settings: AISettings;
}

export interface GameStateSnapshot {
  // Entity State (Dual-layer)
  inventory: InventoryItem[];
  relationships: Relationship[];
  quests: Quest[];
  character: CharacterStatus;
  knowledge: KnowledgeEntry[];
  locations: Location[];
  currentLocation: string;
  factions: Faction[]; // Added factions to snapshot

  // ID Counters (Critical for forks)
  nextIds: {
    item: number;
    npc: number;
    location: number;
    knowledge: number;
    quest: number;
    faction: number;
    timeline: number;
    causalChain: number;
    skill: number;
    condition: number;
    hiddenTrait: number;
  };

  // World State
  time: string;
  timeline: TimelineEvent[];
  causalChains: CausalChain[];

  // Summaries (Dual-layer)
  summaries: StorySummary[];
  lastSummarizedIndex: number;

  // UI & Meta
  uiState: UIState;
  atmosphere: AtmosphereObject; // Unified atmosphere { envTheme, ambience }
  veoScript?: string;

  // Context Priority System
  aliveEntities: AliveEntities;
  ragQueries?: string[];
  turnNumber: number;

  // Fork System (Critical for RAG filtering across timelines)
  forkId: number;
  forkTree: ForkTree;
}

// Location, KnowledgeEntry, InventoryItem, Quest 从 zodSchemas.ts 导入

export interface InventoryAction {
  action: "add" | "remove" | "update";
  id?: string; // Numeric ID
  name: string; // Name is still useful for reference

  // Dual-layer support
  visible?: {
    description?: string;
    usage?: string;
    notes?: string;
  };
  hidden?: {
    truth?: string;
    secrets?: string[];
  };

  lore?: string;
  newItem?: string;
  unlocked?: boolean; // Set when hidden truth should be revealed/locked
}

export interface QuestAction {
  action: "add" | "update" | "complete" | "fail";
  id: string;
  title?: string;
  type?: "main" | "side" | "hidden";
  visible?: {
    description?: string;
    objectives?: string[];
  };
  hidden?: {
    trueDescription?: string;
    trueObjectives?: string[];
    secretOutcome?: string;
  };
  unlocked?: boolean; // Set when true objectives should be revealed
}

export interface RelationshipAction {
  action: "add" | "update" | "remove";
  id?: string;
  known?: boolean; // Update known status

  visible?: {
    name?: string; // Update visible name
    description?: string;
    appearance?: string;
    relationshipType?: string;
    currentImpression?: string;
    personality?: string;
    dialogueStyle?: string;
    affinity?: number;
    affinityKnown?: boolean;
  };
  hidden?: {
    realPersonality?: string;
    realMotives?: string;
    routine?: string;
    secrets?: string[];
    trueAffinity?: number;
    relationshipType?: string;
    status?: string;
  };

  notes?: string;
  unlocked?: boolean; // Set when mind-reading/telepathy reveals hidden personality
}

export interface LocationAction {
  type: "current" | "known";
  action: "update" | "add";
  id?: string;
  name: string;

  visible?: {
    description?: string;
    knownFeatures?: string[];
    resources?: string[];
  };
  hidden?: {
    fullDescription?: string;
    dangers?: string[];
    hiddenFeatures?: string[];
    secrets?: string[];
  };

  lore?: string;
  environment?: string;
  notes?: string;
  unlocked?: boolean; // Set when hidden secrets are discovered
}

export interface KnowledgeAction {
  action: "add" | "update";
  id?: string;
  title: string;
  category:
    | "landscape"
    | "history"
    | "item"
    | "legend"
    | "faction"
    | "culture"
    | "magic"
    | "technology"
    | "other";

  visible?: {
    description?: string;
    details?: string;
  };
  hidden?: {
    fullTruth?: string;
    misconceptions?: string[];
    toBeRevealed?: string[];
  };

  discoveredAt?: string;
  relatedTo?: string[];
  unlocked?: boolean; // Set when full truth is revealed
}

export interface CharacterAction {
  target:
    | "attribute"
    | "skill"
    | "status"
    | "appearance"
    | "profession"
    | "background"
    | "race"
    | "condition" // New
    | "hiddenTrait"; // New
  action: "add" | "remove" | "update";
  id?: string; // For skills/conditions
  name: string;

  // For skills/conditions
  visible?: {
    description?: string;
    effects?: string[]; // For conditions
  };
  hidden?: {
    trueDescription?: string;
    hiddenEffects?: string[];
    trueCause?: string; // For conditions
  };

  value?: string | number | boolean | null;
  intValue?: number;
  strValue?: string;
  maxValue?: number;
  color?: string;
  unlocked?: boolean; // Set when hidden effects should be revealed (skills/conditions)
  // New: Final State from Agentic Loop
  finalState?: GameState;
}

// Note: AdventureTurnInput has been removed. Use GameState directly with TurnContext from aiService.ts
// GameResponse 从 zodSchemas.ts 导入

export interface FactionAction {
  action: "update";
  id: string;
  name: string;
  visible?: string;
  hidden?: string;
}

export interface CharacterUpdates {
  attributes?: Array<{
    action: "add" | "update" | "remove";
    name: string;
    value?: number;
    maxValue?: number;
    color?: string;
  }>;
  skills?: Array<{
    action: "add" | "update" | "remove";
    name: string;
    level?: string;
    description?: string;
    unlocked?: boolean; // Set when hidden techniques/true nature revealed
  }>;
  conditions?: Array<{
    action: "add" | "update" | "remove";
    id?: string;
    name: string;
    type?:
      | "normal"
      | "wound"
      | "poison"
      | "buff"
      | "debuff"
      | "mental"
      | "curse"
      | "stun"
      | "unconscious"
      | "tired"
      | "dead";
    visible?: {
      description?: string;
      perceivedSeverity?: string;
    };
    hidden?: {
      trueCause?: string;
      actualSeverity?: number;
      progression?: string;
      cure?: string;
    };
    effects?: {
      visible?: string[];
      hidden?: string[];
    };
    unlocked?: boolean; // Set when true diagnosis/cure revealed
  }>;
  hiddenTraits?: Array<{
    action: "add" | "update" | "remove";
    id?: string;
    name: string;
    description?: string;
    effects?: string[];
    triggerConditions?: string[];
    unlocked?: boolean; // Set to true when triggerConditions are met
  }>;
  profile?: {
    status?: string;
    appearance?: string;
    profession?: string;
    background?: string;
    race?: string;
  };
}

export interface ThemeConfig {
  vars: Record<string, string>; // Default (Night)
  dayVars?: Record<string, string>; // Optional Day Mode overrides
  fontClass: string;
}

export interface StoryThemeConfig {
  envTheme: string; // The visual theme key (ENV_THEMES key, e.g. "fantasy", "horror")
  defaultAtmosphere: AtmosphereObject; // The default atmosphere { envTheme, ambience }
  icon?: string;
  categories?: string[];
  restricted?: boolean;
  backgroundTemplate?: string;
  example?: string;
}

export type LanguageCode = "en" | "zh";

// ============================================================================
// Multi-Provider System Types
// ============================================================================

/** Provider 协议类型 */
export type ProviderProtocol = "gemini" | "openai" | "openrouter" | "claude";

/** Provider 实例配置 */
export interface TokenStats {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
}

export interface ProviderInstance {
  id: string; // 唯一标识符，如 "provider-1", "provider-2"
  name: string; // 用户自定义名称，如 "OpenAI Official", "DeepSeek"
  protocol: ProviderProtocol; // 协议类型
  baseUrl: string; // API 基础 URL
  apiKey: string; // API 密钥
  enabled: boolean; // 是否启用
  isRestrictedChannel?: boolean; // 是否为受限渠道（不支持 system role）
  createdAt: number; // 创建时间
  lastModified: number; // 最后修改时间
  tokenStats?: TokenStats; // 历史 Token 统计
}

/** Provider 管理配置 */
export interface ProviderManagement {
  instances: ProviderInstance[]; // 所有 provider 实例
  nextId: number; // 用于生成新的 provider ID
}

export interface ProviderCredentials {
  apiKey?: string;
  baseUrl?: string;
}

export interface FunctionConfig {
  providerId: string; // 引用 ProviderInstance.id
  modelId: string;
  enabled?: boolean;
  resolution?: string; // e.g. "512x512", "1024x1024"
  thinkingLevel?: "low" | "medium" | "high"; // For Gemini Thinking
  mediaResolution?: "low" | "medium" | "high"; // For Gemini Vision

  gender?: "male" | "female"; // For TTS voice selection (Legacy)
  voice?: string; // Specific voice ID (e.g. "alloy", "coral")
  speed?: number; // 0.25 to 4.0
  format?: "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm";

  // Advanced Model Parameters
  temperature?: number;
  topP?: number;
  topK?: number;
  minP?: number;
}

export interface AISettings {
  // Multi-Provider Management
  providers: ProviderManagement;

  contextLen: number; // Max conversation turns before summarization

  story: FunctionConfig;
  lore: FunctionConfig;
  script: FunctionConfig;
  image: FunctionConfig;
  video: FunctionConfig;
  audio: FunctionConfig;
  audioVolume: {
    bgmVolume: number;
    bgmMuted: boolean;
    ttsVolume: number;
    ttsMuted: boolean;
  };
  translation: FunctionConfig;
  language: LanguageCode;

  // Image Generation Settings
  imageTimeout: number; // Timeout in seconds
  manualImageGen: boolean; // Require manual click to generate
  enableFallbackBackground: boolean; // Enable fallback background images

  // Visual Theme Settings
  lockEnvTheme: boolean; // Lock UI theme to story's envTheme, ignoring atmosphere changes

  // RAG Embedding Settings
  embedding: EmbeddingConfig;

  // Extra Settings
  extra?: {
    detailedDescription?: boolean;
    promptInjectionEnabled?: boolean;
  };
}

// ============================================================================
// RAG Embedding System Types
// ============================================================================

export interface EmbeddingModelInfo {
  id: string;
  name: string;
  dimensions?: number;
  maxBatchSize?: number;
}

export type EmbeddingTaskType =
  | "retrieval_document"
  | "retrieval_query"
  | "semantic_similarity"
  | "classification"
  | "clustering";

export interface EmbeddingConfig {
  providerId: string; // 引用 ProviderInstance.id
  modelId: string;
  enabled: boolean;
  dimensions?: number; // Optional: output dimensions (e.g., 256, 768, 1536)
  topK?: number; // Number of results to retrieve
  similarityThreshold?: number; // Minimum similarity score (0-1)

  // LRU Eviction Settings (player-adjustable)
  lru?: {
    // Memory limits (in-memory cache)
    maxMemoryDocuments?: number; // Max documents in memory cache (default: 1000)

    // Storage limits (persistent in IndexedDB)
    maxStorageDocuments?: number; // Max total documents in storage (default: 10000)
    maxDocumentsPerType?: number; // Max documents per type (default: 2000)
    maxVersionsPerEntity?: number; // Max versions per entity ID (default: 5)
    maxVersionsAcrossForks?: number; // Max versions across forks (default: 10)

    // Priority settings
    currentForkBonus?: number; // Priority bonus for current fork (default: 0.5)
    ancestorForkBonus?: number; // Priority bonus for ancestor forks (default: 0.25)
    turnDecayFactor?: number; // Priority loss per turn difference (default: 0.01)

    // Type-specific limits
    storyMaxEntries?: number; // Max story documents (default: 50)
  };
}

export interface EmbeddingDocument {
  id: string; // Unique document ID
  type:
    | "story"
    | "npc"
    | "location"
    | "item"
    | "knowledge"
    | "quest"
    | "event"
    | "outline";
  entityId: string; // Reference to the entity (e.g., npc:1, loc:2, outline:world)
  content: string; // Original text content
  embedding?: Float32Array; // Compressed embedding vector (stored separately)
  metadata?: {
    turnNumber?: number;
    timestamp?: number;
    importance?: number; // 0-1 score for retrieval priority
    forkId?: number; // Fork ID when this document was created (for filtering)
    unlocked?: boolean; // Whether hidden info is unlocked
  };
}

export interface EmbeddingIndex {
  version: number;
  dimensions: number;
  modelId: string;
  documents: EmbeddingDocument[];
  // Embeddings stored as compressed Float32Array chunks
  embeddings?: ArrayBuffer;
}

// ============================================================================
// Save Version Management Types
// ============================================================================

export const CURRENT_SAVE_VERSION = 1;

export interface SaveVersionInfo {
  version: number;
  createdAt: number;
  migratedFrom?: number;
  migrationLog?: string[];
}

export interface VersionedGameState extends GameState {
  _saveVersion: SaveVersionInfo;
  _embeddingIndex?: EmbeddingIndex;
}

export interface ThemeData {
  name: string;
  narrativeStyle: string;
  backgroundTemplate: string;
  example: string;
  worldSetting: string;
}

export interface ModelInfo {
  id: string;
  name?: string;
  capabilities?: {
    image?: boolean;
    video?: boolean;
    audio?: boolean;
    text?: boolean;
    tools?: boolean;
    parallelTools?: boolean;
  };
}

export type FeedLayout = "scroll" | "stack";

export interface ImageGenerationContext {
  theme: string; // 故事主题（来自 GameState.theme）- 主要用于匹配视觉风格
  worldSetting?: string; // 世界设定描述
  storyTitle?: string; // 故事标题 - 备用，用于匹配特定 IP 的艺术风格
  time?: string;
  location?: string;
  character?: {
    name: string;
    race: string;
    profession: string;
    appearance: string;
    status: string;
  };
  activeNPCs?: {
    name: string;
    description: string;
    appearance: string;
    status: string;
  }[];
  weather?: string;
  season?: string;
  mood?: string;
}
export interface UnifiedMessage {
  role: "user" | "model" | "system" | "assistant" | "tool";
  content: Array<{
    type: "text" | "image" | "audio" | "tool_use" | "tool_result";
    text?: string;
    image?: { url: string };
    audio?: { url: string };
    toolUse?: {
      id: string;
      name: string;
      args: Record<string, unknown>;
    };
    toolResult?: {
      id: string;
      content: unknown;
      isError?: boolean;
    };
  }>;
}

export interface UnifiedToolCallResult {
  id: string;
  name: string;
  args: Record<string, unknown>;
}
