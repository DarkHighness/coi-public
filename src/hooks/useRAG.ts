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
  Skill,
  Condition,
  HiddenTrait,
  CharacterAttribute,
  Faction,
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
  type GlobalStorageStats,
  type DocumentType,
  type RAGDocumentMeta,
} from "../services/rag";
import { getEmbeddingModels as getGeminiEmbeddingModels } from "../services/providers/geminiProvider";
import { getEmbeddingModels as getOpenAIEmbeddingModels } from "../services/providers/openaiProvider";
import { getEmbeddingModels as getOpenRouterEmbeddingModels } from "../services/providers/openRouterProvider";
import { getEmbeddingModels as getClaudeEmbeddingModels } from "../services/providers/claudeProvider";

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
  getRecentDocuments: (
    limit?: number,
    types?: DocumentType[],
  ) => Promise<RAGDocumentMeta[]>;
  getRAGContext: (query: string, state: GameState) => Promise<string>;
  handleModelMismatch: (
    action: "rebuild" | "disable" | "continue",
  ) => Promise<void>;
  handleStorageOverflow: (saveIdsToDelete: string[]) => Promise<void>;
  getAllSaveStats: () => Promise<GlobalStorageStats | null>;
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
            "[useRAG] Failed to fetch model info for context length:",
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

  const getRecentDocuments = useCallback(
    async (
      limit: number = 20,
      types?: DocumentType[],
    ): Promise<RAGDocumentMeta[]> => {
      const service = serviceRef.current;
      if (!service) {
        console.log("[useRAG] getRecentDocuments: Service not initialized");
        return [];
      }

      try {
        return await service.getRecentDocuments(limit, types);
      } catch (error) {
        console.error("[useRAG] getRecentDocuments failed:", error);
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
  // Stats
  // ============================================================================

  const getAllSaveStats =
    useCallback(async (): Promise<GlobalStorageStats | null> => {
      const service = serviceRef.current;
      if (!service) return null;

      try {
        return await service.getAllSaveStats();
      } catch (error) {
        console.error("[useRAG] Get all save stats failed:", error);
        return null;
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
      getRecentDocuments,
      getRAGContext,
      handleModelMismatch,
      handleStorageOverflow,
      getAllSaveStats,
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

      case "skill": {
        const skill = state.character?.skills?.find(
          (s) => s.id === entityId || s.name === id,
        );
        if (skill) {
          documents.push({
            entityId,
            type: "outline", // Using 'outline' type as skills are part of character
            content: extractSkillContent(skill),
            importance: 0.7,
            unlocked: skill.unlocked,
          });
        }
        break;
      }

      case "condition": {
        const condition = state.character?.conditions?.find(
          (c) => c.id === entityId || c.name === id,
        );
        if (condition) {
          documents.push({
            entityId,
            type: "outline", // Using 'outline' type as conditions are part of character
            content: extractConditionContent(condition),
            importance: 0.8,
            unlocked: condition.unlocked,
          });
        }
        break;
      }

      case "trait": {
        const trait = state.character?.hiddenTraits?.find(
          (t) => t.id === entityId || t.name === id,
        );
        if (trait) {
          documents.push({
            entityId,
            type: "outline", // Using 'outline' type as traits are part of character
            content: extractHiddenTraitContent(trait),
            importance: 0.9,
            unlocked: trait.unlocked,
          });
        }
        break;
      }

      case "attr":
      case "attribute": {
        const attr = state.character?.attributes?.find((a) => a.label === id);
        if (attr) {
          documents.push({
            entityId,
            type: "outline", // Using 'outline' type as attributes are part of character
            content: extractAttributeContent(attr),
            importance: 0.6,
          });
        }
        break;
      }

      case "fac":
      case "faction": {
        const faction = state.factions?.find((f) => f.id === entityId);
        if (faction) {
          documents.push({
            entityId,
            type: "outline", // Using 'outline' type as factions are world-level entities
            content: extractFactionContent(faction),
            importance: 0.8,
            unlocked: faction.unlocked,
          });
        }
        break;
      }
    }
  }

  return documents;
}

function extractStoryContent(node: StorySegment): string {
  const parts: string[] = [];
  const turn = node.stateSnapshot?.turnNumber || "Unknown";

  parts.push(`<segment id="${node.id}" turn="${turn}">`);

  if (node.role === "user") {
    parts.push(`  <player_action>\n    ${node.text}\n  </player_action>`);
  } else {
    parts.push(`  <narrative>\n    ${node.text}\n  </narrative>`);
  }

  // Contextual Info
  if (node.stateSnapshot) {
    parts.push("  <context>");
    if (node.stateSnapshot.currentLocation) {
      parts.push(
        `    <location>${node.stateSnapshot.currentLocation}</location>`,
      );
    }
    if (node.stateSnapshot.time) {
      parts.push(`    <time>${JSON.stringify(node.stateSnapshot.time)}</time>`);
    }
    if (node.atmosphere) {
      parts.push(
        `    <atmosphere>${JSON.stringify(node.atmosphere)}</atmosphere>`,
      );
    }
    parts.push("  </context>");
  }

  parts.push("</segment>");
  return parts.join("\n");
}

function extractNPCContent(npc: Relationship): string {
  const parts: string[] = [];
  parts.push(`<npc id="${npc.id}">`);

  // Icon
  if (npc.icon) parts.push(`  <icon>${npc.icon}</icon>`);

  // Visible info
  if (npc.visible) {
    parts.push("  <visible>");
    if (npc.visible.name) parts.push(`    <name>${npc.visible.name}</name>`);
    if (npc.visible.description)
      parts.push(`    <description>${npc.visible.description}</description>`);
    if (npc.visible.appearance)
      parts.push(`    <appearance>${npc.visible.appearance}</appearance>`);
    if (npc.visible.relationshipType)
      parts.push(
        `    <relation_type>${npc.visible.relationshipType}</relation_type>`,
      );
    if (npc.visible.personality)
      parts.push(`    <personality>${npc.visible.personality}</personality>`);
    if (npc.visible.dialogueStyle)
      parts.push(
        `    <dialogue_style>${npc.visible.dialogueStyle}</dialogue_style>`,
      );
    if (npc.visible.impression)
      parts.push(
        `    <protagonist_impression>${npc.visible.impression}</protagonist_impression>`,
      );
    if (npc.visible.status)
      parts.push(
        `    <perceived_status>${npc.visible.status}</perceived_status>`,
      );
    if (npc.notes) parts.push(`    <player_notes>${npc.notes}</player_notes>`);
    parts.push("  </visible>");
  }

  // Location info
  if (npc.currentLocation)
    parts.push(`  <current_location>${npc.currentLocation}</current_location>`);

  // Hidden info (Always visible to AI/GM)
  if (npc.hidden) {
    parts.push('  <hidden status="unlocked">');
    if (npc.hidden.realPersonality)
      parts.push(
        `    <true_personality>${npc.hidden.realPersonality}</true_personality>`,
      );
    if (npc.hidden.realMotives)
      parts.push(`    <true_motives>${npc.hidden.realMotives}</true_motives>`);
    if (npc.hidden.routine)
      parts.push(`    <routine>${npc.hidden.routine}</routine>`);
    if (npc.hidden.secrets?.length)
      parts.push(`    <secrets>${npc.hidden.secrets.join("; ")}</secrets>`);
    if (npc.hidden.impression)
      parts.push(
        `    <npc_impression_of_protagonist>${npc.hidden.impression}</npc_impression_of_protagonist>`,
      );
    if (npc.hidden.status)
      parts.push(`    <actual_status>${npc.hidden.status}</actual_status>`);
    parts.push("  </hidden>");
  }

  parts.push("</npc>");
  return parts.join("\n");
}

function extractLocationContent(location: Location): string {
  const parts: string[] = [];
  parts.push(`<location id="${location.id}">`);

  if (location.name) parts.push(`  <name>${location.name}</name>`);
  if (location.icon) parts.push(`  <icon>${location.icon}</icon>`);

  if (location.visible) {
    parts.push("  <visible>");
    if (location.visible.description)
      parts.push(
        `    <description>${location.visible.description}</description>`,
      );
    if (location.visible.knownFeatures?.length) {
      parts.push(
        `    <features>${location.visible.knownFeatures.join("; ")}</features>`,
      );
    }
    if (location.visible.resources?.length)
      parts.push(
        `    <resources>${location.visible.resources.join("; ")}</resources>`,
      );
    parts.push("  </visible>");
  }

  if (location.environment)
    parts.push(`  <environment>${location.environment}</environment>`);
  if (location.lore) parts.push(`  <lore>${location.lore}</lore>`);

  // Hidden info (Always visible to AI/GM)
  if (location.hidden) {
    parts.push('  <hidden status="unlocked">');
    if (location.hidden.fullDescription)
      parts.push(
        `    <true_description>${location.hidden.fullDescription}</true_description>`,
      );
    if (location.hidden.hiddenFeatures?.length)
      parts.push(
        `    <hidden_features>${location.hidden.hiddenFeatures.join("; ")}</hidden_features>`,
      );
    if (location.hidden.dangers?.length)
      parts.push(
        `    <dangers>${location.hidden.dangers.join("; ")}</dangers>`,
      );
    if (location.hidden.secrets?.length)
      parts.push(
        `    <secrets>${location.hidden.secrets.join("; ")}</secrets>`,
      );
    parts.push("  </hidden>");
  }

  parts.push("</location>");
  return parts.join("\n");
}

function extractItemContent(item: InventoryItem): string {
  const parts: string[] = [];
  parts.push(`<item id="${item.id}">`);

  if (item.name) parts.push(`  <name>${item.name}</name>`);
  if (item.icon) parts.push(`  <icon>${item.icon}</icon>`);

  if (item.visible) {
    parts.push("  <visible>");
    if (item.visible.description)
      parts.push(`    <description>${item.visible.description}</description>`);
    if (item.visible.usage)
      parts.push(`    <usage>${item.visible.usage}</usage>`);
    if (item.visible.notes)
      parts.push(`    <notes>${item.visible.notes}</notes>`);
    parts.push("  </visible>");
  }

  if (item.lore) parts.push(`  <lore>${item.lore}</lore>`);

  // Hidden info (Always visible to AI/GM)
  if (item.hidden) {
    parts.push('  <hidden status="unlocked">');
    if (item.hidden.truth)
      parts.push(`    <truth>${item.hidden.truth}</truth>`);
    if (item.hidden.secrets?.length)
      parts.push(`    <secrets>${item.hidden.secrets.join("; ")}</secrets>`);
    parts.push("  </hidden>");
  }

  parts.push("</item>");
  return parts.join("\n");
}

function extractKnowledgeContent(knowledge: KnowledgeEntry): string {
  const parts: string[] = [];
  parts.push(`<knowledge id="${knowledge.id}">`);

  if (knowledge.title) parts.push(`  <topic>${knowledge.title}</topic>`);
  if (knowledge.category)
    parts.push(`  <category>${knowledge.category}</category>`);
  if (knowledge.icon) parts.push(`  <icon>${knowledge.icon}</icon>`);

  if (knowledge.visible) {
    parts.push("  <visible>");
    if (knowledge.visible.description)
      parts.push(
        `    <description>${knowledge.visible.description}</description>`,
      );
    if (knowledge.visible.details)
      parts.push(`    <content>${knowledge.visible.details}</content>`);
    parts.push("  </visible>");
  }

  // Hidden info (Always visible to AI/GM)
  if (knowledge.hidden) {
    parts.push('  <hidden status="unlocked">');
    if (knowledge.hidden.fullTruth)
      parts.push(`    <truth>${knowledge.hidden.fullTruth}</truth>`);
    if (knowledge.hidden.misconceptions?.length)
      parts.push(
        `    <misconceptions>${knowledge.hidden.misconceptions.join("; ")}</misconceptions>`,
      );
    if (knowledge.hidden.toBeRevealed?.length)
      parts.push(
        `    <implications>${knowledge.hidden.toBeRevealed.join("; ")}</implications>`,
      );
    parts.push("  </hidden>");
  }

  parts.push("</knowledge>");
  return parts.join("\n");
}

function extractQuestContent(quest: Quest): string {
  const parts: string[] = [];
  parts.push(`<quest id="${quest.id}" status="${quest.status}">`);

  if (quest.title) parts.push(`  <title>${quest.title}</title>`);
  if (quest.type) parts.push(`  <type>${quest.type}</type>`);
  if (quest.icon) parts.push(`  <icon>${quest.icon}</icon>`);

  if (quest.visible) {
    parts.push("  <visible>");
    if (quest.visible.description)
      parts.push(`    <description>${quest.visible.description}</description>`);
    if (quest.visible.objectives?.length)
      parts.push(
        `    <objectives>${quest.visible.objectives.join("; ")}</objectives>`,
      );
    parts.push("  </visible>");
  }

  // Hidden info (Always visible to AI/GM)
  if (quest.hidden) {
    parts.push('  <hidden status="unlocked">');
    if (quest.hidden.trueDescription)
      parts.push(
        `    <true_description>${quest.hidden.trueDescription}</true_description>`,
      );
    if (quest.hidden.trueObjectives?.length)
      parts.push(
        `    <true_objectives>${quest.hidden.trueObjectives.join("; ")}</true_objectives>`,
      );
    if (quest.hidden.secretOutcome)
      parts.push(
        `    <secret_outcome>${quest.hidden.secretOutcome}</secret_outcome>`,
      );
    parts.push("  </hidden>");
  }

  parts.push("</quest>");
  return parts.join("\n");
}

function extractEventContent(event: TimelineEvent): string {
  const parts: string[] = [];
  parts.push(`<event id="${event.id}">`);

  if (event.gameTime) parts.push(`  <time>${event.gameTime}</time>`);
  if (event.category) parts.push(`  <category>${event.category}</category>`);
  if (event.icon) parts.push(`  <icon>${event.icon}</icon>`);
  if (event.involvedEntities?.length)
    parts.push(
      `  <involved_entities>${event.involvedEntities.join(", ")}</involved_entities>`,
    );
  if (event.chainId) parts.push(`  <chain_id>${event.chainId}</chain_id>`);

  if (event.visible) {
    parts.push("  <visible>");
    if (event.visible.description)
      parts.push(`    <description>${event.visible.description}</description>`);
    if (event.visible.causedBy)
      parts.push(`    <caused_by>${event.visible.causedBy}</caused_by>`);
    parts.push("  </visible>");
  }

  // Hidden info (Always visible to AI/GM)
  if (event.hidden) {
    parts.push('  <hidden status="unlocked">');
    if (event.hidden.trueDescription)
      parts.push(
        `    <true_description>${event.hidden.trueDescription}</true_description>`,
      );
    if (event.hidden.trueCausedBy)
      parts.push(`    <true_cause>${event.hidden.trueCausedBy}</true_cause>`);
    if (event.hidden.consequences)
      parts.push(
        `    <consequences>${event.hidden.consequences}</consequences>`,
      );
    parts.push("  </hidden>");
  }

  parts.push("</event>");
  return parts.join("\n");
}

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
          parts.push(
            `Hidden Rules: ${outline.worldSetting.hidden.hiddenRules}`,
          );
        }
        if (outline.worldSetting.hidden.secrets?.length) {
          parts.push(
            `World Secrets: ${outline.worldSetting.hidden.secrets.join(", ")}`,
          );
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
          parts.push(
            `True Conditions: ${outline.mainGoal.hidden.trueConditions}`,
          );
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
      if (outline.character?.name)
        parts.push(`Name: ${outline.character.name}`);
      if (outline.character?.race)
        parts.push(`Race: ${outline.character.race}`);
      if (outline.character?.profession)
        parts.push(`Profession: ${outline.character.profession}`);
      if (outline.character?.background)
        parts.push(`Background: ${outline.character.background}`);
      if (outline.character?.appearance)
        parts.push(`Appearance: ${outline.character.appearance}`);
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
        parts.push(
          `Protagonist: ${outline.character.name}, ${outline.character.race} ${outline.character.profession}`,
        );
      }
      break;
    }
  }

  return parts.join("\n");
}

