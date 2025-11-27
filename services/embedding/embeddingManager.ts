/**
 * Embedding Manager
 * Orchestrates embedding generation for game content and provides RAG context retrieval
 * Includes LRU-based document eviction to manage storage within limits
 */

import type {
  GameState,
  EmbeddingConfig,
  EmbeddingDocument,
  EmbeddingIndex,
  StorySegment,
  Relationship,
  InventoryItem,
  Location,
  KnowledgeEntry,
  Quest,
  TimelineEvent,
  Faction,
  AISettings,
  ForkTree,
} from "../../types";
import { EmbeddingService, createEmbeddingIndex } from "./embeddingService";
import { SimilaritySearchManager, type SearchResult } from "./similaritySearch";
import { getAncestorForkIds } from "../../utils/snapshotManager";

// ============================================================================
// LRU Configuration Defaults
// ============================================================================

/**
 * LRU Eviction Strategy:
 *
 * 1. Per-entity limit: Keep only N versions per unique entity ID (e.g., item:1)
 *    - This prevents a single entity from bloating the index across forks
 *    - Default: 5 versions per entity
 *
 * 2. Per-type limit: Maximum documents of each type (story, npc, location, etc.)
 *    - Default: 1000 documents per type
 *
 * 3. Global limit: Maximum total documents across all types
 *    - Default: 5000 documents total
 *
 * Priority calculation per entity version:
 * - Current fork > Ancestor forks > Other forks
 * - More recent turns > Older turns
 * - Outline documents are always preserved (critical for world context)
 */

const LRU_DEFAULTS = {
  maxTotalDocuments: 5000,
  maxDocumentsPerType: 1000,
  maxVersionsPerEntity: 5,
  currentForkBonus: 0.5,
  ancestorForkBonus: 0.25,
  turnDecayFactor: 0.01,
};

// Type importance multipliers (for breaking ties)
const TYPE_IMPORTANCE: Record<EmbeddingDocument["type"], number> = {
  outline: 10.0,  // Never evict outlines
  story: 1.0,
  npc: 0.9,
  quest: 0.9,
  knowledge: 0.85,
  location: 0.8,
  item: 0.8,
  event: 0.7,
};

// ============================================================================
// Types
// ============================================================================

export interface EmbeddingManagerConfig {
  settings: AISettings;
  onProgress?: (progress: EmbeddingProgress) => void;
}

export interface EmbeddingProgress {
  phase: "extracting" | "embedding" | "indexing" | "complete" | "evicting";
  current: number;
  total: number;
  message?: string;
}

export interface RAGContext {
  storyContext: string[];
  npcContext: string[];
  locationContext: string[];
  itemContext: string[];
  knowledgeContext: string[];
  questContext: string[];
  eventContext: string[];
  // Combined context for AI prompt
  combinedContext: string;
}

// Entity extractor function type
type EntityExtractor = (state: GameState) => Array<{
  id: string;
  type: EmbeddingDocument["type"];
  content: string;
  metadata?: EmbeddingDocument["metadata"];
}>;

// ============================================================================
// Content Extractors
// ============================================================================

/**
 * Extract embeddable content from story segments
 */
function extractStoryContent(state: GameState): Array<{
  id: string;
  type: EmbeddingDocument["type"];
  content: string;
  metadata?: EmbeddingDocument["metadata"];
}> {
  const entities: Array<{
    id: string;
    type: EmbeddingDocument["type"];
    content: string;
    metadata?: EmbeddingDocument["metadata"];
  }> = [];

  for (const [nodeId, segment] of Object.entries(state.nodes)) {
    // Combine segment text with choices for richer context
    let content = segment.text;
    if (segment.choices && segment.choices.length > 0) {
      content += `\n\nPlayer choices: ${segment.choices.join(", ")}`;
    }

    entities.push({
      id: `story:${nodeId}`,
      type: "story",
      content,
      metadata: {
        timestamp: segment.timestamp,
        importance: calculateStoryImportance(segment),
      },
    });
  }

  return entities;
}

/**
 * Calculate importance score for a story segment
 */
function calculateStoryImportance(segment: StorySegment): number {
  let importance = 0.5; // Base importance

  // Higher importance for segments with images (usually significant moments)
  if (segment.imageUrl) importance += 0.2;

  // Higher importance for segments with many choices
  if (segment.choices && segment.choices.length > 3) importance += 0.1;

  // Higher importance for endings
  if (segment.ending) importance += 0.3;

  // Higher importance for summaries
  if (segment.summarySnapshot) importance += 0.2;

  return Math.min(importance, 1.0);
}

/**
 * Extract embeddable content from NPCs (relationships)
 * NOTE: Hidden info is ALWAYS included for RAG - AI needs complete world knowledge
 * The [AI_ONLY] marker indicates this info is not visible to players
 */
