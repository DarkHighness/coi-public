import type {
  AISettings,
  ActionResult,
  ForkTree,
  GameState,
  LanguageCode,
  SaveSlot,
  StorySegment,
  UIState,
  ThemeConfig,
} from "../types";
import type { OutlinePhaseProgress } from "../services/aiService";
import type { VfsSession } from "../services/vfs/vfsSession";
import type {
  DocumentType,
  GlobalStorageStats,
  ModelMismatchInfo,
  RAGDocumentMeta,
  RAGService,
  RAGStatus,
  SearchOptions,
  SearchResult,
  StorageOverflowInfo,
} from "../services/rag";

export interface RuntimeRagState {
  currentSaveId: string | null;
  isInitialized: boolean;
  isLoading: boolean;
  status: RAGStatus | null;
  error: string | null;
  modelMismatch: ModelMismatchInfo | null;
  storageOverflow: StorageOverflowInfo | null;
}

export interface RuntimeRagActions {
  initialize: (settings: AISettings) => Promise<boolean>;
  switchSave: (
    saveId: string,
    forkId: number,
    forkTree: ForkTree,
  ) => Promise<boolean>;
  updateDocuments: (
    state: GameState,
    changedEntityIds: string[],
  ) => Promise<void>;
  search: (query: string, options?: SearchOptions) => Promise<SearchResult[]>;
  getRecentDocuments: (
    limit?: number,
    types?: DocumentType[],
  ) => Promise<RAGDocumentMeta[]>;
  getContext: (query: string, state: GameState) => Promise<string>;
  handleModelMismatch: (
    action: "rebuild" | "disable" | "continue",
  ) => Promise<void>;
  handleStorageOverflow: (saveIdsToDelete: string[]) => Promise<void>;
  getAllSaveStats: () => Promise<GlobalStorageStats | null>;
  cleanup: () => Promise<void>;
  terminate: () => void;
  refreshStatus?: () => Promise<void>;
  indexInitialEntities?: (state: GameState, saveId: string) => Promise<void>;
  getService?: () => RAGService | null;
}

export interface RuntimeEngineState {
  language: LanguageCode;
  isTranslating: boolean;
  gameState: GameState;
  vfsSession: VfsSession;
  isAutoSaving: boolean;
  aiSettings: AISettings;
  currentHistory: StorySegment[];
  saveSlots: SaveSlot[];
  currentSlotId: string | null;
  themeMode: "day" | "night" | "system";
  persistenceError: string | null;
  failedImageNodes: Set<string>;
  isMagicMirrorOpen: boolean;
  magicMirrorImage: string | null;
  isVeoScriptOpen: boolean;
  isSettingsOpen: boolean;
  currentThemeConfig: ThemeConfig;
  themeFont: string;
}

export interface RuntimeEngineActions {
  setLanguage: (lang: LanguageCode) => void;
  handleAction: (
    action: string,
    isInit?: boolean,
    forceTheme?: string,
    fromNodeId?: string,
    preventFork?: boolean,
  ) => Promise<ActionResult | null>;
  startNewGame: (
    theme: string,
    customContext?: string,
    onStream?: (text: string) => void,
    onPhaseProgress?: (progress: OutlinePhaseProgress) => void,
    existingSlotId?: string,
    seedImage?: Blob,
    protagonistFeature?: string,
  ) => Promise<void>;
  resumeOutlineGeneration: (
    onStream?: (text: string) => void,
    onPhaseProgress?: (progress: OutlinePhaseProgress) => void,
  ) => Promise<void>;
  handleSaveSettings: (settings: AISettings) => void;
  loadSlot: (id: string) => Promise<{
    success: boolean;
    hasOutline?: boolean;
    hasOutlineConversation?: boolean;
    forkId?: number;
    forkTree?: ForkTree;
  }>;
  renameSlot: (id: string, name: string) => Promise<boolean>;
  deleteSlot: (id: string) => void;
  refreshSlots: () => Promise<SaveSlot[]>;
  toggleThemeMode: () => void;
  setThemeMode: (mode: "day" | "night" | "system") => void;
  resetSettings: () => void;
  clearAllSaves: () => Promise<boolean>;
  hardReset: () => void;
  navigateToNode: (nodeId: string, isFork?: boolean) => Promise<void>;
  generateImageForNode: (
    nodeId: string,
    nodeOverride?: StorySegment,
    isManualClick?: boolean,
  ) => Promise<void>;
  updateNodeAudio: (nodeId: string, audioUrl: string | null) => void;
  clearHighlight: (
    target:
      | {
          kind:
            | "inventory"
            | "npcs"
            | "locations"
            | "knowledge"
            | "quests"
            | "factions"
            | "timeline";
          id: string;
        }
      | {
          kind: "characterSkills" | "characterConditions" | "characterTraits";
          id?: string;
          name?: string;
        },
  ) => void;
  triggerSave: () => void;
  handleForceUpdate: (prompt: string) => void;
  cleanupEntities: () => Promise<{ success: boolean; error?: string } | void>;
  rebuildContext: () => Promise<void>;
  invalidateSession: () => Promise<void>;
  setIsMagicMirrorOpen: (open: boolean) => void;
  setMagicMirrorImage: (image: string | null) => void;
  setIsVeoScriptOpen: (open: boolean) => void;
  setIsSettingsOpen: (open: boolean) => void;
}

