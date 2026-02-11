import type { AtmosphereObject } from "./utils/constants/atmosphere";
import type { VfsSession } from "./services/vfs/vfsSession";
import type { VfsElevationIntent } from "./services/vfs/core/types";
import type { VfsElevationScopeTemplateIds } from "./services/vfs/core/elevation";

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

// ============================================================================
// 从 zodSchemas.ts 导入统一的类型
// ============================================================================
// 这些类型由 Zod schema 推导而来，确保 AI 生成验证和 TypeScript 类型的一致性
// zodSchemas.ts 中的 schema 允许某些字段 optional（因为 AI 可能不生成），
// 但在 GameState 中使用时这些字段会被系统填充

import type {
  InventoryItem as ZodInventoryItem,
  LocationViewModel as ZodLocation,
  QuestViewModel as ZodQuest,
  KnowledgeEntryViewModel as ZodKnowledgeEntry,
  TimelineEventViewModel as ZodTimelineEvent,
  CausalChain as ZodCausalChain,
  FactionViewModel as ZodFaction,
  WorldInfo as ZodWorldInfo,
  CharacterAttribute as ZodCharacterAttribute,
  HiddenTrait as ZodHiddenTrait,
  CharacterStatus as ZodCharacterStatus,
  ActorProfile as ZodActorProfile,
  ActorBundle as ZodActorBundle,
  Placeholder as ZodPlaceholder,
  RelationEdge as ZodRelationEdge,
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

// 导出应用层类型（带必需的系统字段）
export type InventoryItem = WithRequiredId<
  WithVersionedTimestamps<ZodInventoryItem>
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
export type WorldInfo = ZodWorldInfo & {
  // Derived per-actor unlock fields merged in derivation for UI convenience.
  worldSettingUnlocked?: boolean;
  worldSettingUnlockReason?: string;
  mainGoalUnlocked?: boolean;
  mainGoalUnlockReason?: string;
};
export type ActorProfile = ZodActorProfile;
export type RelationEdge = ZodRelationEdge;
export type ActorBundle = ZodActorBundle;
export type Placeholder = ZodPlaceholder;
// Back-compat alias: UI and logs still use the name "NPC" for sidebar panels.
export type NPC = ActorProfile;

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
export type {
  Atmosphere,
  EnvTheme,
  Ambience,
  Skill,
  Condition,
  AtmosphereObject,
};
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
  ZodLocation,
  ZodQuest,
  ZodKnowledgeEntry,
  ZodTimelineEvent,
  ZodFaction,
  ZodWorldInfo,
};

/**
 * ============================================================================
 * FIELD RESPONSIBILITY GUIDE
 * ============================================================================
 *
 * SYSTEM-MANAGED FIELDS (auto-generated, AI should NOT set):
 * - id: Generate by AI
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
 * - knownBy: Existence visibility: which actors know this entity exists
 * - observation: NPC observations of player behavior
 * - highlight: Set true by AI when entity changes (cleared by UI after render)

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
  // Unlock events with name and reason
  entitiesUnlocked?: Array<{ name: string; reason: string }>;
  systemToasts?: Array<{
    message: string;
    type: "info" | "warning" | "error" | "success";
  }>;
}

export type ActionResult =
  | { success: true; stateChanges: StateChanges }
  | { success: false; error: string };

export type TurnRecoveryKind =
  | "history"
  | "context"
  | "transient"
  | "turn_not_committed"
  | "unknown";

export interface TurnRecoveryAttempt {
  level: number;
  kind: TurnRecoveryKind;
  attempt: number;
  error?: string;
  delayMs?: number;
  timestamp: number;
}

export interface TurnRecoveryTrace {
  attempts: TurnRecoveryAttempt[];
  finalLevel: number;
  kind: TurnRecoveryKind;
  recovered: boolean;
  durationMs: number;
}

/**
 * Resolved theme configuration from i18n at outline generation time.
 * Stored in GameState to avoid runtime i18n lookups and support imageBased themes.
 */
export interface ResolvedThemeConfig {
  /** Translated theme display name */
  name: string;
  /** Writing style guidance for AI generations */
  narrativeStyle: string;
  /** One-paragraph world description (from i18n themes.json) */
  worldSetting: string;
  /** Background context template */
  backgroundTemplate: string;
  /** Example narrative snippet */
  example: string;
  /** Whether this is a restricted (IP) theme */
  isRestricted: boolean;
}