function extractNPCContent(state: GameState): Array<{
  id: string;
  type: EmbeddingDocument["type"];
  content: string;
  metadata?: EmbeddingDocument["metadata"];
}> {
  return state.relationships.map((npc) => {
    const parts: string[] = [];

    // === VISIBLE INFO ===
    parts.push(`Name: ${npc.visible.name}`);
    parts.push(`Description: ${npc.visible.description}`);
    if (npc.visible.appearance)
      parts.push(`Appearance: ${npc.visible.appearance}`);
    parts.push(`Relationship: ${npc.visible.relationshipType}`);
    if (npc.visible.personality)
      parts.push(`Personality: ${npc.visible.personality}`);
    if (npc.visible.currentImpression)
      parts.push(`Impression: ${npc.visible.currentImpression}`);
    parts.push(`Affinity: ${npc.visible.affinity}`);

    // === HIDDEN INFO (Always included for AI to maintain world consistency) ===
    // Mark as [AI_ONLY] so AI knows this is secret information
    parts.push(`--- [AI_ONLY: Hidden Truth] ---`);
    if (npc.hidden.trueName)
      parts.push(`[AI_ONLY] True name: ${npc.hidden.trueName}`);
    parts.push(`[AI_ONLY] Real personality: ${npc.hidden.realPersonality}`);
    if (npc.hidden.secrets?.length)
      parts.push(`[AI_ONLY] Secrets: ${npc.hidden.secrets.join(", ")}`);
    if (npc.hidden.realMotives)
      parts.push(`[AI_ONLY] Real motives: ${npc.hidden.realMotives}`);
    parts.push(`[AI_ONLY] True affinity: ${npc.hidden.trueAffinity}`);
    parts.push(`[AI_ONLY] Status: ${npc.hidden.status}`);
    parts.push(`[AI_ONLY] Unlocked to player: ${npc.unlocked ? "yes" : "no"}`);

    return {
      id: `npc:${npc.id}`,
      type: "npc" as const,
      content: parts.join("\n"),
      metadata: {
        importance: 0.6,
        unlocked: npc.unlocked,
      },
    };
  });
}

/**
 * Extract embeddable content from locations
 * NOTE: Hidden info is ALWAYS included for RAG
 */
function extractLocationContent(state: GameState): Array<{
  id: string;
  type: EmbeddingDocument["type"];
  content: string;
  metadata?: EmbeddingDocument["metadata"];
}> {
  return state.locations.map((loc) => {
    const parts: string[] = [];

    // === VISIBLE INFO ===
    parts.push(`Location: ${loc.name}`);
    parts.push(`Description: ${loc.visible.description}`);
    if (loc.visible.knownFeatures?.length)
      parts.push(`Known features: ${loc.visible.knownFeatures.join(", ")}`);
    if (loc.environment) parts.push(`Environment: ${loc.environment}`);
    if (loc.lore) parts.push(`Lore: ${loc.lore}`);

    // === HIDDEN INFO ===
    parts.push(`--- [AI_ONLY: Hidden Truth] ---`);
    if (loc.hidden && loc.hidden.fullDescription)
      parts.push(`[AI_ONLY] Full description: ${loc.hidden.fullDescription}`);
    if (loc.hidden && loc.hidden.hiddenFeatures && loc.hidden.hiddenFeatures.length)
      parts.push(
        `[AI_ONLY] Hidden features: ${loc.hidden.hiddenFeatures.join(", ")}`,
      );
    if (loc.hidden && loc.hidden.secrets && loc.hidden.secrets.length)
      parts.push(`[AI_ONLY] Secrets: ${loc.hidden.secrets.join(", ")}`);
    parts.push(`[AI_ONLY] Unlocked to player: ${loc.unlocked ? "yes" : "no"}`);
    parts.push(`[AI_ONLY] Visited: ${loc.isVisited ? "yes" : "no"}`);

    return {
      id: `location:${loc.id}`,
      type: "location" as const,
      content: parts.join("\n"),
      metadata: {
        importance:
          loc.id === state.currentLocation ? 0.9 : loc.isVisited ? 0.6 : 0.4,
        unlocked: loc.unlocked,
      },
    };
  });
}

/**
 * Extract embeddable content from inventory items
 * NOTE: Hidden info is ALWAYS included for RAG
 */
function extractItemContent(state: GameState): Array<{
  id: string;
  type: EmbeddingDocument["type"];
  content: string;
  metadata?: EmbeddingDocument["metadata"];
}> {
  return state.inventory.map((item) => {
    const parts: string[] = [];

    // === VISIBLE INFO ===
    parts.push(`Item: ${item.name}`);
    parts.push(`Description: ${item.visible.description}`);
    if (item.visible.notes) parts.push(`Notes: ${item.visible.notes}`);
    if (item.lore) parts.push(`Lore: ${item.lore}`);

    // === HIDDEN INFO ===
    parts.push(`--- [AI_ONLY: Hidden Truth] ---`);
    parts.push(`[AI_ONLY] Truth: ${item.hidden.truth}`);
    if (item.hidden.secrets?.length)
      parts.push(`[AI_ONLY] Secrets: ${item.hidden.secrets.join(", ")}`);
    parts.push(`[AI_ONLY] Unlocked to player: ${item.unlocked ? "yes" : "no"}`);

    return {
      id: `item:${item.id}`,
      type: "item" as const,
      content: parts.join("\n"),
      metadata: {
        importance: 0.5,
        unlocked: item.unlocked,
      },
    };
  });
}

/**
 * Extract embeddable content from knowledge entries
 * NOTE: Hidden info is ALWAYS included for RAG
 */
function extractKnowledgeContent(state: GameState): Array<{
  id: string;
  type: EmbeddingDocument["type"];
  content: string;
  metadata?: EmbeddingDocument["metadata"];
}> {
  return state.knowledge.map((entry) => {
    const parts: string[] = [];

    // === VISIBLE INFO ===
    parts.push(`Knowledge: ${entry.title}`);
    parts.push(`Category: ${entry.category}`);
    parts.push(`Description: ${entry.visible.description}`);
    if (entry.visible.details) parts.push(`Details: ${entry.visible.details}`);
    if (entry.relatedTo?.length)
      parts.push(`Related to: ${entry.relatedTo.join(", ")}`);

    // === HIDDEN INFO ===
    parts.push(`--- [AI_ONLY: Hidden Truth] ---`);
    parts.push(`[AI_ONLY] Full truth: ${entry.hidden.fullTruth}`);
    if (entry.hidden.misconceptions?.length)
      parts.push(
        `[AI_ONLY] Misconceptions: ${entry.hidden.misconceptions.join(", ")}`,
      );
    if (entry.hidden.toBeRevealed?.length)
      parts.push(
        `[AI_ONLY] To be revealed: ${entry.hidden.toBeRevealed.join(", ")}`,
      );
    parts.push(
      `[AI_ONLY] Unlocked to player: ${entry.unlocked ? "yes" : "no"}`,
    );

    return {
      id: `knowledge:${entry.id}`,
      type: "knowledge" as const,
      content: parts.join("\n"),
      metadata: {
        importance: 0.6,
        unlocked: entry.unlocked,
      },
    };
  });
}

