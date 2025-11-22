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
  knownLocations: string[];
  locations: Location[];

  // UI State (Persisted)
  uiState: UIState;

  // Meta
  outline: StoryOutline | null;
  summaries: string[]; // Array of summaries, where the last one is the most current
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
  premise: string;
  mainGoal: string;
  worldSetting: string;
  locations: string[]; // Initial locations
  character: CharacterStatus; // Initial character state
  inventory?: InventoryItem[]; // Initial inventory
  relationships?: Relationship[]; // Initial relationships
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

export interface Skill {
  name: string;
  level: string;
  description?: string;
}

export interface CharacterStatus {
  name: string;
  title: string;
  attributes: CharacterAttribute[];
  skills: Skill[];
  status: string;
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
}

export interface Relationship {
  name: string;
  description: string;
  status: string;
  affinity: number;
  affinityKnown?: boolean;
  appearance?: string;
  personality?: string;
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
  summaries?: string[]; // The total summary of the story up to this node
  summarizedIndex?: number; // The index in the history chain where the summary ends
  environment?: string; // The environment ambience for this segment
  envTheme?: string; // The visual theme for this segment
  narrativeTone?: string; // The tone of the narrative (e.g. "suspenseful", "cheerful")
  imageSkipped?: boolean; // Whether image generation was intentionally skipped by AI
  stateSnapshot?: GameStateSnapshot; // Snapshot of the game state at this point
}

export interface GameStateSnapshot {
  inventory: InventoryItem[];
  relationships: Relationship[];
  quests: Quest[];
  character: CharacterStatus;
  knowledge: KnowledgeEntry[]; // Player's accumulated knowledge
  currentLocation: string;
  knownLocations: string[];
  locations: Location[];
  currentQuest?: string;
  veoScript?: string; // Cached Veo script for this story state
  time?: string; // In-game time

  // UI State - preserve user's customizations
  uiState: UIState;

  // Dynamic environment theme (e.g., "dark", "mystical")
  envTheme: string;

  // Note: outline is NOT included as it's immutable and global to the entire game
}

export interface Location {
  id: string;
  name: string;
  description: string;
  lore?: string;
  isVisited?: boolean;
  environment?: string;
  notes?: string;
}

export interface KnowledgeEntry {
  id: string;
  title: string; // Name of the knowledge (e.g., "Ancient Ruins", "Great War")
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
  description: string; // What the player knows
  details?: string; // Additional details or deeper understanding
  discoveredAt?: string; // Where/when this was learned
  relatedTo?: string[]; // IDs of related knowledge, items, or locations
}

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  lore?: string;
  isMystery?: boolean;
  icon?: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: "main" | "side" | "hidden";
  status: "active" | "completed" | "failed";
}

export interface InventoryAction {
  action: "add" | "remove" | "update";
  item: string;
  newItem?: string; // For 'update' name change
  // New fields for rich items
  description?: string;
  lore?: string;
  isMystery?: boolean;
}

export interface QuestAction {
  action: "add" | "update" | "complete" | "fail";
  id: string;
  title?: string;
  description?: string;
  type?: "main" | "side" | "hidden";
}

export interface RelationshipAction {
  action: "add" | "update" | "remove";
  name: string;
  description?: string;
  status?: string;
  affinity?: number;
  affinityKnown?: boolean;
  appearance?: string;
  personality?: string;
  notes?: string;
}

export interface LocationAction {
  type: "current" | "known";
  action: "update" | "add";
  name: string;
  description?: string;
  lore?: string;
  environment?: string;
  notes?: string;
}

export interface KnowledgeAction {
  action: "add" | "update"; // No remove action for knowledge
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
  description: string;
  details?: string;
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
    | "race";
  action: "add" | "remove" | "update";
  name: string; // Name of attribute/skill, or 'status'
  value?: any; // Generic value
  intValue?: number; // For attributes
  strValue?: string; // For skills/status
  maxValue?: number;
  color?: string;
  description?: string;
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
}
export interface GameResponse {
  narrative: string;
  choices: string[];
  inventoryActions?: InventoryAction[];
  relationshipActions?: RelationshipAction[];
  locationActions?: LocationAction[];
  characterActions?: CharacterAction[];
  questActions?: QuestAction[];
  knowledgeActions?: KnowledgeAction[]; // Player's accumulated knowledge
  currentQuest?: string; // Legacy support
  imagePrompt?: string;
  envTheme?: string; // Optional update for atmosphere
  theme?: string; // Optional update for static theme (rarely used but kept for compatibility)
  environment?: string; // The detected environment for audio ambience
  narrativeTone?: string; // The tone of the narrative
  generateImage?: boolean;
  timeUpdate?: string; // Update in-game time
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