export type NarrativeStylePreset =
  | "theme"
  | "cinematic"
  | "literary"
  | "noir"
  | "brutal"
  | "cozy"
  | "cdrama"
  | "minimal";

export type WorldDispositionPreset =
  | "theme"
  | "benevolent"
  | "mixed"
  | "cynical";

export type PlayerMalicePreset =
  | "theme"
  | "intimidation"
  | "bureaucratic"
  | "manipulation"
  | "sabotage";

export type PlayerMaliceIntensityPreset = "light" | "standard" | "heavy";

export interface SavePresetProfile {
  narrativeStylePreset: NarrativeStylePreset;
  worldDispositionPreset: WorldDispositionPreset;
  playerMalicePreset: PlayerMalicePreset;
  playerMaliceIntensity: PlayerMaliceIntensityPreset;
  locked: true;
}

export interface GameState {
  // Tree Structure: ID -> Segment
  nodes: Record<string, StorySegment>;
  activeNodeId: string | null; // The leaf node of the current path
  rootNodeId: string | null;
  currentFork: StorySegment[]; // The full segment list of the current fork

  // Actor-first world state (VFS source-of-truth)
  actors: ActorBundle[];
  playerActorId: string;
  placeholders?: Placeholder[];

  // Derived convenience fields (player-centric)
  inventory: InventoryItem[];
  npcs: NPC[];
  quests: Quest[];
  character: CharacterStatus;
  knowledge: KnowledgeEntry[]; // Player's accumulated knowledge about the world
  factions: Faction[]; // Major power groups
  worldInfo: WorldInfo | null; // Canonical world info + derived per-actor unlock flags

  // Location System
  currentLocation: string;
  locations: Location[];
  locationItemsByLocationId: Record<string, InventoryItem[]>;

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

  // Game Context (for save/load and continuity)
  language: string; // Language code used for this game (e.g. "en", "zh")
  customContext?: string; // User-provided custom context for story generation
  presetProfile?: SavePresetProfile; // Per-save preset profile chosen at game start
  seedImageId?: string; // ID of user-uploaded starting image (stored in IndexedDB)

  // Theme configuration (resolved at outline generation, avoids i18n lookups)
  themeConfig?: ResolvedThemeConfig;

  // Stats & Logs
  tokenUsage: TokenUsage;
  logs: LogEntry[];
  // Live tool calls for current in-flight AI generation (for loading UI)
  liveToolCalls?: ToolCallRecord[];

  // Cached Veo Script
  veoScript?: string;

  // Initial Prompt (for retry)
  initialPrompt?: string;

  timeline: TimelineEvent[];
  causalChains: CausalChain[];

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

  // Custom Rules for per-save prompt customization
  customRules?: CustomRule[];

  // Player Psychology System - per-save player portrait
  // Records how the player is approaching THIS specific story
  playerProfile?: string;

  // Narrative Scale - AI's creative decision about story scope
  // Set during Phase 1 outline generation, influences subsequent prompts
  narrativeScale?: "epic" | "intimate" | "balanced";
}

/** State for resuming outline generation after failure */
export interface OutlineConversationState {
  /** Schema version for outline phase contracts. v2 is the reordered 1-9 pipeline. */
  phaseSchemaVersion?: number;
  theme: string;
  language: string;
  customContext?: string;
  conversationHistory: UnifiedMessage[];
  partial: PartialStoryOutline;
  currentPhase: number; // 0-9, indicates which phase to resume from
  /** Model ID used for this outline generation (for mismatch detection) */
  modelId?: string;
  /** Provider ID used for this outline generation (for mismatch detection) */
  providerId?: string;
  /** Live tool calls captured during current outline phase generation */
  liveToolCalls?: ToolCallRecord[];
}