/**
 * Extract embeddable content from quests
 * NOTE: Hidden info is ALWAYS included for RAG
 */
function extractQuestContent(state: GameState): Array<{
  id: string;
  type: EmbeddingDocument["type"];
  content: string;
  metadata?: EmbeddingDocument["metadata"];
}> {
  return state.quests.map((quest) => {
    const parts: string[] = [];

    // === VISIBLE INFO ===
    parts.push(`Quest: ${quest.title}`);
    parts.push(`Type: ${quest.type}`);
    parts.push(`Status: ${quest.status}`);
    parts.push(`Description: ${quest.visible.description}`);
    if (quest.visible.objectives?.length)
      parts.push(`Objectives: ${quest.visible.objectives.join(", ")}`);

    // === HIDDEN INFO ===
    parts.push(`--- [AI_ONLY: Hidden Truth] ---`);
    if (quest.hidden.trueDescription)
      parts.push(`[AI_ONLY] True description: ${quest.hidden.trueDescription}`);
    if (quest.hidden.trueObjectives?.length)
      parts.push(
        `[AI_ONLY] True objectives: ${quest.hidden.trueObjectives.join(", ")}`,
      );
    if (quest.hidden.secretOutcome)
      parts.push(`[AI_ONLY] Secret outcome: ${quest.hidden.secretOutcome}`);
    parts.push(
      `[AI_ONLY] Unlocked to player: ${quest.unlocked ? "yes" : "no"}`,
    );

    return {
      id: `quest:${quest.id}`,
      type: "quest" as const,
      content: parts.join("\n"),
      metadata: {
        importance:
          quest.status === "active"
            ? 0.9
            : quest.status === "completed"
              ? 0.5
              : 0.3,
        unlocked: quest.unlocked,
      },
    };
  });
}

/**
 * Extract embeddable content from timeline events
 * NOTE: Hidden info is ALWAYS included for RAG
 */
function extractEventContent(state: GameState): Array<{
  id: string;
  type: EmbeddingDocument["type"];
  content: string;
  metadata?: EmbeddingDocument["metadata"];
}> {
  return state.timeline.map((event) => {
    const parts: string[] = [];

    // === VISIBLE INFO ===
    parts.push(`Event at ${event.gameTime}`);
    parts.push(`Category: ${event.category}`);
    parts.push(`Description: ${event.visible.description}`);
    if (event.visible.causedBy)
      parts.push(`Caused by: ${event.visible.causedBy}`);
    if (event.involvedEntities?.length)
      parts.push(`Involved: ${event.involvedEntities.join(", ")}`);

    // === HIDDEN INFO ===
    parts.push(`--- [AI_ONLY: Hidden Truth] ---`);
    parts.push(`[AI_ONLY] True description: ${event.hidden.trueDescription}`);
    if (event.hidden.trueCausedBy)
      parts.push(`[AI_ONLY] True cause: ${event.hidden.trueCausedBy}`);
    if (event.hidden.consequences?.length)
      parts.push(
        `[AI_ONLY] Consequences: ${event.hidden.consequences.join(", ")}`,
      );
    parts.push(`[AI_ONLY] Known to player: ${event.known ? "yes" : "no"}`);
    parts.push(`[AI_ONLY] Unlocked: ${event.unlocked ? "yes" : "no"}`);

    return {
      id: `event:${event.id}`,
      type: "event" as const,
      content: parts.join("\n"),
      metadata: {
        turnNumber: event.lastAccess,
        importance: event.known ? 0.7 : 0.4,
        unlocked: event.unlocked,
      },
    };
  });
}

/**
 * Extract embeddable content from story outline
 * This includes world setting, main goal, character background, etc.
 * All outline info is essential for AI context but presented as [AI_ONLY]
 */
