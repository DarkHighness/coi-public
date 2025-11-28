/**
 * useRAG Hook
 *
 * A React hook that provides integration between the game engine and the new RAG system.
 * Handles:
 * - RAG service initialization and lifecycle
 * - Save switching and context loading
 * - Document updates on game state changes
 * - Model mismatch detection and user prompts
 * - Storage overflow handling
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type {
  AISettings,
  GameState,
  ForkTree,
  StorySegment,
  InventoryItem,
  Location,
  KnowledgeEntry,
  Quest,
  TimelineEvent,
  Relationship,
  StoryOutline,
} from "../types";
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
  type DocumentType,
} from "../services/rag";

// ============================================================================
// Types
// ============================================================================

export interface RAGHookState {
  isInitialized: boolean;
  isLoading: boolean;
  status: RAGStatus | null;
  error: string | null;
  modelMismatch: ModelMismatchInfo | null;
  storageOverflow: StorageOverflowInfo | null;
}

export interface RAGHookActions {
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
  getRAGContext: (query: string, state: GameState) => Promise<string>;
  handleModelMismatch: (
    action: "rebuild" | "disable" | "continue",
  ) => Promise<void>;
  handleStorageOverflow: (saveIdsToDelete: string[]) => Promise<void>;
  cleanup: () => Promise<void>;
  terminate: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useRAG(
  enabled: boolean = true,
): [RAGHookState, RAGHookActions] {
  const [state, setState] = useState<RAGHookState>({
    isInitialized: false,
    isLoading: false,
    status: null,
    error: null,
    modelMismatch: null,
    storageOverflow: null,
  });

  const serviceRef = useRef<RAGService | null>(null);
  const currentSaveIdRef = useRef<string | null>(null);
  const settingsRef = useRef<AISettings | null>(null);

  // ============================================================================
  // Initialization
  // ============================================================================

  const initialize = useCallback(
    async (settings: AISettings): Promise<boolean> => {
      if (!enabled || !settings.embedding?.enabled) {
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

        // Initialize the RAG service
        const service = await initializeRAGService(
          {
            provider,
            modelId,
            dimensions: embeddingConfig.dimensions,
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
          console.error("[useRAG] Service error:", error);
          setState((prev) => ({ ...prev, error }));
        });

        // Get initial status
        const status = await service.getStatus();

        setState((prev) => ({
          ...prev,
          isInitialized: true,
          isLoading: false,
          status,
        }));

        console.log("[useRAG] Initialized successfully");
        return true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to initialize RAG";
        console.error("[useRAG] Initialization failed:", errorMessage);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        return false;
      }
    },
    [enabled],
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
      if (!service) return false;

      try {
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
        currentSaveIdRef.current = saveId;

        // Check for model mismatch after switching
        const mismatch = await service.checkModelMismatch(saveId);
        if (mismatch) {
          setState((prev) => ({ ...prev, modelMismatch: mismatch }));
        }

        // Update status
        const status = await service.getStatus();
        setState((prev) => ({ ...prev, status }));

        return true;
      } catch (error) {
        console.error("[useRAG] Switch save failed:", error);
        return false;
      }
    },
    [],
  );

  // ============================================================================
  // Document Updates
  // ============================================================================

  const updateDocuments = useCallback(
    async (state: GameState, changedEntityIds: string[]): Promise<void> => {
      const service = serviceRef.current;
      if (!service || !currentSaveIdRef.current) return;

      try {
        const documents = extractDocumentsFromState(state, changedEntityIds);

        if (documents.length === 0) return;

        await service.addDocuments(
          documents.map((doc) => ({
            ...doc,
            saveId: currentSaveIdRef.current!,
            forkId: state.forkId || 0,
            turnNumber: state.turnNumber || 0,
          })),
        );
      } catch (error) {
        console.error("[useRAG] Update documents failed:", error);
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
        console.error("[useRAG] Search failed:", error);
        return [];
      }
    },
    [],
  );

  const getRAGContext = useCallback(
    async (query: string, state: GameState): Promise<string> => {
      const service = serviceRef.current;
      if (!service) return "";

      try {
        const results = await service.search(query, {
          topK: 10,
          threshold: 0.5,
          forkId: state.forkId || 0,
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
            `## Recent Story Context\n${byType.story.slice(0, 3).join("\n\n")}`,
          );
        }
        if (byType.npc?.length) {
          sections.push(
            `## Relevant NPCs\n${byType.npc.slice(0, 3).join("\n\n")}`,
          );
        }
        if (byType.location?.length) {
          sections.push(
            `## Relevant Locations\n${byType.location.slice(0, 2).join("\n\n")}`,
          );
        }
        if (byType.knowledge?.length) {
          sections.push(
            `## World Knowledge\n${byType.knowledge.slice(0, 3).join("\n\n")}`,
          );
        }
        if (byType.quest?.length) {
          sections.push(
            `## Active Quests\n${byType.quest.slice(0, 2).join("\n\n")}`,
          );
        }
        if (byType.item?.length) {
          sections.push(
            `## Relevant Items\n${byType.item.slice(0, 2).join("\n\n")}`,
          );
        }

        return sections.join("\n\n");
      } catch (error) {
        console.error("[useRAG] Get context failed:", error);
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
          if (service && currentSaveIdRef.current) {
            await service.rebuildForModel(currentSaveIdRef.current);
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
          }));
          break;

        case "continue":
          // Just clear the warning
          setState((prev) => ({ ...prev, modelMismatch: null }));
          break;
      }
    },
    [],
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
        console.error("[useRAG] Delete saves failed:", error);
      }
    },
    [],
  );

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
      console.error("[useRAG] Cleanup failed:", error);
    }
  }, []);

  const terminate = useCallback((): void => {
    terminateRAGService();
    serviceRef.current = null;
    currentSaveIdRef.current = null;
    setState({
      isInitialized: false,
      isLoading: false,
      status: null,
      error: null,
      modelMismatch: null,
      storageOverflow: null,
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Don't terminate the service on unmount since SharedWorker is shared
      // Just clear local refs
      serviceRef.current = null;
      currentSaveIdRef.current = null;
    };
  }, []);

  return [
    state,
    {
      initialize,
      switchSave,
      updateDocuments,
      search,
      getRAGContext,
      handleModelMismatch,
      handleStorageOverflow,
      cleanup,
      terminate,
    },
  ];
}

// ============================================================================
// Document Extraction Helpers
// ============================================================================

interface ExtractedDocument {
  entityId: string;
  type: DocumentType;
  content: string;
  importance?: number;
  unlocked?: boolean;
}

export function extractDocumentsFromState(
  state: GameState,
  changedEntityIds: string[],
): ExtractedDocument[] {
  const documents: ExtractedDocument[] = [];

  for (const entityId of changedEntityIds) {
    const [type, id] = entityId.split(":");

    switch (type) {
      case "story": {
        const node = state.nodes[id];
        if (node && node.text) {
          documents.push({
            entityId,
            type: "story",
            content: extractStoryContent(node),
            importance: 0.8,
          });
        }
        break;
      }

      case "npc": {
        const npc = state.relationships?.find((n) => n.id === entityId);
        if (npc) {
          documents.push({
            entityId,
            type: "npc",
            content: extractNPCContent(npc),
            importance: 0.9,
          });
        }
        break;
      }

      case "loc":
      case "location": {
        const location = state.locations?.find((l) => l.id === entityId);
        if (location) {
          documents.push({
            entityId,
            type: "location",
            content: extractLocationContent(location),
            importance: 0.7,
          });
        }
        break;
      }

      case "inv":
      case "item": {
        const item = state.inventory?.find((i) => i.id === entityId);
        if (item) {
          documents.push({
            entityId,
            type: "item",
            content: extractItemContent(item),
            importance: 0.6,
            unlocked: item.unlocked,
          });
        }
        break;
      }

      case "know":
      case "knowledge": {
        const knowledge = state.knowledge?.find((k) => k.id === entityId);
        if (knowledge) {
          documents.push({
            entityId,
            type: "knowledge",
            content: extractKnowledgeContent(knowledge),
            importance: 0.5,
            unlocked: knowledge.unlocked,
          });
        }
        break;
      }

      case "quest": {
        const quest = state.quests?.find((q) => q.id === entityId);
        if (quest) {
          documents.push({
            entityId,
            type: "quest",
            content: extractQuestContent(quest),
            importance: quest.status === "active" ? 0.9 : 0.5,
          });
        }
        break;
      }

      case "evt":
      case "event": {
        const event = state.timeline?.find((e) => e.id === entityId);
        if (event) {
          documents.push({
            entityId,
            type: "event",
            content: extractEventContent(event),
            importance: 0.6,
          });
        }
        break;
      }

      case "outline": {
        // Outline documents use special IDs like "outline:world", "outline:goal", etc.
        if (state.outline) {
          const content = extractOutlineContent(state.outline, id);
          if (content) {
            documents.push({
              entityId,
              type: "outline",
              content,
              importance: 1.0, // Highest importance for core story outline
            });
          }
        }
        break;
      }
    }
  }

  return documents;
}

function extractStoryContent(node: StorySegment): string {
  const parts: string[] = [];

  if (node.role === "user") {
    parts.push(`Player Action: ${node.text}`);
  } else {
    parts.push(node.text);
  }

  if (node.stateSnapshot?.currentLocation) {
    parts.push(`Location: ${node.stateSnapshot.currentLocation}`);
  }

  return parts.join("\n");
}

function extractNPCContent(npc: Relationship): string {
  const parts: string[] = [];

  // Visible info
  if (npc.visible) {
    if (npc.visible.name) parts.push(`Name: ${npc.visible.name}`);
    if (npc.visible.description)
      parts.push(`Description: ${npc.visible.description}`);
    if (npc.visible.appearance)
      parts.push(`Appearance: ${npc.visible.appearance}`);
    if (npc.visible.relationshipType)
      parts.push(`Relationship: ${npc.visible.relationshipType}`);
    if (npc.visible.personality)
      parts.push(`Personality: ${npc.visible.personality}`);
    if (npc.visible.currentImpression)
      parts.push(`Current State: ${npc.visible.currentImpression}`);
  }

  // Hidden info (if unlocked)
  if (npc.unlocked && npc.hidden) {
    if (npc.hidden.realPersonality)
      parts.push(`True Personality: ${npc.hidden.realPersonality}`);
    if (npc.hidden.realMotives)
      parts.push(`True Motives: ${npc.hidden.realMotives}`);
    if (npc.hidden.secrets?.length)
      parts.push(`Secrets: ${npc.hidden.secrets.join(", ")}`);
  }

  return parts.join("\n");
}

function extractLocationContent(location: Location): string {
  const parts: string[] = [];

  if (location.name) parts.push(`Name: ${location.name}`);

  if (location.visible) {
    if (location.visible.description)
      parts.push(`Description: ${location.visible.description}`);
    if (location.visible.knownFeatures?.length) {
      parts.push(`Features: ${location.visible.knownFeatures.join(", ")}`);
    }
  }

  if (location.environment) parts.push(`Environment: ${location.environment}`);
  if (location.lore) parts.push(`Lore: ${location.lore}`);

  // Hidden info (if unlocked)
  if (location.unlocked && location.hidden) {
    if (location.hidden.fullDescription)
      parts.push(`Full Description: ${location.hidden.fullDescription}`);
    if (location.hidden.secrets?.length)
      parts.push(`Secrets: ${location.hidden.secrets.join(", ")}`);
  }

  return parts.join("\n");
}

function extractItemContent(item: InventoryItem): string {
  const parts: string[] = [];

  if (item.name) parts.push(`Name: ${item.name}`);

  if (item.visible) {
    if (item.visible.description)
      parts.push(`Description: ${item.visible.description}`);
    if (item.visible.notes) parts.push(`Notes: ${item.visible.notes}`);
  }

  if (item.lore) parts.push(`Lore: ${item.lore}`);

  // Hidden info (if unlocked)
  if (item.unlocked && item.hidden) {
    if (item.hidden.truth) parts.push(`True Nature: ${item.hidden.truth}`);
    if (item.hidden.secrets?.length)
      parts.push(`Secrets: ${item.hidden.secrets.join(", ")}`);
  }

  return parts.join("\n");
}

function extractKnowledgeContent(knowledge: KnowledgeEntry): string {
  const parts: string[] = [];

  if (knowledge.title) parts.push(`Topic: ${knowledge.title}`);
  if (knowledge.category) parts.push(`Category: ${knowledge.category}`);

  if (knowledge.visible) {
    if (knowledge.visible.description)
      parts.push(`Content: ${knowledge.visible.description}`);
    if (knowledge.visible.details)
      parts.push(`Details: ${knowledge.visible.details}`);
  }

  // Hidden info (if unlocked)
  if (knowledge.unlocked && knowledge.hidden) {
    if (knowledge.hidden.fullTruth)
      parts.push(`Full Truth: ${knowledge.hidden.fullTruth}`);
  }

  return parts.join("\n");
}

function extractQuestContent(quest: Quest): string {
  const parts: string[] = [];

  if (quest.title) parts.push(`Quest: ${quest.title}`);
  if (quest.status) parts.push(`Status: ${quest.status}`);
  if (quest.type) parts.push(`Type: ${quest.type}`);

  if (quest.visible) {
    if (quest.visible.description)
      parts.push(`Description: ${quest.visible.description}`);
    if (quest.visible.objectives?.length) {
      parts.push(`Objectives: ${quest.visible.objectives.join(", ")}`);
    }
  }

  // Hidden info (if unlocked)
  if (quest.unlocked && quest.hidden) {
    if (quest.hidden.trueDescription)
      parts.push(`True Purpose: ${quest.hidden.trueDescription}`);
    if (quest.hidden.trueObjectives?.length) {
      parts.push(`True Objectives: ${quest.hidden.trueObjectives.join(", ")}`);
    }
  }

  return parts.join("\n");
}

function extractEventContent(event: TimelineEvent): string {
  const parts: string[] = [];

  if (event.gameTime) parts.push(`Time: ${event.gameTime}`);
  if (event.category) parts.push(`Category: ${event.category}`);

  if (event.visible) {
    if (event.visible.description)
      parts.push(`Event: ${event.visible.description}`);
    if (event.visible.causedBy)
      parts.push(`Caused by: ${event.visible.causedBy}`);
  }

  if (event.involvedEntities?.length) {
    parts.push(`Involved: ${event.involvedEntities.join(", ")}`);
  }

  // Hidden info (if unlocked)
  if (event.unlocked && event.hidden) {
    if (event.hidden.trueDescription)
      parts.push(`Truth: ${event.hidden.trueDescription}`);
    if (event.hidden.trueCausedBy)
      parts.push(`True Cause: ${event.hidden.trueCausedBy}`);
  }

  return parts.join("\n");
}

/**
 * Extract content from StoryOutline for RAG indexing
 * Supports different outline aspects: world, goal, premise, character
 */