function extractSkillContent(skill: Skill): string {
  const parts: string[] = [];
  const id = skill.id || skill.name;
  parts.push(`<skill id="${id}">`);

  if (skill.name) parts.push(`  <name>${skill.name}</name>`);
  if (skill.level) parts.push(`  <level>${skill.level}</level>`);
  if (skill.category) parts.push(`  <category>${skill.category}</category>`);
  if (skill.icon) parts.push(`  <icon>${skill.icon}</icon>`);

  if (skill.visible) {
    parts.push("  <visible>");
    if (skill.visible.description)
      parts.push(`    <description>${skill.visible.description}</description>`);
    parts.push("  </visible>");
  }

  // Hidden info (Always visible to AI/GM)
  if (skill.hidden) {
    parts.push('  <hidden status="unlocked">');
    if (skill.hidden.trueDescription)
      parts.push(
        `    <true_description>${skill.hidden.trueDescription}</true_description>`,
      );
    if (skill.hidden.hiddenEffects?.length)
      parts.push(
        `    <hidden_effects>${skill.hidden.hiddenEffects.join("; ")}</hidden_effects>`,
      );
    if (skill.hidden.drawbacks?.length)
      parts.push(
        `    <drawbacks>${skill.hidden.drawbacks.join("; ")}</drawbacks>`,
      );
    parts.push("  </hidden>");
  }

  parts.push("</skill>");
  return parts.join("\n");
}