function extractOutlineContent(state: GameState): Array<{
  id: string;
  type: EmbeddingDocument["type"];
  content: string;
  metadata?: EmbeddingDocument["metadata"];
}> {
  if (!state.outline) return [];

  const outline = state.outline;
  const entities: Array<{
    id: string;
    type: EmbeddingDocument["type"];
    content: string;
    metadata?: EmbeddingDocument["metadata"];
  }> = [];

  // World Setting - critical context for all AI decisions
  const worldParts: string[] = [
    `=== WORLD SETTING ===`,
    `Title: ${outline.title}`,
    `Initial Time: ${outline.initialTime}`,
    `Premise: ${outline.premise}`,
    ``,
    `--- World Details (Visible) ---`,
    outline.worldSetting.visible,
    ``,
    `[AI_ONLY] --- World Details (Hidden) ---`,
    `[AI_ONLY] ${outline.worldSetting.hidden}`,
    ``,
    `[AI_ONLY] --- World History ---`,
    `[AI_ONLY] ${outline.worldSetting.history}`,
  ];

  entities.push({
    id: `outline:world`,
    type: "outline" as EmbeddingDocument["type"],
    content: worldParts.join("\n"),
    metadata: { importance: 1.0, turnNumber: 0 },
  });

  // Main Goal - drives the narrative
  const goalParts: string[] = [
    `=== MAIN GOAL ===`,
    `Visible Goal: ${outline.mainGoal.visible}`,
    `[AI_ONLY] Hidden Truth: ${outline.mainGoal.hidden}`,
  ];

  entities.push({
    id: `outline:goal`,
    type: "outline" as EmbeddingDocument["type"],
    content: goalParts.join("\n"),
    metadata: { importance: 1.0, turnNumber: 0 },
  });

  // Character Background - defines protagonist
  // Note: outline.character is CharacterStatus type
  const char = outline.character;
  const charParts: string[] = [
    `=== PROTAGONIST ===`,
    `Name: ${char.name}`,
    `Title: ${char.title || "None"}`,
    `Status: ${char.status || "Unknown"}`,
    `Appearance: ${char.appearance || "Unknown"}`,
    `Profession: ${char.profession || "Unknown"}`,
    `Background: ${char.background || "Unknown"}`,
    `Race: ${char.race || "Unknown"}`,
    ``,
    `--- Attributes ---`,
    ...(char.attributes || []).map(attr => `${attr.label}: ${attr.value}/${attr.maxValue}`),
    ``,
    `--- Skills ---`,
    ...(char.skills || []).map(skill =>
      `${skill.name} (${skill.level}): ${skill.visible.description}` +
      (skill.hidden ? `\n[AI_ONLY] True: ${skill.hidden.trueDescription}` : "")
    ),
    ``,
    `--- Hidden Traits ---`,
    ...(char.hiddenTraits || []).map(trait =>
      `[AI_ONLY] ${trait.name}: ${trait.description}\n[AI_ONLY] Effects: ${trait.effects.join(", ")}`
    ),
  ];

  entities.push({
    id: `outline:character`,
    type: "outline" as EmbeddingDocument["type"],
    content: charParts.join("\n"),
    metadata: { importance: 1.0, turnNumber: 0 },
  });

  // Initial Atmosphere - sets the tone
  const atmoParts: string[] = [
    `=== INITIAL ATMOSPHERE ===`,
    `Environment: ${outline.initialAtmosphere.envTheme}`,
  ];
  if (outline.initialAtmosphere.ambience) {
    atmoParts.push(`Ambience: ${outline.initialAtmosphere.ambience}`);
  }

  entities.push({
    id: `outline:atmosphere`,
    type: "outline" as EmbeddingDocument["type"],
    content: atmoParts.join("\n"),
    metadata: { importance: 0.8, turnNumber: 0 },
  });

  return entities;
}

// ============================================================================
// Embedding Manager Class
// ============================================================================

export class EmbeddingManager {
  private config: EmbeddingManagerConfig;
  private embeddingService: EmbeddingService | null = null;
  private searchManager: SimilaritySearchManager | null = null;
  private currentIndex: EmbeddingIndex | null = null;

  constructor(config: EmbeddingManagerConfig) {
    this.config = config;
  }

  /**
   * Initialize the embedding service with current settings
   */
  private initializeService(): void {
    const { settings } = this.config;
    if (!settings.embedding?.enabled) {
      throw new Error("Embedding is disabled in settings");
    }

    this.embeddingService = new EmbeddingService(settings.embedding, {
      gemini: { apiKey: settings.gemini.apiKey },
      openai: {
        apiKey: settings.openai.apiKey,
        baseUrl: settings.openai.baseUrl,
        modelId: settings.embedding.modelId,
      },
      openrouter: { apiKey: settings.openrouter.apiKey },
    });

    this.searchManager = new SimilaritySearchManager(settings.embedding);
  }

  /**
   * Report progress to callback
   */
  private reportProgress(progress: EmbeddingProgress): void {
    this.config.onProgress?.(progress);
  }

  /**
   * Build embedding index from game state
   */
  async buildIndex(state: GameState): Promise<EmbeddingIndex> {
    if (!this.embeddingService) {
      this.initializeService();
    }

    const extractors: EntityExtractor[] = [
      extractOutlineContent,  // Outline first - highest priority for world context
      extractStoryContent,
      extractNPCContent,
      extractLocationContent,
      extractItemContent,
      extractKnowledgeContent,
      extractQuestContent,
      extractEventContent,
    ];

    // Extract all entities
    this.reportProgress({
      phase: "extracting",
      current: 0,
      total: extractors.length,
    });
    const allEntities: Array<{
      id: string;
      type: EmbeddingDocument["type"];
      content: string;
      metadata?: EmbeddingDocument["metadata"];
    }> = [];

    for (let i = 0; i < extractors.length; i++) {
      const entities = extractors[i](state);
      allEntities.push(...entities);
      this.reportProgress({
        phase: "extracting",
        current: i + 1,
        total: extractors.length,
        message: `Extracted ${entities.length} entities`,
      });
    }

    // Add forkId and turnNumber to all entities metadata
    const forkId = state.forkId ?? 0;
    const turnNumber = state.turnNumber ?? 0;
    const entitiesWithForkInfo = allEntities.map((entity) => ({
      ...entity,
      metadata: {
        ...entity.metadata,
        forkId,
        turnNumber: entity.metadata?.turnNumber ?? turnNumber,
      },
    }));

    console.log(
      `[EmbeddingManager] Extracted ${entitiesWithForkInfo.length} entities for embedding (forkId: ${forkId}, turnNumber: ${turnNumber})`,
    );

    // Generate embeddings
    this.reportProgress({
      phase: "embedding",
      current: 0,
      total: entitiesWithForkInfo.length,
    });
    let documents = await this.embeddingService!.createDocuments(
      entitiesWithForkInfo,
      "retrieval_document",
    );

    this.reportProgress({
      phase: "embedding",
      current: entitiesWithForkInfo.length,
      total: entitiesWithForkInfo.length,
      message: `Generated ${documents.length} embeddings`,
    });

    // Apply LRU eviction to manage storage limits
    this.reportProgress({
      phase: "evicting",
      current: 0,
      total: 1,
      message: `Applying LRU eviction...`,
    });
    documents = this.applyLRUEviction(
      documents,
      forkId,
      turnNumber,
      state.forkTree,
    );
    this.reportProgress({
      phase: "evicting",
      current: 1,
      total: 1,
      message: `Retained ${documents.length} documents after LRU eviction`,
    });

    // Create index
    this.reportProgress({ phase: "indexing", current: 0, total: 1 });
    const { embedding } = this.config.settings;
    this.currentIndex = createEmbeddingIndex(
      documents,
      embedding.modelId,
      embedding.dimensions || 768,
    );

    // Load into search manager
    await this.searchManager!.loadIndex(this.currentIndex);

    this.reportProgress({
      phase: "complete",
      current: 1,
      total: 1,
      message: `Indexed ${documents.length} documents`,
    });

    console.log(
      `[EmbeddingManager] Built index with ${documents.length} documents`,
    );
    return this.currentIndex;
  }

