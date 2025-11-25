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
  envTheme: string; // Dynamic atmosphere (e.g. "Dark", "Tense")
  theme: string; // Static game genre (e.g. "Cyberpunk", "Wuxia")
  time: string; // In-game time tracking

  // Stats & Logs
  totalTokens: number;
  logs: LogEntry[];

  // Cached Veo Script
  veoScript?: string;

  // New World System Fields
  nextIds: {
    item: number;
    npc: number;
    location: number;
    knowledge: number;
    quest: number;
    faction: number;
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

export interface TimelineEvent {
  id: string;
  gameTime: string;
  category: "player_action" | "npc_action" | "world_event" | "consequence";
  visible: {
    description: string;
    causedBy?: string;
  };
  hidden: {
    trueDescription: string;
    trueCausedBy?: string;
    consequences?: string[];
  };
  involvedEntities?: string[];
  chainId?: string; // Link to a CausalChain
  unlocked?: boolean; // True when true cause/consequences are revealed
  highlight?: boolean; // True when updated in current turn (for UI)
  known?: boolean; // True if the player is aware of this event
}

export interface CausalChain {
  chainId: string;
  rootCause: {
    eventId: string;
    description: string;
  };
  events: TimelineEvent[];
  status: "active" | "resolved" | "interrupted";
  pendingConsequences?: Array<{
    description: string;
    delayTurns: number; // Changed from delayMinutes
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

export interface Faction {
  id: number;
  name: string;
  visible: string; // Public agenda
  hidden: string; // Secret agenda
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
    history: string; // Ancient events that shape the present
  };
  factions: Omit<Faction, "id">[]; // Major power groups
  locations: Omit<Location, "id" | "isVisited" | "createdAt">[]; // Initial locations (Detailed structure)
  character: CharacterStatus; // Initial character state
  inventory?: InventoryItem[]; // Initial inventory
  relationships?: Relationship[]; // Initial relationships
  knowledge?: Omit<KnowledgeEntry, "id">[]; // Initial knowledge
  timeline?: TimelineEvent[]; // Initial timeline events (Backstory)
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
  unlocked?: boolean; // True when hidden effects are revealed to player
  highlight?: boolean; // True when updated in current turn (for UI)
}

export interface CharacterCondition {
  id: number;
  name: string;
  type: "buff" | "debuff" | "neutral";
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
  unlocked?: boolean; // True when true cause/cure are revealed
  highlight?: boolean; // True when updated in current turn (for UI)
}

export interface HiddenTrait {
  id: number;
  name: string;
  description: string;
  effects: string[];
  triggerConditions?: string[];
  unlocked: boolean; // True when triggerConditions are met and trait is revealed
  highlight?: boolean; // True when updated in current turn (for UI)
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
  sidebarCollapsed?: boolean; // Persisted state for left sidebar collapse
  timelineCollapsed?: boolean; // Persisted state for right timeline collapse
}

export interface Relationship {
  id: number;
  known?: boolean; // Whether the player has met/knows this character
  visible: {
    name: string; // The name the player knows them by
    description: string;
    appearance?: string;
    relationshipType: string; // Was status
    currentImpression?: string;
    personality?: string; // Public perception of personality (may differ from hidden truth)
    affinity: number; // Moved from root
    affinityKnown: boolean; // Moved from root
  };
  hidden: {
    trueName?: string; // The character's real name (if different from visible)
    realPersonality: string;
    realMotives: string;
    secrets: string[];
    trueAffinity: number;
    relationshipType: string; // Added
    status: string; // Current state (e.g. "plotting", "injured")
  };
  createdAt: number;
  lastModified: number;
  notes?: string; // NPC's observations of player's displayed knowledge/behavior
  unlocked?: boolean; // True when hidden personality/motives revealed (requires special ability)
  highlight?: boolean; // True when updated in current turn (for UI)
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
  summarySnapshot?: StorySummary; // If this node triggered a summary, store it here
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
  factions: Faction[]; // Added factions to snapshot

  // ID Counters (Critical for forks)
  nextIds: {
    item: number;
    npc: number;
    location: number;
    knowledge: number;
    quest: number;
    faction: number;
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
  unlocked?: boolean; // True when hidden secrets are discovered
  highlight?: boolean; // True when updated in current turn (for UI)
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
  unlocked?: boolean; // True when full truth is revealed
  highlight?: boolean; // True when updated in current turn (for UI)
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
  icon?: string;
  unlocked?: boolean; // True when hidden truth is revealed to player
  highlight?: boolean; // True when updated in current turn (for UI)
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
  unlocked?: boolean; // True when true objectives/outcome are revealed
  highlight?: boolean; // True when updated in current turn (for UI)
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
  newItem?: string;
  unlocked?: boolean; // Set when hidden truth should be revealed/locked
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
  unlocked?: boolean; // Set when true objectives should be revealed
}

export interface RelationshipAction {
  action: "add" | "update" | "remove";
  id?: number;
  known?: boolean; // Update known status

  visible?: {
    name?: string; // Update visible name
    description?: string;
    appearance?: string;
    relationshipType?: string;
    currentImpression?: string;
    affinity?: number;
    affinityKnown?: boolean;
  };
  hidden?: {
    realPersonality?: string;
    realMotives?: string;
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
  unlocked?: boolean; // Set when hidden secrets are discovered
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
  unlocked?: boolean; // Set when hidden effects should be revealed (skills/conditions)
}

export interface AdventureTurnInput {
  recentHistory: StorySegment[];
  summaries: StorySummary[];
  outline: StoryOutline | null;
  inventory: InventoryItem[];
  relationships: Relationship[];
  quests: Quest[];
  locations: Location[];
  currentLocationId: string;
  character: CharacterStatus;
  knowledge?: KnowledgeEntry[]; // Player's accumulated knowledge
  factions?: any[]; // Added factions support
  userAction: string;
  language: string;
  themeKey?: string;
  tFunc?: (key: string) => any;
  time?: string;
  timeline?: TimelineEvent[]; // Added timeline support
  causalChains?: CausalChain[]; // Added causal chain support
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
  timelineEvents?: Array<{
    category: "npc_action" | "world_event" | "consequence";
    visible: {
      description: string;
      causedBy?: string;
    };
    hidden: {
      trueDescription: string;
      trueCausedBy?: string;
      consequences?: string[];
    };
    involvedEntities?: string[];
    // Causal Chain Logic
    chainId?: string; // Link to existing chain
    newChain?: {
      description: string; // Description of the chain's theme/cause
    };
    projectedConsequences?: Array<{
      description: string;
      delayTurns: number;
      probability: number;
    }>;
  }>;
  factionActions?: FactionAction[];
}

export interface FactionAction {
  action: "update";
  id: number;
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
    id?: number;
    name: string;
    type?: "buff" | "debuff" | "neutral";
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
    id?: number;
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

  // Advanced Model Parameters
  temperature?: number;
  topP?: number;
  topK?: number;
  minP?: number;
}

export interface AISettings {
  gemini: ProviderCredentials;
  openai: ProviderCredentials;
  openrouter: ProviderCredentials;
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
  };
}

export type FeedLayout = "scroll" | "stack";

export interface ImageGenerationContext {
  theme: string;
  worldSetting?: string; // Added worldSetting
  time?: string;
  location?: {
    name: string;
    environment: string;
    details: string;
  };
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
}