function extractConditionContent(condition: Condition): string {
  const parts: string[] = [];
  const id = condition.id || condition.name;
  parts.push(`<condition id="${id}" type="${condition.type}">`);

  if (condition.name) parts.push(`  <name>${condition.name}</name>`);
  if (condition.icon) parts.push(`  <icon>${condition.icon}</icon>`);
  if (condition.severity)
    parts.push(`  <severity>${condition.severity}</severity>`);
  if (condition.startTime)
    parts.push(`  <start_time>${condition.startTime}</start_time>`);

  if (condition.visible) {
    parts.push("  <visible>");
    if (condition.visible.description)
      parts.push(
        `    <description>${condition.visible.description}</description>`,
      );
    if (condition.visible.perceivedSeverity)
      parts.push(
        `    <perceived_severity>${condition.visible.perceivedSeverity}</perceived_severity>`,
      );
    parts.push("  </visible>");
  }

  // Visible effects
  if (condition.effects?.visible?.length) {
    parts.push(
      `  <visible_effects>${condition.effects.visible.join("; ")}</visible_effects>`,
    );
  }

  // Hidden info (Always visible to AI/GM)
  if (condition.hidden) {
    parts.push('  <hidden status="unlocked">');
    if (condition.hidden.trueCause)
      parts.push(`    <true_cause>${condition.hidden.trueCause}</true_cause>`);
    if (condition.hidden.actualSeverity)
      parts.push(
        `    <actual_severity>${condition.hidden.actualSeverity}</actual_severity>`,
      );
    if (condition.hidden.progression)
      parts.push(
        `    <progression>${condition.hidden.progression}</progression>`,
      );
    if (condition.hidden.cure)
      parts.push(`    <cure>${condition.hidden.cure}</cure>`);
    parts.push("  </hidden>");
  }

  // Hidden effects
  if (condition.effects?.hidden?.length) {
    parts.push(
      `  <hidden_effects>${condition.effects.hidden.join("; ")}</hidden_effects>`,
    );
  }

  parts.push("</condition>");
  return parts.join("\n");
}

