export interface GameState {
  // Tree Structure: ID -> Segment
  nodes: Record<string, StorySegment>;
  activeNodeId: string | null; // The leaf node of the current path
  rootNodeId: string | null;

  inventory: InventoryItem[];
  relationships: Relationship[];
  quests: Quest[];
  character: CharacterStatus;

  // Location System
  currentLocation: string;
  knownLocations: string[];
  locations: Location[];

  // Meta
  outline: StoryOutline | null;
  summaries: string[]; // Array of summaries, where the last one is the most current
  lastSummarizedIndex: number; // Track how many nodes have been summarized to avoid re-summarizing

  isProcessing: boolean;
  isImageGenerating: boolean;
  error: string | null;
  theme: string;

  // Stats & Logs
  totalTokens: number;
  logs: LogEntry[];
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
  color: 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'gray';
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
  role: 'user' | 'model';
  timestamp: number;
  summarySnapshot?: string; // If this node triggered a summary, store it here
  usage?: TokenUsage;

  // Fork-safe Summary State
  summaries?: string[]; // The total summary of the story up to this node
  summarizedIndex?: number; // The index in the history chain where the summary ends
  environment?: string; // The environment ambience for this segment
  imageSkipped?: boolean; // Whether image generation was intentionally skipped by AI
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
  type: 'main' | 'side' | 'hidden';
  status: 'active' | 'completed' | 'failed';
}

export interface InventoryAction {
  action: 'add' | 'remove' | 'update';
  item: string;
  newItem?: string; // For 'update' name change
  // New fields for rich items
  description?: string;
  lore?: string;
  isMystery?: boolean;
}

export interface QuestAction {
  action: 'add' | 'update' | 'complete' | 'fail';
  id: string;
  title?: string;
  description?: string;
  type?: 'main' | 'side' | 'hidden';
}

export interface RelationshipAction {
  action: 'add' | 'update' | 'remove';
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
  type: 'current' | 'known';
  action: 'update' | 'add';
  name: string;
  description?: string;
  lore?: string;
  environment?: string;
  notes?: string;
}

export interface CharacterAction {
  target: 'attribute' | 'skill' | 'status' | 'appearance';
  action: 'add' | 'remove' | 'update';
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
  userAction: string;
  language: string;
  themeKey?: string;
  tFunc?: (key: string) => any;
}

export interface GameResponse {
  narrative: string;
  choices: string[];
  inventoryActions: InventoryAction[];
  relationshipActions: RelationshipAction[];
  locationActions: LocationAction[];
  characterActions: CharacterAction[];
  questActions: QuestAction[];
  currentQuest?: string; // Legacy support
  imagePrompt: string;
  theme?: string; // Optional update
  environment?: string; // The detected environment for audio ambience
  generateImage?: boolean;
}

export interface ItemExplanation {
  name: string;
  description: string;
  lore: string;
}

export interface ThemeConfig {
  vars: Record<string, string>;
  fontClass: string;
}

export type LanguageCode = 'en' | 'zh';

export type AIProvider = 'gemini' | 'openai' | 'openrouter';

export interface ProviderCredentials {
  apiKey?: string;
  baseUrl?: string;
}

export interface FunctionConfig {
  provider: AIProvider;
  modelId: string;
  enabled?: boolean;
  resolution?: string; // e.g. "512x512", "1024x1024"
  thinkingLevel?: 'low' | 'medium' | 'high'; // For Gemini Thinking
  mediaResolution?: 'low' | 'medium' | 'high'; // For Gemini Vision
  gender?: 'male' | 'female'; // For TTS voice selection
}

export interface AISettings {
  gemini: ProviderCredentials;
  openai: ProviderCredentials;
  openrouter: ProviderCredentials;
  contextLen: number; // Max conversation turns before summarization

  story: FunctionConfig;
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

export type FeedLayout = 'scroll' | 'stack';