/** Partial results from phased outline generation */
export interface PartialStoryOutline {
  phase0?: object; // Image interpretation (imageBased only)
  phase1?: object;
  phase2?: object;
  phase3?: object;
  phase4?: object;
  phase5?: object;
  phase6?: object;
  phase7?: object;
  phase8?: object;
  phase9?: object;
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

// --- Custom Rules System ---

/**
 * Rule categories that map to specific sections in the AI prompts.
 * Each category affects a different aspect of story generation.
 */
export type RuleCategory =
  | "systemCore" // Core AI behavior & philosophy
  | "worldSetting" // World physics, magic system, technology
  | "protagonist" // Player character rules & constraints
  | "npcBehavior" // NPC personality & interaction rules
  | "combatAction" // Combat mechanics & action rules
  | "writingStyle" // Narrative tone & writing craft
  | "dialogue" // Dialogue & conversation rules
  | "mystery" // Mystery, foreshadowing, revelation
  | "stateManagement" // How game state is updated
  | "hiddenTruth" // Unlocking & revelation rules
  | "imageStyle" // Visual style for image generation
  | "cultural" // Cultural adaptation overrides
  | "custom"; // Free-form custom instructions

/**
 * A custom rule that modifies AI behavior for this save.
 * Rules are stored per-save and injected into prompts based on category.
 */
export interface CustomRule {
  id: string;
  category: RuleCategory;
  title: string; // Short title for display
  content: string; // The actual rule text
  enabled: boolean;
  priority: number; // Order within category (lower = first)
  createdAt: number;
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
  /**
   * Whether this usage payload is reported by provider API.
   * false means token counts are unknown placeholders (typically 0s),
   * and should not drive context-threshold decisions.
   */
  reported?: boolean;
}

// Individual tool call record
export interface ToolCallRecord {
  name: string;
  input: Record<string, any>;
  output: any;
  timestamp: number;
}

/** Log entry types for display categorization */
export type LogEntryType =
  | "tool" // Single tool execution
  | "turn" // Complete turn with multiple tools
  | "outline" // Outline generation phase
  | "summary" // Summary generation
  | "image" // Image generation
  | "cleanup" // Entity cleanup operation
  | "error"; // Error log

export interface LogEntry {
  id: string;
  timestamp: number;
  provider: string;
  model: string;
  endpoint: string;

  /** Log type for UI categorization (auto-inferred if not provided) */
  type?: LogEntryType;

  // === Semantic fields for specific log types ===

  /** Tool name (for type="tool") */
  toolName?: string;
  /** Tool input arguments (for type="tool") */
  toolInput?: Record<string, any>;
  /** Tool output (for type="tool") */
  toolOutput?: any;

  /** Outline phase number 1-9 (for type="outline") */
  phase?: number;

  /** Turn ID for grouping logs from same agentic loop iteration */
  turnId?: string;

  /** Fork ID from GameState for grouping logs by fork */
  forkId?: number;

  /** Turn number from GameState for grouping logs by game turn */
  turnNumber?: number;

  /** Summary stage e.g. "query", "complete" (for type="summary") */
  stage?: string;

  /** Image prompt (for type="image") */
  imagePrompt?: string;
  /** Image resolution (for type="image") */
  imageResolution?: string;

  // === Common fields ===

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

    systemPrompt?: string;
    userPrompt?: string;
    modelConfig?: any;
    injectedRules?: string[]; // Custom rules injected into prompt
    nsfwEnabled?: boolean; // NSFW mode enabled
  };
  // Stage debugging: input messages sent to AI
  stageInput?: {
    conversationHistory: string; // JSON stringified messages
    availableTools: string[]; // Tool names for this stage
    stageInstruction?: string; // Current stage instruction message
  };
  // Stage debugging: raw AI response before parsing
  rawResponse?: string;
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
  hiddenIds?: string[]; // Items hidden from sidebar (user-controlled)
}

export interface UIState {
  inventory: ListState;
  locations: ListState;
  npcs: ListState;
  knowledge: ListState; // UI state for knowledge panel
  quests: ListState; // UI state for quests panel
  showSystemFooter?: boolean; // Persisted state for system footer
  sidebarCollapsed?: boolean; // Persisted state for left sidebar collapse
  sidebarWidth?: number; // Persisted width for left sidebar
  timelineCollapsed?: boolean; // Persisted state for right timeline collapse
  timelineWidth?: number; // Persisted width for right timeline
  embeddingExpanded?: boolean; // Persisted state for embedding panel expansion
  feedLayout?: FeedLayout; // Persisted layout preference (scroll/stack)
  viewedSegmentId?: string; // Last viewed segment ID for continue game
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

