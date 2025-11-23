export interface GameState {
  // Tree Structure: ID -> Segment
  nodes: Record<string, StorySegment>;
  activeNodeId: string | null; // The leaf node of the current path
  rootNodeId: string | null;

  inventory: InventoryItem[];
  relationships: Relationship[];
  quests: Quest[];
  character: CharacterStatus;
  knowledge: KnowledgeEntry[]; // Player's accumulated knowledge about the world

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
  envTheme: string; // Dynamic atmosphere (e.g. "Dark", "Tense")
  theme: string; // Static game genre (e.g. "Cyberpunk", "Wuxia")
  time: string; // In-game time tracking

  // Stats & Logs
  totalTokens: number;
  logs: LogEntry[];

  // Cached Veo Script
  // Cached Veo Script
  veoScript?: string;

  // New World System Fields
  nextIds: {
    item: number;
    npc: number;
    location: number;
    knowledge: number;
    quest: number;
  };
  timeline: TimelineEvent[];
  causalChains: CausalChain[];
}

// --- World System Interfaces ---

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

// WorldTime interface removed as we switched to string-based time
// export interface WorldTime { ... }

export interface TimelineEvent {
  id: string;
  gameTime: string;
  description: string;
  category: 'player_action' | 'npc_action' | 'world_event' | 'consequence';
  causedBy?: string;
  consequences?: string[];
  involvedEntities?: string[];
}

export interface CausalChain {
  chainId: string;
  rootCause: {
    eventId: string;
    description: string;
  };
  events: TimelineEvent[];
  status: 'active' | 'resolved' | 'interrupted';
  pendingConsequences?: Array<{
    description: string;
    delayMinutes: number;
    probability: number;
    conditions?: string[];
  }>;
}

export interface StorySummary {
  id: number;
  displayText: string; // Concise summary for UI display (visible layer only)
  visible: {
    narrative: string;
    majorEvents: string[];
    characterDevelopment: string;
    worldState: string;
  };
  hidden: {
    truthNarrative: string;
    hiddenPlots: string[];
    npcActions: string[];
    worldTruth: string;
    unrevealed: string[];
  };
  timeRange: {
    from: string;
    to: string;
  };
  nodeRange: {
    fromIndex: number;
    toIndex: number;
  };
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  provider: string;
  model: string;
  endpoint: string;
  request: any;
  response: any;
  usage?: TokenUsage;
}

export interface StoryOutline {
  title: string;
  initialTime: string;
  premise: string;
  mainGoal: {
    visible: string; // The apparent main motivation/task
    hidden: string; // The hidden event logic or true nature of the goal
  };
  quests: Quest[]; // Initial quests (replaces mainGoal/goals)
  worldSetting: {
    visible: string;
    hidden: string;
  };
  locations: Omit<Location, "id" | "isVisited" | "createdAt">[]; // Initial locations (Detailed structure)
  character: CharacterStatus; // Initial character state
  inventory?: InventoryItem[]; // Initial inventory
  relationships?: Relationship[]; // Initial relationships
  knowledge?: Omit<KnowledgeEntry, "id">[]; // Initial knowledge
}

export interface SaveSlot {
  id: string;
  name: string;
  timestamp: number;
  theme: string;
  summary: string;
  previewImage?: string;
  // No need to store full state here, just metadata
}

export interface CharacterAttribute {
  label: string;
  value: number;
  maxValue: number;
  color: "red" | "blue" | "green" | "yellow" | "purple" | "gray";
}

export interface CharacterSkill {
  id: number;
  name: string;
  level: string | number;
  visible: {
    description: string;
    knownEffects: string[];
  };
  hidden: {
    trueDescription: string;
    hiddenEffects: string[];
    drawbacks?: string[];
  };
  category?: string;
  experience?: number;
}

export interface CharacterCondition {
  id: number;
  name: string;
  type: 'buff' | 'debuff' | 'neutral';
  visible: {
    description: string;
    perceivedSeverity: string;
  };
  hidden: {
    trueCause: string;
    actualSeverity: number;
    progression: string;
    cure?: string;
  };
  duration?: number;
  startTime?: number;
  effects: {
    visible: string[];
    hidden: string[];
  };
}