function extractHiddenTraitContent(trait: HiddenTrait): string {
  const parts: string[] = [];
  const id = trait.id || trait.name;
  parts.push(`<hidden_trait id="${id}" unlocked="${trait.unlocked}">`);

  if (trait.name) parts.push(`  <name>${trait.name}</name>`);
  if (trait.icon) parts.push(`  <icon>${trait.icon}</icon>`);
  if (trait.description)
    parts.push(`  <description>${trait.description}</description>`);

  if (trait.effects?.length)
    parts.push(`  <effects>${trait.effects.join("; ")}</effects>`);

  if (trait.triggerConditions?.length)
    parts.push(
      `  <trigger_conditions>${trait.triggerConditions.join("; ")}</trigger_conditions>`,
    );

  parts.push("</hidden_trait>");
  return parts.join("\n");
}

function extractAttributeContent(attr: CharacterAttribute): string {
  const parts: string[] = [];
  parts.push(`<attribute label="${attr.label}">`);

  if (attr.icon) parts.push(`  <icon>${attr.icon}</icon>`);
  parts.push(`  <value>${attr.value}</value>`);
  parts.push(`  <max_value>${attr.maxValue}</max_value>`);
  if (attr.color) parts.push(`  <color>${attr.color}</color>`);

  parts.push("</attribute>");
  return parts.join("\n");
}

