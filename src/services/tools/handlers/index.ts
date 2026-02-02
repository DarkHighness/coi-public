/**
 * Tool Handler Registry Index
 *
 * Importing this file registers all tool handlers.
 * Import this once in your application entry point or in the agentic loop.
 */

// Import only VFS handlers to trigger registration
import "./vfsHandlers";

// Re-export registry functions for convenience
export {
  dispatchToolCall,
  dispatchToolCallAsync,
  hasHandler,
} from "../toolHandlerRegistry";

export type { ToolContext } from "../toolHandlerRegistry";
