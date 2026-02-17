/**
 * Tool Handler Registry - Centralized tool execution dispatch
 *
 * This module provides a register + lookup + dispatch pattern for tool handlers.
 * Handlers are registered using the tool definition's name (from Zod schema),
 * eliminating the need to manually duplicate tool names.
 *
 * Architecture:
 * 1. registerToolHandler(tool, handler) - registers handler using tool.name
 * 2. dispatchToolCall(name, args, context) - looks up and executes handler
 * 3. Handlers receive typed context and return results (sync or async)
 */

import type { GameState, GameResponse, AISettings } from "../../types";
import type { ZodToolDefinition } from "../providers/types";
import type { VfsSession } from "../vfs/vfsSession";
import type { VfsActor, VfsElevationIntent, VfsMode } from "../vfs/core/types";
import type { VfsElevationScopeTemplateIds } from "../vfs/core/elevation";

// ============================================================================
// Types
// ============================================================================

/**
 * Context passed to tool handlers during execution.
 * Contains all dependencies needed for tool execution.
 */
export interface ToolContext {
  /** Accumulated response for tracking actions (optional, for turn handlers) */
  accumulatedResponse?: GameResponse;
  /** Map of changed entities for RAG updates (optional) */
  changedEntities?: Map<string, string>;
  /** Current game state (optional, for query tools) */
  gameState?: GameState;
  /** AI settings (optional) */
  settings?: AISettings;
  /** Whether embedding runtime is enabled for semantic search */
  embeddingEnabled?: boolean;
  /** VFS session for file-based tools */
  vfsSession: VfsSession;
  /** Required command skill paths that must be read in current epoch */
  requiredCommandSkillPaths?: string[];
  /** Required preset skill paths that must be read in current epoch */
  requiredPresetSkillPaths?: string[];
  /** Allowed top-level tool names for current loop (used by vfs_vm inner gate) */
  allowedToolNames?: string[];
  /** VFS actor identity for policy checks (defaults to ai in tool handlers) */
  vfsActor?: VfsActor;
  /** VFS mode for policy checks */
  vfsMode?: VfsMode;
  /** One-time elevation token for current AI request */
  vfsElevationToken?: string | null;
  /** Optional elevation intent bound to the token */
  vfsElevationIntent?: VfsElevationIntent;
  /** Optional elevation template scope bound to the token */
  vfsElevationScopeTemplateIds?: VfsElevationScopeTemplateIds;
}

/**
 * Tool handler function signature.
 * Handlers can be sync or async.
 */
export type ToolHandler = (
  args: Record<string, unknown>,
  ctx: ToolContext,
) => unknown | Promise<unknown>;

/**
 * Result type for tool execution
 */
export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  code?: string;
  message?: string;
}

// ============================================================================
// Registry
// ============================================================================

/** Internal handler registry - maps tool name to handler function */
const handlerRegistry = new Map<string, ToolHandler>();

const KNOWN_TOOL_PREFIX_REGEX = /^(default_api|functions?|tool|tools|mcp)[:.]/i;
const TOOL_NAME_NAMESPACE_PREFIX_REGEX = /^[a-z0-9_-]+[:.]/i;

const collectToolNameCandidates = (rawName: string): string[] => {
  const seed = rawName.trim();
  if (!seed) return [];

  const visited = new Set<string>();
  const queue: string[] = [seed];
  const ordered: string[] = [];

  while (queue.length > 0 && ordered.length < 24) {
    const current = queue.shift()!;
    if (!current || visited.has(current)) continue;
    visited.add(current);
    ordered.push(current);

    const strippedKnownPrefix = current.replace(KNOWN_TOOL_PREFIX_REGEX, "");
    if (strippedKnownPrefix && strippedKnownPrefix !== current) {
      queue.push(strippedKnownPrefix);
    }

    const namespaceMatch = current.match(TOOL_NAME_NAMESPACE_PREFIX_REGEX);
    if (namespaceMatch) {
      const strippedNamespace = current.slice(namespaceMatch[0].length);
      if (strippedNamespace) {
        queue.push(strippedNamespace);
      }
    }
  }

  return ordered;
};

