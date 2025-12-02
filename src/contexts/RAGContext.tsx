/**
 * RAG Context
 *
 * Provides global access to the RAG (Retrieval Augmented Generation) service
 * throughout the application. This context manages:
 * - RAG service initialization and lifecycle
 * - Save context switching
 * - Document indexing and search
 * - Model mismatch and storage overflow handling
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import type { AISettings, GameState, ForkTree } from "../types";
import {
  initializeRAGService,
  getRAGService,
  terminateRAGService,
  type RAGService,
  type RAGStatus,
  type SearchResult,
  type SearchOptions,
  type ModelMismatchInfo,
  type StorageOverflowInfo,
  type GlobalStorageStats,
  type DocumentType,
  type RAGDocumentMeta,
} from "../services/rag";
import { getEmbeddingModels as getGeminiEmbeddingModels } from "../services/providers/geminiProvider";
import { getEmbeddingModels as getOpenAIEmbeddingModels } from "../services/providers/openaiProvider";
import { getEmbeddingModels as getOpenRouterEmbeddingModels } from "../services/providers/openRouterProvider";
import { getEmbeddingModels as getClaudeEmbeddingModels } from "../services/providers/claudeProvider";
import { extractDocumentsFromState } from "../hooks/useRAG";

// ============================================================================
// Types
// ============================================================================

export interface RAGContextState {
  isInitialized: boolean;
  isLoading: boolean;
  status: RAGStatus | null;
  error: string | null;
  modelMismatch: ModelMismatchInfo | null;
  storageOverflow: StorageOverflowInfo | null;
  currentSaveId: string | null;
}

export interface RAGContextActions {
  /** Initialize the RAG service with settings */
  initialize: (settings: AISettings) => Promise<boolean>;
  /** Switch to a different save context */
  switchSave: (
    saveId: string,
    forkId: number,
    forkTree: ForkTree,
  ) => Promise<boolean>;
  /** Update documents in the index */
  updateDocuments: (
    state: GameState,
    changedEntityIds: string[],
  ) => Promise<void>;
  /** Search for similar documents */
  search: (query: string, options?: SearchOptions) => Promise<SearchResult[]>;
  /** Get recently added documents */
  getRecentDocuments: (
    limit?: number,
    types?: DocumentType[],
  ) => Promise<RAGDocumentMeta[]>;
  /** Get RAG context for a query */
  getRAGContext: (query: string, state: GameState) => Promise<string>;
  /** Handle model mismatch */
  handleModelMismatch: (
    action: "rebuild" | "disable" | "continue",
  ) => Promise<void>;
  /** Handle storage overflow */
  handleStorageOverflow: (saveIdsToDelete: string[]) => Promise<void>;
  /** Get statistics for all saves */
  getAllSaveStats: () => Promise<GlobalStorageStats | null>;
  /** Run cleanup */
  cleanup: () => Promise<void>;
  /** Terminate the service */
  terminate: () => void;
  /** Refresh status from the service */
  refreshStatus: () => Promise<void>;
  /** Index initial entities for a new game */
  indexInitialEntities: (state: GameState, saveId: string) => Promise<void>;
  /** Get the underlying RAG service (for advanced use) */
  getService: () => RAGService | null;
}

interface RAGContextValue extends RAGContextState {
  actions: RAGContextActions;
}

// ============================================================================
// Context
// ============================================================================

const RAGContext = createContext<RAGContextValue | null>(null);

/**
 * Hook to access the RAG context
 */
export function useRAGContext(): RAGContextValue {
  const context = useContext(RAGContext);
  if (!context) {
    throw new Error("useRAGContext must be used within a RAGProvider");
  }
  return context;
}

/**
 * Optional hook that returns null if not within a provider
 * Useful for components that may or may not have RAG available
 */
export function useOptionalRAGContext(): RAGContextValue | null {
  return useContext(RAGContext);
}

// ============================================================================
// Provider
// ============================================================================

interface RAGProviderProps {
  children: ReactNode;
}

