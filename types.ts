
export interface GameState {
  // Tree Structure: ID -> Segment
  nodes: Record<string, StorySegment>;
  activeNodeId: string | null; // The leaf node of the current path
  rootNodeId: string | null;

  inventory: string[];
  relationships: Relationship[];
  currentQuest: string;
  character: CharacterStatus;

  // Location System
  currentLocation: string;
  knownLocations: string[];

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

export interface GameResponse {
  narrative: string;
  choices: string[];
  inventory: string[];
  relationships: Relationship[];
  currentQuest: string;
  character: CharacterStatus;
  currentLocation: string;
  knownLocations: string[];
  imagePrompt: string;
  theme: string;
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
}

export interface ModelInfo {
  id: string;
  name?: string;
}

export type FeedLayout = 'scroll' | 'stack';