const resolveRegisteredToolName = (name: string): string | null => {
  const candidates = collectToolNameCandidates(name);
  for (const candidate of candidates) {
    if (handlerRegistry.has(candidate)) {
      return candidate;
    }
  }
  return null;
};

/**
 * Register a tool handler using the tool definition.
 * The tool's name is extracted from the schema definition itself.
 *
 * @param tool - The tool definition (contains name from Zod schema)
 * @param handler - Handler function to execute when tool is called
 *
 * @example
 * ```ts
 * registerToolHandler(VFS_MUTATE_TOOL, (args, ctx) => {
 *   const first = (args.ops ?? [])[0] as { op?: string; path?: string; content?: string; contentType?: string } | undefined;
 *   if (first?.op === "write_file") {
 *     ctx.vfsSession.writeFile(first.path, first.content, first.contentType);
 *   }
 *   return { success: true };
 * });
 * ```
 */
export function registerToolHandler<T extends ZodToolDefinition>(
  tool: T,
  handler: ToolHandler,
): void {
  // In HMR scenarios, the same handler may be re-registered - skip silently
  if (handlerRegistry.has(tool.name)) {
    // Only warn in development if it's actually a different handler
    if (import.meta.env.DEV && handlerRegistry.get(tool.name) !== handler) {
      console.warn(
        `[ToolRegistry] Handler for "${tool.name}" is being overwritten`,
      );
    }
    // If same handler, skip re-registration entirely
    if (handlerRegistry.get(tool.name) === handler) {
      return;
    }
  }
  handlerRegistry.set(tool.name, handler);
}

/**
 * Register a handler by name directly (for special cases).
 * Use registerToolHandler with tool definition when possible.
 */
export function registerHandlerByName(
  name: string,
  handler: ToolHandler,
): void {
  // In HMR scenarios, skip if same handler already registered
  if (handlerRegistry.has(name)) {
    if (import.meta.env.DEV && handlerRegistry.get(name) !== handler) {
      console.warn(`[ToolRegistry] Handler for "${name}" is being overwritten`);
    }
    if (handlerRegistry.get(name) === handler) {
      return;
    }
  }

  handlerRegistry.set(name, handler);
}

/**
 * Check if a handler is registered for a given tool name.
 */
export function hasHandler(name: string): boolean {
  return resolveRegisteredToolName(name) !== null;
}

/**
 * Get all registered tool names.
 */
export function getRegisteredToolNames(): string[] {
  return Array.from(handlerRegistry.keys());
}

// ============================================================================
// Dispatch
// ============================================================================

/**
 * Dispatch a tool call to its registered handler.
 *
 * @param name - Tool name (from tool call)
 * @param args - Tool arguments
 * @param context - Execution context
 * @returns Handler result (may be a Promise for async handlers)
 */
export function dispatchToolCall(
  name: string,
  args: Record<string, unknown>,
  context: ToolContext,
): unknown | Promise<unknown> {
  const resolvedName = resolveRegisteredToolName(name);
  const handler = resolvedName ? handlerRegistry.get(resolvedName) : undefined;

  if (!handler) {
    return {
      success: false,
      error: `Unknown tool: ${name}`,
      code: "UNKNOWN_TOOL",
    };
  }

  try {
    return handler(args, context);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Tool execution failed: ${message}`,
      code: "EXECUTION_ERROR",
    };
  }
}

/**
 * Dispatch a tool call and await if async.
 * Use this when you need to ensure the result is resolved.
 */
export async function dispatchToolCallAsync(
  name: string,
  args: Record<string, unknown>,
  context: ToolContext,
): Promise<unknown> {
  const result = dispatchToolCall(name, args, context);
  return result instanceof Promise ? await result : result;
}

// ============================================================================
// Helper for entity tracking
// ============================================================================

/**
 * Track changed entity for RAG updates.
 * Call this after successful entity modifications.
 */
export function trackChangedEntity(
  changedEntities: Map<string, string> | undefined,
  result: { success: boolean; data?: unknown },
  entityType: string,
): void {
  if (
    changedEntities &&
    result.success &&
    result.data &&
    typeof result.data === "object" &&
    result.data !== null &&
    "id" in result.data
  ) {
    const entity = result.data as { id: string };
    changedEntities.set(entity.id, entityType);
  }
}