export interface HiddenTrait {
  id: number;
  name: string;
  description: string;
  effects: string[];
  triggerConditions?: string[];
  discovered: boolean;
}

export interface CharacterStatus {
  name: string;
  title: string;
  status: string;
  attributes: CharacterAttribute[];
  skills: CharacterSkill[];
  conditions: CharacterCondition[];
  hiddenTraits?: HiddenTrait[];
  appearance: string;
  profession?: string;
  background?: string;
  race?: string;
}

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
}

export interface Relationship {
  id: number;
  name: string;
  visible: {
    description: string;
    appearance?: string;
    status: string;
  };
  hidden: {
    realPersonality: string;
    realMotives: string;
    secrets: string[];
    trueAffinity: number;
  };
  relationshipType: string;
  affinity: number;
  affinityKnown: boolean;
  createdAt: number;
  lastModified: number;
  notes?: string;
}

export interface StorySegment {
  id: string;
  parentId: string | null; // Pointer to parent for Tree Structure
  text: string;
  choices: string[];
  imagePrompt: string;
  imageUrl?: string;
  audioKey?: string; // Key for cached TTS audio in IndexedDB
  role: "user" | "model";
  timestamp: number;
  summarySnapshot?: string; // If this node triggered a summary, store it here
  usage?: TokenUsage;

  // Fork-safe Summary State
  summaries?: StorySummary[]; // The total summary of the story up to this point (Dual-layer)
  summarizedIndex?: number; // The index in the history chain where the summary ends
  environment?: string; // The environment ambience for this segment
  envTheme?: string; // The visual theme for this segment
  narrativeTone?: string; // The tone of the narrative (e.g. "suspenseful", "cheerful")
  imageSkipped?: boolean; // Whether image generation was intentionally skipped by AI
  stateSnapshot?: GameStateSnapshot; // Snapshot of the game state at this point
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

  // ID Counters (Critical for forks)
  nextIds: {
    item: number;
    npc: number;
    location: number;
    knowledge: number;
    quest: number;
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
  envTheme: string;
  veoScript?: string;
}

export interface Location {
  id: number;
  name: string;
  visible: {
    description: string;
    knownFeatures: string[];
  };
  hidden: {
    fullDescription: string;
    hiddenFeatures: string[];
    secrets: string[];
  };
  lore?: string;
  isVisited: boolean;
  environment?: string;
  createdAt: number;
  discoveredAt?: number;
  notes?: string;
}

export interface KnowledgeEntry {
  id: number;
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
  visible: {
    description: string;
    details?: string;
  };
  hidden: {
    fullTruth: string;
    misconceptions?: string[];
    toBeRevealed?: string[];
  };
  discoveredAt?: string;
  relatedTo?: string[];
  createdAt: number;
  lastModified: number;
}

export interface InventoryItem {
  id: number;
  name: string;
  visible: {
    description: string;
    notes?: string;
  };
  hidden: {
    truth: string;
    secrets?: string[];
  };
  createdAt: number;
  lastModified: number;
  lore?: string;
  isMystery?: boolean;
  icon?: string;
}

export interface Quest {
  id: number;
  title: string;
  type: "main" | "side" | "hidden";
  status: "active" | "completed" | "failed";
  visible: {
    description: string;
    objectives?: string[];
  };
  hidden: {
    trueDescription?: string;
    trueObjectives?: string[];
    secretOutcome?: string;
  };
  createdAt: number;
  lastModified: number;
}

export interface InventoryAction {
  action: "add" | "remove" | "update";
  id?: number; // Numeric ID
  name: string; // Name is still useful for reference

  // Dual-layer support
  visible?: {
    description?: string;
    notes?: string;
  };
  hidden?: {
    truth?: string;
    secrets?: string[];
  };

  lore?: string;
  isMystery?: boolean;
  newItem?: string;
}

export interface QuestAction {
  action: "add" | "update" | "complete" | "fail";
  id: number | string;
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
}

export interface RelationshipAction {
  action: "add" | "update" | "remove";
  id?: number;
  name: string;

