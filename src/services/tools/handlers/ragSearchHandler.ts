/**
 * RAG Search Tool Handler
 *
 * Handles semantic search for long-term memory retrieval.
 */

import { RAG_SEARCH_TOOL, getTypedArgs } from "../../tools";
import { registerToolHandler } from "../toolHandlerRegistry";

// ============================================================================
// RAG Search Handler
// ============================================================================

registerToolHandler(RAG_SEARCH_TOOL, async (args, ctx) => {
  const { db } = ctx;
  const typedArgs = getTypedArgs("rag_search", args);

  // Dynamic import to avoid circular dependencies
  const { getRAGService } = await import("../../rag");
  const ragService = getRAGService();

  if (!ragService) {
    return {
      success: false,
      error:
        "RAG search is not available. RAG service has not been initialized.",
      hint: "Use query_* tools to search specific entity types instead.",
    };
  }

  try {
    const {
      query,
      types,
      topK = 5,
      currentForkOnly,
      beforeCurrentTurn,
    } = typedArgs;
    const state = db.getState();

    // Build search options
    const searchOptions = {
      topK,
      types,
      forkId: state.forkId,
      currentForkOnly,
      beforeTurn: beforeCurrentTurn ? state.turnNumber : undefined,
    };

    const results = await ragService.search(query, searchOptions);

    // Group results by type
    const groupedResults: Record<string, string[]> = {
      story: [],
      npc: [],
      location: [],
      item: [],
      knowledge: [],
      quest: [],
      event: [],
    };

    for (const result of results) {
      const type = result.document.type;
      if (groupedResults[type]) {
        groupedResults[type].push(result.document.content);
      }
    }

    const combinedContext = results.map((r) => r.document.content).join("\n\n");

    return {
      success: true,
      query,
      filters: {
        currentForkOnly: currentForkOnly || false,
        beforeCurrentTurn: beforeCurrentTurn || false,
        forkId: currentForkOnly ? state.forkId : undefined,
        turnNumber: beforeCurrentTurn ? state.turnNumber : undefined,
      },
      results: groupedResults,
      combinedContext,
      message: `Found ${results.length} relevant entries`,
    };
  } catch (error) {
    return {
      success: false,
      error: `RAG search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
});