  imagePrompt?: string; // Opt-in image prompt (generated on demand)
  imageUrl?: string;
  imageId?: string; // ID of the image in IndexedDB
  veoScript?: string; // Cinematic script (generated on demand)
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
  /** Slot ID for session management - required for internal history tracking */
  slotId: string;
  /** Whether this is the initial turn of a new game */
  isInit?: boolean;
  /** VFS session for file-based state */
  vfsSession: VfsSession;
  /** Optional real-time callback for currently executing tool calls */
  onToolCallsUpdate?: (calls: ToolCallRecord[]) => void;
  /** VFS runtime mode used by policy engine */
  vfsMode?: "normal" | "god" | "sudo";
  /** Optional one-time elevation token for elevated writes */
  vfsElevationToken?: string | null;
  /** Optional declared intent for elevation token */
  vfsElevationIntent?: VfsElevationIntent;
  /** Optional declared template scope for elevation token */
  vfsElevationScopeTemplateIds?: VfsElevationScopeTemplateIds;
  /** Optional user confirmation hook for recovery actions */
  confirmRecoveryAction?: (request: {
    type: "turn_retry_boost" | "session_rebuild";
    message: string;
  }) => boolean | Promise<boolean>;
}

export interface GameStateSnapshot {
  // Actor-first state (VFS source-of-truth)
  actors: ActorBundle[];
  playerActorId: string;
  placeholders?: Placeholder[];
  locationItemsByLocationId: Record<string, InventoryItem[]>;

  // Entity State (Dual-layer)
  inventory: InventoryItem[];
  npcs: NPC[];
  quests: Quest[];
  character: CharacterStatus;
  knowledge: KnowledgeEntry[];
  locations: Location[];
  currentLocation: string;
  factions: Faction[]; // Added factions to snapshot

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

  // Turn tracking
  turnNumber: number;

  // Fork System (Critical for RAG filtering across timelines)
  forkId: number;
  forkTree: ForkTree;
}

// Location, KnowledgeEntry, InventoryItem, Quest 从 zodSchemas.ts 导入

export interface InventoryAction {
  action: "add" | "remove" | "update";
  id?: string; // Unique ID
  name: string; // Name is still useful for reference