export interface RuntimeDomainState {
  gameState: GameState;
  currentHistory: StorySegment[];
  saveSlots: SaveSlot[];
  currentSlotId: string | null;
  vfsSession: VfsSession;
}

export interface RuntimeUiState {
  themeMode: "day" | "night" | "system";
  isSettingsOpen: boolean;
  isMagicMirrorOpen: boolean;
  isVeoScriptOpen: boolean;
  themeFont: string;
}

export interface RuntimeAsyncState {
  isTranslating: boolean;
  isAutoSaving: boolean;
  persistenceError: string | null;
}

export interface RuntimeState extends RuntimeEngineState {
  domain: RuntimeDomainState;
  ui: RuntimeUiState;
  async: RuntimeAsyncState;
  rag: RuntimeRagState;
  runtimeRevision: number;
  lastMutationReason: string | null;
}

export interface RuntimeMutationOptions {
  reason?: string;
  persist?: boolean;
}

export interface RuntimeContinuationCallbacks {
  onStream?: (text: string) => void;
  onPhaseProgress?: (progress: OutlinePhaseProgress) => void;
}

export type RuntimeContinueResult =
  | "navigated-game"
  | "resumed-outline"
  | "started-outline"
  | "invalid-state"
  | "no-save"
  | "load-failed";

export type RuntimeLoadSlotResult =
  | "navigated-game"
  | "resumed-outline"
  | "invalid-state"
  | "load-failed";

export type RuntimeValidationMode = "start" | "continue";

export type RuntimeValidationIssueType =
  | "missing_required_api_key"
  | "missing_optional_api_key"
  | "required_connection_failed"
  | "optional_connection_failed";

export interface RuntimeValidationIssue {
  type: RuntimeValidationIssueType;
  feature: "story" | "lore" | "image" | "audio" | "video" | "embedding" | "script";
  providerId: string;
  providerName: string;
  error?: string;
}

export interface RuntimeValidationResult {
  ok: boolean;
  issues: RuntimeValidationIssue[];
}

export interface RuntimeActions
  extends Omit<RuntimeEngineActions, "setGameState"> {
  rag: RuntimeRagActions;
  updateUiState: <K extends keyof UIState>(
    section: K,
    value: UIState[K],
    options?: RuntimeMutationOptions,
  ) => void;
  setViewedSegmentId: (
    segmentId?: string,
    options?: RuntimeMutationOptions,
  ) => void;
  updateNodeMeta: (
    nodeId: string,
    patch: Partial<StorySegment>,
    options?: RuntimeMutationOptions,
  ) => void;
  setVeoScript: (
    script: string,
    options?: RuntimeMutationOptions,
  ) => void;
  toggleGodMode: (
    enable: boolean,
    options?: RuntimeMutationOptions,
  ) => void;
  unlockAll: (options?: RuntimeMutationOptions) => void;
  applyVfsMutation: (
    nextState: GameState,
    options?: RuntimeMutationOptions,
  ) => void;
  applyVfsDerivedState: (nextState: GameState, reason?: string) => void;
  syncRagSaveContext: (
    saveId: string,
    forkId: number,
    forkTree?: ForkTree,
    options?: RuntimeMutationOptions,
  ) => Promise<boolean>;
  continueGame: (
    callbacks?: RuntimeContinuationCallbacks,
  ) => Promise<RuntimeContinueResult>;
  loadSlotForPlay: (
    id: string,
    callbacks?: RuntimeContinuationCallbacks,
  ) => Promise<RuntimeLoadSlotResult>;
  validateProviders: (
    mode: RuntimeValidationMode,
  ) => Promise<RuntimeValidationResult>;
}

export interface RuntimeContextValue {
  state: RuntimeState;
  actions: RuntimeActions;
}
