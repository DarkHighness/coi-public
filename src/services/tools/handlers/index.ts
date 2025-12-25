/**
 * Tool Handler Registry Index
 *
 * Importing this file registers all tool handlers.
 * Import this once in your application entry point or in the agentic loop.
 */

// Import all handlers to trigger registration
import "./inventoryHandlers";
import "./npcHandlers";
import "./locationHandlers";
import "./questHandlers";
import "./knowledgeHandlers";
import "./timelineHandlers";
import "./factionHandlers";
import "./causalChainHandlers";
import "./characterHandlers";
import "./globalHandlers";
import "./notesHandlers";
import "./listHandler";
import "./unlockHandler";
import "./playerProfileHandlers";

// Re-export registry functions for convenience
export {
  dispatchToolCall,
  dispatchToolCallAsync,
  hasHandler,
} from "../toolHandlerRegistry";

export type { ToolContext } from "../toolHandlerRegistry";