  /**
   * Update index incrementally with new content
   */
  async updateIndex(
    state: GameState,
    changedEntityIds: string[],
  ): Promise<EmbeddingIndex> {
    if (!this.currentIndex) {
      // Full rebuild if no existing index
      return this.buildIndex(state);
    }

    if (!this.embeddingService) {
      this.initializeService();
    }

    // Extract only changed entities
    const allExtractors: Record<string, EntityExtractor> = {
      story: extractStoryContent,
      npc: extractNPCContent,
      location: extractLocationContent,
      item: extractItemContent,
      knowledge: extractKnowledgeContent,
      quest: extractQuestContent,
      event: extractEventContent,
    };

    const entitiesToUpdate: Array<{
      id: string;
      type: EmbeddingDocument["type"];
      content: string;
      metadata?: EmbeddingDocument["metadata"];
    }> = [];

    // Group changed IDs by type
    const changedByType = new Map<string, string[]>();
    for (const id of changedEntityIds) {
      const [type] = id.split(":");
      if (!changedByType.has(type)) {
        changedByType.set(type, []);
      }
      changedByType.get(type)!.push(id);
    }

    // Extract changed entities
    for (const [type, ids] of changedByType) {
      const extractor = allExtractors[type];
      if (extractor) {
        const allOfType = extractor(state);
        const changed = allOfType.filter((e) => ids.includes(e.id));
        entitiesToUpdate.push(...changed);
      }
    }

    if (entitiesToUpdate.length === 0) {
      return this.currentIndex;
    }

    // Generate embeddings for changed entities
    const newDocuments = await this.embeddingService!.createDocuments(
      entitiesToUpdate,
      "retrieval_document",
    );

    // Merge with existing documents
    const existingDocs = this.currentIndex.documents.filter(
      (doc) => !changedEntityIds.some((id) => doc.entityId === id),
    );
    let allDocs = [...existingDocs, ...newDocuments];

    // Apply LRU eviction to merged documents
    const forkId = state.forkId ?? 0;
    const turnNumber = state.turnNumber ?? 0;
    allDocs = this.applyLRUEviction(allDocs, forkId, turnNumber, state.forkTree);

    // Rebuild index
    const { embedding } = this.config.settings;
    this.currentIndex = createEmbeddingIndex(
      allDocs,
      embedding.modelId,
      embedding.dimensions || 768,
    );

    // Reload search manager
    await this.searchManager!.loadIndex(this.currentIndex);

    console.log(
      `[EmbeddingManager] Updated index with ${newDocuments.length} new documents (total after LRU: ${allDocs.length})`,
    );
    return this.currentIndex;
  }