  // Dual-layer support
  visible?: {
    description?: string;
    usage?: string;
    observation?: string;
    sensory?: {
      texture?: string;
      weight?: string;
      smell?: string;
    };
    condition?: string;
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

export interface LocationAction {
  type: "current" | "known";
  action: "update" | "add";
  id?: string;
  name: string;

  visible?: {
    description?: string;
    environment?: string;
    ambience?: string;
    weather?: string;
    knownFeatures?: string[];
    resources?: string[];
    atmosphere?: Atmosphere;
    sensory?: {
      smell?: string;
      sound?: string;
      lighting?: string;
      temperature?: string;
    };
    interactables?: string[];
  };
  hidden?: {
    fullDescription?: string;
    dangers?: string[];
    hiddenFeatures?: string[];
    secrets?: string[];
  };

  lore?: string;
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

// ============================================================================
// Theme-Based Prompt Configuration Types
// ============================================================================

/**
 * Available prompt atom names that can be referenced in theme configurations.
 */
export type PromptAtomName =
  // Core atoms
  | "worldConsistency"
  | "livingWorld"
  | "worldIndifference"
  | "maliceAndAntagonism"
  | "roleInstruction"
  | "humanityAndHope"
  // Narrative atoms
  | "writingCraft"
  | "subjectiveObjectiveBalance"
  | "narrativeScale"
  | "perspectiveAnchor"
  | "unapologeticReality"
  | "physicality"
  // Entity atoms
  | "npcLogic"
  | "npcAutonomy"
  | "npcEcosystem"
  | "socialFriction"
  // Cultural atoms
  | "culturalContext"
  // Mature content atoms
  | "matureWorldDirective";

/**
 * Configuration for a single prompt atom.
 */
export interface PromptAtomConfig {
  /** The atom name to load */
  atom: PromptAtomName;
  /** Parameters to pass to the atom function */
  params?: Record<string, unknown>;
  /** Priority for conflict resolution (higher = more important). Default: 0 */
  priority?: number;
  /** Whether this atom is enabled. Default: true */
  enabled?: boolean;
}

/**
 * Theme-specific prompt configuration.
 */
export interface ThemePromptConfiguration {
  /** Core world rules - physics, consistency, world behavior */
  coreRules?: PromptAtomConfig[];
  /** Narrative style - writing craft, perspective, scale */
  narrativeStyle?: PromptAtomConfig[];
  /** NPC behavior - interaction patterns, autonomy, social dynamics */
  npcBehavior?: PromptAtomConfig[];
  /** Cultural context - background-specific behavior patterns */
  culturalContext?: PromptAtomConfig[];
  /** Additional custom atoms */
  custom?: PromptAtomConfig[];
}

/**
 * 主题特化参数 - 直接控制各 atom 的行为
 * 这是替代复杂 PromptAtomConfig 的简化设计
 */
export interface ThemeParams {
  /** 物理规则严苛程度: cinematic(电影化/轻松), standard(标准一致), realistic(硬核写实) */
  physicsHarshness?: "cinematic" | "standard" | "realistic";
  /** 世界冷漠程度: benevolent(善意), neutral(中立), hostile(敌对/冷漠) */
  worldIndifference?: "benevolent" | "neutral" | "hostile";
  /** NPC 自主程度: supportive(辅助), balanced(独立但配合), independent(完全独立/自私) */
  npcAutonomyLevel?: "supportive" | "balanced" | "independent";
  /** 社交复杂度: transparent(直白), standard(正常社交), intricate(权谋/潜台词) */
  socialComplexity?: "transparent" | "standard" | "intricate";
  /** 经济复杂度: primitive(原始/物物交换), standard(标准货币), advanced(金融/税务) */
  economicComplexity?: "primitive" | "standard" | "advanced";
  /** 文化背景提示 */
  culturalHint?: string;
}

export interface StoryThemeConfig {
  envTheme: string; // The visual theme key (ENV_THEMES key, e.g. "fantasy", "horror")
  defaultAtmosphere: AtmosphereObject; // The default atmosphere { envTheme, ambience }
  icon?: string;
  categories?: string[];
  restricted?: boolean;
  backgroundTemplate?: string;
  example?: string;
  /** Theme-specific prompt configuration (complex structure). */
  promptConfig?: ThemePromptConfiguration;
  /** Theme parameters (simple direct params) - 推荐使用这个简化设计 */
  themeParams?: ThemeParams;
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
  geminiCompatibility?: boolean; // 是否开启 Gemini 兼容模式 (OpenAI protocol only)
  geminiMessageFormat?: boolean; // 是否转换消息格式为 Gemini 原生格式 (当代理不自动转换时使用)
  claudeCompatibility?: boolean; // 是否开启 Claude 兼容模式 (OpenAI protocol only)
  claudeMessageFormat?: boolean; // 是否转换消息格式为 Claude 原生格式 (当代理不自动转换时使用)
  compatibleImageGeneration?: boolean; // 是否开启兼容性图片生成 (当聊天模型为 gemini-3-pro-image 时拦截并生成图片)
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
  isCustomModel?: boolean; // 用户手动输入的自定义模型 ID
  enabled?: boolean;
  resolution?: string; // e.g. "512x512", "1024x1024"
  thinkingEffort?:
    | "xhigh"
    | "high"
    | "medium"
    | "low"
    | "minimal"
    | "none"
    | (string & {}); // Unified reasoning effort
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

  /**
   * Optional per-provider+model context window overrides.
   * Key format: `${providerId}::${modelId.toLowerCase()}`
   */
  modelContextWindows?: Record<string, number>;

  /**
   * Runtime-learned effective context windows inferred from overflow errors.
   * Key format: `${providerId}::${modelId.toLowerCase()}`.
   * These are auto-managed by the app and always lower-bounded to positive ints.
   */
  learnedModelContextWindows?: Record<string, number>;

  /**
   * Consecutive non-overflow turn count for each provider+model key.
   * Used to slowly relax learnedModelContextWindows after stable runs.
   */
  learnedModelContextSuccessStreaks?: Record<string, number>;

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
  language: LanguageCode;

  // Image Generation Settings
  imageTimeout: number; // Timeout in seconds
  enableFallbackBackground: boolean; // Enable fallback background images

  // Visual Theme Settings
  lockEnvTheme: boolean; // Lock UI theme to story's envTheme, ignoring atmosphere changes
  fixedEnvTheme?: string; // If set, override with this specific envTheme key (e.g., "cyberpunk")
  /** 是否禁用环境视觉特效（如下雨、下雪等） */
  disableEnvironmentalEffects?: boolean;
  /** 在首页显示照片墙图片作为飘落背景 */
  galleryBackground?: boolean;

  // Typewriter Effect Settings
  typewriterSpeed: number; // Characters per interval (1-100, lower = faster)

  // Stack Layout Settings
  stackItemsPerPage?: number; // Items per page in stack layout (must be even, default: 10)
  stackShowOutline?: boolean; // Show outline in stack mode (default: true)

  // Export Settings
  exportIncludeUserActions?: boolean; // Include user/command messages in timeline export (default: false)

  // RAG Embedding Settings
  embedding: EmbeddingConfig;

  // Extra Settings
  extra?: {
    detailedDescription?: boolean;
    nsfw?: boolean; // Enable NSFW/adult content generation
    genderPreference?: "male" | "female" | "none"; // Force protagonist gender in story generation
    customInstructionEnabled?: boolean;
    customInstruction?: string; // Player instruction block (style + plot direction + setting bias), injected before base system instruction
    /**
     * Enable per-model system default injection from `src/prompt/prompt.toml` (`[[system_prompts]]`).
     * Effective order: RuntimeFloor -> systemDefaultInjection -> customInstruction -> baseSystemInstruction.
     */
    systemDefaultInjectionEnabled?: boolean;
    disableModelFilter?: boolean; // Bypass model capability filtering, show all models
    forceAutoToolChoice?: boolean; // Force toolChoice to "auto" regardless of requested "required"
    clearerSearchTool?: boolean; // Return detailed tool info (description, schema) in search results
    toolCallCarousel?: boolean; // Show tool-call style carousel while AI is generating (default: true)
    maxToolCalls?: number; // Maximum total tool calls per agentic loop (default: 50)
    maxAgenticRounds?: number; // Maximum number of agentic loop rounds (default: 20)
    turnRetryLimit?: number; // Retry limit for normal turn loops (default: 3)
    outlinePhaseRetryLimit?: number; // Retry limit for each outline phase (default: 3)
    cleanupRetryLimit?: number; // Retry limit for cleanup loops (default: 5)
    summaryRetryLimit?: number; // Retry limit for summary/compact/query loops (default: 5)
    /**
     * Narrative style preset. Applies a concise, model-robust style override on top of theme defaults.
     * If customContext includes <narrative_style>, that takes priority.
     */
    narrativeStylePreset?: NarrativeStylePreset;
    /**
     * World disposition preset. Sets a small explicit baseline for "human nature" and social tone.
     * If customContext includes <world_disposition>, that takes priority.
     */
    worldDispositionPreset?: WorldDispositionPreset;
    /**
     * Player malice playstyle preset. Biases how the simulation supports malicious play
     * (crime, coercion, manipulation) with clear mechanisms and believable counterplay.
     * This is a supplement, not a forced role: the player may still act otherwise.
     * If customContext includes <player_malice_profile>, that takes priority.
     */
    playerMalicePreset?: PlayerMalicePreset;
    /**
     * Player malice intensity. Controls how fast Trace/Heat accumulates and how quickly counterplay escalates.
     * If customContext includes <player_malice_intensity>, that takes priority.
     */
    playerMaliceIntensity?: PlayerMaliceIntensityPreset;
    // Tutorial completion flags
    tutorialStartScreenCompleted?: boolean; // StartScreen tutorial has been completed
    tutorialGamePageCompleted?: boolean; // GamePage tutorial has been completed
    // Player Psychology System
    disablePlayerProfiling?: boolean; // Disable cross-save player psychology tracking

    // ======================================================================
    // Auto-Compaction / Summary
    // ======================================================================
    /**
     * Enable automatic session compaction (summary) based on context window usage.
     * When enabled, the system will attempt session-native compaction first and
     * fall back to query-based summary on overflow.
     */
    autoCompactEnabled?: boolean;
    /**
     * Context window usage threshold (0.5 - 0.95) to trigger auto-compaction.
     * Usage is computed from the last API call's promptTokens divided by the
     * selected model's context length.
     */
    autoCompactThreshold?: number;
  };

  // Player Psychology System - cross-save player portrait
  // Records the meta-player's personality patterns across all saves
  playerProfile?: string;
}


export type CustomRulesAckPendingReason = "customRules";

export interface CustomRulesAckState {
  effectiveHash: string;
  acknowledgedHash: string;
  pendingHash?: string;
  pendingReason?: CustomRulesAckPendingReason;
  updatedAt: number;
  customRulesHash?: string;
}

// ============================================================================
// RAG Embedding System Types
// ============================================================================

export interface EmbeddingModelInfo {
  id: string;
  name: string;
  dimensions?: number;
  contextLength?: number;
}

export type EmbeddingTaskType =
  | "retrieval_document"
  | "retrieval_query"
  | "semantic_similarity"
  | "classification"
  | "clustering";

export type EmbeddingRuntime =
  | "remote"
  | "local_transformers"
  | "local_tfjs";
export type LocalEmbeddingBackend = "webgpu" | "webgl" | "cpu";
export type LocalTransformersDevice = "webgpu" | "wasm" | "cpu";

export interface LocalEmbeddingOptions {
  backend?: "transformers_js" | "tfjs";
  model?: "use-lite-512";
  transformersModel?: string;
  backendOrder?: LocalEmbeddingBackend[];
  deviceOrder?: LocalTransformersDevice[];
  batchSize?: number;
  quantized?: boolean;
}

export interface EmbeddingConfig {
  providerId: string; // 引用 ProviderInstance.id
  modelId: string;
  enabled: boolean;
  runtime?: EmbeddingRuntime;
  local?: LocalEmbeddingOptions;
  dimensions?: number; // Optional: output dimensions (e.g., 256, 768, 1536)
  topK?: number; // Number of results to retrieve
  similarityThreshold?: number; // Minimum similarity score (0-1)

  // Storage Settings (player-adjustable)
  storage?: {
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

  /** @deprecated Use storage instead */
  lru?: EmbeddingConfig["storage"];
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

export const CURRENT_SAVE_VERSION = 2;

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
  /** Optional context window length (tokens), if provided by the provider. */
  contextLength?: number;
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
    type: "text" | "image" | "audio" | "tool_use" | "tool_result" | "reasoning";
    text?: string;
    // Image content - mimeType and base64 data (without data URL prefix)
    mimeType?: string; // e.g., "image/jpeg", "image/png", "audio/wav"
    data?: string; // base64 encoded data
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
    reasoning?: string;
  }>;
}

export interface UnifiedToolCallResult {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

// ============================================================================
// Save Export/Import Types
// ============================================================================

/** Current export format version */
export const CURRENT_EXPORT_VERSION = 2;

/** Options for exporting a save */
export interface ExportOptions {
  includeImages: boolean;
  includeEmbeddings: boolean;
  includeLogs: boolean;
}

/** Statistics about the export */
export interface ExportStats {
  nodeCount: number;
  imageCount: number;
  embeddingCount: number;
  logCount?: number;
  estimatedSize?: number; // in bytes
}

/** Manifest file included in the export ZIP */
export interface ExportManifest {
  /** Export format version */
  version: number;
  /** ISO timestamp of export */
  exportDate: string;
  /** Application version that created this export */
  appVersion: string;
  /** Save data version (for migration) */
  saveVersion: number;
  /** SaveSlot metadata */
  slot: SaveSlot;
  /** What's included in this export */
  includes: {
    images: boolean;
    embeddings: boolean;
    logs: boolean;
  };
  /** Statistics about the exported data */
  stats: ExportStats;
  /** Checksum for data integrity (SHA-256 of save.json) */
  checksum?: string;
}

/** Result of import operation */
export interface I18nMessage {
  key: string;
  params?: Record<string, unknown>;
}

export interface ImportResult {
  success: boolean;
  slotId?: string;
  error?: string;
  errorI18n?: I18nMessage;
  warnings?: string[];
  warningsI18n?: I18nMessage[];
  /** Was migration needed? */
  migrated?: boolean;
  /** Original version before migration */
  originalVersion?: number;
}

/** Validation result for import */
export interface ImportValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  errorsI18n?: I18nMessage[];
  warningsI18n?: I18nMessage[];
  manifest?: ExportManifest;
  requiresMigration?: boolean;
}