  visible?: {
    description?: string;
    appearance?: string;
    status?: string;
  };
  hidden?: {
    realPersonality?: string;
    realMotives?: string;
    secrets?: string[];
    trueAffinity?: number;
  };

  relationshipType?: string;
  affinity?: number;
  affinityKnown?: boolean;
  notes?: string;
}

export interface LocationAction {
  type: "current" | "known";
  action: "update" | "add";
  id?: number;
  name: string;

  visible?: {
    description?: string;
    knownFeatures?: string[];
  };
  hidden?: {
    fullDescription?: string;
    hiddenFeatures?: string[];
    secrets?: string[];
  };

  lore?: string;
  environment?: string;
  notes?: string;
}

export interface KnowledgeAction {
  action: "add" | "update";
  id?: number;
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
  id?: number; // For skills/conditions
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

  value?: any;
  intValue?: number;
  strValue?: string;
  maxValue?: number;
  color?: string;
}

export interface AdventureTurnInput {
  recentHistory: StorySegment[];
  summaries: string[];
  outline: StoryOutline | null;
  inventory: InventoryItem[];
  relationships: Relationship[];
  quests: Quest[];
  locations: Location[];
  currentLocationId: string;
  character: CharacterStatus;
  knowledge?: KnowledgeEntry[]; // Player's accumulated knowledge
  userAction: string;
  language: string;
  themeKey?: string;
  tFunc?: (key: string) => any;
  time?: string;
  timeline?: TimelineEvent[]; // Added timeline support
}
export interface GameResponse {
  narrative: string;
  choices: string[];
  inventoryActions?: InventoryAction[];
  relationshipActions?: RelationshipAction[];
  locationActions?: LocationAction[];
  characterUpdates?: CharacterUpdates;
  questActions?: QuestAction[];
  knowledgeActions?: KnowledgeAction[]; // Player's accumulated knowledge
  imagePrompt?: string;
  envTheme?: string; // Optional update for atmosphere
  environment?: string; // The detected environment for audio ambience
  narrativeTone?: string; // The tone of the narrative
  generateImage?: boolean;
  timeUpdate?: string; // The new time string
  worldEvents?: Array<{
    description: string;
    category: 'npc_action' | 'world_event';
    involvedEntities?: string[];
  }>;
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
  }>;
  profile?: {
    status?: string;
    appearance?: string;
    profession?: string;
    background?: string;
    race?: string;
  };
}

export interface ItemExplanation {
  name: string;
  description: string;
  lore: string;
}

export interface ThemeConfig {
  vars: Record<string, string>; // Default (Night)
  dayVars?: Record<string, string>; // Optional Day Mode overrides
  fontClass: string;
}

export interface StoryThemeConfig {
  defaultEnvTheme: string;
  icon?: string;
  categories?: string[];
  restricted?: boolean;
}

export type LanguageCode = "en" | "zh";

export type AIProvider = "gemini" | "openai" | "openrouter";

export interface ProviderCredentials {
  apiKey?: string;
  baseUrl?: string;
}

export interface FunctionConfig {
  provider: AIProvider;
  modelId: string;
  enabled?: boolean;
  resolution?: string; // e.g. "512x512", "1024x1024"
  thinkingLevel?: "low" | "medium" | "high"; // For Gemini Thinking
  mediaResolution?: "low" | "medium" | "high"; // For Gemini Vision

  gender?: "male" | "female"; // For TTS voice selection (Legacy)
  voice?: string; // Specific voice ID (e.g. "alloy", "coral")
  speed?: number; // 0.25 to 4.0
  format?: "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm";
}

export interface AISettings {
  gemini: ProviderCredentials;
  openai: ProviderCredentials;
  openrouter: ProviderCredentials;
  contextLen: number; // Max conversation turns before summarization

  story: FunctionConfig;
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
  lore: FunctionConfig;
  language: LanguageCode;

  // Image Generation Settings
  imageTimeout: number; // Timeout in seconds
  manualImageGen: boolean; // Require manual click to generate
}

export interface ModelInfo {
  id: string;
  name?: string;
  capabilities?: {
    image?: boolean;
    video?: boolean;
    audio?: boolean;
    text?: boolean;
  };
}

export type FeedLayout = "scroll" | "stack";