  /**
   * Retrieve relevant context for a query
   * Supports filtering by fork (timeline branch) and turn number
   * Results are sorted with priority: current fork > ancestor forks > other forks
   *                                   past events > current turn > future events
   */
  async retrieveContext(
    query: string,
    options?: {
      topK?: number;
      threshold?: number;
      types?: EmbeddingDocument["type"][];
      // Fork filtering options
      currentForkOnly?: boolean; // Only search current fork and its ancestors
      forkId?: number; // Current fork ID (required if currentForkOnly is true)
      forkTree?: ForkTree; // Fork tree structure (required if currentForkOnly is true)
      // Turn filtering options
      beforeCurrentTurn?: boolean; // Only search content before current turn
      currentTurn?: number; // Current turn number (required if beforeCurrentTurn is true)
    },
  ): Promise<RAGContext> {
    if (!this.searchManager || !this.embeddingService || !this.currentIndex) {
      return this.emptyContext();
    }

    // Generate query embedding
    const { embedding: queryEmbedding } =
      await this.embeddingService.generateEmbedding(query, "retrieval_query");

    // Search for similar documents (get more results initially for filtering and re-ranking)
    const initialTopK =
      options?.topK || this.config.settings.embedding.topK || 10;
    const fetchMultiplier = 3; // Always fetch more for re-ranking

    const results = await this.searchManager.search(queryEmbedding, {
      topK: initialTopK * fetchMultiplier,
      threshold:
        options?.threshold ||
        this.config.settings.embedding.similarityThreshold ||
        0.5,
    });

    // Get ancestor fork IDs for priority ranking
    const allowedForkIds =
      options?.forkId !== undefined && options?.forkTree
        ? getAncestorForkIds(options.forkId, options.forkTree)
        : [];
    const currentForkId = options?.forkId ?? 0;
    const currentTurn = options?.currentTurn ?? 0;

    // Apply filters
    let filteredResults = results;

    // Filter by fork (timeline branch) if requested
    if (
      options?.currentForkOnly &&
      options.forkId !== undefined &&
      options.forkTree
    ) {
      filteredResults = filteredResults.filter((r) => {
        const docForkId = r.document.metadata?.forkId;
        // Include documents without forkId (legacy) or from allowed forks
        return docForkId === undefined || allowedForkIds.includes(docForkId);
      });
    }

    // Filter by turn number (exclude future content) if requested
    if (options?.beforeCurrentTurn && options.currentTurn !== undefined) {
      filteredResults = filteredResults.filter((r) => {
        const docTurnNumber = r.document.metadata?.turnNumber;
        // Include documents without turnNumber or from before current turn
        return (
          docTurnNumber === undefined || docTurnNumber < options.currentTurn!
        );
      });
    }

    // Filter by type if specified
    if (options?.types && options.types.length > 0) {
      filteredResults = filteredResults.filter((r) =>
        options.types!.includes(r.document.type),
      );
    }

    // Re-rank results with priority scoring
    // Priority: current fork > ancestor forks > other forks
    //           past events > current turn > future events
    const rankedResults = filteredResults.map((r) => {
      const docForkId = r.document.metadata?.forkId ?? 0;
      const docTurnNumber = r.document.metadata?.turnNumber ?? 0;

      // Calculate priority bonus (small adjustment to preserve similarity ordering)
      let priorityBonus = 0;

      // Fork priority: current fork gets highest bonus, ancestors get medium, others get penalty
      if (docForkId === currentForkId) {
        priorityBonus += 0.02; // Current fork: +2%
      } else if (allowedForkIds.includes(docForkId)) {
        priorityBonus += 0.01; // Ancestor fork: +1%
      } else {
        priorityBonus -= 0.01; // Other fork: -1%
      }

      // Turn priority: past events get bonus, future events get penalty
      if (docTurnNumber < currentTurn) {
        priorityBonus += 0.01; // Past: +1%
      } else if (docTurnNumber > currentTurn) {
        priorityBonus -= 0.02; // Future: -2%
      }
      // Current turn: no adjustment

      return {
        ...r,
        adjustedScore: Math.min(1.0, Math.max(0, r.score + priorityBonus)),
      };
    });

    // Sort by adjusted score
    rankedResults.sort((a, b) => b.adjustedScore - a.adjustedScore);

    // Limit to requested topK after filtering and ranking
    const finalResults = rankedResults.slice(0, initialTopK);

    // Group results by type
    const contextByType: Record<EmbeddingDocument["type"], string[]> = {
      outline: [],  // World/character background from story outline
      story: [],
      npc: [],
      location: [],
      item: [],
      knowledge: [],
      quest: [],
      event: [],
    };

    for (const result of finalResults) {
      const doc = result.document;
      const docForkId = doc.metadata?.forkId ?? 0;
      const docTurnNumber = doc.metadata?.turnNumber ?? 0;

      // Build source annotation header
      const sourceAnnotation = this.buildSourceAnnotation(
        docForkId,
        docTurnNumber,
        currentForkId,
        currentTurn,
        allowedForkIds,
      );

      contextByType[doc.type].push(
        `[${doc.type.toUpperCase()}:${doc.entityId}] (relevance: ${(result.score * 100).toFixed(1)}%)\n${sourceAnnotation}\n${doc.content}`,
      );
    }

    // Build combined context
    const combinedParts: string[] = [];
    for (const [type, contexts] of Object.entries(contextByType)) {
      if (contexts.length > 0) {
        combinedParts.push(`=== ${type.toUpperCase()} CONTEXT ===`);
        combinedParts.push(...contexts);
        combinedParts.push("");
      }
    }

    return {
      storyContext: contextByType.story,
      npcContext: contextByType.npc,
      locationContext: contextByType.location,
      itemContext: contextByType.item,
      knowledgeContext: contextByType.knowledge,
      questContext: contextByType.quest,
      eventContext: contextByType.event,
      combinedContext: combinedParts.join("\n"),
    };
  }

  /**
   * Build a clear source annotation for RAG results
   * Helps AI understand where the content comes from relative to current context
   */
  private buildSourceAnnotation(
    docForkId: number,
    docTurnNumber: number,
    currentForkId: number,
    currentTurn: number,
    allowedForkIds: number[],
  ): string {
    const parts: string[] = [];

    // Timeline annotation
    if (docForkId === currentForkId) {
      parts.push(`[TIMELINE: Current (fork:${docForkId})]`);
    } else if (allowedForkIds.includes(docForkId)) {
      parts.push(`[TIMELINE: Ancestor (fork:${docForkId})]`);
    } else {
      parts.push(
        `[TIMELINE: ⚠️ Alternate (fork:${docForkId}) - This content is from a different timeline branch!]`,
      );
    }

    // Turn annotation
    if (docTurnNumber < currentTurn) {
      parts.push(
        `[TIME: Past (turn:${docTurnNumber}, current:${currentTurn})]`,
      );
    } else if (docTurnNumber === currentTurn) {
      parts.push(`[TIME: Current Turn (turn:${docTurnNumber})]`);
    } else {
      parts.push(
        `[TIME: ⚠️ Future (turn:${docTurnNumber}, current:${currentTurn}) - This event has not occurred yet in current timeline!]`,
      );
    }

    return parts.join(" ");
  }