export function RAGProvider({ children }: RAGProviderProps) {
  const [state, setState] = useState<RAGContextState>({
    isInitialized: false,
    isLoading: false,
    status: null,
    error: null,
    modelMismatch: null,
    storageOverflow: null,
    currentSaveId: null,
  });

  const serviceRef = useRef<RAGService | null>(null);
  const settingsRef = useRef<AISettings | null>(null);

  // ============================================================================
  // Initialization
  // ============================================================================

  const initialize = useCallback(
    async (settings: AISettings): Promise<boolean> => {
      if (!settings.embedding?.enabled) {
        return false;
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      settingsRef.current = settings;

      try {
        // Get the embedding provider instance
        const embeddingConfig = settings.embedding;
        const providerId = embeddingConfig.providerId;
        const providerInstance = settings.providers.instances.find(
          (p) => p.id === providerId,
        );

        if (!providerInstance) {
          throw new Error(`Embedding provider not found: ${providerId}`);
        }

        // Build credentials from the provider instance
        const credentials = {
          gemini:
            providerInstance.protocol === "gemini"
              ? {
                  apiKey: providerInstance.apiKey,
                  baseUrl: providerInstance.baseUrl,
                }
              : undefined,
          openai:
            providerInstance.protocol === "openai"
              ? {
                  apiKey: providerInstance.apiKey,
                  baseUrl: providerInstance.baseUrl,
                }
              : undefined,
          openrouter:
            providerInstance.protocol === "openrouter"
              ? { apiKey: providerInstance.apiKey }
              : undefined,
          claude:
            providerInstance.protocol === "claude"
              ? {
                  apiKey: providerInstance.apiKey,
                  baseUrl: providerInstance.baseUrl,
                }
              : undefined,
        };

        // Determine embedding provider protocol and model from settings
        const provider = providerInstance.protocol;
        const modelId = embeddingConfig.modelId || "text-embedding-004";

        // Get context length for the selected model
        let contextLength: number | undefined;
        try {
          let models: any[] = [];
          switch (provider) {
            case "gemini":
              models = await getGeminiEmbeddingModels({
                apiKey: providerInstance.apiKey,
              });
              break;
            case "openai":
              models = await getOpenAIEmbeddingModels({
                apiKey: providerInstance.apiKey,
                baseUrl: providerInstance.baseUrl,
              });
              break;
            case "openrouter":
              models = await getOpenRouterEmbeddingModels({
                apiKey: providerInstance.apiKey,
              });
              break;
            case "claude":
              models = await getClaudeEmbeddingModels({
                apiKey: providerInstance.apiKey,
              });
              break;
          }

          const modelInfo = models.find((m) => m.id === modelId);
          if (modelInfo?.contextLength) {
            contextLength = modelInfo.contextLength;
          }
        } catch (error) {
          console.warn(
            "[RAGContext] Failed to fetch model info for context length:",
            error,
          );
        }

        // Initialize the RAG service
        const service = await initializeRAGService(
          {
            provider,
            modelId,
            dimensions: embeddingConfig.dimensions,
            contextLength,
          },
          credentials,
        );

        serviceRef.current = service;

        // Set up event listeners
        service.on("modelMismatch", (data) => {
          setState((prev) => ({ ...prev, modelMismatch: data }));
        });

        service.on("storageOverflow", (data) => {
          setState((prev) => ({ ...prev, storageOverflow: data }));
        });

        service.on("error", (error) => {
          console.error("[RAGContext] Service error:", error);
          setState((prev) => ({ ...prev, error }));
        });

        // Get initial status
        const status = await service.getStatus();

        setState((prev) => ({
          ...prev,
          isInitialized: true,
          isLoading: false,
          status,
          currentSaveId: status.currentSaveId,
        }));

        console.log("[RAGContext] Initialized successfully");
        return true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to initialize RAG";
        console.error("[RAGContext] Initialization failed:", errorMessage);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        return false;
      }
    },
    [],
  );

  // ============================================================================
  // Save Switching
  // ============================================================================

  const switchSave = useCallback(
    async (
      saveId: string,
      forkId: number,
      forkTree: ForkTree,
    ): Promise<boolean> => {
      const service = serviceRef.current;
      if (!service) {
        console.warn("[RAGContext] switchSave: Service not initialized");
        return false;
      }

      try {
        console.log(
          `[RAGContext] Switching to save: ${saveId}, fork: ${forkId}`,
        );

        // Convert ForkTree to the format expected by RAG service
        const ragForkTree = {
          nodes: Object.fromEntries(
            Object.entries(forkTree.nodes).map(([id, node]) => [
              Number(id),
              { id: Number(id), parentId: node.parentId },
            ]),
          ),
        };

        await service.switchSave(saveId, forkId, ragForkTree);

        // Check for model mismatch after switching
        const mismatch = await service.checkModelMismatch(saveId);
        if (mismatch) {
          setState((prev) => ({ ...prev, modelMismatch: mismatch }));
        }

        // Update status
        const status = await service.getStatus();
        setState((prev) => ({
          ...prev,
          status,
          currentSaveId: saveId,
        }));

        console.log(`[RAGContext] Switched to save: ${saveId}`);
        return true;
      } catch (error) {
        console.error("[RAGContext] Switch save failed:", error);
        return false;
      }
    },
    [],
  );

  // ============================================================================
  // Document Updates
  // ============================================================================

  const updateDocuments = useCallback(
    async (gameState: GameState, changedEntityIds: string[]): Promise<void> => {
      const service = serviceRef.current;
      if (!service || !state.currentSaveId) {
        console.warn(
          "[RAGContext] updateDocuments: No service or save context",
        );
        return;
      }

      try {
        const documents = extractDocumentsFromState(
          gameState,
          changedEntityIds,
        );

        if (documents.length === 0) return;

        await service.addDocuments(
          documents.map((doc) => ({
            ...doc,
            saveId: state.currentSaveId!,
            forkId: gameState.forkId || 0,
            turnNumber: gameState.turnNumber || 0,
          })),
        );

        console.log(`[RAGContext] Updated ${documents.length} documents`);
      } catch (error) {
        console.error("[RAGContext] Update documents failed:", error);
      }
    },
    [state.currentSaveId],
  );

  // ============================================================================
  // Index Initial Entities
  // ============================================================================

  const indexInitialEntities = useCallback(
    async (gameState: GameState, saveId: string): Promise<void> => {
      const service = serviceRef.current;
      if (!service) {
        console.warn(
          "[RAGContext] indexInitialEntities: Service not initialized",
        );
        return;
      }

      try {
        console.log(
          `[RAGContext] Indexing initial entities for save: ${saveId}`,
        );

        const entityIds: string[] = [];

        // Index outline documents first (highest priority)
        if (gameState.outline) {
          entityIds.push("outline:full");
          entityIds.push("outline:world");
          entityIds.push("outline:goal");
          entityIds.push("outline:premise");
          entityIds.push("outline:character");
        }

        gameState.inventory?.forEach((item) => entityIds.push(item.id));
        gameState.relationships?.forEach((npc) => entityIds.push(npc.id));
        gameState.locations?.forEach((loc) => entityIds.push(loc.id));
        gameState.quests?.forEach((quest) => entityIds.push(quest.id));
        gameState.knowledge?.forEach((know) => entityIds.push(know.id));
        gameState.factions?.forEach((faction) => entityIds.push(faction.id));
        gameState.timeline?.forEach((event) => entityIds.push(event.id));

        if (entityIds.length === 0) {
          console.log("[RAGContext] No entities to index");
          return;
        }

        const documents = extractDocumentsFromState(gameState, entityIds);
        if (documents.length === 0) {
          console.log("[RAGContext] No documents extracted");
          return;
        }

        await service.addDocuments(
          documents.map((doc) => ({
            ...doc,
            saveId,
            forkId: gameState.forkId || 0,
            turnNumber: gameState.turnNumber || 0,
          })),
        );

        console.log(
          `[RAGContext] Indexed ${documents.length} initial documents`,
        );

        // Update status after indexing
        const status = await service.getStatus();
        setState((prev) => ({ ...prev, status }));
      } catch (error) {
        console.error("[RAGContext] Failed to index initial entities:", error);
      }
    },
    [],
  );

  // ============================================================================
  // Search
  // ============================================================================

  const search = useCallback(
    async (
      query: string,
      options: SearchOptions = {},
    ): Promise<SearchResult[]> => {
      const service = serviceRef.current;
      if (!service) return [];

      try {
        return await service.search(query, options);
      } catch (error) {
        console.error("[RAGContext] Search failed:", error);
        return [];
      }
    },
    [],
  );

  const getRecentDocuments = useCallback(
    async (
      limit: number = 20,
      types?: DocumentType[],
    ): Promise<RAGDocumentMeta[]> => {
      const service = serviceRef.current;
      if (!service) {
        console.log("[RAGContext] getRecentDocuments: Service not initialized");
        return [];
      }

      try {
        return await service.getRecentDocuments(limit, types);
      } catch (error) {
        console.error("[RAGContext] getRecentDocuments failed:", error);
        return [];
      }
    },
    [],
  );

  const getRAGContext = useCallback(
    async (query: string, gameState: GameState): Promise<string> => {
      const service = serviceRef.current;
      if (!service) return "";

      try {
        const results = await service.search(query, {
          topK: 10,
          threshold: 0.5,
          forkId: gameState.forkId || 0,
          currentForkOnly: true,
        });

        if (results.length === 0) return "";

        // Group by type
        const byType: Record<string, string[]> = {};
        for (const result of results) {
          const type = result.document.type;
          if (!byType[type]) byType[type] = [];
          byType[type].push(result.document.content);
        }

        // Build context string
        const sections: string[] = [];

        if (byType.story?.length) {
          sections.push(
            `## Recent Story Context\n${byType.story.join("\n\n")}`,
          );
        }
        if (byType.npc?.length) {
          sections.push(`## Relevant NPCs\n${byType.npc.join("\n\n")}`);
        }
        if (byType.location?.length) {
          sections.push(
            `## Relevant Locations\n${byType.location.join("\n\n")}`,
          );
        }
        if (byType.knowledge?.length) {
          sections.push(`## World Knowledge\n${byType.knowledge.join("\n\n")}`);
        }
        if (byType.quest?.length) {
          sections.push(`## Active Quests\n${byType.quest.join("\n\n")}`);
        }
        if (byType.item?.length) {
          sections.push(`## Relevant Items\n${byType.item.join("\n\n")}`);
        }

        return sections.join("\n\n");
      } catch (error) {
        console.error("[RAGContext] Get context failed:", error);
        return "";
      }
    },
    [],
  );

  // ============================================================================
  // Model Mismatch Handling
  // ============================================================================

  const handleModelMismatch = useCallback(
    async (action: "rebuild" | "disable" | "continue"): Promise<void> => {
      const service = serviceRef.current;

      switch (action) {
        case "rebuild":
          if (service && state.currentSaveId) {
            await service.rebuildForModel(state.currentSaveId);
            setState((prev) => ({ ...prev, modelMismatch: null }));
          }
          break;

        case "disable":
          // Disable RAG in settings
          if (settingsRef.current) {
            settingsRef.current.embedding = {
              ...settingsRef.current.embedding,
              enabled: false,
            };
          }
          terminateRAGService();
          serviceRef.current = null;
          setState((prev) => ({
            ...prev,
            isInitialized: false,
            modelMismatch: null,
            currentSaveId: null,
          }));
          break;

        case "continue":
          // Just clear the warning
          setState((prev) => ({ ...prev, modelMismatch: null }));
          break;
      }
    },
    [state.currentSaveId],
  );

  // ============================================================================
  // Storage Overflow Handling
  // ============================================================================

  const handleStorageOverflow = useCallback(
    async (saveIdsToDelete: string[]): Promise<void> => {
      const service = serviceRef.current;
      if (!service) return;

      try {
        await service.deleteOldestSaves(saveIdsToDelete);
        setState((prev) => ({ ...prev, storageOverflow: null }));
      } catch (error) {
        console.error("[RAGContext] Delete saves failed:", error);
      }
    },
    [],
  );

  // ============================================================================
  // Stats & Status
  // ============================================================================

  const getAllSaveStats =
    useCallback(async (): Promise<GlobalStorageStats | null> => {
      const service = serviceRef.current;
      if (!service) return null;

      try {
        return await service.getAllSaveStats();
      } catch (error) {
        console.error("[RAGContext] Get all save stats failed:", error);
        return null;
      }
    }, []);

  const refreshStatus = useCallback(async (): Promise<void> => {
    const service = serviceRef.current;
    if (!service) return;

    try {
      const status = await service.getStatus();
      setState((prev) => ({
        ...prev,
        status,
        currentSaveId: status.currentSaveId,
      }));
    } catch (error) {
      console.error("[RAGContext] Refresh status failed:", error);
    }
  }, []);

  // ============================================================================
  // Cleanup
  // ============================================================================

  const cleanup = useCallback(async (): Promise<void> => {
    const service = serviceRef.current;
    if (!service) return;

    try {
      await service.cleanup();
      const status = await service.getStatus();
      setState((prev) => ({ ...prev, status }));
    } catch (error) {
      console.error("[RAGContext] Cleanup failed:", error);
    }
  }, []);

  const terminate = useCallback((): void => {
    terminateRAGService();
    serviceRef.current = null;
    setState({
      isInitialized: false,
      isLoading: false,
      status: null,
      error: null,
      modelMismatch: null,
      storageOverflow: null,
      currentSaveId: null,
    });
  }, []);

  const getService = useCallback((): RAGService | null => {
    return serviceRef.current;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Don't terminate the service on unmount since SharedWorker is shared
      // Just clear local refs
      serviceRef.current = null;
    };
  }, []);

  // ============================================================================
  // Context Value
  // ============================================================================

  const actions: RAGContextActions = {
    initialize,
    switchSave,
    updateDocuments,
    search,
    getRecentDocuments,
    getRAGContext,
    handleModelMismatch,
    handleStorageOverflow,
    getAllSaveStats,
    cleanup,
    terminate,
    refreshStatus,
    indexInitialEntities,
    getService,
  };

  const value: RAGContextValue = {
    ...state,
    actions,
  };

  return <RAGContext.Provider value={value}>{children}</RAGContext.Provider>;
}

export default RAGContext;
