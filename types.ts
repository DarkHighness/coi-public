
export interface GameState {
  // Tree Structure: ID -> Segment
  nodes: Record<string, StorySegment>;
  activeNodeId: string | null; // The leaf node of the current path
  rootNodeId: string | null;

  inventory: InventoryItem[];
  relationships: Relationship[];
  quests: Quest[];
  // Deprecated: currentQuest (use quests instead)
  currentQuest?: string;
  character: CharacterStatus;

  // Location System
  // Location System
  currentLocation: string;
  knownLocations: string[];
  locations: Location[];

  // Meta
  outline: StoryOutline | null;
  accumulatedSummary: string; // The summary of the story *prior* to the current context window

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
}

export interface SaveSlot {
  id: string;
  name: string;
  timestamp: number;
  theme: string;
  summary: string;
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
}

export interface Relationship {
  name: string;
  description: string;
  status: string;
  affinity: number;
  affinityKnown?: boolean;
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
}

export interface Location {
  id: string;
  name: string;
  description: string;
  lore?: string;
  isVisited?: boolean;
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
  type: 'main' | 'side';
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
  type?: 'main' | 'side';
}

export interface RelationshipAction {
  action: 'add' | 'update' | 'remove';
  name: string;
  description?: string;
  status?: string;
  affinity?: number;
  affinityKnown?: boolean;
}

export interface LocationAction {
  type: 'current' | 'known';
  action: 'update' | 'add';
  name: string;
  description?: string;
  lore?: string;
}

export interface CharacterAction {
  target: 'attribute' | 'skill' | 'status';
  action: 'add' | 'remove' | 'update';
  name: string; // Name of attribute/skill, or 'status'
  value?: any; // Generic value
  intValue?: number; // For attributes
  strValue?: string; // For skills/status
  maxValue?: number;
  color?: string;
  description?: string;
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
}

export interface ItemExplanation {
  name: string;
  description: string;
  lore: string;
}

export interface ThemeConfig {
  name: string;
  vars: Record<string, string>;
  fontClass: string;
  narrativeStyle?: string;
  narrativeStyle_zh?: string;
  backgroundTemplate?: string;
  backgroundTemplate_zh?: string;
  example?: string;
  example_zh?: string;
}

export type LanguageCode = 'en' | 'zh';

export type AIProvider = 'gemini' | 'openai';

export interface ProviderCredentials {
  apiKey?: string;
  baseUrl?: string;
}

export interface FunctionConfig {
  provider: AIProvider;
  modelId: string;
  enabled?: boolean;
}

export interface AISettings {
  gemini: ProviderCredentials;
  openai: ProviderCredentials;
  contextLen: number; // Max conversation turns before summarization

  story: FunctionConfig;
  image: FunctionConfig;
  video: FunctionConfig;
  audio: FunctionConfig;
  translation: FunctionConfig;
  lore: FunctionConfig;
  language: LanguageCode;
}

export interface ModelInfo {
  id: string;
  name?: string;
}

export type FeedLayout = 'scroll' | 'stack';