  /**
   * Get context for player action
   * Combines query with current game state for optimal retrieval
   * Also directly includes alive entities for immediate context
   */
  async getContextForAction(
    playerAction: string,
    state: GameState,
  ): Promise<RAGContext> {
    // Build query with current context
    const queryParts = [
      `Player action: ${playerAction}`,
      `Current location: ${state.currentLocation}`,
      `Current time: ${state.time}`,
    ];

    // Add active quest objectives
    const activeQuests = state.quests.filter((q) => q.status === "active");
    if (activeQuests.length > 0) {
      queryParts.push(
        `Active quests: ${activeQuests.map((q) => q.title).join(", ")}`,
      );
    }

    // Add nearby NPCs (NPCs whose currentLocation matches player's location)
    const nearbyNPCs = state.relationships.filter(
      (r) => r.currentLocation === state.currentLocation,
    );
    if (nearbyNPCs.length > 0) {
      queryParts.push(
        `Nearby NPCs: ${nearbyNPCs.map((r) => r.visible.name).join(", ")}`,
      );
    }

    // Get semantic search results
    const query = queryParts.join("\n");
    const ragContext = await this.retrieveContext(query);

    // Enhance with direct alive entity context
    // These entities were marked as relevant by the AI in the previous turn
    const aliveContext = this.getAliveEntitiesContext(state);

    if (aliveContext) {
      // Prepend alive entities context (higher priority)
      const combinedParts = [
        "=== PRIORITY CONTEXT (from previous turn) ===",
        aliveContext,
        "",
        ragContext.combinedContext,
      ];

      return {
        ...ragContext,
        combinedContext: combinedParts.join("\n"),
      };
    }

    return ragContext;
  }

  /**
   * NOTE: Alive entities context is now handled directly in getCurrentStateContext (prompts.ts)
   * to avoid duplication. This method is kept for potential future use with RAG-specific
   * supplementary information that goes beyond what's in the state context.
   *
   * For now, we only use the RAG search results without additional alive entity context
   * since that's already provided in the priority_context section of the state.
   */
  private getAliveEntitiesContext(_state: GameState): string | null {
    // Alive entities are now fully handled in getCurrentStateContext (prompts.ts)
    // to avoid duplicating information between RAG context and state context.
    // RAG search results provide semantically relevant information from the embedding index,
    // while state context provides the current alive entities.
    return null;
  }

  /**
   * Load existing index
   */
  async loadIndex(index: EmbeddingIndex): Promise<void> {
    this.currentIndex = index;

    if (!this.searchManager) {
      if (!this.config.settings.embedding?.enabled) {
        throw new Error("Embedding is disabled");
      }
      this.searchManager = new SimilaritySearchManager(
        this.config.settings.embedding,
      );
    }

    await this.searchManager.loadIndex(index);
    console.log(
      `[EmbeddingManager] Loaded index with ${index.documents.length} documents`,
    );
  }

  /**
   * Get current index
   */
  getIndex(): EmbeddingIndex | null {
    return this.currentIndex;
  }

  /**
   * Check if index is loaded
   */
  hasIndex(): boolean {
    return this.currentIndex !== null;
  }

  /**
   * Get search backend type
   */
  getBackend(): string {
    return this.searchManager?.getBackend() || "none";
  }

  /**
   * Clean up resources
   */
  terminate(): void {
    if (this.searchManager) {
      this.searchManager.terminate();
      this.searchManager = null;
    }
    this.embeddingService = null;
    this.currentIndex = null;
  }

  /**
   * Return empty context structure
   */
  private emptyContext(): RAGContext {
    return {
      storyContext: [],
      npcContext: [],
      locationContext: [],
      itemContext: [],
      knowledgeContext: [],
      questContext: [],
      eventContext: [],
      combinedContext: "",
    };
  }

  // ==========================================================================
  // LRU Eviction Methods
  // ==========================================================================

  /**
   * Get LRU configuration from settings or use defaults
   */
  private getLRUConfig() {
    const lru = this.config.settings.embedding?.lru || {};
    return {
      maxTotalDocuments: lru.maxTotalDocuments ?? LRU_DEFAULTS.maxTotalDocuments,
      maxDocumentsPerType: lru.maxDocumentsPerType ?? LRU_DEFAULTS.maxDocumentsPerType,
      maxVersionsPerEntity: lru.maxVersionsPerEntity ?? LRU_DEFAULTS.maxVersionsPerEntity,
      currentForkBonus: lru.currentForkBonus ?? LRU_DEFAULTS.currentForkBonus,
      ancestorForkBonus: lru.ancestorForkBonus ?? LRU_DEFAULTS.ancestorForkBonus,
      turnDecayFactor: lru.turnDecayFactor ?? LRU_DEFAULTS.turnDecayFactor,
    };
  }

  /**
   * Calculate priority score for a document based on:
   * - Base importance (from metadata and type)
   * - Fork proximity (current fork > ancestor forks > other forks)
   * - Turn recency (more recent = higher priority)
   *
   * Higher score = higher priority = keep longer
   */
  private calculateDocumentPriority(
    doc: EmbeddingDocument,
    currentForkId: number,
    currentTurn: number,
    ancestorForkIds: Set<number>,
    config: ReturnType<typeof this.getLRUConfig>,
  ): number {
    // Base importance from metadata (0-1), default 0.5
    let priority = doc.metadata?.importance ?? 0.5;

    // Type importance multiplier
    priority *= TYPE_IMPORTANCE[doc.type] ?? 1.0;

    // Outline documents are always critical - never evict
    if (doc.type === "outline") {
      return 100.0; // Very high priority, effectively immune from eviction
    }

    const docForkId = doc.metadata?.forkId ?? 0;
    const docTurn = doc.metadata?.turnNumber ?? 0;

    // Fork proximity bonus
    if (docForkId === currentForkId) {
      priority += config.currentForkBonus;
    } else if (ancestorForkIds.has(docForkId)) {
      priority += config.ancestorForkBonus;
    }
    // Documents from unrelated forks get no bonus (lower priority)

    // Turn recency penalty
    // More recent turns have higher priority
    const turnDiff = Math.max(0, currentTurn - docTurn);
    priority -= config.turnDecayFactor * turnDiff;

    return priority;
  }