function extractFactionContent(faction: Faction): string {
  const parts: string[] = [];
  parts.push(`<faction id="${faction.id}">`);

  if (faction.name) parts.push(`  <name>${faction.name}</name>`);
  if (faction.icon) parts.push(`  <icon>${faction.icon}</icon>`);

  // Visible info
  if (faction.visible) {
    parts.push("  <visible>");
    if (faction.visible.agenda)
      parts.push(`    <agenda>${faction.visible.agenda}</agenda>`);
    if (faction.visible.influence)
      parts.push(`    <influence>${faction.visible.influence}</influence>`);
    if (faction.visible.members?.length) {
      const memberStrs = faction.visible.members.map(
        (m) => `${m.name}${m.title ? ` (${m.title})` : ""}`,
      );
      parts.push(`    <members>${memberStrs.join("; ")}</members>`);
    }
    if (faction.visible.relations?.length) {
      const relStrs = faction.visible.relations.map(
        (r) => `${r.target}: ${r.status}`,
      );
      parts.push(`    <relations>${relStrs.join("; ")}</relations>`);
    }
    parts.push("  </visible>");
  }

  // Hidden info (Always visible to AI/GM)
  if (faction.hidden) {
    parts.push('  <hidden status="unlocked">');
    if (faction.hidden.agenda)
      parts.push(`    <secret_agenda>${faction.hidden.agenda}</secret_agenda>`);
    if (faction.hidden.influence)
      parts.push(
        `    <true_influence>${faction.hidden.influence}</true_influence>`,
      );
    if (faction.hidden.members?.length) {
      const memberStrs = faction.hidden.members.map(
        (m) => `${m.name}${m.title ? ` (${m.title})` : ""}`,
      );
      parts.push(
        `    <secret_members>${memberStrs.join("; ")}</secret_members>`,
      );
    }
    if (faction.hidden.relations?.length) {
      const relStrs = faction.hidden.relations.map(
        (r) => `${r.target}: ${r.status}`,
      );
      parts.push(
        `    <secret_relations>${relStrs.join("; ")}</secret_relations>`,
      );
    }
    parts.push("  </hidden>");
  }

  parts.push("</faction>");
  return parts.join("\n");
}

export default useRAG;