function extractOutlineContent(outline: StoryOutline, aspect: string): string {
  const parts: string[] = [];

  switch (aspect) {
    case "world": {
      parts.push(`Story: ${outline.title}`);
      if (outline.premise) parts.push(`Premise: ${outline.premise}`);
      if (outline.worldSetting?.visible?.description) {
        parts.push(`World: ${outline.worldSetting.visible.description}`);
      }
      if (outline.worldSetting?.visible?.rules) {
        parts.push(`Rules: ${outline.worldSetting.visible.rules}`);
      }
      // Hidden world setting (for GM knowledge)
      if (outline.worldSettingUnlocked && outline.worldSetting?.hidden) {
        if (outline.worldSetting.hidden.hiddenRules) {
          parts.push(`Hidden Rules: ${outline.worldSetting.hidden.hiddenRules}`);
        }
        if (outline.worldSetting.hidden.secrets?.length) {
          parts.push(`World Secrets: ${outline.worldSetting.hidden.secrets.join(", ")}`);
        }
      }
      break;
    }

    case "goal": {
      parts.push(`Story: ${outline.title}`);
      if (outline.mainGoal?.visible?.description) {
        parts.push(`Main Goal: ${outline.mainGoal.visible.description}`);
      }
      if (outline.mainGoal?.visible?.conditions) {
        parts.push(`Win Conditions: ${outline.mainGoal.visible.conditions}`);
      }
      // Hidden goal (for GM knowledge)
      if (outline.mainGoalUnlocked && outline.mainGoal?.hidden) {
        if (outline.mainGoal.hidden.trueDescription) {
          parts.push(`True Goal: ${outline.mainGoal.hidden.trueDescription}`);
        }
        if (outline.mainGoal.hidden.trueConditions) {
          parts.push(`True Conditions: ${outline.mainGoal.hidden.trueConditions}`);
        }
      }
      break;
    }

    case "premise": {
      parts.push(`Story: ${outline.title}`);
      if (outline.initialTime) parts.push(`Time: ${outline.initialTime}`);
      if (outline.premise) parts.push(`Premise: ${outline.premise}`);
      break;
    }

    case "character": {
      parts.push(`Story: ${outline.title}`);
      if (outline.character?.name) parts.push(`Name: ${outline.character.name}`);
      if (outline.character?.race) parts.push(`Race: ${outline.character.race}`);
      if (outline.character?.profession) parts.push(`Profession: ${outline.character.profession}`);
      if (outline.character?.background) parts.push(`Background: ${outline.character.background}`);
      if (outline.character?.appearance) parts.push(`Appearance: ${outline.character.appearance}`);
      break;
    }

    case "full":
    default: {
      // Full outline for comprehensive retrieval
      parts.push(`Story: ${outline.title}`);
      if (outline.initialTime) parts.push(`Time: ${outline.initialTime}`);
      if (outline.premise) parts.push(`Premise: ${outline.premise}`);
      if (outline.worldSetting?.visible?.description) {
        parts.push(`World: ${outline.worldSetting.visible.description}`);
      }
      if (outline.mainGoal?.visible?.description) {
        parts.push(`Main Goal: ${outline.mainGoal.visible.description}`);
      }
      if (outline.character?.name) {
        parts.push(`Protagonist: ${outline.character.name}, ${outline.character.race} ${outline.character.profession}`);
      }
      break;
    }
  }

  return parts.join("\n");
}

export default useRAG;