  /**
   * Apply LRU eviction to a list of documents
   *
   * Three-tier eviction strategy:
   * 1. Per-entity limit: Keep only top N versions per unique entityId
   * 2. Per-type limit: Keep only top M documents per type
   * 3. Global limit: Keep only top K documents overall
   *
   * @param documents All documents to consider
   * @param currentForkId Current fork ID for priority calculation
   * @param currentTurn Current turn number for priority calculation
   * @param forkTree Fork tree for ancestor calculation
   * @returns Filtered documents after LRU eviction
   */
  private applyLRUEviction(
    documents: EmbeddingDocument[],
    currentForkId: number,
    currentTurn: number,
    forkTree: ForkTree,
  ): EmbeddingDocument[] {
    if (documents.length === 0) return documents;

    const config = this.getLRUConfig();
    const ancestorForkIds = new Set(getAncestorForkIds(currentForkId, forkTree));

    // Calculate priorities for all documents
    const docsWithPriority = documents.map((doc) => ({
      doc,
      priority: this.calculateDocumentPriority(
        doc,
        currentForkId,
        currentTurn,
        ancestorForkIds,
        config,
      ),
    }));

    // ========== Phase 1: Per-entity eviction ==========
    // Group by entityId and keep top N versions per entity
    const byEntityId = new Map<string, typeof docsWithPriority>();
    for (const item of docsWithPriority) {
      const entityId = item.doc.entityId;
      if (!byEntityId.has(entityId)) {
        byEntityId.set(entityId, []);
      }
      byEntityId.get(entityId)!.push(item);
    }

    let afterEntityEviction: typeof docsWithPriority = [];
    let entityEvictedCount = 0;

    for (const [_entityId, entityDocs] of byEntityId) {
      // Sort by priority descending
      entityDocs.sort((a, b) => b.priority - a.priority);

      // Keep top N versions per entity (outline gets unlimited)
      const limit = entityDocs[0]?.doc.type === "outline"
        ? entityDocs.length
        : config.maxVersionsPerEntity;

      const kept = entityDocs.slice(0, limit);
      entityEvictedCount += entityDocs.length - kept.length;
      afterEntityEviction.push(...kept);
    }

    // ========== Phase 2: Per-type eviction ==========
    // Group by type and keep top M documents per type
    const byType = new Map<EmbeddingDocument["type"], typeof docsWithPriority>();
    for (const item of afterEntityEviction) {
      const type = item.doc.type;
      if (!byType.has(type)) {
        byType.set(type, []);
      }
      byType.get(type)!.push(item);
    }

    let afterTypeEviction: typeof docsWithPriority = [];
    const typeEvictedCount: Record<string, number> = {};

    for (const [type, typeDocs] of byType) {
      // Sort by priority descending
      typeDocs.sort((a, b) => b.priority - a.priority);

      // Keep top M documents per type (outline gets unlimited)
      const limit = type === "outline"
        ? typeDocs.length
        : config.maxDocumentsPerType;

      const kept = typeDocs.slice(0, limit);
      const evicted = typeDocs.length - kept.length;

      if (evicted > 0) {
        typeEvictedCount[type] = evicted;
      }
      afterTypeEviction.push(...kept);
    }

    // ========== Phase 3: Global eviction ==========
    let finalDocs: EmbeddingDocument[];
    let globalEvictedCount = 0;

    if (afterTypeEviction.length > config.maxTotalDocuments) {
      // Sort all docs by priority and take top K
      afterTypeEviction.sort((a, b) => b.priority - a.priority);
      finalDocs = afterTypeEviction.slice(0, config.maxTotalDocuments).map((item) => item.doc);
      globalEvictedCount = afterTypeEviction.length - config.maxTotalDocuments;
    } else {
      finalDocs = afterTypeEviction.map((item) => item.doc);
    }

    // ========== Logging ==========
    const totalEvicted = documents.length - finalDocs.length;
    if (totalEvicted > 0) {
      const details: string[] = [];
      if (entityEvictedCount > 0) {
        details.push(`entity:${entityEvictedCount}`);
      }
      for (const [type, count] of Object.entries(typeEvictedCount)) {
        details.push(`${type}:${count}`);
      }
      if (globalEvictedCount > 0) {
        details.push(`global:${globalEvictedCount}`);
      }

      console.log(
        `[EmbeddingManager] LRU eviction: ${totalEvicted} docs evicted (${details.join(", ")}). ` +
        `Remaining: ${finalDocs.length}/${documents.length}`
      );
    }

    return finalDocs;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let embeddingManagerInstance: EmbeddingManager | null = null;

export function getEmbeddingManager(
  config?: EmbeddingManagerConfig,
): EmbeddingManager | null {
  if (!embeddingManagerInstance && config) {
    embeddingManagerInstance = new EmbeddingManager(config);
  }
  return embeddingManagerInstance;
}

/**
 * Initialize or reinitialize the embedding manager with new config.
 * Call this when settings change or when first accessing RAG features.
 */
export function initializeEmbeddingManager(
  config: EmbeddingManagerConfig,
): EmbeddingManager {
  // If instance exists with different settings, reset it
  if (embeddingManagerInstance) {
    embeddingManagerInstance.terminate();
    embeddingManagerInstance = null;
  }
  embeddingManagerInstance = new EmbeddingManager(config);
  return embeddingManagerInstance;
}

export function resetEmbeddingManager(): void {
  if (embeddingManagerInstance) {
    embeddingManagerInstance.terminate();
    embeddingManagerInstance = null;
  }
}

export function createEmbeddingManager(
  config: EmbeddingManagerConfig,
): EmbeddingManager {
  return new EmbeddingManager(config);
}
